'use client'

import './styles.scss'
import React from 'react'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { EditorContent, Extensions, JSONContent, Editor, useEditor, Content, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import FontFamily from '@tiptap/extension-font-family'
import { TextStyle } from '@tiptap/extension-text-style'
import Image from '@/components/tiptap-node/image-node/image-node-extension'
import { MapboxMapExtension } from './MapboxMapExtension'
import { ExcalidrawExtension } from './ExcalidrawExtension'
import Heading from '@tiptap/extension-heading'
import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
import Snapshot from '@tiptap-pro/extension-snapshot'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import UniqueID from '@tiptap/extension-unique-id'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import js from 'highlight.js/lib/languages/javascript'
import { throttle } from 'lodash'
import { QuantaClass, QuantaType, TextSectionLens, RichTextT } from '../../core/Model'
import { createLowlight } from 'lowlight'
import { GroupExtension } from '../structure/GroupTipTapExtension'
import { MathExtension } from './MathTipTapExtension'
import TextAlign from '@tiptap/extension-text-align'
import { DocumentFlowMenu, FlowMenu } from '../structure/FlowMenu'
import { observer } from 'mobx-react-lite'
import { QuantaStoreContext } from '../../backend/QuantaStore'
import { FontSize } from './FontSizeTipTapExtension'
import { mentionSuggestionOptions } from './TagTipTapExtension'
import { CalculationExtension } from './CalculationTipTapExtension'
import { FadeIn } from './FadeInExtension'
import { CustomMention } from './Mention'
import { TemporalFieldExtension, TimePointNode } from './TimePointMention'
import { PomodoroNode } from './PomodoroNode'
import { DurationExtension, DurationBadgeNode } from './DurationMention'
import { LocationMention, LocationNode } from './LocationMention'
import { HashtagMention, HashtagNode } from './HashtagMention'
import { MeritDemeritMention, MeritDemeritNode } from './MeritDemeritMention'
import { AuraMention, AuraNode } from './AuraMention'
import { TodoMention, TodoMentionNode } from './TodoMention'
import { ToNotDoMention, ToNotDoMentionNode } from './ToNotDoMention'
import { QuestionMention, QuestionMentionNode } from './QuestionMention'
import { MotivationsMention, MotivationsMentionNode } from './MotivationsMention'
import { CustomLink } from './Link'
import { KeyValuePairExtension } from '../structure/KeyValuePairTipTapExtensions'
import { QuoteExtension } from '../structure/QuoteTipTapExtension'
import { MessageExtension } from './MessageExtension'
import { ConversationExtension } from '../structure/ConversationExtension'
// LocationExtension removed - using LocationNode from LocationMention.tsx instead (supports pin emoji)
import { CommentExtension } from '../structure/CommentTipTapExtension'
import { PortalExtension } from '../structure/PortalExtension'
import { ScrollViewExtension } from '../structure/ScrollViewExtension'
import { generateUniqueID } from '../../utils/utils'
import { issue123DocumentState } from '../../../bugs/issue-123'
import { ExperimentalPortalExtension } from '../structure/ExperimentalPortalExtension'
import { ExternalPortalExtension } from '../structure/ExternalPortalExtension'
import { WarningExtension } from '../structure/WarningTipTapExtension'
import { LifemapCardExtension, SingleLifemapCardExtension } from '../structure/LifemapCardExtension'
import { QuantaFlowExtension } from '../structure/QuantaFlowExtension'
import { CalendarExtension } from '../structure/CalendarExtension'
import { DailyExtension, DailyYesterday, DailyToday, DailyTomorrow } from '../structure/DailyExtension'
import { WeeklyExtension, WeeklyQuantaExtension, LunarScheduleExtension, SeasonalScheduleExtension } from '../structure/WeeklyExtension'
import { LunarMonthExtension } from '../structure/LunarMonthExtension'
import { DayHeaderExtension, DayHeaderTasks, DayHeaderInsights, DayHeaderObservations } from '../structure/DayHeaderExtension'
import { TemporalSpaceExtension } from '../structure/TemporalSpaceExtension'
import { TemporalOrderExtension } from '../structure/TemporalOrderExtension'
import { TemporalDailyExtension } from '../structure/TemporalDailyExtension'
import { TrendsExtension } from '../structure/TrendsExtension'
import { LifetimeViewExtension } from '../structure/LifetimeViewExtension'
import { WeatherExtension } from '../structure/WeatherExtension'
import { Canvas3DExtension } from '../structure/Canvas3DExtension'
import { SlashMenuExtension } from '../structure/SlashMenuExtension'
import { SpanGroupMark } from './SpanGroupMark'
// NodeConnectionManager handles connections between all connectable elements using Rough.js for hand-drawn arrows
import { NodeConnectionManager } from './NodeConnectionManager'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { BulletList, ListItem, ListKeymap, OrderedList, TaskItem, TaskList } from '@tiptap/extension-list'
import { Focus, Gapcursor, Placeholder } from '@tiptap/extensions'
import { FocusModePlugin } from '../plugins/FocusModePlugin'
import { DocumentAttributeExtension, DocumentAttributes, defaultDocumentAttributes } from '../structure/DocumentAttributesExtension'
import { motion } from 'framer-motion'
import { SalesGuideTemplate } from './SalesGuideTemplate'
import { getDailyScheduleTemplate } from './DailyScheduleTemplate'
import { getLifeMappingMainTemplate } from './LifeMappingMainTemplate'
import { Plugin, Transaction } from 'prosemirror-state'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { TiptapTransformer } from '@hocuspocus/transformer'

// Template quanta ID - this is the editable template in the Daily carousel
// When empty, it will be initialized from the hardcoded TEMPLATE_SCHEMA in DailyScheduleTemplate.ts
const DAILY_TEMPLATE_QUANTA_ID = 'daily-schedule-template'
// Period source-of-truth quanta for daily recurring content
const PERIOD_DAILY_QUANTA_ID = 'period-daily'
const PERIOD_WEEKLY_QUANTA_ID = 'period-weekly'
const PERIOD_MONTHLY_QUANTA_ID = 'period-monthly'
const NEW_DAILY_SCHEDULES_KEY = 'newDailySchedules'
const LONG_TERM_THIS_WEEK_QUANTA_ID = 'long-term-this-week'
const LONG_TERM_THIS_MONTH_QUANTA_ID = 'long-term-this-month'
// Life Mapping Main quanta ID - when empty, initialized with LifeMappingMainTemplate
const LIFE_MAPPING_MAIN_QUANTA_ID = 'life-mapping-main'
const TEMPORAL_MATERIALIZATION_PARAM = 'temporalMaterialization'
const LONG_TERM_TEMPORAL_MATERIALIZATION_MODE = 'long-term-v1'
const LONG_TERM_TEMPORAL_MATERIALIZATION_VERSION = '2026-02-11'
const TEMPORAL_MATERIALIZATION_META_KEY_PREFIX = 'temporalMaterializationMeta'
const QUANTA_SCALE_MEASURE_INTERVAL_MS = 250
const QUANTA_SCALE_CHANGE_EPSILON = 0.015
const QUANTA_MIN_VISUAL_SCALE = 0.25
const QUANTA_MAX_VISUAL_SCALE = 4
const QUANTA_MAX_FONT_COMPENSATION = 3
const QUANTA_FONT_COMPENSATION_EXPONENT = 0.65

interface TemporalMaterializationPlan {
  sourceQuantaIds: string[]
  resolveTokensForDate?: Date
  fallbackTemplate?: 'daily'
}

interface TemporalMaterializationMeta {
  version: string
  mode: string
  status: 'seeded' | 'existing'
  updatedAt: string
  sourceQuantaIds: string[]
}

const DAILY_SLUG_REGEX = /^daily-(\d{4})-(\d{2})-(\d{2})$/

const buildTemporalMaterializationMetaKey = (params: { mode: string; userId?: string | null; quantaId: string }): string => {
  const scope = params.userId?.trim() || 'legacy'
  return `${TEMPORAL_MATERIALIZATION_META_KEY_PREFIX}:${params.mode}:${scope}:${params.quantaId}`
}

const readTemporalMaterializationMeta = (key: string): TemporalMaterializationMeta | null => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TemporalMaterializationMeta
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

const writeTemporalMaterializationMeta = (key: string, meta: TemporalMaterializationMeta) => {
  localStorage.setItem(key, JSON.stringify(meta))
}

const parseDailySlugDate = (slug: string): Date | null => {
  const match = slug.match(DAILY_SLUG_REGEX)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

const resolveLongTermTemporalMaterializationPlan = (quantaId: string): TemporalMaterializationPlan | null => {
  if (quantaId === LONG_TERM_THIS_WEEK_QUANTA_ID) {
    return {
      sourceQuantaIds: [PERIOD_WEEKLY_QUANTA_ID],
    }
  }

  if (quantaId === LONG_TERM_THIS_MONTH_QUANTA_ID) {
    return {
      sourceQuantaIds: [PERIOD_MONTHLY_QUANTA_ID],
    }
  }

  const dailyDate = parseDailySlugDate(quantaId)
  if (!dailyDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday =
    dailyDate.getFullYear() === today.getFullYear() &&
    dailyDate.getMonth() === today.getMonth() &&
    dailyDate.getDate() === today.getDate()
  if (!isToday) return null

  return {
    sourceQuantaIds: [PERIOD_DAILY_QUANTA_ID],
    resolveTokensForDate: dailyDate,
    fallbackTemplate: 'daily',
  }
}

const cloneJsonContent = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const buildTemporalMergeSignature = (node: JSONContent): string => {
  const clonedNode = cloneJsonContent(node)
  if (clonedNode.attrs && typeof clonedNode.attrs === 'object') {
    const attrs = { ...(clonedNode.attrs as Record<string, unknown>) }
    delete attrs['data-temporal-origin']
    delete attrs['data-temporal-source']
    if (Object.keys(attrs).length === 0) {
      delete clonedNode.attrs
    } else {
      clonedNode.attrs = attrs
    }
  }
  return JSON.stringify(clonedNode)
}

const mergeTemporalMaterializationSources = (
  sources: Array<{ sourceQuantaId: string; content: JSONContent }>,
): JSONContent | null => {
  const mergedContent: JSONContent[] = []
  const seenOriginKeys = new Set<string>()

  for (const source of sources) {
    const normalized = source.content.type === 'doc'
      ? cloneJsonContent(source.content)
      : ({ type: 'doc', content: [cloneJsonContent(source.content)] } as JSONContent)
    const topLevelNodes = Array.isArray(normalized.content) ? normalized.content : []

    topLevelNodes.forEach((node, index) => {
      const originKey = `${source.sourceQuantaId}:top:${index}`
      if (seenOriginKeys.has(originKey)) return
      seenOriginKeys.add(originKey)

      const clonedNode = cloneJsonContent(node)
      const attrs =
        clonedNode.attrs && typeof clonedNode.attrs === 'object'
          ? { ...(clonedNode.attrs as Record<string, unknown>) }
          : {}
      attrs['data-temporal-origin'] = attrs['data-temporal-origin'] ?? originKey
      attrs['data-temporal-source'] = source.sourceQuantaId
      clonedNode.attrs = attrs
      mergedContent.push(clonedNode)
    })
  }

  if (mergedContent.length === 0) return null
  return { type: 'doc', content: mergedContent }
}

const mergeTemporalMaterializationIntoExistingDoc = (
  existingContent: JSONContent,
  materializedContent: JSONContent,
): { content: JSONContent; addedCount: number } => {
  const existingDoc = existingContent.type === 'doc'
    ? cloneJsonContent(existingContent)
    : ({ type: 'doc', content: [cloneJsonContent(existingContent)] } as JSONContent)
  const materializedDoc = materializedContent.type === 'doc'
    ? cloneJsonContent(materializedContent)
    : ({ type: 'doc', content: [cloneJsonContent(materializedContent)] } as JSONContent)

  const existingTopLevel = Array.isArray(existingDoc.content) ? existingDoc.content : []
  const materializedTopLevel = Array.isArray(materializedDoc.content) ? materializedDoc.content : []
  const existingOrigins = new Set<string>()
  const existingSignatures = new Set<string>()

  existingTopLevel.forEach((node) => {
    const attrs = node.attrs as Record<string, unknown> | undefined
    const origin = attrs?.['data-temporal-origin']
    if (typeof origin === 'string' && origin.length > 0) {
      existingOrigins.add(origin)
    }
    existingSignatures.add(buildTemporalMergeSignature(node))
  })

  const additions: JSONContent[] = []
  materializedTopLevel.forEach((node, index) => {
    const attrs = node.attrs as Record<string, unknown> | undefined
    const origin = typeof attrs?.['data-temporal-origin'] === 'string'
      ? (attrs?.['data-temporal-origin'] as string)
      : `temporal:auto:${index}`
    const signature = buildTemporalMergeSignature(node)
    if (existingOrigins.has(origin) || existingSignatures.has(signature)) return
    existingOrigins.add(origin)
    existingSignatures.add(signature)
    additions.push(cloneJsonContent(node))
  })

  if (additions.length === 0) {
    return { content: existingDoc, addedCount: 0 }
  }

  existingDoc.content = [...additions, ...existingTopLevel]
  return { content: existingDoc, addedCount: additions.length }
}

const dedupeTopLevelTemporalMaterializationBlocks = (
  content: JSONContent,
): { content: JSONContent; removedCount: number } => {
  const normalizedDoc = content.type === 'doc'
    ? cloneJsonContent(content)
    : ({ type: 'doc', content: [cloneJsonContent(content)] } as JSONContent)
  const topLevel = Array.isArray(normalizedDoc.content) ? normalizedDoc.content : []

  const deduped: JSONContent[] = []
  const seenTemporalKeys = new Set<string>()
  let removedCount = 0

  topLevel.forEach((node) => {
    const attrs = node.attrs as Record<string, unknown> | undefined
    const temporalOrigin = typeof attrs?.['data-temporal-origin'] === 'string'
      ? (attrs['data-temporal-origin'] as string)
      : ''

    if (!temporalOrigin) {
      deduped.push(node)
      return
    }

    const signature = buildTemporalMergeSignature(node)
    const dedupeKey = `${temporalOrigin}::${signature}`
    if (seenTemporalKeys.has(dedupeKey)) {
      removedCount += 1
      return
    }

    seenTemporalKeys.add(dedupeKey)
    deduped.push(node)
  })

  normalizedDoc.content = deduped
  return { content: normalizedDoc, removedCount }
}

// ============================================================================
// Period Quanta Templates
// ============================================================================
// Architecture: Each recurring period from TimePointMention.tsx gets a dedicated
// Quanta at /q/period-{slug}. When opened empty for the first time, it is
// initialized with a paragraph containing the corresponding TimePoint mention
// so the document is immediately tagged with its period identity.
//
// The slug-to-timepoint mapping must stay in sync with the PERIOD_GROUPS
// definition in /app/periods/page.tsx and the IDs in TimePointMention.tsx.

interface PeriodTimepointMapping {
  timepointId: string
  label: string
  formatted: string
}

type PeriodGroupKey = 'daily' | 'weekly' | 'weekday' | 'lunar' | 'monthly' | 'season-abstract' | 'seasonally' | 'season-marker' | null

const PERIOD_SLUG_TO_TIMEPOINT: Record<string, PeriodTimepointMapping> = {
  // Daily
  'daily': { timepointId: 'timepoint:daily', label: '\u{1F4C6} Daily', formatted: 'Daily' },
  // Weekly
  'weekly': { timepointId: 'timepoint:weekly', label: '\u{1F5D3}\uFE0F Weekly', formatted: 'Weekly' },
  // Monthly
  'monthly': { timepointId: 'timepoint:monthly', label: '\u{1F5D3}\uFE0F Monthly', formatted: 'Monthly' },
  // Weekdays
  'weekday-monday': { timepointId: 'timepoint:weekday-monday', label: '\u{1F4C5} Mondays', formatted: 'Mondays' },
  'weekday-tuesday': { timepointId: 'timepoint:weekday-tuesday', label: '\u{1F4C5} Tuesdays', formatted: 'Tuesdays' },
  'weekday-wednesday': { timepointId: 'timepoint:weekday-wednesday', label: '\u{1F4C5} Wednesdays', formatted: 'Wednesdays' },
  'weekday-thursday': { timepointId: 'timepoint:weekday-thursday', label: '\u{1F4C5} Thursdays', formatted: 'Thursdays' },
  'weekday-friday': { timepointId: 'timepoint:weekday-friday', label: '\u{1F4C5} Fridays', formatted: 'Fridays' },
  'weekday-saturday': { timepointId: 'timepoint:weekday-saturday', label: '\u{1F4C5} Saturdays', formatted: 'Saturdays' },
  'weekday-sunday': { timepointId: 'timepoint:weekday-sunday', label: '\u{1F4C5} Sundays', formatted: 'Sundays' },
  // Lunar Phases
  'lunar-new-moons': { timepointId: 'lunar:abstract:new-moons', label: '\u{1F311} New Moons', formatted: 'New Moons' },
  'lunar-first-quarters': { timepointId: 'lunar:abstract:first-quarters', label: '\u{1F313} First Quarters', formatted: 'First Quarters' },
  'lunar-full-moons': { timepointId: 'lunar:abstract:full-moons', label: '\u{1F315} Full Moons', formatted: 'Full Moons' },
  'lunar-last-quarters': { timepointId: 'lunar:abstract:last-quarters', label: '\u{1F317} Last Quarters', formatted: 'Last Quarters' },
  // Seasons
  'season-spring': { timepointId: 'timepoint:season-abstract-spring', label: '\u{1F338} Springs', formatted: 'Springs' },
  'season-summer': { timepointId: 'timepoint:season-abstract-summer', label: '\u2600\uFE0F Summers', formatted: 'Summers' },
  'season-autumn': { timepointId: 'timepoint:season-abstract-autumn', label: '\u{1F342} Autumns', formatted: 'Autumns' },
  'season-winter': { timepointId: 'timepoint:season-abstract-winter', label: '\u2744\uFE0F Winters', formatted: 'Winters' },
  // Seasonally
  'seasonally': { timepointId: 'timepoint:seasonally', label: '\u{1F341} Seasonally', formatted: 'Seasonally' },
  // Seasonal Markers (Equinoxes and Solstices)
  'marker-spring-equinox': { timepointId: 'timepoint:season-marker-spring-equinox', label: '\u{1F337} Spring Equinox', formatted: 'Spring Equinox' },
  'marker-summer-solstice': { timepointId: 'timepoint:season-marker-summer-solistice', label: '\u{1F31E} Summer Solistice', formatted: 'Summer Solistice' },
  'marker-autumn-equinox': { timepointId: 'timepoint:season-marker-autumn-equinox', label: '\u{1F341} Autumn Equinox', formatted: 'Autumn Equinox' },
  'marker-winter-solstice': { timepointId: 'timepoint:season-marker-winter-solistice', label: '\u2744\uFE0F Winter Solistice', formatted: 'Winter Solistice' },
}

const getPeriodGroupKeyForTimepointId = (timepointId: string): PeriodGroupKey => {
  if (timepointId === 'timepoint:daily') return 'daily'
  if (timepointId === 'timepoint:weekly') return 'weekly'
  if (timepointId.startsWith('timepoint:weekday-')) return 'weekday'
  if (timepointId.startsWith('lunar:abstract:')) return 'lunar'
  if (timepointId === 'timepoint:monthly') return 'monthly'
  if (timepointId.startsWith('timepoint:season-abstract-')) return 'season-abstract'
  if (timepointId === 'timepoint:seasonally') return 'seasonally'
  if (timepointId.startsWith('timepoint:season-marker-')) return 'season-marker'
  return null
}

const getPeriodTimepointNode = (mapping: PeriodTimepointMapping): JSONContent => ({
  type: 'timepoint',
  attrs: {
    id: mapping.timepointId,
    label: mapping.label,
    'data-date': '',
    'data-formatted': mapping.formatted,
    'data-relative-label': mapping.formatted,
  },
})

interface PeriodTagInvariantResult {
  normalizedContent: JSONContent
  changed: boolean
  removedCount: number
  addedCanonicalTag: boolean
}

/**
 * Invariant for period documents:
 * exactly one timepoint tag must exist for the period's own group.
 */
const enforceSingleTagPerPeriodGroup = (
  content: JSONContent,
  mapping: PeriodTimepointMapping,
): PeriodTagInvariantResult => {
  const expectedGroup = getPeriodGroupKeyForTimepointId(mapping.timepointId)
  if (!expectedGroup) {
    return {
      normalizedContent: content,
      changed: false,
      removedCount: 0,
      addedCanonicalTag: false,
    }
  }

  let changed = false
  let removedCount = 0
  let canonicalCount = 0

  const normalizeNode = (node: JSONContent): JSONContent | null => {
    const normalizedNode: JSONContent = { ...node }

    if (normalizedNode.type === 'timepoint') {
      const attrs = (normalizedNode.attrs as Record<string, unknown> | undefined) ?? {}
      const nodeId = typeof attrs.id === 'string' ? attrs.id : ''
      const nodeGroup = getPeriodGroupKeyForTimepointId(nodeId)

      if (nodeGroup === expectedGroup) {
        if (nodeId !== mapping.timepointId) {
          changed = true
          removedCount += 1
          return null
        }

        canonicalCount += 1
        if (canonicalCount > 1) {
          changed = true
          removedCount += 1
          return null
        }
      }
    }

    if (Array.isArray(node.content)) {
      const normalizedChildren: JSONContent[] = []
      for (const child of node.content) {
        const normalizedChild = normalizeNode(child)
        if (normalizedChild) normalizedChildren.push(normalizedChild)
      }
      normalizedNode.content = normalizedChildren
    }

    return normalizedNode
  }

  const normalizedRoot = normalizeNode(content) ?? ({ type: 'doc', content: [] } as JSONContent)
  const rootContent = Array.isArray(normalizedRoot.content) ? [...normalizedRoot.content] : []

  let addedCanonicalTag = false
  if (canonicalCount === 0) {
    rootContent.unshift({
      type: 'paragraph',
      content: [getPeriodTimepointNode(mapping)],
    })
    changed = true
    addedCanonicalTag = true
  }

  normalizedRoot.content = rootContent

  return {
    normalizedContent: normalizedRoot,
    changed,
    removedCount,
    addedCanonicalTag,
  }
}

/**
 * Generate template content for a period Quanta.
 * Places the corresponding TimePoint mention as the first element, followed
 * by an empty paragraph for the user to start writing.
 */
const getPeriodTemplate = (mapping: PeriodTimepointMapping): JSONContent => ({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [getPeriodTimepointNode(mapping)],
    },
    {
      type: 'paragraph',
    },
  ],
})

/**
 * Returns true when TipTap JSON content has user-meaningful content.
 * Treats empty docs / docs with only empty paragraphs as empty.
 */
const hasMeaningfulContent = (content: JSONContent | null | undefined): boolean => {
  if (!content || !Array.isArray(content.content) || content.content.length === 0) {
    return false
  }

  // If every top-level node is an empty paragraph, it's effectively empty.
  const allEmptyParagraphs = content.content.every((node: any) => {
    if (!node || node.type !== 'paragraph') return false
    if (!Array.isArray(node.content) || node.content.length === 0) return true

    return node.content.every((child: any) => {
      if (!child) return true
      if (child.type === 'text') return !child.text || child.text.trim() === ''
      // Non-text child nodes (mentions/timepoints/etc.) are meaningful.
      return false
    })
  })

  return !allEmptyParagraphs
}

const LEGACY_DAILY_FALLBACK_NOTICE_SNIPPET = 'Since no template was provided in the daily-schedule-template page'

const stripLegacyDailyFallbackNotice = (content: JSONContent): JSONContent => {
  const hasLegacyNoticeText = (node: JSONContent): boolean => {
    if (node.type === 'text' && typeof node.text === 'string') {
      return node.text.includes(LEGACY_DAILY_FALLBACK_NOTICE_SNIPPET)
    }

    if (!Array.isArray(node.content)) return false
    return node.content.some((child) => hasLegacyNoticeText(child))
  }

  const isLegacyNoticeParagraph = (node: JSONContent): boolean => {
    if (node.type !== 'paragraph') return false

    const attrs = (node.attrs as Record<string, unknown> | undefined) ?? {}
    if (attrs.quantaId === 'fallback-notice-paragraph') return true
    return hasLegacyNoticeText(node)
  }

  const walk = (node: JSONContent): JSONContent | null => {
    if (isLegacyNoticeParagraph(node)) return null

    const nextNode: JSONContent = { ...node }
    if (Array.isArray(node.content)) {
      const nextChildren: JSONContent[] = []
      for (const child of node.content) {
        const nextChild = walk(child)
        if (nextChild) nextChildren.push(nextChild)
      }
      nextNode.content = nextChildren
    }
    return nextNode
  }

  const sanitized = walk(content) ?? ({ type: 'doc', content: [] } as JSONContent)
  const rootContent = Array.isArray(sanitized.content) ? sanitized.content : []
  if (rootContent.length === 0) {
    sanitized.content = [{ type: 'paragraph' }]
  }
  return sanitized
}

const hasLegacyDailyFallbackNotice = (content: JSONContent): boolean => {
  const sanitized = stripLegacyDailyFallbackNotice(content)
  return JSON.stringify(content) !== JSON.stringify(sanitized)
}

// ============================================================================
// Daily Template Token Resolution
// ============================================================================
// Prototype behavior: when initializing today's daily quanta from period-daily,
// resolve template placeholders like "Today {todays_date}" into concrete labels.
const TODAY_TEMPLATE_TIMEPOINT_ID = 'timepoint:today-template'
const TODAY_TIMEPOINT_ID = 'timepoint:today'
const TODAY_TEMPLATE_TOKEN_REGEX_REPLACE = /\{todays_date\}/gi
const TODAY_TEMPLATE_TOKEN_REGEX_TEST = /\{todays_date\}/i

const formatResolvedTodayDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatResolvedTodayLabel = (date: Date): string => `Today (${formatResolvedTodayDate(date)})`

const resolveTemplateTokensInString = (value: string, date: Date): string => {
  return value.replace(TODAY_TEMPLATE_TOKEN_REGEX_REPLACE, formatResolvedTodayDate(date))
}

const resolveDailyTemplateTokensForDate = (content: JSONContent, targetDate: Date): JSONContent => {
  const walk = (node: JSONContent): JSONContent => {
    const resolvedNode: JSONContent = { ...node }

    if (resolvedNode.type === 'text' && typeof resolvedNode.text === 'string') {
      resolvedNode.text = resolveTemplateTokensInString(resolvedNode.text, targetDate)
    }

    if (resolvedNode.attrs && typeof resolvedNode.attrs === 'object') {
      const attrs = { ...(resolvedNode.attrs as Record<string, any>) }

      if (attrs.id === TODAY_TEMPLATE_TIMEPOINT_ID) {
        attrs.id = TODAY_TIMEPOINT_ID
        attrs.label = `🗓️ ${formatResolvedTodayLabel(targetDate)}`
        attrs['data-date'] = targetDate.toISOString()
        attrs['data-formatted'] = formatResolvedTodayLabel(targetDate)
        attrs['data-relative-label'] = "Today's date"
      } else {
        ;['label', 'data-formatted', 'data-relative-label'].forEach((key) => {
          if (typeof attrs[key] === 'string') {
            attrs[key] = resolveTemplateTokensInString(attrs[key], targetDate)
          }
        })
      }

      resolvedNode.attrs = attrs
    }

    if (Array.isArray(resolvedNode.content)) {
      resolvedNode.content = resolvedNode.content.map((child) => walk(child))
    }

    return resolvedNode
  }

  return walk(content)
}

const hasResolvableTodayTemplateTokens = (content: JSONContent | null | undefined): boolean => {
  if (!content) return false

  const walk = (node: JSONContent): boolean => {
    if (node.type === 'text' && typeof node.text === 'string' && TODAY_TEMPLATE_TOKEN_REGEX_TEST.test(node.text)) {
      return true
    }

    if (node.attrs && typeof node.attrs === 'object') {
      const attrs = node.attrs as Record<string, any>
      if (attrs.id === TODAY_TEMPLATE_TIMEPOINT_ID) return true
      const stringAttrs = ['label', 'data-formatted', 'data-relative-label']
      for (const key of stringAttrs) {
        if (typeof attrs[key] === 'string' && TODAY_TEMPLATE_TOKEN_REGEX_TEST.test(attrs[key])) {
          return true
        }
      }
    }

    if (Array.isArray(node.content)) {
      return node.content.some((child) => walk(child))
    }

    return false
  }

  return walk(content)
}

/**
 * Fetches the content of a quanta from IndexedDB
 * Returns the JSONContent or null if not found/empty
 */
const fetchQuantaContentFromIndexedDB = async (
  quantaId: string,
  timeoutMs = 3000,
): Promise<JSONContent | null> => {
  return new Promise((resolve) => {
    const yDoc = new Y.Doc()
    const persistence = new IndexeddbPersistence(quantaId, yDoc)
    
    persistence.on('synced', () => {
      try {
        // Convert yDoc to TipTap JSON content
        // The 'default' field is where TipTap Collaboration stores the document
        const content = TiptapTransformer.fromYdoc(yDoc, 'default')
        
        const hasContent = hasMeaningfulContent(content)
        
        persistence.destroy()
        
        if (hasContent) {
          resolve(content)
        } else {
          resolve(null)
        }
      } catch (error) {
        console.error('[RichText] Error reading template from IndexedDB:', error)
        persistence.destroy()
        resolve(null)
      }
    })
    
    // Timeout to avoid hanging forever if IndexedDB sync stalls
    setTimeout(() => {
      persistence.destroy()
      resolve(null)
    }, timeoutMs)
  })
}

const readPendingList = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writePendingList = (key: string, values: string[]) => {
  if (values.length > 0) {
    localStorage.setItem(key, JSON.stringify(values))
  } else {
    localStorage.removeItem(key)
  }
}

const fetchQuantaContentWithLegacyFallback = async (params: {
  userId?: string | null
  quantaId: string
  timeoutMs?: number
}): Promise<JSONContent | null> => {
  const trimmedUserId = params.userId?.trim()
  if (trimmedUserId) {
    const scopedRoomName = `${trimmedUserId}/${params.quantaId}`
    const scopedContent = await fetchQuantaContentFromIndexedDB(scopedRoomName, params.timeoutMs)
    if (scopedContent) return scopedContent
  }

  return fetchQuantaContentFromIndexedDB(params.quantaId, params.timeoutMs)
}

import { EmptyNodeCleanupExtension } from '../../extensions/EmptyNodeCleanupExtension'
import { backup } from '../../backend/backup'
import { HighlightImportantLinePlugin } from './HighlightImportantLinePlugin'
import { useEditorContext } from '../../contexts/EditorContext'

const lowlight = createLowlight()
lowlight.register('javascript', js)
lowlight.register('js', js)

export type textInformationType =  "string" | "jsonContent" | "yDoc" | "invalid";


export const officialExtensions = (quantaId: string) => {return [
  // Add official extensions
  CodeBlockLowlight.configure({
    lowlight,
  }),
  Color.configure({
    types: ['textStyle'],
  }),
  Details.configure({
    persist: true,
    HTMLAttributes: {
      class: 'details',
    },
  }),
  DetailsContent,
  DetailsSummary,
  FontFamily.configure({
    types: ['textStyle'],
  }),
  Focus.configure({
    className: 'attention-highlight',
    mode: 'shallowest',
  }),
  FontSize,
  Heading.configure({
    levels: [1, 2, 3, 4],
  }),
  Highlight.configure({
    multicolor: true,
  }),
  // ARCHITECTURE: Use the resizable Image node view so slash-menu uploads
  // and inline inserts share the same resize/persisted-width behavior.
  Image,
  Placeholder.configure({
    includeChildren: true,
    showOnlyCurrent: true,
    showOnlyWhenEditable: false,
    // Use different placeholders depending on the node type:
    placeholder: ({ node }) => {
      // TODO: This doesn't work because the group renders quanta, which is a paragraph
      if (node.type.name === "paragraph") {
        return 'Write something...'
      } else {
        return ''
      }
    },
  }),
  Gapcursor,
  // @ts-ignore
  StarterKit.configure({
    // Here undefined is the equivalent of true
    // TODO: Problem, it looks like when setting this to false
    // collaboration history doesn't take over...
    // history: isYDoc ? false : undefined
    undoRedo: false,
    // Disable provided extensions so they don't load twice
    bulletList: false,
    heading: false,
    listItem: false,
    listKeymap: false,
    link: false,
    codeBlock: false,
    gapcursor: false,
    orderedList: false,
    // document: false, // Re-enable default document
  }),
  BulletList,
  OrderedList,
  ListItem,
  ListKeymap,
  TaskList,
  Table.configure({
    resizable: true,
    cellMinWidth: 300
  }),
  TableRow,
  TableHeader,
  TableCell,
  TaskItem.configure({
    nested: true,
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TextStyle,
  UniqueID.configure({
    // All block nodes that can participate in connections
    types: [
      'paragraph', 'mention', 'group', 'scrollview', 'daily',
      // Structure nodes
      'weekly', 'weeklyQuanta', 'lunarSchedule', 'seasonalSchedule', 'canvas3D', 'calendar', 'dayHeader', 'lunarMonth',
      'temporalSpace', 'temporalOrder', 'temporalDaily', 'trends', 'externalPortal', 'portal', 'lifetimeView',
      'quantaFlow', 'lifemapCard', 'singleLifemapCard',
      // Content nodes (pomodoro excluded - it's inline and doesn't use NodeOverlay)
      'excalidraw', 'mapboxMap', 'warning', 'quote',
      'conversation', 'math', 'calculation', 'keyValuePair', 'comment',
    ],
    filterTransaction: transaction => !isChangeOrigin(transaction),
    generateID: generateUniqueID,
    attributeName: 'quantaId',
  }),
] as Extensions}

export const customExtensions: Extensions = [
  CalculationExtension,
  CommentExtension,
  ConversationExtension,
  CustomLink.configure({
    openOnClick: true,
  }),
  // CustomMention disabled - using HashtagMention (#) instead for all tags
  // CustomMention.configure(
  //   {
  //     HTMLAttributes: {
  //       class: 'mention',
  //     },
  //     suggestion: mentionSuggestionOptions,
  //   }
  // ),
  // TimePoint mentions - triggered by @ for date insertion (Today, Tomorrow, etc.)
  TimePointNode,
  TemporalFieldExtension,
  // Location mentions - triggered by ! for location insertion (Sydney, Tokyo, etc.)
  LocationNode,
  LocationMention,
  // Hashtag mentions - triggered by # for tagging content
  HashtagNode,
  HashtagMention,
  // Merit/Demerit mentions - triggered by * for pros/cons, advantages/disadvantages
  MeritDemeritNode,
  MeritDemeritMention,
  // Finesse mentions - triggered by ^ for energy levels
  AuraNode,
  AuraMention,
  // Todo mentions - triggered by [] for inline checkbox todos
  // Styled like a Mention but with a checkbox and editable text content
  TodoMentionNode,
  TodoMention,
  // To-not-do mentions - triggered by [x] for inline crossed-out red todos
  // Same behavior as TodoMention, but defaults to crossed/red state
  ToNotDoMentionNode,
  ToNotDoMention,
  // Question mentions - triggered by [?] for inline clarify-question items
  // Left icon toggles between boxed question mark and light bulb
  QuestionMentionNode,
  QuestionMention,
  // Motivations mentions - triggered by !! for inline motivation items
  // Has editable text and connection grip (no checkbox)
  MotivationsMentionNode,
  MotivationsMention,
  // Pomodoro/Duration - triggered by ~ for duration insertion (5 mins, 10 mins, etc.)
  // PomodoroNode is for short durations (< 1 day) with timer functionality
  // DurationBadgeNode is for celestial durations (>= 1 day) without timer functionality
  PomodoroNode,
  DurationBadgeNode,
  DurationExtension,
  DocumentAttributeExtension,
  FadeIn,
  FocusModePlugin,
  GroupExtension,
  ScrollViewExtension,
  KeyValuePairExtension,
  // LocationExtension removed - conflicts with LocationNode from LocationMention.tsx (both use name: "location")
  // LocationNode supports inline mentions with pin emoji via # trigger
  MapboxMapExtension,
  // Excalidraw - hand-drawn style whiteboard for moodboards, diagrams, and visual brainstorming
  // https://github.com/excalidraw/excalidraw
  ExcalidrawExtension,
  MathExtension,
  MessageExtension,
  PortalExtension,
  ExperimentalPortalExtension,
  ExternalPortalExtension,
  QuoteExtension,
  SpanGroupMark,
  WarningExtension,
  LifemapCardExtension,
  SingleLifemapCardExtension,
  QuantaFlowExtension,
  CalendarExtension,
  HighlightImportantLinePlugin,
  DailyYesterday,
  DailyToday,
  DailyTomorrow,
  DailyExtension,
  WeeklyExtension,
  WeeklyQuantaExtension,
  LunarScheduleExtension,
  SeasonalScheduleExtension,
  LunarMonthExtension,
  DayHeaderTasks,
  DayHeaderInsights,
  DayHeaderObservations,
  DayHeaderExtension,
  TemporalSpaceExtension,
  TemporalOrderExtension,
  TemporalDailyExtension,
  TrendsExtension,
  LifetimeViewExtension,
  WeatherExtension,
  Canvas3DExtension,
  SlashMenuExtension,
  // EmptyNodeCleanupExtension,
]

export const agents: Extensions = [
  // AI agents temporarily disabled.
]

// This TransclusionEditor merely needs to display a copy of the node being synced in the main editor
// Therefore it needs no syncing capabilities.
// If editing is enabled on the transcluded node, then edits should be propagated back to the main editor for syncing
export const TransclusionEditor = (information: RichTextT, isQuanta: boolean, readOnly?: boolean) => {
  const { quanta, provider } = React.useContext(QuantaStoreContext)

  const informationType = isQuanta ? "yDoc" : typeof information === "string" ? "string" : typeof information === "object" ? "object" : "invalid"

  let generatedOfficialExtensions = officialExtensions(quanta.id)

  const editor = useEditor({
    extensions: [...generatedOfficialExtensions, ...customExtensions, ...agents],
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
      },
    },
    content: (informationType === "yDoc") ? null : information,
    onUpdate: ({ editor }) => {

    }
  })

  return editor
}

export const MainEditor = (information: RichTextT, isQuanta: boolean, readOnly?: boolean) => {
  const { quanta, provider } = React.useContext(QuantaStoreContext)
  const [contentError, setContentError] = React.useState<Error | null>(null)
  const [currentFocusLens, setCurrentFocusLens] = React.useState<DocumentAttributes['selectedFocusLens']>(defaultDocumentAttributes.selectedFocusLens);

  const informationType = isQuanta ? "yDoc" : typeof information === "string" ? "string" : typeof information === "object" ? "object" : "invalid"

  let generatedOfficialExtensions = officialExtensions(quanta.id)

  if (informationType === "yDoc") {
    generatedOfficialExtensions.push(
      Collaboration.configure({
        document: quanta.information,
        field: 'default',
      })
    )
    generatedOfficialExtensions.push(
      Snapshot.configure({
        // Snapshot provider can initialize after mount; keep extension mounted consistently.
        provider: provider as any,
        onUpdate: () => {
          // Snapshot storage is read directly from editor.storage.snapshot by menus.
        },
      })
    )
  } 

  // Create memoized throttled backup function (3 minutes = 180000ms)
  const throttledBackup = React.useMemo(
    () => throttle((content: any) => {
      backup.storeValidContent(content)
    }, 180000, { leading: true, trailing: true }),
    []
  );

  // Cleanup throttle on unmount
  React.useEffect(() => {
    return () => {
      throttledBackup.cancel()
    }
  }, [throttledBackup])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...generatedOfficialExtensions, ...customExtensions, ...agents],
    editable: !readOnly, // Only enable when mounted
    enableContentCheck: true, // Enable content validation
    autofocus: true, // Auto-focus the editor on load
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
      },
    },
    content: (informationType === "yDoc") ? null : information,
    shouldRerenderOnTransaction: false,
    
    // Add error handling for invalid content
    onContentError: ({ editor, error, disableCollaboration }) => {
      console.error('Editor content error:', error)
      setContentError(error)
      // If there is an error on this client, isolate the client from others, to prevent
      // it from "infecting" other clients with its invalid content

      // If using collaboration, disable it to prevent syncing invalid content
      if (disableCollaboration && provider) {
        disableCollaboration()
      }

      // Prevent emitting updates
      const emitUpdate = false

      // Disable further user input
      editor.setEditable(false, emitUpdate)

      // Try to recover by loading backup content
      try {
        const backupContent = backup.getLastValidContent()
        if (backupContent) {
          editor.commands.setContent(backupContent)
          editor.setEditable(true)
          setContentError(null)
        }
      } catch (recoveryError) {
        console.error('Failed to recover editor content:', recoveryError)
      }
    },
    
    onSelectionUpdate: ({ editor }: { editor: Editor }) => {
      // Retrieve document attributes using the custom command
      // @ts-ignore - getDocumentAttributes exists via the extension
      const documentAttributes: DocumentAttributes = editor.commands.getDocumentAttributes()
      // Update state if lens changed
      if (documentAttributes.selectedFocusLens !== currentFocusLens) {
        setCurrentFocusLens(documentAttributes.selectedFocusLens);
      }

      // Set global editability based on the lens
      const shouldBeEditable = documentAttributes.selectedFocusLens === "admin-editing" || documentAttributes.selectedFocusLens === "call-mode" || documentAttributes.selectedFocusLens === "dev-mode";
      if (editor.isEditable !== shouldBeEditable) {
        editor.setEditable(shouldBeEditable);
      }
    },
    onCreate: ({ editor }) => {
      // Runs once when editor is initialized
      // Set initial editability and focus lens state
      // @ts-ignore
      const documentAttributes: DocumentAttributes = editor.commands.getDocumentAttributes();
      setCurrentFocusLens(documentAttributes.selectedFocusLens); // Set initial state
      const shouldBeEditable = documentAttributes.selectedFocusLens === 'admin-editing' || documentAttributes.selectedFocusLens === 'call-mode' || documentAttributes.selectedFocusLens === 'dev-mode';
      editor.setEditable(shouldBeEditable);

      // Listen for attribute changes from localStorage to update state
      const handleAttributeUpdate = (event: Event) => {
        // @ts-ignore - CustomEvent has detail property
        const updatedAttributes = event.detail as DocumentAttributes;
        if (updatedAttributes && updatedAttributes.selectedFocusLens !== currentFocusLens) {
           setCurrentFocusLens(updatedAttributes.selectedFocusLens);
        }
      };
      window.addEventListener('doc-attributes-updated', handleAttributeUpdate);
      // TODO: Consider cleanup for this listener if RichText unmounts.
    },
    onUpdate: ({ editor }) => {
      if (!contentError) {
        throttledBackup(editor.getJSON())
      }
      
      // @ts-ignore
      const documentAttributes = editor.commands.getDocumentAttributes()
    },
    onTransaction: ({ editor, transaction }) => {
    },
  })

  React.useEffect(() => {
    if (!editor || informationType !== "yDoc" || !provider) return

    const snapshotStorage = (editor.storage as any)?.snapshot
    const toggleVersioning = (editor.commands as any)?.toggleVersioning
    if (typeof toggleVersioning !== 'function') return

    if (!snapshotStorage?.versioningEnabled) {
      toggleVersioning()
    }
  }, [editor, informationType, provider])

  // Effect to manage scroll-snap based on currentFocusLens
  React.useEffect(() => {
    // Target the main scrolling element (usually documentElement for window scrolling)
    const scrollElement = document.documentElement;

    if (currentFocusLens === 'call-mode') {
      // Enable scroll snapping
      scrollElement.style.scrollSnapType = 'y mandatory';
      // Optional: Add padding to influence snapping point if needed
      // scrollElement.style.scrollPaddingTop = '25vh'; // Example: snap closer to center
    } else {
      // Disable scroll snapping
      scrollElement.style.scrollSnapType = 'none';
      // scrollElement.style.scrollPaddingTop = ''; // Reset padding if set
    }

    // Cleanup function to disable scroll snap when component unmounts or mode changes
    return () => {
      scrollElement.style.scrollSnapType = 'none';
      // scrollElement.style.scrollPaddingTop = ''; // Reset padding if set
    };
  }, [currentFocusLens]); // Rerun only when the focus lens changes

  return editor
}
// TODO: Maybe merge this RichText and the editor component above, since they have virtually the same props
export const RichText = observer((props: { quanta?: QuantaType, text: RichTextT, lenses: [TextSectionLens], onChange?: (change: string | JSONContent) => void }) => {
  let content = props.text
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [visualScale, setVisualScale] = React.useState(1)
  const visualScaleRef = React.useRef(1)

  

  switch (props.lenses[0]) {
    case "code":
      // TODO: Reactivate code lens
      // content = `<pre><code class="language-javascript">${props.text}</code></pre>`

      break;
    case "text":
      // Do nothing

      break;
    default:
      break;
  }

  let editor = MainEditor(content, true, false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    let rafId: number | null = null
    let intervalId: number | null = null

    const measureVisualScale = () => {
      const root = rootRef.current
      if (!root) return

      const layoutWidth = root.offsetWidth
      if (!layoutWidth) return

      const rect = root.getBoundingClientRect()
      if (!Number.isFinite(rect.width) || rect.width <= 0) return

      const measuredScale = rect.width / layoutWidth
      const normalizedScale = Math.min(
        QUANTA_MAX_VISUAL_SCALE,
        Math.max(QUANTA_MIN_VISUAL_SCALE, measuredScale),
      )

      if (Math.abs(normalizedScale - visualScaleRef.current) < QUANTA_SCALE_CHANGE_EPSILON) {
        return
      }

      visualScaleRef.current = normalizedScale
      setVisualScale(normalizedScale)
    }

    const scheduleMeasure = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        measureVisualScale()
      })
    }

    scheduleMeasure()
    intervalId = window.setInterval(scheduleMeasure, QUANTA_SCALE_MEASURE_INTERVAL_MS)
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('orientationchange', scheduleMeasure)
    document.addEventListener('visibilitychange', scheduleMeasure)

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('orientationchange', scheduleMeasure)
      document.removeEventListener('visibilitychange', scheduleMeasure)
    }
  }, [])

  const contentScaleCompensation = React.useMemo(() => {
    if (!Number.isFinite(visualScale) || visualScale <= 0) return 1
    if (visualScale >= 0.995) return 1
    const moderatedCompensation = Math.pow(1 / visualScale, QUANTA_FONT_COMPENSATION_EXPONENT)
    return Math.min(QUANTA_MAX_FONT_COMPENSATION, moderatedCompensation)
  }, [visualScale])

  const inverseContentScaleCompensation = React.useMemo(() => {
    return contentScaleCompensation <= 0 ? 1 : 1 / contentScaleCompensation
  }, [contentScaleCompensation])

  const richTextRootStyle: React.CSSProperties & {
    '--quanta-content-scale': string
    '--quanta-content-scale-inverse': string
  } = {
    width: '100%',
    '--quanta-content-scale': `${contentScaleCompensation}`,
    '--quanta-content-scale-inverse': `${inverseContentScaleCompensation}`,
  }
  
  // Share editor instance via context so DocumentFlowMenu can access it
  const { setEditor } = useEditorContext()
  React.useEffect(() => {
    if (editor) {
      setEditor(editor as Editor)
    }
    return () => {
      setEditor(null)
    }
  }, [editor, setEditor])
  
  // Listen for postMessage requests for editor JSON (from parent pages like life-mapping-old)
  React.useEffect(() => {
    if (!editor) return;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'get-editor-json') {
        // Respond with the editor's JSON content
        const json = (editor as Editor).getJSON();
        window.parent.postMessage({
          type: 'editor-json-response',
          json: json,
        }, '*');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [editor])
  
  // Add a ref to track template application
  const templateApplied = React.useRef(false);

  // Check for new sales guide template flag
  React.useEffect(() => {
    if (!props.quanta?.id || !editor || templateApplied.current) return;
    
    const newSalesGuideId = sessionStorage.getItem('newSalesGuide');
    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    
    // Only apply template if URL ID matches stored ID
    if (newSalesGuideId === urlId && editor) {
      setTimeout(() => {
        (editor as Editor)!.commands.setContent(SalesGuideTemplate);

        // Mark template as applied
      templateApplied.current = true;
        
        // Now safe to remove from sessionStorage
        sessionStorage.removeItem('newSalesGuide');
      }, 300);
    }
  }, [props.quanta?.id, editor]);

  // Materialize abstract period quantas into concrete long-term-calendar panes.
  // This path is opt-in via `temporalMaterialization=long-term-v1` and only
  // seeds empty docs, so user-authored content is never overwritten on refresh.
  const temporalMaterializationChecked = React.useRef(false);
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const temporalMaterializationMode = searchParams.get(TEMPORAL_MATERIALIZATION_PARAM);
    if (temporalMaterializationMode !== LONG_TERM_TEMPORAL_MATERIALIZATION_MODE) return;
    if (!props.quanta?.information || !editor || templateApplied.current || temporalMaterializationChecked.current) return;

    const templateKey = searchParams.get('templateKey');
    if (templateKey) return;

    const forceTemporalMaterialization = searchParams.get('forceTemporalMaterialization') === 'true';
    const userId = searchParams.get('userId');
    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    if (!urlId) return;

    const plan = resolveLongTermTemporalMaterializationPlan(urlId);
    if (!plan) return;

    const metaKey = buildTemporalMaterializationMetaKey({
      mode: temporalMaterializationMode,
      userId,
      quantaId: urlId,
    });
    const existingMeta = readTemporalMaterializationMeta(metaKey);

    const yDoc = props.quanta.information;
    let stabilizationTimeout: NodeJS.Timeout | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    const STABILIZATION_DELAY = 800;
    const FALLBACK_TIMEOUT = 2000;

    const persistMeta = (status: TemporalMaterializationMeta['status'], sourceQuantaIds: string[]) => {
      writeTemporalMaterializationMeta(metaKey, {
        version: LONG_TERM_TEMPORAL_MATERIALIZATION_VERSION,
        mode: temporalMaterializationMode,
        status,
        updatedAt: new Date().toISOString(),
        sourceQuantaIds,
      });
    };

    const checkAndMaterialize = async () => {
      if (temporalMaterializationChecked.current || templateApplied.current) return;
      temporalMaterializationChecked.current = true;

      const yFragment = yDoc.getXmlFragment('default');
      let yDocHasMeaningfulContent = yFragment.length > 0;
      try {
        const yDocJson = TiptapTransformer.fromYdoc(yDoc, 'default') as JSONContent;
        yDocHasMeaningfulContent = hasMeaningfulContent(yDocJson);
      } catch {
        yDocHasMeaningfulContent = yFragment.length > 0;
      }

      const editorContent = (editor as Editor).getJSON() as JSONContent
      const editorHasMeaningfulContent = hasMeaningfulContent(editorContent)
      const isEmpty = !yDocHasMeaningfulContent && !editorHasMeaningfulContent;
      const isDailyTarget = parseDailySlugDate(urlId) !== null;
      const isLongTermTarget = urlId === LONG_TERM_THIS_WEEK_QUANTA_ID || urlId === LONG_TERM_THIS_MONTH_QUANTA_ID;
      const supportsMergeIntoExisting = isDailyTarget || isLongTermTarget;

      if (!isEmpty) {
        const dedupeResult = dedupeTopLevelTemporalMaterializationBlocks(editorContent);
        if (dedupeResult.removedCount > 0) {
          yDoc.transact(() => {
            yFragment.delete(0, yFragment.length);
          });
          ;(editor as Editor)!.commands.setContent(dedupeResult.content);
          templateApplied.current = true;
          persistMeta(
            'seeded',
            existingMeta?.sourceQuantaIds?.length ? existingMeta.sourceQuantaIds : plan.sourceQuantaIds,
          );
          console.log(`[RichText] Removed ${dedupeResult.removedCount} duplicate temporal block(s) from ${urlId}`);
          return;
        }
      }

      if (
        existingMeta &&
        existingMeta.version === LONG_TERM_TEMPORAL_MATERIALIZATION_VERSION &&
        !forceTemporalMaterialization
      ) {
        // Enforce at-most-once-per-version semantics for this quanta.
        if (existingMeta.status === 'seeded' && !isEmpty) return;
        if (existingMeta.status === 'existing' && !isEmpty) return;
      }

      const sourceContents: Array<{ sourceQuantaId: string; content: JSONContent }> = [];
      for (const sourceQuantaId of plan.sourceQuantaIds) {
        const sourceContent = await fetchQuantaContentWithLegacyFallback({
          userId,
          quantaId: sourceQuantaId,
          timeoutMs: 8000,
        });
        if (!sourceContent) continue;
        const sanitizedSourceContent = stripLegacyDailyFallbackNotice(sourceContent);
        if (!hasMeaningfulContent(sanitizedSourceContent)) continue;
        sourceContents.push({
          sourceQuantaId,
          content: sanitizedSourceContent,
        });
      }

      let contentToApply = mergeTemporalMaterializationSources(sourceContents);
      if (!contentToApply && plan.fallbackTemplate && isEmpty) {
        const templateContent = await fetchQuantaContentWithLegacyFallback({
          userId,
          quantaId: DAILY_TEMPLATE_QUANTA_ID,
          timeoutMs: 8000,
        });
        contentToApply = templateContent
          ? stripLegacyDailyFallbackNotice(templateContent)
          : getDailyScheduleTemplate();
      }

      if (!contentToApply) {
        if (!isEmpty) {
          if (!existingMeta || existingMeta.version !== LONG_TERM_TEMPORAL_MATERIALIZATION_VERSION || forceTemporalMaterialization) {
            persistMeta('existing', plan.sourceQuantaIds);
          }
        }
        return;
      }

      if (plan.resolveTokensForDate) {
        contentToApply = resolveDailyTemplateTokensForDate(contentToApply, plan.resolveTokensForDate);
      }

      if (isEmpty) {
        // Guard against late sync races: if the target already has persisted
        // content, skip seeding so we don't duplicate by materializing too early.
        const persistedTargetContent = await fetchQuantaContentWithLegacyFallback({
          userId,
          quantaId: urlId,
          timeoutMs: 8000,
        });
        if (persistedTargetContent && hasMeaningfulContent(stripLegacyDailyFallbackNotice(persistedTargetContent))) {
          persistMeta('existing', plan.sourceQuantaIds);
          return;
        }

        yDoc.transact(() => {
          yFragment.delete(0, yFragment.length);
        });

        ;(editor as Editor)!.commands.setContent(contentToApply);
        templateApplied.current = true;
        persistMeta(
          'seeded',
          sourceContents.length > 0 ? sourceContents.map((entry) => entry.sourceQuantaId) : plan.sourceQuantaIds,
        );
        console.log(`[RichText] Materialized ${urlId} from ${plan.sourceQuantaIds.join(', ')}`);
        return;
      }

      if (supportsMergeIntoExisting) {
        const existingContent = (editor as Editor).getJSON() as JSONContent;
        const mergeResult = mergeTemporalMaterializationIntoExistingDoc(existingContent, contentToApply);
        if (mergeResult.addedCount > 0) {
          yDoc.transact(() => {
            yFragment.delete(0, yFragment.length);
          });
          ;(editor as Editor)!.commands.setContent(mergeResult.content);
          templateApplied.current = true;
          persistMeta(
            'seeded',
            sourceContents.length > 0 ? sourceContents.map((entry) => entry.sourceQuantaId) : plan.sourceQuantaIds,
          );
          console.log(`[RichText] Merged ${mergeResult.addedCount} temporal blocks into ${urlId}`);
          return;
        }
      }

      if (!existingMeta || existingMeta.version !== LONG_TERM_TEMPORAL_MATERIALIZATION_VERSION || forceTemporalMaterialization) {
        persistMeta('existing', plan.sourceQuantaIds);
      }
    };

    const resetStabilizationTimer = () => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      stabilizationTimeout = setTimeout(() => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        void checkAndMaterialize();
      }, STABILIZATION_DELAY);
    };

    const handleUpdate = () => {
      resetStabilizationTimer();
    };

    yDoc.on('update', handleUpdate);
    resetStabilizationTimer();

    fallbackTimeout = setTimeout(() => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      void checkAndMaterialize();
    }, FALLBACK_TIMEOUT);

    return () => {
      yDoc.off('update', handleUpdate);
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [props.quanta?.information, editor]);

  // Check for new daily schedule template flag
  // Uses localStorage because sessionStorage is NOT shared between iframes and parent
  // For today/tomorrow daily pages, first tries /q/period-daily as source-of-truth.
  // If period-daily is empty/missing, falls back to /q/daily-schedule-template,
  // and finally to hardcoded template.
  // Supports initializing both today and tomorrow's schedules
  //
  // IMPORTANT: Uses Y.Doc event-based approach to wait for IndexedDB to sync before checking
  // if the editor is empty. This prevents race conditions where content could be applied
  // before IndexedDB finishes syncing.
  const dailyPageInitChecked = React.useRef(false);
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const temporalMaterializationMode = searchParams.get(TEMPORAL_MATERIALIZATION_PARAM);
    if (temporalMaterializationMode) return;
    const userId = searchParams.get('userId');
    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    const templateKey = searchParams.get('templateKey');
    const forceDailySeed = searchParams.get('forceDailySeed') === 'true';
    const scopedSchedulesKey = userId ? `${NEW_DAILY_SCHEDULES_KEY}-${userId}` : NEW_DAILY_SCHEDULES_KEY;
    const scopedPendingSchedules = readPendingList(scopedSchedulesKey);
    const legacyPendingSchedules = scopedSchedulesKey === NEW_DAILY_SCHEDULES_KEY
      ? []
      : readPendingList(NEW_DAILY_SCHEDULES_KEY);
    const pendingSchedules = [...new Set([...scopedPendingSchedules, ...legacyPendingSchedules])];
    const now = new Date();
    const todaySlug = `daily-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrowSlug = `daily-${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
    
    const isInPending = urlId && pendingSchedules.includes(urlId);
    const isTodayDailyPage = urlId === todaySlug;
    const isTomorrowDailyPage = urlId === tomorrowSlug;
    const isTodayOrTomorrowDailyPage = isTodayDailyPage || isTomorrowDailyPage;
    
    // When templateKey is present, custom template initialization (below) is the
    // single source of truth. Skip legacy daily initialization to avoid double-seeding
    // races that can overwrite freshly applied template content.
    if (templateKey) return;

    // Apply for pending schedules, and also allow today/tomorrow daily pages even if
    // the pending list wasn't set before iframe/editor mount.
    if (!isInPending && !isTodayOrTomorrowDailyPage) return;
    if (!props.quanta?.information || !editor || templateApplied.current || dailyPageInitChecked.current) return;
    
    const yDoc = props.quanta.information;
    let stabilizationTimeout: NodeJS.Timeout | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    const STABILIZATION_DELAY = 800;
    const FALLBACK_TIMEOUT = 2000;
    
    const removeFromPendingList = () => {
      if (!urlId) return;

      const updateKey = (key: string) => {
        const currentPending = readPendingList(key);
        const updatedPending = currentPending.filter(id => id !== urlId);
        writePendingList(key, updatedPending);
      };

      updateKey(scopedSchedulesKey);
      if (scopedSchedulesKey !== NEW_DAILY_SCHEDULES_KEY) {
        updateKey(NEW_DAILY_SCHEDULES_KEY);
      }
    };
    
    const checkAndApplyTemplate = async () => {
      // Guard: only run once
      if (dailyPageInitChecked.current || templateApplied.current) return;
      dailyPageInitChecked.current = true;
      
      // Check Y.Doc directly for effective emptiness.
      // The 'default' field is where TipTap Collaboration stores the document.
      const yFragment = yDoc.getXmlFragment('default');
      let yDocHasMeaningfulContent = yFragment.length > 0;
      try {
        const yDocJson = TiptapTransformer.fromYdoc(yDoc, 'default') as JSONContent
        yDocHasMeaningfulContent = hasMeaningfulContent(yDocJson)
      } catch (error) {
        // Keep conservative fallback when transform fails during sync transitions.
        yDocHasMeaningfulContent = yFragment.length > 0
      }
      
      // Also check editor state as a fallback
      const editorIsEmpty = editor.isEmpty || editor.state.doc.textContent.trim() === '';
      
      // Only consider empty if BOTH Y.Doc and editor agree it's empty.
      const isEmpty = !yDocHasMeaningfulContent && editorIsEmpty;
      const shouldForceSeedTodayOrTomorrow = isTodayOrTomorrowDailyPage && forceDailySeed;
      const shouldApplySeed = isEmpty || shouldForceSeedTodayOrTomorrow;
      const resolutionDate = isTomorrowDailyPage ? tomorrowDate : now;
      
      console.log(
        `[RichText PERF] ${urlId} checkAndApplyTemplate started, yDocHasMeaningfulContent=${yDocHasMeaningfulContent}, editorIsEmpty=${editorIsEmpty}, isEmpty=${isEmpty}, forceDailySeed=${forceDailySeed}, shouldApplySeed=${shouldApplySeed}, isTodayOrTomorrowDailyPage=${isTodayOrTomorrowDailyPage}`
      )
      const perfStart = performance.now()
      
      if (shouldApplySeed) {
        // Today/tomorrow daily page priority:
        // 1) period-daily (recurring daily quanta), 2) editable daily template, 3) hardcoded fallback
        let contentToApply: JSONContent | null = null;

        if (isTodayOrTomorrowDailyPage) {
          console.log(`[RichText PERF] ${urlId} Trying period source: ${PERIOD_DAILY_QUANTA_ID}`)
          const periodFetchStart = performance.now()
          const periodContent = await fetchQuantaContentWithLegacyFallback({
            userId,
            quantaId: PERIOD_DAILY_QUANTA_ID,
          });
          console.log(
            `[RichText PERF] ${urlId} period fetch took ${(performance.now() - periodFetchStart).toFixed(0)}ms, got content: ${!!periodContent}`
          )
          if (periodContent) {
            contentToApply = periodContent;
          }
        }

        if (!contentToApply) {
          console.log(`[RichText PERF] ${urlId} Calling fetchQuantaContentFromIndexedDB for daily template...`)
          const templateFetchStart = performance.now()
          const templateContent = await fetchQuantaContentWithLegacyFallback({
            userId,
            quantaId: DAILY_TEMPLATE_QUANTA_ID,
          });
          console.log(
            `[RichText PERF] ${urlId} daily template fetch took ${(performance.now() - templateFetchStart).toFixed(0)}ms, got content: ${!!templateContent}`
          )
          contentToApply = templateContent || getDailyScheduleTemplate();
        }

        if (contentToApply) {
          contentToApply = stripLegacyDailyFallbackNotice(contentToApply)
        }

        if (isTodayOrTomorrowDailyPage && contentToApply) {
          contentToApply = resolveDailyTemplateTokensForDate(contentToApply, resolutionDate);
        }
        
        console.log(`[RichText PERF] ${urlId} Calling setContent...`)
        const setContentStart = performance.now()
        
        // Clear Y.Doc first to prevent Y.js from merging (which causes duplication)
        yDoc.transact(() => {
          yFragment.delete(0, yFragment.length);
        });
        
        ;(editor as Editor)!.commands.setContent(contentToApply);
        console.log(`[RichText PERF] ${urlId} setContent took ${(performance.now() - setContentStart).toFixed(0)}ms`)
        
        templateApplied.current = true;
        console.log(`[RichText] Applied daily initialization content to ${urlId} (after Y.Doc stabilization) - total: ${(performance.now() - perfStart).toFixed(0)}ms`);
      } else if (isTodayOrTomorrowDailyPage) {
        // Edge case: content exists but still contains unresolved template tokens
        // from a previous prototype copy. Resolve in-place on today/tomorrow pages.
        const existingContent = editor.getJSON() as JSONContent
        const sanitizedExistingContent = stripLegacyDailyFallbackNotice(existingContent)
        const shouldStripLegacyNotice = hasLegacyDailyFallbackNotice(existingContent)
        const shouldResolveInPlace = hasResolvableTodayTemplateTokens(sanitizedExistingContent)

        if (shouldResolveInPlace || shouldStripLegacyNotice) {
          const resolvedContent = shouldResolveInPlace
            ? resolveDailyTemplateTokensForDate(sanitizedExistingContent, resolutionDate)
            : sanitizedExistingContent

          yDoc.transact(() => {
            yFragment.delete(0, yFragment.length);
          });

          ;(editor as Editor)!.commands.setContent(resolvedContent);
          templateApplied.current = true;
          if (shouldResolveInPlace && shouldStripLegacyNotice) {
            console.log(`[RichText] Resolved today tokens and removed legacy daily fallback notice for ${urlId}`);
          } else if (shouldResolveInPlace) {
            console.log(`[RichText] Resolved existing today template tokens in-place for ${urlId}`);
          } else {
            console.log(`[RichText] Removed legacy daily fallback notice for ${urlId}`);
          }
        } else {
          console.log(`[RichText] ${urlId} already has content, skipping template application`);
        }
      } else {
        const existingContent = editor.getJSON() as JSONContent
        const shouldStripLegacyNotice = hasLegacyDailyFallbackNotice(existingContent)

        if (shouldStripLegacyNotice) {
          const sanitizedExistingContent = stripLegacyDailyFallbackNotice(existingContent)

          yDoc.transact(() => {
            yFragment.delete(0, yFragment.length);
          });

          ;(editor as Editor)!.commands.setContent(sanitizedExistingContent);
          templateApplied.current = true;
          console.log(`[RichText] Removed legacy daily fallback notice for ${urlId}`);
        } else {
          console.log(`[RichText] ${urlId} already has content, skipping template application`);
        }
      }
      
      // Remove from pending list regardless
      removeFromPendingList();
    };
    
    const resetStabilizationTimer = () => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      stabilizationTimeout = setTimeout(() => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        checkAndApplyTemplate();
      }, STABILIZATION_DELAY);
    };
    
    const handleUpdate = () => {
      resetStabilizationTimer();
    };
    
    yDoc.on('update', handleUpdate);
    resetStabilizationTimer();
    
    fallbackTimeout = setTimeout(() => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      checkAndApplyTemplate();
    }, FALLBACK_TIMEOUT);
    
    return () => {
      yDoc.off('update', handleUpdate);
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [props.quanta?.information, editor]);

  // ARCHITECTURE DECISION: Generic custom template seeding via URL query param + localStorage
  // ========================================================================================
  // The parent page (e.g., natural-calendar-v3) stores template JSON in localStorage under
  // 'templateContent:{key}' and passes `templateKey={key}` as a URL query parameter.
  //
  // This approach is more reliable than localStorage-only signaling because:
  //   - The URL param is available immediately (no race condition with parent useEffect)
  //   - The template content is stored synchronously before render in the parent
  //   - No mutable pending list that can get out of sync
  //
  // Supports seeding any Quanta document: just store the template and add templateKey to the URL.
  const customTemplateInitChecked = React.useRef(false);
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const templateKey = searchParams.get('templateKey');
    if (!templateKey) return;
    if (!props.quanta?.information || !editor || templateApplied.current || customTemplateInitChecked.current) return;

    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    const yDoc = props.quanta.information;
    let stabilizationTimeout: NodeJS.Timeout | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    const STABILIZATION_DELAY = 800;
    const FALLBACK_TIMEOUT = 2000;

    const checkAndApplyCustomTemplate = () => {
      if (customTemplateInitChecked.current || templateApplied.current) return;
      customTemplateInitChecked.current = true;

      // Check Y.Doc for effective emptiness
      const yFragment = yDoc.getXmlFragment('default');
      let yDocHasMeaningfulContent = yFragment.length > 0;
      try {
        const yDocJson = TiptapTransformer.fromYdoc(yDoc, 'default') as JSONContent;
        yDocHasMeaningfulContent = hasMeaningfulContent(yDocJson);
      } catch {
        yDocHasMeaningfulContent = yFragment.length > 0;
      }

      const editorIsEmpty = editor.isEmpty || editor.state.doc.textContent.trim() === '';
      const isEmpty = !yDocHasMeaningfulContent && editorIsEmpty;

      console.log(
        `[RichText] ${urlId} custom template check (key=${templateKey}): yDocHasMeaningfulContent=${yDocHasMeaningfulContent}, editorIsEmpty=${editorIsEmpty}, isEmpty=${isEmpty}`
      );

      if (isEmpty) {
        // Read template content from localStorage using the templateKey
        const templateRaw = localStorage.getItem(`templateContent:${templateKey}`);
        if (!templateRaw) {
          console.warn(`[RichText] ${urlId} has templateKey=${templateKey} but no template found in localStorage at 'templateContent:${templateKey}'`);
          return;
        }

        let contentToApply: JSONContent;
        try {
          contentToApply = JSON.parse(templateRaw);
        } catch (e) {
          console.error(`[RichText] Failed to parse custom template for ${urlId} (key=${templateKey}):`, e);
          return;
        }

        // Clear Y.Doc first to prevent Y.js merge duplication
        yDoc.transact(() => {
          yFragment.delete(0, yFragment.length);
        });

        ;(editor as Editor)!.commands.setContent(contentToApply);
        templateApplied.current = true;
        console.log(`[RichText] Applied custom template '${templateKey}' to ${urlId}`);
      } else {
        console.log(`[RichText] ${urlId} already has content, skipping custom template '${templateKey}'`);
      }
    };

    const resetStabilizationTimer = () => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      stabilizationTimeout = setTimeout(() => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        checkAndApplyCustomTemplate();
      }, STABILIZATION_DELAY);
    };

    const handleUpdate = () => {
      resetStabilizationTimer();
    };

    yDoc.on('update', handleUpdate);
    resetStabilizationTimer();

    fallbackTimeout = setTimeout(() => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      checkAndApplyCustomTemplate();
    }, FALLBACK_TIMEOUT);

    return () => {
      yDoc.off('update', handleUpdate);
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [props.quanta?.information, editor]);

  // Initialize the editable daily-schedule-template with the hardcoded template if it's empty
  // This allows users to edit the template at /q/daily-schedule-template
  // 
  // IMPORTANT: Uses Y.Doc event-based approach to wait for IndexedDB to sync before checking
  // if the editor is empty. This prevents the race condition where content is applied before
  // IndexedDB finishes syncing, which would cause Y.js to MERGE both (duplication bug).
  const dailyTemplateInitChecked = React.useRef(false);
  React.useEffect(() => {
    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    
    // Only apply to the template quanta itself
    if (urlId !== DAILY_TEMPLATE_QUANTA_ID) return;
    if (!props.quanta?.information || !editor || templateApplied.current || dailyTemplateInitChecked.current) return;
    
    const yDoc = props.quanta.information;
    let stabilizationTimeout: NodeJS.Timeout | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    const STABILIZATION_DELAY = 800; // Wait 800ms of no updates before considering stable
    const FALLBACK_TIMEOUT = 2000; // Max wait time in case no updates come
    
    const checkAndInitializeIfEmpty = async () => {
      // Guard: only run once
      if (dailyTemplateInitChecked.current || templateApplied.current) return;
      dailyTemplateInitChecked.current = true;
      
      // Check Y.Doc directly for emptiness (more reliable than editor state during sync)
      const yFragment = yDoc.getXmlFragment('default');
      const yDocIsEmpty = yFragment.length === 0;
      const editorIsEmpty = editor.isEmpty || editor.state.doc.textContent.trim() === '';
      
      // Only consider empty if BOTH Y.Doc and editor agree it's empty
      const isEmpty = yDocIsEmpty && editorIsEmpty;
      
      if (isEmpty) {
        // Architectural choice: verify IndexedDB before applying fallback to avoid
        // merging the fallback into an existing custom template after late sync.
        const persistedTemplate = await fetchQuantaContentFromIndexedDB(DAILY_TEMPLATE_QUANTA_ID);
        if (persistedTemplate) {
          console.log('[RichText] Found persisted daily-schedule-template content; skipping fallback initialization');
          return;
        }

        // Clear Y.Doc first to prevent Y.js from merging (which causes duplication)
        yDoc.transact(() => {
          yFragment.delete(0, yFragment.length);
        });
        
        (editor as Editor)!.commands.setContent(getDailyScheduleTemplate());
        templateApplied.current = true;
        console.log('[RichText] Initialized daily-schedule-template with hardcoded template (after Y.Doc stabilization)');
      } else {
        console.log(`[RichText] daily-schedule-template already has content (yDocIsEmpty=${yDocIsEmpty}, editorIsEmpty=${editorIsEmpty}), skipping initialization`);
      }
    };
    
    const resetStabilizationTimer = () => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      stabilizationTimeout = setTimeout(() => {
        // Clear fallback since we're done
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        checkAndInitializeIfEmpty();
      }, STABILIZATION_DELAY);
    };
    
    // Listen for Y.Doc updates (triggered when IndexedDB syncs content)
    const handleUpdate = () => {
      resetStabilizationTimer();
    };
    
    yDoc.on('update', handleUpdate);
    
    // Start stabilization timer immediately (handles case where Y.Doc already has content)
    resetStabilizationTimer();
    
    // Fallback: if no updates come within FALLBACK_TIMEOUT, check anyway
    fallbackTimeout = setTimeout(() => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      checkAndInitializeIfEmpty();
    }, FALLBACK_TIMEOUT);
    
    return () => {
      yDoc.off('update', handleUpdate);
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [props.quanta?.information, editor]);

  // ============================================================================
  // Initialize Period Quanta with TimePoint Mention
  // ============================================================================
  // Architecture: When a period Quanta (e.g., /q/period-daily) is opened for the
  // first time and is empty, we insert the corresponding TimePoint mention at the
  // top of the document. This tags the Quanta with its period identity.
  //
  // Uses the same Y.Doc stabilization pattern as daily templates to avoid
  // race conditions with IndexedDB sync.
  const periodInitChecked = React.useRef(false);
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const userId = searchParams.get('userId');
    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    if (!urlId || !urlId.startsWith('period-')) return;
    if (!props.quanta?.information || !editor || templateApplied.current || periodInitChecked.current) return;

    // Extract the period slug (everything after "period-")
    const periodSlug = urlId.replace('period-', '');
    const mapping = PERIOD_SLUG_TO_TIMEPOINT[periodSlug];
    if (!mapping) return;

    const yDoc = props.quanta.information;
    let stabilizationTimeout: NodeJS.Timeout | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;
    const STABILIZATION_DELAY = 800;
    const FALLBACK_TIMEOUT = 2000;

    const checkAndApplyPeriodTemplate = async () => {
      if (isCancelled || periodInitChecked.current || templateApplied.current) return;

      const yFragment = yDoc.getXmlFragment('default');
      let yDocHasMeaningfulContent = yFragment.length > 0;
      try {
        const yDocJson = TiptapTransformer.fromYdoc(yDoc, 'default') as JSONContent;
        yDocHasMeaningfulContent = hasMeaningfulContent(yDocJson);
      } catch {
        yDocHasMeaningfulContent = yFragment.length > 0;
      }
      const editorHasMeaningfulContent = hasMeaningfulContent((editor as Editor).getJSON() as JSONContent);
      const isEmpty = !yDocHasMeaningfulContent && !editorHasMeaningfulContent;

      if (isEmpty) {
        // Guard against late Yjs sync races: if IndexedDB already has content,
        // skip initialization so we don't merge duplicate period mentions.
        const persistedPeriodContent = await fetchQuantaContentWithLegacyFallback({
          userId,
          quantaId: urlId,
          timeoutMs: 8000,
        });
        if (isCancelled) return;
        if (persistedPeriodContent) {
          return;
        }

        periodInitChecked.current = true;
        yDoc.transact(() => {
          yFragment.delete(0, yFragment.length);
        });

        (editor as Editor)!.commands.setContent(getPeriodTemplate(mapping));
        templateApplied.current = true;
        return;
      }

      const currentContent = (editor as Editor).getJSON() as JSONContent;
      const invariantResult = enforceSingleTagPerPeriodGroup(currentContent, mapping);
      periodInitChecked.current = true;

      if (!invariantResult.changed) {
        return;
      }

      yDoc.transact(() => {
        yFragment.delete(0, yFragment.length);
      });

      (editor as Editor)!.commands.setContent(invariantResult.normalizedContent);
    };

    const resetStabilizationTimer = () => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      stabilizationTimeout = setTimeout(() => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        void checkAndApplyPeriodTemplate();
      }, STABILIZATION_DELAY);
    };

    const handleUpdate = () => {
      resetStabilizationTimer();
    };

    yDoc.on('update', handleUpdate);
    resetStabilizationTimer();

    fallbackTimeout = setTimeout(() => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      void checkAndApplyPeriodTemplate();
    }, FALLBACK_TIMEOUT);

    return () => {
      isCancelled = true;
      yDoc.off('update', handleUpdate);
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [props.quanta?.information, editor]);

  // Initialize life-mapping-main with LifeMappingMainTemplate if empty
  // DISABLED: Template auto-loading disabled to preserve user content
  // Set ENABLE_LIFE_MAPPING_MAIN_TEMPLATE to true to re-enable
  const ENABLE_LIFE_MAPPING_MAIN_TEMPLATE = false;
  React.useEffect(() => {
    if (!ENABLE_LIFE_MAPPING_MAIN_TEMPLATE) return; // Template loading disabled
    if (!props.quanta?.id || !editor || templateApplied.current) return;
    
    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    
    // Only apply to life-mapping-main
    if (urlId === LIFE_MAPPING_MAIN_QUANTA_ID && editor) {
      const isEmpty = editor.isEmpty || editor.state.doc.textContent.trim() === '';
      
      if (isEmpty) {
        setTimeout(() => {
          // Initialize with the LifeMappingMainTemplate
          (editor as Editor)!.commands.setContent(getLifeMappingMainTemplate());
          templateApplied.current = true;
          console.log('[RichText] Initialized life-mapping-main with LifeMappingMainTemplate');
        }, 300);
      }
    }
  }, [props.quanta?.id, editor]);

  // Auto-insert Daily node for present-day-tasks after content has synced from IndexedDB
  // Also removes duplicate Daily nodes if multiple exist
  const dailyNodeCheckDone = React.useRef(false);
  
  React.useEffect(() => {
    // Early exit if already checked in this component instance
    if (dailyNodeCheckDone.current) return;
    if (!props.quanta?.id || !editor) return;
    
    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    if (urlId !== 'present-day-tasks') return;
    
    // Access the Y.Doc from the quanta props
    const yDoc = props.quanta?.information;
    if (!yDoc) return;
    
    let stabilityTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;
    
    const checkAndInsertDaily = () => {
      // Double-check the ref and cancellation flag before any action
      if (isCancelled || dailyNodeCheckDone.current) return;
      
      // Mark as done FIRST to prevent any race conditions
      dailyNodeCheckDone.current = true;
      
      // Count daily nodes and collect their positions
      const dailyNodePositions: number[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'daily') {
          dailyNodePositions.push(pos);
        }
        return true;
      });
      
      const dailyCount = dailyNodePositions.length;
      
      if (dailyCount === 0) {
        // No daily node exists, insert one
        editor.chain().focus('end').insertContent({ type: 'daily' }).run();
      } else if (dailyCount > 1) {
        // Multiple daily nodes exist - remove extras (keep the first one)
        // Delete in reverse order to avoid position shifts affecting earlier positions
        const positionsToDelete = dailyNodePositions.slice(1).reverse();
        
        let chain = editor.chain();
        for (const pos of positionsToDelete) {
          const node = editor.state.doc.nodeAt(pos);
          if (node && node.type.name === 'daily') {
            chain = chain.deleteRange({ from: pos, to: pos + node.nodeSize });
          }
        }
        chain.run();
        
        console.log(`[RichText] Removed ${dailyCount - 1} duplicate Daily node(s)`);
      }
    };
    
    // Wait for content to stabilize (no Y.Doc updates for 800ms)
    const onYDocUpdate = () => {
      if (stabilityTimeout) clearTimeout(stabilityTimeout);
      if (!isCancelled && !dailyNodeCheckDone.current) {
        stabilityTimeout = setTimeout(checkAndInsertDaily, 800);
      }
    };
    
    // Listen for Y.Doc updates
    yDoc.on('update', onYDocUpdate);
    
    // Also set an initial timeout in case the doc is already synced and no updates come
    if (!dailyNodeCheckDone.current) {
      stabilityTimeout = setTimeout(checkAndInsertDaily, 1000);
    }
    
    return () => {
      isCancelled = true;
      yDoc.off('update', onYDocUpdate);
      if (stabilityTimeout) clearTimeout(stabilityTimeout);
    };
  }, [props.quanta?.id, editor, props.quanta?.information]);

  // Auto-insert Calendar node for 'past' quanta (Monthly section) after content has synced
  // Use a module-level flag to prevent duplicate insertions across component remounts
  const calendarNodeCheckDone = React.useRef(false);
  
  React.useEffect(() => {
    // Early exit if already checked in this component instance
    if (calendarNodeCheckDone.current) return;
    if (!props.quanta?.id || !editor) return;
    
    const urlId = props.quanta?.id || window.location.pathname.split('/').pop();
    if (urlId !== 'past') return;
    
    // Access the Y.Doc from the quanta props
    const yDoc = props.quanta?.information;
    if (!yDoc) return;
    
    let stabilityTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;
    
    const checkAndInsertCalendar = () => {
      // Double-check the ref and cancellation flag before any action
      if (isCancelled || calendarNodeCheckDone.current) return;
      
      // Mark as done FIRST to prevent any race conditions
      calendarNodeCheckDone.current = true;
      
      // Count calendar nodes and collect their positions
      const calendarNodePositions: number[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'calendar') {
          calendarNodePositions.push(pos);
        }
        return true;
      });
      
      const calendarCount = calendarNodePositions.length;
      
      if (calendarCount === 0) {
        editor.chain().focus('end').insertContent({ type: 'calendar' }).run();
      } else if (calendarCount > 1) {
        // Multiple calendar nodes exist - remove extras (keep the first one)
        // Delete in reverse order to avoid position shifts affecting earlier positions
        const positionsToDelete = calendarNodePositions.slice(1).reverse();
        
        let chain = editor.chain();
        for (const pos of positionsToDelete) {
          const node = editor.state.doc.nodeAt(pos);
          if (node && node.type.name === 'calendar') {
            chain = chain.deleteRange({ from: pos, to: pos + node.nodeSize });
          }
        }
        chain.run();
        
        console.log(`[RichText] Removed ${calendarCount - 1} duplicate Calendar node(s)`);
      }
    };
    
    // Wait for content to stabilize (no Y.Doc updates for 800ms)
    const onYDocUpdate = () => {
      if (stabilityTimeout) clearTimeout(stabilityTimeout);
      if (!isCancelled && !calendarNodeCheckDone.current) {
        stabilityTimeout = setTimeout(checkAndInsertCalendar, 800);
      }
    };
    
    // Listen for Y.Doc updates
    yDoc.on('update', onYDocUpdate);
    
    // Also set an initial timeout in case the doc is already synced and no updates come
    if (!calendarNodeCheckDone.current) {
      stabilityTimeout = setTimeout(checkAndInsertCalendar, 1000);
    }
    
    return () => {
      isCancelled = true;
      yDoc.off('update', onYDocUpdate);
      if (stabilityTimeout) clearTimeout(stabilityTimeout);
    };
  }, [props.quanta?.id, editor, props.quanta?.information]);

  // TODO: Change this to proper responsiveness for each screen size
  const maxWidth = 1300

  if (editor) {
    if (process.env.NODE_ENV === 'development') {
      // console.debug(editor.schema)
    }

    return (
      <div
        key={props.quanta?.id}
        ref={rootRef}
        style={richTextRootStyle}
      >
        {/* DocumentFlowMenu removed from here - Assuming it's rendered in a parent layout component */}
        {/* <DocumentFlowMenu editor={editor as Editor} /> */}
        <div style={{ width: '100%'}}>
          <div key={`bubbleMenu${props.quanta?.id}`}>
            {/* This menu floats above selected text or nodes */}
            <FlowMenu editor={editor as Editor} />
          </div>
          <div>
            <EditorContent editor={editor as Editor} />
          </div>
          {/* NodeConnectionManager - handles hand-drawn arrow connections between all connectable elements
              (block-level Groups, inline SpanGroups, and generic nodes with NodeOverlay). Uses Rough.js for sketchy style. */}
          <NodeConnectionManager />
        </div>
      </div>
    )
  } else {
    return <></>
  }
  
})

export const issue123Example = () => {
  return (
    <RichText 
      text={issue123DocumentState} 
      lenses={["text"]} 
    />
  )
}

export const RichTextCodeExample = () => {
  const content = `
  <p>
    That's a boring paragraph followed by a fenced code block:
  </p>
  <span data-type="mention" data-id="🧱 blocked"></span><span data-type="mention" data-id="⭐️ important"></span>
  <p>
    Some more text is right here
  </p>
  <pre><code class="language-javascript">for (var i=1; i <= 20; i++)
  {
    if (i % 15 == 0)
      console.log("FizzBuzz");
    else if (i % 3 == 0)
      console.log("Fizz");
    else if (i % 5 == 0)
      console.log("Buzz");
    else
      console.log(i);
  }</code></pre>
  <group>
  <math lensDisplay="natural" lensevaluation="identity">
    \\frac{1}{2
  </math>
  </group>
  <group>
  <div>
  <math>
  10 + 30
  </math>
  </div>
  <div>
  <math>
  40
  </math>
  </div>
  </group>
`
  return (<RichText quanta={new QuantaClass()} text={content} lenses={["code"]} onChange={() => {
  }} />)
}

export default RichText
