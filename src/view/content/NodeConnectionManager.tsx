'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { DocumentAttributes } from '../structure/DocumentAttributesExtension'
import HandDrawnArrow from '../components/HandDrawnArrow'

// ============================================================================
// NODE CONNECTION MANAGER
// ============================================================================
// This manager handles connections/arrows between connectable elements in the editor.
// Uses the HandDrawnArrow component for hand-drawn style arrows with click-to-navigate.
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
// Connections are stored in localStorage and persist across sessions.
// Clicking on arrows navigates between connected elements (head/tail toggle).
// ============================================================================

// Connection between two connectable elements
type ConnectableType = 'block' | 'span' | 'node'

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
  if (type === 'span') {
    return document.querySelector(`[data-span-group-id="${id}"]`) as HTMLElement
  } else if (type === 'block') {
    return document.querySelector(`[data-group-id="${id}"]`) as HTMLElement
  } else {
    return document.querySelector(`[data-quanta-id="${id}"]`) as HTMLElement
  }
}

// Generate a DOM-safe ID for an element based on its type and unique ID
// HandDrawnArrow uses document.getElementById(), so we need actual id attributes
const getElementDomId = (id: string, type: ConnectableType): string => {
  return `connection-${type}-${id}`
}

// Ensure an element has an id attribute set for HandDrawnArrow to find it
// This bridges our data-attribute based system with HandDrawnArrow's getElementById approach
const ensureElementHasId = (id: string, type: ConnectableType): string | null => {
  const element = getConnectableElement(id, type)
  if (!element) return null
  
  const domId = getElementDomId(id, type)
  
  // Only set the id if it doesn't already have one (preserve existing ids)
  if (!element.id) {
    element.id = domId
  }
  
  return element.id
}

/**
 * NodeConnectionManager
 * 
 * Manages connections between connectable elements.
 * Uses HandDrawnArrow component for rendering with built-in click-to-navigate.
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
  // Force re-render to update arrow positions on scroll/resize
  const [, forceUpdate] = useState({})

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

  // Force re-render on scroll/resize to update HandDrawnArrow positions
  useEffect(() => {
    const handleUpdate = () => forceUpdate({})
    
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    
    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [])

  // Only render when needed
  if (editorMode !== 'connection' && connections.length === 0) {
    return null
  }

  // Ensure all connected elements have IDs for HandDrawnArrow
  // This bridges our data-attribute system with HandDrawnArrow's getElementById
  const validConnections = connections.map(conn => {
    const sourceElementId = ensureElementHasId(conn.sourceId, conn.sourceType)
    const targetElementId = ensureElementHasId(conn.targetId, conn.targetType)
    
    if (!sourceElementId || !targetElementId) {
      return null
    }
    
    return {
      ...conn,
      sourceElementId,
      targetElementId
    }
  }).filter(Boolean) as (NodeConnection & { sourceElementId: string, targetElementId: string })[]

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
      
      {/* Render HandDrawnArrow for each connection */}
      {/* HandDrawnArrow handles click-to-navigate automatically (toggles between head/tail) */}
      {validConnections.map(conn => (
        <HandDrawnArrow
          key={conn.id}
          fromId={conn.sourceElementId}
          toId={conn.targetElementId}
          side="right"
          showArrowhead={true}
        />
      ))}
    </>
  )
}

// Backward-compatible aliases
export const SpanGroupConnectionManager = NodeConnectionManager
export const GroupConnectionManager = NodeConnectionManager

export default NodeConnectionManager
