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
const HashtagPluginKey = new PluginKey('hashtag-suggestion')

// ============================================================================
// Types
// ============================================================================

export interface Hashtag {
  id: string
  label: string
  color: string
}

interface HashtagListProps extends SuggestionProps {
  items: Hashtag[]
}

type HashtagListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// ============================================================================
// Hashtag Colors
// ============================================================================

const HASHTAG_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

const getColorForHashtag = (tag: string): string => {
  // Generate consistent color based on tag name
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return HASHTAG_COLORS[Math.abs(hash) % HASHTAG_COLORS.length]
}

// ============================================================================
// Popular Hashtags Database
// ============================================================================

const POPULAR_HASHTAGS: Hashtag[] = [
  // Productivity
  { id: 'tag:todo', label: 'todo', color: '#ef4444' },
  { id: 'tag:done', label: 'done', color: '#10b981' },
  { id: 'tag:inprogress', label: 'inprogress', color: '#f59e0b' },
  { id: 'tag:blocked', label: 'blocked', color: '#ef4444' },
  { id: 'tag:review', label: 'review', color: '#8b5cf6' },
  
  // Priority
  { id: 'tag:urgent', label: 'urgent', color: '#ef4444' },
  { id: 'tag:important', label: 'important', color: '#f59e0b' },
  { id: 'tag:later', label: 'later', color: '#6b7280' },
  
  // Categories
  { id: 'tag:work', label: 'work', color: '#3b82f6' },
  { id: 'tag:personal', label: 'personal', color: '#ec4899' },
  { id: 'tag:health', label: 'health', color: '#10b981' },
  { id: 'tag:finance', label: 'finance', color: '#f59e0b' },
  { id: 'tag:learning', label: 'learning', color: '#8b5cf6' },
  { id: 'tag:project', label: 'project', color: '#06b6d4' },
  { id: 'tag:meeting', label: 'meeting', color: '#3b82f6' },
  { id: 'tag:idea', label: 'idea', color: '#f97316' },
  { id: 'tag:note', label: 'note', color: '#6b7280' },
  { id: 'tag:question', label: 'question', color: '#8b5cf6' },
  { id: 'tag:research', label: 'research', color: '#06b6d4' },
  { id: 'tag:bug', label: 'bug', color: '#ef4444' },
  { id: 'tag:feature', label: 'feature', color: '#10b981' },
]

// ============================================================================
// Custom Hashtags Storage (localStorage)
// ============================================================================

const CUSTOM_HASHTAGS_KEY = 'lifemap-custom-hashtags'

const loadCustomHashtags = (): Hashtag[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CUSTOM_HASHTAGS_KEY)
    if (stored) {
      return JSON.parse(stored) as Hashtag[]
    }
  } catch (e) {
    console.error('Failed to load custom hashtags:', e)
  }
  return []
}

