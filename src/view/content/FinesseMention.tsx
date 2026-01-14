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
const FinessePluginKey = new PluginKey('finesse-suggestion')

// ============================================================================
// Types
// ============================================================================

export interface Finesse {
  id: string
  label: string
  emoji: string
}

interface FinesseListProps extends SuggestionProps {
  items: Finesse[]
}

type FinesseListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// ============================================================================
// Energy Level Definitions
// ============================================================================

const FINESSE_ITEMS: Finesse[] = [
  { 
    id: 'finesse:higher-energy', 
    label: 'Higher Energy (Strong Yang) ⚌', 
    emoji: '☀️',
  },
  { 
    id: 'finesse:semi-higher-energy', 
    label: 'Semi-Higher Energy (Lesser Yang) ⚎', 
    emoji: '☁️',
  },
  { 
    id: 'finesse:semi-lower-energy', 
    label: 'Semi-Lower Energy (Lesser Yin) ⚍', 
    emoji: '🌍',
  },
  { 
    id: 'finesse:lower-energy', 
    label: 'Lower Energy (Strong Yin) ⚏', 
    emoji: '🌙',
  },
]

// ============================================================================
// Finesse Search
// ============================================================================

const fetchFinesseItems = (query: string): Finesse[] => {
  if (!query) {
    return FINESSE_ITEMS
  }
  
  const lowerQuery = query.toLowerCase().replace(/^\^/, '') // Remove leading ^ if present
  
  return FINESSE_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(lowerQuery)
  )
}

// ============================================================================
// Finesse List Component (Dropdown UI) - matches TimePointMention styling
// ============================================================================

const FinesseList = forwardRef<FinesseListRef, FinesseListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return

    const finesse = props.items[index]
    const displayLabel = `${finesse.emoji} ${finesse.label}`
    
    props.command({
      id: finesse.id,
      label: displayLabel,
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
        props.items.map((item: Finesse, index) => (
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
            </div>
          </motion.div>
        ))
      ) : (
        <div className="timepoint-item">No matching energy levels.</div>
      )}
    </div>
  )
})

FinesseList.displayName = 'FinesseList'

// ============================================================================
// Finesse Node (for rendering inserted finesse mentions)
// ============================================================================

export const FinesseNode = Node.create({
  name: 'finesse',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="finesse"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const finesseId = node.attrs.id as string;
    
    // Determine glow based on energy level
    let glowStyle = '';
    if (finesseId?.includes('higher-energy')) {
      // Strong Yang - bright yellow sun glow
      glowStyle = '0 0 12px 3px rgba(255, 240, 50, 0.6), 0 0 25px 6px rgba(255, 250, 100, 0.35)';
    } else if (finesseId?.includes('semi-higher-energy')) {
      // Lesser Yang - dull pale yellow glow (closer to white)
      glowStyle = '0 0 10px 3px rgba(255, 252, 230, 0.6), 0 0 20px 5px rgba(250, 248, 220, 0.35)';
    } else if (finesseId?.includes('semi-lower-energy')) {
      // Lesser Yin - soft dark shadow
      glowStyle = '0 0 10px 3px rgba(0, 0, 0, 0.2), 0 0 20px 5px rgba(0, 0, 0, 0.12)';
    } else if (finesseId?.includes('lower-energy')) {
      // Strong Yin - deeper dark shadow
      glowStyle = '0 0 12px 3px rgba(0, 0, 0, 0.3), 0 0 25px 6px rgba(0, 0, 0, 0.18)';
    }
    
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'timepoint-mention',
        'data-type': 'finesse',
        'data-id': node.attrs.id,
        style: glowStyle ? `box-shadow: ${glowStyle}; border-radius: 4px;` : '',
      }),
      node.attrs.label || '',
    ]
  },
})

// ============================================================================
// Finesse Extension (combines Node + Suggestion)
// ============================================================================

export interface FinesseOptions {
  HTMLAttributes: Record<string, any>
  suggestion: Omit<SuggestionOptions<Finesse>, 'editor'>
}

export const FinesseMention = Extension.create<FinesseOptions>({
  name: 'finesse-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'timepoint-mention' },
      suggestion: {
        char: '^',
        allowSpaces: false,
        pluginKey: FinessePluginKey,
        items: ({ query }) => fetchFinesseItems(query),
        command: ({ editor, range, props }) => {
          // Delete the trigger text and insert the finesse node
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'finesse',
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let component: ReactRenderer<FinesseListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(FinesseList, {
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

export default FinesseMention
