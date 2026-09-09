import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { TextSelection } from '@tiptap/pm/state'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TimePointNode } from '../content/TimePointMention'
import { ExternalPortalExtension, extractSelectionToSubnote } from './ExternalPortalExtension'

// Extracting a selection into a sub-note is how an event is born from a trip
// note: the selected line becomes its own note, and an externalPortal atom
// takes its place. A line with a time but no date inherits the nearest date
// above it, appended inline, so the new note stands alone as an event.
let editor: Editor
const created: Array<{ noteId: string; content: { content: unknown[] } }> = []

const time = (hour: number, minute: number) => ({ type: 'timepoint', attrs: { id: `timepoint:time-${hour}-${minute}`, label: `${hour}:${minute}` } })
const date = (y: number, m: number, d: number) => ({ type: 'timepoint', attrs: { id: `timepoint:date-${y}-${m}-${d}`, label: `${d}/${m}` } })
const p = (...content: unknown[]) => ({ type: 'paragraph', content })
const t = (text: string) => ({ type: 'text', text })

/** A block as its tag ids and text, without the timepoint node's default attrs. */
const shapeOf = (block: unknown) => {
  const typed = block as { type: string; content?: Array<{ type: string; text?: string; attrs?: { id?: string } }> }
  return { type: typed.type, content: (typed.content ?? []).map(node => node.type === 'text' ? node.text : node.attrs?.id) }
}

beforeEach(() => {
  created.length = 0
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
    created.push(JSON.parse(init.body))
    return new Response('{}', { status: 200 })
  }))
})

afterEach(() => {
  editor?.destroy()
  vi.unstubAllGlobals()
})

const make = (content: unknown) => {
  editor = new Editor({ extensions: [Document, Paragraph, Text, HardBreak, TimePointNode, ExternalPortalExtension], content: { type: 'doc', content } })
  return editor
}

/** Select the whole of the block at `index`. */
const selectBlock = (index: number) => {
  const doc = editor.state.doc
  const from = doc.resolve(0).posAtIndex(index)
  const to = from + doc.child(index).nodeSize
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(doc, from + 1, to - 1)))
}

describe('extractSelectionToSubnote', () => {
  it('moves the selected line into a new note and leaves a portal in its place', async () => {
    make([p(t('Roadtrip')), p(t('Pack the car'))])
    selectBlock(1)
    const noteId = await extractSelectionToSubnote(editor)
    expect(noteId).toBeTruthy()
    expect(created).toHaveLength(1)
    expect(created[0].noteId).toBe(noteId)
    expect(created[0].content.content).toEqual([p(t('Pack the car'))])
    const blocks = editor.getJSON().content ?? []
    expect(blocks.map(block => block.type)).toEqual(['paragraph', 'externalPortal'])
    expect(blocks[1].attrs?.externalQuantaId).toBe(noteId)
  })

  it('a timed line without a date inherits the nearest date above it, inline after a separator', async () => {
    make([p(date(2026, 9, 12)), p(time(12, 0), t(' Arrive at Shoal Bay')), p(date(2026, 9, 13)), p(time(9, 0), t(' Leave'))])
    selectBlock(1)
    await extractSelectionToSubnote(editor)
    expect(created[0].content.content.map(shapeOf)).toEqual([shapeOf(p(time(12, 0), t(' Arrive at Shoal Bay'), t(' · '), date(2026, 9, 12)))])
  })

  it('a line that already carries a date is taken as it is', async () => {
    make([p(date(2026, 9, 12)), p(t('Dinner '), time(19, 0), t(' · '), date(2026, 9, 13))])
    selectBlock(1)
    await extractSelectionToSubnote(editor)
    expect(created[0].content.content.map(shapeOf)).toEqual([shapeOf(p(t('Dinner '), time(19, 0), t(' · '), date(2026, 9, 13)))])
  })

  it('a line with no time does not inherit a date', async () => {
    make([p(date(2026, 9, 12)), p(t('Remember sunscreen'))])
    selectBlock(1)
    await extractSelectionToSubnote(editor)
    expect(created[0].content.content).toEqual([p(t('Remember sunscreen'))])
  })

  it('refuses to extract a sub-note that is already a portal', async () => {
    make([{ type: 'externalPortal', attrs: { externalQuantaId: 'n1' } }])
    editor.commands.setNodeSelection(0)
    await expect(extractSelectionToSubnote(editor)).rejects.toThrow('already a sub-note')
    expect(created).toHaveLength(0)
  })

  it('keeps the parent intact when the note cannot be created', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 })))
    make([p(t('Roadtrip')), p(t('Pack the car'))])
    selectBlock(1)
    await expect(extractSelectionToSubnote(editor)).rejects.toThrow('nope')
    expect(editor.getJSON().content).toEqual([p(t('Roadtrip')), p(t('Pack the car'))])
  })
})

describe('externalPortal HTML round trip', () => {
  it('parses only div[data-external-portal="true"] and keeps the note id', () => {
    make([p(t('x'))])
    editor.commands.setContent('<div data-external-portal="true" data-external-quanta-id="n1"></div><div>plain</div>')
    const [portal, plain] = editor.getJSON().content ?? []
    expect(portal).toMatchObject({ type: 'externalPortal', attrs: { externalQuantaId: 'n1', lens: 'identity' } })
    expect(plain.type).toBe('paragraph')
    expect(editor.getHTML()).toContain('<div data-external-portal="true" data-external-quanta-id="n1"></div>')
  })
})
