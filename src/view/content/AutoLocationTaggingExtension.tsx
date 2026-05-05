import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { debounce } from 'lodash'

export const AutoLocationTaggingPluginKey = new PluginKey('autoLocationTagging')

const ANALYZE_DEBOUNCE_MS = 5000
export const FROM_AUTO_LOCATION_TAGGING_META = 'fromAutoLocationTagging'

type DetectedLocation = {
  text: string
  confidence?: number
}

type SentenceAnalysisTarget = {
  text: string
  from: number
  to: number
  indexToPos: number[]
}

const slugifyLocationId = (value: string): string => {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '')
    .slice(0, 80) || 'unknown'
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

const linearizeTextRange = (doc: any, from: number, to: number) => {
  const textParts: string[] = []
  const indexToPos: number[] = []

  doc.nodesBetween(from, to, (node: any, pos: number) => {
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

const getSentenceAnalysisTarget = (doc: any, selectionTo: number): SentenceAnalysisTarget | null => {
  const pos = selectionTo
  const blockRange = getContainingTextBlockRange(doc, pos)
  if (!blockRange) return null

  const { text, indexToPos } = linearizeTextRange(doc, blockRange.start, blockRange.end)
  if (!text.trim()) return null

  const cursorIndex = indexToPos.findIndex((textPos) => textPos >= pos)
  const endBiasedCursorIndex = cursorIndex === -1 ? text.length : cursorIndex
  const anchorIndex = Math.max(0, endBiasedCursorIndex - 1)
  const separatorRegex = /[.!?\n]/

  let sentenceStartIndex = 0
  for (let index = anchorIndex - 1; index >= 0; index -= 1) {
    if (separatorRegex.test(text[index])) {
      sentenceStartIndex = index + 1
      break
    }
  }

  let sentenceEndIndex = text.length
  for (let index = anchorIndex; index < text.length; index += 1) {
    if (separatorRegex.test(text[index])) {
      sentenceEndIndex = index + 1
      break
    }
  }

  while (sentenceStartIndex < sentenceEndIndex && /\s/.test(text[sentenceStartIndex])) {
    sentenceStartIndex += 1
  }
  while (sentenceEndIndex > sentenceStartIndex && /\s/.test(text[sentenceEndIndex - 1])) {
    sentenceEndIndex -= 1
  }

  if (sentenceEndIndex <= sentenceStartIndex) return null

  return {
    text: text.slice(sentenceStartIndex, sentenceEndIndex),
    from: indexToPos[sentenceStartIndex],
    to: indexToPos[sentenceEndIndex - 1] + 1,
    indexToPos: indexToPos.slice(sentenceStartIndex, sentenceEndIndex),
  }
}

export const AutoLocationTaggingExtension = Extension.create({
  name: 'autoLocationTagging',

  addProseMirrorPlugins() {
    let lastAnalyzedText = ''
    let isAnalyzing = false
    let viewRef: any = null

    const fetchLlmLocations = async (text: string): Promise<string[]> => {
      const response = await fetch('/api/analyze-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) return []

      const data = await response.json()
      const locations: DetectedLocation[] = Array.isArray(data?.locations)
        ? data.locations
        : []

      return locations
        .filter((location) => (
          typeof location?.text === 'string' &&
          location.text.trim().length > 1 &&
          (typeof location.confidence !== 'number' || location.confidence >= 0.55)
        ))
        .map((location) => location.text.trim())
    }

    const mergeLocationTexts = (...locationGroups: string[][]): string[] => {
      const locationsByKey = new Map<string, string>()

      locationGroups.flat().forEach((location) => {
        const normalized = location.replace(/^📍\s*/, '').replace(/\s+/g, ' ').trim()
        if (normalized.length < 2) return

        locationsByKey.set(normalized.toLocaleLowerCase(), normalized)
      })

      return Array.from(locationsByKey.values()).sort((a, b) => b.length - a.length)
    }

    const applyLocationTags = (locations: string[], target: SentenceAnalysisTarget) => {
      if (!viewRef) return
      const { state } = viewRef
      const locationType = state.schema.nodes['location']
      if (!locationType) return

      const ranges: Array<{ from: number; to: number; label: string }> = []

      const addRangesForString = (searchString: string) => {
        if (!searchString || typeof searchString !== 'string') return
        let startIndex = 0
        while (startIndex <= target.text.length) {
          const foundIndex = target.text.indexOf(searchString, startIndex)
          if (foundIndex === -1) break

          const from = target.indexToPos[foundIndex]
          const to = target.indexToPos[foundIndex + searchString.length - 1] + 1
          if (
            !Number.isFinite(from) ||
            !Number.isFinite(to) ||
            from < 0 ||
            to > state.doc.content.size ||
            from >= to
          ) {
            startIndex = foundIndex + searchString.length
            continue
          }

          let intersectsLocationNode = false
          state.doc.nodesBetween(from, to, (node: any) => {
            if (node.type && node.type.name === 'location') {
              intersectsLocationNode = true
              return false
            }
            return true
          })

          if (!intersectsLocationNode) {
            ranges.push({ from, to, label: searchString })
          }

          startIndex = foundIndex + searchString.length
        }
      }

      locations.forEach(addRangesForString)

      if (ranges.length === 0) return

      ranges.sort((a, b) => {
        if (a.from === b.from) return b.to - a.to
        return a.from - b.from
      })

      const nonOverlapping: typeof ranges = []
      let currentEnd = -1
      for (const r of ranges) {
        if (r.from >= currentEnd) {
          nonOverlapping.push(r)
          currentEnd = r.to
        }
      }

      const sortedDesc = nonOverlapping.sort((a, b) => b.from - a.from)

      let tr = state.tr
      const selectionBeforeTagging = state.selection
      let applied = 0
      for (const r of sortedDesc) {
        let intersects = false
        tr.doc.nodesBetween(r.from, r.to, (n: any) => {
          if (n.type && n.type.name === 'location') {
            intersects = true
            return false
          }
          return true
        })
        if (intersects) continue

        const node = locationType.create({
          id: `loc:auto-${slugifyLocationId(r.label)}`,
          label: `📍 ${r.label}`,
          'data-name': r.label,
          'data-country': null,
          'data-coords': null,
        })
        tr = tr.replaceWith(r.from, r.to, node)
        applied++
      }

      if (applied > 0) {
        const mappedSelectionFrom = tr.mapping.map(selectionBeforeTagging.from, 1)
        const mappedSelectionTo = tr.mapping.map(selectionBeforeTagging.to, 1)
        tr = tr.setSelection(
          TextSelection.between(
            tr.doc.resolve(Math.min(mappedSelectionFrom, tr.doc.content.size)),
            tr.doc.resolve(Math.min(mappedSelectionTo, tr.doc.content.size)),
          ),
        )
        tr.setMeta(FROM_AUTO_LOCATION_TAGGING_META, true)
        tr.setMeta('fromTypingLocationScan', true)
        viewRef.dispatch(tr)
      }
    }

    const analyzeAndTag = debounce(async (target: SentenceAnalysisTarget) => {
      if (!viewRef) return
      if (isAnalyzing) return
      isAnalyzing = true
      try {
        const llmLocations = await fetchLlmLocations(target.text)
        const latestState = viewRef?.state
        const latestTarget = latestState
          ? getSentenceAnalysisTarget(latestState.doc, latestState.selection.to)
          : null
        if (!latestTarget || latestTarget.text.trim() !== target.text.trim()) {
          return
        }

        applyLocationTags(mergeLocationTexts(llmLocations), latestTarget)
      } catch (err) {
        console.error('Auto location tagging error:', err)
      } finally {
        isAnalyzing = false
      }
    }, ANALYZE_DEBOUNCE_MS)

    return [
      new Plugin({
        key: AutoLocationTaggingPluginKey,
        view(editorView) {
          viewRef = editorView
          return {
            destroy() {
              viewRef = null
            }
          }
        },
        state: {
          init() {
            return ''
          },
          apply(tr: any, oldState: any) {
            const previousText: string = (oldState as unknown as string) || ''

            if (tr.getMeta(FROM_AUTO_LOCATION_TAGGING_META)) {
              return previousText
            }

            let fullText = ''
            tr.doc.descendants((node: any) => {
              if (node.isText) {
                fullText += node.text
              } else if (node.type && node.type.name === 'location' && node.attrs.label) {
                fullText += node.attrs.label
              }
              return true
            })
            if (!fullText) {
              fullText = tr.doc.textContent
            }

            const target = getSentenceAnalysisTarget(tr.doc, tr.selection.to)
            const targetSignature = target ? `${target.from}:${target.to}:${target.text}` : ''

            if (tr.docChanged && fullText !== previousText && target && targetSignature !== lastAnalyzedText && target.text.trim().length > 1) {
              lastAnalyzedText = targetSignature
              analyzeAndTag(target)
            }

            return fullText
          }
        }
      })
    ]
  }
})
