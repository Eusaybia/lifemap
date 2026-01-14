"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"

// ============================================================================
// Week Helpers (ISO Week Format)
// ============================================================================

// Get ISO week number for a date
const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Get the ISO week year (which may differ from calendar year at year boundaries)
const getISOWeekYear = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}

// Format week slug: weekly-YYYY-WNN
const formatWeekSlug = (date: Date): string => {
  const year = getISOWeekYear(date)
  const week = String(getISOWeekNumber(date)).padStart(2, '0')
  return `${year}-W${week}`
}

// Get Monday of the given week
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Get date for last week's Monday
const getLastWeekDate = (): Date => {
  const today = new Date()
  const monday = getMondayOfWeek(today)
  monday.setDate(monday.getDate() - 7)
  return monday
}

// Get date for next week's Monday
const getNextWeekDate = (): Date => {
  const today = new Date()
  const monday = getMondayOfWeek(today)
  monday.setDate(monday.getDate() + 7)
  return monday
}

// Format date range for display: "Jan 6 - Jan 12"
const formatWeekDateRange = (date: Date): string => {
  const monday = getMondayOfWeek(date)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  const startMonth = monthNames[monday.getMonth()]
  const endMonth = monthNames[sunday.getMonth()]
  
  if (startMonth === endMonth) {
    return `${startMonth} ${monday.getDate()} - ${sunday.getDate()}`
  }
  return `${startMonth} ${monday.getDate()} - ${endMonth} ${sunday.getDate()}`
}

const TEMPLATE_QUANTA_SLUG = 'weekly-schedule-template'
const NEW_WEEKLY_SCHEDULES_KEY = 'newWeeklySchedules'
const INITIALIZED_WEEKS_KEY = 'initializedWeeklySchedules'

// Reset a quanta by deleting its IndexedDB and marking it for template re-application
const resetQuantaToTemplate = async (quantaSlug: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const deleteRequest = indexedDB.deleteDatabase(quantaSlug)
      
      deleteRequest.onsuccess = () => {
        console.log(`[WeeklyExtension] Deleted IndexedDB for ${quantaSlug}`)
        
        const pendingStr = localStorage.getItem(NEW_WEEKLY_SCHEDULES_KEY)
        const pendingSchedules: string[] = pendingStr ? JSON.parse(pendingStr) : []
        
        if (!pendingSchedules.includes(quantaSlug)) {
          pendingSchedules.push(quantaSlug)
          localStorage.setItem(NEW_WEEKLY_SCHEDULES_KEY, JSON.stringify(pendingSchedules))
        }
        
        const initializedStr = localStorage.getItem(INITIALIZED_WEEKS_KEY)
        const initializedWeeks: string[] = initializedStr ? JSON.parse(initializedStr) : []
        const updatedInitialized = initializedWeeks.filter(w => w !== quantaSlug)
        localStorage.setItem(INITIALIZED_WEEKS_KEY, JSON.stringify(updatedInitialized))
        
        console.log(`[WeeklyExtension] Marked ${quantaSlug} for template re-application`)
        resolve(true)
      }
      
      deleteRequest.onerror = () => {
        console.error(`[WeeklyExtension] Failed to delete IndexedDB for ${quantaSlug}`)
        resolve(false)
      }
      
      deleteRequest.onblocked = () => {
        console.warn(`[WeeklyExtension] IndexedDB delete blocked for ${quantaSlug}`)
        resolve(false)
      }
    } catch (error) {
      console.error(`[WeeklyExtension] Error resetting quanta:`, error)
      resolve(false)
    }
  })
}

// Initialize weekly schedules for this week and next week
const checkAndInitializeWeekly = () => {
  const thisWeekSlug = `weekly-${formatWeekSlug(new Date())}`
  const nextWeekSlug = `weekly-${formatWeekSlug(getNextWeekDate())}`
  
  const initializedWeeksStr = localStorage.getItem(INITIALIZED_WEEKS_KEY)
  const initializedWeeks: string[] = initializedWeeksStr ? JSON.parse(initializedWeeksStr) : []
  
  const pendingStr = localStorage.getItem(NEW_WEEKLY_SCHEDULES_KEY)
  const pendingSchedules: string[] = pendingStr ? JSON.parse(pendingStr) : []
  
  if (!initializedWeeks.includes(thisWeekSlug) && !pendingSchedules.includes(thisWeekSlug)) {
    pendingSchedules.push(thisWeekSlug)
    initializedWeeks.push(thisWeekSlug)
    console.log(`[WeeklyExtension] Flagged ${thisWeekSlug} for template initialization`)
  }
  
  if (!initializedWeeks.includes(nextWeekSlug) && !pendingSchedules.includes(nextWeekSlug)) {
    pendingSchedules.push(nextWeekSlug)
    initializedWeeks.push(nextWeekSlug)
    console.log(`[WeeklyExtension] Flagged ${nextWeekSlug} for template initialization`)
  }
  
  if (pendingSchedules.length > 0) {
    localStorage.setItem(NEW_WEEKLY_SCHEDULES_KEY, JSON.stringify(pendingSchedules))
  }
  
  // Keep last 12 weeks to avoid unbounded growth
  while (initializedWeeks.length > 12) {
    initializedWeeks.shift()
  }
  localStorage.setItem(INITIALIZED_WEEKS_KEY, JSON.stringify(initializedWeeks))
}

