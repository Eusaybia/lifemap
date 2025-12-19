'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef, memo, Component, ErrorInfo, ReactNode } from "react";
import { Node as TiptapNode, NodeViewProps, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
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
}: EdgeProps) => {
  const svgRef = useRef<SVGGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

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

    // Offset the start point to stop before the source node (so arrowhead is visible at top node)
    const arrowOffset = 30 // Stop 30px from the source (which connects to top node)
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const length = Math.sqrt(dx * dx + dy * dy)
    const adjustedSourceX = length > arrowOffset ? sourceX + (dx / length) * arrowOffset : sourceX
    const adjustedSourceY = length > arrowOffset ? sourceY + (dy / length) * arrowOffset : sourceY

    // Calculate control point for a natural curve
    const midX = (adjustedSourceX + targetX) / 2
    const midY = (adjustedSourceY + targetY) / 2
    
    // Add slight offset for curve
    const offsetX = (targetY - adjustedSourceY) * 0.2
    const offsetY = (adjustedSourceX - targetX) * 0.2

    const curvePoints: [number, number][] = [
      [adjustedSourceX, adjustedSourceY],
      [midX + offsetX, midY + offsetY],
      [targetX, targetY],
    ]

    // Draw the hand-drawn curve
    const curve = rc.curve(curvePoints, {
      stroke: '#262626',
      strokeWidth: 2.5,
      roughness: 1.0,
      bowing: 0.3,
    })
    curve.classList.add('rough-path')
    svgRef.current.appendChild(curve)

    // Draw arrowhead at the START of the curve, perpendicular to the curve direction
    const arrowSize = 14
    // Calculate angle along the curve at the start point (from adjustedSource toward mid-control-point)
    const curveAngle = Math.atan2((midY + offsetY) - adjustedSourceY, (midX + offsetX) - adjustedSourceX)
    // Flip 180 degrees so arrow points in the opposite direction (toward source/top node)
    const flippedAngle = curveAngle + Math.PI
    // Arrowhead: tip points opposite to curve direction, base is perpendicular
    const tipX = adjustedSourceX + arrowSize * Math.cos(flippedAngle)
    const tipY = adjustedSourceY + arrowSize * Math.sin(flippedAngle)
    // Base corners are perpendicular to the flipped direction at adjustedSource
    const arrowPoints: [number, number][] = [
      [tipX, tipY], // Tip of arrow
      [adjustedSourceX + arrowSize * 0.5 * Math.cos(flippedAngle + Math.PI / 2), adjustedSourceY + arrowSize * 0.5 * Math.sin(flippedAngle + Math.PI / 2)], // Base corner 1
      [adjustedSourceX + arrowSize * 0.5 * Math.cos(flippedAngle - Math.PI / 2), adjustedSourceY + arrowSize * 0.5 * Math.sin(flippedAngle - Math.PI / 2)], // Base corner 2
    ]

    const arrowHead = rc.polygon(arrowPoints, {
      stroke: '#262626',
      strokeWidth: 1.5,
      fill: '#262626',
      fillStyle: 'solid',
      roughness: 1.2,
    })
    arrowHead.classList.add('rough-path')
    svgRef.current.appendChild(arrowHead)

  }, [sourceX, sourceY, targetX, targetY])

  return (
    <g ref={svgRef}>
      {/* Invisible path for interactions (hover, click) */}
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
    </g>
  )
})

HandDrawnEdge.displayName = 'HandDrawnEdge'

// ============================================================================
// QuantaNode Component - Embeds quanta content via iframe
// ============================================================================

interface QuantaNodeData {
  quantaId: string
  label: string
}

const QuantaNode = memo(({ data, id, selected }: { data: QuantaNodeData; id: string; selected?: boolean }) => {
  const quantaId = data.quantaId || 'richtext-test'

  return (
    <>
      {/* NodeResizeControl - bottom-right resize handle */}
      <NodeResizeControl
        minWidth={300}
        minHeight={200}
        style={{
          background: 'transparent',
          border: 'none',
        }}
        position="bottom-right"
      >
        {/* Resize handle icon - diagonal lines */}
        <div
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'nwse-resize',
            background: '#f9fafb',
            borderRadius: '4px 0 8px 0',
            border: '1px solid #e5e7eb',
            borderRight: 'none',
            borderBottom: 'none',
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
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </NodeResizeControl>
      
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Top Handle - Target (receives connections) */}
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: '#6366f1',
            width: 16,
            height: 16,
            border: '3px solid white',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            top: 8,
          }}
        />

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
          zIndex: 10,
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


      {/* Iframe Container */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          background: '#fff',
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

      {/* Bottom Handle - Source (sends connections) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{
          background: '#6366f1',
          width: 16,
          height: 16,
          border: '3px solid white',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          bottom: -8,
        }}
      />
      </div>
    </>
  )
})

QuantaNode.displayName = 'QuantaNode'

// ============================================================================
// ID Generators
// ============================================================================

const generateGraphId = () => `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

let nodeIdCounter = 0
const generateNodeId = () => `quanta-node-${nodeIdCounter++}`

// ============================================================================
// QuantaFlowNodeView - TipTap NodeView wrapper
// ============================================================================

const QuantaFlowNodeView = ({ node, updateAttributes, selected }: NodeViewProps) => {
  const { graphId, height, nodes: nodesJson, edges: edgesJson } = node.attrs;
  const [graphHeight, setGraphHeight] = useState(height || 400);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

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
        style: n.style || { width: 1100, height: 700 }, // Default size for NodeResizer
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
        
        return updatedNodes;
      });
    },
    [saveNodes]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds);
        setTimeout(() => saveEdges(updatedEdges), 100);
        return updatedEdges;
      });
    },
    [saveEdges]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const updatedEdges = addEdge({ ...params, type: 'handDrawn' }, eds);
        saveEdges(updatedEdges);
        return updatedEdges;
      });
    },
    [saveEdges]
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
        style: { width: 1100, height: 700 }, // Initial size for NodeResizer
      };
      setNodes((nds) => {
        const updatedNodes = nds.concat(newNode);
        saveNodes(updatedNodes);
        return updatedNodes;
      });
    },
    [saveNodes]
  );

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

  return (
    <NodeViewWrapper>
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
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>📊</span>
            <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
              2D Temporal Graph
            </Typography>
            {/* Add Quanta Button */}
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => addNode()}
              sx={{ 
                ml: 2, 
                textTransform: 'none',
                fontSize: '12px',
                py: 0.5,
              }}
            >
              Add Quanta
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Zoom Controls */}
            <ButtonGroup size="small" variant="outlined">
              <IconButton size="small" onClick={zoomOut} title="Zoom Out">
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={fitView} title="Fit View">
                <CenterFocusStrongIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={zoomIn} title="Zoom In">
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </ButtonGroup>
          </Box>
        </Box>

        {/* Graph */}
        <Box sx={{ height: graphHeight, position: 'relative' }}>
          <ReactFlowErrorBoundary>
            <ReactFlow
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              defaultEdgeOptions={{
                type: 'handDrawn',
              }}
              style={{ background: '#f8fafc' }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#cbd5e1"
              />
            </ReactFlow>
          </ReactFlowErrorBoundary>
        </Box>
      </Box>
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
        default: 400,
        parseHTML: (element) => parseInt(element.getAttribute('data-height') || '400'),
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
