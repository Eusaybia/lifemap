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

const SENTENCE_SEPARATOR_REGEX = /[.!?\n]/

const slugifyLocationId = (value: string): string => {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '')
    .slice(0, 80) || 'unknown'
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

const splitTextRangeIntoSentenceTargets = (
  text: string,
  indexToPos: number[],
): SentenceAnalysisTarget[] => {
  const targets: SentenceAnalysisTarget[] = []
  let sentenceStartIndex = 0

  const pushTarget = (rawEndIndex: number) => {
    let startIndex = sentenceStartIndex
    let endIndex = rawEndIndex

    while (startIndex < endIndex && /\s/.test(text[startIndex])) {
      startIndex += 1
    }
    while (endIndex > startIndex && /\s/.test(text[endIndex - 1])) {
      endIndex -= 1
    }

    if (endIndex > startIndex) {
      targets.push({
        text: text.slice(startIndex, endIndex),
        from: indexToPos[startIndex],
        to: indexToPos[endIndex - 1] + 1,
        indexToPos: indexToPos.slice(startIndex, endIndex),
      })
    }
  }

  for (let index = 0; index < text.length; index += 1) {
    if (SENTENCE_SEPARATOR_REGEX.test(text[index])) {
      pushTarget(index + 1)
      sentenceStartIndex = index + 1
    }
  }

  pushTarget(text.length)

  return targets
}

const getDocumentAnalysisTargets = (doc: any): SentenceAnalysisTarget[] => {
  const targets: SentenceAnalysisTarget[] = []

  doc.descendants((node: any, pos: number) => {
    if (!node.isTextblock) return true

    const from = pos + 1
    const to = pos + node.nodeSize - 1
    const { text, indexToPos } = linearizeTextRange(doc, from, to)

    if (text.trim()) {
      targets.push(...splitTextRangeIntoSentenceTargets(text, indexToPos))
    }

    return false
  })

  return targets
}

export const AutoLocationTaggingExtension = Extension.create({
  name: 'autoLocationTagging',

  addProseMirrorPlugins() {
    let lastAnalyzedText = ''
    let isAnalyzing = false
    let viewRef: any = null

    // After a failed call (bad key, quota, outage) the analysis pauses rather
    // than firing again on the next keystroke.
    let analysisPausedUntil = 0
    const FAILURE_BACKOFF_MS = 60_000

    const fetchLlmLocations = async (text: string): Promise<string[]> => {
      const response = await fetch('/api/analyze-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        analysisPausedUntil = Date.now() + FAILURE_BACKOFF_MS
        return []
      }

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

    const findLatestMatchingTarget = (target: SentenceAnalysisTarget): SentenceAnalysisTarget | null => {
      if (!viewRef) return null

      const normalizedTargetText = target.text.replace(/\s+/g, ' ').trim()
      const latestTargets = getDocumentAnalysisTargets(viewRef.state.doc)

      return latestTargets.find((latestTarget) => (
        latestTarget.text.replace(/\s+/g, ' ').trim() === normalizedTargetText
      )) || null
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

    const analyzeAndTag = debounce(async (targets: SentenceAnalysisTarget[]) => {
      if (!viewRef) return
      if (isAnalyzing) return
      if (Date.now() < analysisPausedUntil) return
      isAnalyzing = true
      try {
        // One request for the whole note: the model sees every sentence at
        // once, and an edit no longer costs one call per sentence.
        const latestTargets = targets
          .map(findLatestMatchingTarget)
          .filter((target): target is SentenceAnalysisTarget => target != null)
        if (latestTargets.length === 0) return
        const llmLocations = mergeLocationTexts(
          await fetchLlmLocations(latestTargets.map((target) => target.text).join('\n')),
        )
        if (llmLocations.length === 0) return
        for (const target of latestTargets) {
          const current = findLatestMatchingTarget(target)
          if (current) applyLocationTags(llmLocations, current)
        }
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

            const targets = getDocumentAnalysisTargets(tr.doc).filter((target) => target.text.trim().length > 1)
            const targetSignature = targets
              .map((target) => `${target.from}:${target.to}:${target.text}`)
              .join('|')

            if (tr.docChanged && fullText !== previousText && targets.length > 0 && targetSignature !== lastAnalyzedText) {
              lastAnalyzedText = targetSignature
              analyzeAndTag(targets)
            }

            return fullText
          }
        }
      })
    ]
  }
})
