export type ParsedTemporalEntityKind = 'date' | 'time'

export type TimepointAttrs = {
  id: string
  label: string
  'data-date': string
  'data-formatted': string
  'data-relative-label': string
}

export type ParsedTemporalEntity = {
  kind: ParsedTemporalEntityKind
  text: string
  start: number
  end: number
  confidence: number
  groupId?: string
  attrs: TimepointAttrs
}

const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAY_PATTERN = '(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)'
const MONTH_PATTERN = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|')

const DAY_MONTH_PATTERN = new RegExp(
  `\\b(?:(?:${WEEKDAY_PATTERN})\\s*,?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_PATTERN})(?:,?\\s+(\\d{2,4}))?\\b`,
  'gi',
)

const MONTH_DAY_PATTERN = new RegExp(
  `\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{2,4}))?\\b`,
  'gi',
)

const TIME_WITH_MERIDIEM_PATTERN = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=$|[\s,.;:!?)]|$)/gi
const TIME_24_HOUR_PATTERN = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g
/** "1:15–2:45 PM", "6-6:30pm", "10 to 11 am": the start has no meridiem of its own and takes the end's. */
const TIME_RANGE_SHARED_MERIDIEM_PATTERN = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(?:[–—-]|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=$|[\s,.;:!?)]|$)/gi

const normalizeYear = (rawYear: string | undefined, month: number, day: number, referenceDate: Date): number => {
  if (rawYear) {
    const parsed = Number.parseInt(rawYear, 10)
    if (rawYear.length === 2) return parsed < 50 ? 2000 + parsed : 1900 + parsed
    return parsed
  }

  const currentYear = referenceDate.getFullYear()
  const candidate = new Date(currentYear, month, day)
  return candidate < referenceDate ? currentYear + 1 : currentYear
}

const isValidDateParts = (year: number, month: number, day: number): boolean => {
  if (year < 1900 || year > 2200 || month < 0 || month > 11 || day < 1 || day > 31) return false
  const candidate = new Date(year, month, day)
  return candidate.getFullYear() === year && candidate.getMonth() === month && candidate.getDate() === day
}

const formatDateLabel = (date: Date): string => (
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
)

const formatTimeLabel = (date: Date): string => (
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: date.getMinutes() > 0 ? '2-digit' : undefined,
    hour12: true,
  })
)

export const buildDateTimepointAttrs = (date: Date): TimepointAttrs => {
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const formatted = formatDateLabel(date)

  return {
    id: `timepoint:date-${year}-${month + 1}-${day}`,
    label: `📅 ${formatted}`,
    'data-date': date.toISOString(),
    'data-formatted': formatted,
    'data-relative-label': formatted,
  }
}

export const buildTimeTimepointAttrs = (date: Date): TimepointAttrs => {
  const hour = date.getHours()
  const minute = date.getMinutes()
  const formatted = formatTimeLabel(date)

  return {
    id: `timepoint:time-${hour}-${minute}`,
    label: `🕐 ${formatted}`,
    'data-date': date.toISOString(),
    'data-formatted': formatted,
    'data-relative-label': formatted,
  }
}

const rangesOverlap = (a: Pick<ParsedTemporalEntity, 'start' | 'end'>, b: Pick<ParsedTemporalEntity, 'start' | 'end'>): boolean => (
  a.start < b.end && a.end > b.start
)

const appendDateEntity = (
  entities: ParsedTemporalEntity[],
  text: string,
  start: number,
  end: number,
  day: number,
  monthName: string,
  rawYear: string | undefined,
  referenceDate: Date,
) => {
  const month = MONTHS[monthName.toLocaleLowerCase()]
  if (month === undefined) return

  const year = normalizeYear(rawYear, month, day, referenceDate)
  if (!isValidDateParts(year, month, day)) return

  const date = new Date(year, month, day)
  entities.push({
    kind: 'date',
    text: text.slice(start, end),
    start,
    end,
    confidence: rawYear ? 0.98 : 0.82,
    attrs: buildDateTimepointAttrs(date),
  })
}

const collectDateEntities = (text: string, referenceDate: Date): ParsedTemporalEntity[] => {
  const entities: ParsedTemporalEntity[] = []

  for (const match of text.matchAll(DAY_MONTH_PATTERN)) {
    const start = match.index ?? -1
    if (start < 0) continue
    const day = Number.parseInt(match[1], 10)
    appendDateEntity(entities, text, start, start + match[0].length, day, match[2], match[3], referenceDate)
  }

  for (const match of text.matchAll(MONTH_DAY_PATTERN)) {
    const start = match.index ?? -1
    if (start < 0) continue
    const day = Number.parseInt(match[2], 10)
    appendDateEntity(entities, text, start, start + match[0].length, day, match[1], match[3], referenceDate)
  }

  return entities
}

const parseMeridiemTime = (hourValue: number, minuteValue: number, meridiem: string): { hour: number; minute: number } | null => {
  if (minuteValue < 0 || minuteValue > 59) return null
  if (hourValue < 1 || hourValue > 12) return null

  const normalizedMeridiem = meridiem.toLocaleLowerCase().replace(/\./g, '')
  let hour = hourValue
  if (normalizedMeridiem === 'pm' && hour !== 12) hour += 12
  if (normalizedMeridiem === 'am' && hour === 12) hour = 0

  return { hour, minute: minuteValue }
}

