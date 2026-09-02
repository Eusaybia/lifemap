import { Extension, type Editor } from '@tiptap/core'
import type { Mark, MarkType, Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'

/**
 * Connections live in the document.
 *
 * Every connectable element (location, todo, question, motivation, span
 * group, block group, or any node with a quantaId) carries a `connections`
 * attribute holding its OUTGOING edges. The edge's source is implied by the
 * element that owns it, so an edge is `{ id, targetId, targetType, ... }`.
 * Because the attribute is part of the ProseMirror document it syncs through
 * Yjs, persists with the note, survives copy and paste, and joins the undo
 * stack like any other edit.
 *
 * Readers do not walk the document themselves: the ConnectionStore below
 * flattens every registered editor's edges into the NodeConnectionRecord list
 * the rest of the app has always consumed, and announces changes on the same
 * `node-connections-updated` window event. localStorage, the previous home of
 * this list, is read once per note to migrate old edges and then left alone.
 */
export type ConnectableType = 'block' | 'span' | 'node' | 'todo' | 'question' | 'motivation' | 'location'
export type ConnectionKind = 'temporal-order' | 'physical-order' | 'association' | 'manual'

export interface ConnectionEdge {
  id: string
  targetId: string
  targetType: ConnectableType
  connectionKind?: ConnectionKind
  createdBy?: string
  cue?: string
}

export interface NodeConnectionRecord extends ConnectionEdge {
  sourceId: string
  sourceType: ConnectableType
  sourceLabel?: string
  targetLabel?: string
}

export const CONNECTIONS_UPDATED_EVENT = 'node-connections-updated'
const LEGACY_STORAGE_KEY = 'span-group-connections'
const MIGRATED_STORAGE_KEY = 'span-group-connections-migrated'
const CONNECTIONS_ATTRIBUTE = 'connections'

/** Node types that own connections, with the attribute holding their connectable id. */
const OWNER_NODES: Record<string, { idAttribute: string; type: ConnectableType }> = {
  location: { idAttribute: 'locationId', type: 'location' },
  todoMention: { idAttribute: 'todoId', type: 'todo' },
  toNotDoMention: { idAttribute: 'todoId', type: 'todo' },
  questionMention: { idAttribute: 'questionId', type: 'question' },
  motivationsMention: { idAttribute: 'motivationId', type: 'motivation' },
  group: { idAttribute: 'groupId', type: 'block' }
}
const SPAN_GROUP_MARK = 'spanGroup'

interface Owner {
  id: string
  type: ConnectableType
}

const generateEdgeId = (): string => Math.random().toString(36).substring(2, 10)

/**
 * The attribute is a JSON string, not an array: y-prosemirror stores node and
 * mark attributes as Yjs XML attributes, which only accept primitives, and
 * throws "Unexpected content type" on an array.
 */
const readEdges = (attrs: Record<string, unknown>): ConnectionEdge[] => {
  const value = attrs[CONNECTIONS_ATTRIBUTE]
  if (typeof value !== 'string' || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as ConnectionEdge[]) : []
  } catch {
    return []
  }
}

const serializeEdges = (edges: ConnectionEdge[]): string | null => (edges.length ? JSON.stringify(edges) : null)

const nodeOwner = (node: PMNode): Owner | null => {
  const owner = OWNER_NODES[node.type.name]
  if (owner) {
    const id = node.attrs[owner.idAttribute]
    return typeof id === 'string' && id ? { id, type: owner.type } : null
  }
  const quantaId = node.attrs.quantaId
  return typeof quantaId === 'string' && quantaId ? { id: quantaId, type: 'node' } : null
}

const markOwner = (mark: Mark): Owner | null => {
  if (mark.type.name !== SPAN_GROUP_MARK) return null
  const id = mark.attrs.groupId
  return typeof id === 'string' && id ? { id, type: 'span' } : null
}

const locationLabel = (node: PMNode): string | undefined => {
  const name = node.attrs['data-name'] ?? node.attrs.label
  return typeof name === 'string' && name.trim() ? name.trim() : undefined
}

interface DocIndex {
  records: NodeConnectionRecord[]
  ids: Set<string>
  labels: Map<string, string>
}

