"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"

// ============================================================================
// Lunar Phase Calculations
// ============================================================================

// Known New Moon reference point: January 6, 2000 18:14 UTC
const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))
const SYNODIC_MONTH = 29.53058867 // Average length of lunar month in days

// Detect hemisphere based on timezone behavior
// In the Northern Hemisphere, June has longer days; in Southern, December does
const isNorthernHemisphere = (): boolean => {
  // Compare timezone offset in January vs July
  // Northern Hemisphere: July offset <= January offset (DST in summer)
  // Southern Hemisphere: January offset <= July offset (DST in summer)
  const jan = new Date(2024, 0, 1).getTimezoneOffset()
  const jul = new Date(2024, 6, 1).getTimezoneOffset()
  // If offsets are equal (no DST), assume Northern (most population)
  // If July offset is less or equal, it's Northern Hemisphere
  return jul <= jan
}

// Spring Equinox calculation based on hemisphere
// Northern Hemisphere: March 20-21
// Southern Hemisphere: September 22-23
const getSpringEquinox = (year: number, isNorthern: boolean): Date => {
  if (isNorthern) {
    return new Date(year, 2, 20, 0, 0, 0) // March 20
  } else {
    return new Date(year, 8, 22, 0, 0, 0) // September 22
  }
}

// Find the new moon that starts the first lunar month of the year
// (first new moon on or after the local Spring Equinox)
const getFirstNewMoonOfYear = (year: number, isNorthern: boolean): Date => {
  const springEquinox = getSpringEquinox(year, isNorthern)
  const msPerDay = 1000 * 60 * 60 * 24
  
  // Find new moon closest to or after spring equinox
  const daysSinceKnownNewMoon = (springEquinox.getTime() - KNOWN_NEW_MOON.getTime()) / msPerDay
  const lunarMonthsSince = daysSinceKnownNewMoon / SYNODIC_MONTH
  
  // Get the new moon on or after the equinox
  let newMoonIndex = Math.floor(lunarMonthsSince)
  let newMoonDate = new Date(KNOWN_NEW_MOON.getTime() + (newMoonIndex * SYNODIC_MONTH * msPerDay))
  
  // If this new moon is before the equinox, get the next one
  if (newMoonDate < springEquinox) {
    newMoonIndex++
    newMoonDate = new Date(KNOWN_NEW_MOON.getTime() + (newMoonIndex * SYNODIC_MONTH * msPerDay))
  }
  
  return newMoonDate
}

// Calculate lunar month number (1-13) based on Spring Equinox for user's hemisphere
const getLunarMonthNumber = (lunarMonthStart: Date): number => {
  const msPerDay = 1000 * 60 * 60 * 24
  const year = lunarMonthStart.getFullYear()
  const isNorthern = isNorthernHemisphere()
  
  // Try current year's first new moon
  let firstNewMoon = getFirstNewMoonOfYear(year, isNorthern)
  
  // If the lunar month is before this year's first new moon, use previous year
  if (lunarMonthStart < firstNewMoon) {
    firstNewMoon = getFirstNewMoonOfYear(year - 1, isNorthern)
  }
  
  // Calculate how many lunar months since the first of the year
  const daysDiff = (lunarMonthStart.getTime() - firstNewMoon.getTime()) / msPerDay
  const monthNumber = Math.round(daysDiff / SYNODIC_MONTH) + 1
  
  return monthNumber
}

// Lunar phase names and emoji
const LUNAR_PHASES = {
  NEW_MOON: { name: 'New Moon', emoji: '🌑', dayRange: [0, 1] },
  WAXING_CRESCENT: { name: 'Waxing Crescent', emoji: '🌒', dayRange: [1, 7.38] },
  FIRST_QUARTER: { name: 'First Quarter', emoji: '🌓', dayRange: [7.38, 7.88] },
  WAXING_GIBBOUS: { name: 'Waxing Gibbous', emoji: '🌔', dayRange: [7.88, 14.77] },
  FULL_MOON: { name: 'Full Moon', emoji: '🌕', dayRange: [14.77, 15.27] },
  WANING_GIBBOUS: { name: 'Waning Gibbous', emoji: '🌖', dayRange: [15.27, 22.15] },
  LAST_QUARTER: { name: 'Last Quarter', emoji: '🌗', dayRange: [22.15, 22.65] },
  WANING_CRESCENT: { name: 'Waning Crescent', emoji: '🌘', dayRange: [22.65, 29.53] },
} as const