// Call immediately when module loads
if (typeof window !== 'undefined') {
  checkAndInitializeWeekly()
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
// Week Card Component - Individual card in the carousel
// ============================================================================

interface WeekCardProps {
  label: string
  dateRange?: string
  isThisWeek: boolean
  slug: string
  children: React.ReactNode
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
}

const WeekCard: React.FC<WeekCardProps> = ({ label, dateRange, isThisWeek, slug, children, iframeRef }) => {
  const isTemplate = label === 'Template'
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const handleRefresh = async () => {
    if (isRefreshing || isTemplate) return
    setIsRefreshing(true)
    
    try {
      const success = await resetQuantaToTemplate(slug)
      if (success) {
        await new Promise(resolve => setTimeout(resolve, 300))
        if (iframeRef?.current) {
          iframeRef.current.src = iframeRef.current.src
        }
      }
    } catch (error) {
      console.error('[WeekCard] Error refreshing:', error)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isThisWeek ? 1 : 0.7, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        flex: '0 0 550px',
        width: '550px',
        minHeight: '900px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isThisWeek ? '#F5FAFF' : '#FFFFFF',
        borderRadius: '12px',
        border: isThisWeek ? '2px solid #C8DEF0' : '1px solid #E5E5E5',
        scrollSnapAlign: 'center',
        overflow: 'visible',
        padding: '0px',
        position: 'relative',
        zIndex: 100,
      }}
    >
      {/* Route Strip with Refresh Button */}
      <div style={{
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e5e5e5',
        borderRadius: '12px 12px 0 0',
        padding: '4px 16px',
        fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
        fontSize: '11px',
        color: '#888',
        letterSpacing: '0.3px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>/q/{slug}</span>
        {!isTemplate && (
          <motion.button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '2px 8px',
              cursor: isRefreshing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              color: '#666',
              opacity: isRefreshing ? 0.6 : 1,
            }}
            whileHover={{ backgroundColor: '#e5e5e5' }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              style={{ display: 'inline-block' }}
            >
              🔄
            </motion.span>
            {isRefreshing ? 'Resetting...' : 'Reset'}
          </motion.button>
        )}
      </div>
      
      {/* Week Label Header */}
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
          color: (isThisWeek || isTemplate) ? '#000000' : '#6b7280',
          textAlign: 'left',
          margin: 0,
        }}>
          {isTemplate ? 'Weekly Schedule Template' : label}
        </h2>
        {dateRange && !isTemplate && (
          <span style={{
            fontSize: '14px',
            color: '#888',
            fontFamily: "'Inter', sans-serif",
          }}>
            ({dateRange})
          </span>
        )}
      </div>
      
      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </motion.div>
  )
}


// ============================================================================
// Weekly Carousel Node View - Horizontal carousel with 4 cards
// ============================================================================

const TOTAL_CARDS = 4 // Template, Last Week, This Week, Next Week
const THIS_WEEK_INDEX = 2 // This Week is at index 2

const WeeklyNodeView: React.FC<NodeViewProps> = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(THIS_WEEK_INDEX)
  
  // Iframe refs for refreshing
  const lastWeekIframeRef = useRef<HTMLIFrameElement>(null)
  const thisWeekIframeRef = useRef<HTMLIFrameElement>(null)
  const nextWeekIframeRef = useRef<HTMLIFrameElement>(null)
  
  // Calculate week slugs for each pane
  const thisWeekSlug = `weekly-${formatWeekSlug(new Date())}`
  const lastWeekSlug = `weekly-${formatWeekSlug(getLastWeekDate())}`
  const nextWeekSlug = `weekly-${formatWeekSlug(getNextWeekDate())}`
  
  // Date ranges for display
  const thisWeekRange = formatWeekDateRange(new Date())
  const lastWeekRange = formatWeekDateRange(getLastWeekDate())
  const nextWeekRange = formatWeekDateRange(getNextWeekDate())
  
  // Check and initialize weekly on mount
  useEffect(() => {
    checkAndInitializeWeekly()
  }, [])
  
  // Scroll to this week on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = 550 + 12
      const scrollPosition = (THIS_WEEK_INDEX * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2)
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
      data-weekly-node-view="true"
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
          className="weekly-carousel-scroll"
        >
          <style>{`
            .weekly-carousel-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {/* Template Card */}
          <WeekCard label="Template" isThisWeek={false} slug={TEMPLATE_QUANTA_SLUG}>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <iframe
                src={`/q/${TEMPLATE_QUANTA_SLUG}?mode=graph`}
                title="Weekly Schedule Template"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </WeekCard>
          
          {/* Last Week Card */}
          <WeekCard label="Last Week" dateRange={lastWeekRange} isThisWeek={false} slug={lastWeekSlug} iframeRef={lastWeekIframeRef}>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <iframe
                ref={lastWeekIframeRef}
                src={`/q/${lastWeekSlug}?mode=graph`}
                title="Last Week's Schedule"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </WeekCard>
          
          {/* This Week Card */}
          <WeekCard label="This Week" dateRange={thisWeekRange} isThisWeek={true} slug={thisWeekSlug} iframeRef={thisWeekIframeRef}>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <iframe
                ref={thisWeekIframeRef}
                src={`/q/${thisWeekSlug}?mode=graph`}
                title="This Week's Schedule"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </WeekCard>
          
          {/* Next Week Card */}
          <WeekCard label="Next Week" dateRange={nextWeekRange} isThisWeek={false} slug={nextWeekSlug} iframeRef={nextWeekIframeRef}>
            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
              <iframe
                ref={nextWeekIframeRef}
                src={`/q/${nextWeekSlug}?mode=graph`}
                title="Next Week's Schedule"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </WeekCard>
        </div>
      </div>
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

