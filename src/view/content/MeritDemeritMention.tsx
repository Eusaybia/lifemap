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
const MeritDemeritPluginKey = new PluginKey('merit-demerit-suggestion')

// ============================================================================
// Types
// ============================================================================

export interface MeritDemerit {
  id: string
  label: string
  type: 'merit' | 'demerit'
  circleColor: 'white' | 'black'
}

interface MeritDemeritListProps extends SuggestionProps {
  items: MeritDemerit[]
}

type MeritDemeritListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// ============================================================================
// Merit/Demerit Options Database
// ============================================================================

const MERIT_DEMERIT_OPTIONS: MeritDemerit[] = [
  // Giving (white circle - positive/merit)
  { id: 'merit:giving', label: 'Giving', type: 'merit', circleColor: 'white' },
  
  // Taking (black circle - negative/demerit)
  { id: 'demerit:taking', label: 'Taking', type: 'demerit', circleColor: 'black' },
]

// ============================================================================
// Merit/Demerit Search
// ============================================================================

const fetchMeritDemerits = (query: string): MeritDemerit[] => {
  if (!query) {
    // Show both options: Giving and Taking
    return MERIT_DEMERIT_OPTIONS
  }
  
  const lowerQuery = query.toLowerCase().replace(/^\*/, '') // Remove leading * if present
  
  // Filter matching items
  const matches = MERIT_DEMERIT_OPTIONS.filter((item) =>
    item.label.toLowerCase().includes(lowerQuery)
  )
  
  return matches
}

// ============================================================================
// Merit/Demerit List Component (Dropdown UI)
// ============================================================================

const MeritDemeritList = forwardRef<MeritDemeritListRef, MeritDemeritListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return

    const item = props.items[index]
    
    props.command({
      id: item.id,
      label: item.label,
      'data-type': item.type,
      'data-circle-color': item.circleColor,
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
    <div className="merit-demerit-items" style={{
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
        props.items.map((item: MeritDemerit, index) => (
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
            {/* Circle indicator: white for merit, black for demerit */}
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: item.circleColor === 'white' ? 'white' : 'black',
              border: '1.5px solid #333',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '14px',
              color: '#1a1a1a',
              fontWeight: 500,
            }}>
              {item.label}
            </span>
          </motion.div>
        ))
      ) : (
        <div style={{ padding: '10px', color: '#666', fontSize: '14px' }}>
          No matching options
        </div>
      )}
    </div>
  )
})

MeritDemeritList.displayName = 'MeritDemeritList'

// ============================================================================
// Merit/Demerit Node (for rendering inserted tags)
// ============================================================================

export const MeritDemeritNode = Node.create({
  name: 'meritDemerit',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      'data-type': { default: 'merit' }, // 'merit' or 'demerit'
      'data-circle-color': { default: 'white' }, // 'white' or 'black'
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-node-type="meritDemerit"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const isMerit = node.attrs['data-type'] === 'merit'
    const circleColor = node.attrs['data-circle-color'] || (isMerit ? 'white' : 'black')
    
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'merit-demerit-mention',
        'data-node-type': 'meritDemerit',
        'data-id': node.attrs.id,
        'data-merit-type': node.attrs['data-type'],
        'data-circle-color': circleColor,
        style: `
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px 2px 6px;
          background-color: #ffffff;
          border: 1px solid #BBBBBB;
          border-radius: 5px;
          font-size: 14px;
          font-weight: 500;
          color: #111111;
          box-shadow: 0px 0.36px 1.8px -1.67px rgba(0, 0, 0, 0.23), 0px 1.37px 6.87px -3.33px rgba(0, 0, 0, 0.19);
        `,
      }),
      // Circle element
      [
        'span',
        {
          style: `
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: ${circleColor};
            border: 1.5px solid #333;
            flex-shrink: 0;
          `,
        },
      ],
      // Label text
      [
        'span',
        {},
        node.attrs.label || '',
      ],
    ]
  },
})

// ============================================================================
// Merit/Demerit Extension (combines Node + Suggestion)
// ============================================================================

export interface MeritDemeritOptions {
  HTMLAttributes: Record<string, any>
  suggestion: Omit<SuggestionOptions<MeritDemerit>, 'editor'>
}

export const MeritDemeritMention = Extension.create<MeritDemeritOptions>({
  name: 'merit-demerit-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'merit-demerit-mention' },
      suggestion: {
        char: '*',
        allowSpaces: false,
        pluginKey: MeritDemeritPluginKey,
        items: ({ query }) => fetchMeritDemerits(query),
        command: ({ editor, range, props }) => {
          // Delete the trigger text and insert the merit/demerit node
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'meritDemerit',
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let component: ReactRenderer<MeritDemeritListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(MeritDemeritList, {
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

export default MeritDemeritMention
