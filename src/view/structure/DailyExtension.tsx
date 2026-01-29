"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"
import { NodeOverlay } from "../components/NodeOverlay"

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

// Reset a quanta by deleting its IndexedDB and marking it for template re-application
const resetQuantaToTemplate = async (quantaSlug: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Delete the IndexedDB for this quanta
      const deleteRequest = indexedDB.deleteDatabase(quantaSlug)
      
      deleteRequest.onsuccess = () => {
        console.log(`[DailyExtension] Deleted IndexedDB for ${quantaSlug}`)
        
        // Mark this quanta for template initialization
        const pendingStr = localStorage.getItem(NEW_DAILY_SCHEDULES_KEY)
        const pendingSchedules: string[] = pendingStr ? JSON.parse(pendingStr) : []
        
        if (!pendingSchedules.includes(quantaSlug)) {
          pendingSchedules.push(quantaSlug)
          localStorage.setItem(NEW_DAILY_SCHEDULES_KEY, JSON.stringify(pendingSchedules))
        }
        
        // Also remove from initialized list so it gets re-initialized
        const initializedStr = localStorage.getItem(INITIALIZED_DAYS_KEY)
        const initializedDays: string[] = initializedStr ? JSON.parse(initializedStr) : []
        const updatedInitialized = initializedDays.filter(d => d !== quantaSlug)
        localStorage.setItem(INITIALIZED_DAYS_KEY, JSON.stringify(updatedInitialized))
        
        console.log(`[DailyExtension] Marked ${quantaSlug} for template re-application`)
        resolve(true)
      }
      
      deleteRequest.onerror = () => {
        console.error(`[DailyExtension] Failed to delete IndexedDB for ${quantaSlug}`)
        resolve(false)
      }
      
      deleteRequest.onblocked = () => {
        console.warn(`[DailyExtension] IndexedDB delete blocked for ${quantaSlug}`)
        resolve(false)
      }
    } catch (error) {
      console.error(`[DailyExtension] Error resetting quanta:`, error)
      resolve(false)
    }
  })
}

// Set flag for today's schedule - RichText.tsx will apply template if empty
// Uses localStorage because sessionStorage is NOT shared between iframes and parent
// This function is called synchronously to ensure flag is set before iframes load
// IMPORTANT: Only sets the flag ONCE per day - not on every page refresh
// NOTE: Tomorrow uses click-to-load pattern to avoid y-indexeddb contention on initial load
const checkAndInitializeDaily = () => {
  const today = formatDateSlug(new Date())
  const todaySlug = `daily-${today}`
  
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
  
  // Tomorrow initialization disabled - causes y-indexeddb contention and 50+ second blocks
  // when multiple iframes compete for IndexedDB access simultaneously
  
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

// ============================================================================
// Lazy Iframe Component - Only loads when visible in viewport
// ============================================================================

interface LazyIframeProps {
  src: string
  title: string
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
  eager?: boolean // If true, load immediately without waiting for visibility
}

const LazyIframe: React.FC<LazyIframeProps> = ({ src, title, iframeRef, eager = false }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(eager)
  const [hasLoaded, setHasLoaded] = useState(eager)

  useEffect(() => {
    // If eager, skip intersection observer
    if (eager) {
      setIsVisible(true)
      setHasLoaded(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded) {
            console.log(`[LazyIframe] Loading: ${title}`)
            setIsVisible(true)
            setHasLoaded(true)
            // Once loaded, we don't need to observe anymore
            observer.disconnect()
          }
        })
      },
      {
        // Load when iframe is within 200px of viewport (preload slightly before visible)
        rootMargin: '200px',
        threshold: 0,
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [eager, hasLoaded, title])

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', height: '100%' }}>
      {isVisible ? (
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
        />
      ) : (
        // Placeholder while not yet visible
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9f9f9',
          color: '#999',
          fontSize: '14px',
        }}>
          Scroll to load...
        </div>
      )}
    </div>
  )
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
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
}

