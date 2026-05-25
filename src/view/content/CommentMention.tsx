'use client'

import './MentionList.scss'
import { Extension, mergeAttributes, type Range } from '@tiptap/core'
import { Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { deferNodeViewAttributeUpdate } from './deferNodeViewAttributeUpdate'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { NodeSelection } from 'prosemirror-state'
import type { Editor } from '@tiptap/core'
import {
  getMentionRenderAttributes,
  useMentionNodeInteraction,
  withMentionInteractionClass,
} from './MentionInteraction'

export interface CommentMentionAttributes {
  text: string
  anchorText: string
  commentId: string | null
}

const generateShortId = () => Math.random().toString(36).substring(2, 8)

const normalizeInlineText = (value: string): string => (
  value.replace(/\s+/g, ' ').trim()
)

const buildCollapsedLabel = (text: string): string => {
  const normalizedText = normalizeInlineText(text)
  if (!normalizedText) return 'comment'

  const words = normalizedText.split(' ')
  const preview = words.slice(0, 4).join(' ')
  if (words.length <= 4 && preview.length <= 42) return preview
  if (preview.length <= 42) return `${preview}…`

  return `${preview.slice(0, 41)}…`
}

export const insertCommentMentionAtRange = (
  editor: Editor,
  range?: Range,
): boolean => {
  const { state, view } = editor
  const commentType = state.schema.nodes.commentMention
  if (!commentType) return false

  const from = Math.max(0, Math.min(range?.from ?? state.selection.from, state.doc.content.size))
  const to = Math.max(0, Math.min(range?.to ?? state.selection.to, state.doc.content.size))
  const start = Math.min(from, to)
  const end = Math.max(from, to)
  const anchorText = start < end
    ? normalizeInlineText(state.doc.textBetween(start, end, ' '))
    : ''

  let intersectsExistingAtom = false
  if (start < end) {
    state.doc.nodesBetween(start, end, (node: any) => {
      if (node.type?.name === 'commentMention' || (node.isAtom && !node.isText)) {
        intersectsExistingAtom = true
        return false
      }
      return true
    })
  }

  if (intersectsExistingAtom) return false

  const commentNode = commentType.create({
    text: '',
    anchorText,
    commentId: generateShortId(),
  })

  let tr = state.tr.replaceWith(start, end, commentNode).scrollIntoView()
  try {
    tr = tr.setSelection(NodeSelection.create(tr.doc, start))
  } catch {
    // The replace can still succeed even if selection restoration fails.
  }

  view.dispatch(tr)
  return true
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentMention: {
      insertCommentMention: (attrs?: Partial<CommentMentionAttributes>) => ReturnType
    }
  }
}