const findNearestDateEntity = (
  timeStart: number,
  timeEnd: number,
  dateEntities: ParsedTemporalEntity[],
): ParsedTemporalEntity | null => {
  const nearby = dateEntities
    .map((entity) => ({
      entity,
      gap: entity.end <= timeStart ? timeStart - entity.end : entity.start - timeEnd,
    }))
    .filter((entry) => entry.gap >= 0 && entry.gap <= 48)
    .sort((a, b) => a.gap - b.gap)

  return nearby[0]?.entity || null
}

const dateFromDateEntity = (entity: ParsedTemporalEntity): Date => {
  const date = new Date(entity.attrs['data-date'])
  return Number.isNaN(date.getTime()) ? new Date() : date
}

const buildTimeEntity = (
  text: string,
  start: number,
  end: number,
  hour: number,
  minute: number,
  referenceDate: Date,
  dateEntities: ParsedTemporalEntity[],
): ParsedTemporalEntity => {
  const nearestDateEntity = findNearestDateEntity(start, end, dateEntities)
  const anchorDate = nearestDateEntity ? dateFromDateEntity(nearestDateEntity) : referenceDate
  const date = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate(),
    hour,
    minute,
    0,
  )
  const groupId = nearestDateEntity
    ? `temporal:${Math.min(start, nearestDateEntity.start)}:${Math.max(end, nearestDateEntity.end)}`
    : undefined

  if (groupId && !nearestDateEntity.groupId) {
    nearestDateEntity.groupId = groupId
  }

  return {
    kind: 'time',
    text: text.slice(start, end),
    start,
    end,
    confidence: 0.96,
    groupId,
    attrs: buildTimeTimepointAttrs(date),
  }
}

const collectTimeEntities = (
  text: string,
  referenceDate: Date,
  dateEntities: ParsedTemporalEntity[],
): ParsedTemporalEntity[] => {
  const entities: ParsedTemporalEntity[] = []

  // Range starts first, so the 24-hour pass below cannot read "1:15" in
  // "1:15–2:45 PM" as 01:15. A start later than its end on the clock, as in
  // "11–1 PM", belongs to the other half of the day.
  for (const match of text.matchAll(TIME_RANGE_SHARED_MERIDIEM_PATTERN)) {
    const start = match.index ?? -1
    if (start < 0) continue
    const startHour = Number.parseInt(match[1], 10)
    const startMinute = match[2] ? Number.parseInt(match[2], 10) : 0
    const endHour = Number.parseInt(match[3], 10)
    const endMinute = match[4] ? Number.parseInt(match[4], 10) : 0
    const meridiem = match[5].toLocaleLowerCase().replace(/\./g, '')
    const startsAfterEnd = startHour * 60 + startMinute > endHour * 60 + endMinute
    const startMeridiem = startsAfterEnd ? (meridiem === 'pm' ? 'am' : 'pm') : meridiem
    const parsed = parseMeridiemTime(startHour, startMinute, startMeridiem)
    if (!parsed) continue
    const startText = `${match[1]}${match[2] ? match[0].charAt(match[1].length) + match[2] : ''}`

    entities.push(buildTimeEntity(
      text,
      start,
      start + startText.length,
      parsed.hour,
      parsed.minute,
      referenceDate,
      dateEntities,
    ))
  }

  for (const match of text.matchAll(TIME_WITH_MERIDIEM_PATTERN)) {
    const start = match.index ?? -1
    if (start < 0) continue
    const hourValue = Number.parseInt(match[1], 10)
    const minuteValue = match[2] ? Number.parseInt(match[2], 10) : 0
    const parsed = parseMeridiemTime(hourValue, minuteValue, match[3])
    if (!parsed) continue
    if (entities.some((entity) => rangesOverlap(entity, { start, end: start + match[0].length }))) continue

    entities.push(buildTimeEntity(
      text,
      start,
      start + match[0].length,
      parsed.hour,
      parsed.minute,
      referenceDate,
      dateEntities,
    ))
  }

  for (const match of text.matchAll(TIME_24_HOUR_PATTERN)) {
    const start = match.index ?? -1
    if (start < 0) continue
    const end = start + match[0].length
    if (entities.some((entity) => rangesOverlap(entity, { start, end }))) continue

    entities.push(buildTimeEntity(
      text,
      start,
      end,
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10),
      referenceDate,
      dateEntities,
    ))
  }

  return entities
}

export const parseTemporalEntities = (
  text: string,
  referenceDate: Date = new Date(),
): ParsedTemporalEntity[] => {
  const dateEntities = collectDateEntities(text, referenceDate)
    .sort((a, b) => (b.confidence - a.confidence) || (b.end - b.start) - (a.end - a.start))
    .reduce<ParsedTemporalEntity[]>((accepted, candidate) => {
      if (!accepted.some((entity) => rangesOverlap(entity, candidate))) {
        accepted.push(candidate)
      }
      return accepted
    }, [])

  const timeEntities = collectTimeEntities(text, referenceDate, dateEntities)
  return [...dateEntities, ...timeEntities].sort((a, b) => a.start - b.start)
}

