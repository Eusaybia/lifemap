'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps, useEditor, EditorContent } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
import StarterKit from '@tiptap/starter-kit'

// Generate UUID using browser's crypto API
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Import extensions for embedded editors
import { LifetimeViewExtension } from './LifetimeViewExtension'
import { MapboxMapExtension } from '../content/MapboxMapExtension'
import { ExcalidrawExtension } from '../content/ExcalidrawExtension'
import { QuantaFlowExtension } from './QuantaFlowExtension'
import { WarningExtension } from './WarningTipTapExtension'
import { ExternalPortalExtension } from './ExternalPortalExtension'
import { LifemapCardExtension, SingleLifemapCardExtension } from './LifemapCardExtension'
import { GroupExtension } from './GroupTipTapExtension'
import { ConcentricRingsExtension } from './ConcentricRingsExtension'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import Image from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { NodeOverlay } from '../components/NodeOverlay'
import { NodeConnectionManager } from '../content/NodeConnectionManager'

// ============================================================================
// Slash Menu Items for Canvas
// ============================================================================

export interface CanvasSlashMenuItem {
  id: string
  title: string
  emoji: string
  keywords: string[]
  nodeContent?: any // TipTap node JSON content (optional if using action)
  // Optional action for dynamic items like image upload - returns a Promise with the content
  action?: () => Promise<any | null>
}

