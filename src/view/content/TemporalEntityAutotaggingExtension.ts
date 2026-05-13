import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

import { parseTemporalEntities, ParsedTemporalEntity } from './TemporalEntityParser'

export const TemporalEntityAutotaggingPluginKey = new PluginKey('temporalEntityAutotagging')

const SCAN_DEBOUNCE_MS = 900
const MIN_ANALYSIS_CHARS = 4

declare global {
  interface Window {
    __LIFEMAP_SUPPRESS_TEMPORAL_AUTOTAGGING_UNTIL_INPUT__?: boolean
  }
}

type TextSegment = {
  text: string
  startIndex: number
  endIndex: number
  from: number
  to: number
  isPlainText: boolean
}

type LinearizedTextBlock = {
  text: string
  indexToPos: number[]
  segments: TextSegment[]
}

const appendSegment = (
  linearized: LinearizedTextBlock,
  segment: Omit<TextSegment, 'startIndex' | 'endIndex'>,
) => {
  if (!segment.text) return

  const startIndex = linearized.text.length
  const endIndex = startIndex + segment.text.length

  linearized.text += segment.text
  linearized.segments.push({
    ...segment,
    startIndex,
    endIndex,
  })

  for (let index = 0; index < segment.text.length; index += 1) {
    linearized.indexToPos.push(segment.from + index)
  }
}

export const linearizeTextBlockForTemporalEntities = (
  doc: any,
  blockStart: number,
  blockEnd: number,
): LinearizedTextBlock => {
  const linearized: LinearizedTextBlock = {
    text: '',
    indexToPos: [],
    segments: [],
  }

  doc.nodesBetween(blockStart, blockEnd, (node: any, pos: number) => {
    if (node.type?.name === 'timepoint' || node.type?.name === 'location') {
      return false
    }

    if (!node.isText) return true

    appendSegment(linearized, {
      text: node.text || '',
      from: pos,
      to: pos + (node.text || '').length,
      isPlainText: true,
    })

    return false
  })

  return linearized
}

const getContainingTextBlockRange = (doc: any, pos: number) => {
  const clampedPos = Math.max(0, Math.min(pos, doc.content.size))
  const safePos = clampedPos === doc.content.size && clampedPos > 0 ? clampedPos - 1 : clampedPos
  const $pos = doc.resolve(safePos)

  for (let depth = $pos.depth; depth >= 0; depth -= 1) {
    const node = $pos.node(depth)
    if (!node.isTextblock) continue

    return {
      start: $pos.start(depth),
      end: $pos.end(depth),
    }
  }

  return null
}

const findPlainTextSegmentForEntity = (
  entity: ParsedTemporalEntity,
  segments: TextSegment[],
) => (
  segments.find((segment) => (
    segment.isPlainText &&
    entity.start >= segment.startIndex &&
    entity.end <= segment.endIndex
  ))
)

const applyTemporalEntityTags = (
  view: any,
  linearized: LinearizedTextBlock,
  entities: ParsedTemporalEntity[],
) => {
  const { state } = view
  const timepointType = state.schema.nodes.timepoint
  if (!timepointType) return

  const operations = entities
    .map((entity) => {
      const segment = findPlainTextSegmentForEntity(entity, linearized.segments)
      if (!segment) return null

      const from = linearized.indexToPos[entity.start]
      const to = linearized.indexToPos[entity.end - 1] + 1
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null

      return {
        from,
        to,
        entity,
      }
    })
    .filter((operation): operation is { from: number; to: number; entity: ParsedTemporalEntity } => Boolean(operation))
    .sort((a, b) => b.from - a.from)

  if (!operations.length) return

  let tr = state.tr
  let changed = false

  operations.forEach((operation) => {
    let intersectsExistingAtom = false
    state.doc.nodesBetween(operation.from, operation.to, (node: any) => {
      if (node.type?.name === 'timepoint' || node.type?.name === 'location') {
        intersectsExistingAtom = true
        return false
      }
      return true
    })
    if (intersectsExistingAtom) return

    tr = tr.replaceWith(operation.from, operation.to, timepointType.create(operation.entity.attrs))
    changed = true
  })

  if (!changed) return

  tr.setMeta('fromTemporalEntityAutotagging', true)
  view.dispatch(tr)
}

export const TemporalEntityAutotaggingExtension = Extension.create({
  name: 'temporalEntityAutotagging',

  addProseMirrorPlugins() {
    let pendingPos: number | null = null
    let debounceHandle: ReturnType<typeof setTimeout> | null = null
    let lastAnalyzedText = ''
    let viewRef: any = null

    const runScan = (view: any, currentPos: number) => {
      if (typeof window !== 'undefined' && window.__LIFEMAP_SUPPRESS_TEMPORAL_AUTOTAGGING_UNTIL_INPUT__) {
        return
      }

      const { state } = view
      const blockRange = getContainingTextBlockRange(state.doc, currentPos)
      if (!blockRange) return

      const linearized = linearizeTextBlockForTemporalEntities(state.doc, blockRange.start, blockRange.end)
      if (linearized.text.trim().length < MIN_ANALYSIS_CHARS) return
      if (linearized.text === lastAnalyzedText) return
      lastAnalyzedText = linearized.text

      const entities = parseTemporalEntities(linearized.text)
      if (!entities.length) return

      applyTemporalEntityTags(view, linearized, entities)
    }

    const scheduleScan = (view: any) => {
      if (debounceHandle) {
        clearTimeout(debounceHandle)
      }

      debounceHandle = setTimeout(() => {
        debounceHandle = null

        if (pendingPos === null) return

        const currentPos = pendingPos
        pendingPos = null

        runScan(view, currentPos)
      }, SCAN_DEBOUNCE_MS)
    }

    return [
      new Plugin({
        key: TemporalEntityAutotaggingPluginKey,
        state: {
          init() {
            return null
          },
          apply(transaction, value, _oldState, newState) {
            if (
              transaction.docChanged &&
              viewRef &&
              !transaction.getMeta('fromTemporalEntityAutotagging') &&
              !transaction.getMeta('fromTemporalRelationAutotagging')
            ) {
              pendingPos = newState.selection.to
              scheduleScan(viewRef)
            }

            return value
          },
        },
        props: {
          handleTextInput(view, from, _to, text) {
            if (!text) return false

            pendingPos = from + text.length
            scheduleScan(view)
            return false
          },
        },
        view(editorView) {
          viewRef = editorView
          return {
            update(view, previousState) {
              if (previousState.doc.eq(view.state.doc)) return

              pendingPos = view.state.selection.to
              scheduleScan(view)
            },
            destroy() {
              viewRef = null
              if (debounceHandle) {
                clearTimeout(debounceHandle)
                debounceHandle = null
              }
            },
          }
        },
      }),
    ]
  },
})

export default TemporalEntityAutotaggingExtension
