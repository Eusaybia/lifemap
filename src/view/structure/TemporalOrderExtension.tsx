import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Node as ProseMirrorNode, Fragment, DOMParser, Schema } from "@tiptap/pm/model";
import { Node as TipTapNode, NodeViewProps, JSONContent, isNodeSelection, wrappingInputRule } from "@tiptap/core";
import { Plugin, PluginKey, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import { offWhite } from "../Theme";
import { NodeOverlay } from "../components/NodeOverlay";
import { scanNodeForTags } from "../components/Aura";
import { ForceGraph3DData, ForceGraph3DFigure } from "./GlowNetworkExtension";
import { AuraSpec, readAuraFromAttrs, readTimepointAuraFromAttrs } from "../aura/AuraModel";
import './styles.scss';

// ============================================================================
// TEMPORAL ORDER EXTENSION
// ============================================================================
// ARCHITECTURE DECISION: Chronological Node Ordering
// ====================================================
// This extension creates a visual timeline container that automatically orders
// its child nodes from future (top) to past (bottom). This mirrors how we
// naturally read documents - newer events appear first at the top, older events
// settle below.
//
// The ordering is derived by scanning each child node for TimePointMention
// nodes (timepoint type), extracting their data-date attribute, and using
// the earliest date found in each child as its sort key.
//
// Visual Design:
// - Left side has a vertical arrow pointing upward (bottom to top)
// - The arrow represents the flow of time from past to future
// - Child nodes are sorted DESCENDING (newest first) in the DOM
// - This means: TOP = FUTURE, BOTTOM = PAST
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
    temporalOrder: {
      insertTemporalOrder: () => ReturnType;
      setTemporalOrderCollapsed: (options: { collapsed: boolean }) => ReturnType;
      setTemporalOrderLens: (options: { lens: string }) => ReturnType;
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
const normalizeClipboardNodesForTemporalOrder = (
  nodes: ProseMirrorNode[],
  schema: Schema
): ProseMirrorNode[] => {
  const temporalSpaceType = schema.nodes.temporalSpace;
  const trendsType = schema.nodes.trends;
  const temporalOrderType = schema.nodes.temporalOrder;
  const paragraphType = schema.nodes.paragraph;

  if (!temporalSpaceType) {
    return nodes.filter((node) => !temporalOrderType || node.type !== temporalOrderType);
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
    if (temporalOrderType && node.type === temporalOrderType) {
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

const findTemporalOrderNodePosition = (state: { selection: { $from: { depth: number; node: (depth: number) => ProseMirrorNode; before: (depth: number) => number } } }): number | null => {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type.name === 'temporalOrder') {
      return depth === 0 ? 0 : $from.before(depth);
    }
  }

  return null;
};

// ============================================================================
// Timeline Arrow Component
// ============================================================================

interface TemporalArrowProps {
  height: number;
  isCollapsed: boolean;
}

/**
 * Visual arrow component that runs from bottom to top on the left side.
 * Represents the flow of time from past (bottom) to future (top).
 * 
 * VISUAL DESIGN: The arrow is most opaque in the center (present moment)
 * and fades towards both ends (future at top, past at bottom). This creates
 * a visual metaphor where the present is clear and the distant past/future
 * are more uncertain/faint.
 */
const TemporalArrow: React.FC<TemporalArrowProps> = ({ height, isCollapsed }) => {
  if (isCollapsed) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: -24,
        width: 20,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Arrow head pointing up (future) - faint */}
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        style={{
          marginTop: 4,
          opacity: 0.25,
        }}
      >
        {/* Arrowhead */}
        <path
          d="M8 0 L14 12 L10 12 L10 20 L6 20 L6 12 L2 12 Z"
          fill="rgba(100, 100, 110, 0.6)"
        />
      </svg>
      
      {/* Vertical line - opaque in center, faint at edges */}
      <div
        style={{
          flex: 1,
          width: 4,
          // Gradient: transparent at top → opaque at center → transparent at bottom
          background: `linear-gradient(
            to bottom,
            rgba(100, 100, 110, 0.1) 0%,
            rgba(100, 100, 110, 0.25) 15%,
            rgba(100, 100, 110, 0.5) 40%,
            rgba(100, 100, 110, 0.6) 50%,
            rgba(100, 100, 110, 0.5) 60%,
            rgba(100, 100, 110, 0.25) 85%,
            rgba(100, 100, 110, 0.1) 100%
          )`,
          borderRadius: 2,
          marginTop: -8,
        }}
      />
      
      {/* Base marker (past) - faint */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: 'rgba(100, 100, 110, 0.15)',
          marginBottom: 4,
        }}
      />
    </div>
  );
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
 * Visual drop zone at the top of the TemporalOrder container.
 * When nodes are dragged over this zone, it highlights to indicate
 * that dropping will add the node to the timeline.
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
      aria-label="Drop or paste to add to timeline"
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
          <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
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
        {isDragOver ? 'Release to move here' : compact ? 'Drop or paste into timeline' : 'Drop or paste to add to timeline'}
      </motion.span>
    </motion.div>
  );
};

