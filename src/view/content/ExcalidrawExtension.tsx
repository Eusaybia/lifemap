'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'

// Import Excalidraw styles - required for proper rendering
import '@excalidraw/excalidraw/index.css'

// ============================================================================
// Excalidraw Node View Component
// A virtual whiteboard for sketching hand-drawn style diagrams
// Perfect for moodboards, wireframes, and visual brainstorming
// https://github.com/excalidraw/excalidraw
// ============================================================================

interface ExcalidrawNodeViewProps {
  node: {
    attrs: {
      id: string
      data: string // JSON string of Excalidraw elements
      height: number
    }
  }
  updateAttributes: (attributes: Record<string, any>) => void
  selected: boolean
}

const ExcalidrawNodeView: React.FC<ExcalidrawNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ExcalidrawComponent, setExcalidrawComponent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const excalidrawAPIRef = useRef<any>(null)
  
  const { data, height } = node.attrs

  // Dynamically import Excalidraw (it's a large package)
  useEffect(() => {
    const loadExcalidraw = async () => {
      try {
        const module = await import('@excalidraw/excalidraw')
        setExcalidrawComponent(() => module.Excalidraw)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load Excalidraw:', error)
        setIsLoading(false)
      }
    }
    loadExcalidraw()
  }, [])

  // Parse saved data
  const getInitialData = useCallback(() => {
    if (!data) {
      return { elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} }
    }
    try {
      const parsed = JSON.parse(data)
      return {
        elements: parsed.elements || [],
        appState: parsed.appState || { viewBackgroundColor: '#ffffff' },
        files: parsed.files || {},
      }
    } catch {
      return { elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} }
    }
  }, [data])

  // Save changes to the node (including files/images)
  // Toolbar is always visible, so save on every change
  const handleChange = useCallback((elements: any[], appState: any, files: any) => {
    if (excalidrawAPIRef.current) {
      const dataToSave = JSON.stringify({
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        // Save files (images) - these are stored as base64 data URLs
        files: files || {},
      })
      updateAttributes({ data: dataToSave })
    }
  }, [updateAttributes])

  // Handle resize (height only - width is always 100%)
  const handleResize = useCallback((newHeight: number) => {
    updateAttributes({ height: newHeight })
  }, [updateAttributes])

  if (isLoading) {
    return (
      <NodeViewWrapper
        as="div"
        className={`excalidraw-node ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <div 
          style={{
            width: '100%',
            height: height || 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            border: '2px dashed #ddd',
            borderRadius: '8px',
            color: '#999',
            fontSize: '14px',
          }}
        >
          Loading Excalidraw...
        </div>
      </NodeViewWrapper>
    )
  }

  if (!ExcalidrawComponent) {
    return (
      <NodeViewWrapper
        as="div"
        className={`excalidraw-node ${selected ? 'selected' : ''}`}
        data-id={node.attrs.id}
      >
        <div 
          style={{
            width: '100%',
            height: height || 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff5f5',
            border: '2px dashed #ffcccc',
            borderRadius: '8px',
            color: '#cc0000',
            fontSize: '14px',
          }}
        >
          Failed to load Excalidraw. Please install @excalidraw/excalidraw
        </div>
      </NodeViewWrapper>
    )
  }

  const initialData = getInitialData()

  return (
    <NodeViewWrapper
      as="div"
      className={`excalidraw-node ${selected ? 'selected' : ''}`}
      data-id={node.attrs.id}
      ref={containerRef}
    >
      <div 
        style={{
          width: '100%',
          height: height || 400,
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          background: '#ffffff',
        }}
      >
        {/* Vertical resize handle (height only) - always visible */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60px',
            height: '8px',
            cursor: 'ns-resize',
            zIndex: 100,
            background: '#6366f1',
            borderRadius: '4px 4px 0 0',
            opacity: 0.6,
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            const startY = e.clientY
            const startHeight = height || 400

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const newHeight = Math.max(200, startHeight + (moveEvent.clientY - startY))
              handleResize(newHeight)
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />

        <ExcalidrawComponent
          excalidrawAPI={(api: any) => { excalidrawAPIRef.current = api }}
          initialData={initialData}
          onChange={handleChange}
          viewModeEnabled={false}
          zenModeEnabled={false}
          gridModeEnabled={false}
          theme="light"
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              export: { saveFileToDisk: true },
              loadScene: true,
              saveToActiveFile: false,
              toggleTheme: true,
            },
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}

// ============================================================================
// TipTap Extension
// ============================================================================

export interface ExcalidrawOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    excalidraw: {
      /**
       * Insert an Excalidraw whiteboard (auto-fits page width)
       */
      insertExcalidraw: (attributes?: {
        height?: number
      }) => ReturnType
    }
  }
}

export const ExcalidrawExtension = Node.create<ExcalidrawOptions>({
  name: 'excalidraw',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({
          'data-id': attributes.id || `excalidraw:${Date.now()}`,
        }),
      },
      data: {
        default: '',
        parseHTML: element => element.getAttribute('data-excalidraw'),
        renderHTML: attributes => ({
          'data-excalidraw': attributes.data,
        }),
      },
      height: {
        default: 400,
        parseHTML: element => parseInt(element.getAttribute('data-height') || '400'),
        renderHTML: attributes => ({
          'data-height': attributes.height,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="excalidraw"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'excalidraw' }
    ), '🎨 Excalidraw Whiteboard']
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView)
  },

  addCommands() {
    return {
      insertExcalidraw:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: `excalidraw:${Date.now()}`,
              height: attributes.height || 400,
              data: '',
            },
          })
        },
    }
  },
})

