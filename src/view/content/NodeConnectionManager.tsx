'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { DocumentAttributes, EditorMode, normalizeDocumentAttributes } from '../structure/DocumentAttributesExtension'

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
// Connections are stored in localStorage and persist across sessions.
// Clicking on arrows navigates between connected elements (head/tail toggle).
// ============================================================================

// Connection between two connectable elements
// 'todo', 'question', and 'motivation' types are for inline mention nodes with connection grips
type ConnectableType = 'block' | 'span' | 'node' | 'todo' | 'question' | 'motivation'

interface NodeConnection {
  id: string
  sourceId: string
  targetId: string
  sourceType: ConnectableType
  targetType: ConnectableType
}

// Local storage key for persisting connections
const CONNECTIONS_STORAGE_KEY = 'span-group-connections'
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
    }))
  } catch {
    return []
  }
}

// Save connections to localStorage
const saveConnections = (connections: NodeConnection[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connections))
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
  } else if (type === 'span') {
    return document.querySelector(`[data-span-group-id="${id}"]`) as HTMLElement
  } else if (type === 'block') {
    return document.querySelector(`[data-group-id="${id}"]`) as HTMLElement
  } else {
    return document.querySelector(`[data-quanta-id="${id}"]`) as HTMLElement
  }
}

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
}

const PATH_CURVE_OFFSET = 50
const ETHEREAL_ARROW_STROKE = 'rgba(255, 242, 202, 0.8)'
const ETHEREAL_ARROW_FILAMENT = 'rgba(255, 251, 232, 0.58)'
const ETHEREAL_ARROW_HEAD_FILL = 'rgba(255, 236, 180, 0.88)'
const ETHEREAL_ARROW_GLOW = 'rgba(255, 224, 130, 0.3)'
const ETHEREAL_ARROW_GLOW_STRONG = 'rgba(255, 231, 156, 0.56)'

const hashConnectionKey = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

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

const buildArrowPolygonPoints = (
  x: number,
  y: number,
  angle: number,
  arrowSize: number,
) => (
  `${x},${y} ` +
  `${x - arrowSize * Math.cos(angle - Math.PI / 6)},${y - arrowSize * Math.sin(angle - Math.PI / 6)} ` +
  `${x - arrowSize * Math.cos(angle + Math.PI / 6)},${y - arrowSize * Math.sin(angle + Math.PI / 6)}`
)

const getConnectionMotionSeed = (connectionId: string) => {
  const seed = hashConnectionKey(connectionId)
  return {
    horizontalSwing: 7 + (seed % 7),
    verticalSwing: 5 + ((seed >> 3) % 7),
    tipSwing: 1.8 + ((seed >> 6) % 5) * 0.45,
    swaySpeed: 0.00055 + (seed % 5) * 0.00006,
    flutterSpeed: 0.00115 + ((seed >> 5) % 5) * 0.00008,
    phase: (seed % 360) * (Math.PI / 180),
    crossPhase: ((seed >> 7) % 360) * (Math.PI / 180),
  }
}