// ============================================================================
// Temporal Order Visual Component
// ============================================================================

interface TemporalOrderContentProps {
  children: React.ReactNode;
  isCollapsed: boolean;
  lens: TemporalOrderLens;
  eventSources: TemporalOrderEventSource[];
  auraGraphData: ForceGraph3DData;
  graph2DData: TemporalOrderForceGraph2DData;
}

type TemporalOrderLens = 'identity' | 'auraView' | 'graph2D';

interface TemporalOrderEventSource {
  key: string;
  nodeId: string;
  label: string;
  content: JSONContent;
  hasMap: boolean;
  dateMs: number | null;
  aura: AuraSpec | null;
}

interface TemporalOrderForceGraph2DNode {
  id: string;
  label: string;
  color: string;
  val: number;
  auraLuminance?: number;
  auraSize?: number;
}

interface TemporalOrderForceGraph2DLink {
  source: string;
  target: string;
  value?: number;
}

interface TemporalOrderForceGraph2DData {
  nodes: TemporalOrderForceGraph2DNode[];
  links: TemporalOrderForceGraph2DLink[];
}

interface ForceGraph2DInstance {
  graphData: (data: TemporalOrderForceGraph2DData) => ForceGraph2DInstance;
  backgroundColor: (color: string) => ForceGraph2DInstance;
  nodeId: (accessor: string | ((node: TemporalOrderForceGraph2DNode) => string)) => ForceGraph2DInstance;
  nodeLabel: (accessor: string | ((node: TemporalOrderForceGraph2DNode) => string)) => ForceGraph2DInstance;
  nodeColor: (accessor: string | ((node: TemporalOrderForceGraph2DNode) => string)) => ForceGraph2DInstance;
  nodeVal: (accessor: number | ((node: TemporalOrderForceGraph2DNode) => number)) => ForceGraph2DInstance;
  nodeCanvasObject: (
    accessor: (
      node: TemporalOrderForceGraph2DNode & { x?: number; y?: number },
      context: CanvasRenderingContext2D,
      globalScale: number
    ) => void
  ) => ForceGraph2DInstance;
  linkColor: (accessor: string | ((link: TemporalOrderForceGraph2DLink) => string)) => ForceGraph2DInstance;
  linkWidth: (accessor: number | ((link: TemporalOrderForceGraph2DLink) => number)) => ForceGraph2DInstance;
  linkDirectionalArrowLength: (value: number) => ForceGraph2DInstance;
  linkDirectionalArrowRelPos: (value: number) => ForceGraph2DInstance;
  width: (width: number) => ForceGraph2DInstance;
  height: (height: number) => ForceGraph2DInstance;
  enableNodeDrag: (enabled: boolean) => ForceGraph2DInstance;
  onEngineStop: (handler: () => void) => ForceGraph2DInstance;
  zoomToFit: (durationMs?: number, padding?: number) => ForceGraph2DInstance;
  d3Force: (name: string) => { strength?: (value: number) => void } | undefined;
  _destructor?: () => void;
}

type ForceGraph2DChartFactory = () => (element: HTMLElement) => ForceGraph2DInstance;

const FORCE_GRAPH_2D_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/force-graph';
const FORCE_GRAPH_2D_SCRIPT_ATTR = 'data-force-graph-2d';
const FORCE_GRAPH_2D_MIN_WIDTH = 280;
const FORCE_GRAPH_2D_MIN_HEIGHT = 260;
let forceGraph2DScriptPromise: Promise<void> | null = null;

const getForceGraph2DFactory = (): ForceGraph2DChartFactory | undefined => (
  (window as Window & { ForceGraph?: ForceGraph2DChartFactory }).ForceGraph
);