// Major phases (rest days in the lunar calendar) - the 4 key phases
const MAJOR_PHASE_KEYS = ['NEW_MOON', 'FIRST_QUARTER', 'FULL_MOON', 'LAST_QUARTER']

// Weekend days in the lunar month (lunar phase rest days)
// Following the luni-solar calendar structure:
// Day 1 = New Moon (Weekend)
// Day 8 = First Quarter (Weekend)
// Day 15 = Full Moon (Weekend)
// Day 22 = Last Quarter (Weekend)
// Day 29 = Pre-New Moon (Weekend)
const WEEKEND_DAYS: Record<number, { emoji: string; name: string }> = {
  1: { emoji: '🌑', name: 'New Moon' },
  8: { emoji: '🌓', name: 'First Quarter' },
  15: { emoji: '🌕', name: 'Full Moon' },
  22: { emoji: '🌗', name: 'Last Quarter' },
  29: { emoji: '🌘', name: 'Balsamic Moon' },
}

// Check if a lunar day is a Weekend (major phase day)
const isMajorPhaseDay = (lunarDay: number): { isMajor: boolean; phase?: { emoji: string; name: string } } => {
  const weekend = WEEKEND_DAYS[lunarDay]
  if (weekend) {
    return { isMajor: true, phase: weekend }
  }
  return { isMajor: false }
}

// Get days since the known new moon
const getDaysSinceNewMoon = (date: Date): number => {
  const diff = date.getTime() - KNOWN_NEW_MOON.getTime()
  const daysDiff = diff / (1000 * 60 * 60 * 24)
  return daysDiff % SYNODIC_MONTH
}

// Get the current lunar day (1-indexed)
const getLunarDay = (date: Date): number => {
  const daysSinceNewMoon = getDaysSinceNewMoon(date)
  return Math.floor(daysSinceNewMoon) + 1
}

// Get lunar phase info for a date
const getLunarPhase = (date: Date): { key: string; name: string; emoji: string; isWeekend: boolean } => {
  const daysSinceNewMoon = getDaysSinceNewMoon(date)
  
  for (const [key, phase] of Object.entries(LUNAR_PHASES)) {
    const [start, end] = phase.dayRange
    if (daysSinceNewMoon >= start && daysSinceNewMoon < end) {
      return {
        key,
        name: phase.name,
        emoji: phase.emoji,
        isWeekend: MAJOR_PHASE_KEYS.includes(key),
      }
    }
  }
  
  // Fallback to new moon (shouldn't happen but just in case)
  return { key: 'NEW_MOON', name: 'New Moon', emoji: '🌑', isWeekend: true }
}

// Get the start date of the current lunar month (last New Moon)
const getLunarMonthStart = (date: Date): Date => {
  const daysSinceNewMoon = getDaysSinceNewMoon(date)
  const msPerDay = 1000 * 60 * 60 * 24
  return new Date(date.getTime() - (daysSinceNewMoon * msPerDay))
}

// Get all days in a lunar month from a start date
const getLunarMonthDays = (lunarMonthStart: Date): Date[] => {
  const days: Date[] = []
  const msPerDay = 1000 * 60 * 60 * 24
  
  for (let i = 0; i < Math.ceil(SYNODIC_MONTH); i++) {
    days.push(new Date(lunarMonthStart.getTime() + (i * msPerDay)))
  }
  
  return days
}