export const canvasSlashMenuItems: CanvasSlashMenuItem[] = [
  { 
    id: 'group', 
    title: 'Group', 
    emoji: '📦', 
    keywords: ['group', 'container', 'block'],
    // Group nodes wrap block content - initialize with an empty paragraph inside
    nodeContent: { type: 'group', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New group - double-click to edit' }] }] }
  },
  { 
    id: 'heading-1', 
    title: 'Heading 1', 
    emoji: 'H1', 
    keywords: ['heading', 'h1', 'title'],
    nodeContent: { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Heading 1' }] }
  },
  { 
    id: 'heading-2', 
    title: 'Heading 2', 
    emoji: 'H2', 
    keywords: ['heading', 'h2'],
    nodeContent: { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading 2' }] }
  },
  { 
    id: 'heading-3', 
    title: 'Heading 3', 
    emoji: 'H3', 
    keywords: ['heading', 'h3'],
    nodeContent: { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Heading 3' }] }
  },
  { 
    id: 'bullet-list', 
    title: 'Bullet List', 
    emoji: '•', 
    keywords: ['bullet', 'list', 'ul'],
    nodeContent: { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 3' }] }] },
    ]}
  },
  { 
    id: 'numbered-list', 
    title: 'Numbered List', 
    emoji: '1.', 
    keywords: ['numbered', 'list', 'ol'],
    nodeContent: { type: 'orderedList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Third' }] }] },
    ]}
  },
  { 
    id: 'task-list', 
    title: 'Task List', 
    emoji: '☑️', 
    keywords: ['task', 'todo', 'checklist'],
    nodeContent: { type: 'taskList', content: [
      { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 1' }] }] },
      { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 2' }] }] },
      { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 3' }] }] },
    ]}
  },
  { 
    id: 'blockquote', 
    title: 'Quote', 
    emoji: '"', 
    keywords: ['quote', 'blockquote'],
    nodeContent: { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A meaningful quote...' }] }] }
  },
  { 
    id: 'code-block', 
    title: 'Code Block', 
    emoji: '</>', 
    keywords: ['code', 'programming'],
    nodeContent: { type: 'codeBlock', content: [{ type: 'text', text: '// Your code here\nconsole.log("Hello!");' }] }
  },
  { 
    id: 'divider', 
    title: 'Divider', 
    emoji: '—', 
    keywords: ['divider', 'line', 'hr'],
    nodeContent: { type: 'horizontalRule' }
  },
  { 
    id: 'warning', 
    title: 'Warning', 
    emoji: '⚠️', 
    keywords: ['warning', 'alert', 'callout'],
    nodeContent: { type: 'warning' }
  },
  { 
    id: 'details', 
    title: 'Details', 
    emoji: '▶', 
    keywords: ['details', 'collapse', 'accordion'],
    nodeContent: { type: 'details', content: [
      { type: 'detailsSummary', content: [{ type: 'text', text: 'Click to expand' }] },
      { type: 'detailsContent', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hidden content here...' }] }] }
    ]}
  },
  { 
    id: 'mapbox-map', 
    title: 'Map', 
    emoji: '🗺️', 
    keywords: ['map', 'location', 'geography'],
    nodeContent: { 
      type: 'mapboxMap', 
      attrs: { 
        center: [-74.5, 40], 
        zoom: 9, 
        markers: [],
        style: 'mapbox://styles/mapbox/streets-v12'
      } 
    }
  },
  { 
    id: 'excalidraw', 
    title: 'Whiteboard', 
    emoji: '🎨', 
    keywords: ['excalidraw', 'draw', 'sketch'],
    nodeContent: { type: 'excalidraw', attrs: { id: '', data: '', height: 300 } }
  },
  { 
    id: 'temporal-graph', 
    title: 'Timeline', 
    emoji: '📊', 
    keywords: ['graph', 'timeline', 'chart'],
    nodeContent: { type: 'quantaFlow', attrs: { height: 200 } }
  },
  { 
    id: 'lifetime-view', 
    title: 'Lifetime View', 
    emoji: '⏳', 
    keywords: ['lifetime', 'years', 'age'],
    nodeContent: { 
      type: 'lifetimeView', 
      attrs: { 
        dateOfBirth: new Date(1998, 0, 12).toISOString() 
      } 
    }
  },
  { 
    id: 'external-portal', 
    title: 'Portal', 
    emoji: '📡', 
    keywords: ['portal', 'embed', 'link'],
    // Note: externalQuantaId is generated dynamically in addItemFromMenu
    nodeContent: { type: 'externalPortal', attrs: { externalQuantaId: '' } }
  },
  { 
    id: 'card', 
    title: 'Card', 
    emoji: '🪪', 
    keywords: ['card', 'container'],
    nodeContent: { type: 'singleLifemapCard', attrs: { title: 'Card' } }
  },
  { 
    id: 'concentric-rings', 
    title: 'Concentric Rings', 
    emoji: '◎', 
    keywords: ['rings', 'circles', 'concentric', 'layers', 'zones'],
    nodeContent: { type: 'concentricRings' }
  },
  { 
    id: 'image', 
    title: 'Image', 
    emoji: '🌁', 
    keywords: ['image', 'picture', 'photo', 'upload'],
    // Action-based item - triggers file picker and uploads image
    action: () => new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(null)
          return
        }
        
        try {
          const response = await fetch(
            `/api/upload?filename=${encodeURIComponent(file.name)}`,
            { method: 'POST', body: file }
          )
          if (!response.ok) throw new Error('Upload failed')
          const blob = await response.json()
          // Return image node content with the uploaded URL
          resolve({ type: 'image', attrs: { src: blob.url } })
        } catch (error) {
          console.error('Image upload failed:', error)
          resolve(null)
        }
      }
      // Handle cancel
      input.addEventListener('cancel', () => resolve(null))
      input.click()
    })
  },
]

// ============================================================================
// Canvas Item Interface
// ============================================================================

export interface CanvasItem {
  id: string
  nodeType: string
  x: number
  y: number
  rotation: number
  width: number
  height: number
  content: any // TipTap JSON content
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 10)

// Get default dimensions for node types
export const getNodeDefaults = (nodeType: string): { width: number; height: number } => {
  switch (nodeType) {
    case 'group':
      return { width: 250, height: 120 }
    case 'heading-1':
    case 'heading-2':
    case 'heading-3':
      return { width: 200, height: 80 }
    case 'bullet-list':
    case 'numbered-list':
    case 'task-list':
      return { width: 200, height: 140 }
    case 'blockquote':
      return { width: 220, height: 100 }
    case 'code-block':
      return { width: 280, height: 120 }
    case 'divider':
      return { width: 200, height: 40 }
    case 'warning':
      return { width: 250, height: 100 }
    case 'details':
      return { width: 220, height: 80 }
    case 'mapbox-map':
      return { width: 350, height: 250 }
    case 'excalidraw':
      return { width: 400, height: 300 }
    case 'temporal-graph':
      return { width: 350, height: 220 }
    case 'lifetime-view':
      return { width: 400, height: 350 }
    case 'external-portal':
      return { width: 400, height: 400 }
    case 'card':
      return { width: 200, height: 150 }
    case 'concentric-rings':
      return { width: 340, height: 400 }
    case 'image':
      return { width: 300, height: 200 }
    default:
      return { width: 200, height: 100 }
  }
}

