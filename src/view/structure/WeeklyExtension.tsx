"use client"

import React, { useEffect, useRef, useState } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"
import { NodeOverlay } from "../components/NodeOverlay"

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
const EMBED_CARD_WIDTH = 440
const EMBED_CARD_MIN_HEIGHT = 720

interface DayCardProps {
  label: string
  slug: string
  children: React.ReactNode
}

const DayCard: React.FC<DayCardProps> = ({ label, slug, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        flex: `0 0 ${EMBED_CARD_WIDTH}px`,
        width: `${EMBED_CARD_WIDTH}px`,
        minHeight: `${EMBED_CARD_MIN_HEIGHT}px`,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E5E5',
        scrollSnapAlign: 'center',
        overflow: 'visible',
        padding: '0px',
        position: 'relative',
        zIndex: 100,
      }}
    >
      {/* Route Strip */}
      <div style={{
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e5e5e5',
        borderRadius: '12px 12px 0 0',
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
      <NodeOverlay nodeProps={props} nodeType="weekly">
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

// ============================================================================
// Weekly TipTap Extension - Simple block container
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    weekly: {
      insertWeekly: () => ReturnType
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

export default WeeklyExtension

