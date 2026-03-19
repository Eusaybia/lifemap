'use client'

import React from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

import Image from '../../src/view/content/image-node/image-node-extension'
import { promptAndUploadImage } from '../../src/view/content/image-upload'

export default function CypressImageUploadPage() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image],
    content: '<p>Upload an image here.</p>',
    editorProps: {
      attributes: {
        class: 'tiptap ProseMirror focus:outline-none',
      },
    },
  })

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '48px 24px',
        background:
          'linear-gradient(180deg, rgba(247, 243, 235, 0.98), rgba(239, 232, 219, 0.94))',
      }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: '0 auto',
          display: 'grid',
          gap: 20,
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => {
              if (editor) {
                promptAndUploadImage(editor)
              }
            }}
            style={{
              border: '1px solid rgba(107, 87, 58, 0.22)',
              borderRadius: 999,
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.78)',
              color: '#4a3822',
              cursor: 'pointer',
            }}
          >
            Add image
          </button>
        </div>

        <div
          style={{
            borderRadius: 24,
            border: '1px solid rgba(107, 87, 58, 0.12)',
            background: 'rgba(255, 255, 255, 0.75)',
            boxShadow: '0 20px 50px rgba(88, 68, 42, 0.08)',
            padding: 24,
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </main>
  )
}
