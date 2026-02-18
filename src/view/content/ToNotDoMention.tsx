'use client'

/**
 * ============================================================================
 * TO-NOT-DO MENTION EXTENSION
 * ============================================================================
 *
 * PURPOSE:
 * A "do not do this" inline mention variant, based on TodoMention.
 * It renders as an inline badge with:
 * - A 6-dot grip on the left for connections
 * - A red crossed checkbox on the left
 * - Editable text on the right (stored as attribute, edited via inline input)
 * - Default checked state so it appears crossed out on insert
 *
 * USAGE:
 * Type `[x]` in the editor to insert a to-not-do mention. An input appears for
 * typing your text. Press Enter or click outside to confirm.
 * Click the checkbox to toggle completion. Click the text to edit.
 * Click the grip to create connections to other elements.
 * ============================================================================
 */

import './MentionList.scss'
import { Extension, mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'
import { InputRule } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import React, { useCallback, useState, useRef, useEffect } from 'react'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import { motion } from 'framer-motion'
import { Editor } from '@tiptap/core'
import { NodeSelection } from 'prosemirror-state'

export interface ToNotDoMentionAttributes {
  checked: boolean
  text: string
  todoId: string
}

const generateShortId = () => Math.random().toString(36).substring(2, 8)

interface ToNotDoNodeViewProps {
  node: ProseMirrorNode
  updateAttributes: (attrs: Partial<ToNotDoMentionAttributes>) => void
  selected: boolean
  editor: Editor
  getPos: () => number
}

const ToNotDoNodeView: React.FC<ToNotDoNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}) => {
  const checked = node.attrs.checked as boolean
  const text = node.attrs.text as string
  const todoId = node.attrs.todoId as string | null

  const [isEditing, setIsEditing] = useState(text === '')
  const [editValue, setEditValue] = useState(text)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDeletingRef = useRef(false)

  useEffect(() => {
    if (!todoId) {
      updateAttributes({ todoId: generateShortId() })
    }
  }, [todoId, updateAttributes])

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

  const handleCheckboxChange = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    updateAttributes({ checked: !checked })
  }, [checked, updateAttributes])

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

  const handleGripMouseDown = useCallback(() => {
    try {
      const pos = getPos()
      if (typeof pos !== 'number') return
      editor.chain().focus().setNodeSelection(pos).run()
    } catch {
      // Ignore stale positions when the node is being removed.
    }
  }, [editor, getPos])

  return (
    <NodeViewWrapper
      as="span"
      className={`to-not-do-mention ${checked ? 'to-not-do-checked' : ''} ${selected ? 'selected' : ''}`}
      data-type="to-not-do-mention"
      data-checked={checked ? 'true' : 'false'}
      data-text={text}
      data-todo-id={todoId ?? undefined}
    >
      <span
        className="todo-grip"
        contentEditable={false}
        data-drag-handle
        onMouseDown={handleGripMouseDown}
        title="Drag to move"
      />

      <motion.span
        className="to-not-do-checkbox"
        onClick={handleCheckboxChange}
        contentEditable={false}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="to-not-do-checkbox-icon">{checked ? '✕' : ''}</span>
      </motion.span>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="to-not-do-input"
          value={editValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder="Your not-to-do here"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={`to-not-do-text ${checked ? 'to-not-do-text-checked' : ''} ${!text ? 'to-not-do-text-empty' : ''}`}
          onClick={handleTextClick}
        >
          {text || 'Your not-to-do here'}
        </span>
      )}
    </NodeViewWrapper>
  )
}

export const ToNotDoMentionNode = Node.create({
  name: 'toNotDoMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      checked: {
        default: true,
        parseHTML: element => element.getAttribute('data-checked') === 'true',
        renderHTML: attributes => ({
          'data-checked': attributes.checked ? 'true' : 'false',
        }),
      },
      text: {
        default: '',
        parseHTML: element => element.getAttribute('data-text') || element.textContent || '',
        renderHTML: attributes => ({
          'data-text': attributes.text,
        }),
      },
      todoId: {
        default: null,
        parseHTML: element => element.getAttribute('data-todo-id'),
        renderHTML: attributes => {
          if (!attributes.todoId) {
            return {}
          }
          return {
            'data-todo-id': attributes.todoId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'span[data-type="to-not-do-mention"]' },
      { tag: 'span.to-not-do-mention[data-checked]' },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const checked = node.attrs.checked
    const text = node.attrs.text || 'Your not-to-do here'
    const checkboxChar = checked ? '☒' : '☐'
    const todoId = node.attrs.todoId

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: `to-not-do-mention ${checked ? 'to-not-do-checked' : ''}`,
        'data-type': 'to-not-do-mention',
        ...(todoId ? { 'data-todo-id': todoId } : {}),
      }),
      `${checkboxChar} ${text}`,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToNotDoNodeView)
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

const toNotDoInputRule = new InputRule({
  find: /\[x\]$/i,
  handler: ({ state, range }) => {
    const { tr } = state
    const toNotDoType = state.schema.nodes.toNotDoMention

    if (!toNotDoType) {
      console.warn('[ToNotDoMention] toNotDoMention node type not found in schema')
      return null
    }

    const toNotDoNode = toNotDoType.create({
      checked: true,
      text: '',
      todoId: generateShortId(),
    })

    tr.replaceWith(range.from, range.to, toNotDoNode)

    return tr
  },
})

export interface ToNotDoMentionOptions {
  HTMLAttributes: Record<string, unknown>
}

export const ToNotDoMention = Extension.create<ToNotDoMentionOptions>({
  name: 'toNotDoMention-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'to-not-do-mention' },
    }
  },

  addInputRules() {
    return [toNotDoInputRule]
  },
})

export default ToNotDoMention
