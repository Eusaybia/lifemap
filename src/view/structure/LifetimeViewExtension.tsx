"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"
import { DragGrip } from "../components/DragGrip"

// ============================================================================
// Constants
// ============================================================================

const LIFE_EXPECTANCY_YEARS = 90
const CIRCLES_PER_ROW = 26
const TOTAL_CIRCLES = LIFE_EXPECTANCY_YEARS // One circle per year

// Color palette - white/grayscale theme
const COLORS = {
  lived: {
    bright: '#FFFFFF',    // Bright white for current year
    mid: 'rgba(255, 255, 255, 0.7)',       // Mid white
    faded: 'rgba(255, 255, 255, 0.4)',     // Faded white
  },
  future: {
    near: 'rgba(255, 255, 255, 0.3)',    // Near future - slightly visible
    mid: 'rgba(255, 255, 255, 0.15)',     // Mid future
    far: 'rgba(255, 255, 255, 0.08)',     // Far future - barely visible
  },
  background: '#1A1216',
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.5)',
  },
}

// ============================================================================
// Helpers
// ============================================================================

const calculateAge = (dateOfBirth: Date): number => {
  const now = new Date()
  const diffMs = now.getTime() - dateOfBirth.getTime()
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25)
  return years
}

const getCircleColor = (yearIndex: number, yearsLived: number): string => {
  // Calculate distance from the current year (present moment)
  const currentYear = Math.floor(yearsLived)
  const distanceFromPresent = Math.abs(yearIndex - currentYear)
  
  // The current year is brightest white, all others dim based on distance
  if (distanceFromPresent === 0) {
    // Current year - brightest white
    return COLORS.lived.bright
  } else if (distanceFromPresent <= 2) {
    // Very close to present
    return `rgba(255, 255, 255, ${0.85 - distanceFromPresent * 0.12})`
  } else if (distanceFromPresent <= 5) {
    // Close to present
    return `rgba(255, 255, 255, ${0.6 - (distanceFromPresent - 2) * 0.08})`
  } else if (distanceFromPresent <= 10) {
    // Medium distance
    return `rgba(255, 255, 255, ${0.35 - (distanceFromPresent - 5) * 0.04})`
  } else if (distanceFromPresent <= 20) {
    // Far from present
    return `rgba(255, 255, 255, ${0.18 - (distanceFromPresent - 10) * 0.008})`
  } else if (distanceFromPresent <= 40) {
    // Very far
    return `rgba(255, 255, 255, ${0.10 - (distanceFromPresent - 20) * 0.002})`
  } else {
    // Extremely far - barely visible
    return `rgba(255, 255, 255, ${Math.max(0.03, 0.06 - (distanceFromPresent - 40) * 0.001)})`
  }
}

// ============================================================================
// Circle Grid Component
// ============================================================================

interface CircleGridProps {
  yearsLived: number
  totalYears: number
  circlesPerRow: number
}

