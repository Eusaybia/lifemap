'use client'

import React from 'react'
import { Node as TipTapNode } from '@tiptap/core'
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { useFirebaseAuth } from '@/contexts/firebase-auth-context'

const DEFAULT_HEIGHT = 760

function createScheduleUserId(): string {
  return `daily-schedule-new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function DailyScheduleNewNodeView(props: NodeViewProps) {
  const userId = typeof props.node.attrs.userId === 'string' && props.node.attrs.userId.trim()
    ? props.node.attrs.userId
    : createScheduleUserId()
  const height = typeof props.node.attrs.height === 'number' ? props.node.attrs.height : DEFAULT_HEIGHT
  const src = `/natural-calendar-day-panel-harness?userId=${encodeURIComponent(userId)}`

  React.useEffect(() => {
    if (props.node.attrs.userId === userId) return
    props.updateAttributes({ userId })
  }, [props, userId])

  // Google Calendar OAuth runs in this top-level document (Firebase popup auth
  // can't complete inside the harness iframe). The iframe requests a connect via
  // postMessage; we run it here and relay the access token back.
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null)
  const { googleCalendarAccessToken, connectGoogleCalendar } = useFirebaseAuth()
  const tokenRef = React.useRef<string | null>(googleCalendarAccessToken ?? null)
  tokenRef.current = googleCalendarAccessToken ?? null

  const postToken = React.useCallback((token: string | null) => {
    iframeRef.current?.contentWindow?.postMessage({ source: 'kairos-gcal', type: 'token', token }, '*')
  }, [])

  React.useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      const data = event.data
      if (!data || data.source !== 'kairos-gcal') return
      if (data.type === 'ready') {
        postToken(tokenRef.current)
      } else if (data.type === 'connect') {
        try {
          const token = tokenRef.current ?? (await connectGoogleCalendar())
          postToken(token ?? null)
        } catch (error) {
          iframeRef.current?.contentWindow?.postMessage(
            {
              source: 'kairos-gcal',
              type: 'error',
              message: error instanceof Error ? error.message : 'Could not connect Google Calendar.',
            },
            '*',
          )
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [connectGoogleCalendar, postToken])

  React.useEffect(() => {
    postToken(googleCalendarAccessToken ?? null)
  }, [googleCalendarAccessToken, postToken])

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 14px',
          borderBottom: '1px solid #e8eaed',
          color: '#202124',
          fontFamily: "'Google Sans', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize: 13,
          fontWeight: 650,
        }}
      >
        <span>Daily Schedule [new]</span>
        <span style={{ color: '#5f6368', fontSize: 11, fontWeight: 600 }}>Natural Calendar</span>
      </div>
      <iframe
        ref={iframeRef}
        title="Daily Schedule [new]"
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
