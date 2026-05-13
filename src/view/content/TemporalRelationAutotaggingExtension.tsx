import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const TemporalRelationAutotaggingPluginKey = new PluginKey('temporalRelationAutotagging')

const CONNECTIONS_STORAGE_KEY = 'span-group-connections'
const CONNECTIONS_UPDATED_EVENT = 'node-connections-updated'
const TEMPORAL_RELATION_ANALYSIS_PATH = '/api/analyze-temporal-relations'
const SCAN_DEBOUNCE_MS = 1400
const MIN_ANALYSIS_CHARS = 8
const MIN_RELATION_CONFIDENCE = 0.55
const TEMPORAL_CONNECTOR_ENDPOINTS = new Set([
  'then',
  'next',
  'afterward',
  'afterwards',
  'after',
  'before',
  'later',
  'subsequently',
])
const NON_LOCATION_ENDPOINTS = new Set([
  'back',
  'return',
  'returns',
  'flight',
  'flights',
  'layover',
])
const WEEKDAY_PATTERN = '(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)'
const MONTH_PATTERN = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const TIME_PATTERN = '\\d{1,2}(?::|\\.)?\\d{0,2}\\s*(?:am|pm)'
const LOCATION_HINT_PATTERN = /\b(?:airport|station|terminal|city|town|home|hotel|park|port|harbour|harbor|street|road|avenue|plaza|square|temple|museum|castle|campus|hospital|center|centre)\b/i

declare global {
  interface Window {
    __LIFEMAP_ANALYSIS_API_BASE_URL__?: string
    __LIFEMAP_SUPPRESS_TEMPORAL_AUTOTAGGING_UNTIL_INPUT__?: boolean
  }
}

const configuredAnalysisApiBaseUrl = () => {
  if (typeof window === 'undefined') return ''

  const fromWindow = window.__LIFEMAP_ANALYSIS_API_BASE_URL__
  if (typeof fromWindow === 'string' && fromWindow.trim()) {
    return fromWindow.trim()
  }

  const params = new URLSearchParams(window.location.search)
  return (
    params.get('analysisApiBaseUrl') ||
    params.get('kairosAnalysisApiBaseUrl') ||
    ''
  ).trim()
}

export const resolveTemporalRelationAnalysisUrl = () => {
  if (typeof window === 'undefined') return TEMPORAL_RELATION_ANALYSIS_PATH

  const configuredBaseUrl = configuredAnalysisApiBaseUrl()
  if (configuredBaseUrl) {
    try {
      const configuredUrl = new URL(configuredBaseUrl)
      if (configuredUrl.pathname.endsWith(TEMPORAL_RELATION_ANALYSIS_PATH)) {
        return configuredUrl.toString()
      }

      return new URL(TEMPORAL_RELATION_ANALYSIS_PATH, configuredUrl).toString()
    } catch (error) {
      console.warn('[TemporalRelationAutotaggingExtension] Ignoring invalid analysisApiBaseUrl:', configuredBaseUrl, error)
    }
  }

  if (window.location.protocol === 'file:') {
    return null
  }

  return TEMPORAL_RELATION_ANALYSIS_PATH
}

type TemporalRelationEndpoint = {
  text: string
  start: number
  end: number
}

type TemporalLocationRelation = {
  source: TemporalRelationEndpoint
  target: TemporalRelationEndpoint
  cue: string
  relationType: 'temporal-order'
  confidence: number
}

type TextSegment = {
  text: string
  startIndex: number
  endIndex: number
  from: number
  to: number
  isLocationNode: boolean
  locationConnectionId?: string | null
  attrs?: Record<string, unknown>
}

type LinearizedTextBlock = {
  text: string
  indexToPos: number[]
  segments: TextSegment[]
}

type AnalysisTextRange = {
  text: string
  startIndex: number
  endIndex: number
  level: 'sentence' | 'paragraph'
}

type LocationAttrs = {
  id: string
  label: string
  locationId: string
  'data-name': string
  'data-country': string | null
  'data-coords': string | null
}

type LocationOperation =
  | {
      kind: 'replaceText'
      from: number
      to: number
      attrs: LocationAttrs
    }
  | {
      kind: 'updateLocationNode'
      from: number
      attrs: Record<string, unknown>
    }

type EndpointResolution = {
  connectionId: string
  operation?: LocationOperation
  label?: string
}

