import { Extension } from '@tiptap/core'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const SingleFocusTagPluginKey = new PluginKey('singleFocusTag')

type FocusTagRange = { from: number; to: number }

const normalizeTagValue = (value: unknown): string => String(value ?? '').trim().toLowerCase()

const isFocusTagNode = (node: ProseMirrorNode): boolean => {
  if (node.type.name !== 'hashtag' && node.type.name !== 'mention') return false

  const label = normalizeTagValue(node.attrs.label)
  const dataTag = normalizeTagValue(node.attrs['data-tag'])
  const id = normalizeTagValue(node.attrs.id)

  return (
    label.includes('☀️ focus') ||
    label === 'focus' ||
    label === '#focus' ||
    dataTag === 'focus' ||
    id === 'tag:focus'
  )
}

const collectFocusTagRanges = (doc: ProseMirrorNode): FocusTagRange[] => {
  const ranges: FocusTagRange[] = []

  doc.descendants((node, pos) => {
    if (!isFocusTagNode(node)) return
    ranges.push({ from: pos, to: pos + node.nodeSize })
  })

  return ranges
}

const getDistanceToRange = (range: FocusTagRange, position: number): number => {
  if (position < range.from) return range.from - position
  if (position > range.to) return position - range.to
  return 0
}

const pickRangeToKeep = (ranges: FocusTagRange[], selectionPos: number): FocusTagRange => {
  let selected = ranges[0]
  let bestDistance = getDistanceToRange(selected, selectionPos)

  for (let i = 1; i < ranges.length; i++) {
    const candidate = ranges[i]
    const candidateDistance = getDistanceToRange(candidate, selectionPos)

    if (
      candidateDistance < bestDistance ||
      (candidateDistance === bestDistance && candidate.from > selected.from)
    ) {
      selected = candidate
      bestDistance = candidateDistance
    }
  }

  return selected
}

export const FocusModePlugin = Extension.create({
  name: 'focusMode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SingleFocusTagPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) return null

          const newFocusTags = collectFocusTagRanges(newState.doc)
          if (newFocusTags.length <= 1) return null

          // Keep the tag nearest to the current cursor/selection, which corresponds to
          // the newly inserted focus tag in normal typing/suggestion flows.
          const keepRange = pickRangeToKeep(newFocusTags, newState.selection.from)
          const transaction = newState.tr

          newFocusTags
            .slice()
            .sort((left, right) => right.from - left.from)
            .forEach((range) => {
              if (range.from === keepRange.from && range.to === keepRange.to) return
              transaction.delete(range.from, range.to)
            })

          if (!transaction.docChanged) return null
          return transaction
        },
      }),
    ]
  },
})
