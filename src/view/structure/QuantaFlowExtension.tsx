'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef, memo, Component, ErrorInfo, ReactNode } from "react";
import { Node as TiptapNode, NodeViewProps, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { NodeOverlay } from "../components/NodeOverlay";
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ReactFlow, {
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  addEdge,
  Handle,
  Position,
  ReactFlowInstance,
  Connection,
  BackgroundVariant,
  EdgeProps,
  getBezierPath,
  NodeResizer,
  NodeResizeControl,
  useStore,
  useViewport,
} from 'reactflow'
import { motion } from 'framer-motion'
import rough from 'roughjs'

// Import ReactFlow styles
import 'reactflow/dist/style.css';

// ============================================================================
// Error Boundary to suppress ReactFlow errors
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ReactFlowErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private originalConsoleError: typeof console.error | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: false }; // Don't show error state, just suppress
  }

  componentDidMount() {
    // Suppress console errors from ReactFlow
    this.originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Filter out ReactFlow-related errors
      const errorString = args.join(' ');
      if (
        errorString.includes('ReactFlow') ||
        errorString.includes('react-flow') ||
        errorString.includes('NodeResizer') ||
        errorString.includes('NodeResizeControl') ||
        errorString.includes('applyNodeChanges') ||
        errorString.includes('unhandledError')
      ) {
        return; // Suppress these errors
      }
      if (this.originalConsoleError) {
        this.originalConsoleError.apply(console, args);
      }
    };
  }

  componentWillUnmount() {
    // Restore original console.error
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Silently catch errors from ReactFlow - don't log to console
    // These are often benign resize/interaction errors
  }

  render() {
    return this.props.children;
  }
}

// ============================================================================
// HandDrawnEdge Component - Custom edge using rough.js
// ============================================================================

interface HandDrawnEdgeData {
  onInsertNode?: (edgeId: string, midX: number, midY: number) => void
  onDeleteEdge?: (edgeId: string) => void
}

const HandDrawnEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<HandDrawnEdgeData>) => {
  const svgRef = useRef<SVGGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  
  // Get current zoom level for scale-invariant rendering
  const zoom = useStore(zoomSelector)
  const inverseScale = 1 / zoom

  // Calculate midpoint for the "+" button
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  // Add slight offset for curve (same as used for the curve itself)
  const offsetX = (targetY - sourceY) * 0.15
  const offsetY = (sourceX - targetX) * 0.15
  const buttonX = midX + offsetX
  const buttonY = midY + offsetY

  // Get the bezier path for reference
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  useEffect(() => {
    if (!svgRef.current) return

    // Clear previous rough elements
    const existingRough = svgRef.current.querySelectorAll('.rough-path')
    existingRough.forEach(el => el.remove())

    // Create rough.js instance
    const rc = rough.svg(svgRef.current.ownerSVGElement!)

    // Scale-invariant sizes (appear same regardless of zoom)
    const baseStrokeWidth = 4
    const baseArrowSize = 16
    const scaledStrokeWidth = baseStrokeWidth * inverseScale
    const scaledArrowSize = baseArrowSize * inverseScale

    const curvePoints: [number, number][] = [
      [sourceX, sourceY],
      [midX + offsetX, midY + offsetY],
      [targetX, targetY],
    ]

    // Draw the hand-drawn curve with scale-invariant stroke
    const curve = rc.curve(curvePoints, {
      stroke: '#262626',
      strokeWidth: scaledStrokeWidth,
      roughness: 0.8,
      bowing: 0.2,
    })
    curve.classList.add('rough-path')
    svgRef.current.appendChild(curve)

    // Draw arrowhead at the SOURCE end (pointing back toward the source node)
    // Calculate angle from source toward the control point
    const curveAngle = Math.atan2((midY + offsetY) - sourceY, (midX + offsetX) - sourceX)
    // Flip 180 degrees so arrow points back toward source
    const flippedAngle = curveAngle + Math.PI
    
    // Arrow tip points back toward source, base is at the source point
    const tipX = sourceX + scaledArrowSize * Math.cos(flippedAngle)
    const tipY = sourceY + scaledArrowSize * Math.sin(flippedAngle)
    
    // Base corners are perpendicular to the flipped direction at source
    const arrowPoints: [number, number][] = [
      [tipX, tipY], // Tip of arrow pointing toward source
      [sourceX + scaledArrowSize * 0.4 * Math.cos(flippedAngle + Math.PI / 2), sourceY + scaledArrowSize * 0.4 * Math.sin(flippedAngle + Math.PI / 2)], // Base corner 1
      [sourceX + scaledArrowSize * 0.4 * Math.cos(flippedAngle - Math.PI / 2), sourceY + scaledArrowSize * 0.4 * Math.sin(flippedAngle - Math.PI / 2)], // Base corner 2
    ]

    const arrowHead = rc.polygon(arrowPoints, {
      stroke: '#262626',
      strokeWidth: scaledStrokeWidth * 0.75,
      fill: '#262626',
      fillStyle: 'solid',
      roughness: 0.8,
    })
    arrowHead.classList.add('rough-path')
    svgRef.current.appendChild(arrowHead)

  }, [sourceX, sourceY, targetX, targetY, midX, midY, offsetX, offsetY, inverseScale])

  // Handle click on the "+" button
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (data?.onInsertNode) {
      data.onInsertNode(id, buttonX, buttonY)
    }
  }, [data, id, buttonX, buttonY])

  // Handle click on the delete button
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (data?.onDeleteEdge) {
      data.onDeleteEdge(id)
    }
  }, [data, id])

  // Scale-invariant button size
  const baseButtonSize = 24
  const scaledButtonSize = baseButtonSize * inverseScale
  
  // Calculate direction along the curve (from midpoint toward target)
  // This keeps the delete button on the line so hover doesn't get lost
  const dirX = targetX - buttonX
  const dirY = targetY - buttonY
  const dirLength = Math.sqrt(dirX * dirX + dirY * dirY)
  const normalizedDirX = dirLength > 0 ? dirX / dirLength : 0
  const normalizedDirY = dirLength > 0 ? dirY / dirLength : 1
  
  // Delete button position (along the curve, toward target)
  const buttonOffset = scaledButtonSize * 1.4
  const deleteButtonX = buttonX + normalizedDirX * buttonOffset
  const deleteButtonY = buttonY + normalizedDirY * buttonOffset

  return (
    <g 
      ref={svgRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible path for interactions (hover, click) */}
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      {/* "+" button at midpoint - only visible on hover */}
      {isHovered && (
        <>
          <g
            style={{ cursor: 'pointer' }}
            onClick={handleClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <circle
              cx={buttonX}
              cy={buttonY}
              r={scaledButtonSize / 2}
              fill="white"
              stroke="#6366f1"
              strokeWidth={2 * inverseScale}
            />
            <line
              x1={buttonX - scaledButtonSize * 0.25}
              y1={buttonY}
              x2={buttonX + scaledButtonSize * 0.25}
              y2={buttonY}
              stroke="#6366f1"
              strokeWidth={2 * inverseScale}
              strokeLinecap="round"
            />
            <line
              x1={buttonX}
              y1={buttonY - scaledButtonSize * 0.25}
              x2={buttonX}
              y2={buttonY + scaledButtonSize * 0.25}
              stroke="#6366f1"
              strokeWidth={2 * inverseScale}
              strokeLinecap="round"
            />
          </g>
          {/* Delete button along the curve toward target - red with X */}
          <g
            style={{ cursor: 'pointer' }}
            onClick={handleDelete}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <circle
              cx={deleteButtonX}
              cy={deleteButtonY}
              r={scaledButtonSize / 2}
              fill="white"
              stroke="#ef4444"
              strokeWidth={2 * inverseScale}
            />
            <line
              x1={deleteButtonX - scaledButtonSize * 0.25}
              y1={deleteButtonY - scaledButtonSize * 0.25}
              x2={deleteButtonX + scaledButtonSize * 0.25}
              y2={deleteButtonY + scaledButtonSize * 0.25}
              stroke="#ef4444"
              strokeWidth={2 * inverseScale}
              strokeLinecap="round"
            />
            <line
              x1={deleteButtonX + scaledButtonSize * 0.25}
              y1={deleteButtonY - scaledButtonSize * 0.25}
              x2={deleteButtonX - scaledButtonSize * 0.25}
              y2={deleteButtonY + scaledButtonSize * 0.25}
              stroke="#ef4444"
              strokeWidth={2 * inverseScale}
              strokeLinecap="round"
            />
          </g>
        </>
      )}
    </g>
  )
})