const indexDoc = (doc: PMNode): DocIndex => {
  const records: NodeConnectionRecord[] = []
  const ids = new Set<string>()
  const labels = new Map<string, string>()
  const seenEdgeIds = new Set<string>()

  const pushEdges = (owner: Owner, attrs: Record<string, unknown>): void => {
    ids.add(`${owner.type}:${owner.id}`)
    for (const edge of readEdges(attrs)) {
      if (seenEdgeIds.has(edge.id)) continue
      seenEdgeIds.add(edge.id)
      records.push({ ...edge, sourceId: owner.id, sourceType: owner.type })
    }
  }

  doc.descendants(node => {
    const owner = nodeOwner(node)
    if (owner) {
      pushEdges(owner, node.attrs)
      if (owner.type === 'location') {
        const label = locationLabel(node)
        if (label) labels.set(owner.id, label)
      }
    }
    for (const mark of node.marks) {
      const spanOwner = markOwner(mark)
      if (spanOwner) pushEdges(spanOwner, mark.attrs)
    }
    return true
  })

  for (const record of records) {
    if (record.sourceType === 'location') record.sourceLabel = labels.get(record.sourceId)
    if (record.targetType === 'location') record.targetLabel = labels.get(record.targetId)
  }
  return { records, ids, labels }
}

type OwnerLocation =
  | { kind: 'node'; pos: number; node: PMNode }
  | { kind: 'mark'; markType: MarkType; mark: Mark; ranges: Array<{ from: number; to: number }> }

const findOwner = (doc: PMNode, owner: Owner): OwnerLocation | null => {
  let found: OwnerLocation | null = null
  doc.descendants((node, pos) => {
    if (found?.kind === 'node') return false
    const candidate = nodeOwner(node)
    if (candidate && candidate.id === owner.id && candidate.type === owner.type) {
      found = { kind: 'node', pos, node }
      return false
    }
    if (owner.type === 'span') {
      for (const mark of node.marks) {
        const spanOwner = markOwner(mark)
        if (!spanOwner || spanOwner.id !== owner.id) continue
        const range = { from: pos, to: pos + node.nodeSize }
        if (found?.kind === 'mark') found.ranges.push(range)
        else found = { kind: 'mark', markType: mark.type, mark, ranges: [range] }
      }
    }
    return true
  })
  return found
}

const writeEdges = (tr: Transaction, location: OwnerLocation, edges: ConnectionEdge[]): Transaction => {
  const value = serializeEdges(edges)
  if (location.kind === 'node') {
    return tr.setNodeMarkup(location.pos, undefined, { ...location.node.attrs, [CONNECTIONS_ATTRIBUTE]: value }, location.node.marks)
  }
  const nextMark = location.markType.create({ ...location.mark.attrs, [CONNECTIONS_ATTRIBUTE]: value })
  for (const { from, to } of location.ranges) tr.addMark(from, to, nextMark)
  return tr
}

const signatureOf = (records: NodeConnectionRecord[]): string =>
  records
    .map(record => `${record.id}|${record.sourceType}:${record.sourceId}>${record.targetType}:${record.targetId}|${record.sourceLabel ?? ''}|${record.targetLabel ?? ''}`)
    .sort()
    .join('\n')

declare global {
  interface Window {
    /** The flattened connection list, for readers outside the editor bundle (the Atlas bridge). */
    __lifemapConnections?: NodeConnectionRecord[]
  }
}

/**
 * One store for the page: several editors may be mounted (nested quanta), and
 * an edge may join elements in different editors, so the list is the union
 * and writes go to whichever editor owns the source.
 */
class ConnectionStore {
  private indexes = new Map<Editor, DocIndex>()
  private lastSignature = ''

  register(editor: Editor): void {
    this.indexes.set(editor, indexDoc(editor.state.doc))
    this.publish()
  }

  unregister(editor: Editor): void {
    this.indexes.delete(editor)
    this.publish()
  }

  refresh(editor: Editor): void {
    if (!this.indexes.has(editor)) return
    this.indexes.set(editor, indexDoc(editor.state.doc))
    this.publish()
  }

