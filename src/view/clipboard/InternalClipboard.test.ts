import { expect, test } from 'vitest'
import { JSDOM } from 'jsdom'
import { Schema } from '@tiptap/pm/model'
import { EditorState, NodeSelection } from '@tiptap/pm/state'

import {
  INTERNAL_CLIPBOARD_MIME,
  buildInternalClipboardSlice,
  parseInternalClipboardNodes,
  readInternalClipboardPayload,
  writeInternalClipboardSelection,
  writeInlinePersonClipboardSelection,
} from './InternalClipboard'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    person: {
      group: 'inline',
      inline: true,
      atom: true,
      attrs: {
        id: { default: null },
        label: { default: null },
        'data-name': { default: null },
      },
      toDOM: (node) => ['span', {
        'data-type': 'person',
        class: 'person-mention',
        'data-id': node.attrs.id,
        'data-name': node.attrs['data-name'],
      }, node.attrs.label ?? ''],
      parseDOM: [{ tag: 'span[data-type="person"]' }],
    },
    paragraph: {
      group: 'block',
      content: 'inline*',
      toDOM: () => ['p', 0],
      parseDOM: [{ tag: 'p' }],
    },
    temporalSpace: {
      group: 'block',
      content: 'block*',
      toDOM: () => ['div', { 'data-temporal-space': 'true' }, 0],
      parseDOM: [{ tag: 'div[data-temporal-space="true"]' }],
    },
  },
})

const createClipboardDataStub = () => {
  const data = new Map<string, string>()

  return {
    data,
    clipboardData: {
      clearData: () => data.clear(),
      setData: (type: string, value: string) => {
        data.set(type, value)
      },
      getData: (type: string) => data.get(type) ?? '',
    },
  }
}

test('writeInternalClipboardSelection stores an exact block node payload', () => {
  const temporalSpaceNode = schema.node('temporalSpace', null, [
    schema.node('paragraph', null, [schema.text('Explore China to explore Daoism')]),
  ])
  const doc = schema.node('doc', null, [temporalSpaceNode])
  const state = EditorState.create({
    schema,
    doc,
    selection: NodeSelection.create(doc, 0),
  })
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const { clipboardData, data } = createClipboardDataStub()

  const handled = writeInternalClipboardSelection({
    clipboardData,
    selection: state.selection,
    schema,
    document: dom.window.document,
  })

  expect(handled).toBe(true)
  expect(readInternalClipboardPayload(clipboardData)).toBeTruthy()
  expect(data.get(INTERNAL_CLIPBOARD_MIME)).toContain('"kind":"node-selection"')
  expect(data.get('text/html')).toContain('data-temporal-space="true"')
  expect(data.get('text/plain')).toContain('Explore China to explore Daoism')
})

test('parseInternalClipboardNodes restores the original temporalSpace node', () => {
  const temporalSpaceNode = schema.node('temporalSpace', null, [
    schema.node('paragraph', null, [schema.text('Explore China to explore Daoism')]),
  ])
  const doc = schema.node('doc', null, [temporalSpaceNode])
  const state = EditorState.create({
    schema,
    doc,
    selection: NodeSelection.create(doc, 0),
  })
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const { clipboardData } = createClipboardDataStub()

  writeInternalClipboardSelection({
    clipboardData,
    selection: state.selection,
    schema,
    document: dom.window.document,
  })

  const nodes = parseInternalClipboardNodes(
    readInternalClipboardPayload(clipboardData),
    schema
  )

  expect(nodes).toHaveLength(1)
  expect(nodes[0]?.type.name).toBe('temporalSpace')
  expect(nodes[0]?.textContent).toContain('Explore China to explore Daoism')

  const slice = buildInternalClipboardSlice(nodes)
  expect(slice.openStart).toBe(0)
  expect(slice.openEnd).toBe(0)
  expect(slice.content.childCount).toBe(1)
})

test('writeInlinePersonClipboardSelection serializes an inline person mention selection', () => {
  const dom = new JSDOM(`
    <!doctype html>
    <html>
      <body>
        <span
          class="person-mention"
          data-person-id="person:jane-doe"
          data-person-label="👤 Jane Doe"
          data-person-name="Jane Doe"
        >👤 Jane Doe</span>
      </body>
    </html>
  `)
  const { clipboardData, data } = createClipboardDataStub()
  const personElement = dom.window.document.querySelector('.person-mention')
  const selection = dom.window.getSelection()
  const range = dom.window.document.createRange()

  if (!personElement || !selection) {
    throw new Error('Expected person mention selection test DOM to be available.')
  }

  range.selectNodeContents(personElement)
  selection.removeAllRanges()
  selection.addRange(range)

  const handled = writeInlinePersonClipboardSelection({
    clipboardData,
    domSelection: selection,
    schema,
    document: dom.window.document,
  })

  expect(handled).toBe(true)
  expect(data.get('text/html')).toContain('data-type="person"')
  expect(data.get('text/html')).toContain('Jane Doe')
  expect(data.get('text/plain')).toBe('👤 Jane Doe')
})