type NodeConnectionRecord = {
  id: string
  sourceId: string
  targetId: string
  sourceType: string
  targetType: string
  connectionKind?: 'temporal-order' | 'association' | 'manual'
  createdBy?: string
  cue?: string
  sourceLabel?: string
  targetLabel?: string
}

const generateShortId = () => Math.random().toString(36).substring(2, 10)

export const normalizeLocationName = (value: string): string => (
  value
    .replace(/^📍\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
)

export const isLikelyTemporalLocationEndpoint = (value: string): boolean => {
  const normalized = normalizeLocationName(value)
  if (!normalized) return false

  const lower = normalized.toLocaleLowerCase()
  if (NON_LOCATION_ENDPOINTS.has(lower)) return false

  const hasLatinLetters = /\p{Script=Latin}/u.test(normalized)
  const hasCjkCharacters = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(normalized)
  const hasLocationHint = LOCATION_HINT_PATTERN.test(normalized) || hasCjkCharacters
  const hasMonth = new RegExp(`\\b${MONTH_PATTERN}\\b`, 'i').test(normalized)
  const hasWeekday = new RegExp(`\\b${WEEKDAY_PATTERN}\\b`, 'i').test(normalized)
  const hasYear = /\b20\d{2}\b/.test(normalized)
  const hasTime = new RegExp(`\\b${TIME_PATTERN}\\b`, 'i').test(normalized)

  if (!hasLocationHint && (hasTime || hasYear || hasMonth || hasWeekday)) {
    return false
  }

  if (/^\d+(?:st|nd|rd|th)?$/i.test(normalized)) return false
  if (!hasLocationHint && /^[\d\s:.,/-]+(?:am|pm)?$/i.test(normalized)) return false
  if (!hasLocationHint && /\b[A-Z]{2}\d{2,4}\b/.test(normalized)) return false
  if (!hasLocationHint && /\bairlines?\b/i.test(normalized)) return false

  if (hasLatinLetters) {
    const meaningfulTokens = lower
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .filter((token) => !new RegExp(`^${WEEKDAY_PATTERN}$`, 'i').test(token))
      .filter((token) => !new RegExp(`^${MONTH_PATTERN}$`, 'i').test(token))
      .filter((token) => !/^\d{1,4}(?:st|nd|rd|th)?$/.test(token))
      .filter((token) => !/^(?:am|pm)$/.test(token))
    if (meaningfulTokens.length === 0) return false
  }

  return true
}

const slugifyLocationId = (value: string): string => (
  normalizeLocationName(value)
    .toLocaleLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '')
    .slice(0, 80) || 'unknown'
)

export const looksLikeTemporalRelationText = (text: string): boolean => {
  return text.trim().length >= MIN_ANALYSIS_CHARS
}

export const buildTemporalAnalysisRanges = (text: string): AnalysisTextRange[] => {
  const ranges: AnalysisTextRange[] = []
  const sentenceRegex = /[^.!?\n]+(?:[.!?]+|$)/g
  let match: RegExpExecArray | null

  while ((match = sentenceRegex.exec(text)) !== null) {
    const rawSentence = match[0]
    const leadingWhitespaceLength = rawSentence.length - rawSentence.trimStart().length
    const trailingWhitespaceLength = rawSentence.length - rawSentence.trimEnd().length
    const startIndex = match.index + leadingWhitespaceLength
    const endIndex = match.index + rawSentence.length - trailingWhitespaceLength
    const sentenceText = text.slice(startIndex, endIndex)

    if (looksLikeTemporalRelationText(sentenceText)) {
      ranges.push({
        text: sentenceText,
        startIndex,
        endIndex,
        level: 'sentence',
      })
    }
  }

  const paragraphStartIndex = text.length - text.trimStart().length
  const paragraphEndIndex = text.trimEnd().length
  const paragraphText = text.slice(paragraphStartIndex, paragraphEndIndex)
  if (looksLikeTemporalRelationText(paragraphText)) {
    const hasMatchingSentenceRange = ranges.some((range) => (
      range.startIndex === paragraphStartIndex &&
      range.endIndex === paragraphEndIndex
    ))

    if (!hasMatchingSentenceRange || ranges.length !== 1) {
      ranges.push({
        text: paragraphText,
        startIndex: paragraphStartIndex,
        endIndex: paragraphEndIndex,
        level: 'paragraph',
      })
    }
  }

  return ranges
}

