'use client'

import './MentionList.scss'
import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { PluginKey } from 'prosemirror-state'

// ============================================================================
// Duration Types
// ============================================================================

interface Duration {
  id: string
  label: string
  seconds: number
  emoji: string
}

// ============================================================================
// Duration Suggestions
// ============================================================================

const getDurations = (): Duration[] => {
  return [
    {
      id: 'duration:30s',
      label: '30 seconds',
      seconds: 30,
      emoji: '⏳',
    },
    {
      id: 'duration:1m',
      label: '1 minute',
      seconds: 60,
      emoji: '⏳',
    },
    {
      id: 'duration:5m',
      label: '5 minutes',
      seconds: 300,
      emoji: '⏳',
    },
    {
      id: 'duration:10m',
      label: '10 minutes',
      seconds: 600,
      emoji: '⏳',
    },
    {
      id: 'duration:15m',
      label: '15 minutes',
      seconds: 900,
      emoji: '⏳',
    },
    {
      id: 'duration:30m',
      label: '30 minutes',
      seconds: 1800,
      emoji: '⏳',
    },
    {
      id: 'duration:60m',
      label: '60 minutes',
      seconds: 3600,
      emoji: '⏳',
    },
    {
      id: 'duration:1h',
      label: '1 hour',
      seconds: 3600,
      emoji: '⏳',
    },
    {
      id: 'duration:90m',
      label: '90 minutes',
      seconds: 5400,
      emoji: '⏳',
    },
    {
      id: 'duration:1.5h',
      label: '1.5 hours',
      seconds: 5400,
      emoji: '⏳',
    },
    {
      id: 'duration:2h',
      label: '2 hours',
      seconds: 7200,
      emoji: '⏳',
    },
    {
      id: 'duration:2.5h',
      label: '2.5 hours',
      seconds: 9000,
      emoji: '⏳',
    },
    {
      id: 'duration:3h',
      label: '3 hours',
      seconds: 10800,
      emoji: '⏳',
    },
    {
      id: 'duration:3.5h',
      label: '3.5 hours',
      seconds: 12600,
      emoji: '⏳',
    },
    {
      id: 'duration:4h',
      label: '4 hours',
      seconds: 14400,
      emoji: '⏳',
    },
  ]
}

const fetchDurations = (query: string): Duration[] => {
  const durations = getDurations()
  
  if (!query) {
    return durations
  }
  
  // Strip leading ~ if present
  let lowerQuery = query.toLowerCase().replace(/^~/, '').trim()
  
  // Extract numeric part and unit for smarter matching
  const match = lowerQuery.match(/^(\d+\.?\d*)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)?$/i)
  
  if (match) {
    const [, numStr, unit] = match
    const num = parseFloat(numStr)
    
    // Match based on the number and unit type
    return durations.filter((d) => {
      const labelLower = d.label.toLowerCase()
      
      // Check if this is an hour-based query
      if (!unit || unit.startsWith('h')) {
        // Match hour-based durations
        if (labelLower.includes('hour')) {
          const hourMatch = labelLower.match(/^(\d+\.?\d*)\s*hour/)
          if (hourMatch && parseFloat(hourMatch[1]) === num) return true
        }
        // Also match equivalent minutes (e.g., 1 hour = 60 minutes)
        if (labelLower.includes('minute')) {
          const minMatch = labelLower.match(/^(\d+)\s*minute/)
          if (minMatch && parseInt(minMatch[1]) === num * 60) return true
        }
      }
      
      // Check if this is a minute-based query
      if (unit && (unit.startsWith('m') && !unit.startsWith('mi') || unit.startsWith('min'))) {
        if (labelLower.includes('minute')) {
          const minMatch = labelLower.match(/^(\d+)\s*minute/)
          if (minMatch && parseInt(minMatch[1]) === num) return true
        }
      }
      
      // Check if this is a second-based query
      if (unit && unit.startsWith('s')) {
        if (labelLower.includes('second')) {
          const secMatch = labelLower.match(/^(\d+)\s*second/)
          if (secMatch && parseInt(secMatch[1]) === num) return true
        }
      }
      
      return false
    })
  }
  
  // Fall back to simple text matching
  const noSpaceQuery = lowerQuery.replace(/\s+/g, '')
  
  return durations.filter((d) => {
    const labelLower = d.label.toLowerCase()
    const labelNoSpace = labelLower.replace(/\s+/g, '')
    const idLower = d.id.toLowerCase()
    
    return labelLower.includes(lowerQuery) ||
           labelNoSpace.includes(noSpaceQuery) ||
           idLower.includes(lowerQuery) ||
           idLower.includes(noSpaceQuery)
  })
}

// ============================================================================
// Duration List Component
// ============================================================================

export interface DurationListProps {
  items: Duration[]
  command: (item: Duration) => void
}

export interface DurationListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const DurationList = forwardRef<DurationListRef, DurationListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) {
          command(item)
        }
      },
      [items, command]
    )

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
          return true
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }

        return false
      },
    }))

    if (!items.length) {
      return (
        <div className="duration-items">
          <div className="duration-item">No durations found</div>
        </div>
      )
    }

    return (
      <div className="duration-items">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`duration-item ${index === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => selectItem(index)}
          >
            <span className="duration-emoji">{item.emoji}</span>
            <span className="duration-label">{item.label}</span>
          </button>
        ))}
      </div>
    )
  }
)

DurationList.displayName = 'DurationList'

// ============================================================================
// Suggestion Options
// ============================================================================

const DurationPluginKey = new PluginKey('duration-suggestion')

export const durationSuggestionOptions = {
  char: '~',
  pluginKey: DurationPluginKey,
  
  items: ({ query }: { query: string }): Duration[] => {
    return fetchDurations(query)
  },
  
  command: ({ editor, range, props }: { editor: any; range: any; props: Duration }) => {
    // Delete the trigger character and query, then insert pomodoro
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertPomodoro({
        duration: props.seconds,
        label: props.label,
      })
      .run()
  },
  
  render: () => {
    let component: ReactRenderer<DurationListRef> | null = null
    let popup: TippyInstance[] | null = null

    return {
      onStart: (props: SuggestionProps<Duration>) => {
        component = new ReactRenderer(DurationList, {
          props: {
            items: props.items,
            command: (item: Duration) => props.command(item),
          },
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate: (props: SuggestionProps<Duration>) => {
        if (component) {
          component.updateProps({
            items: props.items,
            command: (item: Duration) => props.command(item),
          })
        }

        if (popup && popup[0] && props.clientRect) {
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        }
      },

      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === 'Escape') {
          if (popup && popup[0]) {
            popup[0].hide()
          }
          return true
        }

        if (component?.ref) {
          return component.ref.onKeyDown(props)
        }

        return false
      },

      onExit: () => {
        if (popup && popup[0]) {
          popup[0].destroy()
        }
        if (component) {
          component.destroy()
        }
      },
    }
  },
}

// ============================================================================
// TipTap Extension
// ============================================================================

export interface DurationExtensionOptions {
  suggestion: typeof durationSuggestionOptions
}

export const DurationExtension = Extension.create<DurationExtensionOptions>({
  name: 'duration-suggestion',

  addOptions() {
    return {
      suggestion: durationSuggestionOptions,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