// ============================================================================
// Canvas Slash Menu Dropdown
// ============================================================================

interface SlashMenuDropdownProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: CanvasSlashMenuItem) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  position: { x: number; y: number }
}

export const SlashMenuDropdown: React.FC<SlashMenuDropdownProps> = ({
  isOpen,
  onClose,
  onSelect,
  searchQuery,
  onSearchChange,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredItems = canvasSlashMenuItems.filter(item => {
    if (!searchQuery) return true
    const lowerQuery = searchQuery.toLowerCase()
    return (
      item.title.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))
    )
  })

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems.length])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault()
      onSelect(filteredItems[selectedIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [filteredItems, selectedIndex, onSelect, onClose])

  if (!isOpen) return null

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 10,
        border: '1px solid #ddd',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: 220,
        maxHeight: 320,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #eee' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      <div style={{ overflow: 'auto', maxHeight: 260, padding: '4px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#888', fontSize: 13 }}>
            No matching nodes
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
              }}
              whileHover={{ backgroundColor: 'rgba(0, 122, 255, 0.08)' }}
            >
              <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{item.emoji}</span>
              <span style={{ fontSize: 13, color: '#333' }}>{item.title}</span>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Embedded Mini Editor - Renders actual TipTap content
// ============================================================================

const MiniEditor: React.FC<{
  content: any
  onUpdate: (content: any) => void
  isSelected: boolean
  nodeType: string
}> = ({ content, onUpdate, isSelected, nodeType }) => {
  const [isReady, setIsReady] = useState(false)
  const [hasError] = useState(false)
  
  // Log content for debugging
  useEffect(() => {
    console.log(`[MiniEditor] ${nodeType} content:`, content)
  }, [content, nodeType])
  
  // Validate content is proper TipTap JSON
  const validContent = useMemo(() => {
    if (!content) return { type: 'doc', content: [{ type: 'paragraph' }] }
    if (typeof content === 'string') {
      // Legacy string content - wrap in paragraph
      return { 
        type: 'doc', 
        content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] 
      }
    }
    if (content.type === 'doc') return content
    // Wrap single node in doc
    return { type: 'doc', content: [content] }
  }, [content])
  
  // ARCHITECTURE DECISION: Keep a stable editor instance per canvas item so
  // parent state updates don't re-create the TipTap editor and re-initialize
  // complex nodes like Group. Content updates are applied via setContent below.
  const initialContentRef = useRef(validContent)
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])
  const miniEditorExtensions = useMemo(() => ([
    StarterKit.configure({
      // Disable history to avoid conflicts
      undoRedo: false,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image,
    Details,
    DetailsSummary,
    DetailsContent,
    WarningExtension,
    LifetimeViewExtension,
    MapboxMapExtension,
    ExcalidrawExtension,
    QuantaFlowExtension,
    ExternalPortalExtension,
    LifemapCardExtension,
    SingleLifemapCardExtension,
    GroupExtension,
    ConcentricRingsExtension,
  ]), [])

  // ARCHITECTURE DECISION: Always editable so users can click and type directly
  // without needing to select the canvas item first.
  const editor = useEditor({
    extensions: miniEditorExtensions,
    content: initialContentRef.current,
    editable: true,
    immediatelyRender: true, // Allow immediate render for nested editors
    onCreate: ({ editor }) => {
      console.log(`[MiniEditor] ${nodeType} editor created, schema nodes:`, Object.keys(editor.schema.nodes))
      // Mark as ready after a short delay to ensure NodeViews are mounted
      setTimeout(() => setIsReady(true), 100)
    },
    onUpdate: ({ editor }) => {
      onUpdateRef.current(editor.getJSON())
    },
  }, [miniEditorExtensions])

  // Update content when it changes externally
  useEffect(() => {
    if (editor) {
      const currentContent = JSON.stringify(editor.getJSON())
      const newContent = JSON.stringify(validContent)
      if (currentContent !== newContent) {
        editor.commands.setContent(validContent)
      }
    }
  }, [editor, validContent])

  if (hasError) {
    return (
      <div style={{ 
        padding: 8, 
        color: '#FF3B30', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        fontSize: 12,
      }}>
        Error rendering {nodeType}
      </div>
    )
  }

  if (!editor || !isReady) {
    return (
      <div style={{ 
        padding: 8, 
        color: '#888', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
      }}>
        Loading {nodeType}...
      </div>
    )
  }

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'auto',
        fontSize: 13,
      }}
      className="canvas-mini-editor"
    >
      <EditorContent editor={editor} />
    </div>
  )
}

