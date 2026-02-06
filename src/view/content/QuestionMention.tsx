'use client'

/**
 * ============================================================================
 * QUESTION MENTION EXTENSION
 * ============================================================================
 *
 * PURPOSE:
 * A question-based item that appears inline within text, styled like a Mention.
 * It behaves like TodoMention but is focused on clarifying questions:
 * - A boxed question mark icon on the left
 * - Editable text on the right (stored as attribute, edited via inline input)
 * - A 6-dot grip on the right for connections (like SpanGroups)
 * - Placeholder "Your question here" when empty
 *
 * USAGE:
 * Type `??` in the editor to insert a question mention. An input appears for
 * typing your question. Press Enter or click outside to confirm.
 * Click the checkbox icon to toggle resolved state (`?` -> `💡`).
 * Click the text to edit. Click the grip to create connections.
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

export interface QuestionMentionAttributes {
  checked: boolean
  text: string
  questionId: string
}

const generateShortId = () => Math.random().toString(36).substring(2, 8)

interface QuestionNodeViewProps {
  node: ProseMirrorNode
  updateAttributes: (attrs: Partial<QuestionMentionAttributes>) => void
  selected: boolean
  editor: Editor
  getPos: () => number
}

const QuestionNodeView: React.FC<QuestionNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}) => {
  const checked = node.attrs.checked as boolean
  const text = node.attrs.text as string
  const questionId = node.attrs.questionId as string | null

  const [isEditing, setIsEditing] = useState(text === '')
  const [editValue, setEditValue] = useState(text)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!questionId) {
      updateAttributes({ questionId: generateShortId() })
    }
  }, [questionId, updateAttributes])

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

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(text)
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
      className={`question-mention ${checked ? 'question-checked' : ''} ${selected ? 'selected' : ''}`}
      data-question-id={questionId ?? undefined}
    >
      <motion.span
        className="question-checkbox"
        onClick={handleCheckboxChange}
        contentEditable={false}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="question-checkbox-icon">{checked ? '💡' : '?'}</span>
      </motion.span>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="question-input"
          value={editValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder="Your question here"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={`question-text ${checked ? 'question-text-checked' : ''} ${!text ? 'question-text-empty' : ''}`}
          onClick={handleTextClick}
        >
          {text || 'Your question here'}
        </span>
      )}

      <span className="question-grip" contentEditable={false} />
    </NodeViewWrapper>
  )
}

export const QuestionMentionNode = Node.create({
  name: 'questionMention',
  group: 'inline',
  inline: true,
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
      questionId: {
        default: null,
        parseHTML: element => element.getAttribute('data-question-id'),
        renderHTML: attributes => {
          if (!attributes.questionId) {
            return {}
          }
          return {
            'data-question-id': attributes.questionId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="question-mention"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const checked = node.attrs.checked
    const text = node.attrs.text || 'Your question here'
    const icon = checked ? '💡' : '?'
    const questionId = node.attrs.questionId

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: `question-mention ${checked ? 'question-checked' : ''}`,
        'data-type': 'question-mention',
        ...(questionId ? { 'data-question-id': questionId } : {}),
      }),
      `${icon} ${text}`,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionNodeView)
  },
})

const questionInputRule = new InputRule({
  find: /\?\?$/,
  handler: ({ state, range }) => {
    const { tr } = state
    const questionType = state.schema.nodes.questionMention

    if (!questionType) {
      console.warn('[QuestionMention] questionMention node type not found in schema')
      return null
    }

    const questionNode = questionType.create({
      checked: false,
      text: '',
      questionId: generateShortId(),
    })

    tr.replaceWith(range.from, range.to, questionNode)

    return tr
  },
})

export interface QuestionMentionOptions {
  HTMLAttributes: Record<string, any>
}

export const QuestionMention = Extension.create<QuestionMentionOptions>({
  name: 'questionMention-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'question-mention' },
    }
  },

  addInputRules() {
    return [questionInputRule]
  },
})

export default QuestionMention