const CircleGrid: React.FC<CircleGridProps> = ({ yearsLived, totalYears, circlesPerRow }) => {
  const rows = Math.ceil(totalYears / circlesPerRow)
  
  // Create a 2D array to place circles in correct positions
  // Year 0 at bottom-right, progressing left then up
  const gridData = useMemo(() => {
    const grid: { yearIndex: number; color: string }[][] = []
    
    // Initialize empty grid
    for (let r = 0; r < rows; r++) {
      grid[r] = []
      for (let c = 0; c < circlesPerRow; c++) {
        grid[r][c] = { yearIndex: -1, color: 'transparent' }
      }
    }
    
    // Fill from bottom-right to top-left
    // Year 0 is at bottom-right, year N is at top-left
    for (let year = 0; year < totalYears; year++) {
      // Calculate position: year 0 at bottom-right
      const posFromEnd = year // 0 = bottom-right corner
      const rowFromBottom = Math.floor(posFromEnd / circlesPerRow)
      const colFromRight = posFromEnd % circlesPerRow
      
      const actualRow = rows - 1 - rowFromBottom
      const actualCol = circlesPerRow - 1 - colFromRight
      
      if (actualRow >= 0 && actualCol >= 0) {
        grid[actualRow][actualCol] = {
          yearIndex: year,
          color: getCircleColor(year, yearsLived)
        }
      }
    }
    
    return grid
  }, [totalYears, circlesPerRow, yearsLived, rows])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${circlesPerRow}, 1fr)`,
        gap: '6px',
        padding: '24px',
        width: '100%',
        maxWidth: '700px',
      }}
    >
      {gridData.flat().map(({ yearIndex, color }, idx) => (
        <motion.div
          key={idx}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: yearIndex >= 0 ? 1 : 0 }}
          transition={{ 
            delay: yearIndex >= 0 ? (totalYears - yearIndex) * 0.005 : 0,
            duration: 0.2,
            ease: 'easeOut'
          }}
          style={{
            width: '100%',
            paddingBottom: '100%',
            borderRadius: '50%',
            backgroundColor: color,
            position: 'relative',
            visibility: yearIndex >= 0 ? 'visible' : 'hidden',
          }}
          title={yearIndex >= 0 ? `Year ${yearIndex + 1}${yearIndex < yearsLived ? ' (lived)' : ''}` : ''}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Age Counter Component
// ============================================================================

interface AgeCounterProps {
  dateOfBirth: Date
}

const AgeCounter: React.FC<AgeCounterProps> = ({ dateOfBirth }) => {
  const [age, setAge] = useState(calculateAge(dateOfBirth))

  useEffect(() => {
    const interval = setInterval(() => {
      setAge(calculateAge(dateOfBirth))
    }, 50) // Update frequently for smooth animation

    return () => clearInterval(interval)
  }, [dateOfBirth])

  const wholeYears = Math.floor(age)
  const decimal = (age - wholeYears).toFixed(10).slice(1) // Get decimal part with leading dot

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: '72px',
            fontWeight: 300,
            color: COLORS.text.primary,
            fontFamily: "'Instrument Sans', 'Inter', system-ui, sans-serif",
            letterSpacing: '-2px',
          }}
        >
          {wholeYears}
        </span>
        <span
          style={{
            fontSize: '32px',
            fontWeight: 300,
            color: COLORS.text.secondary,
            fontFamily: "'Instrument Sans', 'Inter', system-ui, sans-serif",
          }}
        >
          {decimal}
        </span>
      </div>
      <span
        style={{
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '4px',
          color: COLORS.text.secondary,
          textTransform: 'uppercase',
        }}
      >
        Years
      </span>
    </div>
  )
}

// ============================================================================
// Date Picker Component
// ============================================================================

interface DatePickerProps {
  dateOfBirth: Date
  onChange: (date: Date) => void
}

const DatePicker: React.FC<DatePickerProps> = ({ dateOfBirth, onChange }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(dateOfBirth.toISOString().split('T')[0])

  const handleSubmit = useCallback(() => {
    const newDate = new Date(inputValue)
    if (!isNaN(newDate.getTime())) {
      onChange(newDate)
    }
    setIsEditing(false)
  }, [inputValue, onChange])

  if (isEditing) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="date"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: COLORS.text.primary,
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: COLORS.text.secondary,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      Born: {dateOfBirth.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}
    </button>
  )
}

// ============================================================================
// LifetimeView Node View Component
// ============================================================================

const LifetimeViewNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  deleteNode,
}) => {
  const [dateOfBirth, setDateOfBirth] = useState<Date>(() => {
    const stored = node.attrs.dateOfBirth
    if (stored) {
      const parsed = new Date(stored)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }
    // Default to a placeholder date (can be changed)
    return new Date(1998, 0, 12) // January 12, 1998
  })

  const yearsLived = calculateAge(dateOfBirth)

  const handleDateChange = useCallback((newDate: Date) => {
    setDateOfBirth(newDate)
    updateAttributes({ dateOfBirth: newDate.toISOString() })
  }, [updateAttributes])

  return (
    <NodeViewWrapper
      data-lifetime-view="true"
      style={{ margin: '24px 0' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative',
          background: COLORS.background,
          borderRadius: '16px',
          overflow: 'visible',
          border: selected ? '2px solid rgba(255, 255, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: selected 
            ? '0 8px 32px rgba(255, 255, 255, 0.15)' 
            : '0 4px 24px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* 6-dot Grip Handle - positioned like Group/TemporalSpace */}
        <DragGrip
          position="absolute-top-right"
          dotColor="rgba(255, 255, 255, 0.5)"
          hoverBackground="rgba(255, 255, 255, 0.1)"
        />
        {/* Header Controls */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>⏳</span>
            <span style={{ 
              fontWeight: 500, 
              color: COLORS.text.primary, 
              fontSize: '15px',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Lifetime View
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DatePicker 
              dateOfBirth={dateOfBirth} 
              onChange={handleDateChange} 
            />
            <button
              type="button"
              onClick={deleteNode}
              style={{
                padding: '6px 10px',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#ef4444',
              }}
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px',
            gap: '32px',
          }}
        >
          {/* Circle Grid */}
          <CircleGrid 
            yearsLived={yearsLived} 
            totalYears={TOTAL_CIRCLES} 
            circlesPerRow={CIRCLES_PER_ROW}
          />
          
          {/* Age Counter */}
          <AgeCounter dateOfBirth={dateOfBirth} />
          
          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: '32px',
              padding: '16px 24px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 300, 
                color: COLORS.text.primary,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {Math.floor(yearsLived)}
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: COLORS.text.secondary,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}>
                Years Lived
              </div>
            </div>
            <div style={{ 
              width: '1px', 
              background: 'rgba(255, 255, 255, 0.1)',
            }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 300, 
                color: COLORS.text.secondary,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {Math.max(0, LIFE_EXPECTANCY_YEARS - Math.floor(yearsLived))}
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: COLORS.text.secondary,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}>
                Years Ahead
              </div>
            </div>
            <div style={{ 
              width: '1px', 
              background: 'rgba(255, 255, 255, 0.1)',
            }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 300, 
                color: COLORS.text.primary,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                {((yearsLived / LIFE_EXPECTANCY_YEARS) * 100).toFixed(1)}%
              </div>
              <div style={{ 
                fontSize: '11px', 
                color: COLORS.text.secondary,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}>
                Journey
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </NodeViewWrapper>
  )
}

// ============================================================================
// LifetimeView TipTap Extension
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lifetimeView: {
      insertLifetimeView: (attrs?: { dateOfBirth?: string }) => ReturnType
    }
  }
}

export const LifetimeViewExtension = TipTapNode.create({
  name: "lifetimeView",
  group: "block",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  
  addAttributes() {
    return {
      dateOfBirth: {
        default: new Date(1998, 0, 12).toISOString(), // Default date
      },
    }
  },
  
  parseHTML() {
    return [{ tag: 'div[data-type="lifetime-view"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'lifetime-view' }, 0]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(LifetimeViewNodeView)
  },
  
  addCommands() {
    return {
      insertLifetimeView: (attrs) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: attrs || {},
          })
          .run()
      },
    }
  },
})

export default LifetimeViewExtension