const ensureForceGraph2DScript = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (getForceGraph2DFactory()) return;
  if (forceGraph2DScriptPromise) return forceGraph2DScriptPromise;

  forceGraph2DScriptPromise = new Promise<void>((resolve, reject) => {
    const finishLoad = () => {
      if (getForceGraph2DFactory()) {
        resolve();
        return;
      }
      reject(new Error('ForceGraph global was not found after script load.'));
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[${FORCE_GRAPH_2D_SCRIPT_ATTR}="true"]`
    );
    if (existingScript) {
      existingScript.addEventListener('load', finishLoad, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load force-graph script.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.setAttribute(FORCE_GRAPH_2D_SCRIPT_ATTR, 'true');
    script.src = FORCE_GRAPH_2D_SCRIPT_URL;
    script.async = true;
    script.onload = finishLoad;
    script.onerror = () => reject(new Error('Failed to load force-graph script.'));
    document.head.appendChild(script);
  });

  try {
    await forceGraph2DScriptPromise;
  } catch (error) {
    forceGraph2DScriptPromise = null;
    throw error;
  }
};

const truncateTemporalOrderLabel = (label: string, maxLength = 24) => (
  label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label
);

const sanitizeTemporalOrderNodeId = (value: string) => (
  value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'event'
);

const buildTemporalOrderNodeId = (
  baseLabel: string,
  index: number,
  usedIds: Set<string>
): string => {
  const baseId = sanitizeTemporalOrderNodeId(baseLabel || `event-${index + 1}`);
  let nextId = baseId;
  let suffix = 2;
  while (usedIds.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(nextId);
  return nextId;
};

const deriveTemporalOrderNodeAura = (node: ProseMirrorNode): AuraSpec | null => {
  const directAura = readAuraFromAttrs((node.attrs || {}) as Record<string, unknown>);
  if (directAura) return directAura;

  let discoveredAura: AuraSpec | null = null;
  node.descendants((descendant) => {
    const attrs = (descendant.attrs || {}) as Record<string, unknown>;
    const aura =
      descendant.type.name === 'timepoint'
        ? readTimepointAuraFromAttrs(attrs)
        : readAuraFromAttrs(attrs);
    if (aura) {
      discoveredAura = aura;
      return false;
    }
    return true;
  });

  return discoveredAura;
};

const buildTemporalOrderLinkSequence = (nodeIds: string[]): TemporalOrderForceGraph2DLink[] => {
  const links: TemporalOrderForceGraph2DLink[] = [];
  for (let index = 0; index < nodeIds.length - 1; index += 1) {
    links.push({
      source: nodeIds[index],
      target: nodeIds[index + 1],
      value: 1,
    });
  }
  return links;
};

const buildTemporalOrderAuraGraphData = (eventSources: TemporalOrderEventSource[]): ForceGraph3DData => {
  if (eventSources.length === 0) {
    return {
      nodes: [{ id: 'Empty timeline', group: 1, tone: 'light' }],
      links: [],
    };
  }

  const nowMs = Date.now();
  const usedNodeIds = new Set<string>();
  const resolvedNodeIds: string[] = [];
  const nodes = eventSources.map((source, index) => {
    let graphNodeId = source.label || `Event ${index + 1}`;
    let suffix = 2;
    while (usedNodeIds.has(graphNodeId)) {
      graphNodeId = `${source.label || `Event ${index + 1}`} ${suffix}`;
      suffix += 1;
    }
    usedNodeIds.add(graphNodeId);
    resolvedNodeIds.push(graphNodeId);

    const isFuture = source.dateMs !== null ? source.dateMs >= nowMs : index % 2 === 0;
    return {
      id: graphNodeId,
      group: isFuture ? 1 : 2,
      tone: (isFuture ? 'light' : 'dark') as 'light' | 'dark',
      ...(source.aura
        ? {
            color: source.aura.color,
            auraLuminance: source.aura.luminance,
            auraSize: source.aura.size,
          }
        : {}),
    };
  });

  const links = resolvedNodeIds.slice(0, -1).map((nodeId, index) => ({
    source: nodeId,
    target: resolvedNodeIds[index + 1],
    value: 1,
  }));

  return {
    nodes,
    links,
  };
};

const buildTemporalOrderForceGraph2DData = (
  eventSources: TemporalOrderEventSource[]
): TemporalOrderForceGraph2DData => {
  if (eventSources.length === 0) {
    return {
      nodes: [{ id: 'empty-timeline', label: 'Empty timeline', color: '#94a3b8', val: 1.2 }],
      links: [],
    };
  }

  const nowMs = Date.now();
  const nodes = eventSources.map((source, index) => {
    const isFuture = source.dateMs !== null ? source.dateMs >= nowMs : index % 2 === 0;
    const fallbackColor = isFuture ? '#4f6cb2' : '#475569';
    const auraSize = source.aura?.size;
    const auraLuminance = source.aura?.luminance;

    return {
      id: source.nodeId,
      label: source.label,
      color: source.aura?.color || fallbackColor,
      val: auraSize ? 1.1 + auraSize / 45 : source.hasMap ? 2.1 : 1.55,
      ...(auraLuminance ? { auraLuminance } : {}),
      ...(auraSize ? { auraSize } : {}),
    };
  });

  return {
    nodes,
    links: buildTemporalOrderLinkSequence(eventSources.map((source) => source.nodeId)),
  };
};

const cloneTemporalOrderForceGraph2DData = (
  data: TemporalOrderForceGraph2DData
): TemporalOrderForceGraph2DData => ({
  nodes: data.nodes.map((node) => ({ ...node })),
  links: data.links.map((link) => ({ ...link })),
});

const TemporalOrderForceGraph2D: React.FC<{
  graphData: TemporalOrderForceGraph2DData;
}> = ({ graphData }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraph2DInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const resolvedGraphData = useMemo(
    () => cloneTemporalOrderForceGraph2DData(graphData),
    [graphData]
  );

  const stopEditorEventBubble = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let fallbackFitTimeoutId: number | null = null;
    let didInitialFit = false;

    const fitGraph = (graph: ForceGraph2DInstance, durationMs: number) => {
      graph.zoomToFit(durationMs, 80);
    };

    const initGraph = async () => {
      try {
        await ensureForceGraph2DScript();
        const ForceGraph = getForceGraph2DFactory();
        if (disposed || !ForceGraph) return;

        const { width: rawWidth, height: rawHeight } = container.getBoundingClientRect();
        const width = Math.max(FORCE_GRAPH_2D_MIN_WIDTH, Math.floor(rawWidth));
        const height = Math.max(FORCE_GRAPH_2D_MIN_HEIGHT, Math.floor(rawHeight));

        const graph = ForceGraph()(container);
        graphRef.current = graph;

        graph
          .graphData(resolvedGraphData)
          .backgroundColor('#f8fafc')
          .nodeId('id')
          .nodeLabel((node) => node.label)
          .nodeColor((node) => node.color)
          .nodeVal((node) => node.val)
          .nodeCanvasObject((node, context, globalScale) => {
            const fontSize = Math.max(10, 13 / globalScale);
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const radius = Math.max(5, Math.sqrt(Math.max(0.8, node.val)) * 4.4);

            context.beginPath();
            context.arc(x, y, radius, 0, 2 * Math.PI, false);
            context.fillStyle = node.color;
            context.globalAlpha = 0.92;
            context.fill();

            context.lineWidth = Math.max(0.8, 1.2 / globalScale);
            context.strokeStyle = 'rgba(30, 41, 59, 0.5)';
            context.globalAlpha = 1;
            context.stroke();

            context.font = `${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = '#1e293b';
            context.fillText(node.label, x, y + radius + fontSize * 0.85);
          })
          .linkColor(() => 'rgba(71, 85, 105, 0.34)')
          .linkWidth(1.1)
          .linkDirectionalArrowLength(4)
          .linkDirectionalArrowRelPos(0.82)
          .width(width)
          .height(height)
          .enableNodeDrag(true)
          .onEngineStop(() => {
            if (disposed || didInitialFit) return;
            didInitialFit = true;
            fitGraph(graph, 320);
          });

        const chargeForce = graph.d3Force('charge');
        if (chargeForce?.strength) {
          chargeForce.strength(-220);
        }

        fallbackFitTimeoutId = window.setTimeout(() => {
          if (disposed || !graphRef.current || didInitialFit) return;
          didInitialFit = true;
          fitGraph(graphRef.current, 260);
        }, 720);

        resizeObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          const activeGraph = graphRef.current;
          if (!entry || !activeGraph) return;

          const nextWidth = Math.max(FORCE_GRAPH_2D_MIN_WIDTH, Math.floor(entry.contentRect.width));
          const nextHeight = Math.max(FORCE_GRAPH_2D_MIN_HEIGHT, Math.floor(entry.contentRect.height));
          activeGraph.width(nextWidth).height(nextHeight);
          fitGraph(activeGraph, 0);
        });

        resizeObserver.observe(container);
      } catch (error) {
        console.error('Failed to initialize temporal order 2D graph:', error);
        if (!disposed) {
          setLoadError('Unable to load 2D graph.');
        }
      }
    };

    initGraph();

    return () => {
      disposed = true;
      if (fallbackFitTimeoutId !== null) {
        window.clearTimeout(fallbackFitTimeoutId);
      }
      resizeObserver?.disconnect();
      if (graphRef.current?._destructor) {
        graphRef.current._destructor();
      }
      graphRef.current = null;
      container.innerHTML = '';
    };
  }, [resolvedGraphData]);

  return (
    <div
      className="temporal-order-graph-canvas temporal-order-graph-canvas-2d"
      onMouseDown={stopEditorEventBubble}
      onMouseUp={stopEditorEventBubble}
      onPointerDown={stopEditorEventBubble}
      onPointerUp={stopEditorEventBubble}
      onTouchStart={stopEditorEventBubble}
      onWheel={stopEditorEventBubble}
    >
      <div ref={containerRef} className="temporal-order-graph-canvas-host" />
      {loadError && (
        <div className="temporal-order-graph-canvas-error">{loadError}</div>
      )}
    </div>
  );
};

