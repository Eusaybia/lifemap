import type { JSONContent } from '@tiptap/core'
import { DOMSerializer, Fragment, Schema, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection, type Selection as PMSelection } from '@tiptap/pm/state'

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

const buildInternalClipboardPayload = (selection: PMSelection): InternalClipboardPayload | null => {
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

const normalizeClipboardText = (value: string | null | undefined): string =>
  value?.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() ?? ''

const selectionContainsElement = (
  domSelection: Selection,
  element: HTMLElement
): boolean => {
  if (typeof domSelection.containsNode === 'function') {
    try {
      if (domSelection.containsNode(element, true)) {
        return true
      }
    } catch {
      // Fall through to range-based checks.
    }
  }

  for (let index = 0; index < domSelection.rangeCount; index += 1) {
    const range = domSelection.getRangeAt(index)

    try {
      if (typeof range.intersectsNode === 'function' && range.intersectsNode(element)) {
        return true
      }
    } catch {
      // Fall through to manual range comparison.
    }

    const elementRange = element.ownerDocument.createRange()
    elementRange.selectNodeContents(element)
    const rangeClass = element.ownerDocument.defaultView?.Range
    if (!rangeClass) {
      continue
    }

    const startsBeforeElementEnds =
      range.compareBoundaryPoints(rangeClass.START_TO_END, elementRange) < 0
    const endsAfterElementStarts =
      range.compareBoundaryPoints(rangeClass.END_TO_START, elementRange) > 0

    if (startsBeforeElementEnds && endsAfterElementStarts) {
      return true
    }
  }

  return false
}

const getSelectedSingleInlineElement = (
  domSelection: Selection | null | undefined,
  document: Document,
  selector: string
): HTMLElement | null => {
  if (!domSelection || domSelection.isCollapsed) {
    return null
  }

  const selectedText = normalizeClipboardText(domSelection.toString())
  if (!selectedText) {
    return null
  }

  const selectedInlineElements = Array.from(
    document.querySelectorAll<HTMLElement>(selector)
  ).filter((element) => selectionContainsElement(domSelection, element))

  if (selectedInlineElements.length !== 1) {
    return null
  }

  const [inlineElement] = selectedInlineElements
  if (normalizeClipboardText(inlineElement.textContent) !== selectedText) {
    return null
  }

  return inlineElement
}

const getSelectedSingleLocationElement = (
  domSelection: Selection | null | undefined,
  document: Document
): HTMLElement | null => getSelectedSingleInlineElement(
  domSelection,
  document,
  '.location-mention[data-location-id]'
)

const getSelectedSinglePersonElement = (
  domSelection: Selection | null | undefined,
  document: Document
): HTMLElement | null => getSelectedSingleInlineElement(
  domSelection,
  document,
  '.person-mention[data-person-id]'
)

const writeInlineAtomClipboardSelection = ({
  clipboardData,
  node,
  label,
  schema,
  document,
}: {
  clipboardData:
    | Pick<DataTransfer, 'clearData' | 'setData'>
    | null
    | undefined
  node: ProseMirrorNode | null
  label: string | null
  schema: Schema
  document: Document
}): boolean => {
  if (!clipboardData || !node) {
    return false
  }

  const serializer = DOMSerializer.fromSchema(schema)
  const container = document.createElement('div')
  container.appendChild(serializer.serializeFragment(Fragment.from(node), { document }))

  clipboardData.clearData()
  clipboardData.setData('text/html', container.innerHTML)
  clipboardData.setData('text/plain', label || '')

  return true
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

export const writeInlineLocationClipboardSelection = ({
  clipboardData,
  domSelection,
  schema,
  document,
}: {
  clipboardData:
    | Pick<DataTransfer, 'clearData' | 'setData'>
    | null
    | undefined
  domSelection: Selection | null | undefined
  schema: Schema
  document: Document
}): boolean => {
  if (!clipboardData) {
    return false
  }

  const selectedLocationElement = getSelectedSingleLocationElement(domSelection, document)
  const locationType = schema.nodes.location

  if (!selectedLocationElement || !locationType) {
    return false
  }

  const label =
    selectedLocationElement.dataset.locationLabel ||
    normalizeClipboardText(selectedLocationElement.textContent) ||
    null

  const locationNode = locationType.create({
    id: selectedLocationElement.dataset.locationId || null,
    label,
    'data-name': selectedLocationElement.dataset.locationName || label,
    'data-country': selectedLocationElement.dataset.locationCountry || '',
    'data-coords': selectedLocationElement.dataset.locationCoords || null,
  })

  return writeInlineAtomClipboardSelection({
    clipboardData,
    node: locationNode,
    label,
    schema,
    document,
  })
}

export const writeInlinePersonClipboardSelection = ({
  clipboardData,
  domSelection,
  schema,
  document,
}: {
  clipboardData:
    | Pick<DataTransfer, 'clearData' | 'setData'>
    | null
    | undefined
  domSelection: Selection | null | undefined
  schema: Schema
  document: Document
}): boolean => {
  if (!clipboardData) {
    return false
  }

  const selectedPersonElement = getSelectedSinglePersonElement(domSelection, document)
  const personType = schema.nodes.person

  if (!selectedPersonElement || !personType) {
    return false
  }

  const label =
    selectedPersonElement.dataset.personLabel ||
    normalizeClipboardText(selectedPersonElement.textContent) ||
    null

  const personNode = personType.create({
    id: selectedPersonElement.dataset.personId || null,
    label,
    'data-name': selectedPersonElement.dataset.personName || label,
  })

  return writeInlineAtomClipboardSelection({
    clipboardData,
    node: personNode,
    label,
    schema,
    document,
  })
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
  selection: PMSelection
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