const CommentMentionNodeView = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) => {
  const text = String(node.attrs.text ?? '')
  const anchorText = String(node.attrs.anchorText ?? '')
  const commentId = node.attrs.commentId as string | null

  const [isEditing, setIsEditing] = useState(text.trim() === '')
  const [editValue, setEditValue] = useState(text)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDeletingRef = useRef(false)

  const collapsedLabel = useMemo(() => buildCollapsedLabel(text), [text])
  const isExpanded = isEditing || selected
  const displayText = text.trim() || 'Type a comment'
  const inputWidth = `${Math.min(Math.max(editValue.length + 2, 14), 62)}ch`
  const { mentionInteractionProps, selectNode } = useMentionNodeInteraction({ editor, getPos })

  const focusCommentInput = useCallback(() => {
    const input = inputRef.current
    if (!input) return

    input.focus({ preventScroll: true })
    const selectionStart = editValue.length
    input.setSelectionRange(selectionStart, selectionStart)
  }, [editValue.length])

  useEffect(() => {
    if (!commentId) {
      return deferNodeViewAttributeUpdate(() => {
        updateAttributes({ commentId: generateShortId() })
      })
    }
  }, [commentId, updateAttributes])

  useLayoutEffect(() => {
    if (!isEditing) return undefined

    focusCommentInput()

    const animationFrameId = window.requestAnimationFrame(focusCommentInput)
    const timeoutId = window.setTimeout(focusCommentInput, 0)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.clearTimeout(timeoutId)
    }
  }, [focusCommentInput, isEditing])

  useEffect(() => {
    if (!isEditing) {
      setEditValue(text)
    }
  }, [text, isEditing])

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

  const commitEdit = useCallback((shouldRefocusEditor: boolean) => {
    updateAttributes({ text: normalizeInlineText(editValue) })
    setIsEditing(false)
    if (shouldRefocusEditor) {
      editor.commands.focus()
    }
  }, [editValue, updateAttributes, editor])

  const beginEditing = useCallback((event?: React.MouseEvent | React.PointerEvent) => {
    event?.preventDefault()
    event?.stopPropagation()
    selectNode()
    setIsEditing(true)
  }, [selectNode])

  const handleInputKeyDown = useCallback((event: React.KeyboardEvent) => {
    if ((event.key === 'Backspace' || event.key === 'Delete') && editValue.trim() === '') {
      event.preventDefault()
      isDeletingRef.current = true
      const deleted = removeNode()
      if (!deleted) {
        isDeletingRef.current = false
      }
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      commitEdit(true)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setEditValue(text)
      setIsEditing(false)
      editor.commands.focus()
    }
  }, [commitEdit, editValue, editor, removeNode, text])

  const handleInputBlur = useCallback(() => {
    if (isDeletingRef.current) {
      isDeletingRef.current = false
      return
    }
    commitEdit(false)
  }, [commitEdit])

  return (
    <NodeViewWrapper
      as="span"
      {...mentionInteractionProps}
      className={withMentionInteractionClass([
        'question-mention',
        'comment-mention',
        isExpanded ? 'comment-mention-expanded' : 'comment-mention-collapsed',
        selected ? 'selected' : '',
      ].filter(Boolean).join(' '))}
      data-type="comment-mention"
      data-comment-id={commentId ?? undefined}
      data-comment-anchor={anchorText || undefined}
      title={anchorText ? `Comment on: ${anchorText}` : undefined}
    >
      <motion.span
        layout
        className="comment-mention-shell"
        initial={false}
        animate={{
          opacity: isExpanded ? 1 : 0.78,
        }}
        transition={{
          duration: 0.16,
          ease: 'easeOut',
        }}
        onClick={!isEditing ? beginEditing : undefined}
      >
        <span className="question-checkbox comment-mention-icon" contentEditable={false}>
          <span className="question-checkbox-icon" aria-hidden="true">💬</span>
        </span>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="question-input comment-mention-input"
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            placeholder={anchorText ? `Comment on "${anchorText}"` : 'Type a comment'}
            style={{ width: inputWidth }}
            data-mention-interaction-ignore="true"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          />
        ) : (
          <span
            className={[
              'question-text',
              'comment-mention-text',
              !text.trim() ? 'question-text-empty' : '',
            ].filter(Boolean).join(' ')}
            onClick={beginEditing}
          >
            {isExpanded ? displayText : collapsedLabel}
          </span>
        )}
      </motion.span>
    </NodeViewWrapper>
  )
}

export const CommentMentionNode = Node.create({
  name: 'commentMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: element => element.getAttribute('data-comment-text') || '',
        renderHTML: attributes => ({
          'data-comment-text': attributes.text,
        }),
      },
      anchorText: {
        default: '',
        parseHTML: element => element.getAttribute('data-comment-anchor') || '',
        renderHTML: attributes => {
          if (!attributes.anchorText) return {}
          return {
            'data-comment-anchor': attributes.anchorText,
          }
        },
      },
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) return {}
          return {
            'data-comment-id': attributes.commentId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="comment-mention"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const text = String(node.attrs.text ?? '')
    const anchorText = String(node.attrs.anchorText ?? '')
    const commentId = node.attrs.commentId

    return [
      'span',
      mergeAttributes(HTMLAttributes, getMentionRenderAttributes({
        class: 'question-mention comment-mention comment-mention-collapsed',
        'data-type': 'comment-mention',
        'data-comment-text': text,
        ...(anchorText ? { 'data-comment-anchor': anchorText } : {}),
        ...(commentId ? { 'data-comment-id': commentId } : {}),
      })),
      `💬 ${buildCollapsedLabel(text)}`,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CommentMentionNodeView, {
      stopEvent: ({ event }) => {
        const target = event.target as HTMLElement | null
        return Boolean(target?.closest?.('.comment-mention-input'))
      },
    })
  },

  addCommands() {
    return {
      insertCommentMention: (attrs = {}) => ({ editor }) => {
        const didInsert = insertCommentMentionAtRange(editor, undefined)
        if (!didInsert) return false

        if (Object.keys(attrs).length === 0) return true

        const { selection } = editor.state
        if (!(selection instanceof NodeSelection)) return true
        if (selection.node.type.name !== this.name) return true

        return editor.commands.updateAttributes(this.name, attrs)
      },
    }
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

export interface CommentMentionOptions {
  HTMLAttributes: Record<string, any>
}

export const CommentMention = Extension.create<CommentMentionOptions>({
  name: 'commentMention-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'comment-mention' },
    }
  },
})

export default CommentMention
