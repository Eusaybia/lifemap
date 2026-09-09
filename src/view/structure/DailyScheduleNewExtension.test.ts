import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { afterEach, describe, expect, it } from 'vitest'

import { DailyScheduleNewExtension } from './DailyScheduleNewExtension'

// The Daily Schedule is a block atom that owns a schedule namespace (userId)
// and its own height. Its events are notes elsewhere; the node holds only the
// pointer, so these tests pin the pointer and the serialisation.
let editor: Editor

const make = (content?: unknown) => {
  editor = new Editor({ extensions: [Document, Paragraph, Text, DailyScheduleNewExtension], content })
  return editor
}

afterEach(() => editor?.destroy())

describe('insertDailyScheduleNew', () => {
  it('inserts a schedule with a fresh namespace and the default height', () => {
    make('<p></p>')
    expect(editor.commands.insertDailyScheduleNew()).toBe(true)
    const node = editor.getJSON().content?.find(candidate => candidate.type === 'dailyScheduleNew')
    expect(node?.attrs?.height).toBe(760)
    expect(typeof node?.attrs?.userId).toBe('string')
    expect(node?.attrs?.userId).not.toBe('')
  })

  it('gives each inserted schedule its own namespace', () => {
    make('<p></p>')
    editor.commands.insertDailyScheduleNew()
    // Inserting on a selected atom replaces it, as with any node selection;
    // put the caret in a fresh paragraph after it first.
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'paragraph' })
    editor.commands.insertDailyScheduleNew()
    const ids = (editor.getJSON().content ?? []).filter(node => node.type === 'dailyScheduleNew').map(node => node.attrs?.userId)
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
  })
})

describe('HTML round trip', () => {
  it('parses only section[data-type="daily-schedule-new"] and keeps the namespace', () => {
    make('<section data-type="daily-schedule-new" data-user-id="schedule-abc"></section><section>plain</section>')
    const [schedule, ...rest] = editor.getJSON().content ?? []
    expect(schedule).toMatchObject({ type: 'dailyScheduleNew', attrs: { userId: 'schedule-abc', height: 760 } })
    expect(rest.map(node => node.type)).toEqual(['paragraph'])
  })

  it('renders back to the same section', () => {
    make({ type: 'doc', content: [{ type: 'dailyScheduleNew', attrs: { userId: 'schedule-abc', height: 500 } }] })
    expect(editor.getHTML()).toBe('<section data-user-id="schedule-abc" data-type="daily-schedule-new"></section>')
  })
})
