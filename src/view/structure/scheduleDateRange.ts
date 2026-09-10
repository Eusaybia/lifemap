import type { Node } from '@tiptap/pm/model'

export function scheduleDateRange(doc: Node, position: number) {
  const resolved = doc.resolve(position)
  let context = doc
  for (let depth = resolved.depth; depth > 0; depth--) {
    const node = resolved.node(depth)
    if (node.type.name === 'group' || node.type.name === 'temporalSpace') {
      context = node
      break
    }
  }
  const dates = new Set<string>()
  context.descendants(node => {
    const match = typeof node.attrs.id === 'string' && node.attrs.id.match(/^timepoint:date-(\d{4})-(\d{1,2})-(\d{1,2})(?:$|\D)/)
    if (!match) return
    const [, year, month, day] = match
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return
    dates.add(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  })
  const ordered = [...dates].sort()
  return ordered.length ? { start: ordered[0], end: ordered[ordered.length - 1] } : null
}
