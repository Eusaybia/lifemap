import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Node as ProseMirrorNode, Fragment, DOMParser, Schema } from "@tiptap/pm/model";
import { Node as TipTapNode, NodeViewProps, JSONContent, wrappingInputRule } from "@tiptap/core";
import { Plugin, PluginKey, Transaction, EditorState, NodeSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import { applyNodeChanges, type Node, type NodeChange, type ReactFlowInstance } from 'reactflow';
import { offWhite } from "../Theme";
import { NodeOverlay } from "../components/NodeOverlay";
import { scanNodeForTags } from "../components/Aura";
import { ReferenceReactFlowCanvas } from "./ReferenceReactFlowCanvas";
import { TemporalEventCanvasNode, type TemporalEventCanvasNodeData } from "./TemporalEventCanvasNode";
import './styles.scss';

// ============================================================================
// TEMPORAL DAILY EXTENSION
// ============================================================================
// ARCHITECTURE DECISION: Daily Schedule Ordering
// ==============================================
// This extension creates a visual daily schedule container that automatically
// orders child nodes from earlier to later as you read top-to-bottom.
//
// The ordering is derived by scanning each child node for TimePointMention
// nodes (timepoint type), extracting their data-date attribute, and using
// the earliest date found in each child as its sort key.
//
// Visual Design:
// - No timeline arrow ornament (clean schedule layout)
// - Child nodes are sorted ASCENDING (earliest first) in the DOM
// - This means: TOP = EARLIER, BOTTOM = LATER
//
// TECHNICAL NOTE: We sort descending rather than using CSS column-reverse
// because TipTap's NodeViewContent renders all children as a single block,
// making flex-direction tricks ineffective.
//
// ALTERNATIVE APPROACHES CONSIDERED:
// 1. Manual ordering via drag-and-drop - rejected because it defeats the
//    purpose of automatic chronological organization
// 2. Horizontal timeline - rejected for better vertical document flow
// 3. Tree structure - considered for branching timelines but deferred for v1
// 4. CSS column-reverse - rejected due to NodeViewContent rendering behavior
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    temporalDaily: {
      insertTemporalDaily: () => ReturnType;
      setTemporalDailyCollapsed: (options: { collapsed: boolean }) => ReturnType;
    }
  }
}

// ============================================================================
// Date Extraction Utilities
// ============================================================================

/**
 * Extracts the earliest date from a node by scanning for TimePointMention nodes.
 * 
 * ARCHITECTURE: We traverse all descendants looking for 'timepoint' nodes
 * which store dates in the 'data-date' attribute as ISO strings.
 * 
 * @param node - The ProseMirror node to scan
 * @returns Date object if found, null otherwise
 */
const extractEarliestDateFromNode = (node: ProseMirrorNode): Date | null => {
  let earliestDate: Date | null = null;

  node.descendants((childNode) => {
    if (childNode.type.name === 'timepoint') {
      const dateStr = childNode.attrs['data-date'] as string | null;
      if (dateStr) {
        try {
          const date = new Date(dateStr);
          // Skip epoch dates (used for abstract/recurring timepoints)
          if (date.getTime() > 0 && (!earliestDate || date < earliestDate)) {
            earliestDate = date;
          }
        } catch (e) {
          // Invalid date string, skip
        }
      }
    }
  });

  return earliestDate;
};

// ============================================================================
// Temporal Fade Utilities
// ============================================================================

/**
 * ARCHITECTURE: We fade based on absolute distance from "now" using a fixed
 * horizon so an event's clarity is stable across documents and sessions.
 * This avoids relative fading where far-future items could look "present"
 * simply because all events are far away.
 */
