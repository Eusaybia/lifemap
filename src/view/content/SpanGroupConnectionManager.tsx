'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { DocumentAttributes, defaultDocumentAttributes } from '../structure/DocumentAttributesExtension'

// ============================================================================
// GROUP CONNECTION MANAGER
// ============================================================================
// This manager handles connections/arrows between Group elements in the editor.
// 
// GROUP ARCHITECTURE:
// Groups are a fundamental organizational unit with two variants:
//
// 1. BLOCK GROUP (GroupTipTapExtension.tsx)
//    - A TipTap Node wrapping block content (cards, sections)
//    - Identified by: [data-group-node-view="true"][data-group-id="<uuid>"]
//    - Has a DragGrip component positioned on the right side
//
// 2. INLINE SPAN GROUP (SpanGroupMark.ts)  
//    - A TipTap Mark wrapping inline text
//    - Identified by: .span-group[data-span-group-id="<uuid>"]
//    - Has a CSS pseudo-element grip (::after) on the right side
//
// Both types share:
// - A 6-dot grip pattern for visual identification
// - Unique IDs for connection targeting
// - Participation in the connection system (this file)
//
// Connections are stored in localStorage and persist across sessions.
// ============================================================================

// Connection between two connectable elements
// sourceType and targetType track which variant the endpoint is:
// - 'block': Block-level Group (GroupTipTapExtension)
// - 'span': Inline SpanGroup (SpanGroupMark)
// - 'node': Generic node with NodeOverlay wrapper
type ConnectableType = 'block' | 'span' | 'node'

interface GroupConnection {
  id: string
  sourceId: string
  targetId: string
  sourceType: ConnectableType
  targetType: ConnectableType
}

// Local storage key for persisting connections
// Note: Key name kept for backwards compatibility with existing data
const CONNECTIONS_STORAGE_KEY = 'span-group-connections'

// Helper to generate a short unique ID for connections
const generateConnectionId = () => Math.random().toString(36).substring(2, 10)

// Load connections from localStorage
const loadConnections = (): GroupConnection[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CONNECTIONS_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    // Migration: add type fields to legacy connections that don't have them
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
const saveConnections = (connections: GroupConnection[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connections))
}

// Helper to find a connectable element and determine its type
// Searches for three types of connectable elements:
// 1. Inline SpanGroup (most specific - a Mark within text)
// 2. Block Group (GroupTipTapExtension - a card-like container)
// 3. Generic Node with NodeOverlay wrapper (any node that uses NodeOverlay)
// Returns { element, id, type } or null if not found
const findGroupElement = (target: HTMLElement): { element: HTMLElement, id: string, type: ConnectableType } | null => {
  // Check for inline span group first (most specific)
  const spanGroup = target.closest('.span-group') as HTMLElement
  if (spanGroup) {
    const id = spanGroup.getAttribute('data-span-group-id')
    if (id) {
      return { element: spanGroup, id, type: 'span' }
    }
  }
  
  // Check for block group (GroupTipTapExtension)
  const blockGroup = target.closest('[data-group-node-view="true"]') as HTMLElement
  if (blockGroup) {
    const id = blockGroup.getAttribute('data-group-id')
    if (id) {
      return { element: blockGroup, id, type: 'block' }
    }
  }
  
  // Check for generic node with NodeOverlay wrapper
  // Uses quantaId from TipTap's UniqueID extension
  const nodeOverlay = target.closest('[data-node-overlay="true"]') as HTMLElement
  if (nodeOverlay) {
    const id = nodeOverlay.getAttribute('data-quanta-id')
    if (id) {
      return { element: nodeOverlay, id, type: 'node' }
    }
  }
  
  return null
}

// Helper to get a connectable element by ID and type
const getGroupElement = (id: string, type: ConnectableType): HTMLElement | null => {
  if (type === 'span') {
    return document.querySelector(`[data-span-group-id="${id}"]`) as HTMLElement
  } else if (type === 'block') {
    return document.querySelector(`[data-group-id="${id}"]`) as HTMLElement
  } else {
    // Generic node with NodeOverlay - uses quantaId from TipTap's UniqueID extension
    return document.querySelector(`[data-quanta-id="${id}"]`) as HTMLElement
  }
}

/**
 * GroupConnectionManager (formerly SpanGroupConnectionManager)
 * 
 * Manages connections between Group elements when in Connection mode.
 * Supports both block-level Groups and inline SpanGroups.
 * - Listens for clicks on any Group element (block or span)
 * - Draws SVG arrows between connected groups
 * - Stores connections in localStorage
 */
