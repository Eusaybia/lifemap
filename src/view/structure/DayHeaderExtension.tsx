"use client"

import React from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps, NodeViewContent } from "@tiptap/react"

// ============================================================================
// Date Helpers
// ============================================================================

const formatDateLabel = (date: Date): string => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  
  const diffDays = Math.round((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  
  // For all other days, show the date
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ============================================================================
// Day Header Node View Component
// ============================================================================

const DayHeaderNodeView: React.FC<NodeViewProps> = (props) => {
  const { node } = props
  const title = node.attrs.title || "Today"
  const backgroundImage = node.attrs.backgroundImage || "/images/daily-header-bg.jpg"
  
  return (
    <NodeViewWrapper data-day-header="true">
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '400px',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '0',
      }}>
        {/* Subtle gradient overlay for text readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.15) 100%)',
        }} />
        
        {/* Header Content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '24px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div>
            {/* Title */}
            <h2 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 600,
              color: '#ffffff',
              textShadow: '0 1px 8px rgba(0,0,0,0.3)',
              fontFamily: 'Georgia, serif',
            }}>
              {title}
            </h2>
            
          </div>
          
          {/* Glass Cards Container - This is where children nodes are rendered */}
          <NodeViewContent className="day-header-grid" />
        </div>
      </div>
      <style>{`
        /* Grid layout for day header cards */
        .day-header-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 16px;
          margin-top: 8px;
        }
        
        /* Tasks - top left */
        .day-header-grid [data-type="day-header-tasks"] {
          grid-column: 1;
          grid-row: 1;
        }
        
        /* Insights - bottom left */
        .day-header-grid [data-type="day-header-insights"] {
          grid-column: 1;
          grid-row: 2;
        }
        
        /* Observations - right side, spanning both rows */
        .day-header-grid [data-type="day-header-observations"] {
          grid-column: 2;
          grid-row: 1 / span 2;
          height: 100%;
          align-self: stretch;
        }
        
        /* Make the observations card stretch fully */
        .day-header-grid [data-type="day-header-observations"] > div {
          height: 100%;
          min-height: 100%;
        }
      `}</style>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Sub-components for Day Header
// ============================================================================

const GlassCardWrapper: React.FC<{ title: string; children: React.ReactNode; dataType: string; fullHeight?: boolean }> = ({ title, children, dataType, fullHeight }) => (
  <div 
    data-type={dataType}
    style={{
      padding: '16px 20px',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      ...(fullHeight && { height: '100%', minHeight: '100%' }),
    }}
  >
    <h4 style={{
      margin: 0,
      fontSize: '13px',
      fontWeight: 600,
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textShadow: '0 1px 4px rgba(0,0,0,0.2)',
    }}>
      {title}
    </h4>
    <div style={{
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.9)',
      lineHeight: 1.5,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      ...(fullHeight && { flex: 1 }),
    }}>
      {children}
    </div>
  </div>
)

export const DayHeaderTasks = TipTapNode.create({
  name: "dayHeaderTasks",
  group: "block",
  content: "block+",
  parseHTML() { return [{ tag: 'div[data-type="day-header-tasks"]' }] },
  renderHTML({ HTMLAttributes }) { return ['div', { ...HTMLAttributes, 'data-type': 'day-header-tasks' }, 0] },
  addNodeView() {
    return ReactNodeViewRenderer(() => (
      <NodeViewWrapper style={{ display: 'contents' }}>
        <GlassCardWrapper title="Tasks for Consideration" dataType="day-header-tasks">
          <NodeViewContent />
        </GlassCardWrapper>
      </NodeViewWrapper>
    ))
  },
})

export const DayHeaderInsights = TipTapNode.create({
  name: "dayHeaderInsights",
  group: "block",
  content: "block+",
  parseHTML() { return [{ tag: 'div[data-type="day-header-insights"]' }] },
  renderHTML({ HTMLAttributes }) { return ['div', { ...HTMLAttributes, 'data-type': 'day-header-insights' }, 0] },
  addNodeView() {
    return ReactNodeViewRenderer(() => (
      <NodeViewWrapper style={{ display: 'contents' }}>
        <GlassCardWrapper title="Feelings, Thoughts" dataType="day-header-insights">
          <NodeViewContent />
        </GlassCardWrapper>
      </NodeViewWrapper>
    ))
  },
})

export const DayHeaderObservations = TipTapNode.create({
  name: "dayHeaderObservations",
  group: "block",
  content: "block+",
  parseHTML() { return [{ tag: 'div[data-type="day-header-observations"]' }] },
  renderHTML({ HTMLAttributes }) { return ['div', { ...HTMLAttributes, 'data-type': 'day-header-observations' }, 0] },
  addNodeView() {
    return ReactNodeViewRenderer(() => (
      <NodeViewWrapper style={{ display: 'contents', height: '100%' }}>
        <GlassCardWrapper title="Observations" dataType="day-header-observations" fullHeight>
          <NodeViewContent />
        </GlassCardWrapper>
      </NodeViewWrapper>
    ))
  },
})

// ============================================================================
// Day Header TipTap Extension
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dayHeader: {
      insertDayHeader: (options?: {
        title?: string
        subtitle?: string
        showBadge?: boolean
        badgeText?: string
        backgroundImage?: string
      }) => ReturnType
    }
  }
}

export const DayHeaderExtension = TipTapNode.create({
  name: "dayHeader",
  group: "block",
  content: "dayHeaderTasks dayHeaderInsights dayHeaderObservations",
  inline: false,
  selectable: true,
  draggable: true,
  
  addAttributes() {
    return {
      title: { default: "Today" },
      subtitle: { default: "" },
      showBadge: { default: true },
      badgeText: { default: "Repeats Daily" },
      backgroundImage: { default: "/images/daily-header-bg.jpg" },
    }
  },
  
  parseHTML() {
    return [{ tag: 'div[data-type="day-header"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'day-header' }, 0]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(DayHeaderNodeView)
  },
  
  addCommands() {
    return {
      insertDayHeader: (options = {}) => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'dayHeader',
            attrs: {
              title: options.title || "Today",
              showBadge: options.showBadge !== false,
              badgeText: options.badgeText || "Repeats Daily",
              backgroundImage: options.backgroundImage || "/images/daily-header-bg.jpg",
            },
            content: [
              { type: 'dayHeaderTasks', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Design how to link tasks across temporal periods...' }] }] },
              { type: 'dayHeaderInsights', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Eusaybia, the whole suite of tools...' }] }] },
              { type: 'dayHeaderObservations', content: [{ type: 'paragraph' }] },
            ]
          })
          .run()
      },
    }
  },
  
  addInputRules() {
    return [
      {
        find: /^\/dayheader\s$/,
        handler: ({ state, range, chain }) => {
          const { tr } = state
          tr.delete(range.from, range.to)
          // @ts-ignore
          chain().insertDayHeader().run()
        },
      },
    ]
  },
})

export default DayHeaderExtension

