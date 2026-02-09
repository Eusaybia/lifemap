"use client"

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Node as TipTapNode, Extensions } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps, useEditor, EditorContent } from "@tiptap/react"
import { ReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, Connection, Edge, EdgeChange, Node, NodeChange, Handle, Position, NodeProps, NodeResizer } from "@xyflow/react"
import { AnimatePresence } from "framer-motion"
import { NodeOverlay } from "../components/NodeOverlay"
import { canvasSlashMenuItems, CanvasSlashMenuItem, SlashMenuDropdown, getNodeDefaults } from "./CanvasExtension"
// Import the full editor extensions from RichText
import { officialExtensions, customExtensions } from "../content/RichText"
import "@xyflow/react/dist/style.css"

// ============================================================================
// Canvas Component (React Flow backed)
// Architecture: Use React Flow to unify pan/zoom + connection behavior instead
// of maintaining bespoke canvas gesture handlers across editors.
// Reference: https://reactflow.dev/learn
// ============================================================================

type Canvas3DLenses = "identity" | "private"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    canvas3D: {
      insertCanvas3D: () => ReturnType
      setCanvas3DLens: (options: { lens: Canvas3DLenses }) => ReturnType
    }
  }
}

// ARCHITECTURE DECISION: Keep Canvas3D at a fixed desktop size and let
// smaller viewports clip it instead of scaling the content.
const CANVAS3D_WIDTH = 1920
const CANVAS3D_HEIGHT = 1080

// Generate unique ID for React Flow nodes
const generateNodeId = () => `node-${Math.random().toString(36).substring(2, 10)}`

// Generate UUID using browser's crypto API
const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================================================
// Mini Editor - Renders full Quanta editor inside React Flow nodes
// ARCHITECTURE DECISION: Use the same extensions as the main RichText editor
// to provide the fully-fledged editing experience. We filter out Canvas3D and
// CanvasOld extensions to prevent infinite recursion of nested canvases.
// ============================================================================

interface MiniEditorProps {
  content: any
  onUpdate: (content: any) => void
  nodeType: string
  nodeId: string
}

// Extensions to exclude from nested editors to prevent recursion/conflicts
const EXCLUDED_EXTENSION_NAMES = ["canvas3D", "canvas", "bubbleMenu"]

const MiniEditor: React.FC<MiniEditorProps> = ({ content, onUpdate, nodeType, nodeId }) => {
  const [isReady, setIsReady] = useState(false)
  const [hasError] = useState(false)

  // Validate content is proper TipTap JSON
  const validContent = useMemo(() => {
    if (!content) return { type: "doc", content: [{ type: "paragraph" }] }
    if (typeof content === "string") {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: content }] }],
      }
    }
    if (content.type === "doc") return content
    // Wrap single node in doc
    return { type: "doc", content: [content] }
  }, [content])

  // Keep stable editor instance
  const initialContentRef = useRef(validContent)
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  // Use the full editor extensions, filtering out canvas extensions to prevent recursion
  const fullEditorExtensions = useMemo(() => {
    // Get official extensions with a unique ID for this node
    const official = officialExtensions(`canvas-node-${nodeId}`)
    
    // Filter out excluded extensions from both official and custom
    const filteredOfficial = official.filter((ext: any) => {
      const name = ext?.name || ext?.config?.name || ""
      return !EXCLUDED_EXTENSION_NAMES.includes(name)
    })
    
    const filteredCustom = customExtensions.filter((ext: any) => {
      const name = ext?.name || ext?.config?.name || ""
      return !EXCLUDED_EXTENSION_NAMES.includes(name)
    })
    
    return [...filteredOfficial, ...filteredCustom] as Extensions
  }, [nodeId])

  const editor = useEditor(
    {
      extensions: fullEditorExtensions,
      content: initialContentRef.current,
      editable: true,
      immediatelyRender: true,
      onCreate: () => {
        setTimeout(() => setIsReady(true), 100)
      },
      onUpdate: ({ editor }) => {
        onUpdateRef.current(editor.getJSON())
      },
    },
    [fullEditorExtensions]
  )

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
      <div
        style={{
          padding: 8,
          color: "#FF3B30",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontSize: 12,
        }}
      >
        Error rendering {nodeType}
      </div>
    )
  }

  if (!editor || !isReady) {
    return (
      <div
        style={{
          padding: 8,
          color: "#888",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        Loading {nodeType}...
      </div>
    )
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        fontSize: 13,
      }}
      className="canvas-mini-editor"
    >
      <EditorContent editor={editor} />
    </div>
  )
}