const DayCard: React.FC<DayCardProps> = ({ label, isToday, slug, children, iframeRef }) => {
  const isTemplate = label === 'Template'
  const isYesterday = label === 'Yesterday'
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const handleRefresh = async () => {
    if (isRefreshing || isTemplate) return
    setIsRefreshing(true)
    
    try {
      const success = await resetQuantaToTemplate(slug)
      if (success) {
        // Small delay to ensure IndexedDB is fully cleared
        await new Promise(resolve => setTimeout(resolve, 300))
        // Reload the iframe to show the new content (will apply template)
        if (iframeRef?.current) {
          iframeRef.current.src = iframeRef.current.src
        }
      }
    } catch (error) {
      console.error('[DayCard] Error refreshing:', error)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  // Yesterday is dimmer (0.45), other non-today cards are 0.7, today is fully opaque
  const cardOpacity = isToday ? 1 : isYesterday ? 0.45 : 0.7
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: cardOpacity, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="daily-card"
      style={{
        // Base styles - responsive width handled by CSS class
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
        <a 
          href={`/q/${slug}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            color: '#888', 
            textDecoration: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#555'; e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.textDecoration = 'none'; }}
        >
          /q/{slug}
        </a>
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

// Stagger delays for sequential loading to avoid y-indexeddb contention
// Today loads immediately, then Yesterday after YESTERDAY_DELAY, then Template after TEMPLATE_DELAY
const YESTERDAY_LOAD_DELAY = 1500 // 1.5 seconds after mount
const TEMPLATE_LOAD_DELAY = 3000 // 3 seconds after mount

const DailyNodeView: React.FC<NodeViewProps> = (props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(TODAY_INDEX) // Start at "Today"
  
  // Iframe refs for refreshing
  const yesterdayIframeRef = useRef<HTMLIFrameElement>(null)
  const todayIframeRef = useRef<HTMLIFrameElement>(null)
  const tomorrowIframeRef = useRef<HTMLIFrameElement>(null)
  
  // Track if Tomorrow has been instantiated (click-to-load to avoid y-indexeddb contention)
  const [tomorrowInstantiated, setTomorrowInstantiated] = useState(false)
  
  // Staggered loading state - Today is always ready, others wait their turn
  // This prevents y-indexeddb contention by loading iframes one at a time
  const [yesterdayReady, setYesterdayReady] = useState(false)
  const [templateReady, setTemplateReady] = useState(false)
  
  // Track if initial scroll to Today has completed - prevents staggered loading from
  // triggering unwanted scroll position changes
  const initialScrollDoneRef = useRef(false)
  
  // Calculate date slugs for each pane
  const todaySlug = `daily-${formatDateSlug(new Date())}`
  const yesterdaySlug = `daily-${formatDateSlug(getYesterdayDate())}`
  const tomorrowSlug = `daily-${formatDateSlug(getTomorrowDate())}`
  
  // Check and initialize daily on mount
  useEffect(() => {
    checkAndInitializeDaily()
  }, [])
  
  // Staggered loading: Today → Yesterday → Template
  // This prevents all iframes from competing for IndexedDB simultaneously
  useEffect(() => {
    // Yesterday loads after YESTERDAY_LOAD_DELAY
    const yesterdayTimer = setTimeout(() => {
      console.log('[DailyExtension] Staggered load: Yesterday ready')
      setYesterdayReady(true)
    }, YESTERDAY_LOAD_DELAY)
    
    // Template loads after TEMPLATE_LOAD_DELAY
    const templateTimer = setTimeout(() => {
      console.log('[DailyExtension] Staggered load: Template ready')
      setTemplateReady(true)
    }, TEMPLATE_LOAD_DELAY)
    
    return () => {
      clearTimeout(yesterdayTimer)
      clearTimeout(templateTimer)
    }
  }, [])
  
  // Helper to get responsive card width + gap based on viewport
  // Matches the CSS breakpoints: mobile (<=768px), tablet (769-1024px), desktop (>1024px)
  const getCardWidthWithGap = useCallback(() => {
    if (typeof window === 'undefined') return 562 // Default desktop: 550 + 12 gap
    const width = window.innerWidth
    if (width <= 768) {
      // Mobile: 100vw, no gap
      return width
    } else if (width <= 1024) {
      // Tablet: 480px + 12 gap
      return 492
    }
    // Desktop: 550px + 12 gap
    return 562
  }, [])
  
  // Scroll to today on mount - runs only once with multiple attempts to ensure it works
  // Uses empty dependency array to prevent re-running when staggered loading causes re-renders
  useEffect(() => {
    const scrollToTodayPosition = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const cardWidth = getCardWidthWithGap()
        const scrollPosition = (TODAY_INDEX * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2)
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' })
        setActiveIndex(TODAY_INDEX)
      }
    }
    
    // Multiple attempts to ensure scrolling works after layout is complete
    const attempts = [0, 100, 300, 500]
    const timeoutIds = attempts.map(delay => 
      setTimeout(scrollToTodayPosition, delay)
    )
    
    // Mark initial scroll as done after the last attempt
    const doneTimeout = setTimeout(() => {
      initialScrollDoneRef.current = true
    }, 600) // After last scroll attempt (500ms) + buffer
    
    return () => {
      timeoutIds.forEach(id => clearTimeout(id))
      clearTimeout(doneTimeout)
    }
  }, []) // Empty deps - only run on mount
  
  const scrollToCard = useCallback((index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = getCardWidthWithGap()
      const scrollPosition = (index * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2)
      container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' })
      setActiveIndex(index)
    }
  }, [getCardWidthWithGap])
  
  const navigatePrevious = useCallback(() => {
    scrollToCard(Math.max(0, activeIndex - 1))
  }, [activeIndex, scrollToCard])
  
  const navigateNext = useCallback(() => {
    scrollToCard(Math.min(TOTAL_CARDS - 1, activeIndex + 1))
  }, [activeIndex, scrollToCard])
  
  const handleScroll = useCallback(() => {
    // Ignore scroll events during initial loading period to prevent staggered
    // iframe loading from accidentally changing the active card
    if (!initialScrollDoneRef.current) {
      return
    }
    
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const cardWidth = getCardWidthWithGap()
      const scrollCenter = container.scrollLeft + (container.clientWidth / 2)
      const newIndex = Math.round((scrollCenter - cardWidth / 2) / cardWidth)
      const clampedIndex = Math.max(0, Math.min(TOTAL_CARDS - 1, newIndex))
      if (clampedIndex !== activeIndex) {
        setActiveIndex(clampedIndex)
      }
    }
  }, [activeIndex, getCardWidthWithGap])

  return (
    <NodeViewWrapper 
      data-daily-node-view="true"
      style={{ margin: '0', overflow: 'visible', position: 'relative', zIndex: 50 }}
    >
      {/* NodeOverlay provides the grip, connection ID, and standard card styling */}
      {/* padding={0} and margin: 0 for mobile responsiveness - cards handle their own spacing */}
      <NodeOverlay 
        nodeProps={props} 
        nodeType="daily"
        gripTop={8}
        gripRight={8}
        padding={0}
        style={{ margin: 0 }}
      >
        <div style={{ position: 'relative', overflow: 'visible', zIndex: 50 }}>
          {/* Navigation Arrows - hidden on mobile via CSS */}
          <button
            onClick={navigatePrevious}
            disabled={activeIndex === 0}
            className="daily-nav-arrow"
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
            className="daily-nav-arrow"
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
          className="daily-carousel-scroll"
          style={{
            display: 'flex',
            flexDirection: 'row',
            overflowX: 'auto',
            overflowY: 'visible',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Responsive styles for mobile vs desktop */}
          <style>{`
            .daily-carousel-scroll::-webkit-scrollbar {
              display: none;
            }
            
            /* Desktop styles - fixed width cards with gap and padding */
            .daily-carousel-scroll {
              gap: 12px;
              padding: 8px 50px;
            }
            
            .daily-card {
              flex: 0 0 550px;
              width: 550px;
            }
            
            /* Mobile styles - full width cards, minimal padding */
            @media (max-width: 768px) {
              .daily-carousel-scroll {
                gap: 0px;
                padding: 8px 0px;
              }
              
              .daily-card {
                flex: 0 0 100vw;
                width: 100vw;
                border-radius: 0px;
                border-left: none;
                border-right: none;
              }
              
              /* Hide navigation arrows on mobile - use swipe instead */
              .daily-nav-arrow {
                display: none !important;
              }
            }
            
            /* Tablet styles - slightly smaller cards */
            @media (min-width: 769px) and (max-width: 1024px) {
              .daily-card {
                flex: 0 0 480px;
                width: 480px;
              }
              
              .daily-carousel-scroll {
                padding: 8px 30px;
              }
            }
          `}</style>
          
          {/* Template Card - staggered load: loads TEMPLATE_LOAD_DELAY after mount */}
          <DayCard label="Template" isToday={false} slug={TEMPLATE_QUANTA_SLUG}>
            {templateReady ? (
              <LazyIframe
                src={`/q/${TEMPLATE_QUANTA_SLUG}?mode=graph`}
                title="Daily Schedule Template"
                eager={true}
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
              }}>
                Loading template...
              </div>
            )}
          </DayCard>
          
          {/* Yesterday Card - staggered load: loads YESTERDAY_LOAD_DELAY after mount */}
          <DayCard label="Yesterday" isToday={false} slug={yesterdaySlug} iframeRef={yesterdayIframeRef}>
            {yesterdayReady ? (
              <LazyIframe
                src={`/q/${yesterdaySlug}?mode=graph`}
                title="Yesterday's Schedule"
                iframeRef={yesterdayIframeRef}
                eager={true}
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
              }}>
                Loading yesterday...
              </div>
            )}
          </DayCard>
          
          {/* Today Card - EAGER loaded (this is the default view) */}
          <DayCard label="Today" isToday={true} slug={todaySlug} iframeRef={todayIframeRef}>
            <LazyIframe
              src={`/q/${todaySlug}?mode=graph`}
              title="Today's Schedule"
              iframeRef={todayIframeRef}
              eager={true}
            />
          </DayCard>
          
          {/* Tomorrow Card - Click to instantiate (prevents y-indexeddb contention on page load) */}
          <DayCard label="Tomorrow" isToday={false} slug={tomorrowSlug} iframeRef={tomorrowIframeRef}>
            {tomorrowInstantiated ? (
              <LazyIframe
                src={`/q/${tomorrowSlug}?mode=graph`}
                title="Tomorrow's Schedule"
                iframeRef={tomorrowIframeRef}
                eager={true}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '400px',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                margin: '16px',
                gap: '16px',
              }}>
                <motion.button
                  onClick={() => {
                    // Flag tomorrow for template initialization before loading
                    const pendingStr = localStorage.getItem(NEW_DAILY_SCHEDULES_KEY)
                    const pendingSchedules: string[] = pendingStr ? JSON.parse(pendingStr) : []
                    if (!pendingSchedules.includes(tomorrowSlug)) {
                      pendingSchedules.push(tomorrowSlug)
                      localStorage.setItem(NEW_DAILY_SCHEDULES_KEY, JSON.stringify(pendingSchedules))
                    }
                    setTomorrowInstantiated(true)
                  }}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: '2px dashed #ccc',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    color: '#999',
                  }}
                  whileHover={{ 
                    scale: 1.1, 
                    borderColor: '#888',
                    backgroundColor: 'rgba(0,0,0,0.02)',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  +
                </motion.button>
                <div style={{
                  textAlign: 'center',
                  color: '#888',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}>
                  <div style={{ fontWeight: 500 }}>Click + to load tomorrow</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                    Loads schedule from template
                  </div>
                </div>
              </div>
            )}
          </DayCard>
        </div>
      </div>
      </NodeOverlay>
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

  // Note: No need to add quantaId attribute here - it's automatically added by
  // TipTap's UniqueID extension. Make sure 'daily' is in the types array:
  // RichText.tsx → UniqueID.configure({ types: [..., 'daily'] })
  
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