const TEMPORAL_FADE_CONFIG = {
  fadeRangeMs: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
  minOpacity: 0.35,
  maxOpacity: 1,
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getTemporalDistanceMs = (date: Date, nowMs: number): number =>
  Math.abs(date.getTime() - nowMs);

const getTemporalFadeOpacity = (distanceMs: number): number => {
  const normalized = Math.min(distanceMs / TEMPORAL_FADE_CONFIG.fadeRangeMs, 1);
  const opacity =
    TEMPORAL_FADE_CONFIG.maxOpacity -
    normalized * (TEMPORAL_FADE_CONFIG.maxOpacity - TEMPORAL_FADE_CONFIG.minOpacity);

  return clampNumber(opacity, TEMPORAL_FADE_CONFIG.minOpacity, TEMPORAL_FADE_CONFIG.maxOpacity);
};

/**
 * Sorts child nodes by their earliest TimePointMention date.
 * Nodes with dates are sorted chronologically (earliest first for top-to-bottom display).
 * This means: TOP = EARLIER, BOTTOM = LATER.
 * Nodes without dates are placed at the end (bottom).
 * 
 * ARCHITECTURE: We sort ASCENDING (earliest first) because TipTap's NodeViewContent
 * renders children as a single block, so flex-direction tricks don't work.
 * The first item in the DOM appears at the top, so earlier entries come first.
 * 
 * @param children - Array of child JSON content
 * @param schema - ProseMirror schema for node creation
 * @returns Sorted array of children (earliest first)
 */
const sortChildrenByDate = (
  children: JSONContent[],
  resolveNode: (content: JSONContent) => ProseMirrorNode | null
): JSONContent[] => {
  const withDates = children.map((child, originalIndex) => {
    const node = resolveNode(child);
    const date = node ? extractEarliestDateFromNode(node) : null;
    return { child, date, originalIndex };
  });

  // Sort: nodes with dates come first (earliest to latest), then nodes without dates
  // Earlier entries at top (start of array) for top-to-bottom schedule display
  return withDates
    .sort((a, b) => {
      if (a.date && b.date) {
        // ASCENDING: earlier dates first
        return a.date.getTime() - b.date.getTime();
      }
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return a.originalIndex - b.originalIndex;
    })
    .map(item => item.child);
};

// ============================================================================
// Clipboard Utilities
// ============================================================================

interface ClipboardPayload {
  html: string | null;
  text: string | null;
}

/**
 * ARCHITECTURE: Prefer HTML clipboard parsing to preserve rich formatting,
 * then fall back to plain text so paste works even from external sources.
 */
const parseClipboardPayloadToNodes = (
  payload: ClipboardPayload,
  schema: Schema
): ProseMirrorNode[] => {
  if (payload.html && typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = payload.html;
    const parser = DOMParser.fromSchema(schema);
    const slice = parser.parseSlice(container);
    const nodes: ProseMirrorNode[] = [];
    slice.content.forEach((node) => nodes.push(node));
    if (nodes.length) {
      return nodes;
    }
  }

  if (payload.text) {
    const paragraphType = schema.nodes.paragraph;
    if (!paragraphType) return [];

    return payload.text.split(/\r?\n/).map((line) => {
      if (!line) {
        return paragraphType.create();
      }
      return paragraphType.create({}, schema.text(line));
    });
  }

  return [];
};

/**
 * ARCHITECTURE: Normalize pasted content into timeline container blocks so the
 * timeline remains visually consistent and the sorter can reorder items
 * just like drag-and-drop inserts.
 */
const normalizeClipboardNodesForTemporalDaily = (
  nodes: ProseMirrorNode[],
  schema: Schema
): ProseMirrorNode[] => {
  const temporalSpaceType = schema.nodes.temporalSpace;
  const trendsType = schema.nodes.trends;
  const temporalDailyType = schema.nodes.temporalDaily;
  const paragraphType = schema.nodes.paragraph;

  if (!temporalSpaceType) {
    return nodes.filter((node) => !temporalDailyType || node.type !== temporalDailyType);
  }

  const normalized: ProseMirrorNode[] = [];
  let pending: ProseMirrorNode[] = [];

  const flushPending = () => {
    if (!pending.length) return;
    const blocks = pending.map((node) => {
      if (node.isBlock) return node;
      if (paragraphType) return paragraphType.create({}, node);
      return node;
    });

    try {
      normalized.push(temporalSpaceType.create({}, blocks));
    } catch (error) {
      // Fallback: keep raw blocks if wrapping fails to avoid losing paste content.
      normalized.push(...blocks);
    }

    pending = [];
  };

  nodes.forEach((node) => {
    if (temporalDailyType && node.type === temporalDailyType) {
      return;
    }
    if (node.type === temporalSpaceType || (trendsType && node.type === trendsType)) {
      flushPending();
      normalized.push(node);
      return;
    }
    pending.push(node);
  });

  flushPending();

  return normalized;
};

// ============================================================================
// Drop Zone Component
// ============================================================================

interface DraggedNodeInfo {
  from: number;
  to: number;
  nodeJson: any;
  nodeTypeName: string;
}

interface DropZoneProps {
  onDrop: (draggedNode: DraggedNodeInfo | null) => void;
  onDragEnter: () => DraggedNodeInfo | null;
  onPaste: (payload: ClipboardPayload) => void;
  isCollapsed: boolean;
  compact?: boolean;
}

/**
 * Visual drop zone at the top of the TemporalDaily container.
 * When nodes are dragged over this zone, it highlights to indicate
 * that dropping will add the node to the daily schedule.
 * 
 * ARCHITECTURE: We capture the dragged node info on dragenter (when the
 * selection is still valid) and use it on drop. This is necessary because
 * the ProseMirror selection may change between drag start and drop.
 * 
 * IMPORTANT: We use isProcessingRef to prevent double-processing which can
 * happen if both our handler and ProseMirror's native drop handler run.
 */
const DropZone: React.FC<DropZoneProps> = ({
  onDrop,
  onDragEnter,
  onPaste,
  isCollapsed,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const draggedNodeRef = useRef<DraggedNodeInfo | null>(null);
  const isProcessingRef = useRef(false);

  if (isCollapsed) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Allow drop - this is needed for the drop to work
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    // Capture the dragged node info NOW while selection is still valid
    if (!isProcessingRef.current) {
      draggedNodeRef.current = onDragEnter();
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if we're actually leaving the drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
      if (!isProcessingRef.current) {
        draggedNodeRef.current = null;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double processing
    if (isProcessingRef.current) {
      console.log('[DropZone] Already processing, skipping duplicate drop');
      return;
    }
    
    isProcessingRef.current = true;
    setIsDragOver(false);
    
    // Pass the stored dragged node info to the drop handler
    const nodeInfo = draggedNodeRef.current;
    draggedNodeRef.current = null;
    
    // Use setTimeout to ensure we process after any pending events
    setTimeout(() => {
      onDrop(nodeInfo);
      // Reset the processing flag after a short delay to allow for new drags
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    }, 0);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // ARCHITECTURE: Keep focus on the drop zone so paste events fire here
    // instead of being captured by the editor selection.
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessingRef.current) {
      console.log('[DropZone] Already processing, skipping duplicate paste');
      return;
    }

    const html = e.clipboardData?.getData('text/html') || null;
    const text = e.clipboardData?.getData('text/plain') || null;

    if (!html && !text) {
      return;
    }

    isProcessingRef.current = true;
    setIsDragOver(false);
    onPaste({ html, text });

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  };

  return (
    <motion.div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onMouseDown={handleMouseDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      role="button"
      aria-label="Drop or paste to add to daily schedule"
      initial={false}
      animate={{
        backgroundColor: isDragOver
          ? 'rgba(100, 149, 237, 0.15)'
          : isFocused
            ? 'rgba(100, 149, 237, 0.08)'
            : 'rgba(100, 100, 110, 0.03)',
        borderColor: isDragOver
          ? 'rgba(100, 149, 237, 0.5)'
          : isFocused
            ? 'rgba(100, 149, 237, 0.35)'
            : 'rgba(100, 100, 110, 0.15)',
        scale: isDragOver ? 1.01 : 1,
      }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: compact ? '10px 12px' : '28px 16px',
        marginBottom: compact ? 8 : 12,
        borderRadius: 10,
        border: '2px dashed',
        cursor: 'pointer',
        userSelect: 'none',
        minHeight: compact ? 44 : 72,
        outline: 'none',
      }}
    >
      {/* Drop icon */}
      <motion.div
        animate={{
          opacity: isDragOver ? 1 : 0.4,
          y: isDragOver ? -2 : 0,
        }}
        transition={{ duration: 0.15 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      
      {/* Label */}
      <motion.span
        animate={{
          opacity: isDragOver ? 1 : 0.5,
          color: isDragOver ? 'rgba(100, 149, 237, 1)' : 'rgba(100, 100, 110, 0.8)',
        }}
        transition={{ duration: 0.15 }}
        style={{
          fontSize: compact ? 12 : 13,
          fontWeight: 500,
        }}
      >
        {isDragOver ? 'Release to move here' : compact ? 'Drop or paste into daily schedule' : 'Drop or paste to add to daily schedule'}
      </motion.span>
    </motion.div>
  );
};

// ============================================================================
// Temporal Daily Visual Component
// ============================================================================

interface TemporalDailyContentProps {
  children: React.ReactNode;
  isCollapsed: boolean;
  backgroundColor?: string;
  timeMode: TimeMode;
  eventSources: NonLinearEventSource[];
  nonLinearPositions?: Record<string, { x: number; y: number }>;
  onNonLinearPositionsChange: (positions: Record<string, { x: number; y: number }>) => void;
  onTimeModeChange: (mode: TimeMode) => void;
  onDropZoneDrop: (draggedNode: DraggedNodeInfo | null) => void;
  onDropZoneDragEnter: () => DraggedNodeInfo | null;
  onDropZonePaste: (payload: ClipboardPayload) => void;
}

type TimeMode = 'linear' | 'nonLinear';

interface NonLinearEventSource {
  key: string;
  label: string;
  content: JSONContent;
  hasMap: boolean;
}

interface NonLinearEventPreview {
  key: string;
  label: string;
  content: JSONContent;
  hasMap: boolean;
  position: { x: number; y: number };
}

const buildAtemporalPositions = (count: number, radius: number): { x: number; y: number }[] => {
  if (!count) return [];

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    const spread = Math.sqrt(i + 1) * radius;
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * spread;
    const y = Math.sin(theta) * spread * 0.72;
    positions.push({ x, y });
  }

  return positions;
};

const temporalDailyFlowNodeTypes = {
  temporalDailyEvent: TemporalEventCanvasNode,
};

const AtemporalEventField: React.FC<{
  items: NonLinearEventPreview[];
  onPositionsChange: (positions: Record<string, { x: number; y: number }>) => void;
}> = ({ items, onPositionsChange }) => {
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes] = useState<Node<TemporalEventCanvasNodeData>[]>([]);
  const lastEmittedPositionsRef = useRef<string>('');

  const baseNodes = useMemo<Node<TemporalEventCanvasNodeData>[]>(() => {
    return items.map((item, index) => {
      const stableId = (item.key || `item-${index}`).trim();

      return {
        id: `temporal-daily-${stableId}`,
        type: 'temporalDailyEvent',
        position: item.position,
        data: {
          nodeId: `temporal-daily-${stableId}`,
          positionKey: item.key,
          label: item.label,
          content: item.content,
        },
        draggable: true,
        selectable: true,
        dragHandle: '.node-overlay-grip-handle',
        style: { width: 640, height: item.hasMap ? 420 : 280 },
      };
    });
  }, [items]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentById = new Map(currentNodes.map((node) => [node.id, node]));

      return baseNodes.map((baseNode) => {
        const previousNode = currentById.get(baseNode.id);
        if (!previousNode) {
          return baseNode;
        }

        return {
          ...baseNode,
          position: previousNode.position ?? baseNode.position,
          selected: previousNode.selected,
          dragging: previousNode.dragging,
        };
      });
    });
  }, [baseNodes]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  useEffect(() => {
    if (!nodes.length) return;

    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node) => {
      const positionKey = node.data?.positionKey;
      if (!positionKey) return;
      positions[positionKey] = {
        x: node.position.x,
        y: node.position.y,
      };
    });

    const serialized = JSON.stringify(positions);
    if (serialized === lastEmittedPositionsRef.current) {
      return;
    }

    lastEmittedPositionsRef.current = serialized;
    onPositionsChange(positions);
  }, [nodes, onPositionsChange]);

  const nodeIdsSignature = useMemo(
    () => baseNodes.map((node) => node.id).join('|'),
    [baseNodes]
  );

  useEffect(() => {
    if (!reactFlowInstance || !baseNodes.length) return;
    const rafId = window.requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [reactFlowInstance, nodeIdsSignature, baseNodes.length]);

  return (
    <div className="temporal-order-flow-canvas">
      <ReferenceReactFlowCanvas
        nodes={nodes}
        edges={[]}
        nodeTypes={temporalDailyFlowNodeTypes}
        onNodesChange={onNodesChange}
        onInit={setReactFlowInstance}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        nodesConnectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        showControls={false}
        showBackground
      >
        {/* No edges for atemporal preview, only repositionable event nodes. */}
      </ReferenceReactFlowCanvas>
    </div>
  );
};