HandDrawnEdge.displayName = 'HandDrawnEdge'

// ============================================================================
// GhostNodePreview Component - Shows preview when dragging from handles
// ============================================================================

const GhostNodePreview = memo(({ position }: { position: { x: number; y: number } }) => {
  const { x: viewX, y: viewY, zoom } = useViewport();
  
  // Convert flow position to screen position
  const screenX = position.x * zoom + viewX;
  const screenY = position.y * zoom + viewY;
  
  // Node dimensions (scaled with zoom)
  const width = 280 * zoom;
  const height = 150 * zoom;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: screenX - width / 2,
        top: screenY - height / 2,
        width,
        height,
        background: 'rgba(99, 102, 241, 0.06)',
        border: '2px dashed rgba(99, 102, 241, 0.3)',
        borderRadius: 12 * zoom,
        pointerEvents: 'none',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 28 * zoom,
          height: 28 * zoom,
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          border: `2px solid rgba(99, 102, 241, 0.3)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(99, 102, 241, 0.5)',
          fontSize: 18 * zoom,
          fontWeight: 300,
        }}
      >
        +
      </div>
    </div>
  );
});

GhostNodePreview.displayName = 'GhostNodePreview';

// ============================================================================
// QuantaNode Component - Embeds quanta content via iframe
// ============================================================================

interface QuantaNodeData {
  quantaId: string
  label: string
}

// Selector to get zoom level from React Flow store
const zoomSelector = (state: any) => state.transform[2]

const QuantaNode = memo(({ data, id, selected }: { data: QuantaNodeData; id: string; selected?: boolean }) => {
  const quantaId = data.quantaId || 'richtext-test'
  
  // Get current zoom level from React Flow store
  const zoom = useStore(zoomSelector)
  
  // Calculate inverse scale to counteract zoom (makes text scale-invariant)
  const inverseScale = 1 / zoom
  
  // Calculate scaled dimensions to maintain visual node size
  // The node container scales up/down, but the content inside stays consistent
  const scaledWidth = 100 * zoom // percentage
  const scaledHeight = 100 * zoom // percentage

  // Fixed handle style (scales with zoom like normal elements)
  const baseHandleStyle: React.CSSProperties = {
    background: '#6366f1',
    width: 16,
    height: 16,
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    borderRadius: '50%',
  }

  return (
    <>
      {/* Handles positioned ABOVE/OUTSIDE the node */}
      {/* Top Handle - target (receives connections) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={true}
        style={{ ...baseHandleStyle, top: -12 }}
      />
      
      {/* Bottom Handle - source (starts connections) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={true}
        style={{ ...baseHandleStyle, bottom: -12 }}
      />
      
      {/* Left Handle - target (receives connections) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={true}
        style={{ ...baseHandleStyle, left: -12 }}
      />
      
      {/* Right Handle - source (starts connections) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={true}
        style={{ ...baseHandleStyle, right: -12 }}
      />

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        }}
      >

      {/* Drag Handle - Grip icon in top right */}
      <motion.div
        className="custom-drag-handle"
        onMouseLeave={(event) => {
          event.currentTarget.style.cursor = 'grab'
        }}
        onMouseDown={(event) => {
          event.currentTarget.style.cursor = 'grabbing'
        }}
        onMouseUp={(event) => {
          event.currentTarget.style.cursor = 'grab'
        }}
        style={{
          position: 'absolute',
          right: 8,
          top: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          padding: '6px',
          borderRadius: '6px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          zIndex: 1,
        }}
        whileHover={{ 
          background: '#f3f4f6',
          borderColor: '#d1d5db',
        }}
      >
        <svg
          width="10"
          height="14"
          viewBox="0 0 10 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="2.5" cy="3" r="1.5" fill="#9ca3af" />
          <circle cx="2.5" cy="7" r="1.5" fill="#9ca3af" />
          <circle cx="2.5" cy="11" r="1.5" fill="#9ca3af" />
          <circle cx="7.5" cy="3" r="1.5" fill="#9ca3af" />
          <circle cx="7.5" cy="7" r="1.5" fill="#9ca3af" />
          <circle cx="7.5" cy="11" r="1.5" fill="#9ca3af" />
        </svg>
      </motion.div>


      {/* Iframe Container with scale-invariant content */}
      <div
        style={{
          flex: 1,
          overflow: 'visible',
          background: '#fff',
          position: 'relative',
        }}
      >
        {/* Scale-invariant wrapper: scales content inversely to zoom */}
        <div
          style={{
            width: `${scaledWidth}%`,
            height: `${scaledHeight}%`,
            transform: `scale(${inverseScale})`,
            transformOrigin: 'top left',
          }}
        >
          <iframe
            src={`/q/${quantaId}?mode=graph`}
            title={`Quanta: ${quantaId}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      </div>
      </div>
      
      {/* NodeResizeControl - positioned outside and after the main div so it's on top of iframe */}
      <NodeResizeControl
        minWidth={180}
        minHeight={100}
        style={{
          background: 'transparent',
          border: 'none',
        }}
        position="bottom-right"
      >
        <div
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'nwse-resize',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            transform: 'translate(-17px, -17px)',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 1L1 9M9 5L5 9M9 9L9 9"
              stroke="#6b7280"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </NodeResizeControl>
    </>
  )
})