  list(): NodeConnectionRecord[] {
    const records: NodeConnectionRecord[] = []
    const seen = new Set<string>()
    for (const index of this.indexes.values()) {
      for (const record of index.records) {
        if (seen.has(record.id)) continue
        seen.add(record.id)
        records.push(record)
      }
    }
    return records
  }

  /** Every connectable id on the page, across editors. */
  knownIds(): Set<string> {
    const ids = new Set<string>()
    for (const index of this.indexes.values()) index.ids.forEach(id => ids.add(id))
    return ids
  }

  find(source: Owner, target: Owner): NodeConnectionRecord | undefined {
    return this.list().find(record =>
      record.sourceId === source.id && record.sourceType === source.type &&
      record.targetId === target.id && record.targetType === target.type
    )
  }

  add(record: Omit<NodeConnectionRecord, 'id' | 'sourceLabel' | 'targetLabel'> & { id?: string }): NodeConnectionRecord | null {
    const source: Owner = { id: record.sourceId, type: record.sourceType }
    for (const editor of this.indexes.keys()) {
      const location = findOwner(editor.state.doc, source)
      if (!location) continue
      const edge: ConnectionEdge = {
        id: record.id ?? generateEdgeId(),
        targetId: record.targetId,
        targetType: record.targetType,
        connectionKind: record.connectionKind ?? 'manual',
        createdBy: record.createdBy,
        cue: record.cue
      }
      const existing = location.kind === 'node' ? readEdges(location.node.attrs) : readEdges(location.mark.attrs)
      editor.view.dispatch(writeEdges(editor.state.tr, location, [...existing, edge]))
      return { ...edge, sourceId: source.id, sourceType: source.type }
    }
    return null
  }

  remove(edgeId: string): boolean {
    for (const [editor, index] of this.indexes) {
      const record = index.records.find(entry => entry.id === edgeId)
      if (!record) continue
      const location = findOwner(editor.state.doc, { id: record.sourceId, type: record.sourceType })
      if (!location) continue
      const existing = location.kind === 'node' ? readEdges(location.node.attrs) : readEdges(location.mark.attrs)
      editor.view.dispatch(writeEdges(editor.state.tr, location, existing.filter(edge => edge.id !== edgeId)))
      return true
    }
    return false
  }

  private publish(): void {
    if (typeof window === 'undefined') return
    const records = this.list()
    const signature = signatureOf(records)
    window.__lifemapConnections = records
    if (signature === this.lastSignature) return
    this.lastSignature = signature
    window.dispatchEvent(new CustomEvent(CONNECTIONS_UPDATED_EVENT, { detail: records }))
  }
}

export const connectionStore = new ConnectionStore()

/**
 * One-off import of the edges an older build kept in localStorage. Runs when a
 * note's content has arrived (it is empty until IndexedDB or the cloud room
 * syncs) and pulls in every old edge whose endpoints both live in this note.
 * Imported edge ids are remembered so a note that later loses all its edges
 * does not get them back from the browser.
 */
const migrateLegacyConnections = (editor: Editor): void => {
  if (typeof window === 'undefined') return
  let legacy: NodeConnectionRecord[]
  let migrated: string[]
  try {
    legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? '[]')
    migrated = JSON.parse(window.localStorage.getItem(MIGRATED_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(legacy) || !Array.isArray(migrated)) return
  } catch {
    return
  }
  if (!legacy.length) return

  const index = indexDoc(editor.state.doc)
  if (index.ids.size === 0) return
  const present = new Set(index.records.map(record => record.id))
  const pending = legacy.filter(record =>
    record?.id && !migrated.includes(record.id) && !present.has(record.id) &&
    index.ids.has(`${record.sourceType ?? 'span'}:${record.sourceId}`) &&
    index.ids.has(`${record.targetType ?? 'span'}:${record.targetId}`)
  )
  if (!pending.length) return

  let tr = editor.state.tr.setMeta('addToHistory', false)
  const bySource = new Map<string, { owner: Owner; edges: ConnectionEdge[] }>()
  for (const record of pending) {
    const owner: Owner = { id: record.sourceId, type: record.sourceType ?? 'span' }
    const key = `${owner.type}:${owner.id}`
    const entry = bySource.get(key) ?? { owner, edges: [] }
    entry.edges.push({
      id: record.id,
      targetId: record.targetId,
      targetType: record.targetType ?? 'span',
      connectionKind: record.connectionKind ?? 'manual',
      createdBy: record.createdBy,
      cue: record.cue
    })
    bySource.set(key, entry)
  }
  for (const { owner, edges } of bySource.values()) {
    const location = findOwner(tr.doc, owner)
    if (!location) continue
    const existing = location.kind === 'node' ? readEdges(location.node.attrs) : readEdges(location.mark.attrs)
    tr = writeEdges(tr, location, [...existing, ...edges])
  }
  editor.view.dispatch(tr)
  // Record only what actually landed: a dispatch during a sync cycle can be dropped.
  const landed = new Set(indexDoc(editor.state.doc).records.map(record => record.id))
  const imported = pending.filter(record => landed.has(record.id)).map(record => record.id)
  if (!imported.length) return
  window.localStorage.setItem(MIGRATED_STORAGE_KEY, JSON.stringify([...migrated, ...imported]))
}

