"use client"

import React, { useEffect, useRef, useState } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"
import { NodeOverlay } from "../components/NodeOverlay"
import { Quanta } from "../../core/Quanta"

// ============================================================================
// Weekly Schedule - Simple Monday → Sunday row
// ============================================================================

const WEEK_DAYS = [
  { label: 'Mondays', slug: 'mondays' },
  { label: 'Tuesdays', slug: 'tuesdays' },
  { label: 'Wednesdays', slug: 'wednesdays' },
  { label: 'Thursdays', slug: 'thursdays' },
  { label: 'Fridays', slug: 'fridays' },
  { label: 'Saturdays', slug: 'saturdays' },
  { label: 'Sundays', slug: 'sundays' },
]

// Architectural choice: smaller embed cards keep the weekly overview compact
// while preserving a clear, swipeable target for each day.
const EMBED_CARD_WIDTH = 256
const EMBED_CARD_HEIGHT = 520
// Architectural choice: Quanta cards are taller to surface more content
// without requiring a scroll inside each card.
const QUANTA_CARD_HEIGHT = 434

interface DayCardProps {
  label: string
  slug: string
  children: React.ReactNode
  height?: number
}

const DayCard: React.FC<DayCardProps> = ({ label, slug, children, height }) => {
  const cardHeight = height ?? EMBED_CARD_HEIGHT

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        flex: `0 0 ${EMBED_CARD_WIDTH}px`,
        width: `${EMBED_CARD_WIDTH}px`,
        height: `${cardHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        scrollSnapAlign: 'center',
        overflow: 'visible',
        padding: '0px',
        position: 'relative',
        zIndex: 100,
      }}
    >
      {/* Route Strip */}
      <div style={{
        // Architectural choice: keep the route strip markup for quick toggles
        // while removing its visual chrome from the compact embed view.
        display: 'none',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e5e5e5',
        padding: '4px 16px',
        fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
        fontSize: '11px',
        color: '#888',
        letterSpacing: '0.3px',
      }}>
        <span>/q/{slug}</span>
      </div>
      
      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </motion.div>
  )
}

const WeeklyNodeView: React.FC<NodeViewProps> = (props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [instantiatedDays, setInstantiatedDays] = useState<Record<string, boolean>>({})
  const didPrefetchRef = useRef(false)

  const handleInstantiateDay = (slug: string) => {
    setInstantiatedDays((prev) => ({ ...prev, [slug]: true }))
  }

  useEffect(() => {
    if (didPrefetchRef.current || typeof window === 'undefined') return
    didPrefetchRef.current = true

    const prefetchDays = () => {
      WEEK_DAYS.forEach((day) => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.as = 'document'
        link.href = `/q/${day.slug}?mode=graph`
        link.crossOrigin = 'anonymous'
        document.head.appendChild(link)
      })
    }

    // Architectural choice: prefetch in idle time to keep "click to init"
    // semantics while reducing the perceived wait after a click.
    if ('requestIdleCallback' in window) {
      // @ts-ignore - requestIdleCallback is not in all TS libs
      window.requestIdleCallback(prefetchDays)
    } else {
      setTimeout(prefetchDays, 1000)
    }
  }, [])

  return (
    <NodeViewWrapper 
      data-weekly-node-view="true"
      style={{ margin: '0', overflow: 'visible', position: 'relative', zIndex: 50 }}
    >
      {/* Architectural choice: weekly embeds should sit flat without the group
          shadow so the carousel reads as a lightweight strip. */}
      {/* Architectural choice: allow weekly embeds to visually overflow so
          in-embed badges and glows aren't clipped by the node wrapper. */}
      <NodeOverlay
        nodeProps={props}
        nodeType="weekly"
        boxShadow="none"
        style={{ overflow: 'visible' }}
      >
        <div style={{ position: 'relative', overflow: 'visible', zIndex: 50 }}>
          {/* Horizontal Scroll Container */}
          <div
            ref={scrollContainerRef}
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              overflowX: 'auto',
              overflowY: 'visible',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              padding: '8px 50px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            className="weekly-carousel-scroll"
          >
            <style>{`
              .weekly-carousel-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {WEEK_DAYS.map((day) => (
              <DayCard key={day.slug} label={day.label} slug={day.slug} height={QUANTA_CARD_HEIGHT}>
                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                  {instantiatedDays[day.slug] ? (
                    <iframe
                      src={`/q/${day.slug}?mode=graph`}
                      title={`${day.label} Schedule`}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f9f9f9',
                      color: '#999',
                      fontSize: '14px',
                      height: '100%',
                    }}>
                      <motion.button
                        onClick={() => handleInstantiateDay(day.slug)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '999px',
                          border: '1px solid #ddd',
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#666',
                        }}
                        whileHover={{ backgroundColor: '#f0f0f0' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Click to load
                      </motion.button>
                    </div>
                  )}
                </div>
              </DayCard>
            ))}
          </div>
        </div>
      </NodeOverlay>
    </NodeViewWrapper>
  )
}

