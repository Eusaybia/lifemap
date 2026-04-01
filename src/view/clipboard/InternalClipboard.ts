import type { JSONContent } from '@tiptap/core'
import { DOMSerializer, Fragment, Schema, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection, type Selection } from '@tiptap/pm/state'

export const INTERNAL_CLIPBOARD_MIME = 'application/x-lifemap-node-selection+json'

interface InternalClipboardPayload {
  version: 1
  source: 'lifemap'
  kind: 'node-selection'
  nodes: JSONContent[]
}

const isInternalClipboardPayload = (value: unknown): value is InternalClipboardPayload => {
  if (!value || typeof value !== 'object') return false

  const payload = value as Partial<InternalClipboardPayload>
  return (
    payload.version === 1 &&
    payload.source === 'lifemap' &&
    payload.kind === 'node-selection' &&
    Array.isArray(payload.nodes)
  )
}

const buildInternalClipboardPayload = (selection: Selection): InternalClipboardPayload | null => {
  if (!(selection instanceof NodeSelection) || !selection.node.isBlock) {
    return null
  }

  const nodes: JSONContent[] = []
  selection.content().content.forEach((node) => {
    nodes.push(node.toJSON() as JSONContent)
  })

  if (!nodes.length) {
    return null
  }

  return {
    version: 1,
    source: 'lifemap',
    kind: 'node-selection',
    nodes,
  }
}

export const readInternalClipboardPayload = (
  clipboardData:
    | Pick<DataTransfer, 'getData'>
    | null
    | undefined
): string | null => {
  const raw = clipboardData?.getData(INTERNAL_CLIPBOARD_MIME) ?? ''
  return raw || null
}

export const parseInternalClipboardNodes = (
  rawPayload: string | null,
  schema: Schema
): ProseMirrorNode[] => {
  if (!rawPayload) {
    return []
  }

  try {
    const parsed = JSON.parse(rawPayload)
    if (!isInternalClipboardPayload(parsed)) {
      return []
    }

    return parsed.nodes.flatMap((nodeJson) => {
      try {
        return [schema.nodeFromJSON(nodeJson)]
      } catch {
        return []
      }
    })
  } catch {
    return []
  }
}

export const buildInternalClipboardSlice = (nodes: readonly ProseMirrorNode[]): Slice => {
  return new Slice(Fragment.fromArray([...nodes]), 0, 0)
}

export const writeInternalClipboardSelection = ({
  clipboardData,
  selection,
  schema,
  document,
}: {
  clipboardData:
    | Pick<DataTransfer, 'clearData' | 'setData'>
    | null
    | undefined
  selection: Selection
  schema: Schema
  document: Document
}): boolean => {
  const payload = buildInternalClipboardPayload(selection)

  if (!payload || !clipboardData) {
    return false
  }

  const slice = selection.content()
  const serializer = DOMSerializer.fromSchema(schema)
  const container = document.createElement('div')
  container.appendChild(serializer.serializeFragment(slice.content, { document }))

  clipboardData.clearData()
  clipboardData.setData(INTERNAL_CLIPBOARD_MIME, JSON.stringify(payload))
  clipboardData.setData('text/html', container.innerHTML)
  clipboardData.setData(
    'text/plain',
    slice.content.textBetween(0, slice.content.size, '\n\n')
  )

  return true
}
