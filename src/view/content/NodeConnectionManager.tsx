'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { DocumentAttributes } from '../structure/DocumentAttributesExtension'

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
// Connections are stored in localStorage and persist across sessions.
// Clicking on arrows navigates between connected elements (head/tail toggle).
// ============================================================================

// Connection between two connectable elements
// 'todo' and 'question' types are for inline mention nodes with connection grips
type ConnectableType = 'block' | 'span' | 'node' | 'todo' | 'question'

interface NodeConnection {
  id: string
  sourceId: string
  targetId: string
  sourceType: ConnectableType
  targetType: ConnectableType
}

// Local storage key for persisting connections
const CONNECTIONS_STORAGE_KEY = 'span-group-connections'

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
  sourceId: string
  targetId: string
  sourceType: ConnectableType
  targetType: ConnectableType
}

const PATH_CURVE_OFFSET = 50

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
  const [editorMode, setEditorMode] = useState<'editing' | 'connection'>('editing')
  const [connections, setConnections] = useState<NodeConnection[]>([])
  const [pendingSource, setPendingSource] = useState<{ id: string, type: ConnectableType } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [connectionPaths, setConnectionPaths] = useState<ConnectionPath[]>([])
  const focusedEndByConnection = useRef<Record<string, 'head' | 'tail'>>({})
  const pendingRaf = useRef<number | null>(null)

  // Load connections on mount
  useEffect(() => {
    setConnections(loadConnections())
  }, [])

  // Listen for document attribute updates
  useEffect(() => {
    const handleAttributeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<DocumentAttributes>
      const updatedAttributes = customEvent.detail
      if (updatedAttributes?.editorMode) {
        console.log('[NodeConnectionManager] Mode changed to:', updatedAttributes.editorMode)
        setEditorMode(updatedAttributes.editorMode)
        if (updatedAttributes.editorMode !== 'connection') {
          setPendingSource(null)
        }
      }
    }
    
    window.addEventListener('doc-attributes-updated', handleAttributeUpdate)
    
    try {
      const stored = localStorage.getItem('documentAttributes')
      if (stored) {
        const attrs = JSON.parse(stored) as DocumentAttributes
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
    if (editorMode !== 'connection') return
    
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
  }, [editorMode, pendingSource, connections])

  // Add/remove click listener based on mode
  useEffect(() => {
    if (editorMode === 'connection') {
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
  }, [editorMode, handleElementClick, pendingSource])

  // Track mouse position when in connection mode (for preview arrow cursor indicator)
  useEffect(() => {
    if (editorMode !== 'connection') return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [editorMode])

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
      const arrowSize = 12
      const arrowPoints = `${x2},${y2} ${x2 - arrowSize * Math.cos(angle - Math.PI / 6)},${y2 - arrowSize * Math.sin(angle - Math.PI / 6)} ${x2 - arrowSize * Math.cos(angle + Math.PI / 6)},${y2 - arrowSize * Math.sin(angle + Math.PI / 6)}`
      
      return {
        id: conn.id,
        d: `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`,
        arrowPoints,
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

  // Only render when needed
  if (editorMode !== 'connection' && connections.length === 0) {
    return null
  }

  return (
    <>
      {/* Overlay indicator when in connection mode */}
      {editorMode === 'connection' && (
        <div style={{
          position: 'fixed',
          top: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#007AFF',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          zIndex: 10002,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {pendingSource 
            ? `Click another element to connect (or click same to deselect)` 
            : `Click an element to start a connection`
          }
        </div>
      )}

      {/* Cursor-following arrow indicator when in connection mode */}
      {editorMode === 'connection' && (
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
              stroke={pendingSource ? '#007AFF' : '#666'} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <div style={{
            fontSize: 10,
            color: pendingSource ? '#007AFF' : '#666',
            fontWeight: 600,
            marginTop: 2,
            whiteSpace: 'nowrap',
          }}>
            {pendingSource ? 'to target' : 'select source'}
          </div>
        </div>
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
        {connectionPaths.map((conn) => (
          <g key={conn.id}>
            <path
              d={conn.d}
              // Black arrows represent physical-world actions; future translucent arrows will represent mental motion between concepts.
              stroke="#262626"
              strokeWidth={3}
              fill="none"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={(event) => handleConnectionClick(conn, event)}
            />
            <polygon
              points={conn.arrowPoints}
              // Black arrowheads represent physical-world actions; future translucent arrows will represent mental motion between concepts.
              fill="#262626"
              stroke="#262626"
              strokeWidth={1}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={(event) => handleConnectionClick(conn, event)}
            />
          </g>
        ))}
      </svg>
    </>
  )
}

// Backward-compatible aliases
export const SpanGroupConnectionManager = NodeConnectionManager
export const GroupConnectionManager = NodeConnectionManager

export default NodeConnectionManager
