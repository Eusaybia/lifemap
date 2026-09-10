'use client'

import React from 'react'
import { Node as TipTapNode } from '@tiptap/core'
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'

import { scheduleDateRange } from './scheduleDateRange'

const DEFAULT_HEIGHT = 760

function createScheduleUserId(): string {
  return `daily-schedule-new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function DailyScheduleNewNodeView(props: NodeViewProps) {
  const userId = typeof props.node.attrs.userId === 'string' && props.node.attrs.userId.trim()
    ? props.node.attrs.userId
    : createScheduleUserId()
  const height = typeof props.node.attrs.height === 'number' ? props.node.attrs.height : DEFAULT_HEIGHT
  const frame = React.useRef<HTMLIFrameElement>(null)
  const publishRange = React.useCallback(() => {
    if (props.editor.isDestroyed) return
    const position = props.getPos()
    if (typeof position !== 'number') return
    const range = scheduleDateRange(props.editor.state.doc, position)
    frame.current?.contentWindow?.postMessage({ type: 'schedule-note-date-range', range }, window.location.origin)
  }, [props.editor, props.getPos])
  React.useEffect(() => {
    const ready = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'schedule-date-range-ready') publishRange()
    }
    window.addEventListener('message', ready)
    publishRange()
    props.editor.on('transaction', publishRange)
    return () => { props.editor.off('transaction', publishRange); window.removeEventListener('message', ready) }
  }, [publishRange])
  const src = `/natural-calendar-day-panel-harness?userId=${encodeURIComponent(userId)}`

  React.useEffect(() => {
    if (props.node.attrs.userId === userId) return
    props.updateAttributes({ userId })
  }, [props, userId])

  return (
    <NodeViewWrapper
      as="section"
      data-type="daily-schedule-new"
      contentEditable={false}
      style={{
        width: '100%',
        margin: '16px 0',
        border: '1px solid #dadce0',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(60, 64, 67, 0.12)',
      }}
    >
      <iframe
        ref={frame}
        onLoad={publishRange}
        title="Temporal - Daily Schedule"
        src={src}
        style={{
          display: 'block',
          width: '100%',
          height,
          border: 0,
          background: 'transparent',
        }}
      />
    </NodeViewWrapper>
  )
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dailyScheduleNew: {
      insertDailyScheduleNew: () => ReturnType
    }
  }
}

export const DailyScheduleNewExtension = TipTapNode.create({
  name: 'dailyScheduleNew',
  group: 'block',
  atom: true,
  inline: false,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      userId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-user-id'),
        renderHTML: (attributes) => ({
          'data-user-id': typeof attributes.userId === 'string' ? attributes.userId : null,
        }),
      },
      height: {
        default: DEFAULT_HEIGHT,
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-type="daily-schedule-new"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', { ...HTMLAttributes, 'data-type': 'daily-schedule-new' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DailyScheduleNewNodeView)
  },

  addCommands() {
    return {
      insertDailyScheduleNew: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'dailyScheduleNew',
            attrs: {
              userId: createScheduleUserId(),
              height: DEFAULT_HEIGHT,
            },
          })
          .run()
      },
    }
  },
})

export default DailyScheduleNewExtension