const offsetRelationsToParagraph = (
  relations: TemporalLocationRelation[],
  range: AnalysisTextRange,
): TemporalLocationRelation[] => (
  relations.map((relation) => ({
    ...relation,
    source: {
      ...relation.source,
      start: relation.source.start + range.startIndex,
      end: relation.source.end + range.startIndex,
    },
    target: {
      ...relation.target,
      start: relation.target.start + range.startIndex,
      end: relation.target.end + range.startIndex,
    },
  }))
)

const relationKey = (relation: TemporalLocationRelation): string => (
  [
    relation.source.start,
    relation.source.end,
    relation.target.start,
    relation.target.end,
    relation.relationType,
  ].join(':')
)

const appendSegment = (
  linearized: LinearizedTextBlock,
  segment: Omit<TextSegment, 'startIndex' | 'endIndex'>,
) => {
  if (!segment.text) return

  const startIndex = linearized.text.length
  const endIndex = startIndex + segment.text.length

  linearized.text += segment.text
  linearized.segments.push({
    ...segment,
    startIndex,
    endIndex,
  })

  for (let index = 0; index < segment.text.length; index += 1) {
    linearized.indexToPos.push(segment.isLocationNode ? segment.from : segment.from + index)
  }
}

export const linearizeTextBlockWithLocations = (
  doc: any,
  blockStart: number,
  blockEnd: number,
): LinearizedTextBlock => {
  const linearized: LinearizedTextBlock = {
    text: '',
    indexToPos: [],
    segments: [],
  }

  doc.nodesBetween(blockStart, blockEnd, (node: any, pos: number) => {
    if (node.type?.name === 'location') {
      const attrs = (node.attrs || {}) as Record<string, unknown>
      const rawName =
        (typeof attrs['data-name'] === 'string' && attrs['data-name']) ||
        (typeof attrs.label === 'string' && attrs.label) ||
        ''
      const name = normalizeLocationName(rawName)

      appendSegment(linearized, {
        text: name,
        from: pos,
        to: pos + node.nodeSize,
        isLocationNode: true,
        locationConnectionId:
          typeof attrs.locationId === 'string' && attrs.locationId ? attrs.locationId : null,
        attrs,
      })

      return false
    }

    if (!node.isText) return true

    const value = node.text || ''
    appendSegment(linearized, {
      text: value,
      from: pos,
      to: pos + value.length,
      isLocationNode: false,
    })

    return false
  })

  return linearized
}

const getContainingTextBlockRange = (doc: any, pos: number) => {
  const clampedPos = Math.max(0, Math.min(pos, doc.content.size))
  const safePos = clampedPos === doc.content.size && clampedPos > 0 ? clampedPos - 1 : clampedPos
  const $pos = doc.resolve(safePos)

  for (let depth = $pos.depth; depth >= 0; depth -= 1) {
    const node = $pos.node(depth)
    if (!node.isTextblock) continue

    return {
      start: $pos.start(depth),
      end: $pos.end(depth),
    }
  }

  return null
}

const normalizeEndpointRange = (
  endpoint: TemporalRelationEndpoint,
  text: string,
): TemporalRelationEndpoint | null => {
  let start = endpoint.start
  let end = endpoint.end

  if (!Number.isInteger(start) || !Number.isInteger(end)) return null
  if (start < 0 || end <= start || end > text.length) return null

  while (start < end && /\s/.test(text[start])) start += 1
  while (end > start && /\s/.test(text[end - 1])) end -= 1
  if (end <= start) return null

  const selectedText = text.slice(start, end)
  const endpointText = normalizeLocationName(endpoint.text)

  if (
    endpointText &&
    normalizeLocationName(selectedText).toLocaleLowerCase() !== endpointText.toLocaleLowerCase()
  ) {
    return null
  }

  return {
    text: selectedText,
    start,
    end,
  }
}

const findFallbackEndpointRange = (
  endpoint: TemporalRelationEndpoint,
  text: string,
): TemporalRelationEndpoint | null => {
  const normalizedEndpointText = normalizeLocationName(endpoint.text)
  if (!normalizedEndpointText) return null

  const exactIndex = text.indexOf(normalizedEndpointText)
  if (exactIndex === -1) return null

  return {
    text: normalizedEndpointText,
    start: exactIndex,
    end: exactIndex + normalizedEndpointText.length,
  }
}