// ============================================================================
// Custom React Flow Node - Editable TipTap Content
// ARCHITECTURE DECISION: Each React Flow node renders a MiniEditor so users
// can edit content inline. The node data stores the TipTap JSON content.
// ============================================================================

interface EditableNodeData {
  label: string
  nodeType: string
  content: any
  onContentUpdate?: (nodeId: string, content: any) => void
  // Index signature required by React Flow's Node<T> type constraint
  [key: string]: unknown
}

const EditableNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  // Cast data to our expected type
  const nodeData = data as EditableNodeData
  const handleContentUpdate = useCallback(
    (newContent: any) => {
      if (nodeData.onContentUpdate) {
        nodeData.onContentUpdate(id, newContent)
      }
    },
    [id, nodeData]
  )

  return (
    <>
      {/* ARCHITECTURE DECISION: NodeResizer from React Flow official API enables
          drag-to-resize behavior. Only visible when selected for cleaner UI. */}
      <NodeResizer
        minWidth={150}
        minHeight={80}
        isVisible={selected}
        lineStyle={{ borderColor: "#007AFF" }}
        handleStyle={{ backgroundColor: "#007AFF", width: 8, height: 8, borderRadius: 2 }}
      />

      <div
        // ARCHITECTURE DECISION: Stop double-click propagation so clicking to edit
        // the MiniEditor doesn't trigger the pane's slash menu handler.
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          padding: 0,
          borderRadius: 10,
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          border: selected ? "2px solid #007AFF" : "1px solid #ddd",
          boxShadow: selected ? "0 4px 12px rgba(0, 122, 255, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.08)",
          overflow: "visible",
          width: "100%",
          height: "100%",
          minWidth: 150,
          minHeight: 80,
        }}
      >
        {/* Editable content area */}
        <div style={{ padding: 0, minHeight: 60 }}>
          <MiniEditor content={nodeData.content} onUpdate={handleContentUpdate} nodeType={nodeData.nodeType} nodeId={id} />
        </div>
      </div>

      {/* Connection handles on all four sides - per React Flow docs */}
      <Handle id="top" type="target" position={Position.Top} style={{ background: "#007AFF" }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ background: "#007AFF" }} />
      <Handle id="left" type="target" position={Position.Left} style={{ background: "#007AFF" }} />
      <Handle id="right" type="source" position={Position.Right} style={{ background: "#007AFF" }} />
    </>
  )
}

// Register custom node types
const nodeTypes = {
  editableNode: EditableNode,
}

// ============================================================================
// Canvas3D Node View Component
// ============================================================================