export const GroupConnectionManager: React.FC<{ containerRef?: React.RefObject<HTMLElement> }> = ({ containerRef }) => {
  const [editorMode, setEditorMode] = useState<'editing' | 'connection'>('editing')
  const [connections, setConnections] = useState<GroupConnection[]>([])
  // Pending source now tracks both id and type
  // pendingSource tracks the source element for a new connection (supports all connectable types)
  const [pendingSource, setPendingSource] = useState<{ id: string, type: ConnectableType } | null>(null)
  // Track mouse position for cursor-following arrow
  const [mousePos, setMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [, forceUpdate] = useState({})
  const svgRef = useRef<SVGSVGElement>(null)

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
        console.log('[SpanGroupConnectionManager] Mode changed to:', updatedAttributes.editorMode)
        setEditorMode(updatedAttributes.editorMode)
        // Clear pending source when switching modes
        if (updatedAttributes.editorMode !== 'connection') {
          setPendingSource(null)
        }
      }
    }
    
    window.addEventListener('doc-attributes-updated', handleAttributeUpdate)
    
    // Also load initial mode from localStorage
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

  // Handle group clicks in Connection mode (both block and span groups)
  const handleGroupClick = useCallback((event: MouseEvent) => {
    if (editorMode !== 'connection') return
    
    const target = event.target as HTMLElement
    const groupInfo = findGroupElement(target)
    
    if (!groupInfo) return
    
    const { element, id: groupId, type: groupType } = groupInfo
    
    event.preventDefault()
    event.stopPropagation()
    
    console.log(`[GroupConnectionManager] Clicked ${groupType} group:`, groupId)
    
    if (!pendingSource) {
      // First click - set as source
      setPendingSource({ id: groupId, type: groupType })
      element.style.outline = '2px solid #007AFF'
      element.style.outlineOffset = '2px'
      console.log(`[GroupConnectionManager] Source selected (${groupType}):`, groupId)
    } else {
      // Second click - create connection
      if (pendingSource.id === groupId) {
        // Clicked same element - deselect
        setPendingSource(null)
        element.style.outline = ''
        element.style.outlineOffset = ''
        console.log('[GroupConnectionManager] Deselected source')
        return
      }
      
      // Create the connection (can be between any combination of block/span groups)
      const newConnection: GroupConnection = {
        id: generateConnectionId(),
        sourceId: pendingSource.id,
        targetId: groupId,
        sourceType: pendingSource.type,
        targetType: groupType
      }
      
      const updatedConnections = [...connections, newConnection]
      setConnections(updatedConnections)
      saveConnections(updatedConnections)
      
      console.log('[GroupConnectionManager] Created connection:', newConnection)
      
      // Clear source highlight
      const sourceElement = getGroupElement(pendingSource.id, pendingSource.type)
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
      document.addEventListener('click', handleGroupClick, true)
      console.log('[GroupConnectionManager] Connection mode active - listening for group clicks (block and span)')
    } else {
      document.removeEventListener('click', handleGroupClick, true)
      
      // Clear any pending source highlight
      if (pendingSource) {
        const sourceElement = getGroupElement(pendingSource.id, pendingSource.type)
        if (sourceElement) {
          sourceElement.style.outline = ''
          sourceElement.style.outlineOffset = ''
        }
      }
    }
    
    return () => {
      document.removeEventListener('click', handleGroupClick, true)
    }
  }, [editorMode, handleGroupClick, pendingSource])

  // Track mouse position when in connection mode (for cursor-following arrow)
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

  // Force re-render on scroll/resize to update arrow positions
  useEffect(() => {
    const handleUpdate = () => forceUpdate({})
    
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    
    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [])

  // Calculate grip position based on connectable element type
  // All types have grips on the right side, but at different vertical positions
  const getGripPosition = (rect: DOMRect, type: ConnectableType) => {
    if (type === 'span') {
      // Span group: grip is centered vertically, 6px from right edge
      return {
        x: rect.right - 6,
        y: rect.top + rect.height / 2
      }
    } else if (type === 'block') {
      // Block group: DragGrip is at top-right (top: 10px, right: 6px, grip is ~20px tall)
      // Connect to center of the grip
      return {
        x: rect.right - 6 - 8, // 6px right offset + half grip width
        y: rect.top + 10 + 18  // 10px top offset + ~half grip height
      }
    } else {
      // Generic node (NodeOverlay): grip is at top-right (default: top: 10px, right: 6px)
      // Position is similar to block group
      return {
        x: rect.right - 6 - 8,
        y: rect.top + 10 + 18
      }
    }
  }

  // Calculate arrow path between two group elements - connecting grip to grip
  // Handles both block groups (DragGrip component) and span groups (CSS ::after pseudo-element)
  //
  // Grip positions:
  // - Span groups: grip is CSS ::after on right side, 8px wide, 12px tall, 4px margin-left
  // - Block groups: DragGrip is positioned absolute top-right (top: 10px, right: 6px)
  const getArrowPath = (conn: GroupConnection): string | null => {
    const sourceEl = getGroupElement(conn.sourceId, conn.sourceType)
    const targetEl = getGroupElement(conn.targetId, conn.targetType)
    
    if (!sourceEl || !targetEl) return null
    
    const sourceRect = sourceEl.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()
    
    const sourcePos = getGripPosition(sourceRect, conn.sourceType)
    const targetPos = getGripPosition(targetRect, conn.targetType)
    
    // Calculate control points for a smooth curve
    // Since both grips are on the right side, we need to curve outward to the right
    const dy = Math.abs(targetPos.y - sourcePos.y)
    const curveOffset = Math.max(50, dy * 0.5) // Curve outward to the right
    
    return `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + curveOffset} ${sourcePos.y}, ${targetPos.x + curveOffset} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`
  }

  // Calculate preview arrow path from source grip to mouse cursor
  const getPreviewArrowPath = (): string | null => {
    if (!pendingSource) return null
    
    const sourceEl = getGroupElement(pendingSource.id, pendingSource.type)
    if (!sourceEl) return null
    
    const sourceRect = sourceEl.getBoundingClientRect()
    const sourcePos = getGripPosition(sourceRect, pendingSource.type)
    
    // Calculate control points for smooth curve to cursor
    const dy = Math.abs(mousePos.y - sourcePos.y)
    const dx = mousePos.x - sourcePos.x
    // Curve outward based on direction
    const curveOffset = Math.max(30, Math.min(dy * 0.4, 100))
    
    // If cursor is to the right, curve right; if left, curve based on distance
    const curveX = dx > 0 ? curveOffset : -curveOffset / 2
    
    return `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + curveX} ${sourcePos.y}, ${mousePos.x + curveX} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`
  }

  // Only render SVG overlay in connection mode or when there are connections
  if (editorMode !== 'connection' && connections.length === 0) {
    return null
  }

  const previewPath = getPreviewArrowPath()

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
            ? `Click another group to connect (or click same to deselect)` 
            : `Click a group to start a connection`
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
          {/* Arrow icon SVG */}
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
            {/* Arrow pointing right-down */}
            <path 
              d="M5 12h14M13 5l6 7-6 7" 
              stroke={pendingSource ? '#007AFF' : '#666'} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {/* Small label */}
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
      
      {/* SVG overlay for drawing arrows */}
      <svg
        ref={svgRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#000000" />
          </marker>
          <marker
            id="arrowhead-preview"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#007AFF" />
          </marker>
        </defs>
        
        {/* Preview arrow from source to cursor when source is selected */}
        {pendingSource && previewPath && (
          <path
            d={previewPath}
            stroke="#007AFF"
            strokeWidth={2}
            strokeDasharray="8 4"
            fill="none"
            markerEnd="url(#arrowhead-preview)"
            style={{ opacity: 0.8 }}
          />
        )}

        {/* Existing connections */}
        {connections.map(conn => {
          const path = getArrowPath(conn)
          if (!path) return null
          
          return (
            <path
              key={conn.id}
              d={path}
              stroke="#000000"
              strokeWidth={3}
              fill="none"
              markerEnd="url(#arrowhead)"
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                // Remove connection on click
                if (editorMode === 'connection') {
                  const updatedConnections = connections.filter(c => c.id !== conn.id)
                  setConnections(updatedConnections)
                  saveConnections(updatedConnections)
                  console.log('[GroupConnectionManager] Removed connection:', conn.id)
                }
              }}
            />
          )
        })}
      </svg>
    </>
  )
}

// Backward-compatible alias - SpanGroupConnectionManager is now GroupConnectionManager
// SpanGroups are a type of Group (the inline variant), so the manager handles all Group types
export const SpanGroupConnectionManager = GroupConnectionManager

export default GroupConnectionManager
