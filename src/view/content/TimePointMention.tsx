'use client'

import './MentionList.scss'
import { Extension, mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { motion } from 'framer-motion'
import { PluginKey } from '@tiptap/pm/state'

// Unique plugin key to avoid conflicts with other extensions
const TimePointPluginKey = new PluginKey('timepoint-suggestion')

// ============================================================================
// Types
// ============================================================================

export interface TimePoint {
  id: string
  label: string
  date: Date
  emoji: string
}

interface TimePointListProps extends SuggestionProps {
  items: TimePoint[]
}

type TimePointListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// ============================================================================
// Date Helpers
// ============================================================================

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const getNextSeason = (): { name: string; date: Date; emoji: string } => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  if (month < 2 || (month === 2 && now.getDate() < 20)) {
    return { name: 'Spring', date: new Date(year, 2, 20), emoji: '🌸' }
  } else if (month < 5 || (month === 5 && now.getDate() < 21)) {
    return { name: 'Summer', date: new Date(year, 5, 21), emoji: '☀️' }
  } else if (month < 8 || (month === 8 && now.getDate() < 22)) {
    return { name: 'Autumn', date: new Date(year, 8, 22), emoji: '🍂' }
  } else if (month < 11 || (month === 11 && now.getDate() < 21)) {
    return { name: 'Winter', date: new Date(year, 11, 21), emoji: '❄️' }
  } else {
    return { name: 'Spring', date: new Date(year + 1, 2, 20), emoji: '🌸' }
  }
}

const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }
  return date.toLocaleDateString('en-GB', options)
}

const formatDateWithDay = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }
  return date.toLocaleDateString('en-GB', options)
}

// ============================================================================
// TimePoint Suggestions
// ============================================================================

const getTimePoints = (): TimePoint[] => {
  const now = new Date()
  const nextSeason = getNextSeason()
  
  return [
    { id: 'timepoint:today', label: 'Today', date: now, emoji: '🗓️' },
    { id: 'timepoint:tomorrow', label: 'Tomorrow', date: addDays(now, 1), emoji: '🗓️' },
    { id: 'timepoint:yesterday', label: 'Yesterday', date: addDays(now, -1), emoji: '🗓️' },
    { id: 'timepoint:next-week', label: 'Next Week', date: addDays(now, 7), emoji: '📅' },
    { id: 'timepoint:next-month', label: 'Next Month', date: addDays(now, 30), emoji: '📅' },
    {
      id: `timepoint:next-season-${nextSeason.name.toLowerCase()}`,
      label: `Next Season (${nextSeason.name})`,
      date: nextSeason.date,
      emoji: nextSeason.emoji,
    },
  ]
}

const isValidYear = (str: string): boolean => {
  if (!/^\d{4}$/.test(str)) return false
  const year = parseInt(str, 10)
  return year >= 1900 && year <= 2200
}

const createYearTimePoint = (year: number): TimePoint => ({
  id: `timepoint:year-${year}`,
  label: `${year}`,
  date: new Date(year, 0, 1),
  emoji: '📆',
})

const getYearSuggestions = (query: string): TimePoint[] => {
  const results: TimePoint[] = []
  const currentYear = new Date().getFullYear()
  
  if (query.length === 4 && isValidYear(query)) {
    return [createYearTimePoint(parseInt(query, 10))]
  }
  
  if (query.length === 3 && /^\d{3}$/.test(query)) {
    const base = parseInt(query, 10) * 10
    for (let i = 0; i <= 9; i++) {
      const year = base + i
      if (year >= 1900 && year <= 2200) results.push(createYearTimePoint(year))
    }
    return results.slice(0, 6)
  }
  
  if (query.length === 2 && /^\d{2}$/.test(query)) {
    const prefix = parseInt(query, 10)
    // Century prefixes (19, 20, 21, 22) - show years in that century
    if (prefix >= 19 && prefix <= 22) {
      const centuryStart = prefix * 100
      // For current century (20xx), show years around current year
      if (prefix === 20) {
        for (let y = currentYear - 2; y <= currentYear + 10; y++) {
          if (y.toString().startsWith(query)) results.push(createYearTimePoint(y))
        }
      } 
      // For 21xx century
      else if (prefix === 21) {
        for (let y = 2100; y <= 2110; y++) {
          results.push(createYearTimePoint(y))
        }
      }
      // For 22xx century (up to 2200)
      else if (prefix === 22) {
        results.push(createYearTimePoint(2200))
      }
      // For 19xx
      else if (prefix === 19) {
        for (let y = 1990; y <= 1999; y++) {
          results.push(createYearTimePoint(y))
        }
      }
    } else {
      // 2-digit year shorthand (e.g., "24" -> 2024, "90" -> 2090)
      const fullYear = 2000 + prefix
      if (fullYear >= 2000 && fullYear <= 2200) results.push(createYearTimePoint(fullYear))
    }
    return results.slice(0, 6)
  }
  
  if (query.length === 1 && /^\d$/.test(query)) {
    for (let y = currentYear; y <= currentYear + 5; y++) results.push(createYearTimePoint(y))
    return results.slice(0, 6)
  }
  
  return results
}

