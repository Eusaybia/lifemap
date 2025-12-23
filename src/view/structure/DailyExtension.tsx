"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps, NodeViewContent } from "@tiptap/react"
import { motion } from "framer-motion"

// Simple chevron icons
const ChevronLeft = ({ size = 20, color = "#666" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
)

const ChevronRight = ({ size = 20, color = "#666" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
)

// ============================================================================
// Day Card Component - Individual card in the carousel
// ============================================================================

interface DayCardProps {
  label: string
  isToday: boolean
  children: React.ReactNode
}

const DayCard: React.FC<DayCardProps> = ({ label, isToday, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isToday ? 1 : 0.7, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        flex: '0 0 550px',
        width: '550px',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isToday ? '#FFFEF5' : '#FFFFFF',
        borderRadius: '12px',
        border: isToday ? '2px solid #E5E0C8' : '1px solid #E5E5E5',
        scrollSnapAlign: 'center',
        overflow: 'hidden',
        padding: '16px',
      }}
    >
      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Daily Carousel Node View - Horizontal carousel with 3 cards
// ============================================================================

const DailyNodeView: React.FC<NodeViewProps> = (props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(1) // Start at "Today" (middle of 3)
  
  // Scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 550 + 12
      const scrollPosition = (1 * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2)
      setTimeout(() => {
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' })
      }, 100)
    }
  }, [])
  
  const scrollToCard = useCallback((index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 550 + 12
      const scrollPosition = (index * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2)
      container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' })
      setActiveIndex(index)
    }
  }, [])
  
  const navigatePrevious = useCallback(() => {
    scrollToCard(Math.max(0, activeIndex - 1))
  }, [activeIndex, scrollToCard])
  
  const navigateNext = useCallback(() => {
    scrollToCard(Math.min(2, activeIndex + 1))
  }, [activeIndex, scrollToCard])
  
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 550 + 12
      const scrollCenter = container.scrollLeft + (container.clientWidth / 2)
      const newIndex = Math.round((scrollCenter - cardWidth / 2) / cardWidth)
      const clampedIndex = Math.max(0, Math.min(2, newIndex))
      if (clampedIndex !== activeIndex) {
        setActiveIndex(clampedIndex)
      }
    }
  }, [activeIndex])

  return (
    <NodeViewWrapper 
      data-daily-node-view="true"
      style={{ margin: '0' }}
    >
      <div style={{ position: 'relative' }}>
        {/* Navigation Arrows */}
        <button
          onClick={navigatePrevious}
          disabled={activeIndex === 0}
          style={{
            position: 'absolute',
            left: '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            border: '1px solid #e5e5e5',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: activeIndex === 0 ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={18} color="#666" />
        </button>
        
        <button
          onClick={navigateNext}
          disabled={activeIndex === 2}
          style={{
            position: 'absolute',
            right: '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            border: '1px solid #e5e5e5',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: activeIndex === 2 ? 'not-allowed' : 'pointer',
            opacity: activeIndex === 2 ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} color="#666" />
        </button>
        
        {/* Horizontal Scroll Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '12px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            padding: '8px 50px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="daily-carousel-scroll"
        >
          <style>{`
            .daily-carousel-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {/* Yesterday Card */}
          <DayCard label="Yesterday" isToday={false}>
            <div data-day-slot="yesterday" style={{ minHeight: '100px' }}>
              {/* Content rendered via CSS targeting */}
            </div>
          </DayCard>
          
          {/* Today Card - Contains the actual NodeViewContent */}
          <DayCard label="Today" isToday={true}>
            <NodeViewContent />
          </DayCard>
          
          {/* Tomorrow Card */}
          <DayCard label="Tomorrow" isToday={false}>
            <div data-day-slot="tomorrow" style={{ minHeight: '100px' }}>
              {/* Content rendered via CSS targeting */}
            </div>
          </DayCard>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Daily TipTap Extension - Simple block container
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    daily: {
      insertDaily: () => ReturnType
    }
  }
}

export const DailyExtension = TipTapNode.create({
  name: "daily",
  group: "block",
  content: "block+",
  inline: false,
  selectable: true,
  draggable: true,
  
  parseHTML() {
    return [{ tag: 'div[data-type="daily"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'daily' }, 0]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(DailyNodeView)
  },
  
  addCommands() {
    return {
      insertDaily: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'daily',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Today\'s notes and tasks...' }] }
            ]
          })
          .run()
      },
    }
  },
  
  addInputRules() {
    return [
      {
        find: /^\/daily\s$/,
        handler: ({ state, range, chain }) => {
          const { tr } = state
          tr.delete(range.from, range.to)
          // @ts-ignore
          chain().insertDaily().run()
        },
      },
    ]
  },
})

// Export placeholder child extensions for backwards compatibility
export const DailyYesterday = TipTapNode.create({ name: "dailyYesterday", group: "block", content: "block+" })
export const DailyToday = TipTapNode.create({ name: "dailyToday", group: "block", content: "block+" })
export const DailyTomorrow = TipTapNode.create({ name: "dailyTomorrow", group: "block", content: "block+" })

export default DailyExtension