/**
 * onCreate/onUpdate fire inside the collaboration binding's own transaction,
 * where a nested dispatch is swallowed by its mutex. Run the migration after
 * the current cycle instead.
 */
const scheduleMigration = (editor: Editor): void => {
  if (typeof window === 'undefined') return
  window.setTimeout(() => {
    if (!editor.isDestroyed) migrateLegacyConnections(editor)
  }, 0)
}

export interface ConnectionsExtensionOptions {
  /** Node types that carry a quantaId and can therefore own connections as type 'node'. */
  quantaNodeTypes: string[]
}

export const ConnectionsExtension = Extension.create<ConnectionsExtensionOptions>({
  name: 'connections',

  addOptions() {
    return { quantaNodeTypes: [] }
  },

  addGlobalAttributes() {
    const types = Array.from(new Set([...Object.keys(OWNER_NODES), SPAN_GROUP_MARK, ...this.options.quantaNodeTypes]))
    return [
      {
        types,
        attributes: {
          [CONNECTIONS_ATTRIBUTE]: {
            default: null,
            parseHTML: element => {
              const raw = element.getAttribute('data-connections')
              return raw && readEdges({ [CONNECTIONS_ATTRIBUTE]: raw }).length ? raw : null
            },
            renderHTML: attributes => {
              const value = serializeEdges(readEdges(attributes))
              return value ? { 'data-connections': value } : {}
            }
          }
        }
      }
    ]
  },

  onCreate() {
    connectionStore.register(this.editor)
    scheduleMigration(this.editor)
  },

  onUpdate() {
    connectionStore.refresh(this.editor)
    scheduleMigration(this.editor)
  },

  onDestroy() {
    connectionStore.unregister(this.editor)
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('connectionsPrune'),
        // Deleting an element deletes the edges that pointed at it. Only local
        // edits are considered: a remote or history transaction can arrive
        // before the editor that holds the target has mounted.
        appendTransaction: (transactions, _oldState, newState) => {
          const isLocalEdit = transactions.some(tr =>
            tr.docChanged && tr.getMeta('addToHistory') !== false && !tr.getMeta('y-sync$')
          )
          if (!isLocalEdit) return null
          const known = connectionStore.knownIds()
          indexDoc(newState.doc).ids.forEach(id => known.add(id))
          let tr = newState.tr
          let changed = false
          const pruneAt = (owner: Owner, attrs: Record<string, unknown>): void => {
            const edges = readEdges(attrs)
            if (!edges.length) return
            const kept = edges.filter(edge => known.has(`${edge.targetType}:${edge.targetId}`))
            if (kept.length === edges.length) return
            const location = findOwner(tr.doc, owner)
            if (!location) return
            tr = writeEdges(tr, location, kept)
            changed = true
          }
          const seenSpans = new Set<string>()
          newState.doc.descendants(node => {
            const owner = nodeOwner(node)
            if (owner) pruneAt(owner, node.attrs)
            for (const mark of node.marks) {
              const spanOwner = markOwner(mark)
              if (spanOwner && !seenSpans.has(spanOwner.id)) {
                seenSpans.add(spanOwner.id)
                pruneAt(spanOwner, mark.attrs)
              }
            }
            return true
          })
          return changed ? tr : null
        }
      })
    ]
  }
})
