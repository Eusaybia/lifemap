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
export const LOCATION_CONNECTOR_STROKE = '#4285F4'
export const LOCATION_CONNECTOR_GLOW = 'rgba(0, 0, 0, 0.2)'
export const LOCATION_CONNECTOR_STROKE_WIDTH = 6
export const LOCATION_CONNECTOR_BORDER_WIDTH = 10
export const LOCATION_CONNECTOR_START_OPACITY = 1
export const LOCATION_CONNECTOR_END_OPACITY = 0.5
export const LOCATION_CONNECTOR_HALO_START_OPACITY = 0.74
export const LOCATION_CONNECTOR_HALO_END_OPACITY = 1
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

type LocationConnectorVisualProps = {
  d: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  includeHitTarget?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: (event: React.MouseEvent<SVGElement>) => void
}

export const LocationConnectorVisual: React.FC<LocationConnectorVisualProps> = ({
  d,
  start,
  end,
  includeHitTarget = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  const connectorId = React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const haloGradientId = `location-connector-halo-${connectorId}`
  const strokeGradientId = `location-connector-stroke-${connectorId}`

  return (
    <>
      <defs>
        <linearGradient
          id={haloGradientId}
          gradientUnits="userSpaceOnUse"
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity={LOCATION_CONNECTOR_HALO_START_OPACITY} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={LOCATION_CONNECTOR_HALO_END_OPACITY} />
        </linearGradient>
        <linearGradient
          id={strokeGradientId}
          gradientUnits="userSpaceOnUse"
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
        >
          <stop offset="0%" stopColor={LOCATION_CONNECTOR_STROKE} stopOpacity={LOCATION_CONNECTOR_START_OPACITY} />
          <stop offset="100%" stopColor={LOCATION_CONNECTOR_STROKE} stopOpacity={LOCATION_CONNECTOR_END_OPACITY} />
        </linearGradient>
      </defs>
      <path
        data-location-connector-halo="true"
        d={d}
        stroke={`url(#${haloGradientId})`}
        strokeWidth={LOCATION_CONNECTOR_BORDER_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{
          filter: `drop-shadow(0 1px 5px ${LOCATION_CONNECTOR_GLOW})`,
          pointerEvents: 'none',
        }}
      />
      <path
        data-location-connector-path="true"
        d={d}
        stroke={`url(#${strokeGradientId})`}
        strokeWidth={LOCATION_CONNECTOR_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ pointerEvents: 'none' }}
      />
      {includeHitTarget && (
        <>
          <path
            d={d}
            stroke="rgba(66, 133, 244, 0.001)"
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
          />
          <circle
            cx={end.x}
            cy={end.y}
            r={12}
            fill="rgba(66, 133, 244, 0.001)"
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
