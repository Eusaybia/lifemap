'use client'

import React from 'react'

export const TEMPORAL_ARROW_STROKE = 'rgba(17, 17, 17, 0.96)'
export const TEMPORAL_ARROW_FILAMENT = 'rgba(17, 17, 17, 0.72)'
export const TEMPORAL_ARROW_HEAD_FILL = 'rgba(17, 17, 17, 0.98)'
export const TEMPORAL_ARROW_GLOW = 'rgba(0, 0, 0, 0.16)'
export const TEMPORAL_ARROW_GLOW_STRONG = 'rgba(0, 0, 0, 0.28)'
export const TEMPORAL_ARROW_STROKE_WIDTH = 4.75
export const TEMPORAL_ARROW_HEAD_STROKE_WIDTH = 2.2
export const TEMPORAL_ARROW_HEAD_SIZE = 12.4
const TEMPORAL_ARROW_NEAR_OPACITY = 0.96
const TEMPORAL_ARROW_FAR_OPACITY = 0.18
const TEMPORAL_ARROW_HEAD_NEAR_OPACITY = 0.98
const TEMPORAL_ARROW_HEAD_FAR_OPACITY = 0.24

const getTemporalFutureProgress = (futureIndex = 0, futureTotal = 1) => {
  const clampedTotal = Math.max(1, Math.trunc(futureTotal))
  if (clampedTotal <= 1) return 0

  const clampedIndex = Math.min(Math.max(0, Math.trunc(futureIndex)), clampedTotal - 1)
  return clampedIndex / (clampedTotal - 1)
}

const interpolateOpacity = (nearOpacity: number, farOpacity: number, progress: number) => (
  Number((nearOpacity + (farOpacity - nearOpacity) * progress).toFixed(2))
)

export const getTemporalArrowFutureOpacity = (futureIndex = 0, futureTotal = 1) => (
  interpolateOpacity(
    TEMPORAL_ARROW_NEAR_OPACITY,
    TEMPORAL_ARROW_FAR_OPACITY,
    getTemporalFutureProgress(futureIndex, futureTotal),
  )
)

export const getTemporalArrowHeadFutureOpacity = (futureIndex = 0, futureTotal = 1) => (
  interpolateOpacity(
    TEMPORAL_ARROW_HEAD_NEAR_OPACITY,
    TEMPORAL_ARROW_HEAD_FAR_OPACITY,
    getTemporalFutureProgress(futureIndex, futureTotal),
  )
)

export const buildTemporalArrowPolygonPoints = (
  x: number,
  y: number,
  angle: number,
  arrowSize = TEMPORAL_ARROW_HEAD_SIZE,
) => (
  `${x},${y} ` +
  `${x - arrowSize * Math.cos(angle - Math.PI / 6)},${y - arrowSize * Math.sin(angle - Math.PI / 6)} ` +
  `${x - arrowSize * Math.cos(angle + Math.PI / 6)},${y - arrowSize * Math.sin(angle + Math.PI / 6)}`
)

type TemporalArrowVisualProps = {
  d: string
  arrowPoints: string
  futureIndex?: number
  futureTotal?: number
  includeHitTarget?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: (event: React.MouseEvent<SVGElement>) => void
}

export const TemporalArrowVisual: React.FC<TemporalArrowVisualProps> = ({
  d,
  arrowPoints,
  futureIndex = 0,
  futureTotal = 1,
  includeHitTarget = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  const strokeOpacity = getTemporalArrowFutureOpacity(futureIndex, futureTotal)
  const headOpacity = getTemporalArrowHeadFutureOpacity(futureIndex, futureTotal)

  return (
    <>
      <path
        data-temporal-arrow-path="true"
        data-temporal-future-index={futureIndex}
        data-temporal-future-total={futureTotal}
        d={d}
        stroke={TEMPORAL_ARROW_STROKE}
        strokeWidth={TEMPORAL_ARROW_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={strokeOpacity}
        style={{
          pointerEvents: 'none',
        }}
      />
      <polygon
        data-temporal-arrow-head="true"
        data-temporal-future-index={futureIndex}
        data-temporal-future-total={futureTotal}
        points={arrowPoints}
        fill={TEMPORAL_ARROW_HEAD_FILL}
        stroke={TEMPORAL_ARROW_HEAD_FILL}
        strokeWidth={TEMPORAL_ARROW_HEAD_STROKE_WIDTH}
        opacity={headOpacity}
        style={{
          pointerEvents: 'none',
        }}
      />
      {includeHitTarget && (
        <>
          <path
            d={d}
            stroke="rgba(0, 0, 0, 0.001)"
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
          />
          <polygon
            points={arrowPoints}
            fill="rgba(0, 0, 0, 0.001)"
            stroke="rgba(0, 0, 0, 0.001)"
            strokeWidth={8}
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
          />
        </>
      )}
    </>
  )
}