const Canvas3DNodeView: React.FC<NodeViewProps> = (props) => {
  const { selected, node, updateAttributes } = props
  const canvasLens = (node.attrs.lens as Canvas3DLenses) || "identity"
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize nodes/edges from saved attributes or empty
  const [nodes, setNodes] = useState<Node[]>(() => {
    if (node.attrs.flowNodes) {
      try {
        return JSON.parse(node.attrs.flowNodes)
      } catch {
        return []
      }
    }
    return []
  })
  const [edges, setEdges] = useState<Edge[]>(() => {
    if (node.attrs.flowEdges) {
      try {
        return JSON.parse(node.attrs.flowEdges)
      } catch {
        return []
      }
    }
    return []
  })

  // Slash menu state
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 100, y: 100 })
  const [searchQuery, setSearchQuery] = useState("")
  // Store the click position in flow coordinates for node placement
  const pendingNodePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Handle content updates from MiniEditor inside nodes
  const handleNodeContentUpdate = useCallback(
    (nodeId: string, newContent: any) => {
      setNodes((prevNodes) => {
        const updatedNodes = prevNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, content: newContent } } : n
        )
        updateAttributes({ flowNodes: JSON.stringify(updatedNodes) })
        return updatedNodes
      })
    },
    [updateAttributes]
  )

  // Inject the content update handler into node data
  const nodesWithHandlers = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onContentUpdate: handleNodeContentUpdate,
        },
      })),
    [nodes, handleNodeContentUpdate]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nodesSnapshot) => {
        const newNodes = applyNodeChanges(changes, nodesSnapshot)
        updateAttributes({ flowNodes: JSON.stringify(newNodes) })
        return newNodes
      })
    },
    [updateAttributes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((edgesSnapshot) => {
        const newEdges = applyEdgeChanges(changes, edgesSnapshot)
        updateAttributes({ flowEdges: JSON.stringify(newEdges) })
        return newEdges
      })
    },
    [updateAttributes]
  )

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((edgesSnapshot) => {
        const newEdges = addEdge(params, edgesSnapshot)
        updateAttributes({ flowEdges: JSON.stringify(newEdges) })
        return newEdges
      })
    },
    [updateAttributes]
  )

  // Handle double-click on empty pane to open slash menu
  // ARCHITECTURE DECISION: Double-clicks on nodes are stopped via stopPropagation
  // in EditableNode, so this only fires when clicking on the empty canvas area.
  const handlePaneDoubleClick = useCallback((event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    pendingNodePosition.current = { x: x - 100, y: y - 50 }
    setSlashMenuPosition({ x, y })
    setShowSlashMenu(true)
    setSearchQuery("")
  }, [])

  // Handle keyboard shortcuts for slash menu
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && showSlashMenu) {
        setShowSlashMenu(false)
        setSearchQuery("")
      }
      // Activate slash menu when "/" is pressed on the canvas itself.
      // Skip if the keypress originated inside a MiniEditor to avoid
      // conflicting with the SlashMenuExtension in nested editors.
      if (e.key === "/" && !showSlashMenu) {
        const target = e.target as HTMLElement
        if (target.closest?.(".canvas-mini-editor") || target.closest?.('[contenteditable="true"]')) {
          return
        }
        e.preventDefault()
        const rect = containerRef.current?.getBoundingClientRect()
        const centerX = rect ? rect.width / 2 - 100 : 100
        const centerY = rect ? rect.height / 2 - 100 : 100
        pendingNodePosition.current = { x: centerX, y: centerY }
        // Open the dropdown at the top-left button position
        setSlashMenuPosition({ x: 16, y: 56 })
        setShowSlashMenu(true)
        setSearchQuery("")
      }
    },
    [showSlashMenu]
  )

  // Add node from slash menu selection
  // ARCHITECTURE DECISION: Support both static nodeContent and async action callbacks
  // for dynamic items like image upload that require user interaction.
  const addNodeFromMenu = useCallback(
    async (menuItem: CanvasSlashMenuItem) => {
      const defaults = getNodeDefaults(menuItem.id)

      // Close menu immediately for better UX
      setShowSlashMenu(false)
      setSearchQuery("")

      let nodeContent = menuItem.nodeContent

      // Handle action-based items (like image upload)
      if (menuItem.action) {
        const result = await menuItem.action()
        if (!result) {
          // User cancelled or action failed
          return
        }
        nodeContent = result
      }
      // Handle special cases that need dynamic IDs
      else if (menuItem.id === "external-portal") {
        const newQuantaId = generateUUID()
        nodeContent = {
          type: "externalPortal",
          attrs: { externalQuantaId: newQuantaId },
        }
      } else if (menuItem.id === "excalidraw") {
        const newExcalidrawId = generateUUID()
        nodeContent = {
          type: "excalidraw",
          attrs: { id: newExcalidrawId, data: "", height: 300 },
        }
      }

      const newNode: Node = {
        id: generateNodeId(),
        type: "editableNode",
        position: pendingNodePosition.current,
        data: {
          label: `${menuItem.emoji} ${menuItem.title}`,
          nodeType: menuItem.id,
          content: nodeContent,
        },
        style: {
          width: defaults.width,
          minHeight: defaults.height,
        },
      }

      setNodes((prev) => {
        const newNodes = [...prev, newNode]
        updateAttributes({ flowNodes: JSON.stringify(newNodes) })
        return newNodes
      })
    },
    [updateAttributes]
  )

  // Toggle the top-left add-node dropdown
  const handleAddNodeClick = useCallback(() => {
    if (showSlashMenu) {
      setShowSlashMenu(false)
      setSearchQuery("")
      return
    }
    const rect = containerRef.current?.getBoundingClientRect()
    const centerX = rect ? rect.width / 2 - 100 : 100
    const centerY = rect ? rect.height / 2 - 100 : 100
    pendingNodePosition.current = { x: centerX, y: centerY }
    // Position dropdown directly below the button (top-left corner)
    setSlashMenuPosition({ x: 16, y: 56 })
    setShowSlashMenu(true)
    setSearchQuery("")
  }, [showSlashMenu])

  return (
    <NodeViewWrapper data-canvas-3d="true" style={{ margin: "16px 0", overflow: "hidden" }}>
      <NodeOverlay
        nodeProps={props}
        nodeType="canvas3D"
        isPrivate={canvasLens === "private"}
        backgroundColor="transparent"
        padding={0}
        boxShadow="none"
      >
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          style={{
            position: "relative",
            width: `${CANVAS3D_WIDTH}px`,
            height: `${CANVAS3D_HEIGHT}px`,
            borderRadius: "12px",
            overflow: "hidden",
            background: "transparent",
            border: selected ? "2px solid rgba(100, 150, 255, 0.8)" : "1px solid rgba(0, 0, 0, 0.3)",
            outline: "none",
          }}
        >
          <div style={{ width: "100%", height: "100%" }} onDoubleClick={handlePaneDoubleClick}>
            <ReactFlow
              nodes={nodesWithHandlers}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
              fitView={nodes.length > 0}
              proOptions={{ hideAttribution: true }}
            >
              <Controls />
              <Background gap={20} size={1} color="#ddd" />
            </ReactFlow>
          </div>

          {/* Top-left Add Node button + dropdown */}
          <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10 }} className="canvas3d-add-node-wrapper">
            <button
              type="button"
              onClick={handleAddNodeClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "8px",
                border: "1px solid #ddd",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                fontSize: "14px",
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 500,
                color: "#333",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Add Node
            </button>

            <AnimatePresence>
              {showSlashMenu && (
                <SlashMenuDropdown
                  isOpen={showSlashMenu}
                  onClose={() => {
                    setShowSlashMenu(false)
                    setSearchQuery("")
                  }}
                  onSelect={addNodeFromMenu}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  position={{ x: 0, y: 44 }}
                />
              )}
            </AnimatePresence>
          </div>

        </div>
      </NodeOverlay>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Canvas TipTap Extension
// ============================================================================

export const Canvas3DExtension = TipTapNode.create({
  name: "canvas3D",
  group: "block",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      nodeId: {
        default: null,
      },
      lens: {
        default: "identity" as Canvas3DLenses,
      },
      // ARCHITECTURE DECISION: Store React Flow nodes/edges as JSON strings
      // so they persist with the TipTap document and survive page reloads.
      flowNodes: {
        default: "[]",
      },
      flowEdges: {
        default: "[]",
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="canvas-3d"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "canvas-3d" }, 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(Canvas3DNodeView)
  },

  addCommands() {
    return {
      insertCanvas3D:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
            })
            .run()
        },
      setCanvas3DLens:
        (attributes: { lens: Canvas3DLenses }) =>
        ({ state, dispatch }) => {
          const { selection } = state
          const pos = selection.$from.pos
          const node = state.doc.nodeAt(pos)

          if (node && node.type.name === "canvas3D" && dispatch) {
            const tr = state.tr.setNodeMarkup(pos, null, {
              ...node.attrs,
              lens: attributes.lens,
            })
            dispatch(tr)
            return true
          }
          return false
        },
    }
  },
})

export default Canvas3DExtension
