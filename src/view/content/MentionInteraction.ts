import type { Editor } from '@tiptap/core'
import React, { useCallback } from 'react'

const MENTION_INTERACTION_CLASS = 'atomic-mention'

type MentionNodePositionGetter = () => number | undefined

const isIgnoredInteractionTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(
    target.closest(
      'input, textarea, select, button, [contenteditable="true"], [data-mention-interaction-ignore="true"]',
    ),
  )
}

export const withMentionInteractionClass = (className = '') => {
  const classes = className.split(/\s+/).filter(Boolean)
  return classes.includes(MENTION_INTERACTION_CLASS)
    ? classes.join(' ')
    : [MENTION_INTERACTION_CLASS, ...classes].join(' ')
}

export const getMentionRenderAttributes = (attrs: Record<string, unknown> = {}) => ({
  ...attrs,
  class: withMentionInteractionClass(String(attrs.class ?? '')),
  'data-mention-interaction': 'atomic',
  'data-drag-handle': '',
  contenteditable: 'false',
  draggable: 'true',
})

export const selectMentionNode = (editor: Editor, getPos: MentionNodePositionGetter) => {
  try {
    const pos = getPos()
    if (typeof pos !== 'number') return false
    editor.chain().focus().setNodeSelection(pos).run()
    return true
  } catch {
    return false
  }
}

export const useMentionNodeInteraction = ({
  editor,
  getPos,
}: {
  editor: Editor
  getPos: MentionNodePositionGetter
}) => {
  const selectNode = useCallback(
    () => selectMentionNode(editor, getPos),
    [editor, getPos],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (isIgnoredInteractionTarget(event.target)) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      selectNode()
    },
    [selectNode],
  )

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (isIgnoredInteractionTarget(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      selectNode()
    },
    [selectNode],
  )

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (isIgnoredInteractionTarget(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      selectNode()
    },
    [selectNode],
  )

  const handleDragStart = useCallback(() => {
    selectNode()
  }, [selectNode])

  return {
    selectNode,
    mentionInteractionProps: {
      contentEditable: false,
      draggable: true,
      'data-drag-handle': true,
      'data-mention-interaction': 'atomic',
      onPointerDown: handlePointerDown,
      onContextMenu: handleContextMenu,
      onDragStart: handleDragStart,
    },
    handleMentionClick: handleClick,
    handleMentionContextMenu: handleContextMenu,
    handleMentionPointerDown: handlePointerDown,
  }
}