const getEtherealFrame = (
  connectionId: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  midX: number,
  midY: number,
  timeMs: number,
) => {
  const motion = getConnectionMotionSeed(connectionId)
  const sway = Math.sin(timeMs * motion.swaySpeed + motion.phase)
  const crossSway = Math.sin(timeMs * motion.flutterSpeed + motion.crossPhase)
  const shimmer = Math.cos(timeMs * (motion.swaySpeed * 0.72) + motion.phase * 0.6)

  const dynamicMidX = midX + sway * motion.horizontalSwing * 0.9 + crossSway * motion.horizontalSwing * 0.28
  const dynamicMidY = midY + crossSway * motion.verticalSwing * 0.82 + shimmer * motion.verticalSwing * 0.24
  const dynamicX2 = x2 + sway * motion.tipSwing * 0.52 + crossSway * 0.42
  const dynamicY2 = y2 + crossSway * motion.verticalSwing * 0.22 + shimmer * 0.36

  const highlightMidX = dynamicMidX + shimmer * 1.15 + crossSway * 0.55
  const highlightMidY = dynamicMidY - sway * 0.9 + shimmer * 0.32
  const highlightX2 = dynamicX2 + shimmer * 0.36
  const highlightY2 = dynamicY2 - sway * 0.22

  const angle = Math.atan2(dynamicY2 - dynamicMidY, dynamicX2 - dynamicMidX)
  const arrowPoints = buildArrowPolygonPoints(dynamicX2, dynamicY2, angle, 12.4)

  return {
    mainPath: buildQuadraticPath(x1, y1, dynamicMidX, dynamicMidY, dynamicX2, dynamicY2),
    filamentPath: buildQuadraticPath(x1, y1, highlightMidX, highlightMidY, highlightX2, highlightY2),
    arrowPoints,
    glowOpacity: 0.12 + ((sway + 1) / 2) * 0.08 + ((crossSway + 1) / 2) * 0.03,
    outerOpacity: 0.2 + ((crossSway + 1) / 2) * 0.16,
    coreOpacity: 0.42 + ((shimmer + 1) / 2) * 0.24,
    filamentOpacity: 0.2 + ((sway + 1) / 2) * 0.15,
    arrowOpacity: 0.45 + ((shimmer + 1) / 2) * 0.18,
    glowWidth: 8.9 + ((crossSway + 1) / 2) * 1.9,
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
  const [etherealTime, setEtherealTime] = useState(() => (typeof performance !== 'undefined' ? performance.now() : Date.now()))
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null)
  const focusedEndByConnection = useRef<Record<string, 'head' | 'tail'>>({})
  const pendingRaf = useRef<number | null>(null)
  const hoverHideTimeoutRef = useRef<number | null>(null)
  const isConnectionMode = editorMode === 'temporal-order' || editorMode === 'physical-order' || editorMode === 'association'
  const isTemporalOrderMode = editorMode === 'temporal-order'
  const isAssociationMode = editorMode === 'association'

  // Load connections on mount
  useEffect(() => {
    setConnections(loadConnections())
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
      
      const newConnection: NodeConnection = {
        id: generateConnectionId(),
        sourceId: pendingSource.id,
        targetId: elementId,
        sourceType: pendingSource.type,
        targetType: elementType
      }
      
      const updatedConnections = [...connections, newConnection]
      setConnections(updatedConnections)
      saveConnections(updatedConnections)
      
      console.log('[NodeConnectionManager] Created connection:', newConnection)
      
      const sourceElement = getConnectableElement(pendingSource.id, pendingSource.type)
      if (sourceElement) {
        sourceElement.style.outline = ''
        sourceElement.style.outlineOffset = ''
      }
      
      setPendingSource(null)
    }
  }, [connections, isConnectionMode, pendingSource])

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

  const getAnchorPoint = useCallback((elem: HTMLElement, side: 'left' | 'right') => {
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

  const computeConnectionPaths = useCallback((): ConnectionPath[] => {
    const side: 'left' | 'right' = 'right'
    
    return connections.map((conn) => {
      const sourceElement = getConnectableElement(conn.sourceId, conn.sourceType)
      const targetElement = getConnectableElement(conn.targetId, conn.targetType)
      
      if (!sourceElement || !targetElement) {
        return null
      }
      
      if (isElementCompletelyHidden(sourceElement) || isElementCompletelyHidden(targetElement)) {
        return null
      }
      
      const sourcePoint = getAnchorPoint(sourceElement, side)
      const targetPoint = getAnchorPoint(targetElement, side)
      
      const x1 = sourcePoint.x + (side === 'left' ? 3 : -3)
      const y1 = sourcePoint.y
      const x2 = targetPoint.x + (side === 'left' ? -3 : 3)
      const y2 = targetPoint.y
      const midX = (x1 + x2) / 2 + (side === 'left' ? -PATH_CURVE_OFFSET : PATH_CURVE_OFFSET)
      const midY = (y1 + y2) / 2
      
      const angle = Math.atan2(y2 - midY, x2 - midX)
      const arrowSize = 12.4
      const arrowPoints = buildArrowPolygonPoints(x2, y2, angle, arrowSize)
      
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
        targetType: conn.targetType
      }
    }).filter(Boolean) as ConnectionPath[]
  }, [connections, getAnchorPoint])

  const requestConnectionUpdate = useCallback(() => {
    if (pendingRaf.current !== null) return
    
    // Architectural choice: use a single requestAnimationFrame for all connections
    // to avoid per-arrow animation loops and DOM churn that can cause flicker.
    pendingRaf.current = window.requestAnimationFrame(() => {
      pendingRaf.current = null
      setConnectionPaths(computeConnectionPaths())
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

  useEffect(() => {
    if (connectionPaths.length === 0) return

    let rafId = 0
    const tick = (time: number) => {
      setEtherealTime(time)
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [connectionPaths.length])

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
      {/* Overlay indicator when in connection mode */}
      {isConnectionMode && (
        <div style={{
          position: 'fixed',
          top: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, rgba(255, 250, 234, 0.9), rgba(250, 237, 198, 0.78))',
          color: '#8c7440',
          padding: '8px 16px',
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          zIndex: 10002,
          border: '1px solid rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: `0 0 18px ${ETHEREAL_ARROW_GLOW}, 0 8px 24px rgba(140, 116, 64, 0.14)`
        }}>
          {pendingSource 
            ? `Click another element to connect (or click same to deselect)` 
            : `Click an element to start a connection`
          }
        </div>
      )}

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
              stroke={pendingSource ? ETHEREAL_ARROW_STROKE : 'rgba(247, 239, 214, 0.8)'} 
              strokeWidth="2.35" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="none"
              style={{
                filter: `drop-shadow(0 0 8px ${pendingSource ? ETHEREAL_ARROW_GLOW_STRONG : ETHEREAL_ARROW_GLOW})`,
                opacity: pendingSource ? 1 : 0.82,
              }}
            />
          </svg>
          <div style={{
            fontSize: 10,
            color: pendingSource ? '#9b8450' : '#a29575',
            fontWeight: 600,
            marginTop: 2,
            whiteSpace: 'nowrap',
            textShadow: `0 0 10px ${ETHEREAL_ARROW_GLOW}`,
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
          const etherealFrame = isTemporalOrderMode
            ? getEtherealFrame(
                conn.id,
                conn.x1,
                conn.y1,
                conn.x2,
                conn.y2,
                conn.midX,
                conn.midY,
                etherealTime
              )
            : null

          return (
          <g key={conn.id}>
            {etherealFrame ? (
              <>
                <path
                  d={etherealFrame.mainPath}
                  stroke={ETHEREAL_ARROW_GLOW}
                  strokeWidth={etherealFrame.glowWidth}
                  strokeLinecap="round"
                  fill="none"
                  style={{
                    pointerEvents: 'none',
                    filter: `blur(1.4px) drop-shadow(0 0 10px ${ETHEREAL_ARROW_GLOW_STRONG})`,
                    opacity: etherealFrame.glowOpacity,
                  }}
                />
                <path
                  d={etherealFrame.mainPath}
                  stroke={ETHEREAL_ARROW_STROKE}
                  strokeWidth={3.25}
                  strokeLinecap="round"
                  fill="none"
                  style={{
                    pointerEvents: 'none',
                    filter: `blur(0.45px) drop-shadow(0 0 7px ${ETHEREAL_ARROW_GLOW_STRONG})`,
                    opacity: etherealFrame.outerOpacity,
                  }}
                />
                <path
                  d={etherealFrame.mainPath}
                  stroke={ETHEREAL_ARROW_STROKE}
                  strokeWidth={1.35}
                  strokeLinecap="round"
                  fill="none"
                  style={{
                    pointerEvents: 'none',
                    filter: `drop-shadow(0 0 6px ${ETHEREAL_ARROW_GLOW_STRONG})`,
                    opacity: etherealFrame.coreOpacity,
                  }}
                />
                <path
                  d={etherealFrame.filamentPath}
                  stroke={ETHEREAL_ARROW_FILAMENT}
                  strokeWidth={0.7}
                  strokeLinecap="round"
                  fill="none"
                  style={{
                    pointerEvents: 'none',
                    filter: `drop-shadow(0 0 2px rgba(255, 255, 255, 0.18))`,
                    opacity: etherealFrame.filamentOpacity,
                  }}
                />
                <polygon
                  points={etherealFrame.arrowPoints}
                  fill={ETHEREAL_ARROW_HEAD_FILL}
                  stroke={ETHEREAL_ARROW_HEAD_FILL}
                  strokeWidth={1.55}
                  style={{
                    pointerEvents: 'none',
                    filter: `drop-shadow(0 0 7px ${ETHEREAL_ARROW_GLOW_STRONG})`,
                    opacity: etherealFrame.arrowOpacity,
                  }}
                />
                <path
                  d={etherealFrame.mainPath}
                  stroke="rgba(0, 0, 0, 0.001)"
                  strokeWidth={16}
                  strokeLinecap="round"
                  fill="none"
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onMouseEnter={() => showConnectionDeleteButton(conn.id)}
                  onMouseLeave={() => scheduleHideConnectionDeleteButton(conn.id)}
                  onClick={(event) => handleConnectionClick(conn, event)}
                />
                <polygon
                  points={etherealFrame.arrowPoints}
                  fill="rgba(0, 0, 0, 0.001)"
                  stroke="rgba(0, 0, 0, 0.001)"
                  strokeWidth={8}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onMouseEnter={() => showConnectionDeleteButton(conn.id)}
                  onMouseLeave={() => scheduleHideConnectionDeleteButton(conn.id)}
                  onClick={(event) => handleConnectionClick(conn, event)}
                />
              </>
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
                {!isAssociationMode && (
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
