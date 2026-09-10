import { describe, expect, it } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { scheduleDateRange } from './scheduleDateRange'
const schema = new Schema({ nodes: {
  doc: { content: 'block*' }, text: {},
  group: { group: 'block', content: 'block*' },
  paragraph: { group: 'block', content: 'inline*' },
  date: { inline: true, group: 'inline', attrs: { id: {} } },
  calendar: { group: 'block' },
} })
const date = (id: string) => schema.node('paragraph', null, [schema.node('date', { id: `timepoint:date-${id}` })])
describe('schedule date context', () => {
  it('takes chronological extrema and ignores invalid dates', () => {
    const doc = schema.node('doc', null, [schema.node('calendar'), date('2026-9-14'), date('2026-9-6'), date('2026-2-30')])
    expect(scheduleDateRange(doc, 0)).toEqual({ start: '2026-09-06', end: '2026-09-14' })
  })
  it('uses the surrounding group instead of unrelated note dates', () => {
    const doc = schema.node('doc', null, [schema.node('group', null, [schema.node('calendar'), date('2026-9-7')]), date('2027-1-1')])
    expect(scheduleDateRange(doc, 1)).toEqual({ start: '2026-09-07', end: '2026-09-07' })
  })
  it('has no inferred range without date tags', () => {
    expect(scheduleDateRange(schema.node('doc', null, [schema.node('calendar')]), 0)).toBeNull()
  })
})
