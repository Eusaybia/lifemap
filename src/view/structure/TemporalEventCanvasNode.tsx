'use client'

import React, { memo, useEffect, useMemo } from 'react'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import { type NodeProps } from 'reactflow'
import { customExtensions, officialExtensions } from '../content/RichText'

export interface TemporalEventCanvasNodeData {
  nodeId: string
  positionKey?: string
  label?: string
  content: JSONContent
}

const EXCLUDED_EXTENSION_NAMES = ['canvas3D', 'canvas', 'bubbleMenu', 'temporalOrder']

const normalizeContentToDoc = (content: JSONContent): JSONContent => {
  if (content?.type === 'doc') {
    return content
  }
  return {
    type: 'doc',
    content: [content ?? { type: 'paragraph' }],
  }
}

export const TemporalEventCanvasNode = memo(({ data }: NodeProps<TemporalEventCanvasNodeData>) => {
  const normalizedContent = useMemo(() => normalizeContentToDoc(data.content), [data.content])

  const nodeExtensions = useMemo(() => {
    const official = officialExtensions(`temporal-event-${data.nodeId || 'node'}`)
    const filteredOfficial = official.filter((ext: any) => {
      const name = ext?.name || ext?.config?.name || ''
      return !EXCLUDED_EXTENSION_NAMES.includes(name)
    })
    const filteredCustom = customExtensions.filter((ext: any) => {
      const name = ext?.name || ext?.config?.name || ''
      return !EXCLUDED_EXTENSION_NAMES.includes(name)
    })
    return [...filteredOfficial, ...filteredCustom]
  }, [data.nodeId])

  const editor = useEditor(
    {
      extensions: nodeExtensions as any,
      content: normalizedContent,
      editable: false,
      immediatelyRender: true,
    },
    [nodeExtensions]
  )

  useEffect(() => {
    if (!editor) return
    const current = JSON.stringify(editor.getJSON())
    const incoming = JSON.stringify(normalizedContent)
    if (current !== incoming) {
      editor.commands.setContent(normalizedContent)
    }
  }, [editor, normalizedContent])

  return (
    <div className="temporal-order-flow-rich-node">
      <div className="temporal-order-flow-rich-node-body">
        {editor ? <EditorContent editor={editor} /> : <div className="temporal-order-flow-loading">Loading...</div>}
      </div>
    </div>
  )
})

TemporalEventCanvasNode.displayName = 'TemporalEventCanvasNode'
