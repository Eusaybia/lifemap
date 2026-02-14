'use client'

import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { motion } from 'framer-motion'
import { PluginKey } from '@tiptap/pm/state'
import { Editor } from '@tiptap/core'
import { FlowSwitch, Option } from './FlowSwitch'

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
      title: 'Card Strip',
      description: 'Insert a horizontal card strip',
      emoji: '🗂️',
      keywords: ['card', 'lifemap', 'container', 'strip', 'row'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertLifemapCard({ title: 'New Card' })
      },
    },
    {
      id: 'single-card',
      title: 'Single Card',
      description: 'Insert an individual card',
      emoji: '🪪',
      keywords: ['card', 'single', 'person', 'profile', 'image'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertSingleLifemapCard({ title: 'New Card' })
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
      id: 'excalidraw',
      title: 'Excalidraw Whiteboard',
      description: 'Hand-drawn style whiteboard for moodboards & diagrams',
      emoji: '🎨',
      keywords: ['excalidraw', 'whiteboard', 'draw', 'sketch', 'diagram', 'moodboard', 'wireframe', 'canvas'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertExcalidraw()
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
      id: 'weekly-schedule',
      title: 'Weekly Schedule',
      description: 'Insert a weekly schedule view',
      emoji: '📆',
      keywords: ['weekly', 'schedule', 'week', 'planner', 'calendar'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertWeekly()
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
    {
      id: 'temporal-order',
      title: 'Temporal Order',
      description: 'Insert a temporal order timeline',
      emoji: '🕰️',
      keywords: ['time', 'temporal', 'order', 'timeline', 'chronological'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertTemporalOrder()
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
    {
      id: 'lifetime-view',
      title: 'Lifetime View',
      description: 'Visualize your life as circles - years lived vs ahead',
      emoji: '⏳',
      keywords: ['lifetime', 'life', 'years', 'age', 'death', 'mortality', 'circles'],
      action: (editor) => {
        // @ts-ignore
        editor.commands.insertLifetimeView?.() ||
          editor.chain().focus().insertContent({ type: 'lifetimeView' }).run()
      },
    },
    {
      id: 'external-portal',
      title: 'External Portal',
      description: 'Embed content from another Quanta',
      emoji: '📡',
      keywords: ['portal', 'external', 'embed', 'transclude', 'link', 'quanta', 'reference'],
      action: (editor) => {
        editor.chain().focus().insertContent({
          type: 'externalPortal',
          attrs: { externalQuantaId: '' },
        }).run()
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
  const containerRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const [tickSound, setTickSound] = useState<HTMLAudioElement | null>(null)

  // Initialize tick sound
  useEffect(() => {
    const audio = new Audio('/click.mp3')
    audio.volume = 0.12
    setTickSound(audio)
  }, [])

  // Scroll to selected item
  const scrollToIndex = (index: number) => {
    const element = itemRefs.current[index]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  const selectItem = (index: number) => {
    if (index >= props.items.length) return
    const item = props.items[index]
    // Play click sound
    if (tickSound) {
      const soundClone = tickSound.cloneNode() as HTMLAudioElement
      soundClone.volume = 0.15
      soundClone.play().catch(() => {})
    }
    props.command(item)
  }

  const upHandler = () => {
    const newIndex = (selectedIndex + props.items.length - 1) % props.items.length
    setSelectedIndex(newIndex)
    // Play tick sound
    if (tickSound) {
      const soundClone = tickSound.cloneNode() as HTMLAudioElement
      soundClone.volume = 0.1
      soundClone.play().catch(() => {})
    }
    scrollToIndex(newIndex)
  }

  const downHandler = () => {
    const newIndex = (selectedIndex + 1) % props.items.length
    setSelectedIndex(newIndex)
    // Play tick sound
    if (tickSound) {
      const soundClone = tickSound.cloneNode() as HTMLAudioElement
      soundClone.volume = 0.1
      soundClone.play().catch(() => {})
    }
    scrollToIndex(newIndex)
  }

  const enterHandler = () => selectItem(selectedIndex)

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') { upHandler(); return true }
      if (event.key === 'ArrowDown') { downHandler(); return true }
      if (event.key === 'Enter') { enterHandler(); return true }
      return false
    },
  }))

  if (props.items.length === 0) {
    return (
      <div style={{ 
        padding: '16px', 
        color: '#888', 
        fontSize: '13px', 
        textAlign: 'center', 
        fontFamily: 'Inter, system-ui, sans-serif',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        borderRadius: '10px',
        border: '1px solid rgba(200, 200, 200, 0.6)',
      }}>
        No matching commands
      </div>
    )
  }

  // Use FlowSwitch styling but with proper list behavior
  return (
    <motion.div
      ref={containerRef}
      className="flow-menu slash-menu-list"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      style={{
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
        cursor: 'pointer',
        boxSizing: 'border-box',
        width: 'fit-content',
        minWidth: 220,
        maxWidth: 320,
        maxHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        padding: '6px',
        overflow: 'auto',
        boxShadow: '0px 0.6px 3px -0.9px rgba(0, 0, 0, 0.14), 0px 2.3px 11.4px -1.8px rgba(0, 0, 0, 0.13), 0px 10px 50px -2.75px rgba(0, 0, 0, 0.11)',
        backgroundColor: 'rgba(217, 217, 217, 0.22)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transform: 'translate3d(0, 0, 0)',
        borderRadius: 8,
        border: '1px solid #BBBBBB',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        gap: 2,
      }}
    >
      {props.items.map((item, index) => (
        <motion.div
          key={item.id}
          ref={(el) => { itemRefs.current[index] = el }}
          onClick={() => selectItem(index)}
          initial={{ opacity: 0.4, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.97 }}
          viewport={{ root: containerRef, margin: '-10px 0px -10px 0px' }}
          style={{
            scrollSnapAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            backgroundColor: index === selectedIndex ? 'rgba(100, 100, 100, 0.15)' : 'transparent',
            transition: 'background-color 0.1s ease',
          }}
        >
          <span style={{ fontSize: '16px', width: 24, textAlign: 'center' }}>{item.emoji}</span>
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px', color: '#333' }}>
            {item.title}
          </span>
        </motion.div>
      ))}
    </motion.div>
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