const saveCustomHashtag = (hashtag: Hashtag): void => {
  if (typeof window === 'undefined') return
  try {
    const existing = loadCustomHashtags()
    // Don't add duplicates
    if (existing.some(h => h.label.toLowerCase() === hashtag.label.toLowerCase())) {
      return
    }
    const updated = [...existing, hashtag]
    localStorage.setItem(CUSTOM_HASHTAGS_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error('Failed to save custom hashtag:', e)
  }
}

// ============================================================================
// Hashtag Search
// ============================================================================

const createCustomHashtag = (name: string, isNew: boolean = true): Hashtag => ({
  id: `tag:${isNew ? 'new-' : 'user-'}${name.toLowerCase().replace(/\s+/g, '-')}`,
  label: name.toLowerCase().replace(/\s+/g, '-'),
  color: getColorForHashtag(name),
})

const fetchHashtags = (query: string): Hashtag[] => {
  const customHashtags = loadCustomHashtags()
  const allKnownHashtags = [...POPULAR_HASHTAGS, ...customHashtags]
  
  if (!query) {
    // Show custom hashtags first (most recent), then popular ones
    const recentCustom = customHashtags.slice(-4).reverse() // Last 4 custom, reversed for most recent first
    const popularSubset = POPULAR_HASHTAGS.slice(0, 8 - recentCustom.length)
    return [...recentCustom, ...popularSubset]
  }
  
  const lowerQuery = query.toLowerCase().replace(/^#/, '') // Remove leading # if present
  
  // Filter matching hashtags (both predefined and custom)
  const matches = allKnownHashtags.filter((tag) =>
    tag.label.toLowerCase().includes(lowerQuery)
  )
  
  // Check if query exactly matches any known hashtag
  const exactMatch = matches.find(tag => tag.label.toLowerCase() === lowerQuery)
  
  // Build results: matches first, then custom option if no exact match
  const results = matches.slice(0, 7)
  
  // Always offer to create new hashtag if query doesn't exactly match any known tag
  if (!exactMatch && lowerQuery.length >= 1) {
    results.push(createCustomHashtag(lowerQuery, true))
  }
  
  return results
}

// ============================================================================
// Hashtag List Component (Dropdown UI)
// ============================================================================

const HashtagList = forwardRef<HashtagListRef, HashtagListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return

    const hashtag = props.items[index]
    
    // If this is a new custom hashtag, save it for future use
    if (hashtag.id.startsWith('tag:new-')) {
      const savedHashtag: Hashtag = {
        id: `tag:user-${hashtag.label}`,
        label: hashtag.label,
        color: hashtag.color,
      }
      saveCustomHashtag(savedHashtag)
    }
    
    props.command({
      id: hashtag.id.replace('tag:new-', 'tag:user-'), // Normalize the ID
      label: `#${hashtag.label}`,
      'data-tag': hashtag.label,
      'data-color': hashtag.color,
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

  const isNewHashtag = (item: Hashtag) => item.id.startsWith('tag:new-')
  const isUserHashtag = (item: Hashtag) => item.id.startsWith('tag:user-')

  return (
    <div className="hashtag-items" style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      border: '1px solid rgba(0,0,0,0.1)',
      padding: '6px',
      minWidth: '200px',
      maxHeight: '280px',
      overflowY: 'auto',
    }}>
      {props.items.length > 0 ? (
        props.items.map((item: Hashtag, index) => (
          <motion.div
            key={item.id}
            onClick={() => selectItem(index)}
            whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: index === selectedIndex ? 'rgba(0,0,0,0.05)' : 'transparent',
            }}
          >
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: item.color,
            }} />
            <span style={{
              fontSize: '14px',
              color: '#1a1a1a',
              fontWeight: 500,
            }}>
              {isNewHashtag(item) ? `Create #${item.label}` : `#${item.label}`}
            </span>
            {isUserHashtag(item) && (
              <span style={{
                fontSize: '11px',
                color: '#999',
                marginLeft: 'auto',
              }}>
                custom
              </span>
            )}
          </motion.div>
        ))
      ) : (
        <div style={{ padding: '10px', color: '#666', fontSize: '14px' }}>
          No matching tags
        </div>
      )}
    </div>
  )
})

HashtagList.displayName = 'HashtagList'

// ============================================================================
// Hashtag Node (for rendering inserted hashtags)
// ============================================================================

export const HashtagNode = Node.create({
  name: 'hashtag',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      'data-tag': { default: null },
      'data-color': { default: '#3b82f6' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="hashtag"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'hashtag-mention',
        'data-type': 'hashtag',
        'data-id': node.attrs.id,
      }),
      node.attrs.label || '',
    ]
  },
})

// ============================================================================
// Hashtag Extension (combines Node + Suggestion)
// ============================================================================

export interface HashtagOptions {
  HTMLAttributes: Record<string, any>
  suggestion: Omit<SuggestionOptions<Hashtag>, 'editor'>
}

export const HashtagMention = Extension.create<HashtagOptions>({
  name: 'hashtag-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'hashtag-mention' },
      suggestion: {
        char: '#',
        allowSpaces: false,
        pluginKey: HashtagPluginKey,
        items: ({ query }) => fetchHashtags(query),
        command: ({ editor, range, props }) => {
          // Delete the trigger text and insert the hashtag node
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'hashtag',
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let component: ReactRenderer<HashtagListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(HashtagList, {
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

            onUpdate: (props) => {
              component?.updateProps(props)
              popup?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              })
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit: () => {
              popup?.destroy()
              component?.destroy()
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

export default HashtagMention

