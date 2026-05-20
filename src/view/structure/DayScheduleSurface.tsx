'use client'

import React, { useMemo } from 'react'

export type DayScheduleBlock = {
  id: string
  title: string
  subtitle?: string
  startMinuteOfDay: number
  endMinuteOfDay: number
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  href?: string
}

export type DayScheduleAllDayBlock = {
  id: string
  title: string
  subtitle?: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  href?: string
}

type DragSelection = {
  pointerId: number
  anchorMinute: number
  currentMinute: number
}

type RenderedDayScheduleBlock = DayScheduleBlock & {
  lane: number
  laneCount: number
}

const DEFAULT_START_HOUR = 6
const DEFAULT_END_HOUR = 22
const SLOT_MINUTES = 60
const DEFAULT_ROW_HEIGHT = 56
const MIN_BLOCK_MINUTES = 5
const ALLOWED_MINUTE_OFFSETS = [0, 5, 15, 30, 45, 55] as const
const DEFAULT_BLOCK_BACKGROUND = '#1a73e8'
const DEFAULT_BLOCK_BORDER = '#185abc'
const DEFAULT_BLOCK_TEXT = '#fff'

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

function createBlockId(): string {
  return `day-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function getTodayKey(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDayKey(value: unknown): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, (month ?? 1) - 1, day ?? 1)
  }

  return new Date()
}

function formatSlotLabel(slotIndex: number, startHour: number): string {
  const totalMinutes = startHour * 60 + slotIndex * SLOT_MINUTES
  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  return `${hours12}${minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`}${suffix}`
}

function formatMinuteLabel(minuteOfDay: number): string {
  const hours24 = Math.floor(minuteOfDay / 60)
  const minutes = minuteOfDay % 60
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${suffix}`
}

function formatCompactDateHeader(date: Date): string {
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date).toUpperCase()
  const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date).toUpperCase()
  return `${weekday}/${date.getDate()} ${month}`
}

function minuteToTop(minuteOfDay: number, dayStartMinute: number, rowHeight: number): number {
  return ((minuteOfDay - dayStartMinute) / 60) * rowHeight
}

function buildAllowedBoundaries(dayStartMinute: number, dayEndMinute: number): number[] {
  const boundaries: number[] = []

  for (let hour = dayStartMinute / 60; hour < dayEndMinute / 60; hour += 1) {
    for (const minute of ALLOWED_MINUTE_OFFSETS) {
      boundaries.push(hour * 60 + minute)
    }
  }

  boundaries.push(dayEndMinute)
  return boundaries
}

function snapMinuteToBoundary(minute: number, boundaries: number[], dayStartMinute: number, dayEndMinute: number): number {
  const clampedMinute = clamp(minute, dayStartMinute, dayEndMinute)
  let bestBoundary = boundaries[0] ?? dayStartMinute
  let bestDistance = Math.abs(bestBoundary - clampedMinute)

  for (const boundary of boundaries) {
    const distance = Math.abs(boundary - clampedMinute)
    if (distance < bestDistance || (distance === bestDistance && boundary < bestBoundary)) {
      bestBoundary = boundary
      bestDistance = distance
    }
  }

  return bestBoundary
}

function getAdjacentBoundary(boundary: number, boundaries: number[], direction: 'previous' | 'next'): number | null {
  const index = boundaries.indexOf(boundary)
  if (index === -1) return null
  return direction === 'previous'
    ? (boundaries[index - 1] ?? null)
    : (boundaries[index + 1] ?? null)
}

function resolveSelectionBounds(selection: DragSelection, boundaries: number[]): { startMinuteOfDay: number; endMinuteOfDay: number } {
  if (selection.anchorMinute === selection.currentMinute) {
    const nextBoundary = getAdjacentBoundary(selection.anchorMinute, boundaries, 'next') ?? selection.anchorMinute
    return {
      startMinuteOfDay: selection.anchorMinute,
      endMinuteOfDay: nextBoundary,
    }
  }

  return {
    startMinuteOfDay: Math.min(selection.anchorMinute, selection.currentMinute),
    endMinuteOfDay: Math.max(selection.anchorMinute, selection.currentMinute),
  }
}

function normalizeBlocks(value: unknown, dayStartMinute: number, dayEndMinute: number): DayScheduleBlock[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry): DayScheduleBlock[] => {
    if (!entry || typeof entry !== 'object') return []
    const candidate = entry as Record<string, unknown>
    if (typeof candidate.id !== 'string') return []
    if (typeof candidate.startMinuteOfDay !== 'number') return []
    if (typeof candidate.endMinuteOfDay !== 'number') return []

    const startMinuteOfDay = clamp(candidate.startMinuteOfDay, dayStartMinute, dayEndMinute - MIN_BLOCK_MINUTES)
    const endMinuteOfDay = clamp(candidate.endMinuteOfDay, startMinuteOfDay + MIN_BLOCK_MINUTES, dayEndMinute)

    return [{
      id: candidate.id,
      title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title : 'New block',
      subtitle: typeof candidate.subtitle === 'string' ? candidate.subtitle : undefined,
      startMinuteOfDay,
      endMinuteOfDay,
      backgroundColor: typeof candidate.backgroundColor === 'string' ? candidate.backgroundColor : undefined,
      borderColor: typeof candidate.borderColor === 'string' ? candidate.borderColor : undefined,
      textColor: typeof candidate.textColor === 'string' ? candidate.textColor : undefined,
      href: typeof candidate.href === 'string' ? candidate.href : undefined,
    }]
  }).sort((left, right) => left.startMinuteOfDay - right.startMinuteOfDay)
}

function normalizeAllDayBlocks(value: unknown): DayScheduleAllDayBlock[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry): DayScheduleAllDayBlock[] => {
    if (!entry || typeof entry !== 'object') return []
    const candidate = entry as Record<string, unknown>
    if (typeof candidate.id !== 'string') return []

    return [{
      id: candidate.id,
      title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title : 'All day',
      subtitle: typeof candidate.subtitle === 'string' ? candidate.subtitle : undefined,
      backgroundColor: typeof candidate.backgroundColor === 'string' ? candidate.backgroundColor : undefined,
      borderColor: typeof candidate.borderColor === 'string' ? candidate.borderColor : undefined,
      textColor: typeof candidate.textColor === 'string' ? candidate.textColor : undefined,
      href: typeof candidate.href === 'string' ? candidate.href : undefined,
    }]
  })
}

function layoutOverlappingBlocks(blocks: DayScheduleBlock[]): RenderedDayScheduleBlock[] {
  const ordered = [...blocks].sort((left, right) => {
    if (left.startMinuteOfDay !== right.startMinuteOfDay) {
      return left.startMinuteOfDay - right.startMinuteOfDay
    }

    return right.endMinuteOfDay - left.endMinuteOfDay
  })
  const laidOut: RenderedDayScheduleBlock[] = []
  let group: DayScheduleBlock[] = []
  let groupEndMinute = -1

  const flushGroup = () => {
    if (group.length === 0) return

    const laneEndMinutes: number[] = []
    const groupBlocks = group.map((block) => {
      let lane = laneEndMinutes.findIndex((endMinute) => endMinute <= block.startMinuteOfDay)
      if (lane === -1) {
        lane = laneEndMinutes.length
      }

      laneEndMinutes[lane] = block.endMinuteOfDay
      return { ...block, lane, laneCount: 1 }
    })
    const laneCount = Math.max(1, laneEndMinutes.length)

    laidOut.push(...groupBlocks.map((block) => ({ ...block, laneCount })))
    group = []
    groupEndMinute = -1
  }

  ordered.forEach((block) => {
    if (group.length > 0 && block.startMinuteOfDay >= groupEndMinute) {
      flushGroup()
    }

    group.push(block)
    groupEndMinute = Math.max(groupEndMinute, block.endMinuteOfDay)
  })

  flushGroup()
  return laidOut
}

export function serializeBlocks(blocks: DayScheduleBlock[]) {
  return blocks.map((block) => ({
    id: block.id,
    title: block.title,
    subtitle: block.subtitle,
    startMinuteOfDay: block.startMinuteOfDay,
    endMinuteOfDay: block.endMinuteOfDay,
    backgroundColor: block.backgroundColor,
    borderColor: block.borderColor,
    textColor: block.textColor,
    href: block.href,
  }))
}

function resolveDayKey(value: string | Date | undefined): string {
  if (value instanceof Date) return getTodayKeyFromDate(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return getTodayKey()
}

function getTodayKeyFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export type DayScheduleGridSurfaceProps = {
  date?: string | Date
  blocks?: unknown
  allDayBlocks?: unknown
  onBlocksChange?: (blocks: DayScheduleBlock[]) => void
  readOnly?: boolean
  startHour?: number
  endHour?: number
  rowHeight?: number
  maxHeight?: number
  headerAccessory?: React.ReactNode
}

export function DayScheduleGridSurface({
  date,
  blocks: rawBlocks = [],
  allDayBlocks: rawAllDayBlocks = [],
  onBlocksChange,
  readOnly = false,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
  rowHeight = DEFAULT_ROW_HEIGHT,
  maxHeight = 650,
  headerAccessory,
}: DayScheduleGridSurfaceProps) {
  const dayStartMinute = startHour * 60
  const dayEndMinute = endHour * 60
  const dayKey = resolveDayKey(date)
  const dateValue = parseDayKey(dayKey)
  const blocks = useMemo(
    () => normalizeBlocks(rawBlocks, dayStartMinute, dayEndMinute),
    [dayEndMinute, dayStartMinute, rawBlocks],
  )
  const renderedBlocks = useMemo(() => layoutOverlappingBlocks(blocks), [blocks])
  const allDayBlocks = useMemo(() => normalizeAllDayBlocks(rawAllDayBlocks), [rawAllDayBlocks])
  const allowedBoundaries = useMemo(() => buildAllowedBoundaries(dayStartMinute, dayEndMinute), [dayEndMinute, dayStartMinute])
  const [dragSelection, setDragSelection] = React.useState<DragSelection | null>(null)
  const slots = Array.from({ length: endHour - startHour }, (_, index) => index)
  const gridHeight = slots.length * rowHeight
  const compactDateHeader = formatCompactDateHeader(dateValue)
  const canEdit = !readOnly && Boolean(onBlocksChange)

  const updateBlocks = (nextBlocks: DayScheduleBlock[]) => {
    onBlocksChange?.(nextBlocks)
  }

  const getMinuteFromPointer = (element: HTMLElement, clientY: number): number => {
    const rect = element.getBoundingClientRect()
    const offsetY = clamp(clientY - rect.top, 0, gridHeight)
    return clamp(dayStartMinute + (offsetY / rowHeight) * 60, dayStartMinute, dayEndMinute)
  }

  const handleGridPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canEdit) return
    if (event.button !== 0) return
    if (event.target !== event.currentTarget) return

    const anchorMinute = snapMinuteToBoundary(getMinuteFromPointer(event.currentTarget, event.clientY), allowedBoundaries, dayStartMinute, dayEndMinute)
    const nextBoundary = getAdjacentBoundary(anchorMinute, allowedBoundaries, 'next') ?? anchorMinute

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragSelection({
      pointerId: event.pointerId,
      anchorMinute,
      currentMinute: nextBoundary,
    })
  }

  const handleGridPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canEdit) return
    if (!dragSelection || dragSelection.pointerId !== event.pointerId) return

    const rawMinute = getMinuteFromPointer(event.currentTarget, event.clientY)
    const snappedMinute = snapMinuteToBoundary(rawMinute, allowedBoundaries, dayStartMinute, dayEndMinute)
    const currentMinute = snappedMinute === dragSelection.anchorMinute
      ? (
          rawMinute < dragSelection.anchorMinute
            ? (getAdjacentBoundary(dragSelection.anchorMinute, allowedBoundaries, 'previous') ?? dragSelection.anchorMinute)
            : (getAdjacentBoundary(dragSelection.anchorMinute, allowedBoundaries, 'next') ?? dragSelection.anchorMinute)
        )
      : snappedMinute

    setDragSelection({
      ...dragSelection,
      currentMinute,
    })
  }

  const finishGridDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canEdit) return
    if (!dragSelection || dragSelection.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const { startMinuteOfDay, endMinuteOfDay } = resolveSelectionBounds(dragSelection, allowedBoundaries)
    setDragSelection(null)

    if (endMinuteOfDay - startMinuteOfDay < MIN_BLOCK_MINUTES) return

    updateBlocks([
      ...blocks,
      {
        id: createBlockId(),
        title: 'New block',
        startMinuteOfDay,
        endMinuteOfDay,
      },
    ])
  }

  const cancelGridDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canEdit) return
    if (!dragSelection || dragSelection.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setDragSelection(null)
  }

  const handleRenameBlock = (block: DayScheduleBlock) => {
    if (!canEdit) return
    const nextTitle = window.prompt('Block title', block.title)
    if (nextTitle === null) return

    updateBlocks(blocks.map((entry) => (
      entry.id === block.id
        ? { ...entry, title: nextTitle.trim() || 'New block' }
        : entry
    )))
  }

  const handleDeleteBlock = (blockId: string) => {
    if (!canEdit) return
    updateBlocks(blocks.filter((block) => block.id !== blockId))
  }

  return (
      <div
        style={{
          maxHeight,
          overflowY: 'auto',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '72px minmax(0, 1fr)',
            minWidth: 420,
          }}
        >
          <div
            style={{
              minHeight: 48,
              borderRight: '1px solid #e8eaed',
              borderBottom: '1px solid #e8eaed',
              background: '#fff',
            }}
          />
          <div
            style={{
              minHeight: 48,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '8px 12px',
              borderBottom: '1px solid #e8eaed',
              color: '#3c4043',
              fontSize: 11,
              fontWeight: 650,
              letterSpacing: 0.4,
            }}
          >
            <span>{compactDateHeader}</span>
            {headerAccessory ? (
              <span style={{ marginLeft: 10, color: '#70757a', fontWeight: 600 }}>
                {headerAccessory}
              </span>
            ) : null}
          </div>

          {allDayBlocks.length > 0 ? (
            <>
              <div
                style={{
                  minHeight: 32,
                  padding: '8px 10px 0 0',
                  boxSizing: 'border-box',
                  textAlign: 'right',
                  color: '#70757a',
                  fontSize: 11,
                  borderRight: '1px solid #e8eaed',
                  borderBottom: '1px solid #e8eaed',
                }}
              >
                All day
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minHeight: 32,
                  padding: '5px 12px 6px 8px',
                  borderBottom: '1px solid #e8eaed',
                  boxSizing: 'border-box',
                }}
              >
                {allDayBlocks.map((block) => (
                  <div
                    key={block.id}
                    style={{
                      minHeight: 22,
                      borderRadius: 6,
                      border: `1px solid ${block.borderColor ?? block.backgroundColor ?? DEFAULT_BLOCK_BORDER}`,
                      background: block.backgroundColor ?? DEFAULT_BLOCK_BACKGROUND,
                      color: block.textColor ?? DEFAULT_BLOCK_TEXT,
                      padding: '4px 8px',
                      boxSizing: 'border-box',
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={`${block.title}${block.subtitle ? ` · ${block.subtitle}` : ''}`}
                    data-testid="day-schedule-all-day-block"
                  >
                    {block.title}
                    {block.subtitle ? ` · ${block.subtitle}` : ''}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div>
            {slots.map((slot) => (
              <div
                key={slot}
                style={{
                  height: rowHeight,
                  padding: '4px 10px 0 0',
                  boxSizing: 'border-box',
                  textAlign: 'right',
                  color: '#70757a',
                  fontSize: 11,
                  borderRight: '1px solid #e8eaed',
                }}
              >
                {formatSlotLabel(slot, startHour)}
              </div>
            ))}
          </div>

          <div
            onPointerDown={handleGridPointerDown}
            onPointerMove={handleGridPointerMove}
            onPointerUp={finishGridDrag}
            onPointerCancel={cancelGridDrag}
            style={{
              position: 'relative',
              height: gridHeight,
              backgroundImage: `linear-gradient(to bottom, #e8eaed 1px, transparent 1px)`,
              backgroundSize: `100% ${rowHeight}px`,
              cursor: canEdit ? 'crosshair' : 'default',
              touchAction: 'none',
            }}
          >
            {dragSelection ? (() => {
              const { startMinuteOfDay, endMinuteOfDay } = resolveSelectionBounds(dragSelection, allowedBoundaries)
              const top = minuteToTop(startMinuteOfDay, dayStartMinute, rowHeight)
              const height = Math.max(6, minuteToTop(endMinuteOfDay, dayStartMinute, rowHeight) - top)

              return (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 8,
                    right: 12,
                    top: top + 2,
                    height: height - 4,
                    borderRadius: 6,
                    border: '1px solid rgba(26, 115, 232, 0.5)',
                    background: 'rgba(26, 115, 232, 0.14)',
                    pointerEvents: 'none',
                  }}
                />
              )
            })() : null}
            {renderedBlocks.map((block) => {
              const top = minuteToTop(block.startMinuteOfDay, dayStartMinute, rowHeight)
              const height = Math.max(26, minuteToTop(block.endMinuteOfDay, dayStartMinute, rowHeight) - top)
              const laneWidth = 100 / block.laneCount

              return (
                <div
                  key={block.id}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDoubleClick={canEdit ? () => handleRenameBlock(block) : undefined}
                  data-testid="day-schedule-block"
                  style={{
                    position: 'absolute',
                    left: `calc(${block.lane * laneWidth}% + 8px)`,
                    width: `calc(${laneWidth}% - 20px)`,
                    top: top + 2,
                    height: height - 4,
                    borderRadius: 6,
                    border: `1px solid ${block.borderColor ?? block.backgroundColor ?? DEFAULT_BLOCK_BORDER}`,
                    background: block.backgroundColor ?? DEFAULT_BLOCK_BACKGROUND,
                    color: block.textColor ?? DEFAULT_BLOCK_TEXT,
                    boxShadow: '0 1px 2px rgba(60, 64, 67, 0.2)',
                    padding: '6px 8px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    cursor: canEdit ? 'default' : 'inherit',
                  }}
                  title={`${block.title} · ${block.subtitle ?? `${formatMinuteLabel(block.startMinuteOfDay)} - ${formatMinuteLabel(block.endMinuteOfDay)}`}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {block.title}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 10, opacity: 0.92 }}>
                        {block.subtitle ?? `${formatMinuteLabel(block.startMinuteOfDay)} - ${formatMinuteLabel(block.endMinuteOfDay)}`}
                      </div>
                    </div>
                    {canEdit ? (
                      <button
                        type="button"
                        aria-label={`Delete ${block.title}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteBlock(block.id)
                        }}
                        style={{
                          flex: '0 0 auto',
                          border: 0,
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: '#fff',
                          width: 20,
                          height: 20,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 14,
                          lineHeight: 1,
                          cursor: 'pointer',
                        }}
                      >
                        x
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
  )
}

type DayScheduleNodeSurfaceProps = DayScheduleGridSurfaceProps & {
  style?: React.CSSProperties
  dataTestId?: string
}

export const dayNodeSurfaceStyle: React.CSSProperties = {
  width: '100%',
  margin: '16px 0',
  border: '1px solid #dadce0',
  borderRadius: 8,
  overflow: 'hidden',
  background: '#fff',
  boxShadow: '0 1px 2px rgba(60, 64, 67, 0.08)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

export function DayScheduleNodeSurface({
  style,
  dataTestId = 'day-schedule-node',
  ...surfaceProps
}: DayScheduleNodeSurfaceProps) {
  const dayKey = resolveDayKey(surfaceProps.date)

  return (
    <section
      data-type="day"
      data-date={dayKey}
      data-testid={dataTestId}
      style={{
        ...dayNodeSurfaceStyle,
        ...style,
      }}
    >
      <DayScheduleGridSurface {...surfaceProps} />
    </section>
  )
}