const TemporalDailyContent: React.FC<TemporalDailyContentProps> = ({
  children,
  isCollapsed,
  timeMode,
  eventSources,
  nonLinearPositions,
  onNonLinearPositionsChange,
  onTimeModeChange,
  onDropZoneDrop,
  onDropZoneDragEnter,
  onDropZonePaste,
}) => {
  const isNonLinear = timeMode === 'nonLinear';
  const eventPreviews = useMemo<NonLinearEventPreview[]>(() => {
    const radius = 165 + Math.min(eventSources.length, 24) * 6;
    const positions = buildAtemporalPositions(eventSources.length, radius);

    return eventSources.map((source, index) => ({
      key: source.key || `${index}`,
      label: source.label,
      content: source.content,
      hasMap: source.hasMap,
      position:
        nonLinearPositions?.[source.key] &&
        Number.isFinite(nonLinearPositions[source.key].x) &&
        Number.isFinite(nonLinearPositions[source.key].y)
          ? nonLinearPositions[source.key]
          : positions[index] || { x: 0, y: 0 },
    }));
  }, [eventSources, nonLinearPositions]);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: isCollapsed ? 48 : isNonLinear ? 520 : 100,
      }}
    >
      {/* Time mode toggle */}
      {!isCollapsed && (
        <div className="temporal-order-time-mode-toggle">
          {(['linear', 'nonLinear'] as TimeMode[]).map((mode) => {
            const label = mode === 'linear' ? 'Linear' : 'Non-linear';
            const isActive = timeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onTimeModeChange(mode)}
                className={`temporal-order-time-mode-option ${isActive ? 'is-active' : ''}`}
              >
                {isActive && <motion.span layoutId="temporal-daily-mode-active-pill" className="temporal-order-time-mode-pill" />}
                <span className="temporal-order-time-mode-label">{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Shared drop zone for both linear and non-linear modes */}
      <DropZone
        onDrop={onDropZoneDrop}
        onDragEnter={onDropZoneDragEnter}
        onPaste={onDropZonePaste}
        isCollapsed={isCollapsed}
        compact={false}
      />

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            layoutId="temporal-daily-events-shell"
            style={{
              position: 'relative',
            }}
          >
            <div
              className={`temporal-order-content-host ${isNonLinear ? 'is-non-linear-source' : 'is-linear'}`}
            >
              {children}
            </div>

            <AnimatePresence>
              {isNonLinear && (
                <motion.div
                  key="temporal-daily-flow-field"
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.985 }}
                  transition={{ duration: 0.28 }}
                  className="temporal-order-flow-layer"
                >
                  <AtemporalEventField
                    items={eventPreviews}
                    onPositionsChange={onNonLinearPositionsChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state indicator */}
      {isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            color: '#666',
            fontSize: 14,
          }}
        >
          Temporal Daily (collapsed)
        </motion.div>
      )}
    </div>
  );
};

