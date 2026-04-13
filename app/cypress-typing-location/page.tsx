'use client'

import React from 'react'
import { EditorContent, type Editor } from '@tiptap/react'

import { MainEditor } from '../../src/view/content/RichText'
import type { TransformersLocationEntity } from '../../src/view/content/TransformersLocationSpans'
import { defaultDocumentAttributes } from '../../src/view/structure/DocumentAttributesExtension'

const DOC_ATTRIBUTES_STORAGE_KEY = 'tiptapDocumentAttributes'

const INITIAL_CONTENT = `
  <p>Existing Sydney stays plain text.</p>
  <p>Type a new location here: </p>
  <p>Type a multi-word location here: </p>
`

const findParagraphEndPosition = (editor: Editor, paragraphIndex: number): number | null => {
  let currentParagraphIndex = 0
  let targetPosition: number | null = null

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return true

    if (currentParagraphIndex === paragraphIndex) {
      targetPosition = pos + node.nodeSize - 1
      return false
    }

    currentParagraphIndex += 1
    return true
  })

  return targetPosition
}

const buildMockLocationEntities = (text: string): TransformersLocationEntity[] => {
  if (text.includes('Sydney Airport')) {
    return [
      { entity: 'B-LOC', score: 0.99, index: 1, word: 'Sydney' },
      { entity: 'I-LOC', score: 0.98, index: 2, word: 'Airport' },
    ]
  }

  if (text.includes('Sydney')) {
    return [{ entity: 'B-LOC', score: 0.99, index: 1, word: 'Sydney' }]
  }

  return []
}

export default function CypressTypingLocationPage() {
  const editor = MainEditor(INITIAL_CONTENT, false)

  React.useEffect(() => {
    window.localStorage.setItem(
      DOC_ATTRIBUTES_STORAGE_KEY,
      JSON.stringify(defaultDocumentAttributes),
    )
    window.dispatchEvent(
      new CustomEvent('doc-attributes-updated', {
        detail: defaultDocumentAttributes,
      }),
    )

    window.__LIFEMAP_MOCK_LOCATION_DETECTOR__ = async (text: string) =>
      buildMockLocationEntities(text)

    return () => {
      delete window.__LIFEMAP_MOCK_LOCATION_DETECTOR__
    }
  }, [])

  const focusParagraph = React.useCallback((paragraphIndex: number) => {
    if (!editor) return

    const targetPosition = findParagraphEndPosition(editor, paragraphIndex)
    if (targetPosition === null) return

    editor.chain().focus(targetPosition).run()
  }, [editor])

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 24px 80px',
        background:
          'linear-gradient(180deg, rgba(247, 243, 235, 0.98), rgba(239, 232, 219, 0.94))',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="focus-basic-location-input"
            onClick={() => focusParagraph(1)}
          >
            Focus basic location paragraph
          </button>
          <button
            type="button"
            data-testid="focus-multiword-location-input"
            onClick={() => focusParagraph(2)}
          >
            Focus multi-word location paragraph
          </button>
        </div>

        <div
          style={{
            borderRadius: 24,
            border: '1px solid rgba(107, 87, 58, 0.12)',
            background: 'rgba(255, 255, 255, 0.75)',
            boxShadow: '0 20px 50px rgba(88, 68, 42, 0.08)',
            padding: 24,
            minHeight: 320,
          }}
          data-testid="typing-location-harness"
        >
          <div data-testid="typing-location-editor">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </main>
  )
}
