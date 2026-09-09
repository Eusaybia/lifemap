import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { afterEach, describe, expect, it } from 'vitest'

import { PomodoroNode } from './PomodoroNode'

// A Pomodoro is an inline atom inside a note: a plan (unrealized) that becomes
// spent time (active, completed). These tests pin what the node stores, what
// it serialises to, and what a reader sees in static HTML.
let editor: Editor

const make = (content?: unknown) => {
  editor = new Editor({ extensions: [Document, Paragraph, Text, PomodoroNode], content })
  return editor
}

afterEach(() => editor?.destroy())

describe('insertPomodoro', () => {
  it('inserts an unrealized pomodoro with the given label and duration and a fresh id', () => {
    make('<p></p>')
    editor.commands.insertPomodoro({ label: '15 minutes', duration: 15 * 60 })
    const node = editor.getJSON().content?.[0].content?.[0]
    expect(node?.type).toBe('pomodoro')
    expect(node?.attrs).toMatchObject({ label: '15 minutes', duration: 900, status: 'unrealized', startTime: null, emoji: '⏳' })
    expect(node?.attrs?.id).toMatch(/^pomodoro:\d+$/)
  })
})

describe('HTML round trip', () => {
  it('parses only span[data-type="pomodoro"] and keeps every attribute', () => {
    make('<p>Plan: <span data-type="pomodoro" data-label="Deep work" data-duration="1500" data-emoji="🔥" data-status="completed" data-start-time="2026-09-10T09:00:00.000Z" data-end-time="2026-09-10T09:25:00.000Z" data-id="pomodoro:1" data-notes-quanta-id="q-1"></span> then <span data-type="other">x</span></p>')
    const [text, pomodoro, rest] = editor.getJSON().content?.[0].content ?? []
    expect(text).toMatchObject({ type: 'text', text: 'Plan: ' })
    expect(pomodoro?.attrs).toEqual({
      label: 'Deep work', duration: 1500, emoji: '🔥', status: 'completed',
      startTime: '2026-09-10T09:00:00.000Z', endTime: '2026-09-10T09:25:00.000Z', id: 'pomodoro:1', notesQuantaId: 'q-1',
    })
    expect(rest).toMatchObject({ type: 'text', text: ' then x' })
  })

  it('renders an unrealized pomodoro as its emoji and label, with no time range', () => {
    make({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'pomodoro', attrs: { label: '15 minutes', duration: 900, id: 'pomodoro:1' } }] }] })
    expect(editor.getHTML()).toBe('<p><span data-duration="900" data-label="15 minutes" data-emoji="⏳" data-status="unrealized" data-id="pomodoro:1" data-type="pomodoro">⏳ 15 minutes</span></p>')
  })

  it('renders a completed pomodoro with the time it actually took', () => {
    const start = new Date(2026, 8, 10, 9, 0)
    make({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'pomodoro', attrs: { label: 'Deep work', duration: 1500, status: 'completed', startTime: start.toISOString(), id: 'pomodoro:1' } }] }] })
    expect(editor.getText({ blockSeparator: '' })).toBe('')
    expect(editor.getHTML()).toContain('>⏳ Deep work || 🕐 09:00 - 09:25</span>')
  })

  it('renders a freeform pomodoro open-ended until it is completed', () => {
    const start = new Date(2026, 8, 10, 14, 30)
    const attrs = { label: 'Freeform', duration: -1, status: 'active', startTime: start.toISOString(), id: 'pomodoro:1', emoji: '☀️' }
    make({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'pomodoro', attrs }] }] })
    expect(editor.getHTML()).toContain('>☀️ Freeform || 🕐 14:30 - ?</span>')
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'pomodoro', attrs: { ...attrs, status: 'completed', endTime: new Date(2026, 8, 10, 15, 5).toISOString() } }] }] })
    expect(editor.getHTML()).toContain('>☀️ Freeform || 🕐 14:30 - 15:05</span>')
  })
})
