"use client"

import React from "react"

// ============================================================================
// DragGrip Component
// A reusable 6-dot grip handle for draggable TipTap node views
// ============================================================================

export interface DragGripProps {
  /** Number of dot rows (default: 3) */
  rows?: number
  /** Number of dot columns (default: 2) */
  cols?: number
  /** Size of each dot in pixels (default: 4) */
  dotSize?: number
  /** Gap between dots in pixels (default: 3) */
  gap?: number
  /** Color of the dots (default: rgba(255, 255, 255, 0.4)) */
  dotColor?: string
  /** Hover background color (default: rgba(255, 255, 255, 0.1)) */
  hoverBackground?: string
  /** Tooltip text (default: "Drag to move") */
  title?: string
  /** Additional inline styles */
  style?: React.CSSProperties
  /** Additional class name */
  className?: string
  /** Click handler (e.g., for selecting nodes) */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  /** Position preset: 'inline' (default), 'absolute-top-right', 'absolute-right' */
  position?: 'inline' | 'absolute-top-right' | 'absolute-right'
  /** Top offset when using absolute positioning (default: 40) */
  top?: number
  /** Right offset when using absolute positioning (default: 6) */
  right?: number
}

const positionStyles: Record<string, React.CSSProperties> = {
  'inline': {},
  'absolute-top-right': {
    position: 'absolute',
    top: 40,
    right: 6,
    zIndex: 10,
  },
  'absolute-right': {
    position: 'absolute',
    top: 10,
    right: 0,
    zIndex: 10,
  },
}

export const DragGrip: React.FC<DragGripProps> = ({
  rows = 3,
  cols = 2,
  dotSize = 4,
  gap = 3,
  dotColor = 'rgba(255, 255, 255, 0.4)',
  hoverBackground = 'rgba(255, 255, 255, 0.1)',
  title = 'Drag to move',
  style,
  className,
  onClick,
  position = 'inline',
  top,
  right,
}) => {
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.cursor = 'grabbing'
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.cursor = 'grab'
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = hoverBackground
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.cursor = 'grab'
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    onClick?.(e)
  }

  // Merge position styles with custom top/right overrides
  const computedPositionStyles = {
    ...positionStyles[position],
    ...(top !== undefined && position !== 'inline' ? { top } : {}),
    ...(right !== undefined && position !== 'inline' ? { right } : {}),
  }

  return (
    <div
      data-drag-handle
      contentEditable={false}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
        padding: '8px 6px',
        cursor: onClick ? 'pointer' : 'grab',
        borderRadius: '6px',
        transition: 'background 0.2s ease',
        ...computedPositionStyles,
        ...style,
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={title}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', gap: `${gap}px` }}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: '50%',
                backgroundColor: dotColor,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default DragGrip