const TemporalOrderContent: React.FC<TemporalOrderContentProps> = ({
  children,
  isCollapsed,
  lens,
  eventSources,
  auraGraphData,
  graph2DData,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(200);
  const isIdentityLens = lens === 'identity';
  const isAuraLens = lens === 'auraView';
  const isGraph2DLens = lens === 'graph2D';
  const isImmersiveGraphLens = isAuraLens || isGraph2DLens;
  const hasGraphNodes = eventSources.length > 0;

  // Track content height for the arrow
  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        minHeight: isCollapsed ? 48 : isIdentityLens ? 100 : 480,
        paddingLeft: isIdentityLens ? 8 : 0, // Only reserve arrow space for identity lens.
        borderRadius: isImmersiveGraphLens ? 16 : 0,
        overflow: isImmersiveGraphLens ? 'hidden' : 'visible',
      }}
    >
      {/* Temporal Arrow */}
      <TemporalArrow height={contentHeight} isCollapsed={isCollapsed || !isIdentityLens} />

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            layoutId="temporal-order-events-shell"
            style={{
              position: 'relative',
            }}
          >
            <div
              className={`temporal-order-content-host ${isIdentityLens ? 'is-linear' : 'is-graph-source'}`}
            >
              {children}
            </div>

            <AnimatePresence>
              {(isAuraLens || isGraph2DLens) && (
                <motion.div
                  key={`temporal-order-graph-${lens}`}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.985 }}
                  transition={{ duration: 0.28 }}
                  className="temporal-order-graph-layer is-edge-to-edge"
                >
                  {isAuraLens ? (
                    <ForceGraph3DFigure
                      graphData={auraGraphData}
                      aspectRatio={hasGraphNodes ? "8 / 3" : "5 / 2"}
                      minHeight={320}
                      showNavHint={false}
                      fitPadding={90}
                      autoFitDelayMs={520}
                      edgeToEdge
                      fitZoomScale={0.72}
                    />
                  ) : (
                    <TemporalOrderForceGraph2D graphData={graph2DData} />
                  )}
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
          ↑ Temporal Order (collapsed)
        </motion.div>
      )}
    </div>
  );
};

