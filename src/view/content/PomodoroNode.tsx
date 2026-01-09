'use client'

import './MentionList.scss'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'

// ============================================================================
// Audio utility functions - using actual MP3 files
// ============================================================================

const playStartSound = () => {
  if (typeof window === 'undefined') return
  try {
    const audio = new Audio('/timer-start.mp3')
    audio.volume = 0.5
    audio.play().catch(err => {
      console.log('Timer start sound failed:', err)
    })
  } catch (err) {
    console.log('Audio play failed:', err)
  }
}

const playCompleteSound = () => {
  if (typeof window === 'undefined') return
  try {
    const audio = new Audio('/timer-complete.mp3')
    audio.volume = 0.5
    audio.play().catch(err => {
      console.log('Timer complete sound failed:', err)
    })
  } catch (err) {
    console.log('Audio play failed:', err)
  }
}

const playTickSound = () => {
  if (typeof window === 'undefined') return
  try {
    const audio = new Audio('/tick.mp3')
    audio.volume = 0.2
    audio.play().catch(err => {
      // Silently fail for tick sounds to avoid console spam
    })
  } catch (err) {
    // Silently fail
  }
}

// ============================================================================
// PomodoroNodeView Component
// ============================================================================

interface PomodoroNodeViewProps {
  node: {
    attrs: {
      duration: number
      label: string
      status: 'unrealized' | 'active' | 'completed'
      startTime: string | null
      id: string
    }
  }
  updateAttributes: (attributes: Record<string, any>) => void
  deleteNode: () => void
  selected: boolean
}

const PomodoroNodeView: React.FC<PomodoroNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const { duration, label, status, startTime } = node.attrs
  const [currentTime, setCurrentTime] = useState(new Date())
  const hasPlayedCompleteTone = useRef(false)
  
  // Update current time every second when active
  useEffect(() => {
    if (status !== 'active') {
      hasPlayedCompleteTone.current = false
      return
    }
    
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      // Check if timer has completed
      if (startTime) {
        const start = new Date(startTime)
        const end = new Date(start.getTime() + duration * 1000)
        
        if (now >= end && !hasPlayedCompleteTone.current) {
          hasPlayedCompleteTone.current = true
          playCompleteSound()
          // Change to completed state
          updateAttributes({
            status: 'completed',
          })
        }
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [status, startTime, duration, updateAttributes])
  
  const handlePlay = useCallback(() => {
    playStartSound()
    updateAttributes({
      status: 'active',
      startTime: new Date().toISOString(),
    })
  }, [updateAttributes])
  
  const handlePause = useCallback(() => {
    updateAttributes({
      status: 'unrealized',
      startTime: null,
    })
  }, [updateAttributes])
  
  const getEndTime = (): Date | null => {
    if (!startTime) return null
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 1000)
    return end
  }
  
  const isNow = (): boolean => {
    if (!startTime) return false
    const end = getEndTime()
    if (!end) return false
    return currentTime < end
  }
  
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  const formatTimeRange = (): string => {
    if (!startTime) return ''
    const start = new Date(startTime)
    const end = getEndTime()
    if (!end) return ''
    
    return `${formatTime(start)} - ${formatTime(end)}`
  }
  
  // Unrealized state: faded, just plan
  if (status === 'unrealized') {
    return (
      <NodeViewWrapper
        as="span"
        className={`pomodoro-node pomodoro-unrealized ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <span className="pomodoro-icon">⏳</span>
        <span className="pomodoro-label">{label}</span>
        <button
          className="pomodoro-play-btn"
          onClick={handlePlay}
          title="Start timer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      </NodeViewWrapper>
    )
  }
  
  // Completed state: opaque, showing completed time range as joined timepoint-style badge
  if (status === 'completed') {
    const start = startTime ? new Date(startTime) : null
    const end = getEndTime()
    
    return (
      <NodeViewWrapper
        as="span"
        className={`pomodoro-node pomodoro-completed ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <span className="pomodoro-icon">⏳</span>
        <span className="pomodoro-label">{label}</span>
        <span className="pomodoro-divider">||</span>
        {/* Joined time range badge - both times in one connected container */}
        <span className="pomodoro-time-range-badge">
          <span className="nested-time-icon">🕐</span>
          <span className="nested-time-value">{start ? formatTime(start) : ''}</span>
          <span className="pomodoro-time-dash">-</span>
          <span className="nested-time-icon">🕐</span>
          <span className="nested-time-value">{end ? formatTime(end) : ''}</span>
        </span>
      </NodeViewWrapper>
    )
  }
  
  // Active state: opaque, showing time range and pause button
  return (
    <NodeViewWrapper
      as="span"
      className={`pomodoro-node pomodoro-active ${selected ? 'selected' : ''}`}
      data-id={node.attrs.id}
    >
      <span className="pomodoro-icon">⏳</span>
      <span className="pomodoro-label">{label}</span>
      <button
        className="pomodoro-pause-btn"
        onClick={handlePause}
        title="Pause timer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      </button>
      <span className="pomodoro-time-icon">🕐</span>
      <span className="pomodoro-time-range">
        {formatTimeRange()} {isNow() && <span className="pomodoro-now">(Now)</span>}
      </span>
    </NodeViewWrapper>
  )
}

// ============================================================================
// TipTap Extension
// ============================================================================

export interface PomodoroOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pomodoro: {
      /**
       * Insert a pomodoro timer
       */
      insertPomodoro: (attributes: {
        duration: number
        label: string
      }) => ReturnType
    }
  }
}

export const PomodoroNode = Node.create<PomodoroOptions>({
  name: 'pomodoro',

  group: 'inline',

  inline: true,

  selectable: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      duration: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-duration') || '0'),
        renderHTML: attributes => {
          return {
            'data-duration': attributes.duration,
          }
        },
      },
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          return {
            'data-label': attributes.label,
          }
        },
      },
      status: {
        default: 'unrealized',
        parseHTML: element => element.getAttribute('data-status') || 'unrealized',
        renderHTML: attributes => {
          return {
            'data-status': attributes.status,
          }
        },
      },
      startTime: {
        default: null,
        parseHTML: element => element.getAttribute('data-start-time'),
        renderHTML: attributes => {
          if (!attributes.startTime) return {}
          return {
            'data-start-time': attributes.startTime,
          }
        },
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          return {
            'data-id': attributes.id || `pomodoro:${Date.now()}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="pomodoro"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    // Format the content for static HTML rendering (used in previews)
    const { label, status, startTime, duration } = node.attrs
    
    // Build the display text
    let displayText = `⏳ ${label || ''}`
    
    // Add time range for completed/active states
    if ((status === 'completed' || status === 'active') && startTime) {
      try {
        const start = new Date(startTime)
        const end = new Date(start.getTime() + (duration || 0) * 1000)
        
        // Format times as HH:mm
        const formatTime = (date: Date) => {
          const hours = date.getHours().toString().padStart(2, '0')
          const minutes = date.getMinutes().toString().padStart(2, '0')
          return `${hours}:${minutes}`
        }
        
        const startStr = formatTime(start)
        const endStr = formatTime(end)
        displayText += ` || 🕐 ${startStr} - ${endStr}`
      } catch (e) {
        // If date parsing fails, just show the label
      }
    }
    
    return ['span', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'pomodoro' }
    ), displayText]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PomodoroNodeView)
  },

  addCommands() {
    return {
      insertPomodoro:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              ...attributes,
              id: `pomodoro:${Date.now()}`,
              status: 'unrealized',
              startTime: null,
            },
          })
        },
    }
  },
})

