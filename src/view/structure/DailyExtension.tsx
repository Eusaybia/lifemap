"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"

// ============================================================================
// Date Helpers
// ============================================================================

const formatDateSlug = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getYesterdayDate = (): Date => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date
}

const getTomorrowDate = (): Date => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date
}

const TEMPLATE_QUANTA_SLUG = 'daily-schedule-template'
const NEW_DAILY_SCHEDULES_KEY = 'newDailySchedules' // Now stores an array of slugs
const INITIALIZED_DAYS_KEY = 'initializedDailySchedules'

// Set flag for today's and tomorrow's schedules - RichText.tsx will apply template if empty
// Uses localStorage because sessionStorage is NOT shared between iframes and parent
// This function is called synchronously to ensure flag is set before iframes load
// IMPORTANT: Only sets the flag ONCE per day - not on every page refresh
const checkAndInitializeDaily = () => {
  const today = formatDateSlug(new Date())
  const tomorrow = formatDateSlug(getTomorrowDate())
  const todaySlug = `daily-${today}`
  const tomorrowSlug = `daily-${tomorrow}`
  
  // Check if we've already initialized these days
  const initializedDaysStr = localStorage.getItem(INITIALIZED_DAYS_KEY)
  const initializedDays: string[] = initializedDaysStr ? JSON.parse(initializedDaysStr) : []
  
  // Get current pending schedules
  const pendingStr = localStorage.getItem(NEW_DAILY_SCHEDULES_KEY)
  const pendingSchedules: string[] = pendingStr ? JSON.parse(pendingStr) : []
  
  // Check and add today if not already initialized
  if (!initializedDays.includes(todaySlug) && !pendingSchedules.includes(todaySlug)) {
    pendingSchedules.push(todaySlug)
    initializedDays.push(todaySlug)
    console.log(`[DailyExtension] Flagged ${todaySlug} for template initialization`)
  }
  
  // Check and add tomorrow if not already initialized
  if (!initializedDays.includes(tomorrowSlug) && !pendingSchedules.includes(tomorrowSlug)) {
    pendingSchedules.push(tomorrowSlug)
    initializedDays.push(tomorrowSlug)
    console.log(`[DailyExtension] Flagged ${tomorrowSlug} for template initialization`)
  }
  
  // Save pending schedules
  if (pendingSchedules.length > 0) {
    localStorage.setItem(NEW_DAILY_SCHEDULES_KEY, JSON.stringify(pendingSchedules))
  }
  
  // Keep last 30 days to avoid unbounded growth
  while (initializedDays.length > 30) {
    initializedDays.shift() // Remove oldest
  }
  localStorage.setItem(INITIALIZED_DAYS_KEY, JSON.stringify(initializedDays))
}

// Call immediately when module loads to ensure flag is set before iframes render
if (typeof window !== 'undefined') {
  checkAndInitializeDaily()
}

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
  slug: string
  children: React.ReactNode
}

const DayCard: React.FC<DayCardProps> = ({ label, isToday, slug, children }) => {
  const isTemplate = label === 'Template'
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isToday ? 1 : 0.7, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        flex: '0 0 550px',
        width: '550px',
        minHeight: '900px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isToday ? '#FFFEF5' : '#FFFFFF',
        borderRadius: '12px',
        border: isToday ? '2px solid #E5E0C8' : '1px solid #E5E5E5',
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
        /q/{slug}
      </div>
      
      {/* Day Label Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        marginBottom: '0px',
        padding: '16px 16px 12px 16px',
      }}>
        <h2 style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: '26px',
          fontWeight: 500,
          color: (isToday || isTemplate) ? '#000000' : '#6b7280',
          textAlign: 'left',
          margin: 0,
        }}>
          {isTemplate ? 'Daily Schedule Template' : label}
        </h2>
      </div>
      
      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </motion.div>
  )
}


// ============================================================================
// Daily Carousel Node View - Horizontal carousel with 3 cards
// ============================================================================

const TOTAL_CARDS = 4 // Template, Yesterday, Today, Tomorrow
const TODAY_INDEX = 2 // Today is at index 2 (0: Template, 1: Yesterday, 2: Today, 3: Tomorrow)

const DailyNodeView: React.FC<NodeViewProps> = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(TODAY_INDEX) // Start at "Today"
  
  // Calculate date slugs for each pane
  const todaySlug = `daily-${formatDateSlug(new Date())}`
  const yesterdaySlug = `daily-${formatDateSlug(getYesterdayDate())}`
  const tomorrowSlug = `daily-${formatDateSlug(getTomorrowDate())}`
  
  // Check and initialize daily on mount
  useEffect(() => {
    checkAndInitializeDaily()
  }, [])
  
  // Scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 550 + 12
      const scrollPosition = (TODAY_INDEX * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2)
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
    scrollToCard(Math.min(TOTAL_CARDS - 1, activeIndex + 1))
  }, [activeIndex, scrollToCard])
  
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 550 + 12
      const scrollCenter = container.scrollLeft + (container.clientWidth / 2)
      const newIndex = Math.round((scrollCenter - cardWidth / 2) / cardWidth)
      const clampedIndex = Math.max(0, Math.min(TOTAL_CARDS - 1, newIndex))
      if (clampedIndex !== activeIndex) {
        setActiveIndex(clampedIndex)
      }
    }
  }, [activeIndex])

  return (
    <NodeViewWrapper 
      data-daily-node-view="true"
      style={{ margin: '0', overflow: 'visible', position: 'relative', zIndex: 50 }}
    >
      <div style={{ position: 'relative', overflow: 'visible', zIndex: 50 }}>
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
          disabled={activeIndex === TOTAL_CARDS - 1}
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
            cursor: activeIndex === TOTAL_CARDS - 1 ? 'not-allowed' : 'pointer',
            opacity: activeIndex === TOTAL_CARDS - 1 ? 0.4 : 1,
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
            overflowY: 'visible',
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
          
          {/* Template Card */}
          <DayCard label="Template" isToday={false} slug={TEMPLATE_QUANTA_SLUG}>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <iframe
                src={`/q/${TEMPLATE_QUANTA_SLUG}?mode=graph`}
                title="Daily Schedule Template"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </DayCard>
          
          {/* Yesterday Card - loads yesterday's date-based quanta */}
          <DayCard label="Yesterday" isToday={false} slug={yesterdaySlug}>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <iframe
                src={`/q/${yesterdaySlug}?mode=graph`}
                title="Yesterday's Schedule"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </DayCard>
          
          {/* Today Card - loads today's date-based quanta */}
          <DayCard label="Today" isToday={true} slug={todaySlug}>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <iframe
                src={`/q/${todaySlug}?mode=graph`}
                title="Today's Schedule"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </DayCard>
          
          {/* Tomorrow Card - loads tomorrow's date-based quanta */}
          <DayCard label="Tomorrow" isToday={false} slug={tomorrowSlug}>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <iframe
                src={`/q/${tomorrowSlug}?mode=graph`}
                title="Tomorrow's Schedule"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
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
  atom: true, // No internal content - all content is in iframes
  inline: false,
  selectable: true,
  draggable: true,
  
  parseHTML() {
    return [{ tag: 'div[data-type="daily"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'daily' }]
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

// Export placeholder child extensions for backwards compatibility (kept for existing documents)
export const DailyYesterday = TipTapNode.create({ name: "dailyYesterday", group: "block", content: "block+" })
export const DailyToday = TipTapNode.create({ name: "dailyToday", group: "block", content: "block+" })
export const DailyTomorrow = TipTapNode.create({ name: "dailyTomorrow", group: "block", content: "block+" })

export default DailyExtension
