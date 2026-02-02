'use client'

/**
 * ============================================================================
 * TODO MENTION EXTENSION
 * ============================================================================
 * 
 * PURPOSE:
 * A checkbox-based todo item that appears inline within text, styled like a Mention.
 * Unlike traditional <li> task lists, this renders as an inline span with:
 * - A checkbox on the left
 * - Editable text on the right (stored as attribute, edited via inline input)
 * - A 6-dot grip on the right for connections (like SpanGroups)
 * - Placeholder "Your todo here" when empty
 * 
 * ARCHITECTURE DECISIONS:
 * 1. Uses InputRule with `[]` trigger instead of Suggestion, because:
 *    - Suggestions require a single character trigger
 *    - `[]` is a bracket pair, better suited for InputRule matching
 *    - The user types `[]` and it immediately transforms into the todo node
 * 
 * 2. Uses an ATOMIC node with text stored as ATTRIBUTE (not content) because:
 *    - TipTap v2 has unreliable cursor behavior for inline nodes with content
 *    - Atomic nodes avoid the "can't type inside" problem entirely
 *    - Text is edited via an inline input that appears on click/focus
 *    - This pattern is proven reliable (similar to how Notion handles inline DBs)
 * 
 * 3. Auto-focus on insert:
 *    - When `[]` is typed, the todo appears in "edit mode" immediately
 *    - User can type their todo text right away
 *    - Pressing Enter or clicking outside commits the text
 * 
 * 4. Connection system integration (like SpanGroupMark):
 *    - Has a unique `todoId` attribute for identification
 *    - Includes a 6-dot grip for visual affordance
 *    - Participates in NodeConnectionManager for drawing arrows between elements
 * 
 * 5. Styling matches timepoint-mention class for visual consistency.
 * 
 * USAGE:
 * Type `[]` in the editor to insert a todo checkbox. An input appears for
 * typing your todo. Press Enter or click outside to confirm.
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

// ============================================================================
// Types
// ============================================================================

export interface TodoMentionAttributes {
  checked: boolean
  text: string
  todoId: string // Unique ID for connection system (like SpanGroup's groupId)
}

// Generate a short 6-character ID (same format as SpanGroup IDs)
const generateShortId = () => Math.random().toString(36).substring(2, 8)

// ============================================================================
// Todo Node Component (React NodeView)
// ============================================================================

interface TodoNodeViewProps {
  node: ProseMirrorNode
  updateAttributes: (attrs: Partial<TodoMentionAttributes>) => void
  selected: boolean
  editor: Editor
  getPos: () => number
}

const TodoNodeView: React.FC<TodoNodeViewProps> = ({ 
  node, 
  updateAttributes, 
  selected,
  editor,
  getPos,
}) => {
  const checked = node.attrs.checked as boolean
  const text = node.attrs.text as string
  const todoId = node.attrs.todoId as string | null
  
  // Edit mode state - starts in edit mode if text is empty (just inserted)
  const [isEditing, setIsEditing] = useState(text === '')
  const [editValue, setEditValue] = useState(text)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ensure every todo has an ID so it can participate in connections
  useEffect(() => {
    if (!todoId) {
      updateAttributes({ todoId: generateShortId() })
    }
  }, [todoId, updateAttributes])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Update edit value when text attribute changes externally
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
    
    // Return focus to the editor after committing
    editor.commands.focus()
  }, [editValue, updateAttributes, editor])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(text) // Reset to original
      setIsEditing(false)
      editor.commands.focus()
    }
  }, [commitEdit, text, editor])

  const handleInputBlur = useCallback(() => {
    commitEdit()
  }, [commitEdit])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
  }, [])

  return (
    <NodeViewWrapper 
      as="span" 
      className={`todo-mention ${checked ? 'todo-checked' : ''} ${selected ? 'selected' : ''}`}
      data-todo-id={todoId ?? undefined}
    >
      {/* Checkbox button */}
      <motion.span
        className="todo-checkbox"
        onClick={handleCheckboxChange}
        contentEditable={false}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {checked ? '☑' : '☐'}
      </motion.span>
      
      {/* Text display or input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="todo-input"
          value={editValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder="Your todo here"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span 
          className={`todo-text ${checked ? 'todo-text-checked' : ''} ${!text ? 'todo-text-empty' : ''}`}
          onClick={handleTextClick}
        >
          {text || 'Your todo here'}
        </span>
      )}
      
      {/* 6-dot grip for connections (like SpanGroup) */}
      <span className="todo-grip" contentEditable={false} />
    </NodeViewWrapper>
  )
}

// ============================================================================
// Todo Node Definition
// ============================================================================

export const TodoMentionNode = Node.create({
  name: 'todoMention',
  group: 'inline',
  inline: true,
  // ATOMIC: no editable content inside, text is stored as attribute
  // This avoids TipTap v2's inline node cursor issues entirely
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      checked: {
        default: false,
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
      // Unique ID for connection system (like SpanGroup's groupId)
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
    return [{ tag: 'span[data-type="todo-mention"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const checked = node.attrs.checked
    const text = node.attrs.text || 'Your todo here'
    const checkboxChar = checked ? '☑' : '☐'
    const todoId = node.attrs.todoId
    
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: `todo-mention ${checked ? 'todo-checked' : ''}`,
        'data-type': 'todo-mention',
        ...(todoId ? { 'data-todo-id': todoId } : {}),
      }),
      // Static HTML render: checkbox + text + grip placeholder
      `${checkboxChar} ${text}`,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TodoNodeView)
  },
})

// ============================================================================
// Input Rule: `[]` triggers todo insertion
// ============================================================================

/**
 * Creates an InputRule that matches `[]` and replaces it with a todoMention node.
 * The node starts in edit mode automatically for immediate typing.
 * Each todo gets a unique ID for the connection system.
 */
const todoInputRule = new InputRule({
  find: /\[\]$/,
  handler: ({ state, range }) => {
    const { tr } = state
    const todoType = state.schema.nodes.todoMention
    
    if (!todoType) {
      console.warn('[TodoMention] todoMention node type not found in schema')
      return null
    }

    // Create the todo node with empty text and a unique ID
    // Empty text triggers edit mode in the React view
    // todoId enables participation in the connection system
    const todoNode = todoType.create({ 
      checked: false, 
      text: '',
      todoId: generateShortId(),
    })

    // Replace the `[]` with the todo node
    tr.replaceWith(range.from, range.to, todoNode)

    // Position cursor after the node (atomic nodes don't have internal positions)
    // The React view will auto-focus the input when text is empty
    
    return tr
  },
})

// ============================================================================
// Todo Mention Extension
// ============================================================================

export interface TodoMentionOptions {
  HTMLAttributes: Record<string, any>
}

export const TodoMention = Extension.create<TodoMentionOptions>({
  name: 'todoMention-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'todo-mention' },
    }
  },

  addInputRules() {
    return [todoInputRule]
  },
})

export default TodoMention
