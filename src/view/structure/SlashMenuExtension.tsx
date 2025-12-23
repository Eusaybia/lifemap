'use client'

import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { motion } from 'framer-motion'
import { PluginKey } from '@tiptap/pm/state'
import { Editor } from '@tiptap/core'

// ============================================================================
// Types
// ============================================================================

export interface SlashMenuItem {
  id: string
  title: string
  description: string
  emoji: string
  keywords: string[]
  action: (editor: Editor) => void
}

interface SlashMenuListProps extends SuggestionProps {
  items: SlashMenuItem[]
}

type SlashMenuListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// Unique plugin key
const SlashMenuPluginKey = new PluginKey('slash-menu')

// ============================================================================
// Slash Menu Items
// ============================================================================

const getSlashMenuItems = (editor: Editor): SlashMenuItem[] => {
  return [
    // Structure
    {
      id: 'columns-2',
      title: '2 Columns',
      description: 'Insert a 2-column layout',
      emoji: '🏛️',
      keywords: ['columns', 'table', 'layout', '2'],
      action: (editor) => {
        editor.chain()
          .focus()
          .insertTable({ rows: 1, cols: 2, withHeaderRow: false })
          .insertContent({ type: 'paragraph' })
          .run()
      },
    },
    {
      id: 'columns-3',
      title: '3 Columns',
      description: 'Insert a 3-column layout',
      emoji: '🏛️',
      keywords: ['columns', 'table', 'layout', '3'],
      action: (editor) => {
        editor.chain()
          .focus()
          .insertTable({ rows: 1, cols: 3, withHeaderRow: false })
          .insertContent({ type: 'paragraph' })
          .run()
      },
    },
    {
      id: 'details',
      title: 'Details',
      description: 'Collapsible details section',
      emoji: '▶',
      keywords: ['details', 'collapse', 'accordion', 'toggle'],
      action: (editor) => {
        editor.commands.setDetails()
      },
    },
    {
      id: 'image',
      title: 'Image',
      description: 'Upload an image',
      emoji: '🌁',
      keywords: ['image', 'picture', 'photo', 'upload'],
      action: (editor) => {
        // Create file input for image upload
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (!file) return
          
          try {
            const response = await fetch(
              `/api/upload?filename=${encodeURIComponent(file.name)}`,
              { method: 'POST', body: file }
            )
            if (!response.ok) throw new Error('Upload failed')
            const blob = await response.json()
            editor.chain().focus().setImage({ src: blob.url }).run()
          } catch (error) {
            console.error('Image upload failed:', error)
          }
        }
        input.click()
      },
    },
    {
      id: 'warning',
      title: 'Warning',
      description: 'Add a warning callout',
      emoji: '⚠️',
      keywords: ['warning', 'alert', 'caution', 'callout'],
      action: (editor) => {
        editor.commands.insertContent({ type: 'warning' })
      },
    },
    {
      id: 'lifemap-card',
      title: 'Lifemap Card',
      description: 'Insert a lifemap card',
      emoji: '🗂️',
      keywords: ['card', 'lifemap', 'container'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertLifemapCard({ title: 'New Card' })
      },
    },
    {
      id: 'temporal-graph',
      title: '2D Temporal Graph',
      description: 'Insert a temporal visualization',
      emoji: '📊',
      keywords: ['graph', 'temporal', 'timeline', 'visualization', 'chart'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertQuantaFlow({ height: 400 })
      },
    },
    {
      id: 'mapbox-map',
      title: 'Mapbox Map',
      description: 'Insert an interactive map',
      emoji: '🗺️',
      keywords: ['map', 'mapbox', 'location', 'geography'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertMapboxMap()
      },
    },
    {
      id: 'daily-schedule',
      title: 'Daily Schedule',
      description: 'Insert a daily schedule view',
      emoji: '📅',
      keywords: ['daily', 'schedule', 'day', 'planner', 'calendar'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertDaily()
      },
    },
    {
      id: 'day-header',
      title: 'Day Header',
      description: 'Insert a day header with tasks',
      emoji: '🌄',
      keywords: ['header', 'day', 'today', 'morning'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertDayHeader()
      },
    },
    {
      id: 'temporal-space',
      title: 'Temporal Space',
      description: 'Insert a temporal space container',
      emoji: '⏱️',
      keywords: ['time', 'temporal', 'space', 'duration', 'period'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertTemporalSpace()
      },
    },
    // Text formatting
    {
      id: 'heading-1',
      title: 'Heading 1',
      description: 'Large heading',
      emoji: 'H1',
      keywords: ['heading', 'h1', 'title', 'large'],
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run()
      },
    },
    {
      id: 'heading-2',
      title: 'Heading 2',
      description: 'Medium heading',
      emoji: 'H2',
      keywords: ['heading', 'h2', 'subtitle', 'medium'],
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      },
    },
    {
      id: 'heading-3',
      title: 'Heading 3',
      description: 'Small heading',
      emoji: 'H3',
      keywords: ['heading', 'h3', 'small'],
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run()
      },
    },
    {
      id: 'bullet-list',
      title: 'Bullet List',
      description: 'Unordered list',
      emoji: '•',
      keywords: ['bullet', 'list', 'unordered', 'ul'],
      action: (editor) => {
        editor.chain().focus().toggleBulletList().run()
      },
    },
    {
      id: 'numbered-list',
      title: 'Numbered List',
      description: 'Ordered list',
      emoji: '1.',
      keywords: ['numbered', 'list', 'ordered', 'ol'],
      action: (editor) => {
        editor.chain().focus().toggleOrderedList().run()
      },
    },
    {
      id: 'task-list',
      title: 'Task List',
      description: 'Checklist with checkboxes',
      emoji: '☑️',
      keywords: ['task', 'todo', 'checklist', 'checkbox'],
      action: (editor) => {
        editor.chain().focus().toggleTaskList().run()
      },
    },
    {
      id: 'blockquote',
      title: 'Quote',
      description: 'Blockquote',
      emoji: '"',
      keywords: ['quote', 'blockquote', 'citation'],
      action: (editor) => {
        editor.chain().focus().toggleBlockquote().run()
      },
    },
    {
      id: 'code-block',
      title: 'Code Block',
      description: 'Code with syntax highlighting',
      emoji: '</>',
      keywords: ['code', 'pre', 'programming', 'syntax'],
      action: (editor) => {
        editor.chain().focus().toggleCodeBlock().run()
      },
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Horizontal line separator',
      emoji: '—',
      keywords: ['divider', 'separator', 'line', 'hr'],
      action: (editor) => {
        editor.chain().focus().setHorizontalRule().run()
      },
    },
  ]
}