QuantaNode.displayName = 'QuantaNode'

// ============================================================================
// ID Generators
// ============================================================================

const generateGraphId = () => `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Generate unique node ID using timestamp + random string to avoid collisions
const generateNodeId = () => `quanta-node-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

// ============================================================================
// QuantaFlowNodeView - TipTap NodeView wrapper
// ============================================================================

const QuantaFlowNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes, selected } = props;
  const { graphId, height, nodes: nodesJson, edges: edgesJson } = node.attrs;
  // Use a fixed height of 700px for the graph
  const [graphHeight, setGraphHeight] = useState(700);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Use local state for instantiation - resets on every page reload
  const [isInstantiated, setIsInstantiated] = useState(false);

  // If not instantiated, show a clickable placeholder
  if (!isInstantiated) {
    return (
      <NodeViewWrapper>
        <NodeOverlay nodeProps={props} nodeType="quantaFlow">
          <Box
            onClick={() => setIsInstantiated(true)}
            sx={{
              border: selected ? '2px solid #6366f1' : '1px solid #e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden',
              my: 2,
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#6366f1',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Box
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                <Typography sx={{ fontSize: 32 }}>📊</Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#1f2937',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                }}
              >
                2D Temporal Graph
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#6b7280',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                }}
              >
                Click to instantiate the graph
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{
                  mt: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  },
                }}
              >
                Create Graph
              </Button>
            </Box>
          </Box>
        </NodeOverlay>
      </NodeViewWrapper>
    );
  }

  // Register custom node types
  const nodeTypes = useMemo(() => ({ quantaNode: QuantaNode }), [])
  
  // Register custom edge types
  const edgeTypes = useMemo(() => ({ handDrawn: HandDrawnEdge }), [])

  // Parse nodes and edges from stored JSON
  const initialNodes = useMemo(() => {
    try {
      const parsed = JSON.parse(nodesJson || '[]');
      // Ensure dragHandle and default style is set for all nodes
      return parsed.map((n: any) => ({
        ...n,
        dragHandle: '.custom-drag-handle',
        style: n.style || { width: 400, height: 150 }, // Default size for NodeResizer
      }));
    } catch {
      return [];
    }
  }, [nodesJson]);

  const initialEdges = useMemo(() => {
    try {
      const parsed = JSON.parse(edgesJson || '[]');
      // Ensure all edges use handDrawn type
      return parsed.map((e: any) => ({
        ...e,
        type: 'handDrawn',
      }));
    } catch {
      return [];
    }
  }, [edgesJson]);

  const [nodes, setNodes] = useState<Node<QuantaNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Undo/Redo history
  type HistoryState = { nodes: Node<QuantaNodeData>[]; edges: Edge[] };
  const historyRef = useRef<HistoryState[]>([{ nodes: initialNodes, edges: initialEdges }]);
  const historyIndexRef = useRef(0);
  const isUndoRedoRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Save current state to history
  const saveToHistory = useCallback((newNodes: Node<QuantaNodeData>[], newEdges: Edge[]) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    // Truncate any redo states
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    // Add new state
    historyRef.current.push({ nodes: newNodes, edges: newEdges });
    // Limit history size to 50
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      const prevState = historyRef.current[historyIndexRef.current];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  }, []);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, []);

  // Save nodes to attributes when they change
  const saveNodes = useCallback((newNodes: Node<QuantaNodeData>[]) => {
    // Only save serializable node data (exclude functions, etc.)
    const serializableNodes = newNodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      style: node.style,
      dragHandle: node.dragHandle,
    }));
    updateAttributes({ nodes: JSON.stringify(serializableNodes) });
  }, [updateAttributes]);

  // Save edges to attributes when they change
  const saveEdges = useCallback((newEdges: Edge[]) => {
    updateAttributes({ edges: JSON.stringify(newEdges) });
  }, [updateAttributes]);

  // Debounce ref for saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounce ref for history
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Save to history with debounce (to avoid saving every micro-change)
  const scheduleSaveToHistory = useCallback((newNodes: Node<QuantaNodeData>[], newEdges: Edge[]) => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }
    historyTimeoutRef.current = setTimeout(() => {
      saveToHistory(newNodes, newEdges);
    }, 500);
  }, [saveToHistory]);
  
  // Debounce ref for auto-fit
  const autoFitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-fit helper with debounce
  const scheduleAutoFit = useCallback(() => {
    if (autoFitTimeoutRef.current) {
      clearTimeout(autoFitTimeoutRef.current);
    }
    autoFitTimeoutRef.current = setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
      }
    }, 350); // Slight delay after changes settle
  }, [reactFlowInstance]);

  // Handle node changes (position, selection, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        
        // Debounce save to avoid too many updates during resize
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          saveNodes(updatedNodes);
        }, 300);
        
        // Check if drag has ENDED (not during dragging)
        // Position changes have a 'dragging' property - only auto-fit when dragging is false
        const dragEnded = changes.some(
          (c) => c.type === 'position' && 'dragging' in c && c.dragging === false
        );
        // Skip resize events when creating a node from connection
        const hasResize = !isCreatingNodeFromConnectionRef.current && 
          changes.some((c) => c.type === 'dimensions');
        
        // Only auto-fit and save to history when drag ends or resize happens
        if (dragEnded || hasResize) {
          scheduleAutoFit();
          // Save to history after drag/resize ends
          setEdges((currentEdges) => {
            scheduleSaveToHistory(updatedNodes, currentEdges);
            return currentEdges;
          });
        }
        
        return updatedNodes;
      });
    },
    [saveNodes, scheduleAutoFit, scheduleSaveToHistory]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds);
        setTimeout(() => saveEdges(updatedEdges), 100);
        // Save to history on edge deletion
        const hasRemove = changes.some((c) => c.type === 'remove');
        if (hasRemove) {
          setNodes((currentNodes) => {
            scheduleSaveToHistory(currentNodes, updatedEdges);
            return currentNodes;
          });
        }
        return updatedEdges;
      });
    },
    [saveEdges, scheduleSaveToHistory]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      // Mark that a successful connection was made (prevents onConnectEnd from creating a new node)
      connectionMadeRef.current = true;
      
      setEdges((eds) => {
        const updatedEdges = addEdge({ ...params, type: 'handDrawn' }, eds);
        saveEdges(updatedEdges);
        scheduleAutoFit();
        // Save to history when connection is made
        setNodes((currentNodes) => {
          scheduleSaveToHistory(currentNodes, updatedEdges);
          return currentNodes;
        });
        return updatedEdges;
      });
    },
    [saveEdges, scheduleAutoFit, scheduleSaveToHistory]
  );

  // Track connection start info for creating nodes on drop in empty space
  const connectStartRef = useRef<{ nodeId: string; handleId: string | null; handleType: 'source' | 'target' | null } | null>(null);
  
  // Track whether a successful connection was made (to prevent creating node when connecting to another handle)
  const connectionMadeRef = useRef(false);
  
  // Track when we're creating a node from a connection (to skip resize events)
  const isCreatingNodeFromConnectionRef = useRef(false);

  // Track connection drag position for ghost node preview
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectDragPos, setConnectDragPos] = useState<{ x: number; y: number } | null>(null);

  // Handle connection start - store the starting node/handle info
  const onConnectStart = useCallback(
    (_: React.MouseEvent | React.TouchEvent, { nodeId, handleId, handleType }: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null }) => {
      if (nodeId) {
        connectStartRef.current = { nodeId, handleId, handleType };
        connectionMadeRef.current = false; // Reset - no connection made yet
        setIsConnecting(true);
      }
    },
    []
  );

  // Track mouse position during connection drag
  useEffect(() => {
    if (!isConnecting || !reactFlowInstance) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Check if hovering over a handle - if so, hide the ghost preview
      const targetElement = e.target as Element;
      const isOverHandle = targetElement?.classList?.contains('react-flow__handle') ||
        targetElement?.closest?.('.react-flow__handle') !== null;
      
      if (isOverHandle) {
        // Hide ghost when over a valid connection target
        setConnectDragPos(null);
      } else {
        const flowPosition = reactFlowInstance.screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });
        setConnectDragPos(flowPosition);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isConnecting, reactFlowInstance]);

  // Handle connection end - create new node if dropped in empty space
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const startInfo = connectStartRef.current;
      const wasConnectionMade = connectionMadeRef.current;
      
      // Reset refs and state
      connectStartRef.current = null;
      connectionMadeRef.current = false;
      setIsConnecting(false);
      setConnectDragPos(null);

      // If a successful connection was made to another handle, don't create a new node
      if (wasConnectionMade) {
        return;
      }

      if (!startInfo || !reactFlowInstance) return;

      // Also check if the connection ended on a valid target handle (fallback check)
      const targetElement = event.target as Element;
      const isTargetHandle = targetElement?.classList?.contains('react-flow__handle') ||
        targetElement?.closest?.('.react-flow__handle') !== null;
      
      if (isTargetHandle) {
        // Connection was made to another handle, onConnect handles this
        return;
      }

      // Get the position where the drag ended
      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
      
      // Convert screen coordinates to flow coordinates
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      // Mark that we're creating a node from connection (to skip resize events)
      isCreatingNodeFromConnectionRef.current = true;
      
      // Generate unique IDs
      const quantaId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newNodeId = generateNodeId();

      // Create the new node at the drop position (centered)
      const newNode: Node<QuantaNodeData> = {
        id: newNodeId,
        type: 'quantaNode',
        position: {
          x: flowPosition.x - 200, // Center the node (half of default width 400)
          y: flowPosition.y - 75,  // Center the node (half of default height 150)
        },
        data: { quantaId, label: `Quanta: ${quantaId}` },
        dragHandle: '.custom-drag-handle',
        style: { width: 400, height: 150 },
      };

      // Create edge connecting the source to the new node
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: startInfo.handleType === 'source' ? startInfo.nodeId : newNodeId,
        sourceHandle: startInfo.handleType === 'source' ? startInfo.handleId : 'bottom',
        target: startInfo.handleType === 'source' ? newNodeId : startInfo.nodeId,
        targetHandle: startInfo.handleType === 'source' ? 'top' : startInfo.handleId,
        type: 'handDrawn',
      };

      // Update nodes
      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        saveNodes(updatedNodes);
        return updatedNodes;
      });

      // Update edges
      setEdges((eds) => {
        const updatedEdges = [...eds, newEdge];
        saveEdges(updatedEdges);
        // Save to history
        setNodes((currentNodes) => {
          scheduleSaveToHistory(currentNodes, updatedEdges);
          return currentNodes;
        });
        return updatedEdges;
      });

      // Auto-fit after creating
      scheduleAutoFit();
      
      // Reset the flag after a delay to allow initial dimension measurement to pass
      setTimeout(() => {
        isCreatingNodeFromConnectionRef.current = false;
      }, 500);
    },
    [reactFlowInstance, saveNodes, saveEdges, scheduleAutoFit, scheduleSaveToHistory]
  );

  // Add a new node programmatically
  const addNode = useCallback(
    (customQuantaId?: string) => {
      // Generate unique quantaId if not provided
      const quantaId = customQuantaId || `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newNode: Node<QuantaNodeData> = {
        id: generateNodeId(),
        type: 'quantaNode',
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
        },
        data: { quantaId, label: `Quanta: ${quantaId}` },
        dragHandle: '.custom-drag-handle',
        style: { width: 400, height: 150 }, // Initial size for NodeResizer
      };
      setNodes((nds) => {
        const updatedNodes = nds.concat(newNode);
        saveNodes(updatedNodes);
        // Auto-fit after adding a new node
        scheduleAutoFit();
        // Save to history when node is added
        setEdges((currentEdges) => {
          scheduleSaveToHistory(updatedNodes, currentEdges);
          return currentEdges;
        });
        return updatedNodes;
      });
    },
    [saveNodes, scheduleAutoFit, scheduleSaveToHistory]
  );

  // Insert a new node in the middle of an edge
  const insertNodeOnEdge = useCallback(
    (edgeId: string, midX: number, midY: number) => {
      // Find the edge being split
      const edgeToSplit = edges.find((e) => e.id === edgeId);
      if (!edgeToSplit) return;

      // Generate unique IDs
      const quantaId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newNodeId = generateNodeId();

      // Create the new node at the midpoint (offset position to center the node)
      const newNode: Node<QuantaNodeData> = {
        id: newNodeId,
        type: 'quantaNode',
        position: {
          x: midX - 200, // Center the node (half of default width 400)
          y: midY - 75,  // Center the node (half of default height 150)
        },
        data: { quantaId, label: `Quanta: ${quantaId}` },
        dragHandle: '.custom-drag-handle',
        style: { width: 400, height: 150 },
      };

      // Create two new edges: source -> newNode and newNode -> target
      const newEdge1: Edge = {
        id: `edge-${Date.now()}-1`,
        source: edgeToSplit.source,
        sourceHandle: edgeToSplit.sourceHandle,
        target: newNodeId,
        targetHandle: 'top', // Connect to top of new node
        type: 'handDrawn',
      };

      const newEdge2: Edge = {
        id: `edge-${Date.now()}-2`,
        source: newNodeId,
        sourceHandle: 'bottom', // Connect from bottom of new node
        target: edgeToSplit.target,
        targetHandle: edgeToSplit.targetHandle,
        type: 'handDrawn',
      };

      // Update nodes
      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        saveNodes(updatedNodes);
        return updatedNodes;
      });

      // Update edges: remove old edge, add two new ones
      setEdges((eds) => {
        const updatedEdges = eds.filter((e) => e.id !== edgeId).concat([newEdge1, newEdge2]);
        saveEdges(updatedEdges);
        // Save to history
        setNodes((currentNodes) => {
          const nodesWithNew = [...currentNodes];
          scheduleSaveToHistory(nodesWithNew, updatedEdges);
          return currentNodes;
        });
        return updatedEdges;
      });

      // Auto-fit after inserting
      scheduleAutoFit();
    },
    [edges, saveNodes, saveEdges, scheduleAutoFit, scheduleSaveToHistory]
  );

  // Delete an edge
  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => {
        const updatedEdges = eds.filter((e) => e.id !== edgeId);
        saveEdges(updatedEdges);
        // Save to history
        setNodes((currentNodes) => {
          scheduleSaveToHistory(currentNodes, updatedEdges);
          return currentNodes;
        });
        return updatedEdges;
      });
    },
    [saveEdges, scheduleSaveToHistory]
  );

  // Prepare edges with the insert and delete callbacks
  const edgesWithCallbacks = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onInsertNode: insertNodeOnEdge,
        onDeleteEdge: deleteEdge,
      },
    }));
  }, [edges, insertNodeOnEdge, deleteEdge]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn({ duration: 200 });
    }
  }, [reactFlowInstance]);

  const zoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut({ duration: 200 });
    }
  }, [reactFlowInstance]);

  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ duration: 200, padding: 0.2 });
    }
  }, [reactFlowInstance]);

  const zoomTo100 = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomTo(1, { duration: 200 });
    }
  }, [reactFlowInstance]);

  return (
    <NodeViewWrapper>
      <NodeOverlay nodeProps={props} nodeType="quantaFlow">
        <Box
          sx={{
            border: selected ? '2px solid #6366f1' : '1px solid #e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden',
            my: 2,
            background: 'white',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 1.5,
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Add Quanta Button */}
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => addNode()}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  height: 32,
                  px: 1.5,
                  borderColor: '#d1d5db',
                  color: '#374151',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                  '&:hover': {
                    backgroundColor: '#f3f4f6',
                    borderColor: '#9ca3af',
                  },
                }}
              >
                Add Quanta
              </Button>
              
              {/* Undo/Redo Controls */}
              <ButtonGroup size="small" variant="outlined" sx={{ height: 32 }}>
                <IconButton 
                  size="small" 
                  onClick={undo} 
                  disabled={!canUndo}
                  title="Undo"
                  sx={{ 
                    width: 32, 
                    height: 32,
                    borderRadius: '4px 0 0 4px',
                    border: '1px solid #d1d5db',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                  }}
                >
                  <UndoIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={redo} 
                  disabled={!canRedo}
                  title="Redo"
                  sx={{ 
                    width: 32, 
                    height: 32,
                    borderRadius: '0 4px 4px 0',
                    border: '1px solid #d1d5db',
                    borderLeft: 'none',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                  }}
                >
                  <RedoIcon fontSize="small" />
                </IconButton>
              </ButtonGroup>
              
              {/* Zoom Controls */}
              <ButtonGroup size="small" variant="outlined" sx={{ height: 32 }}>
                <IconButton 
                  size="small" 
                  onClick={zoomOut} 
                  title="Zoom Out"
                  sx={{ 
                    width: 32, 
                    height: 32,
                    borderRadius: '4px 0 0 4px',
                    border: '1px solid #d1d5db',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                  }}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
                <Button 
                  size="small" 
                  onClick={zoomTo100} 
                  title="Reset to 100%"
                  sx={{ 
                    minWidth: 48,
                    height: 32,
                    fontSize: '12px',
                    fontWeight: 500,
                    border: '1px solid #d1d5db',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderRadius: 0,
                    color: '#374151',
                    textTransform: 'none',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                    '&:hover': { backgroundColor: '#f3f4f6' },
                  }}
                >
                  100%
                </Button>
                <IconButton 
                  size="small" 
                  onClick={zoomIn} 
                  title="Zoom In"
                  sx={{ 
                    width: 32, 
                    height: 32,
                    borderRadius: '0 4px 4px 0',
                    border: '1px solid #d1d5db',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                  }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </ButtonGroup>
              
              {/* Fit View */}
              <IconButton 
                size="small" 
                onClick={fitView} 
                title="Fit to View"
                sx={{ 
                  width: 32, 
                  height: 32,
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  '&:hover': { backgroundColor: '#f3f4f6' },
                }}
              >
                <CenterFocusStrongIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Graph */}
          <Box sx={{ height: graphHeight, position: 'relative' }}>
            <ReactFlowErrorBoundary>
              <ReactFlow
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodes={nodes}
                edges={edgesWithCallbacks}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onInit={setReactFlowInstance}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={4}
                defaultEdgeOptions={{
                  type: 'handDrawn',
                  zIndex: 1000,
                }}
                style={{ background: '#f8fafc' }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="#cbd5e1"
                />
                {/* Ghost node preview when dragging from a handle */}
                {isConnecting && connectDragPos && (
                  <GhostNodePreview position={connectDragPos} />
                )}
              </ReactFlow>
            </ReactFlowErrorBoundary>
          </Box>
        </Box>
      </NodeOverlay>
    </NodeViewWrapper>
  );
};

// ============================================================================
// TipTap Extension
// ============================================================================

export const QuantaFlowExtension = TiptapNode.create({
  name: "quantaFlow",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      graphId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-graph-id'),
        renderHTML: (attributes) => ({
          'data-graph-id': attributes.graphId,
        }),
      },
      height: {
        default: 700,
        parseHTML: (element) => parseInt(element.getAttribute('data-height') || '700'),
        renderHTML: (attributes) => ({
          'data-height': attributes.height,
        }),
      },
      nodes: {
        default: '[]',
        parseHTML: (element) => element.getAttribute('data-nodes'),
        renderHTML: (attributes) => ({
          'data-nodes': attributes.nodes,
        }),
      },
      edges: {
        default: '[]',
        parseHTML: (element) => element.getAttribute('data-edges'),
        renderHTML: (attributes) => ({
          'data-edges': attributes.edges,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="quanta-flow"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'quanta-flow' }), '📊 2D Temporal Graph'];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuantaFlowNodeView);
  },

  addCommands() {
    return {
      insertQuantaFlow:
        (attrs?: { height?: number }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              graphId: generateGraphId(),
              height: attrs?.height || 400,
              nodes: '[]',
              edges: '[]',
            },
          });
        },
    };
  },
});
