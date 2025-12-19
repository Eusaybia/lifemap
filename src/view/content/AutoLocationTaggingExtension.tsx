import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { debounce } from 'lodash'

export const AutoLocationTaggingPluginKey = new PluginKey('autoLocationTagging')

export const AutoLocationTaggingExtension = Extension.create({
  name: 'autoLocationTagging',

  addProseMirrorPlugins() {
    let lastAnalyzedText = ''
    let isAnalyzing = false
    let viewRef: any = null

    const ANALYZE_DEBOUNCE_MS = 5000

    const applyLocationTags = (locations: string[]) => {
      if (!viewRef) return
      const { state } = viewRef
      const locationType = state.schema.nodes['location']
      if (!locationType) return

      const ranges: Array<{ from: number; to: number; label: string }> = []

      const addRangesForString = (searchString: string) => {
        if (!searchString || typeof searchString !== 'string') return
        state.doc.descendants((node: any, pos: number) => {
          if (node.type && node.type.name === 'location') {
            return false
          }
          if (!node.isText) return true
          const text: string = node.text || ''
          let startIndex = 0
          while (startIndex <= text.length) {
            const foundIndex = text.indexOf(searchString, startIndex)
            if (foundIndex === -1) break
            const from = pos + foundIndex
            const to = from + searchString.length

            let intersectsLocationNode = false
            state.doc.nodesBetween(from, to, (n: any) => {
              if (n.type && n.type.name === 'location') {
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
          return true
        })
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
      let applied = 0
      for (const r of sortedDesc) {
        // Double-check there is no location node intersecting this exact range
        let intersects = false
        state.doc.nodesBetween(r.from, r.to, (n: any) => {
          if (n.type && n.type.name === 'location') {
            intersects = true
            return false
          }
          return true
        })
        if (intersects) continue

        const node = locationType.create({ id: r.label, label: r.label })
        tr = tr.replaceWith(r.from, r.to, node)
        applied++
      }

      if (applied > 0) {
        tr.setMeta('fromAutoTagging', true)
        viewRef.dispatch(tr)
      }
    }

    const analyzeAndTag = debounce(async (text: string) => {
      if (!viewRef) return
      if (isAnalyzing) return
      isAnalyzing = true
      try {
        const response = await fetch('/api/analyze-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        })
        if (!response.ok) {
          console.error('Failed to analyze locations')
          return
        }
        const data = await response.json()
        const locations: string[] = Array.isArray(data.locations) ? data.locations : []
        applyLocationTags(locations)
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

            if (tr.getMeta('fromAutoTagging')) {
              return previousText
            }

            let newText = ''
            tr.doc.descendants((node: any) => {
              if (node.isText) {
                newText += node.text
              } else if (node.type && node.type.name === 'location' && node.attrs.label) {
                newText += node.attrs.label
              }
              return true
            })
            if (!newText) {
              newText = tr.doc.textContent
            }

            if (newText !== previousText && newText.trim().length > 10) {
              lastAnalyzedText = newText
              analyzeAndTag(newText)
            }

            return newText
          }
        }
      })
    ]
  }
}) 