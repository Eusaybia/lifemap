'use client'

import './MentionList.scss'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'

// ============================================================================
// Audio utility functions
// ============================================================================

const playStartTone = () => {
  if (typeof window === 'undefined') return
  // Simple beep using Web Audio API
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 880 // A5 note
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3
    
    oscillator.start()
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    oscillator.stop(audioContext.currentTime + 0.2)
  } catch (err) {
    console.log('Audio play failed:', err)
  }
}

const playCompleteTone = () => {
  if (typeof window === 'undefined') return
  // Double beep for completion
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // First beep
    const osc1 = audioContext.createOscillator()
    const gain1 = audioContext.createGain()
    osc1.connect(gain1)
    gain1.connect(audioContext.destination)
    osc1.frequency.value = 880
    osc1.type = 'sine'
    gain1.gain.value = 0.3
    osc1.start()
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
    osc1.stop(audioContext.currentTime + 0.15)
    
    // Second beep (higher)
    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      osc2.frequency.value = 1100
      osc2.type = 'sine'
      gain2.gain.value = 0.3
      osc2.start()
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      osc2.stop(audioContext.currentTime + 0.2)
    }, 150)
  } catch (err) {
    console.log('Audio play failed:', err)
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
          playCompleteTone()
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
    playStartTone()
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
          ▶
        </button>
      </NodeViewWrapper>
    )
  }
  
  // Completed state: opaque, showing completed time range without buttons
  if (status === 'completed') {
    return (
      <NodeViewWrapper
        as="span"
        className={`pomodoro-node pomodoro-completed ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <span className="pomodoro-icon">⏳</span>
        <span className="pomodoro-label">{label}</span>
        <span className="pomodoro-divider">||</span>
        <span className="pomodoro-time-icon">🕐</span>
        <span className="pomodoro-time-range">
          {formatTimeRange()}
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
        ⏸
      </button>
      <span className="pomodoro-divider">||</span>
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

