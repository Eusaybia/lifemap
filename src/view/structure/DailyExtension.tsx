"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
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
// Date Helpers
// ============================================================================

const formatDateSlug = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `daily-${year}-${month}-${day}`
}

const formatDateLabel = (date: Date): string => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  
  const diffDays = Math.round((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  if (diffDays === 2) return "Day after tomorrow"
  if (diffDays === -2) return "Day before yesterday"
  if (diffDays > 2) return `In ${diffDays} days`
  if (diffDays < -2) return `${Math.abs(diffDays)} days ago`
  
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const formatFullDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  })
}

interface DayInfo {
  date: Date
  slug: string
  label: string
  fullDate: string
  isToday: boolean
  daysFromToday: number
}

const generateDays = (centerDate: Date, range: number = 2): DayInfo[] => {
  const days: DayInfo[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = -range; i <= range; i++) {
    const date = new Date(centerDate)
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)
    
    const compareDate = new Date(date)
    const daysFromToday = Math.round((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    days.push({
      date,
      slug: formatDateSlug(date),
      label: formatDateLabel(date),
      fullDate: formatFullDate(date),
      isToday: compareDate.getTime() === today.getTime(),
      daysFromToday: Math.abs(daysFromToday),
    })
  }
  
  return days
}

// ============================================================================
// Day Quanta Card - Embeds a quanta via iframe
// ============================================================================

interface DayQuantaCardProps {
  day: DayInfo
  isActive: boolean
  iframeHeight: number
  onHeightChange: (slug: string, height: number) => void
}

const DayQuantaCard: React.FC<DayQuantaCardProps> = ({ day, isActive, iframeHeight, onHeightChange }) => {
  // Today card is wider and taller
  const cardWidth = day.isToday ? 500 : 400
  const cardHeight = day.isToday ? 850 : 500
  
  // Calculate opacity based on distance from today
  // Today = 1, 1 day out = 0.6, 2 days out = 0.35
  const getOpacity = () => {
    if (day.daysFromToday === 0) return 1
    if (day.daysFromToday === 1) return 0.6
    return 0.35
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: getOpacity(), 
        scale: 1,
      }}
      transition={{ duration: 0.3 }}
      style={{
        flex: '0 0 auto',
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: day.isToday ? '#FFFEF5' : '#FFFFFF',
        borderRadius: '12px',
        border: day.isToday ? '2px solid #E5E0C8' : '1px solid #E5E5E5',
        scrollSnapAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Day Header */}
      <div style={{ 
        padding: '16px 20px',
        backgroundColor: 'transparent',
        flexShrink: 0,
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: '#1a1a1a',
            margin: 0,
          }}>
            {day.label}
          </h3>
        </div>
      </div>
      
      {/* Quanta iframe */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <iframe
          src={`/q/${day.slug}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
          title={`Daily note for ${day.label}`}
        />
      </div>
    </motion.div>
  )
}

// ============================================================================
// Daily Carousel Component (NodeView)
// ============================================================================

const DailyNodeView: React.FC<NodeViewProps> = (props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [centerDate] = useState(() => new Date())
  const [activeIndex, setActiveIndex] = useState(2) // Start at "Today" (middle of 5)
  const [iframeHeights, setIframeHeights] = useState<Record<string, number>>({})
  
  const days = generateDays(centerDate, 2) // 2 days before and after today = 5 total
  
  // Listen for iframe resize messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'resize-iframe' && event.data.noteId) {
        setIframeHeights(prev => ({
          ...prev,
          [event.data.noteId]: event.data.height
        }))
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  // Scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 400 + 16 // card width + gap
      const scrollPosition = (activeIndex * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2)
      setTimeout(() => {
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' })
      }, 100)
    }
  }, [])
  
  const scrollToCard = useCallback((index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 400 + 16
      const scrollPosition = (index * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2)
      container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' })
      setActiveIndex(index)
    }
  }, [])
  
  const navigatePrevious = useCallback(() => {
    const newIndex = Math.max(0, activeIndex - 1)
    scrollToCard(newIndex)
  }, [activeIndex, scrollToCard])
  
  const navigateNext = useCallback(() => {
    const newIndex = Math.min(days.length - 1, activeIndex + 1)
    scrollToCard(newIndex)
  }, [activeIndex, days.length, scrollToCard])
  
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 400 + 16
      const scrollCenter = container.scrollLeft + (container.clientWidth / 2)
      const newIndex = Math.round((scrollCenter - cardWidth / 2) / cardWidth)
      const clampedIndex = Math.max(0, Math.min(days.length - 1, newIndex))
      if (clampedIndex !== activeIndex) {
        setActiveIndex(clampedIndex)
      }
    }
  }, [activeIndex, days.length])
  
  const handleHeightChange = useCallback((slug: string, height: number) => {
    setIframeHeights(prev => ({ ...prev, [slug]: height }))
  }, [])

  return (
    <NodeViewWrapper 
      data-daily-node-view="true"
      style={{ margin: '20px 0' }}
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
          disabled={activeIndex === days.length - 1}
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
            cursor: activeIndex === days.length - 1 ? 'not-allowed' : 'pointer',
            opacity: activeIndex === days.length - 1 ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} color="#666" />
        </button>
        
        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            padding: '20px 50px',
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
          {days.map((day, index) => (
            <DayQuantaCard
              key={day.slug}
              day={day}
              isActive={index === activeIndex}
              iframeHeight={iframeHeights[day.slug] || (day.isToday ? 800 : 400)}
              onHeightChange={handleHeightChange}
            />
          ))}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Daily TipTap Extension
// ============================================================================

export const DailyExtension = TipTapNode.create({
  name: "daily",
  group: "block",
  content: "block*",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true, // Treat as atomic since content is in iframes
  
  addAttributes() {
    return {
      centerDate: {
        default: new Date().toISOString(),
      },
      range: {
        default: 2, // Days before and after
      },
    }
  },
  
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
            attrs: {
              centerDate: new Date().toISOString(),
              range: 2,
            },
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

export default DailyExtension