const findSegmentForEndpoint = (
  endpoint: TemporalRelationEndpoint,
  segments: TextSegment[],
) => {
  return segments.find((segment) => endpoint.start >= segment.startIndex && endpoint.end <= segment.endIndex)
}

const isTemporalConnectorEndpoint = (value: string): boolean => (
  TEMPORAL_CONNECTOR_ENDPOINTS.has(normalizeLocationName(value).toLocaleLowerCase())
)

export const findSurroundingLocationSegment = (
  endpoint: TemporalRelationEndpoint,
  segments: TextSegment[],
  direction: 'before' | 'after',
) => {
  const locationSegments = segments.filter((segment) => segment.isLocationNode)

  if (direction === 'before') {
    return locationSegments
      .filter((segment) => segment.endIndex <= endpoint.start)
      .sort((a, b) => b.endIndex - a.endIndex)[0] || null
  }

  return locationSegments
    .filter((segment) => segment.startIndex >= endpoint.end)
    .sort((a, b) => a.startIndex - b.startIndex)[0] || null
}

const resolveExistingLocationSegment = (segment: TextSegment): EndpointResolution => {
  const existingConnectionId = segment.locationConnectionId || generateShortId()
  const operation = segment.locationConnectionId
    ? undefined
    : {
        kind: 'updateLocationNode' as const,
        from: segment.from,
        attrs: {
          ...(segment.attrs || {}),
          locationId: existingConnectionId,
        },
      }

  return {
    connectionId: existingConnectionId,
    operation,
    label: normalizeLocationName(segment.text),
  }
}

const createLocationAttrs = (name: string, connectionId: string): LocationAttrs => ({
  id: `loc:ai-${slugifyLocationId(name)}-${connectionId}`,
  label: `📍 ${normalizeLocationName(name)}`,
  locationId: connectionId,
  'data-name': normalizeLocationName(name),
  'data-country': null,
  'data-coords': null,
})

const resolveEndpoint = (
  endpoint: TemporalRelationEndpoint,
  linearized: LinearizedTextBlock,
  operationByRange: Map<string, LocationOperation>,
  role: 'source' | 'target',
): EndpointResolution | null => {
  if (isTemporalConnectorEndpoint(endpoint.text)) {
    const surroundingLocation = findSurroundingLocationSegment(
      endpoint,
      linearized.segments,
      role === 'source' ? 'before' : 'after',
    )

    return surroundingLocation ? resolveExistingLocationSegment(surroundingLocation) : null
  }

  const normalizedEndpoint =
    normalizeEndpointRange(endpoint, linearized.text) ||
    findFallbackEndpointRange(endpoint, linearized.text)

  if (!normalizedEndpoint) return null

  const name = normalizeLocationName(normalizedEndpoint.text)
  if (name.length < 2) return null
  if (!isLikelyTemporalLocationEndpoint(name)) return null

  const segment = findSegmentForEndpoint(normalizedEndpoint, linearized.segments)
  if (segment?.isLocationNode) {
    return resolveExistingLocationSegment(segment)
  }

  const docFrom = linearized.indexToPos[normalizedEndpoint.start]
  const docTo = linearized.indexToPos[normalizedEndpoint.end - 1] + 1
  if (!Number.isFinite(docFrom) || !Number.isFinite(docTo) || docTo <= docFrom) return null

  const rangeKey = `${docFrom}:${docTo}`
  const existingOperation = operationByRange.get(rangeKey)
  if (existingOperation?.kind === 'replaceText') {
    return {
      connectionId: existingOperation.attrs.locationId,
      operation: existingOperation,
    }
  }

  const connectionId = generateShortId()
  const operation: LocationOperation = {
    kind: 'replaceText',
    from: docFrom,
    to: docTo,
    attrs: createLocationAttrs(name, connectionId),
  }

  operationByRange.set(rangeKey, operation)

  return {
    connectionId,
    operation,
    label: name,
  }
}

