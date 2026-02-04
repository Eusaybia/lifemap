'use client'

import './MentionList.scss'
import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { ReactRenderer, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import Suggestion, { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { PluginKey } from 'prosemirror-state'

// ============================================================================
// Duration Badge Node (for durations >= 1 day - no pomodoro functionality)
// These are celestial durations that represent longer time periods
// and don't need timer/pomodoro features
// ============================================================================

interface DurationBadgeNodeViewProps {
  node: {
    attrs: {
      duration: number
      label: string
      emoji: string
      id: string
    }
  }
  selected: boolean
}

const DurationBadgeNodeView: React.FC<DurationBadgeNodeViewProps> = ({
  node,
  selected,
}) => {
  const { label, emoji } = node.attrs

  return (
    <NodeViewWrapper
      as="span"
      className={`duration-badge ${selected ? 'selected' : ''}`}
      data-id={node.attrs.id}
    >
      <span className="duration-badge-emoji">{emoji}</span>
      <span className="duration-badge-label">{label}</span>
    </NodeViewWrapper>
  )
}

export interface DurationBadgeOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    durationBadge: {
      /**
       * Insert a duration badge (for durations >= 1 day)
       */
      insertDurationBadge: (attributes: {
        duration: number
        label: string
        emoji: string
      }) => ReturnType
    }
  }
}

export const DurationBadgeNode = Node.create<DurationBadgeOptions>({
  name: 'durationBadge',

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
        renderHTML: attributes => ({
          'data-duration': attributes.duration,
        }),
      },
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => ({
          'data-label': attributes.label,
        }),
      },
      emoji: {
        default: '📅',
        parseHTML: element => element.getAttribute('data-emoji'),
        renderHTML: attributes => ({
          'data-emoji': attributes.emoji,
        }),
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes.id || `duration-badge:${Date.now()}`,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="duration-badge"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const { label, emoji } = node.attrs
    return ['span', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'duration-badge' }
    ), `${emoji} ${label}`]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DurationBadgeNodeView)
  },

  addCommands() {
    return {
      insertDurationBadge:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              ...attributes,
              id: `duration-badge:${Date.now()}`,
            },
          })
        },
    }
  },
})

// Threshold for using duration badge vs pomodoro (1 day in seconds)
const DURATION_BADGE_THRESHOLD = 86400

// ============================================================================
// Duration Types
// ============================================================================

interface Duration {
  id: string
  label: string
  seconds: number
  emoji: string
}

type DurationUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'season'

interface DurationUnitDefinition {
  unit: DurationUnit
  aliases: string[]
  seconds: number
  emoji: string
}

const DURATION_UNIT_DEFINITIONS: DurationUnitDefinition[] = [
  {
    unit: 'second',
    aliases: ['s', 'sec', 'secs', 'second', 'seconds'],
    seconds: 1,
    emoji: '⏳',
  },
  {
    unit: 'minute',
    aliases: ['m', 'min', 'mins', 'minute', 'minutes'],
    seconds: 60,
    emoji: '⏳',
  },
  {
    unit: 'hour',
    aliases: ['h', 'hr', 'hrs', 'hour', 'hours'],
    seconds: 3600,
    emoji: '⏳',
  },
  {
    unit: 'day',
    aliases: ['d', 'day', 'days'],
    seconds: 86400,
    emoji: '☀️',
  },
  {
    unit: 'week',
    aliases: ['w', 'wk', 'wks', 'week', 'weeks'],
    seconds: 604800,
    emoji: '🌘',
  },
  {
    unit: 'month',
    aliases: ['mo', 'month', 'months'],
    seconds: 2592000,
    emoji: '🌕',
  },
  {
    unit: 'season',
    aliases: ['season', 'seasons'],
    seconds: 7776000,
    emoji: '🌻',
  },
]

const DURATION_QUERY_PATTERN = /^(\d+(?:\.\d+)?)\s*([a-z]+)?$/i

const formatDurationValue = (value: number): string => {
  return Number.isInteger(value) ? value.toString() : value.toString()
}

const formatDurationLabel = (value: number, unit: DurationUnit): string => {
  const valueLabel = formatDurationValue(value)
  const unitLabel = Math.abs(value) === 1 ? unit : `${unit}s`
  return `${valueLabel} ${unitLabel}`
}

const resolveDurationUnit = (unitRaw?: string): DurationUnitDefinition | null => {
  if (!unitRaw) return null
  const normalized = unitRaw.toLowerCase()
  return DURATION_UNIT_DEFINITIONS.find(definition =>
    definition.aliases.includes(normalized)
  ) || null
}

const parseCustomDuration = (query: string): Duration | null => {
  const match = query.match(DURATION_QUERY_PATTERN)
  if (!match) return null

  const [, valueRaw, unitRaw] = match
  const value = parseFloat(valueRaw)
  if (!Number.isFinite(value) || value <= 0) return null

  const unitDefinition = resolveDurationUnit(unitRaw)
  if (!unitDefinition) return null

  // Keep conversion rules centralized so custom and preset durations stay consistent.
  const seconds = Math.round(value * unitDefinition.seconds)
  const label = formatDurationLabel(value, unitDefinition.unit)
  const idValue = formatDurationValue(value).replace('.', '_')

  return {
    id: `duration:custom:${unitDefinition.unit}:${idValue}`,
    label,
    seconds,
    emoji: unitDefinition.emoji,
  }
}

// ============================================================================
// Duration Suggestions
// ============================================================================

const getDurations = (): Duration[] => {
  return [
    // Freeform time (unknown/flexible duration)
    {
      id: 'duration:freeform',
      label: 'Freeform time',
      seconds: -1, // Special value to indicate freeform/unknown duration
      emoji: '☀️',
    },
    // Short durations (hourglass)
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
    // Celestial durations
    {
      id: 'duration:1d',
      label: '1 day',
      seconds: 86400,
      emoji: '☀️',
    },
    {
      id: 'duration:1w',
      label: '1 week',
      seconds: 604800,
      emoji: '🌘',
    },
    {
      id: 'duration:1mo',
      label: '1 month',
      seconds: 2592000,
      emoji: '🌕',
    },
    {
      id: 'duration:1season',
      label: '1 season',
      seconds: 7776000,
      emoji: '🌻',
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
  
  const customDuration = parseCustomDuration(lowerQuery)
  if (customDuration) {
    const matchingDurations = durations.filter(
      duration => duration.seconds === customDuration.seconds
    )
    const hasExactLabel = matchingDurations.some(
      duration => duration.label.toLowerCase() === customDuration.label.toLowerCase()
    )
    return hasExactLabel
      ? matchingDurations
      : [customDuration, ...matchingDurations]
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
  // allowSpaces lets users type natural inputs like "2 hours"
  // without breaking the suggestion query on whitespace.
  allowSpaces: true,
  
  items: ({ query }: { query: string }): Duration[] => {
    return fetchDurations(query)
  },
  
  command: ({ editor, range, props }: { editor: any; range: any; props: Duration }) => {
    // Delete the trigger character and query
    // Use duration badge for celestial durations (>= 1 day) - no pomodoro/timer functionality
    // Use pomodoro for shorter durations that benefit from timer features
    if (props.seconds >= DURATION_BADGE_THRESHOLD) {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertDurationBadge({
          duration: props.seconds,
          label: props.label,
          emoji: props.emoji,
        })
        .run()
    } else {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertPomodoro({
          duration: props.seconds,
          label: props.label,
          emoji: props.emoji,
        })
        .run()
    }
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

