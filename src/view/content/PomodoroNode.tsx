'use client'

import './MentionList.scss'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
// Note: NodeOverlay intentionally not used for Pomodoro - it's an inline element that
// shouldn't have the card styling and grip. Pomodoro nodes flow inline with text.

// ============================================================================
// Helper: Generate random Quanta ID for notes
// ============================================================================
const generateNotesQuantaId = () => {
  // Generate a short random ID like "pom-notes-abc123"
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'pom-notes-'
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

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
  const { duration, label, emoji, status, startTime, endTime, notesQuantaId } = node.attrs
  const [currentTime, setCurrentTime] = useState(new Date())
  const hasPlayedCompleteTone = useRef(false)
  const [showNotesOverlay, setShowNotesOverlay] = useState(false)
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 })
  const overlayRef = useRef<HTMLDivElement>(null)
  
  // Check for freeform: duration is negative or label indicates freeform
  const isFreeform = duration < 0 || label?.toLowerCase().includes('freeform')
  // Use the stored emoji, or ☀️ for freeform, or default ⏳
  const displayEmoji = emoji || (isFreeform ? '☀️' : '⏳')
  const displayLabel = label
  const pomodoroDurationSeconds = isFreeform ? duration : Math.max(duration || 0, 0)
  
  // ARCHITECTURE: Click on the pomodoro time badge opens a notes overlay.
  // The label stays non-interactive so notes attach to a specific session,
  // not the general duration tag. Quanta ID is generated on first click.
  const handleNotesClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Generate notes quanta ID if it doesn't exist
    if (!notesQuantaId) {
      const newId = generateNotesQuantaId()
      updateAttributes({ notesQuantaId: newId })
    }
    
    // Position overlay near the click, with bounds checking
    const overlayWidth = 400
    const overlayHeight = 300
    let x = e.clientX - overlayWidth / 2
    let y = e.clientY + 20 // Below the click
    
    // Keep within viewport
    if (x < 10) x = 10
    if (x + overlayWidth > window.innerWidth - 10) x = window.innerWidth - overlayWidth - 10
    if (y + overlayHeight > window.innerHeight - 10) {
      // Show above click if not enough room below
      y = e.clientY - overlayHeight - 20
    }
    if (y < 10) y = 10
    
    setOverlayPosition({ x, y })
    setShowNotesOverlay(true)
  }, [notesQuantaId, updateAttributes])
  
  // Close overlay when clicking outside
  useEffect(() => {
    if (!showNotesOverlay) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setShowNotesOverlay(false)
      }
    }
    
    // Delay adding listener to avoid immediate close
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotesOverlay])
  
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
        const end = new Date(start.getTime() + pomodoroDurationSeconds * 1000)
        
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
  }, [status, startTime, pomodoroDurationSeconds, isFreeform, updateAttributes])
  
  const handlePlay = useCallback(() => {
    playStartSound()
    updateAttributes({
      status: 'active',
      startTime: new Date().toISOString(),
    })
  }, [updateAttributes])
  
  const handleStop = useCallback(() => {
    // ARCHITECTURE: Stopping a pomodoro should persist it as completed,
    // not reset it to unrealized. We record an endTime for accuracy.
    updateAttributes({
      status: 'completed',
      endTime: new Date().toISOString(),
    })
  }, [updateAttributes])
  
  const getEndTime = (): Date | null => {
    if (!startTime) return null
    // ARCHITECTURE: If a stop time was recorded, prefer it for display.
    if (endTime) {
      return new Date(endTime)
    }
    const start = new Date(startTime)
    const end = new Date(start.getTime() + pomodoroDurationSeconds * 1000)
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
        // For regular pomodoros, keep duration fixed and shift start time
        // so the user-chosen end time becomes the session end.
        const newEnd = new Date(start)
        newEnd.setHours(hours, minutes, 0, 0)
        
        // If new end is before start, assume it's the next day
        if (newEnd <= start) {
          newEnd.setDate(newEnd.getDate() + 1)
        }
        
        const newStart = new Date(newEnd.getTime() - pomodoroDurationSeconds * 1000)
        updateAttributes({
          startTime: newStart.toISOString(),
        })
      }
    }

    setEditingField(null)
  }, [editingField, startTime, endTime, isFreeform, getEndTime, pomodoroDurationSeconds, updateAttributes])

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

  // ARCHITECTURE: Notes overlay renders an embedded quanta via iframe.
  // This allows users to write notes about what they're doing during the pomodoro.
  // The quanta ID is auto-generated and persisted on the pomodoro node.
  const renderNotesOverlay = () => {
    const quantaId = notesQuantaId || node.attrs.notesQuantaId
    if (!quantaId) return null
    
    return (
      <AnimatePresence>
        {showNotesOverlay && (
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: overlayPosition.x,
              top: overlayPosition.y,
              zIndex: 1000,
              width: 400,
              height: 300,
              backgroundColor: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            className="pomodoro-notes-overlay"
          >
            {/* Header */}
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f9fafb',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>
                📝 Notes for {label || 'Pomodoro'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowNotesOverlay(false)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: 14,
                  color: '#6b7280',
                  borderRadius: 4,
                }}
              >
                ✕
              </button>
            </div>
            {/* ARCHITECTURE: Embed the quanta via /q/{id} route which uses
                the lifemap Quanta component. Quantas are auto-created on demand. */}
            <iframe
              src={`/q/${quantaId}`}
              style={{
                flex: 1,
                width: '100%',
                border: 'none',
              }}
              title={`Notes for ${label || 'Pomodoro'}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

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
        <span className="pomodoro-label">
          {displayLabel}
        </span>
        <button
          className="pomodoro-play-btn"
          onClick={handlePlay}
          title="Start timer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
        {renderNotesOverlay()}
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
        <span className="pomodoro-label">
          {displayLabel}
        </span>
        {/* ARCHITECTURE: Time range is a nested tag inside the main pomodoro
            to show the pomodoro "contains" timing data while staying compact. */}
        <span
          className="pomodoro-time-range-badge pomodoro-notes-trigger"
          onMouseDown={(e) => {
            // Prevent ProseMirror from selecting the pomodoro node on badge click.
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={handleNotesClick}
          title="Click to add notes"
        >
          <span className="nested-time-icon">🕐</span>
          {renderEditableTime('start', start)}
          <span className="pomodoro-time-dash">-</span>
          {renderEditableTime('end', end, '?')}
        </span>
        {renderNotesOverlay()}
      </NodeViewWrapper>
    )
  }
  
  // Active state: opaque, showing time range and pause button
  // Active state: opaque, showing time range (as nested tag) and pause button
  return (
    <NodeViewWrapper
      as="span"
      className={`pomodoro-node pomodoro-active ${selected ? 'selected' : ''}`}
      data-id={node.attrs.id}
    >
      <span className="pomodoro-icon">{displayEmoji}</span>
      <span className="pomodoro-label">
        {displayLabel}
      </span>
      <button
        className="pomodoro-pause-btn"
        onClick={handleStop}
        title="Stop timer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
      {/* ARCHITECTURE: Time range is a nested tag inside the main pomodoro
          to show the pomodoro "contains" timing data while staying compact. */}
      <span
        className="pomodoro-time-range-badge pomodoro-notes-trigger"
        onMouseDown={(e) => {
          // Prevent ProseMirror from selecting the pomodoro node on badge click.
          e.preventDefault()
          e.stopPropagation()
        }}
        onClick={handleNotesClick}
        title="Click to add notes"
      >
        <span className="nested-time-icon">🕐</span>
        <span className="pomodoro-time-range">
          {formatTimeRange()} {isNow() && <span className="pomodoro-now">(Now)</span>}
        </span>
      </span>
      {renderNotesOverlay()}
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
      // ARCHITECTURE: notesQuantaId links this pomodoro to a separate quanta
      // where users can write notes about what they're doing/planning.
      // The ID is generated on first click and persisted for future access.
      notesQuantaId: {
        default: null,
        parseHTML: element => element.getAttribute('data-notes-quanta-id'),
        renderHTML: attributes => {
          if (!attributes.notesQuantaId) return {}
          return {
            'data-notes-quanta-id': attributes.notesQuantaId,
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
