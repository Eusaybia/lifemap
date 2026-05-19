'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { DocumentAttributes, EditorMode, normalizeDocumentAttributes } from '../structure/DocumentAttributesExtension'
import {
  buildTemporalArrowPolygonPoints,
  TEMPORAL_ARROW_GLOW,
  TEMPORAL_ARROW_GLOW_STRONG,
  TEMPORAL_ARROW_STROKE,
  LOCATION_CONNECTOR_GLOW,
  LOCATION_CONNECTOR_STROKE,
  LocationConnectorVisual,
  TemporalArrowVisual,
} from './TemporalArrowVisual'

// ============================================================================
// NODE CONNECTION MANAGER
// ============================================================================
// This manager handles connections/arrows between connectable elements in the editor.
// 
// CONNECTABLE ELEMENT TYPES:
// 1. BLOCK GROUP (GroupTipTapExtension.tsx)
//    - A TipTap Node wrapping block content (cards, sections)
//    - Identified by: [data-group-node-view="true"][data-group-id="<uuid>"]
//
// 2. INLINE SPAN GROUP (SpanGroupMark.ts)  
//    - A TipTap Mark wrapping inline text
//    - Identified by: .span-group[data-span-group-id="<uuid>"]
//
// 3. GENERIC NODE (NodeOverlay)
//    - Any node that uses NodeOverlay wrapper
//    - Identified by: [data-node-overlay="true"][data-quanta-id="<uuid>"]
//
// 4. TODO MENTION (TodoMention.tsx)
//    - Inline checkbox todo with text and connection grip
//    - Identified by: .todo-mention[data-todo-id="<uuid>"]
//
// 5. QUESTION MENTION (QuestionMention.tsx)
//    - Inline clarify-question mention with text and connection grip
//    - Identified by: .question-mention[data-question-id="<uuid>"]
//
// 6. MOTIVATIONS MENTION (MotivationsMention.tsx)
//    - Inline motivation mention with text and connection grip
//    - Identified by: .motivations-mention[data-motivation-id="<uuid>"]
//
// 7. LOCATION MENTION (LocationMention.tsx)
//    - Inline location mention with map popover and connection grip
//    - Identified by: .location-mention[data-location-connection-id="<uuid>"]
//
// Connections are stored in localStorage and persist across sessions.
// Clicking on arrows navigates between connected elements (head/tail toggle).
// ============================================================================

// Connection between two connectable elements
// 'todo', 'question', 'motivation', and 'location' types are for inline mention nodes with connection grips
type ConnectableType = 'block' | 'span' | 'node' | 'todo' | 'question' | 'motivation' | 'location'

interface NodeConnection {
  id: string
  sourceId: string
  targetId: string
  sourceType: ConnectableType
  targetType: ConnectableType
  connectionKind?: 'temporal-order' | 'physical-order' | 'association' | 'manual'
  createdBy?: string
  cue?: string
  sourceLabel?: string
  targetLabel?: string
}

// Local storage key for persisting connections
const CONNECTIONS_STORAGE_KEY = 'span-group-connections'
const CONNECTIONS_UPDATED_EVENT = 'node-connections-updated'
const DOC_ATTRIBUTES_STORAGE_KEY = 'tiptapDocumentAttributes'

// Helper to generate a short unique ID for connections
const generateConnectionId = () => Math.random().toString(36).substring(2, 10)

// Load connections from localStorage
const loadConnections = (): NodeConnection[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CONNECTIONS_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return parsed.map((conn: any) => ({
      ...conn,
      sourceType: conn.sourceType || 'span',
      targetType: conn.targetType || 'span',
      connectionKind: conn.connectionKind || 'manual',
    }))
  } catch {
    return []
  }
}

// Save connections to localStorage
const saveConnections = (connections: NodeConnection[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connections))
  window.dispatchEvent(new CustomEvent(CONNECTIONS_UPDATED_EVENT, { detail: connections }))
}

