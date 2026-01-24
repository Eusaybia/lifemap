'use client'

import './MentionList.scss'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
// Note: NodeOverlay intentionally not used for Pomodoro - it's an inline element that
// shouldn't have the card styling and grip. Pomodoro nodes flow inline with text.

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

const PomodoroNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, selected } = props
  const { duration, label, emoji, status, startTime, endTime } = node.attrs
  const [currentTime, setCurrentTime] = useState(new Date())
  const hasPlayedCompleteTone = useRef(false)
  
  // Check for freeform: duration is negative or label indicates freeform
  const isFreeform = duration < 0 || label?.toLowerCase().includes('freeform')
  // Use the stored emoji, or ☀️ for freeform, or default ⏳
  const displayEmoji = emoji || (isFreeform ? '☀️' : '⏳')
  
  // Update current time every second when active
  useEffect(() => {
    if (status !== 'active') {
      hasPlayedCompleteTone.current = false
      return
    }
    
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      // Check if timer has completed (skip for freeform time - it never auto-completes)
      if (startTime && !isFreeform) {
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
  }, [status, startTime, duration, isFreeform, updateAttributes])
  
  const handlePlay = useCallback(() => {
    playStartSound()
    updateAttributes({
      status: 'active',
      startTime: new Date().toISOString(),
    })
  }, [updateAttributes])
  
  const handlePause = useCallback(() => {
    // For freeform time, pressing pause completes it and logs the end time
    if (isFreeform) {
      updateAttributes({
        status: 'completed',
        endTime: new Date().toISOString(),
      })
    } else {
      // For regular pomodoros, pause resets to unrealized
      updateAttributes({
        status: 'unrealized',
        startTime: null,
      })
    }
  }, [isFreeform, updateAttributes])
  
  const getEndTime = (): Date | null => {
    if (!startTime) return null
    const start = new Date(startTime)
    const end = new Date(start.getTime() + duration * 1000)
    return end
  }
  
  const isNow = (): boolean => {
    if (!startTime) return false
    // Freeform time is always "now" while active
    if (isFreeform) return true
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
    
    // For freeform time, show "?" as end time
    if (isFreeform) {
      return `${formatTime(start)} - ?`
    }
    
    const end = getEndTime()
    if (!end) return ''
    
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  // State for editing time values - using ref for input value to avoid re-renders
  const [editingField, setEditingField] = useState<'start' | 'end' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editValueRef = useRef<string>('')

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.value = editValueRef.current
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingField])

  const handleTimeClick = useCallback((field: 'start' | 'end', time: Date | null) => {
    if (!time) return
    editValueRef.current = formatTime(time)
    setEditingField(field)
  }, [])

  const handleTimeSubmit = useCallback(() => {
    const editValue = inputRef.current?.value || ''
    const currentEditingField = editingField
    
    if (!editValue || !currentEditingField) {
      setEditingField(null)
      return
    }

    // Parse the time input (HH:MM or HHMM format)
    const timeMatch = editValue.match(/^(\d{1,2}):?(\d{2})$/)
    if (!timeMatch) {
      setEditingField(null)
      return
    }

    const hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2])
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      setEditingField(null)
      return
    }

    const start = startTime ? new Date(startTime) : new Date()
    const end = isFreeform && endTime ? new Date(endTime) : getEndTime()

    if (currentEditingField === 'start') {
      // Update start time, keeping the same date but changing hours/minutes
      const newStart = new Date(start)
      newStart.setHours(hours, minutes, 0, 0)
      
      updateAttributes({
        startTime: newStart.toISOString(),
      })
    } else if (currentEditingField === 'end') {
      // Update end time
      if (isFreeform) {
        // For freeform, just update endTime directly
        const newEnd = new Date(end || new Date())
        newEnd.setHours(hours, minutes, 0, 0)
        updateAttributes({
          endTime: newEnd.toISOString(),
        })
      } else {
        // For regular pomodoros, calculate new duration based on new end time
        const newEnd = new Date(start)
        newEnd.setHours(hours, minutes, 0, 0)
        
        // If new end is before start, assume it's the next day
        if (newEnd <= start) {
          newEnd.setDate(newEnd.getDate() + 1)
        }
        
        const newDuration = Math.floor((newEnd.getTime() - start.getTime()) / 1000)
        if (newDuration > 0) {
          updateAttributes({
            duration: newDuration,
          })
        }
      }
    }

    setEditingField(null)
  }, [editingField, startTime, endTime, isFreeform, getEndTime, updateAttributes])

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Stop all keyboard events from propagating to TipTap editor
    e.stopPropagation()
    
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTimeSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingField(null)
    }
  }, [handleTimeSubmit])

  // Render editable time - inlined to avoid component identity issues
  const renderEditableTime = (field: 'start' | 'end', time: Date | null, placeholder: string = '?') => {
    if (editingField === field) {
      return (
        <span contentEditable={false} style={{ display: 'inline-block' }}>
          <input
            ref={inputRef}
            type="text"
            className="pomodoro-time-input"
            defaultValue={editValueRef.current}
            onBlur={handleTimeSubmit}
            onKeyDown={handleInputKeyDown}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            placeholder="HH:MM"
            style={{
              width: '50px',
              padding: '1px 4px',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              border: '1px solid #ccc',
              borderRadius: '3px',
              outline: 'none',
            }}
          />
        </span>
      )
    }

    return (
      <span
        className="nested-time-value editable"
        onClick={(e) => {
          e.stopPropagation()
          handleTimeClick(field, time)
        }}
        style={{ cursor: 'pointer' }}
        title="Click to edit time"
      >
        {time ? formatTime(time) : placeholder}
      </span>
    )
  }
  
  // Unrealized state: faded, just plan
  if (status === 'unrealized') {
    return (
      <NodeViewWrapper
        as="span"
        className={`pomodoro-node pomodoro-unrealized ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <span className="pomodoro-icon">{displayEmoji}</span>
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
  // Times are editable - click on them to modify
  if (status === 'completed') {
    const start = startTime ? new Date(startTime) : null
    // For freeform, use the stored endTime; for regular pomodoros, calculate from duration
    const end = isFreeform 
      ? (endTime ? new Date(endTime) : null)
      : getEndTime()
    
    return (
      <NodeViewWrapper
        as="span"
        className={`pomodoro-node pomodoro-completed ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <span className="pomodoro-icon">{displayEmoji}</span>
        <span className="pomodoro-label">{label}</span>
        <span className="pomodoro-divider">||</span>
        {/* Joined time range badge - both times in one connected container */}
        {/* Click on times to edit them */}
        <span className="pomodoro-time-range-badge">
          <span className="nested-time-icon">🕐</span>
          {renderEditableTime('start', start)}
          <span className="pomodoro-time-dash">-</span>
          <span className="nested-time-icon">🕐</span>
          {renderEditableTime('end', end, '?')}
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
      <span className="pomodoro-icon">{displayEmoji}</span>
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
        emoji?: string
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
      emoji: {
        default: '⏳',
        parseHTML: element => element.getAttribute('data-emoji') || '⏳',
        renderHTML: attributes => {
          return {
            'data-emoji': attributes.emoji,
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
      endTime: {
        default: null,
        parseHTML: element => element.getAttribute('data-end-time'),
        renderHTML: attributes => {
          if (!attributes.endTime) return {}
          return {
            'data-end-time': attributes.endTime,
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
    const { label, status, startTime, endTime, duration, emoji } = node.attrs
    
    // Check for freeform: duration is negative or label indicates freeform
    const isFreeform = duration < 0 || label?.toLowerCase().includes('freeform')
    // Use stored emoji, or ☀️ for freeform, or default ⏳
    const displayEmoji = emoji || (isFreeform ? '☀️' : '⏳')
    
    // Build the display text
    let displayText = `${displayEmoji} ${label || ''}`
    
    // Add time range for completed/active states
    if ((status === 'completed' || status === 'active') && startTime) {
      try {
        const start = new Date(startTime)
        
        // Format times as HH:mm
        const formatTime = (date: Date) => {
          const hours = date.getHours().toString().padStart(2, '0')
          const minutes = date.getMinutes().toString().padStart(2, '0')
          return `${hours}:${minutes}`
        }
        
        const startStr = formatTime(start)
        
        if (isFreeform) {
          // For freeform: use endTime if completed, otherwise show "?"
          if (status === 'completed' && endTime) {
            const end = new Date(endTime)
            const endStr = formatTime(end)
            displayText += ` || 🕐 ${startStr} - ${endStr}`
          } else {
            displayText += ` || 🕐 ${startStr} - ?`
          }
        } else {
          const end = new Date(start.getTime() + (duration || 0) * 1000)
          const endStr = formatTime(end)
          displayText += ` || 🕐 ${startStr} - ${endStr}`
        }
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

