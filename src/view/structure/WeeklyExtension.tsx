"use client"

import React, { useRef } from "react"
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
        flex: '0 0 520px',
        width: '520px',
        minHeight: '900px',
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