// Format lunar month identifier: lunar-YYYY-MM (of the new moon date)
const formatLunarMonthSlug = (lunarMonthStart: Date): string => {
  const year = lunarMonthStart.getFullYear()
  const month = String(lunarMonthStart.getMonth() + 1).padStart(2, '0')
  const day = String(lunarMonthStart.getDate()).padStart(2, '0')
  return `lunar-${year}-${month}-${day}`
}

// Format date for display (without year - for day cells)
const formatDateShort = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}`
}

// Format date with year (for header)
const formatDateWithYear = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

// Check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
}

// Convert number to ordinal (1st, 2nd, 3rd, etc.)
const toOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ============================================================================
// Day Cell Component
// ============================================================================

interface DayCellProps {
  date: Date
  lunarDay: number
  phase: { key: string; name: string; emoji: string; isWeekend: boolean }
  majorPhase: { isMajor: boolean; phase?: { emoji: string; name: string } }
  isToday: boolean
  slug: string
  onClick: () => void
  isSelected: boolean
}

const DayCell: React.FC<DayCellProps> = ({ date, lunarDay, phase, majorPhase, isToday, slug, onClick, isSelected }) => {
  const isMajor = majorPhase.isMajor
  
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 4px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected 
          ? 'rgba(59, 130, 246, 0.15)' 
          : isMajor
            ? 'rgba(180, 120, 40, 0.15)'
            : 'rgba(255, 255, 255, 0.6)',
        border: isToday 
          ? '2px solid #f59e0b' 
          : isSelected 
            ? '2px solid #3b82f6' 
            : isMajor
              ? '2px solid rgba(180, 120, 40, 0.6)'
              : '1px solid rgba(0, 0, 0, 0.08)',
        minHeight: '80px',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {/* Today indicator */}
      {isToday && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#f59e0b',
        }} />
      )}
      
      {/* Lunar Day Number (ordinal format) */}
      <div style={{
        fontFamily: "'EB Garamond', Georgia, serif",
        fontSize: '18px',
        fontWeight: 600,
        color: isMajor ? '#b45309' : '#1f2937',
        lineHeight: 1,
      }}>
        {toOrdinal(lunarDay)}
      </div>
      
      {/* Moon Phase Emoji - use major phase emoji if it's a major phase day */}
      <div style={{
        fontSize: isMajor ? '20px' : '16px',
        margin: '4px 0',
      }}>
        {isMajor && majorPhase.phase ? majorPhase.phase.emoji : phase.emoji}
      </div>
      
      {/* Gregorian Date */}
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: '10px',
        color: '#6b7280',
        lineHeight: 1,
      }}>
        {formatDateShort(date)}
      </div>
      
      {/* Major Phase Label */}
      {isMajor && majorPhase.phase && (
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '8px',
          color: '#b45309',
          fontWeight: 600,
          marginTop: '3px',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}>
          {majorPhase.phase.name}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// Lunar Month Grid Node View
// ============================================================================

const LunarMonthNodeView: React.FC<NodeViewProps> = () => {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewingMonthStart, setViewingMonthStart] = useState<Date>(() => getLunarMonthStart(today))
  
  // Get all days in the lunar month
  const lunarMonthDays = getLunarMonthDays(viewingMonthStart)
  const lunarMonthSlug = formatLunarMonthSlug(viewingMonthStart)
  
  // Navigation functions
  const goToPreviousMonth = useCallback(() => {
    const msPerDay = 1000 * 60 * 60 * 24
    const prevMonthDate = new Date(viewingMonthStart.getTime() - (SYNODIC_MONTH * msPerDay))
    setViewingMonthStart(getLunarMonthStart(prevMonthDate))
  }, [viewingMonthStart])
  
  const goToNextMonth = useCallback(() => {
    const msPerDay = 1000 * 60 * 60 * 24
    const nextMonthDate = new Date(viewingMonthStart.getTime() + ((SYNODIC_MONTH + 1) * msPerDay))
    setViewingMonthStart(getLunarMonthStart(nextMonthDate))
  }, [viewingMonthStart])
  
  const goToCurrentMonth = useCallback(() => {
    setViewingMonthStart(getLunarMonthStart(new Date()))
  }, [])
  
  // Check if current month contains today
  const currentMonthContainsToday = lunarMonthDays.some(day => isSameDay(day, today))
  
  // Get phase info for the start of this lunar month
  const newMoonPhase = getLunarPhase(viewingMonthStart)
  
  return (
    <NodeViewWrapper 
      data-lunar-month-node-view="true"
      style={{ 
        margin: '16px 0', 
        overflow: 'visible', 
        position: 'relative',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          backgroundColor: 'rgba(250, 250, 252, 0.95)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          padding: '20px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}>
          {/* Navigation */}
          <motion.button
            onClick={goToPreviousMonth}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ←
          </motion.button>
          
          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: '24px',
              fontWeight: 500,
              color: '#1f2937',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              Month {getLunarMonthNumber(viewingMonthStart)}
              <span style={{ fontSize: '16px', color: '#6b7280' }}>
                {formatDateWithYear(viewingMonthStart)} – {formatDateWithYear(lunarMonthDays[lunarMonthDays.length - 1])}
              </span>
            </h2>
          </div>
          
          {/* Navigation */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {!currentMonthContainsToday && (
              <motion.button
                onClick={goToCurrentMonth}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#d97706',
                  fontWeight: 500,
                }}
              >
                Today
              </motion.button>
            )}
            <motion.button
              onClick={goToNextMonth}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              →
            </motion.button>
          </div>
        </div>
        
        
        {/* Column Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr) 1fr',
          gap: '8px',
          marginBottom: '8px',
        }}>
          {['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'].map((label) => (
            <div key={label} style={{
              textAlign: 'center',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '4px',
            }}>
              {label}
            </div>
          ))}
          <div style={{
            textAlign: 'center',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            color: '#b45309',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '4px',
          }}>
            Weekend
          </div>
        </div>
        
        {/* Grid with Weekend Column */}
        {(() => {
          // Structure: New Moon (Day 1) is Weekend, then 6 work days, then Weekend, etc.
          // Week 1: Day 1 (New Moon/Weekend)
          // Week 2: Days 2-7 (work), Day 8 (Weekend/First Quarter)
          // Week 3: Days 9-14 (work), Day 15 (Weekend/Full Moon)
          // Week 4: Days 16-21 (work), Day 22 (Weekend/Last Quarter)
          // Week 5: Days 23-28 (work), Day 29 (Weekend)
          // Week 6: Day 30 (if exists)
          
          const rows: { workDays: number[]; sabbath: number | null }[] = [
            { workDays: [], sabbath: 1 }, // New Moon is first Weekend
            { workDays: [2, 3, 4, 5, 6, 7], sabbath: 8 },
            { workDays: [9, 10, 11, 12, 13, 14], sabbath: 15 },
            { workDays: [16, 17, 18, 19, 20, 21], sabbath: 22 },
            { workDays: [23, 24, 25, 26, 27, 28], sabbath: 29 },
            { workDays: [30], sabbath: null },
          ]
          
          return rows.map((row, rowIndex) => {
            // Skip row if no days
            if (row.workDays.length === 0 && row.sabbath === null) return null
            // Skip if days exceed month length
            const maxDay = Math.ceil(SYNODIC_MONTH)
            if (row.workDays.length > 0 && row.workDays[0] > maxDay) return null
            
            return (
              <div 
                key={rowIndex}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr) 1fr',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                {/* Work days */}
                {row.workDays.length === 0 ? (
                  // First row has no work days, just the Weekend
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))
                ) : (
                  <>
                    {row.workDays.map((dayNum) => {
                      if (dayNum > lunarMonthDays.length) return <div key={`empty-${dayNum}`} />
                      const date = lunarMonthDays[dayNum - 1]
                      const phase = getLunarPhase(date)
                      const majorPhase = isMajorPhaseDay(dayNum)
                      const isToday = isSameDay(date, today)
                      const daySlug = `${lunarMonthSlug}-day-${dayNum}`
                      const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
                      
                      return (
                        <DayCell
                          key={daySlug}
                          date={date}
                          lunarDay={dayNum}
                          phase={phase}
                          majorPhase={{ isMajor: false }} // Work days are not major phases
                          isToday={isToday}
                          slug={daySlug}
                          onClick={() => setSelectedDate(isSelected ? null : date)}
                          isSelected={isSelected}
                        />
                      )
                    })}
                    {/* Fill empty cells if row is incomplete */}
                    {row.workDays.length < 6 && Array.from({ length: 6 - row.workDays.length }).map((_, i) => (
                      <div key={`empty-pad-${i}`} />
                    ))}
                  </>
                )}
                
                {/* Weekend column */}
                {row.sabbath && row.sabbath <= lunarMonthDays.length ? (
                  (() => {
                    const dayNum = row.sabbath
                    const date = lunarMonthDays[dayNum - 1]
                    const phase = getLunarPhase(date)
                    const majorPhase = isMajorPhaseDay(dayNum)
                    const isToday = isSameDay(date, today)
                    const daySlug = `${lunarMonthSlug}-day-${dayNum}`
                    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
                    
                    return (
                      <DayCell
                        key={daySlug}
                        date={date}
                        lunarDay={dayNum}
                        phase={phase}
                        majorPhase={majorPhase}
                        isToday={isToday}
                        slug={daySlug}
                        onClick={() => setSelectedDate(isSelected ? null : date)}
                        isSelected={isSelected}
                      />
                    )
                  })()
                ) : (
                  <div />
                )}
              </div>
            )
          })
        })()}
        
        {/* Selected Day Panel */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
            }}
          >
            {(() => {
              const selectedLunarDay = lunarMonthDays.findIndex(d => isSameDay(d, selectedDate)) + 1
              const selectedPhase = getLunarPhase(selectedDate)
              return (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}>
                    <span style={{ fontSize: '32px' }}>{selectedPhase.emoji}</span>
                    <div>
                      <h3 style={{
                        fontFamily: "'EB Garamond', Georgia, serif",
                        fontSize: '20px',
                        fontWeight: 500,
                        margin: 0,
                        color: '#1f2937',
                      }}>
                        Day {selectedLunarDay} – {selectedPhase.name}
                      </h3>
                      <p style={{
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: '13px',
                        color: '#6b7280',
                        margin: '4px 0 0 0',
                      }}>
                        {selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                        {selectedPhase.isWeekend && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            backgroundColor: 'rgba(180, 120, 40, 0.15)',
                            color: '#b45309',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}>
                            LUNAR WEEKEND
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Placeholder for day content - could link to quanta */}
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: '8px',
                    border: '1px dashed rgba(0, 0, 0, 0.1)',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '13px',
                  }}>
                    Click to add notes for this day...
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}
      </motion.div>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Lunar Month TipTap Extension
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lunarMonth: {
      insertLunarMonth: () => ReturnType
    }
  }
}

export const LunarMonthExtension = TipTapNode.create({
  name: "lunarMonth",
  group: "block",
  atom: true,
  inline: false,
  selectable: true,
  draggable: true,
  
  parseHTML() {
    return [{ tag: 'div[data-type="lunarMonth"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'lunarMonth' }]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(LunarMonthNodeView)
  },
  
  addCommands() {
    return {
      insertLunarMonth: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'lunarMonth',
          })
          .run()
      },
    }
  },
  
  addInputRules() {
    return [
      {
        find: /^\/lunar\s$/,
        handler: ({ state, range, chain }) => {
          const { tr } = state
          tr.delete(range.from, range.to)
          // @ts-ignore
          chain().insertLunarMonth().run()
        },
      },
    ]
  },
})

export default LunarMonthExtension
