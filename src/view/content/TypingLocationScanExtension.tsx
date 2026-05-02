import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

import { detectLocationsWithTransformers } from './TransformersLocationClient'
import { mergeLocationEntities } from './TransformersLocationSpans'

const TypingLocationScanPluginKey = new PluginKey('typingLocationScan')
const FROM_TYPING_LOCATION_SCAN_META = 'fromTypingLocationScan'

const SCAN_DEBOUNCE_MS = 250
const MATCH_LOOKBACK_CHARS = 12

type PendingRange = {
  from: number
  to: number
}

type LinearizedText = {
  text: string
  indexToPos: number[]
}

const linearizeTextBlock = (doc: any, blockStart: number, blockEnd: number): LinearizedText => {
  const textParts: string[] = []
  const indexToPos: number[] = []

  doc.nodesBetween(blockStart, blockEnd, (node: any, pos: number) => {
    if (!node.isText) return true

    const value = node.text || ''
    for (let index = 0; index < value.length; index += 1) {
      indexToPos.push(pos + index)
    }
    textParts.push(value)
    return false
  })

  return {
    text: textParts.join(''),
    indexToPos,
  }
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

const slugifyLocationId = (value: string): string => {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '')
    .slice(0, 80) || 'unknown'
}

const findDetectedMatches = (
  text: string,
  indexToPos: number[],
  pendingRange: PendingRange,
  locationTexts: string[],
) => {
  const matches: Array<{ from: number; to: number; attrs: Record<string, string | null> }> = []

  for (const locationText of locationTexts) {
    let searchIndex = 0

    while (searchIndex < text.length) {
      const matchIndex = text.indexOf(locationText, searchIndex)
      if (matchIndex === -1) break

      const docFrom = indexToPos[matchIndex]
      const docTo = indexToPos[matchIndex + locationText.length - 1] + 1

      const touchesRecentTyping =
        docTo >= pendingRange.from - MATCH_LOOKBACK_CHARS &&
        docFrom <= pendingRange.to + MATCH_LOOKBACK_CHARS

      if (touchesRecentTyping) {
        matches.push({
          from: docFrom,
          to: docTo,
          attrs: {
            id: `loc:auto-${slugifyLocationId(locationText)}`,
            label: `📍 ${locationText}`,
            'data-name': locationText,
            'data-country': null,
            'data-coords': null,
          },
        })
      }

      searchIndex = matchIndex + locationText.length
    }
  }

  return matches
}

export const TypingLocationScanExtension = Extension.create({
  name: 'typingLocationScan',

  addProseMirrorPlugins() {
    let pendingRange: PendingRange | null = null
    let debounceHandle: ReturnType<typeof setTimeout> | null = null
    let latestScanRequestId = 0
    let viewRef: any = null

    const queueScanRange = (view: any, from: number, to: number) => {
      const safeFrom = Math.max(0, Math.min(from, to))
      const safeTo = Math.max(safeFrom, to)

      if (!pendingRange) {
        pendingRange = { from: safeFrom, to: safeTo }
      } else {
        pendingRange = {
          from: Math.min(pendingRange.from, safeFrom),
          to: Math.max(pendingRange.to, safeTo),
        }
      }

      scheduleScan(view)
    }

    const scheduleScan = (view: any) => {
      if (debounceHandle) {
        clearTimeout(debounceHandle)
      }

      debounceHandle = setTimeout(() => {
        debounceHandle = null

        if (!pendingRange) return

        const currentPendingRange = pendingRange
        pendingRange = null

        const { state } = view
        const locationType = state.schema.nodes.location
        if (!locationType) return

        const blockRange = getContainingTextBlockRange(state.doc, currentPendingRange.to)
        if (!blockRange) return

        const { text, indexToPos } = linearizeTextBlock(state.doc, blockRange.start, blockRange.end)
        if (!text) return

        const scanRequestId = latestScanRequestId + 1
        latestScanRequestId = scanRequestId

        void detectLocationsWithTransformers(text)
          .then((entities) => {
            if (scanRequestId !== latestScanRequestId) return

            const spans = mergeLocationEntities(entities, {
              minScore: 0.7,
              minTextLength: 2,
            })
            if (!spans.length) return

            const matches = findDetectedMatches(
              text,
              indexToPos,
              currentPendingRange,
              spans.map((span) => span.text),
            )
            if (!matches.length) return

            const currentState = view.state
            let tr = currentState.tr
            let changed = false

            matches
              .sort((a, b) => b.from - a.from)
              .forEach((match) => {
                let intersectsExistingLocation = false

                currentState.doc.nodesBetween(match.from, match.to, (node: any) => {
                  if (node.type?.name === 'location') {
                    intersectsExistingLocation = true
                    return false
                  }
                  return true
                })

                if (intersectsExistingLocation) return

                tr = tr.replaceWith(match.from, match.to, locationType.create(match.attrs))
                tr = tr.setSelection(TextSelection.near(tr.doc.resolve(match.from + 1)))
                changed = true
              })

            if (changed) {
              tr.setMeta(FROM_TYPING_LOCATION_SCAN_META, true)
              view.dispatch(tr)
            }
          })
          .catch((error) => {
            console.error('[TypingLocationScanExtension] Transformers.js detection failed:', error)
          })
      }, SCAN_DEBOUNCE_MS)
    }

    return [
      new Plugin({
        key: TypingLocationScanPluginKey,
        state: {
          init() {
            return null
          },
          apply(transaction, value, _oldState, newState) {
            if (
              transaction.docChanged &&
              viewRef &&
              !transaction.getMeta(FROM_TYPING_LOCATION_SCAN_META)
            ) {
              const to = newState.selection.to
              queueScanRange(viewRef, Math.max(0, to - 160), to)
            }

            return value
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            if (!text) return false

            const insertedTo = from + text.length
            queueScanRange(view, from, insertedTo)
            return false
          },
        },
        view(editorView) {
          viewRef = editorView
          return {
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

export default TypingLocationScanExtension