// Helper to find a connectable element and determine its type
const findConnectableElement = (target: HTMLElement): { element: HTMLElement, id: string, type: ConnectableType } | null => {
  // Check for TodoMention (inline checkbox todo with connections)
  const todoMention = target.closest('.todo-mention[data-todo-id]') as HTMLElement
  if (todoMention) {
    const id = todoMention.getAttribute('data-todo-id')
    if (id) return { element: todoMention, id, type: 'todo' }
  }

  // Check for QuestionMention (inline clarify-question mention with connections)
  const questionMention = target.closest('.question-mention[data-question-id]') as HTMLElement
  if (questionMention) {
    const id = questionMention.getAttribute('data-question-id')
    if (id) return { element: questionMention, id, type: 'question' }
  }

  // Check for MotivationsMention (inline motivation mention with connections)
  const motivationMention = target.closest('.motivations-mention[data-motivation-id]') as HTMLElement
  if (motivationMention) {
    const id = motivationMention.getAttribute('data-motivation-id')
    if (id) return { element: motivationMention, id, type: 'motivation' }
  }

  // Check for LocationMention (inline location mention with connections)
  const locationMention = target.closest('.location-mention[data-location-connection-id]') as HTMLElement
  if (locationMention) {
    const id = locationMention.getAttribute('data-location-connection-id')
    if (id) return { element: locationMention, id, type: 'location' }
  }
  
  const spanGroup = target.closest('.span-group') as HTMLElement
  if (spanGroup) {
    const id = spanGroup.getAttribute('data-span-group-id')
    if (id) return { element: spanGroup, id, type: 'span' }
  }
  
  const blockGroup = target.closest('[data-group-node-view="true"]') as HTMLElement
  if (blockGroup) {
    const id = blockGroup.getAttribute('data-group-id')
    if (id) return { element: blockGroup, id, type: 'block' }
  }
  
  const nodeOverlay = target.closest('[data-node-overlay="true"]') as HTMLElement
  if (nodeOverlay) {
    const id = nodeOverlay.getAttribute('data-quanta-id')
    if (id) return { element: nodeOverlay, id, type: 'node' }
  }
  
  return null
}

// Helper to get a connectable element by ID and type
const getConnectableElement = (id: string, type: ConnectableType): HTMLElement | null => {
  if (type === 'todo') {
    return document.querySelector(`[data-todo-id="${id}"]`) as HTMLElement
  } else if (type === 'question') {
    return document.querySelector(`[data-question-id="${id}"]`) as HTMLElement
  } else if (type === 'motivation') {
    return document.querySelector(`[data-motivation-id="${id}"]`) as HTMLElement
  } else if (type === 'location') {
    return document.querySelector(`[data-location-connection-id="${id}"]`) as HTMLElement
  } else if (type === 'span') {
    return document.querySelector(`[data-span-group-id="${id}"]`) as HTMLElement
  } else if (type === 'block') {
    return document.querySelector(`[data-group-id="${id}"]`) as HTMLElement
  } else {
    return document.querySelector(`[data-quanta-id="${id}"]`) as HTMLElement
  }
}

const getLocationElementByLabel = (label?: string): HTMLElement | null => {
  if (!label) return null

  return Array.from(document.querySelectorAll('.location-mention[data-location-name]'))
    .find((element) => element.getAttribute('data-location-name') === label) as HTMLElement | undefined ?? null
}

const getLocationElementLabel = (element: HTMLElement): string | undefined => {
  const explicitName = element.getAttribute('data-location-name')
  if (explicitName?.trim()) return explicitName.trim()

  const explicitLabel = element.getAttribute('data-location-label')
  const rawLabel = explicitLabel || element.textContent || ''
  const label = rawLabel.replace(/^📍\s*/, '').trim()
  return label || undefined
}

const getConnectionEndpointElement = (
  conn: NodeConnection,
  endpoint: 'source' | 'target',
): HTMLElement | null => {
  const id = endpoint === 'source' ? conn.sourceId : conn.targetId
  const type = endpoint === 'source' ? conn.sourceType : conn.targetType
  const label = endpoint === 'source' ? conn.sourceLabel : conn.targetLabel
  const element = getConnectableElement(id, type)
  if (element) return element

  if (type === 'location') {
    return getLocationElementByLabel(label)
  }

  return null
}

const getConnectionsSignature = (connections: NodeConnection[]) => (
  JSON.stringify(connections.map((conn) => ({
    id: conn.id,
    sourceId: conn.sourceId,
    targetId: conn.targetId,
    sourceType: conn.sourceType,
    targetType: conn.targetType,
    connectionKind: conn.connectionKind,
    sourceLabel: conn.sourceLabel,
    targetLabel: conn.targetLabel,
  })))
)