// ============================================================================
// TipTap Extension
// ============================================================================

// Match for temporal order syntax: [order] or [to]
export const temporalOrderInputRegex = /\[(order|to)\]\s$/;

export const TemporalOrderExtension = TipTapNode.create({
  name: "temporalOrder",
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
      lens: { default: 'identity' as TemporalOrderLens },
    };
  },

  addCommands() {
    return {
      insertTemporalOrder: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'temporalOrder',
            content: [{ type: 'temporalSpace', content: [{ type: 'paragraph' }] }],
          })
          .run();
      },
      setTemporalOrderCollapsed: (attributes: { collapsed: boolean }) => ({ state, dispatch }) => {
        if (!dispatch) return false;

        const temporalOrderPos = findTemporalOrderNodePosition(state);
        if (temporalOrderPos === null) return false;

        dispatch(state.tr.setNodeAttribute(temporalOrderPos, "collapsed", attributes.collapsed));
        return true;
      },
      setTemporalOrderLens: (attributes: { lens: string }) => ({ state, dispatch }) => {
        if (!dispatch) return false;

        const temporalOrderPos = findTemporalOrderNodePosition(state);
        if (temporalOrderPos === null) return false;

        dispatch(state.tr.setNodeAttribute(temporalOrderPos, 'lens', attributes.lens));
        return true;
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-temporal-order="true"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-temporal-order": "true" }, 0];
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: temporalOrderInputRegex,
        type: this.type,
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('temporalOrderSorter'),
        
        // ARCHITECTURE: Auto-sort children when content changes
        // We use appendTransaction to reorder children after any transaction
        // that modifies timepoint dates within the temporal order container.
        appendTransaction(transactions, oldState, newState) {
          // Only process if there were actual changes
          const hasDocChanges = transactions.some(tr => tr.docChanged);
          if (!hasDocChanges) return null;

          let tr: Transaction | null = null;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'temporalOrder') return;

            // Extract children with their dates
            const childrenWithDates: { node: ProseMirrorNode; pos: number; date: Date | null }[] = [];
            
            node.forEach((child, offset) => {
              const childPos = pos + 1 + offset;
              const date = extractEarliestDateFromNode(child);
              childrenWithDates.push({ node: child, pos: childPos, date });
            });

            // Check if sorting is needed (descending order: newest first)
            let needsSort = false;
            for (let i = 1; i < childrenWithDates.length; i++) {
              const prev = childrenWithDates[i - 1];
              const curr = childrenWithDates[i];
              
              // Both have dates - check order (newest should come first, so prev should be >= curr)
              if (prev.date && curr.date && prev.date < curr.date) {
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
              // Sort children DESCENDING (newest first for top-to-bottom display)
              const sorted = [...childrenWithDates].sort((a, b) => {
                if (a.date && b.date) {
                  // DESCENDING: newer dates first
                  return b.date.getTime() - a.date.getTime();
                }
                if (a.date && !b.date) return -1;
                if (!a.date && b.date) return 1;
                return 0;
              });

              // Create new fragment with sorted children
              const sortedNodes = sorted.map(item => item.node);
              const newFragment = Fragment.from(sortedNodes);

              // Create the sorted temporal order node
              const newTemporalOrder = node.type.create(node.attrs, newFragment);

              // Initialize transaction if needed
              if (!tr) {
                tr = newState.tr;
              }

              // Replace the old node with the sorted one
              tr.replaceWith(pos, pos + node.nodeSize, newTemporalOrder);
            }
          });

          return tr;
        },
      }),
      new Plugin({
        key: new PluginKey('temporalOrderFader'),
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
              if (node.type.name !== 'temporalOrder') return;

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
      const lensAttr = props.node.attrs.lens;
      const legacyTimeMode = props.node.attrs.timeMode;
      const lens: TemporalOrderLens = (() => {
        if (lensAttr === 'auraView' || lensAttr === 'graph2D' || lensAttr === 'identity') {
          return lensAttr;
        }
        if (legacyTimeMode === 'nonLinear') {
          return 'graph2D';
        }
        return 'identity';
      })();
      const eventSources = useMemo<TemporalOrderEventSource[]>(() => {
        const sources: TemporalOrderEventSource[] = [];
        const usedNodeIds = new Set<string>();
        let index = 0;

        props.node.forEach((childNode) => {
          // Force-graph lenses should represent timeline containers only.
          if (childNode.type.name !== 'temporalSpace' && childNode.type.name !== 'trends') {
            return;
          }

          const nodeQuantaId = (childNode.attrs as any)?.quantaId;
          const key =
            typeof nodeQuantaId === 'string' && nodeQuantaId.trim()
              ? nodeQuantaId
              : `${childNode.type.name}-${index}`;

          const label =
            truncateTemporalOrderLabel(
              childNode.textContent?.replace(/\s+/g, ' ').trim() || childNode.type.name || 'Event'
            );
          const nodeId = buildTemporalOrderNodeId(label, index, usedNodeIds);
          const date = extractEarliestDateFromNode(childNode);
          const aura = deriveTemporalOrderNodeAura(childNode);

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

          // Skip empty wrappers so they do not render as empty graph nodes.
          if (!hasMeaningfulContent) {
            return;
          }

          sources.push({
            key,
            nodeId,
            label,
            content: childNode.toJSON() as JSONContent,
            hasMap,
            dateMs: date ? date.getTime() : null,
            aura,
          });

          index += 1;
        });

        return sources;
      }, [props.node]);
      const auraGraphData = useMemo(
        () => buildTemporalOrderAuraGraphData(eventSources),
        [eventSources]
      );
      const graph2DData = useMemo(
        () => buildTemporalOrderForceGraph2DData(eventSources),
        [eventSources]
      );
      const isImmersiveGraphLens = lens === 'auraView' || lens === 'graph2D';

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
        if (isNodeSelection(selection) && selection.node) {
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
       * node into this TemporalOrder container.
       * 
       * The process:
       * 1. Use the draggedNode info captured on dragenter
       * 2. Verify the node still exists at the captured position
       * 3. Delete the original node from its position
       * 4. Insert at the start of this TemporalOrder
       * 5. The auto-sort will then position it based on its TimePointMention date
       */
      const handleDropZoneDrop = useCallback((draggedNode: DraggedNodeInfo | null) => {
        const pos = props.getPos();
        if (typeof pos !== 'number') return;

        // Insert position is: temporalOrder start + 1 (inside the node)
        const insertPos = pos + 1;

        if (draggedNode) {
          const { from: draggedFrom, to: draggedTo, nodeJson, nodeTypeName } = draggedNode;

          // Don't allow dropping a TemporalOrder inside itself
          if (nodeTypeName === 'temporalOrder') {
            console.log('[TemporalOrder] Cannot drop TemporalOrder into itself');
            return;
          }
          
          // Check if the dragged node is already inside this TemporalOrder
          const temporalOrderEnd = pos + props.node.nodeSize;
          if (draggedFrom >= pos && draggedTo <= temporalOrderEnd) {
            console.log('[TemporalOrder] Node is already inside this TemporalOrder');
            return;
          }

          // IMPORTANT: Verify the node still exists at the expected position
          // This prevents duplication if ProseMirror already handled the drop
          const { state } = props.editor;
          const nodeAtPosition = state.doc.nodeAt(draggedFrom);
          
          if (!nodeAtPosition || nodeAtPosition.type.name !== nodeTypeName) {
            console.log('[TemporalOrder] Node no longer at expected position, likely already moved');
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
        const normalizedNodes = normalizeClipboardNodesForTemporalOrder(parsedNodes, schema);

        if (!normalizedNodes.length) return;

        // ARCHITECTURE: Insert as one transaction so paste stays atomic and
        // the temporal sorter runs once to position new items.
        props.editor.commands.focus();
        const { state, view } = props.editor;
        const tr = state.tr.insert(pos + 1, Fragment.from(normalizedNodes));
        view.dispatch(tr.scrollIntoView());
      }, [props.editor, props.getPos]);

      return (
        <NodeViewWrapper
          data-temporal-order-node-view="true"
          style={{ overflow: 'visible' }}
        >
          {/* ARCHITECTURE: TemporalOrder uses NodeOverlay for consistent grip system
              and connection support, matching TemporalSpace and Group patterns.
              
              ARCHITECTURE DECISION: Transparent background for 3D scene integration
              =======================================================================
              When embedded in 3D scenes (natural-calendar-v3, notes-natural-ui),
              we want shadows from TreeCanopy and WindowBlinds to show through.
              Using rgba with 0.1 opacity allows subtle card definition while
              maintaining shadow visibility. */}
          <NodeOverlay
            nodeProps={props}
            nodeType="temporalOrder"
            boxShadow={`
              0 4px 24px rgba(0, 0, 0, 0.1),
              0 1px 3px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.9)
            `}
            borderRadius={16}
            padding={isImmersiveGraphLens ? 0 : "24px 20px 24px 32px"}
            backgroundColor={isImmersiveGraphLens ? "transparent" : "rgba(255, 255, 255, 0.1)"}
          >
            <TemporalOrderContent
              isCollapsed={isCollapsed}
              lens={lens}
              eventSources={eventSources}
              auraGraphData={auraGraphData}
              graph2DData={graph2DData}
            >
              <NodeViewContent className="temporal-order-node-view-content" />
            </TemporalOrderContent>
          </NodeOverlay>
        </NodeViewWrapper>
      );
    });
  },
});

export default TemporalOrderExtension;