const fetchTimePoints = (query: string): TimePoint[] => {
  const timePoints = getTimePoints()
  if (!query) return timePoints
  
  if (/^\d+$/.test(query)) {
    const yearSuggestions = getYearSuggestions(query)
    if (yearSuggestions.length > 0) return yearSuggestions
  }
  
  return timePoints.filter((tp) => tp.label.toLowerCase().startsWith(query.toLowerCase()))
}

// ============================================================================
// TimePoint List Component (Dropdown UI)
// ============================================================================

const isYearTimePoint = (tp: TimePoint): boolean => tp.id.startsWith('timepoint:year-')

const formatTimePointLabel = (tp: TimePoint): string => {
  if (isYearTimePoint(tp)) return `${tp.emoji} ${tp.label}`
  return `${tp.emoji} ${formatDate(tp.date)}`
}

const TimePointList = forwardRef<TimePointListRef, TimePointListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return

    const timePoint = props.items[index]
    const formattedDate = isYearTimePoint(timePoint) ? timePoint.label : formatDate(timePoint.date)
    const displayLabel = formatTimePointLabel(timePoint)

    props.command({
      id: timePoint.id,
      label: displayLabel,
      'data-date': timePoint.date.toISOString(),
      'data-formatted': formattedDate,
      'data-relative-label': timePoint.label,
    })
  }

  const upHandler = () => setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  const downHandler = () => setSelectedIndex((selectedIndex + 1) % props.items.length)
  const enterHandler = () => selectItem(selectedIndex)

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') { upHandler(); return true }
      if (event.key === 'ArrowDown') { downHandler(); return true }
      if (event.key === 'Enter') { enterHandler(); return true }
      return false
    },
  }))

  return (
    <div className="timepoint-items">
      {props.items.length > 0 ? (
        props.items.map((item: TimePoint, index) => (
          <motion.div
            className={`timepoint-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={item.id}
            onClick={() => selectItem(index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="timepoint-emoji">{item.emoji}</span>
            <div className="timepoint-content">
              <span className="timepoint-label">{item.label}</span>
              {isYearTimePoint(item) ? (
                <span className="timepoint-date">January 1st, {item.label}</span>
              ) : (
                <span className="timepoint-date">{formatDateWithDay(item.date)}</span>
              )}
            </div>
          </motion.div>
        ))
      ) : (
        <div className="timepoint-item">No matching dates</div>
      )}
    </div>
  )
})

TimePointList.displayName = 'TimePointList'

// ============================================================================
// TimePoint Node (for rendering inserted timepoints)
// ============================================================================

export const TimePointNode = Node.create({
  name: 'timepoint',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      'data-date': { default: null },
      'data-formatted': { default: null },
      'data-relative-label': { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="timepoint"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'timepoint-mention',
        'data-type': 'timepoint',
        'data-id': node.attrs.id,
      }),
      node.attrs.label || '',
    ]
  },
})

// ============================================================================
// TimePoint Extension (combines Node + Suggestion)
// ============================================================================

export interface TimePointOptions {
  HTMLAttributes: Record<string, any>
  suggestion: Omit<SuggestionOptions<TimePoint>, 'editor'>
}

export const TimePointMention = Extension.create<TimePointOptions>({
  name: 'timepoint-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'timepoint-mention' },
      suggestion: {
        char: '@',
        allowSpaces: false,
        pluginKey: TimePointPluginKey,
        items: ({ query }) => fetchTimePoints(query),
        command: ({ editor, range, props }) => {
          // Delete the trigger text and insert the timepoint node
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'timepoint',
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let component: ReactRenderer<TimePointListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(TimePointList, {
                props,
                editor: props.editor,
              })

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })[0]
            },

            onUpdate(props) {
              component?.updateProps(props)
              popup?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              })
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit() {
              popup?.destroy()
              component?.destroy()
              popup = undefined
              component = undefined
            },
          }
        },
      },
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

export default TimePointMention
