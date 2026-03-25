'use client'

import React from 'react'
import { EditorContent } from '@tiptap/react'

import { MainEditor } from '../../src/view/content/RichText'
import { defaultDocumentAttributes } from '../../src/view/structure/DocumentAttributesExtension'

const DOC_ATTRIBUTES_STORAGE_KEY = 'tiptapDocumentAttributes'

export default function CypressBrowserWindowPage() {
  const editor = MainEditor('<p>Browser window harness</p>', false)

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
  }, [])

  React.useEffect(() => {
    if (!editor) return
    let hasBrowserWindow = false
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'browserWindow') {
        hasBrowserWindow = true
        return false
      }
      return true
    })
    if (hasBrowserWindow) return

    editor.commands.insertContent({
      type: 'browserWindow',
      attrs: {
        url: 'https://kairoslifemap.com',
        height: 360,
      },
    })
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
        <div
          style={{
            borderRadius: 24,
            border: '1px solid rgba(107, 87, 58, 0.12)',
            background: 'rgba(255, 255, 255, 0.75)',
            boxShadow: '0 20px 50px rgba(88, 68, 42, 0.08)',
            padding: 24,
            minHeight: 560,
          }}
          data-testid="browser-window-harness"
        >
          <div data-testid="browser-window-editor">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </main>
  )
}
