'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { DocumentAttributes, defaultDocumentAttributes } from '../structure/DocumentAttributesExtension'

// Connection between two span groups
interface SpanGroupConnection {
  id: string
  sourceId: string
  targetId: string
}

// Local storage key for persisting connections
const CONNECTIONS_STORAGE_KEY = 'span-group-connections'

// Helper to generate a short unique ID for connections
const generateConnectionId = () => Math.random().toString(36).substring(2, 10)

// Load connections from localStorage
const loadConnections = (): SpanGroupConnection[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CONNECTIONS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save connections to localStorage
const saveConnections = (connections: SpanGroupConnection[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connections))
}

/**
 * SpanGroupConnectionManager
 * 
 * Manages connections between span groups when in Connection mode.
 * - Listens for clicks on span groups
 * - Draws SVG arrows between connected span groups
 * - Stores connections in localStorage
 */
export const SpanGroupConnectionManager: React.FC<{ containerRef?: React.RefObject<HTMLElement> }> = ({ containerRef }) => {
  const [editorMode, setEditorMode] = useState<'editing' | 'connection'>('editing')
  const [connections, setConnections] = useState<SpanGroupConnection[]>([])
  const [pendingSource, setPendingSource] = useState<string | null>(null)
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

  // Handle span group clicks in Connection mode
  const handleSpanGroupClick = useCallback((event: MouseEvent) => {
    if (editorMode !== 'connection') return
    
    const target = event.target as HTMLElement
    const spanGroup = target.closest('.span-group') as HTMLElement
    
    if (!spanGroup) return
    
    const groupId = spanGroup.getAttribute('data-span-group-id')
    if (!groupId) return
    
    event.preventDefault()
    event.stopPropagation()
    
    console.log('[SpanGroupConnectionManager] Clicked span group:', groupId)
    
    if (!pendingSource) {
      // First click - set as source
      setPendingSource(groupId)
      spanGroup.style.outline = '2px solid #007AFF'
      spanGroup.style.outlineOffset = '2px'
      console.log('[SpanGroupConnectionManager] Source selected:', groupId)
    } else {
      // Second click - create connection
      if (pendingSource === groupId) {
        // Clicked same element - deselect
        setPendingSource(null)
        spanGroup.style.outline = ''
        spanGroup.style.outlineOffset = ''
        console.log('[SpanGroupConnectionManager] Deselected source')
        return
      }
      
      // Create the connection
      const newConnection: SpanGroupConnection = {
        id: generateConnectionId(),
        sourceId: pendingSource,
        targetId: groupId
      }
      
      const updatedConnections = [...connections, newConnection]
      setConnections(updatedConnections)
      saveConnections(updatedConnections)
      
      console.log('[SpanGroupConnectionManager] Created connection:', newConnection)
      
      // Clear source highlight
      const sourceElement = document.querySelector(`[data-span-group-id="${pendingSource}"]`) as HTMLElement
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
      document.addEventListener('click', handleSpanGroupClick, true)
      console.log('[SpanGroupConnectionManager] Connection mode active - listening for span group clicks')
    } else {
      document.removeEventListener('click', handleSpanGroupClick, true)
      
      // Clear any pending source highlight
      if (pendingSource) {
        const sourceElement = document.querySelector(`[data-span-group-id="${pendingSource}"]`) as HTMLElement
        if (sourceElement) {
          sourceElement.style.outline = ''
          sourceElement.style.outlineOffset = ''
        }
      }
    }
    
    return () => {
      document.removeEventListener('click', handleSpanGroupClick, true)
    }
  }, [editorMode, handleSpanGroupClick, pendingSource])

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

  // Calculate arrow path between two elements - connecting grip to grip
  // The grip is an ::after pseudo-element on the right side of each span group
  // Grip dimensions: 8px wide, 12px tall, with 4px margin-left
  const getArrowPath = (sourceId: string, targetId: string): string | null => {
    const sourceEl = document.querySelector(`[data-span-group-id="${sourceId}"]`)
    const targetEl = document.querySelector(`[data-span-group-id="${targetId}"]`)
    
    if (!sourceEl || !targetEl) return null
    
    const sourceRect = sourceEl.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()
    
    // Grip is approximately 6px from the right edge of the element (8px wide grip, centered at 4px)
    // The grip is vertically centered in the element
    const gripOffsetFromRight = 6
    
    // Source grip position (right side of source element)
    const sourceX = sourceRect.right - gripOffsetFromRight
    const sourceY = sourceRect.top + sourceRect.height / 2
    
    // Target grip position (right side of target element)
    const targetX = targetRect.right - gripOffsetFromRight
    const targetY = targetRect.top + targetRect.height / 2
    
    // Calculate control points for a smooth curve
    // Since both grips are on the right side, we need to curve outward to the right
    const dy = Math.abs(targetY - sourceY)
    const curveOffset = Math.max(50, dy * 0.5) // Curve outward to the right
    
    return `M ${sourceX} ${sourceY} C ${sourceX + curveOffset} ${sourceY}, ${targetX + curveOffset} ${targetY}, ${targetX} ${targetY}`
  }

  // Only render SVG overlay in connection mode or when there are connections
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
            ? `Click another span group to connect (or click same to deselect)` 
            : `Click a span group to start a connection`
          }
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
        </defs>
        
        {connections.map(conn => {
          const path = getArrowPath(conn.sourceId, conn.targetId)
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
                  console.log('[SpanGroupConnectionManager] Removed connection:', conn.id)
                }
              }}
            />
          )
        })}
      </svg>
    </>
  )
}

export default SpanGroupConnectionManager
