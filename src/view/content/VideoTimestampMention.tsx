'use client'

import './MentionList.scss'
import React from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import {
  getMentionRenderAttributes,
  useMentionNodeInteraction,
  withMentionInteractionClass,
} from './MentionInteraction'

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        kairosVideoTimestamp?: {
          postMessage: (payload: { seconds: number; label: string }) => void
        }
      }
    }
  }
}

const readTimestampSeconds = (value: unknown): number => {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0
}

const formatTimestampLabel = (seconds: number): string => {
  const roundedSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(roundedSeconds / 3600)
  const minutes = Math.floor((roundedSeconds % 3600) / 60)
  const remainingSeconds = roundedSeconds % 60
  const paddedSeconds = String(remainingSeconds).padStart(2, '0')

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
  }

  return `${minutes}:${paddedSeconds}`
}

export const readVideoTimestampSeconds = readTimestampSeconds
export const formatVideoTimestampLabel = formatTimestampLabel

const postTimestampSeek = (seconds: number, label: string) => {
  try {
    window.webkit?.messageHandlers?.kairosVideoTimestamp?.postMessage({ seconds, label })
  } catch {
    // Native bridge is only present inside the iOS WKWebView.
  }
}

const VideoTimestampNodeView = ({ node, selected, editor, getPos }: NodeViewProps) => {
  const seconds = readTimestampSeconds(node.attrs.seconds)
  const label = node.attrs.label || formatTimestampLabel(seconds)
  const { mentionInteractionProps, selectNode } = useMentionNodeInteraction({ editor, getPos })

  const activate = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault()
    event.stopPropagation()
    selectNode()
    postTimestampSeek(seconds, label)
  }

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      style={{ display: 'inline', position: 'relative' }}
    >
      <span
        {...mentionInteractionProps}
        className={withMentionInteractionClass(
          `duration-badge video-timestamp-mention ${selected ? 'selected' : ''}`.trim(),
        )}
        data-type="video-timestamp"
        data-id={`video-timestamp:${seconds}`}
        data-video-timestamp-seconds={seconds}
        data-video-timestamp-label={label}
        role="button"
        tabIndex={0}
        title={`Seek to ${label}`}
        onClick={activate}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            activate(event)
          }
        }}
      >
        <span className="duration-badge-emoji video-timestamp-icon" aria-hidden="true">▶</span>
        <span className="duration-badge-label">{label}</span>
      </span>
    </NodeViewWrapper>
  )
}

export const VideoTimestampNode = Node.create({
  name: 'videoTimestamp',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      seconds: {
        default: 0,
        parseHTML: element => readTimestampSeconds(element.getAttribute('data-video-timestamp-seconds')),
        renderHTML: attributes => ({
          'data-video-timestamp-seconds': readTimestampSeconds(attributes.seconds),
        }),
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-video-timestamp-label'),
        renderHTML: attributes => ({
          'data-video-timestamp-label': attributes.label || formatTimestampLabel(readTimestampSeconds(attributes.seconds)),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="video-timestamp"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const seconds = readTimestampSeconds(node.attrs.seconds)
    const label = node.attrs.label || formatTimestampLabel(seconds)

    return [
      'span',
      mergeAttributes(HTMLAttributes, getMentionRenderAttributes({
        class: 'duration-badge video-timestamp-mention',
        'data-type': 'video-timestamp',
        'data-id': `video-timestamp:${seconds}`,
        'data-video-timestamp-seconds': seconds,
        'data-video-timestamp-label': label,
        role: 'button',
        title: `Seek to ${label}`,
      })),
      ['span', { class: 'duration-badge-emoji video-timestamp-icon', 'aria-hidden': 'true' }, '▶'],
      ['span', { class: 'duration-badge-label' }, label],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoTimestampNodeView)
  },
})
