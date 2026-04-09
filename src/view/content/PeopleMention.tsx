'use client'

import './MentionList.scss'
import { Extension, mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'
import { ReactRenderer, NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
import Suggestion, { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import React, { forwardRef, useEffect, useImperativeHandle, useState, useRef } from 'react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { motion, AnimatePresence } from 'framer-motion'
import { PluginKey } from '@tiptap/pm/state'

const PeoplePluginKey = new PluginKey('people-suggestion')

export interface Person {
  id: string
  name: string
  emoji: string
}

interface PeopleListProps extends SuggestionProps {
  items: Person[]
}

type PeopleListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

const normalizePersonName = (value: string): string => value.trim().replace(/\s+/g, ' ')

const slugifyPersonName = (value: string): string =>
  normalizePersonName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const createCustomPerson = (name: string): Person => {
  const normalizedName = normalizePersonName(name)
  const slug = slugifyPersonName(normalizedName) || 'person'

  return {
    id: `person:custom-${slug}`,
    name: normalizedName,
    emoji: '👤',
  }
}

const fetchPeople = (query: string): Person[] => {
  const normalizedQuery = normalizePersonName(query)
  if (!normalizedQuery) return []

  return [createCustomPerson(normalizedQuery)]
}

const getPersonInitials = (name: string): string => {
  const normalizedName = normalizePersonName(name)
  if (!normalizedName) return 'P'

  const initials = normalizedName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || normalizedName[0]?.toUpperCase() || 'P'
}

const PeopleList = forwardRef<PeopleListRef, PeopleListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return

    const person = props.items[index]
    if (!person) return

    props.command({
      id: person.id,
      label: `${person.emoji} ${person.name}`,
      'data-name': person.name,
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
    <div className="people-items">
      {props.items.length > 0 ? (
        props.items.map((item: Person, index) => (
          <motion.div
            className={`people-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={item.id}
            onClick={() => selectItem(index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="people-emoji">{item.emoji}</span>
            <div className="people-content">
              <span className="people-name">{`Create: ${item.name}`}</span>
              <span className="people-meta">Person</span>
            </div>
          </motion.div>
        ))
      ) : (
        <div className="people-item">No matching people.</div>
      )}
    </div>
  )
})

PeopleList.displayName = 'PeopleList'

const PersonNodeView = ({ node, selected }: NodeViewProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const tagRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })

  const attrs = node.attrs as {
    id: string
    label: string
    'data-name': string
  }

  const label = attrs.label
  const name = attrs['data-name'] || label || 'Person'
  const initials = getPersonInitials(name)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (tagRef.current && !isExpanded) {
      const rect = tagRef.current.getBoundingClientRect()
      setPopoverPosition({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }

    setIsExpanded(!isExpanded)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsExpanded(false)
  }

  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        tagRef.current &&
        !tagRef.current.contains(target)
      ) {
        setIsExpanded(false)
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline', position: 'relative' }}>
      <span
        ref={tagRef}
        className={`person-mention ${selected ? 'selected' : ''}`}
        data-person-id={attrs.id || undefined}
        data-person-label={label || undefined}
        data-person-name={attrs['data-name'] || undefined}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {label}
      </span>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: popoverPosition.top,
              left: popoverPosition.left,
              backgroundColor: '#ffffff',
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 10px 40px -5px rgba(0, 0, 0, 0.2), 0 4px 12px -2px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              width: 350,
              zIndex: 99999,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>👤</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
                  {name}
                </span>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb'
                  e.currentTarget.style.color = '#111827'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#6b7280'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div
              style={{
                width: '100%',
                height: 220,
                background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 16,
                  border: '1px solid rgba(148, 163, 184, 0.24)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  boxShadow: '0 12px 30px -18px rgba(15, 23, 42, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #c7d2fe 0%, #fbcfe8 100%)',
                    color: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {initials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
                    {name}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
                    Person mention
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NodeViewWrapper>
  )
}

export const PersonNode = Node.create({
  name: 'person',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      'data-name': { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="person"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'person-mention',
        'data-type': 'person',
        'data-id': node.attrs.id,
      }),
      node.attrs.label || '',
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PersonNodeView)
  },
})

export interface PeopleOptions {
  HTMLAttributes: Record<string, any>
  suggestion: Omit<SuggestionOptions<Person>, 'editor'>
}

export const PeopleMention = Extension.create<PeopleOptions>({
  name: 'people-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'person-mention' },
      suggestion: {
        char: '%',
        allowSpaces: true,
        pluginKey: PeoplePluginKey,
        items: ({ query }) => fetchPeople(query),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'person',
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let component: ReactRenderer<PeopleListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(PeopleList, {
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

export default PeopleMention