// ============================================================================
// Canvas Item Component - Individual draggable/rotatable item
// ============================================================================

interface CanvasItemProps {
  item: CanvasItem
  isSelected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<CanvasItem>) => void
  onDelete: () => void
  canvasRef: React.RefObject<HTMLDivElement>
}

export const CanvasItemComponent: React.FC<CanvasItemProps> = ({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  canvasRef,
}) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, itemX: 0, itemY: 0 })
  const rotateStart = useRef({ angle: 0, itemRotation: 0 })
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isRotating || isResizing) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    onSelect()
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      itemX: item.x,
      itemY: item.y,
    }
  }, [item.x, item.y, isRotating, isResizing, onSelect])

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      onUpdate({
        x: dragStart.current.itemX + dx,
        y: dragStart.current.itemY + dy,
      })
    }

    const handleMouseUp = () => setIsDragging(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onUpdate])

  // Handle rotation start
  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRotating(true)
    onSelect()

    const rect = itemRef.current?.getBoundingClientRect()
    if (!rect) return

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)

    rotateStart.current = { angle, itemRotation: item.rotation }
  }, [item.rotation, onSelect])

  // Handle rotation move
  useEffect(() => {
    if (!isRotating) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = itemRef.current?.getBoundingClientRect()
      if (!rect) return

      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
      const deltaAngle = currentAngle - rotateStart.current.angle

      onUpdate({ rotation: rotateStart.current.itemRotation + deltaAngle })
    }

    const handleMouseUp = () => setIsRotating(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isRotating, onUpdate])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    onSelect()
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: item.width,
      height: item.height,
    }
  }, [item.width, item.height, onSelect])

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x
      const dy = e.clientY - resizeStart.current.y
      onUpdate({
        width: Math.max(100, resizeStart.current.width + dx),
        height: Math.max(60, resizeStart.current.height + dy),
      })
    }

    const handleMouseUp = () => setIsResizing(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, onUpdate])

  // Handle content update from mini editor
  const handleContentUpdate = useCallback((newContent: any) => {
    onUpdate({ content: newContent })
  }, [onUpdate])

  return (
    // Outer positioning wrapper for canvas - handles absolute position, rotation, size
    // Selection controls (border, rotation, delete, resize) wrap the content
    // The content's own NodeOverlay/Group grip is used for dragging via onGripMouseDown
    <div
      ref={itemRef}
      data-canvas-item="true"
      data-node-overlay="true"
      data-quanta-id={item.id}
      // ARCHITECTURE DECISION: data-canvas3d-draggable tells InfiniteViewer to stop
      // panning when interacting with this element, so canvas items can be dragged
      // independently without moving the underlying viewer.
      data-canvas3d-draggable="true"
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: `rotate(${item.rotation}deg)`,
        userSelect: 'none',
        zIndex: isSelected ? 10 : 1,
        // Selection border applied to outer wrapper
        border: isSelected ? '2px solid #007AFF' : '2px solid transparent',
        borderRadius: 12,
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Content container - the MiniEditor will render nodes with their own styling
          The inner node's grip (from NodeOverlay) triggers dragging via CSS pointer interception
          overflow: visible allows node shadows to display properly */}
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          overflow: 'visible',
          borderRadius: 10,
          position: 'relative',
        }}
      >
        {/* Invisible drag handle at top - intercepts mouse events for dragging
            This captures the grip area so dragging works from the content's grip */}
        <div
          onMouseDown={handleDragStart}
          data-canvas3d-draggable="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 40,
            cursor: isDragging ? 'grabbing' : 'grab',
            zIndex: 100,
            // Semi-transparent to show we can drag from here (remove in production)
            // backgroundColor: 'rgba(0, 122, 255, 0.1)',
          }}
        />
        
        {/* Mini editor content - renders nodes with their natural NodeOverlay styling */}
        <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
          <MiniEditor
            content={item.content}
            onUpdate={handleContentUpdate}
            isSelected={isSelected}
            nodeType={item.nodeType}
          />
        </div>
      </div>

      {/* Selection controls - only shown when selected */}
      {isSelected && (
        <>
          {/* Rotation handle */}
          <div
            onMouseDown={handleRotateStart}
            style={{
              position: 'absolute',
              top: -30,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 20,
              height: 20,
              backgroundColor: '#007AFF',
              borderRadius: '50%',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </div>

          {/* Connection line to rotation handle */}
          <div
            style={{
              position: 'absolute',
              top: -20,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 2,
              height: 20,
              backgroundColor: '#007AFF',
            }}
          />

          {/* Delete button */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              width: 24,
              height: 24,
              backgroundColor: '#FF3B30',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              color: 'white',
              fontSize: 14,
              fontWeight: 'bold',
              zIndex: 20,
            }}
          >
            ×
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              width: 16,
              height: 16,
              backgroundColor: '#007AFF',
              borderRadius: 3,
              cursor: 'se-resize',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 20,
            }}
          />
        </>
      )}
    </div>
  )
}