const filterItems = (items: SlashMenuItem[], query: string): SlashMenuItem[] => {
  if (!query) return items
  
  const lowerQuery = query.toLowerCase()
  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.keywords.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
    )
  })
}

// ============================================================================
// Slash Menu List Component
// ============================================================================

const SlashMenuList = forwardRef<SlashMenuListRef, SlashMenuListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return
    const item = props.items[index]
    props.command(item)
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
    <div className="slash-menu-items" style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      border: '1px solid rgba(0,0,0,0.1)',
      maxHeight: '320px',
      overflowY: 'auto',
      padding: '8px',
      minWidth: '280px',
    }}>
      {props.items.length > 0 ? (
        props.items.map((item, index) => (
          <motion.div
            key={item.id}
            onClick={() => selectItem(index)}
            whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: index === selectedIndex ? 'rgba(0,0,0,0.05)' : 'transparent',
            }}
          >
            <span style={{
              fontSize: '18px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: '6px',
            }}>
              {item.emoji}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 500,
                fontSize: '14px',
                color: '#1a1a1a',
              }}>
                {item.title}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#666',
              }}>
                {item.description}
              </div>
            </div>
          </motion.div>
        ))
      ) : (
        <div style={{ padding: '12px', color: '#666', fontSize: '14px' }}>
          No matching commands
        </div>
      )}
    </div>
  )
})

SlashMenuList.displayName = 'SlashMenuList'

// ============================================================================
// Slash Menu Extension
// ============================================================================

export const SlashMenuExtension = Extension.create({
  name: 'slashMenu',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        pluginKey: SlashMenuPluginKey,
        items: ({ query, editor }: { query: string; editor: Editor }) => {
          const items = getSlashMenuItems(editor)
          return filterItems(items, query)
        },
        command: ({ editor, range, props }: { editor: Editor; range: any; props: SlashMenuItem }) => {
          // Delete the slash command text
          editor.chain().focus().deleteRange(range).run()
          // Execute the action
          props.action(editor)
        },
        render: () => {
          let component: ReactRenderer<SlashMenuListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(SlashMenuList, {
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

            onUpdate(props: SuggestionProps) {
              component?.updateProps(props)
              popup?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              })
            },

            onKeyDown(props: SuggestionKeyDownProps) {
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
      } as Omit<SuggestionOptions<SlashMenuItem>, 'editor'>,
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

export default SlashMenuExtension

