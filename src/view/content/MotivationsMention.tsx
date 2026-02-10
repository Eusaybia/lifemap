'use client'

import './MentionList.scss'
import { Extension, mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'
import { InputRule } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import { Editor } from '@tiptap/core'
import { NodeSelection } from 'prosemirror-state'

export interface MotivationsMentionAttributes {
  text: string
  motivationId: string
}

const generateShortId = () => Math.random().toString(36).substring(2, 8)
const MOTIVATION_EMOJI = '✨'

interface MotivationsNodeViewProps {
  node: ProseMirrorNode
  updateAttributes: (attrs: Partial<MotivationsMentionAttributes>) => void
  selected: boolean
  editor: Editor
  getPos: () => number
}

const MotivationsNodeView: React.FC<MotivationsNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}) => {
  const text = node.attrs.text as string
  const motivationId = node.attrs.motivationId as string | null

  const [isEditing, setIsEditing] = useState(text === '')
  const [editValue, setEditValue] = useState(text)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDeletingRef = useRef(false)

  useEffect(() => {
    if (!motivationId) {
      updateAttributes({ motivationId: generateShortId() })
    }
  }, [motivationId, updateAttributes])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) {
      setEditValue(text)
    }
  }, [text, isEditing])

  const handleTextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditing(true)
  }, [])

  const commitEdit = useCallback(() => {
    const trimmedValue = editValue.trim()
    updateAttributes({ text: trimmedValue })
    setIsEditing(false)
    editor.commands.focus()
  }, [editValue, updateAttributes, editor])

  const removeNode = useCallback(() => {
    try {
      const pos = getPos()
      if (typeof pos !== 'number') return false
      const nodeAtPos = editor.state.doc.nodeAt(pos)
      if (!nodeAtPos) return false
      const tr = editor.state.tr.delete(pos, pos + nodeAtPos.nodeSize)
      editor.view.dispatch(tr)
      editor.commands.focus()
      return true
    } catch {
      return false
    }
  }, [editor, getPos])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && editValue.trim() === '') {
      e.preventDefault()
      isDeletingRef.current = true
      const deleted = removeNode()
      if (!deleted) {
        isDeletingRef.current = false
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(text)
      setIsEditing(false)
      editor.commands.focus()
    }
  }, [commitEdit, text, editor, editValue, removeNode])

  const handleInputBlur = useCallback(() => {
    if (isDeletingRef.current) {
      isDeletingRef.current = false
      return
    }
    commitEdit()
  }, [commitEdit])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
  }, [])

  return (
    <NodeViewWrapper
      as="span"
      className={`motivations-mention ${selected ? 'selected' : ''}`}
      data-motivation-id={motivationId ?? undefined}
    >
      <span className="motivations-emoji" contentEditable={false}>
        {MOTIVATION_EMOJI}
      </span>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="motivations-input"
          value={editValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder="Your motivation here"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={`motivations-text ${!text ? 'motivations-text-empty' : ''}`}
          onClick={handleTextClick}
        >
          {text || 'Your motivation here'}
        </span>
      )}

      <span className="motivations-grip" contentEditable={false} />
    </NodeViewWrapper>
  )
}

export const MotivationsMentionNode = Node.create({
  name: 'motivationsMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: element => element.getAttribute('data-text') || element.textContent || '',
        renderHTML: attributes => ({
          'data-text': attributes.text,
        }),
      },
      motivationId: {
        default: null,
        parseHTML: element => element.getAttribute('data-motivation-id'),
        renderHTML: attributes => {
          if (!attributes.motivationId) {
            return {}
          }
          return {
            'data-motivation-id': attributes.motivationId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="motivations-mention"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const text = node.attrs.text || 'Your motivation here'
    const motivationId = node.attrs.motivationId

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'motivations-mention',
        'data-type': 'motivations-mention',
        ...(motivationId ? { 'data-motivation-id': motivationId } : {}),
      }),
      `${MOTIVATION_EMOJI} ${text}`,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MotivationsNodeView)
  },

  addKeyboardShortcuts() {
    const deleteIfEmptyAndSelected = () => {
      const { selection } = this.editor.state
      if (!(selection instanceof NodeSelection)) return false
      if (selection.node.type.name !== this.name) return false

      const text = String(selection.node.attrs.text ?? '').trim()
      if (text !== '') return false

      return this.editor.commands.deleteSelection()
    }

    return {
      Backspace: deleteIfEmptyAndSelected,
      Delete: deleteIfEmptyAndSelected,
    }
  },
})

const motivationsInputRule = new InputRule({
  find: /!!$/,
  handler: ({ state, range }) => {
    const { tr } = state
    const motivationType = state.schema.nodes.motivationsMention

    if (!motivationType) {
      console.warn('[MotivationsMention] motivationsMention node type not found in schema')
      return null
    }

    const motivationNode = motivationType.create({
      text: '',
      motivationId: generateShortId(),
    })

    tr.replaceWith(range.from, range.to, motivationNode)
  },
})

export interface MotivationsMentionOptions {
  HTMLAttributes: Record<string, any>
}

export const MotivationsMention = Extension.create<MotivationsMentionOptions>({
  name: 'motivationsMention-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'motivations-mention' },
    }
  },

  addInputRules() {
    return [motivationsInputRule]
  },
})

export default MotivationsMention