// ============================================================================
// Canvas Node View Component
// ============================================================================

const CanvasNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, selected } = props
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 100, y: 100 })
  const [searchQuery, setSearchQuery] = useState('')
  
  // Canvas resize state
  const [isResizingCanvas, setIsResizingCanvas] = useState(false)
  const canvasResizeStart = useRef({ y: 0, height: 0 })

  const items: CanvasItem[] = node.attrs.items ? JSON.parse(node.attrs.items) : []

  const updateItems = useCallback((newItems: CanvasItem[]) => {
    updateAttributes({ items: JSON.stringify(newItems) })
  }, [updateAttributes])

  const addItemFromMenu = useCallback((menuItem: CanvasSlashMenuItem) => {
    const defaults = getNodeDefaults(menuItem.id)
    
    // Generate node content - handle special cases that need dynamic IDs
    let nodeContent = menuItem.nodeContent
    if (menuItem.id === 'external-portal') {
      // Generate a new UUID for the portal
      const newQuantaId = generateUUID()
      nodeContent = { 
        type: 'externalPortal', 
        attrs: { externalQuantaId: newQuantaId } 
      }
    }
    
    const newItem: CanvasItem = {
      id: generateId(),
      nodeType: menuItem.id,
      x: slashMenuPosition.x,
      y: slashMenuPosition.y,
      rotation: 0,
      width: defaults.width,
      height: defaults.height,
      content: { type: 'doc', content: [nodeContent] },
    }

    updateItems([...items, newItem])
    setSelectedItemId(newItem.id)
    setShowSlashMenu(false)
    setSearchQuery('')
  }, [items, updateItems, slashMenuPosition])

  const updateItem = useCallback((id: string, updates: Partial<CanvasItem>) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
    updateItems(newItems)
  }, [items, updateItems])

  const deleteItem = useCallback((id: string) => {
    const newItems = items.filter(item => item.id !== id)
    updateItems(newItems)
    if (selectedItemId === id) {
      setSelectedItemId(null)
    }
  }, [items, updateItems, selectedItemId])

  const handleCanvasClick = useCallback(() => {
    setSelectedItemId(null)
  }, [])

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return

    const x = e.clientX - canvasRect.left
    const y = e.clientY - canvasRect.top

    setSlashMenuPosition({ x, y })
    setShowSlashMenu(true)
    setSearchQuery('')
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === '/' && !showSlashMenu) {
      e.preventDefault()
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      const centerX = canvasRect ? canvasRect.width / 2 - 100 : 100
      const centerY = canvasRect ? canvasRect.height / 2 - 100 : 100
      setSlashMenuPosition({ x: centerX, y: centerY })
      setShowSlashMenu(true)
      setSearchQuery('')
    } else if (e.key === 'Escape' && showSlashMenu) {
      setShowSlashMenu(false)
      setSearchQuery('')
    }
  }, [showSlashMenu])

  const handleAddNodeClick = useCallback(() => {
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    const centerX = canvasRect ? canvasRect.width / 2 - 100 : 100
    const centerY = canvasRect ? canvasRect.height / 2 - 100 : 100
    setSlashMenuPosition({ x: centerX, y: centerY })
    setShowSlashMenu(true)
    setSearchQuery('')
  }, [])

  // Canvas resize handlers
  const handleCanvasResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizingCanvas(true)
    canvasResizeStart.current = {
      y: e.clientY,
      height: node.attrs.height || 500,
    }
  }, [node.attrs.height])

  // Handle canvas resize move
  useEffect(() => {
    if (!isResizingCanvas) return

    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - canvasResizeStart.current.y
      const newHeight = Math.max(200, canvasResizeStart.current.height + dy)
      updateAttributes({ height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizingCanvas(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingCanvas, updateAttributes])

  return (
    <NodeViewWrapper
      as="div"
      data-canvas-node="true"
      style={{ margin: '16px 0' }}
    >
      <NodeOverlay nodeProps={props} nodeType="canvas">
        <div
          style={{
            border: selected ? '2px solid #007AFF' : '1px solid #e5e5e5',
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: '#fafafa',
            position: 'relative',
          }}
        >
        {/* Floating Add Node Button */}
        <motion.button
          onClick={handleAddNodeClick}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 12px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          whileHover={{ backgroundColor: '#0066DD' }}
          whileTap={{ scale: 0.95 }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          <span>Node</span>
        </motion.button>

        {/* Canvas Area */}
        <div
          ref={canvasRef}
          tabIndex={0}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          onKeyDown={handleKeyDown}
          style={{
            position: 'relative',
            width: '100%',
            height: node.attrs.height || 500,
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            overflow: 'hidden',
            outline: 'none',
          }}
        >
          {/* ARCHITECTURE DECISION: Watermark clarifies legacy canvas vs React Flow. */}
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              fontSize: 12,
              fontFamily: "'Inter', system-ui, sans-serif",
              color: 'rgba(0, 0, 0, 0.45)',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              padding: '4px 8px',
              borderRadius: 6,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            Legacy Canvas
          </div>
          {items.map(item => (
            <CanvasItemComponent
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              onSelect={() => setSelectedItemId(item.id)}
              onUpdate={(updates) => updateItem(item.id, updates)}
              onDelete={() => deleteItem(item.id)}
              canvasRef={canvasRef}
            />
          ))}

          {/* NodeConnectionManager enables drawing connections/arrows between canvas items
              Uses the data-node-overlay and data-quanta-id attributes on CanvasItemComponent */}
          <NodeConnectionManager containerRef={canvasRef} />

          <AnimatePresence>
            {showSlashMenu && (
              <SlashMenuDropdown
                isOpen={showSlashMenu}
                onClose={() => {
                  setShowSlashMenu(false)
                  setSearchQuery('')
                }}
                onSelect={addItemFromMenu}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                position={slashMenuPosition}
              />
            )}
          </AnimatePresence>

          {/* Canvas Resize Handle */}
          <div
            onMouseDown={handleCanvasResizeStart}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 20,
              height: 20,
              cursor: 'se-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            {/* Resize grip icon */}
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 12 12" 
              style={{ opacity: 0.4 }}
            >
              <path 
                d="M10 2L2 10M10 6L6 10M10 10L10 10" 
                stroke="#666" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
      </NodeOverlay>
    </NodeViewWrapper>
  )
}