const loadConnections = (): NodeConnectionRecord[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(CONNECTIONS_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveConnections = (connections: NodeConnectionRecord[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connections))
  window.dispatchEvent(new CustomEvent(CONNECTIONS_UPDATED_EVENT, { detail: connections }))
}

const appendTemporalConnections = (
  relations: Array<{
    sourceId: string
    targetId: string
    cue?: string
    sourceLabel?: string
    targetLabel?: string
  }>,
) => {
  if (typeof window === 'undefined' || relations.length === 0) return

  const existingConnections = loadConnections()
  const existingKeys = new Set(
    existingConnections.map((connection) => (
      `${connection.sourceType}:${connection.sourceId}->${connection.targetType}:${connection.targetId}`
    )),
  )

  const additions: NodeConnectionRecord[] = []
  relations.forEach((relation) => {
    if (!relation.sourceId || !relation.targetId || relation.sourceId === relation.targetId) return

    const key = `location:${relation.sourceId}->location:${relation.targetId}`
    if (existingKeys.has(key)) return

    existingKeys.add(key)
    additions.push({
      id: generateShortId(),
      sourceId: relation.sourceId,
      targetId: relation.targetId,
      sourceType: 'location',
      targetType: 'location',
      connectionKind: 'temporal-order',
      createdBy: 'temporalRelationAutotagging',
      cue: relation.cue,
      sourceLabel: relation.sourceLabel,
      targetLabel: relation.targetLabel,
    })
  })

  if (!additions.length) return
  saveConnections([...existingConnections, ...additions])
}

const applyTemporalRelationTags = (
  view: any,
  linearized: LinearizedTextBlock,
  relations: TemporalLocationRelation[],
) => {
  const { state } = view
  const locationType = state.schema.nodes.location
  if (!locationType) return

  const operationsByRange = new Map<string, LocationOperation>()
  const operationsByKey = new Map<string, LocationOperation>()
  const resolvedRelations: Array<{
    sourceId: string
    targetId: string
    cue?: string
    sourceLabel?: string
    targetLabel?: string
  }> = []

  relations
    .filter((relation) => relation.relationType === 'temporal-order' && relation.confidence >= MIN_RELATION_CONFIDENCE)
    .forEach((relation) => {
      const source = resolveEndpoint(relation.source, linearized, operationsByRange, 'source')
      const target = resolveEndpoint(relation.target, linearized, operationsByRange, 'target')
      if (!source || !target || source.connectionId === target.connectionId) return

      ;[source.operation, target.operation].forEach((operation) => {
        if (!operation) return
        const key = operation.kind === 'replaceText'
          ? `${operation.kind}:${operation.from}:${operation.to}`
          : `${operation.kind}:${operation.from}`
        operationsByKey.set(key, operation)
      })

      resolvedRelations.push({
        sourceId: source.connectionId,
        targetId: target.connectionId,
        cue: relation.cue,
        sourceLabel: source.label || normalizeLocationName(relation.source.text),
        targetLabel: target.label || normalizeLocationName(relation.target.text),
      })
    })

  const operations = Array.from(operationsByKey.values()).sort((a, b) => b.from - a.from)
  let tr = state.tr
  let changed = false

  operations.forEach((operation) => {
    if (operation.kind === 'updateLocationNode') {
      tr = tr.setNodeMarkup(operation.from, undefined, operation.attrs)
      changed = true
      return
    }

    let intersectsExistingLocation = false
    state.doc.nodesBetween(operation.from, operation.to, (node: any) => {
      if (node.type?.name === 'location') {
        intersectsExistingLocation = true
        return false
      }
      return true
    })
    if (intersectsExistingLocation) return

    tr = tr.replaceWith(operation.from, operation.to, locationType.create(operation.attrs))
    changed = true
  })

  if (changed) {
    tr.setMeta('fromTemporalRelationAutotagging', true)
    view.dispatch(tr)
  }

  appendTemporalConnections(resolvedRelations)
}

export const TemporalRelationAutotaggingExtension = Extension.create({
  name: 'temporalRelationAutotagging',

  addProseMirrorPlugins() {
    let pendingPos: number | null = null
    let debounceHandle: ReturnType<typeof setTimeout> | null = null
    let latestScanRequestId = 0
    let lastAnalyzedText = ''
    let viewRef: any = null

    const runScan = (view: any, currentPos: number) => {
      if (typeof window !== 'undefined' && window.__LIFEMAP_SUPPRESS_TEMPORAL_AUTOTAGGING_UNTIL_INPUT__) {
        return
      }

      const { state } = view
      const blockRange = getContainingTextBlockRange(state.doc, currentPos)
      if (!blockRange) return

      const linearized = linearizeTextBlockWithLocations(state.doc, blockRange.start, blockRange.end)
      if (!looksLikeTemporalRelationText(linearized.text)) return

      const analysisRanges = buildTemporalAnalysisRanges(linearized.text)
      if (!analysisRanges.length) return

      const textSignature = analysisRanges
        .map((range) => `${range.level}:${range.startIndex}:${range.endIndex}:${range.text}`)
        .join('\n')
      if (textSignature === lastAnalyzedText) return
      lastAnalyzedText = textSignature

      const scanRequestId = latestScanRequestId + 1
      latestScanRequestId = scanRequestId
      const analysisUrl = resolveTemporalRelationAnalysisUrl()
      if (!analysisUrl) {
        return
      }

      void Promise.all(
        analysisRanges.map((range) => (
          fetch(analysisUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: range.text }),
          })
            .then(async (response) => {
              if (!response.ok) return []
              const data = await response.json()
              const relations: TemporalLocationRelation[] = Array.isArray(data?.relations)
                ? data.relations
                : []

              return offsetRelationsToParagraph(relations, range)
            })
        )),
      )
        .then((relationGroups) => {
          if (scanRequestId !== latestScanRequestId) return

          const relationsByKey = new Map<string, TemporalLocationRelation>()
          relationGroups.flat().forEach((relation) => {
            relationsByKey.set(relationKey(relation), relation)
          })

          const relations = Array.from(relationsByKey.values())
          if (!relations.length) return

          const currentBlockRange = getContainingTextBlockRange(view.state.doc, currentPos)
          if (!currentBlockRange) return

          const currentLinearized = linearizeTextBlockWithLocations(
            view.state.doc,
            currentBlockRange.start,
            currentBlockRange.end,
          )

          applyTemporalRelationTags(view, currentLinearized, relations)
        })
        .catch((error) => {
          console.error('[TemporalRelationAutotaggingExtension] Temporal relation analysis failed:', error)
        })
    }

    const scheduleScan = (view: any) => {
      if (debounceHandle) {
        clearTimeout(debounceHandle)
      }

      debounceHandle = setTimeout(() => {
        debounceHandle = null

        if (pendingPos === null) return

        const currentPos = pendingPos
        pendingPos = null

        runScan(view, currentPos)
      }, SCAN_DEBOUNCE_MS)
    }

    return [
      new Plugin({
        key: TemporalRelationAutotaggingPluginKey,
        state: {
          init() {
            return null
          },
          apply(transaction, value, _oldState, newState) {
            if (
              transaction.docChanged &&
              viewRef &&
              !transaction.getMeta('fromTemporalRelationAutotagging') &&
              !transaction.getMeta('fromTemporalEntityAutotagging')
            ) {
              pendingPos = newState.selection.to
              scheduleScan(viewRef)
            }

            return value
          },
        },
        appendTransaction(transactions, _oldState, newState) {
          const changedByAutotagging = transactions.some((transaction) => (
            transaction.getMeta('fromTemporalRelationAutotagging') ||
            transaction.getMeta('fromTemporalEntityAutotagging')
          ))
          if (changedByAutotagging) return null

          const hasDocChanges = transactions.some((transaction) => transaction.docChanged)
          if (!hasDocChanges || !viewRef) return null

          pendingPos = newState.selection.to
          scheduleScan(viewRef)
          return null
        },
        props: {
          handleTextInput(view, from, _to, text) {
            if (!text) return false

            if (typeof window !== 'undefined') {
              window.__LIFEMAP_SUPPRESS_TEMPORAL_AUTOTAGGING_UNTIL_INPUT__ = false
            }

            pendingPos = from + text.length
            scheduleScan(view)
            return false
          },
        },
        view(editorView) {
          viewRef = editorView
          return {
            update(view, previousState) {
              if (previousState.doc.eq(view.state.doc)) return

              pendingPos = view.state.selection.to
              scheduleScan(view)
            },
            destroy() {
              viewRef = null
              if (debounceHandle) {
                clearTimeout(debounceHandle)
                debounceHandle = null
              }
            },
          }
        },
      }),
    ]
  },
})

export default TemporalRelationAutotaggingExtension
