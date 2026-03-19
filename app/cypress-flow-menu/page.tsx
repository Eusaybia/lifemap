'use client'

import React from 'react'
import { EditorContent } from '@tiptap/react'

import { MainEditor } from '../../src/view/content/RichText'
import { defaultDocumentAttributes } from '../../src/view/structure/DocumentAttributesExtension'
import { FlowMenu } from '../../src/view/structure/FlowMenu'

const DOC_ATTRIBUTES_STORAGE_KEY = 'tiptapDocumentAttributes'
const GROUP_FLOW_MENU_CONTENT = `
  <div data-group="true">
    <p>Group Flow Menu Harness</p>
    <p>Use the group grip to open the bubble menu.</p>
  </div>
  <p>Outside paragraph</p>
`

export default function CypressFlowMenuPage() {
  const editor = MainEditor(GROUP_FLOW_MENU_CONTENT, false)

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
          maxWidth: 960,
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
            minHeight: 240,
          }}
          data-testid="flow-menu-harness"
        >
          {editor ? <FlowMenu editor={editor} /> : null}
          <EditorContent editor={editor} />
        </div>
      </div>
    </main>
  )
}