// ============================================================================
// TipTap Extension
// ============================================================================

// Match for temporal daily syntax: [daily] or [td]
export const temporalDailyInputRegex = /\[(daily|td)\]\s$/;

export const TemporalDailyExtension = TipTapNode.create({
  name: "temporalDaily",
  group: "block",
  content: "block*",
  inline: false,
  selectable: true,
  draggable: true,
  atom: false, // Not atomic - we want to interact with children

  // Higher priority than temporalSpace to wrap them correctly
  priority: 998,

  addAttributes() {
    return {
      collapsed: { default: false },
      backgroundColor: { default: offWhite },
      timeMode: { default: 'linear' },
      nonLinearPositions: { default: {}, rendered: false },
    };
  },

  addCommands() {
    return {
      insertTemporalDaily: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'temporalDaily',
            content: [{ type: 'temporalSpace', content: [{ type: 'paragraph' }] }],
          })
          .run();
      },
      setTemporalDailyCollapsed: (attributes: { collapsed: boolean }) => ({ state, dispatch }) => {
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        
        if (node?.type.name === "temporalDaily" && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "collapsed", attributes.collapsed));
          return true;
        }
        return false;
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-temporal-daily="true"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-temporal-daily": "true" }, 0];
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: temporalDailyInputRegex,
        type: this.type,
      }),
    ];
  },

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin({
        key: new PluginKey('temporalDailySorter'),
        
        // ARCHITECTURE: Auto-sort children when content changes
        // We use appendTransaction to reorder children after any transaction
        // that modifies timepoint dates within the temporal order container.
        appendTransaction(transactions, oldState, newState) {
          // Only process if there were actual changes
          const hasDocChanges = transactions.some(tr => tr.docChanged);
          if (!hasDocChanges) return null;

          let tr: Transaction | null = null;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'temporalDaily') return;

            // Extract children with their dates
            const childrenWithDates: { node: ProseMirrorNode; pos: number; date: Date | null }[] = [];
            
            node.forEach((child, offset) => {
              const childPos = pos + 1 + offset;
              const date = extractEarliestDateFromNode(child);
              childrenWithDates.push({ node: child, pos: childPos, date });
            });

            // Check if sorting is needed (ascending order: earliest first)
            let needsSort = false;
            for (let i = 1; i < childrenWithDates.length; i++) {
              const prev = childrenWithDates[i - 1];
              const curr = childrenWithDates[i];
              
              // Both have dates - check order (earlier should come first, so prev should be <= curr)
              if (prev.date && curr.date && prev.date > curr.date) {
                needsSort = true;
                break;
              }
              // Only current has date (dated items should come before undated items)
              if (!prev.date && curr.date) {
                needsSort = true;
                break;
              }
            }

            if (needsSort) {
              // Sort children ASCENDING (earliest first for top-to-bottom display)
              const sorted = [...childrenWithDates].sort((a, b) => {
                if (a.date && b.date) {
                  // ASCENDING: earlier dates first
                  return a.date.getTime() - b.date.getTime();
                }
                if (a.date && !b.date) return -1;
                if (!a.date && b.date) return 1;
                return 0;
              });

              // Create new fragment with sorted children
              const sortedNodes = sorted.map(item => item.node);
              const newFragment = Fragment.from(sortedNodes);

              // Create the sorted temporal daily node
              const newTemporalDaily = node.type.create(node.attrs, newFragment);

              // Initialize transaction if needed
              if (!tr) {
                tr = newState.tr;
              }

              // Replace the old node with the sorted one
              tr.replaceWith(pos, pos + node.nodeSize, newTemporalDaily);
            }
          });

          return tr;
        },
      }),
      new Plugin({
        key: new PluginKey('temporalDailyFader'),
        // ARCHITECTURE: We use node decorations to apply temporal fading
        // without mutating the ProseMirror document or node attributes.
        //
        // IMPORTANT TAG OVERRIDE: Nodes with the "important" tag are exempt
        // from temporal fading - they always appear at full opacity regardless
        // of how far in the past/future they are. This allows users to mark
        // key events that should remain visually prominent.
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const nowMs = Date.now();

            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'temporalDaily') return;

              node.forEach((child, offset) => {
                const childPos = pos + 1 + offset;
                const date = extractEarliestDateFromNode(child);
                if (!date) return;

                // Check if this node has the important or very important tag - if so, skip fading
                const tags = scanNodeForTags(child);
                if (tags.hasImportantTag || tags.hasVeryImportantTag) {
                  // Still add the distance data attribute for debugging, but no opacity
                  const distanceMs = getTemporalDistanceMs(date, nowMs);
                  const distanceDays = Math.round(distanceMs / (1000 * 60 * 60 * 24));
                  decorations.push(
                    Decoration.node(childPos, childPos + child.nodeSize, {
                      'data-temporal-distance-days': String(distanceDays),
                      'data-important': 'true',
                    })
                  );
                  return; // Skip opacity fading for important/very important nodes
                }

                const distanceMs = getTemporalDistanceMs(date, nowMs);
                const opacity = getTemporalFadeOpacity(distanceMs);
                const distanceDays = Math.round(distanceMs / (1000 * 60 * 60 * 24));

                decorations.push(
                  Decoration.node(childPos, childPos + child.nodeSize, {
                    style: `opacity: ${opacity}; transition: opacity 0.2s ease;`,
                    'data-temporal-distance-days': String(distanceDays),
                  })
                );
              });
            });

            return decorations.length
              ? DecorationSet.create(state.doc, decorations)
              : DecorationSet.empty;
          },
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const isCollapsed = props.node.attrs.collapsed;
      const backgroundColor = props.node.attrs.backgroundColor || '#FFFFFF';
      const timeMode: TimeMode = props.node.attrs.timeMode === 'nonLinear' ? 'nonLinear' : 'linear';
      const { updateAttributes } = props;
      const persistPositionsTimerRef = useRef<number | null>(null);
      const nonLinearPositions = (props.node.attrs.nonLinearPositions || {}) as Record<string, { x: number; y: number }>;
      const nonLinearEventSources = useMemo<NonLinearEventSource[]>(() => {
        const sources: NonLinearEventSource[] = [];
        let index = 0;

        props.node.forEach((childNode) => {
          // Non-linear mode should represent event containers, not incidental
          // top-level blocks (e.g., empty paragraphs between events).
          // Include both temporalSpace and trends containers.
          if (childNode.type.name !== 'temporalSpace' && childNode.type.name !== 'trends') {
            return;
          }

          const nodeQuantaId = (childNode.attrs as any)?.quantaId;
          const key =
            typeof nodeQuantaId === 'string' && nodeQuantaId.trim()
              ? nodeQuantaId
              : `${childNode.type.name}-${index}`;

          const label =
            childNode.textContent?.replace(/\s+/g, ' ').trim().slice(0, 90) || childNode.type.name || 'Event';

          let hasMap = false;
          let hasMeaningfulContent = false;
          childNode.descendants((descendant) => {
            if (descendant.type.name === 'mapboxMap') {
              hasMap = true;
            }
            if (descendant.isText && descendant.text?.trim()) {
              hasMeaningfulContent = true;
            }
            if (descendant.type.name !== 'paragraph' && descendant.type.name !== 'hardBreak') {
              hasMeaningfulContent = true;
            }
            return true;
          });

          // Skip fully empty temporal spaces so they don't appear as blank
          // floating cards in non-linear mode.
          if (!hasMeaningfulContent) {
            return;
          }

          sources.push({
            key,
            label,
            content: childNode.toJSON() as JSONContent,
            hasMap,
          });

          index += 1;
        });

        return sources;
      }, [props.node]);

      /**
       * ARCHITECTURE: Capture dragged node on dragenter
       * ================================================
       * We capture the dragged node info when drag enters the drop zone,
       * because by the time 'drop' fires, the selection may have changed.
       */
      const handleDropZoneDragEnter = useCallback((): DraggedNodeInfo | null => {
        const { state } = props.editor;
        const { selection } = state;
        
        // Check if we have a node selection (dragged node)
        if (selection instanceof NodeSelection) {
          const node = selection.node;
          return {
            from: selection.from,
            to: selection.to,
            nodeJson: node.toJSON(),
            nodeTypeName: node.type.name,
          };
        }
        
        return null;
      }, [props.editor]);

      /**
       * ARCHITECTURE: Drop Zone Handler
       * ================================
       * When something is dropped on the drop zone, we move the captured
       * node into this TemporalDaily container.
       * 
       * The process:
       * 1. Use the draggedNode info captured on dragenter
       * 2. Verify the node still exists at the captured position
       * 3. Delete the original node from its position
       * 4. Insert at the start of this TemporalDaily
       * 5. The auto-sort will then position it based on its TimePointMention date
       */
      const handleDropZoneDrop = useCallback((draggedNode: DraggedNodeInfo | null) => {
        const pos = props.getPos();
        if (typeof pos !== 'number') return;

        // Insert position is: temporalDaily start + 1 (inside the node)
        const insertPos = pos + 1;

        if (draggedNode) {
          const { from: draggedFrom, to: draggedTo, nodeJson, nodeTypeName } = draggedNode;

          // Don't allow dropping a TemporalDaily inside itself
          if (nodeTypeName === 'temporalDaily') {
            console.log('[TemporalDaily] Cannot drop TemporalDaily into itself');
            return;
          }
          
          // Check if the dragged node is already inside this TemporalDaily
          const temporalDailyEnd = pos + props.node.nodeSize;
          if (draggedFrom >= pos && draggedTo <= temporalDailyEnd) {
            console.log('[TemporalDaily] Node is already inside this TemporalDaily');
            return;
          }

          // IMPORTANT: Verify the node still exists at the expected position
          // This prevents duplication if ProseMirror already handled the drop
          const { state } = props.editor;
          const nodeAtPosition = state.doc.nodeAt(draggedFrom);
          
          if (!nodeAtPosition || nodeAtPosition.type.name !== nodeTypeName) {
            console.log('[TemporalDaily] Node no longer at expected position, likely already moved');
            // The node was already moved (probably by ProseMirror), just insert without deleting
            // Actually, don't insert at all since it's already been handled
            return;
          }

          // Keep timeline containers as top-level children; wrap other
          // dropped nodes in temporalSpace for consistency.
          let contentToInsert: any;
          if (nodeTypeName === 'temporalSpace' || nodeTypeName === 'trends') {
            contentToInsert = nodeJson;
          } else {
            // Wrap in temporalSpace
            contentToInsert = {
              type: 'temporalSpace',
              content: [nodeJson],
            };
          }

          // Calculate adjusted insert position BEFORE deleting
          // If we're deleting from before our insert position, we need to adjust
          const adjustedInsertPos = draggedFrom < insertPos 
            ? insertPos - (draggedTo - draggedFrom) 
            : insertPos;

          // Delete the original and insert at new position
          props.editor
            .chain()
            .focus()
            .deleteRange({ from: draggedFrom, to: draggedTo })
            .insertContentAt(adjustedInsertPos, contentToInsert)
            .run();
          
          return;
        }

        // Fallback: create an empty TemporalSpace
        props.editor
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: 'temporalSpace',
            content: [{ type: 'paragraph' }],
          })
          .run();
      }, [props.editor, props.getPos, props.node.nodeSize]);

      const handleDropZonePaste = useCallback((payload: ClipboardPayload) => {
        if (!payload.html && !payload.text) return;

        const pos = props.getPos();
        if (typeof pos !== 'number') return;

        const schema = props.editor.schema;
        const parsedNodes = parseClipboardPayloadToNodes(payload, schema);
        const normalizedNodes = normalizeClipboardNodesForTemporalDaily(parsedNodes, schema);

        if (!normalizedNodes.length) return;

        // ARCHITECTURE: Insert as one transaction so paste stays atomic and
        // the temporal sorter runs once to position new items.
        props.editor.commands.focus();
        const { state, view } = props.editor;
        const tr = state.tr.insert(pos + 1, Fragment.from(normalizedNodes));
        view.dispatch(tr.scrollIntoView());
      }, [props.editor, props.getPos]);

      const handleTimeModeChange = useCallback((mode: TimeMode) => {
        if (mode === timeMode) return;
        updateAttributes({ timeMode: mode });
      }, [timeMode, updateAttributes]);

      const handleNonLinearPositionsChange = useCallback((positions: Record<string, { x: number; y: number }>) => {
        const current = JSON.stringify(nonLinearPositions || {});
        const next = JSON.stringify(positions || {});
        if (current === next) return;

        if (persistPositionsTimerRef.current !== null) {
          window.clearTimeout(persistPositionsTimerRef.current);
        }

        persistPositionsTimerRef.current = window.setTimeout(() => {
          updateAttributes({ nonLinearPositions: positions });
        }, 120);
      }, [nonLinearPositions, updateAttributes]);

      useEffect(() => {
        return () => {
          if (persistPositionsTimerRef.current !== null) {
            window.clearTimeout(persistPositionsTimerRef.current);
          }
        };
      }, []);

      return (
        <NodeViewWrapper
          data-temporal-daily-node-view="true"
          style={{ overflow: 'visible' }}
        >
          {/* ARCHITECTURE: TemporalDaily uses NodeOverlay for consistent grip system
              and connection support, matching TemporalSpace and Group patterns.
              
              ARCHITECTURE DECISION: Transparent background for 3D scene integration
              =======================================================================
              When embedded in 3D scenes (natural-calendar-v3, notes-natural-ui),
              we want shadows from TreeCanopy and WindowBlinds to show through.
              Using rgba with 0.1 opacity allows subtle card definition while
              maintaining shadow visibility. */}
          <NodeOverlay
            nodeProps={props}
            nodeType="temporalDaily"
            boxShadow={`
              0 4px 24px rgba(0, 0, 0, 0.1),
              0 1px 3px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.9)
            `}
            borderRadius={16}
            padding="24px 20px 24px 32px"
            backgroundColor="rgba(255, 255, 255, 0.1)"
          >
            <TemporalDailyContent
              isCollapsed={isCollapsed}
              backgroundColor={backgroundColor}
              timeMode={timeMode}
              eventSources={nonLinearEventSources}
              nonLinearPositions={nonLinearPositions}
              onNonLinearPositionsChange={handleNonLinearPositionsChange}
              onTimeModeChange={handleTimeModeChange}
              onDropZoneDrop={handleDropZoneDrop}
              onDropZoneDragEnter={handleDropZoneDragEnter}
              onDropZonePaste={handleDropZonePaste}
            >
              <NodeViewContent className="temporal-order-node-view-content" />
            </TemporalDailyContent>
          </NodeOverlay>
        </NodeViewWrapper>
      );
    });
  },
});

export default TemporalDailyExtension;