// Helper function to check if an element is in the viewport
const isElementInViewport = (el: HTMLElement): boolean => {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  const vertInView = (rect.top <= window.innerHeight) && ((rect.top + rect.height) >= 0)
  const horzInView = (rect.left <= window.innerWidth) && ((rect.left + rect.width) >= 0)
  return vertInView && horzInView
}

const isElementCompletelyHidden = (elem: HTMLElement): boolean => {
  if (!elem) return true
  const style = window.getComputedStyle(elem)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return true
  }
  if (elem.offsetWidth <= 0 && elem.offsetHeight <= 0 && style.overflow !== 'visible') {
    return true
  }
  if (elem.parentElement && elem.parentElement !== document.body) {
    return isElementCompletelyHidden(elem.parentElement)
  }
  return false
}

type ConnectionPath = {
  id: string
  d: string
  arrowPoints: string
  x1: number
  y1: number
  x2: number
  y2: number
  midX: number
  midY: number
  sourceId: string
  targetId: string
  sourceType: ConnectableType
  targetType: ConnectableType
  connectionKind?: 'temporal-order' | 'physical-order' | 'association' | 'manual'
  temporalFutureIndex?: number
  temporalFutureTotal?: number
}

const PATH_CURVE_OFFSET = 50
const isTemporalOrderVisualConnection = (connectionKind?: NodeConnection['connectionKind']) => (
  connectionKind === 'temporal-order' || connectionKind === 'physical-order'
)

const buildQuadraticPath = (
  x1: number,
  y1: number,
  midX: number,
  midY: number,
  x2: number,
  y2: number,
) => `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`

const getQuadraticPoint = (
  x1: number,
  y1: number,
  midX: number,
  midY: number,
  x2: number,
  y2: number,
  t: number,
) => {
  const invT = 1 - t
  return {
    x: invT * invT * x1 + 2 * invT * t * midX + t * t * x2,
    y: invT * invT * y1 + 2 * invT * t * midY + t * t * y2,
  }
}

const getConnectionSide = (): 'left' | 'right' => 'right'

const getLocationPinAnchorPoint = (elem: HTMLElement) => {
  const pin = elem.querySelector('.location-pin-anchor') as HTMLElement | null
  if (pin) {
    const rect = pin.getBoundingClientRect()
    if (rect.width > 0 || rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.bottom - 1,
      }
    }
  }

  if (elem.classList.contains('location-mention')) {
    const grip = elem.querySelector('.location-grip') as HTMLElement | null
    const rect = elem.getBoundingClientRect()
    const gripRect = grip?.getBoundingClientRect()
    const pinWidth = Math.min(18, Math.max(12, rect.height * 0.72))
    const gap = Number.parseFloat(window.getComputedStyle(elem).columnGap || '0') || 4
    const pinLeft = gripRect ? gripRect.right + gap : rect.left + 6

    return {
      x: pinLeft + pinWidth / 2,
      y: rect.top + rect.height * 0.68,
    }
  }

  const grip = elem.querySelector('.location-grip') as HTMLElement | null
  if (!grip) return null

  const rect = grip.getBoundingClientRect()
  if (rect.width <= 0 && rect.height <= 0) return null

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

/**
 * NodeConnectionManager
 * 
 * Manages connections between connectable elements.
 * Uses a single SVG overlay for rendering with click-to-navigate.
 * 
 * - In Connection mode: click elements to create new connections
 * - Arrows always navigate on click (toggle between head/tail)
 * - Connections persist in localStorage
 */
