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
const AuraPluginKey = new PluginKey('aura-suggestion')

// Architectural choice: keep the underlying node name as "finesse" so existing
// stored documents continue to parse without a migration, while exposing Aura
// as the public-facing name.
const AURA_NODE_NAME = 'finesse'
const AURA_DATA_TYPE = 'aura'

// ============================================================================
// Types
// ============================================================================

export interface AuraEnergyLevel {
  id: string
  label: string
  emoji: string
}

interface AuraListProps extends SuggestionProps {
  items: AuraEnergyLevel[]
}

type AuraListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// ============================================================================
// Energy Level Definitions
// ============================================================================

const AURA_ITEMS: AuraEnergyLevel[] = [
  { 
    id: 'aura:higher-energy', 
    label: 'Higher Energy (Strong Yang) ⚌', 
    emoji: '☀️',
  },
  { 
    id: 'aura:semi-higher-energy', 
    label: 'Semi-Higher Energy (Lesser Yang) ⚎', 
    emoji: '☁️',
  },
  { 
    id: 'aura:semi-lower-energy', 
    label: 'Semi-Lower Energy (Lesser Yin) ⚍', 
    emoji: '🌍',
  },
  { 
    id: 'aura:lower-energy', 
    label: 'Lower Energy (Strong Yin) ⚏', 
    emoji: '🌙',
  },
  {
    id: 'aura:blockage',
    label: 'Blockage',
    emoji: '🪨',
  },
]

// ============================================================================
// Aura Search
// ============================================================================

const fetchAuraItems = (query: string): AuraEnergyLevel[] => {
  if (!query) {
    return AURA_ITEMS
  }
  
  const lowerQuery = query.toLowerCase().replace(/^\^/, '') // Remove leading ^ if present
  
  return AURA_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(lowerQuery)
  )
}

// ============================================================================
// Aura List Component (Dropdown UI) - matches TemporalFieldExtension styling
// ============================================================================

const AuraList = forwardRef<AuraListRef, AuraListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return

    const auraItem = props.items[index]
    const displayLabel = `${auraItem.emoji} ${auraItem.label}`
    
    props.command({
      id: auraItem.id,
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
        props.items.map((item: AuraEnergyLevel, index) => (
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

AuraList.displayName = 'AuraList'

// ============================================================================
// Aura Node (for rendering inserted aura mentions)
// ============================================================================

export const AuraNode = Node.create({
  name: AURA_NODE_NAME,
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
    return [
      { tag: 'span[data-type="finesse"]' },
      { tag: 'span[data-type="aura"]' },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const auraId = node.attrs.id as string
    
    // Determine glow based on energy level
    let glowStyle = ''
    if (auraId?.includes('higher-energy')) {
      // Strong Yang - bright yellow sun glow
      glowStyle = '0 0 12px 3px rgba(255, 240, 50, 0.6), 0 0 25px 6px rgba(255, 250, 100, 0.35)'
    } else if (auraId?.includes('semi-higher-energy')) {
      // Lesser Yang - dull pale yellow glow (closer to white)
      glowStyle = '0 0 10px 3px rgba(255, 252, 230, 0.6), 0 0 20px 5px rgba(250, 248, 220, 0.35)'
    } else if (auraId?.includes('semi-lower-energy')) {
      // Lesser Yin - soft dark shadow
      glowStyle = '0 0 10px 3px rgba(0, 0, 0, 0.2), 0 0 20px 5px rgba(0, 0, 0, 0.12)'
    } else if (auraId?.includes('lower-energy')) {
      // Strong Yin - deeper dark shadow
      glowStyle = '0 0 12px 3px rgba(0, 0, 0, 0.3), 0 0 25px 6px rgba(0, 0, 0, 0.18)'
    } else if (auraId?.includes('blockage')) {
      // Blockage - black aura, distinct from higher yang energies
      glowStyle = '0 0 12px 3px rgba(0, 0, 0, 0.65), 0 0 28px 8px rgba(0, 0, 0, 0.4)'
    }
    
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'timepoint-mention',
        'data-type': AURA_DATA_TYPE,
        'data-id': node.attrs.id,
        style: glowStyle ? `box-shadow: ${glowStyle}; border-radius: 4px;` : '',
      }),
      node.attrs.label || '',
    ]
  },
})

// ============================================================================
// Aura Extension (combines Node + Suggestion)
// ============================================================================

export interface AuraOptions {
  HTMLAttributes: Record<string, any>
  suggestion: Omit<SuggestionOptions<AuraEnergyLevel>, 'editor'>
}

export const AuraMention = Extension.create<AuraOptions>({
  name: 'aura-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'timepoint-mention' },
      suggestion: {
        char: '^',
        allowSpaces: false,
        pluginKey: AuraPluginKey,
        items: ({ query }) => fetchAuraItems(query),
        command: ({ editor, range, props }) => {
          // Delete the trigger text and insert the aura node
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: AURA_NODE_NAME,
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let component: ReactRenderer<AuraListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(AuraList, {
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

export default AuraMention
