"use client"

import React from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps, NodeViewContent } from "@tiptap/react"
import { NodeOverlay } from "../components/NodeOverlay"

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
// Daily Background Image Rotation
// ============================================================================

const GRAHAM_GERCKEN_ARTWORKS = [
  '/images/graham-gercken-daily-header-bg.jpg',
  '/images/1-balmoral-beach-sydney-graham-gercken.jpg',
  '/images/1-capertee-valley-landscape-graham-gercken.jpg',
  '/images/australian-landscape-sofala-graham-gercken.jpg',
  '/images/bondi-coastline-graham-gercken.jpg',
  '/images/koala-in-the-tree-graham-gercken.jpg',
  '/images/milk-beach-sydney-harbour-graham-gercken.jpg',
  '/images/sydney-coastline-graham-gercken.jpg',
]

// Get the day of the year (0-365)
const getDayOfYear = (date: Date = new Date()): number => {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

// Get the date from the current URL (for daily schedule pages like /q/daily-2026-01-07)
const getDateFromUrl = (): Date | null => {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname
  const match = path.match(/daily-(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }
  return null
}

// Get background image based on the date (each date gets a different image)
const getBackgroundImageForDate = (date: Date): string => {
  const dayOfYear = getDayOfYear(date)
  const index = dayOfYear % GRAHAM_GERCKEN_ARTWORKS.length
  return GRAHAM_GERCKEN_ARTWORKS[index]
}

// ============================================================================
// Day Header Node View Component
// ============================================================================

// Old default path that no longer exists (file was renamed)
const OLD_DEFAULT_IMAGE = '/images/daily-header-bg.jpg'

const DayHeaderNodeView: React.FC<NodeViewProps> = (props) => {
  const { node } = props
  const title = node.attrs.title || "Today"
  // Use the daily rotating image if no custom background is set
  // Also handles old default path that no longer exists
  // Each DayHeader gets a different image based on the date from the URL
  const storedImage = node.attrs.backgroundImage
  const hasValidCustomImage = storedImage && 
    storedImage.trim() !== '' && 
    storedImage !== OLD_DEFAULT_IMAGE
  
  // Get the date from URL (e.g., /q/daily-2026-01-07) or fall back to today
  const dateFromUrl = getDateFromUrl()
  const dateForImage = dateFromUrl || new Date()
  const backgroundImage = hasValidCustomImage ? storedImage : getBackgroundImageForDate(dateForImage)
  
  return (
    <NodeViewWrapper data-day-header="true">
      <NodeOverlay nodeProps={props} nodeType="dayHeader">
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: '300px',
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
                fontSize: '26px',
                fontWeight: 400,
                color: '#ffffff',
                textShadow: '0 1px 8px rgba(0,0,0,0.3)',
                fontFamily: "'EB Garamond', Georgia, serif",
              }}>
                {title}
              </h2>
            </div>
            
            {/* Content area - renders child nodes (e.g., a Group) */}
            <NodeViewContent className="day-header-content" />
          </div>
        </div>
      </NodeOverlay>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Sub-components for Day Header
// ============================================================================

// Glass card container without hardcoded title - content determines its own headings
const GlassCardWrapper: React.FC<{ children: React.ReactNode; dataType: string; fullHeight?: boolean }> = ({ children, dataType, fullHeight }) => (
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
      ...(fullHeight && { height: '100%', minHeight: '100%' }),
    }}
  >
    <div style={{
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.95)',
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
        <GlassCardWrapper dataType="day-header-tasks">
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
        <GlassCardWrapper dataType="day-header-insights">
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
        <GlassCardWrapper dataType="day-header-observations" fullHeight>
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
  content: "block+",
  inline: false,
  selectable: true,
  draggable: true,
  allowGapCursor: true,
  isolating: false,
  
  addAttributes() {
    return {
      title: { default: "Today" },
      subtitle: { default: "" },
      showBadge: { default: true },
      badgeText: { default: "Repeats Daily" },
      backgroundImage: { default: null }, // null = use daily rotating image
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
          .insertContent([
            {
              type: 'dayHeader',
              attrs: {
                title: options.title || "Today",
                showBadge: options.showBadge !== false,
                badgeText: options.badgeText || "Repeats Daily",
                backgroundImage: options.backgroundImage || null, // null = use daily rotating image
              },
              content: [
                {
                  type: 'group',
                  content: [
                    { type: 'paragraph' },
                  ]
                },
              ]
            },
            // Insert a paragraph after the DayHeader so users can click below it
            { type: 'paragraph' },
          ])
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