export const NodeConnectionManager: React.FC<{ containerRef?: React.RefObject<HTMLElement> }> = ({ containerRef }) => {
  const [editorMode, setEditorMode] = useState<EditorMode>('editing')
  const [connections, setConnections] = useState<NodeConnection[]>([])
  const [pendingSource, setPendingSource] = useState<{ id: string, type: ConnectableType } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [connectionPaths, setConnectionPaths] = useState<ConnectionPath[]>([])
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null)
  const focusedEndByConnection = useRef<Record<string, 'head' | 'tail'>>({})
  const pendingRaf = useRef<number | null>(null)
  const hoverHideTimeoutRef = useRef<number | null>(null)
  const connectionsSignatureRef = useRef('')
  const isLocationConnectionMode = editorMode === 'location-connection'
  const isConnectionMode = editorMode === 'temporal-order' || editorMode === 'physical-order' || editorMode === 'association' || isLocationConnectionMode
  const isTemporalOrderMode = editorMode === 'temporal-order' || editorMode === 'physical-order' || isLocationConnectionMode
  const isAssociationMode = editorMode === 'association'
  const usesRouteConnectorCursor = editorMode === 'physical-order' || isLocationConnectionMode

  // Load connections on mount
  useEffect(() => {
    const storedConnections = loadConnections()
    connectionsSignatureRef.current = getConnectionsSignature(storedConnections)
    setConnections(storedConnections)
  }, [])

  useEffect(() => {
    connectionsSignatureRef.current = getConnectionsSignature(connections)
  }, [connections])

  useEffect(() => {
    const handleConnectionsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<NodeConnection[]>
      if (Array.isArray(customEvent.detail)) {
        const nextConnections = customEvent.detail.map((conn) => ({
          ...conn,
          sourceType: conn.sourceType || 'span',
          targetType: conn.targetType || 'span',
          connectionKind: conn.connectionKind || 'manual',
        }))
        connectionsSignatureRef.current = getConnectionsSignature(nextConnections)
        setConnections(nextConnections)
        return
      }

      const storedConnections = loadConnections()
      connectionsSignatureRef.current = getConnectionsSignature(storedConnections)
      setConnections(storedConnections)
    }

    window.addEventListener(CONNECTIONS_UPDATED_EVENT, handleConnectionsUpdated)
    return () => {
      window.removeEventListener(CONNECTIONS_UPDATED_EVENT, handleConnectionsUpdated)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (hoverHideTimeoutRef.current !== null) {
        window.clearTimeout(hoverHideTimeoutRef.current)
      }
    }
  }, [])

  // Listen for document attribute updates
  useEffect(() => {
    const handleAttributeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<DocumentAttributes>
      const updatedAttributes = normalizeDocumentAttributes(customEvent.detail)
      if (updatedAttributes?.editorMode) {
        console.log('[NodeConnectionManager] Mode changed to:', updatedAttributes.editorMode)
        setEditorMode(updatedAttributes.editorMode)
        if (updatedAttributes.editorMode === 'editing') {
          setPendingSource(null)
        }
      }
    }
    
    window.addEventListener('doc-attributes-updated', handleAttributeUpdate)
    
    try {
      const stored = localStorage.getItem(DOC_ATTRIBUTES_STORAGE_KEY)
      if (stored) {
        const attrs = normalizeDocumentAttributes(JSON.parse(stored) as DocumentAttributes)
        if (attrs.editorMode) {
          setEditorMode(attrs.editorMode)
        }
      }
    } catch {}
    
    return () => {
      window.removeEventListener('doc-attributes-updated', handleAttributeUpdate)
    }
  }, [])

  // Handle element clicks in Connection mode to create new connections
  const handleElementClick = useCallback((event: MouseEvent) => {
    if (!isConnectionMode) return
    
    const target = event.target as HTMLElement
    const elementInfo = findConnectableElement(target)
    
    if (!elementInfo) return
    
    const { element, id: elementId, type: elementType } = elementInfo
    if (isLocationConnectionMode && elementType !== 'location') return
    
    event.preventDefault()
    event.stopPropagation()
    
    console.log(`[NodeConnectionManager] Clicked ${elementType}:`, elementId)
    
    if (!pendingSource) {
      setPendingSource({ id: elementId, type: elementType })
      element.style.outline = '2px solid #007AFF'
      element.style.outlineOffset = '2px'
      console.log(`[NodeConnectionManager] Source selected (${elementType}):`, elementId)
    } else {
      if (pendingSource.id === elementId) {
        setPendingSource(null)
        element.style.outline = ''
        element.style.outlineOffset = ''
        console.log('[NodeConnectionManager] Deselected source')
        return
      }

      const existingConnection = connections.find((conn) => (
        conn.sourceId === pendingSource.id &&
        conn.sourceType === pendingSource.type &&
        conn.targetId === elementId &&
        conn.targetType === elementType
      ))

      if (existingConnection) {
        const updatedConnections = connections.filter((conn) => conn.id !== existingConnection.id)
        delete focusedEndByConnection.current[existingConnection.id]
        setConnections(updatedConnections)
        saveConnections(updatedConnections)

        const sourceElement = getConnectableElement(pendingSource.id, pendingSource.type)
        if (sourceElement) {
          sourceElement.style.outline = ''
          sourceElement.style.outlineOffset = ''
        }

        setPendingSource(null)
        console.log('[NodeConnectionManager] Removed connection:', existingConnection)
        return
      }
      
      const sourceElement = getConnectableElement(pendingSource.id, pendingSource.type)
      const connectionKind: NodeConnection['connectionKind'] = editorMode === 'temporal-order'
        ? 'temporal-order'
        : editorMode === 'physical-order' || isLocationConnectionMode
          ? 'physical-order'
          : editorMode === 'association'
            ? 'association'
            : 'manual'
      const newConnection: NodeConnection = {
        id: generateConnectionId(),
        sourceId: pendingSource.id,
        targetId: elementId,
        sourceType: pendingSource.type,
        targetType: elementType,
        connectionKind,
        createdBy: isLocationConnectionMode ? 'manualLocationConnection' : undefined,
        sourceLabel: pendingSource.type === 'location' && sourceElement ? getLocationElementLabel(sourceElement) : undefined,
        targetLabel: elementType === 'location' ? getLocationElementLabel(element) : undefined,
      }
      
      const updatedConnections = [...connections, newConnection]
      setConnections(updatedConnections)
      saveConnections(updatedConnections)
      
      console.log('[NodeConnectionManager] Created connection:', newConnection)
      
      if (sourceElement) {
        sourceElement.style.outline = ''
        sourceElement.style.outlineOffset = ''
      }
      
      if (isLocationConnectionMode) {
        setPendingSource({ id: elementId, type: elementType })
        element.style.outline = '2px solid #007AFF'
        element.style.outlineOffset = '2px'
      } else {
        setPendingSource(null)
      }
    }
  }, [connections, editorMode, isConnectionMode, isLocationConnectionMode, pendingSource])

  // Add/remove click listener based on mode
  useEffect(() => {
    if (isConnectionMode) {
      document.addEventListener('click', handleElementClick, true)
      console.log('[NodeConnectionManager] Connection mode active')
    } else {
      document.removeEventListener('click', handleElementClick, true)
      
      if (pendingSource) {
        const sourceElement = getConnectableElement(pendingSource.id, pendingSource.type)
        if (sourceElement) {
          sourceElement.style.outline = ''
          sourceElement.style.outlineOffset = ''
        }
      }
    }
    
    return () => {
      document.removeEventListener('click', handleElementClick, true)
    }
  }, [handleElementClick, isConnectionMode, pendingSource])

  // Track mouse position when in connection mode (for preview arrow cursor indicator)
  useEffect(() => {
    if (!isConnectionMode) return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isConnectionMode])

  const getAnchorPoint = useCallback((elem: HTMLElement, side: 'left' | 'right', connectionKind?: NodeConnection['connectionKind']) => {
    if (isTemporalOrderVisualConnection(connectionKind)) {
      const locationPinAnchor = getLocationPinAnchorPoint(elem)
      if (locationPinAnchor) return locationPinAnchor
    }

    const mapContainer = elem.querySelector('.mapboxgl-map')
    const marker = elem.querySelector('.mapboxgl-marker')
    
    if (mapContainer && marker) {
      const markerRect = marker.getBoundingClientRect()
      return {
        x: markerRect.left + markerRect.width / 2,
        y: markerRect.top + markerRect.height
      }
    }
    
    const rect = elem.getBoundingClientRect()
    return {
      x: side === 'left' ? rect.left : rect.right,
      y: rect.top + rect.height / 2
    }
  }, [])

  const computeConnectionPaths = useCallback((connectionsToRender: NodeConnection[] = connections): ConnectionPath[] => {
    const side = getConnectionSide()
    const temporalFutureTotal = connectionsToRender.filter((conn) => isTemporalOrderVisualConnection(conn.connectionKind)).length
    let temporalFutureIndex = 0
    
    return connectionsToRender.map((conn) => {
      const sourceElement = getConnectionEndpointElement(conn, 'source')
      const targetElement = getConnectionEndpointElement(conn, 'target')
      
      if (!sourceElement || !targetElement) {
        return null
      }
      
      if (isElementCompletelyHidden(sourceElement) || isElementCompletelyHidden(targetElement)) {
        return null
      }
      
      const sourcePoint = getAnchorPoint(sourceElement, side, conn.connectionKind)
      const targetPoint = getAnchorPoint(targetElement, side, conn.connectionKind)
      const isTemporalOrderConnection = isTemporalOrderVisualConnection(conn.connectionKind)

      const x1 = isTemporalOrderConnection
        ? sourcePoint.x
        : sourcePoint.x + (side === 'left' ? 3 : -3)
      const y1 = sourcePoint.y
      const x2 = isTemporalOrderConnection
        ? targetPoint.x
        : targetPoint.x + (side === 'left' ? -3 : 3)
      const y2 = targetPoint.y
      const horizontalDistance = Math.abs(x2 - x1)
      const temporalCurveLift = Math.min(34, Math.max(18, horizontalDistance * 0.28))
      const temporalRightBias = Math.min(32, Math.max(14, horizontalDistance * 0.18))
      const midX = isTemporalOrderConnection
        ? (x1 + x2) / 2 + temporalRightBias
        : (x1 + x2) / 2 + (side === 'left' ? -PATH_CURVE_OFFSET : PATH_CURVE_OFFSET)
      const midY = isTemporalOrderConnection
        ? Math.min(y1, y2) - temporalCurveLift
        : (y1 + y2) / 2
      
      const angle = Math.atan2(y2 - midY, x2 - midX)
      const arrowSize = 12.4
      const arrowPoints = buildTemporalArrowPolygonPoints(x2, y2, angle, arrowSize)
      const currentTemporalFutureIndex = isTemporalOrderConnection ? temporalFutureIndex++ : 0
      
      return {
        id: conn.id,
        d: buildQuadraticPath(x1, y1, midX, midY, x2, y2),
        arrowPoints,
        x1,
        y1,
        x2,
        y2,
        midX,
        midY,
        sourceId: conn.sourceId,
        targetId: conn.targetId,
        sourceType: conn.sourceType,
        targetType: conn.targetType,
        connectionKind: conn.connectionKind,
        temporalFutureIndex: currentTemporalFutureIndex,
        temporalFutureTotal,
      }
    }).filter(Boolean) as ConnectionPath[]
  }, [connections, getAnchorPoint])

  const requestConnectionUpdate = useCallback(() => {
    if (pendingRaf.current !== null) return
    
    // Architectural choice: use a single requestAnimationFrame for all connections
    // to avoid per-arrow animation loops and DOM churn that can cause flicker.
    pendingRaf.current = window.requestAnimationFrame(() => {
      pendingRaf.current = null
      const storedConnections = loadConnections()
      const storedSignature = getConnectionsSignature(storedConnections)
      const connectionsToRender = storedSignature === connectionsSignatureRef.current
        ? connections
        : storedConnections

      if (storedSignature !== connectionsSignatureRef.current) {
        connectionsSignatureRef.current = storedSignature
        setConnections(storedConnections)
      }

      setConnectionPaths(computeConnectionPaths(connectionsToRender))
    })
  }, [computeConnectionPaths])

  // Update connection paths when connections change or when layout changes
  useEffect(() => {
    requestConnectionUpdate()
  }, [connections, requestConnectionUpdate])

  useEffect(() => {
    const handleUpdate = () => requestConnectionUpdate()
    const scrollTarget = containerRef?.current
    
    if (scrollTarget) {
      scrollTarget.addEventListener('scroll', handleUpdate, { passive: true })
    }
    
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    
    // Architectural choice: observe DOM mutations so arrows track live edits
    // without coupling to editor internals or forcing NodeView re-renders.
    const mutationObserver = new MutationObserver(handleUpdate)
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })
    
    return () => {
      if (scrollTarget) {
        scrollTarget.removeEventListener('scroll', handleUpdate)
      }
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
      mutationObserver.disconnect()
    }
  }, [containerRef, requestConnectionUpdate])

  const handleConnectionClick = useCallback((conn: ConnectionPath, event: React.MouseEvent<SVGElement>) => {
    const sourceElement = getConnectableElement(conn.sourceId, conn.sourceType)
    const targetElement = getConnectableElement(conn.targetId, conn.targetType)
    
    if (!sourceElement || !targetElement) return
    
    const sourceVisible = isElementInViewport(sourceElement)
    const targetVisible = isElementInViewport(targetElement)
    const currentFocus = focusedEndByConnection.current[conn.id] ?? 'tail'
    
    let targetElem: HTMLElement | null = null
    let nextFocusedEnd: 'head' | 'tail' = currentFocus
    
    if (!sourceVisible && !targetVisible) {
      const clickY = event.clientY
      const viewportCenterY = window.innerHeight / 2
      if (clickY < viewportCenterY) {
        targetElem = targetElement
        nextFocusedEnd = 'head'
      } else {
        targetElem = sourceElement
        nextFocusedEnd = 'tail'
      }
    } else if (!targetVisible) {
      targetElem = targetElement
      nextFocusedEnd = 'head'
    } else if (!sourceVisible) {
      targetElem = sourceElement
      nextFocusedEnd = 'tail'
    } else {
      if (currentFocus === 'tail') {
        targetElem = targetElement
        nextFocusedEnd = 'head'
      } else {
        targetElem = sourceElement
        nextFocusedEnd = 'tail'
      }
    }
    
    focusedEndByConnection.current[conn.id] = nextFocusedEnd
    targetElem?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const showConnectionDeleteButton = useCallback((connectionId: string) => {
    if (hoverHideTimeoutRef.current !== null) {
      window.clearTimeout(hoverHideTimeoutRef.current)
      hoverHideTimeoutRef.current = null
    }
    setHoveredConnectionId(connectionId)
  }, [])

  const scheduleHideConnectionDeleteButton = useCallback((connectionId: string) => {
    if (hoverHideTimeoutRef.current !== null) {
      window.clearTimeout(hoverHideTimeoutRef.current)
    }

    hoverHideTimeoutRef.current = window.setTimeout(() => {
      setHoveredConnectionId((current) => (current === connectionId ? null : current))
      hoverHideTimeoutRef.current = null
    }, 120)
  }, [])

  const handleDeleteConnection = useCallback((connectionId: string, event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const updatedConnections = connections.filter((conn) => conn.id !== connectionId)
    delete focusedEndByConnection.current[connectionId]
    setConnections(updatedConnections)
    saveConnections(updatedConnections)
    setHoveredConnectionId((current) => (current === connectionId ? null : current))
  }, [connections])

  // Only render when needed
  if (!isConnectionMode && connections.length === 0) {
    return null
  }

  const hoveredConnection = connectionPaths.find((conn) => conn.id === hoveredConnectionId) ?? null
  const hoveredConnectionDeleteAnchor = hoveredConnection
    ? getQuadraticPoint(
        hoveredConnection.x1,
        hoveredConnection.y1,
        hoveredConnection.midX,
        hoveredConnection.midY,
        hoveredConnection.x2,
        hoveredConnection.y2,
        0.5
      )
    : null

  return (
    <>
      {/* Cursor-following arrow indicator when in connection mode */}
      {isConnectionMode && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 15,
            top: mousePos.y + 15,
            pointerEvents: 'none',
            zIndex: 10001,
            transition: 'opacity 0.1s ease',
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              transform: pendingSource ? 'rotate(-45deg)' : 'rotate(45deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path 
              d="M5 12h14M13 5l6 7-6 7" 
              stroke={usesRouteConnectorCursor ? LOCATION_CONNECTOR_STROKE : pendingSource ? TEMPORAL_ARROW_STROKE : 'rgba(17, 17, 17, 0.82)'}
              strokeWidth="3.6" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="none"
              style={{
                filter: `drop-shadow(0 0 8px ${usesRouteConnectorCursor ? LOCATION_CONNECTOR_GLOW : pendingSource ? TEMPORAL_ARROW_GLOW_STRONG : TEMPORAL_ARROW_GLOW})`,
                opacity: pendingSource ? 1 : 0.82,
              }}
            />
          </svg>
          <div style={{
            fontSize: 10,
            color: usesRouteConnectorCursor ? LOCATION_CONNECTOR_STROKE : pendingSource ? '#111111' : '#3f3f46',
            fontWeight: 600,
            marginTop: 2,
            whiteSpace: 'nowrap',
            textShadow: `0 0 10px ${usesRouteConnectorCursor ? LOCATION_CONNECTOR_GLOW : TEMPORAL_ARROW_GLOW}`,
          }}>
            {pendingSource ? 'to target' : 'select source'}
          </div>
        </div>
      )}

      {hoveredConnection && hoveredConnectionDeleteAnchor && (
        <button
          type="button"
          onMouseEnter={() => showConnectionDeleteButton(hoveredConnection.id)}
          onMouseLeave={() => scheduleHideConnectionDeleteButton(hoveredConnection.id)}
          onClick={(event) => handleDeleteConnection(hoveredConnection.id, event)}
          style={{
            position: 'fixed',
            left: hoveredConnectionDeleteAnchor.x,
            top: hoveredConnectionDeleteAnchor.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            zIndex: 10003,
            border: '1px solid rgba(255, 255, 255, 0.85)',
            background: 'linear-gradient(180deg, rgba(222, 55, 55, 0.96), rgba(177, 25, 25, 0.96))',
            color: '#fff8f8',
            borderRadius: 999,
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 10px 28px rgba(120, 0, 0, 0.28), 0 0 18px rgba(255, 90, 90, 0.22)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          Delete
        </button>
      )}
      
      {/* Render all connections in a single overlay SVG */}
      <svg
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10000,
          overflow: 'visible',
        }}
      >
        {connectionPaths.map((conn) => {
          const usesTemporalOrderStyle = isTemporalOrderMode || isTemporalOrderVisualConnection(conn.connectionKind)
          const usesLocationConnectorStyle =
            conn.connectionKind === 'physical-order' ||
            (conn.sourceType === 'location' && conn.targetType === 'location') ||
            isLocationConnectionMode
          const usesAssociationStyle = isAssociationMode || conn.connectionKind === 'association'

          return (
          <g key={conn.id}>
            {usesLocationConnectorStyle ? (
              <LocationConnectorVisual
                d={conn.d}
                start={{ x: conn.x1, y: conn.y1 }}
                end={{ x: conn.x2, y: conn.y2 }}
                includeHitTarget
                onMouseEnter={() => showConnectionDeleteButton(conn.id)}
                onMouseLeave={() => scheduleHideConnectionDeleteButton(conn.id)}
                onClick={(event) => handleConnectionClick(conn, event)}
              />
            ) : usesTemporalOrderStyle ? (
              <TemporalArrowVisual
                d={conn.d}
                arrowPoints={conn.arrowPoints}
                futureIndex={conn.temporalFutureIndex}
                futureTotal={conn.temporalFutureTotal}
                includeHitTarget
                onMouseEnter={() => showConnectionDeleteButton(conn.id)}
                onMouseLeave={() => scheduleHideConnectionDeleteButton(conn.id)}
                onClick={(event) => handleConnectionClick(conn, event)}
              />
            ) : (
              <>
                <path
                  d={conn.d}
                  stroke="#262626"
                  strokeWidth={3}
                  fill="none"
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onMouseEnter={() => showConnectionDeleteButton(conn.id)}
                  onMouseLeave={() => scheduleHideConnectionDeleteButton(conn.id)}
                  onClick={(event) => handleConnectionClick(conn, event)}
                />
                {!usesAssociationStyle && (
                  <polygon
                    points={conn.arrowPoints}
                    fill="#262626"
                    stroke="#262626"
                    strokeWidth={1}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onMouseEnter={() => showConnectionDeleteButton(conn.id)}
                    onMouseLeave={() => scheduleHideConnectionDeleteButton(conn.id)}
                    onClick={(event) => handleConnectionClick(conn, event)}
                  />
                )}
              </>
            )}
          </g>
        )})}
      </svg>
    </>
  )
}

// Backward-compatible aliases
export const SpanGroupConnectionManager = NodeConnectionManager
export const GroupConnectionManager = NodeConnectionManager

export default NodeConnectionManager