// Architectural choice: provide a Quanta-based weekly view so embedded
// schedules can share app state without iframe boundaries.
interface WeeklyScheduleQuantaProps extends NodeViewProps {
  userId?: string
}

export const WeeklyScheduleQuanta: React.FC<WeeklyScheduleQuantaProps> = (props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const didPrefetchRef = useRef(false)
  const userId = props.userId ?? '000000'

  useEffect(() => {
    if (didPrefetchRef.current || typeof window === 'undefined') return
    didPrefetchRef.current = true

    const prefetchDays = () => {
      WEEK_DAYS.forEach((day) => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.as = 'document'
        link.href = `/q/${day.slug}?mode=graph`
        link.crossOrigin = 'anonymous'
        document.head.appendChild(link)
      })
    }

    // Architectural choice: prefetch in idle time to keep "click to init"
    // semantics while reducing the perceived wait after a click.
    if ('requestIdleCallback' in window) {
      // @ts-ignore - requestIdleCallback is not in all TS libs
      window.requestIdleCallback(prefetchDays)
    } else {
      setTimeout(prefetchDays, 1000)
    }
  }, [])

  return (
    <NodeViewWrapper 
      data-weekly-node-view="true"
      style={{ margin: '0', overflow: 'visible', position: 'relative', zIndex: 50 }}
    >
      {/* Architectural choice: weekly embeds should sit flat without the group
          shadow so the carousel reads as a lightweight strip. */}
      {/* Architectural choice: allow weekly embeds to visually overflow so
          in-embed badges and glows aren't clipped by the node wrapper. */}
      <NodeOverlay
        nodeProps={props}
        nodeType="weekly"
        boxShadow="none"
        style={{ overflow: 'visible' }}
      >
        <div style={{ position: 'relative', overflow: 'visible', zIndex: 50 }}>
          {/* Horizontal Scroll Container */}
          <div
            ref={scrollContainerRef}
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              overflowX: 'auto',
              overflowY: 'visible',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              padding: '8px 50px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            className="weekly-carousel-scroll"
          >
            <style>{`
              .weekly-carousel-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {WEEK_DAYS.map((day) => (
              <DayCard key={day.slug} label={day.label} slug={day.slug}>
                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                  {/* Architectural choice: eagerly render all days so the
                      Quanta carousel initializes in a single pass. */}
                  <div style={{ width: '100%', height: '100%' }}>
                    <Quanta quantaId={day.slug} userId={userId} />
                  </div>
                </div>
              </DayCard>
            ))}
          </div>
        </div>
      </NodeOverlay>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Weekly TipTap Extension - Simple block container
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    weekly: {
      insertWeekly: () => ReturnType
    }
    weeklyQuanta: {
      insertWeeklyQuanta: () => ReturnType
    }
  }
}

export const WeeklyExtension = TipTapNode.create({
  name: "weekly",
  group: "block",
  atom: true,
  inline: false,
  selectable: true,
  draggable: true,
  
  parseHTML() {
    return [{ tag: 'div[data-type="weekly"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'weekly' }]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(WeeklyNodeView)
  },
  
  addCommands() {
    return {
      insertWeekly: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'weekly',
          })
          .run()
      },
    }
  },
  
  addInputRules() {
    return [
      {
        find: /^\/weekly\s$/,
        handler: ({ state, range, chain }) => {
          const { tr } = state
          tr.delete(range.from, range.to)
          // @ts-ignore
          chain().insertWeekly().run()
        },
      },
    ]
  },
})

// Architectural choice: separate node type keeps iframe and Quanta variants
// independently insertable without changing existing weekly content.
export const WeeklyQuantaExtension = TipTapNode.create({
  name: "weeklyQuanta",
  group: "block",
  atom: true,
  inline: false,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="weekly-quanta"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'weekly-quanta' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WeeklyScheduleQuanta)
  },

  addCommands() {
    return {
      insertWeeklyQuanta: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'weeklyQuanta',
          })
          .run()
      },
    }
  },

  addInputRules() {
    return [
      {
        find: /^\/weekly-quanta\s$/,
        handler: ({ state, range, chain }) => {
          const { tr } = state
          tr.delete(range.from, range.to)
          // @ts-ignore
          chain().insertWeeklyQuanta().run()
        },
      },
    ]
  },
})

export default WeeklyExtension

