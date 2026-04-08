import React, { useEffect, useLayoutEffect, useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Node as ProseMirrorNode, Fragment, DOMParser, Schema } from "@tiptap/pm/model";
import { Node as TipTapNode, NodeViewProps, JSONContent, isNodeSelection, wrappingInputRule } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import { forceCollide } from "d3-force-3d";
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from "reactflow";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { offWhite } from "../Theme";
import { NodeOverlay } from "../components/NodeOverlay";
import { scanNodeForTags } from "../components/Aura";
import { ForceGraph3DData, ForceGraph3DFigure } from "./GlowNetworkExtension";
import { AuraSpec, readAuraFromAttrs, readTimepointAuraFromAttrs } from "../aura/AuraModel";
import { TemporalEventCardRenderer, type TemporalEventCanvasNodeData } from "./TemporalEventCanvasNode";
import type { TemporalOrderGlobeLocation } from "./TemporalOrderGlobeView";
import type { QuantaFlowGraphNodeData } from "../components/QuantaFlowGraph";
import { parseInternalClipboardNodes, readInternalClipboardPayload } from "../clipboard/InternalClipboard";
import './styles.scss';

const TemporalOrderQuantaFlowGraph = dynamic(() => import('../components/QuantaFlowGraph'), {
  ssr: false,
  loading: () => (
    <div className="temporal-order-graph-canvas-error">
      Loading flow graph...
    </div>
  ),
});

const TemporalOrderGlobeView = dynamic(
  () => import('./TemporalOrderGlobeView').then((module) => module.TemporalOrderGlobeView),
  {
    ssr: false,
    loading: () => (
      <div className="temporal-order-globe-canvas-error">
        Loading globe...
      </div>
    ),
  }
);

const TemporalOrder2DMapView = dynamic(
  () => import('./TemporalOrderGlobeView').then((module) => module.TemporalOrder2DMapView),
  {
    ssr: false,
    loading: () => (
      <div className="temporal-order-globe-canvas-error">
        Loading map...
      </div>
    ),
  }
);

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

type TemporalOrderLens = 'identity' | 'centuryView' | 'yearlyView' | 'globalYearlyView' | 'globeView' | 'map2DView' | 'auraView' | 'graph2D' | 'flowGraph';
type TemporalOrderCenturySpecificity = 'date' | 'month' | 'year' | 'someday';

const TEMPORAL_ORDER_CENTURY_SPECIFICITY_ORDER: TemporalOrderCenturySpecificity[] = [
  'date',
  'month',
  'year',
  'someday',
];
const TEMPORAL_ORDER_CENTURY_PANE_COUNT = TEMPORAL_ORDER_CENTURY_SPECIFICITY_ORDER.length;

// ============================================================================
// Date Extraction Utilities
// ============================================================================

const inferTemporalOrderCenturySpecificity = (
  attrs: Record<string, unknown>
): TemporalOrderCenturySpecificity => {
  const id = typeof attrs.id === 'string' ? attrs.id : '';
  const rawLabel = typeof attrs.label === 'string' ? attrs.label.trim() : '';
  const normalizedLabel = rawLabel.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const formattedValue =
    typeof attrs['data-formatted'] === 'string'
      ? attrs['data-formatted'].trim()
      : typeof attrs['data-relative-label'] === 'string'
        ? attrs['data-relative-label'].trim()
        : '';

  if (
    id === 'timepoint:someday' ||
    /^Some day$/i.test(formattedValue) ||
    /^Some day$/i.test(normalizedLabel)
  ) {
    return 'someday';
  }

  if (id.startsWith('timepoint:year-') || /^\d{4}$/.test(formattedValue)) {
    return 'year';
  }

  if (
    id.startsWith('timepoint:month-') ||
    id === 'timepoint:this-month' ||
    id === 'timepoint:next-month' ||
    /^[A-Za-z]+\s+\d{4}$/.test(formattedValue)
  ) {
    return 'month';
  }

  return 'date';
};

const extractEarliestTemporalMetadataFromNode = (
  node: ProseMirrorNode
): {
  date: Date | null;
  specificity: TemporalOrderCenturySpecificity | null;
} => {
  let earliestMatch:
    | {
        date: Date;
        specificity: TemporalOrderCenturySpecificity;
      }
    | null = null;

  node.descendants((childNode) => {
    if (childNode.type.name !== 'timepoint') {
      return;
    }

    const dateStr = childNode.attrs['data-date'] as string | null;
    const timepointId = childNode.attrs.id as string | null;
    const specificity = inferTemporalOrderCenturySpecificity(
      childNode.attrs as Record<string, unknown>
    );

    if (!dateStr) {
      if (timepointId === 'timepoint:someday') {
        const fallbackDate = new Date();
        fallbackDate.setHours(0, 0, 0, 0);

        if (!earliestMatch) {
          earliestMatch = {
            date: fallbackDate,
            specificity,
          };
        }
      }
      return;
    }

    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime()) || date.getTime() <= 0) {
        return;
      }

      if (
        !earliestMatch ||
        date < earliestMatch.date ||
        (date.getTime() === earliestMatch.date.getTime() &&
          TEMPORAL_ORDER_CENTURY_SPECIFICITY_ORDER.indexOf(specificity) <
            TEMPORAL_ORDER_CENTURY_SPECIFICITY_ORDER.indexOf(earliestMatch.specificity))
      ) {
        earliestMatch = {
          date,
          specificity,
        };
      }
    } catch {
      // Invalid date string, skip
    }
  });

  const resolvedMatch = earliestMatch as
    | {
        date: Date;
        specificity: TemporalOrderCenturySpecificity;
      }
    | null;

  if (!resolvedMatch) {
    return {
      date: null,
      specificity: null,
    };
  }

  return {
    date: resolvedMatch.date,
    specificity: resolvedMatch.specificity,
  };
};

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
  return extractEarliestTemporalMetadataFromNode(node).date;
};

const isRenderableTemporalOrderTimelineNode = (node: ProseMirrorNode): boolean => {
  if (node.type.name === 'temporalSpace') {
    return true;
  }

  if (node.type.name === 'trends') {
    let hasNestedTemporalSpace = false;
    node.descendants((descendant) => {
      if (descendant.type.name === 'temporalSpace') {
        hasNestedTemporalSpace = true;
        return false;
      }
      return true;
    });
    return !hasNestedTemporalSpace;
  }

  return false;
};

const hasMeaningfulTemporalOrderNodeContent = (node: ProseMirrorNode): { hasMap: boolean; hasMeaningfulContent: boolean } => {
  let hasMap = false;
  let hasMeaningfulContent = false;

  node.descendants((descendant) => {
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

  return { hasMap, hasMeaningfulContent };
};

const buildTemporalOrderEventSourcesFromNode = (
  rootNode: ProseMirrorNode,
  keyPrefix = ''
): TemporalOrderEventSource[] => {
  const sources: TemporalOrderEventSource[] = [];
  const usedNodeIds = new Set<string>();
  let index = 0;

  rootNode.descendants((candidateNode, pos) => {
    if (!isRenderableTemporalOrderTimelineNode(candidateNode)) {
      return true;
    }

    const { hasMap, hasMeaningfulContent } = hasMeaningfulTemporalOrderNodeContent(candidateNode);
    if (!hasMeaningfulContent) {
      return true;
    }

    const nodeQuantaId = (candidateNode.attrs as any)?.quantaId;
    const keyBase =
      typeof nodeQuantaId === 'string' && nodeQuantaId.trim()
        ? nodeQuantaId
        : `${candidateNode.type.name}-${pos}-${index}`;
    const key = keyPrefix ? `${keyPrefix}:${keyBase}` : keyBase;
    const label = truncateTemporalOrderLabel(
      candidateNode.textContent?.replace(/\s+/g, ' ').trim() || candidateNode.type.name || 'Event'
    );
    const nodeId = buildTemporalOrderNodeId(label, index, usedNodeIds);
    const { date, specificity } = extractEarliestTemporalMetadataFromNode(candidateNode);
    const aura = deriveTemporalOrderNodeAura(candidateNode);
    const content = candidateNode.toJSON() as JSONContent;
    const locations = extractTemporalOrderLocationsFromJSONContent(content);

    sources.push({
      key,
      nodeId,
      label,
      content,
      hasMap,
      date: date && !Number.isNaN(date.getTime()) ? new Date(date.getTime()) : null,
      dateMs: date ? date.getTime() : null,
      year: date?.getUTCFullYear() ?? date?.getFullYear() ?? null,
      slotKey: date ? `${date.getUTCFullYear()}-${date.getUTCMonth()}` : null,
      specificity,
      aura,
      locations,
    });

    index += 1;
    return true;
  });

  return sources;
};

const normalizeTemporalOrderContentToDoc = (content: JSONContent): JSONContent => {
  if (content?.type === 'doc') {
    return content;
  }

  return {
    type: 'doc',
    content: [content ?? { type: 'paragraph' }],
  };
};

const fetchTemporalOrderContentFromIndexedDB = async (
  roomName: string,
  timeoutMs = 2000
): Promise<JSONContent | null> => {
  return new Promise((resolve) => {
    const yDoc = new Y.Doc();
    const persistence = new IndexeddbPersistence(roomName, yDoc);
    let settled = false;

    const finish = (value: JSONContent | null) => {
      if (settled) return;
      settled = true;
      persistence.destroy();
      resolve(value);
    };

    persistence.on('synced', () => {
      try {
        const content = TiptapTransformer.fromYdoc(yDoc, 'default') as JSONContent;
        finish(content ?? null);
      } catch {
        finish(null);
      }
    });

    window.setTimeout(() => {
      finish(null);
    }, timeoutMs);
  });
};

const listTemporalOrderUserRoomNames = async (userId: string): Promise<string[]> => {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') {
    return [];
  }

  const databases = await indexedDB.databases();
  const prefix = `${userId}/`;

  return databases
    .map((database) => database.name)
    .filter((name): name is string => {
      if (typeof name !== 'string' || !name.trim()) {
        return false;
      }

      if (name.startsWith(prefix) && name.length > prefix.length) {
        return true;
      }

      return userId === '000000' && !name.includes('/');
    })
    .sort((left, right) => left.localeCompare(right));
};

const readTemporalOrderUserIdFromLocation = (): string => {
  if (typeof window === 'undefined') {
    return '000000';
  }

  const params = new URLSearchParams(window.location.search);
  const userId = params.get('userId')?.trim();
  return userId || '000000';
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
const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

const TEMPORAL_FADE_CONFIG = {
  fadeRangeMs: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
  minOpacity: 0.35,
  maxOpacity: 1,
};

const TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG = {
  fadeRangeMs: MS_PER_YEAR * 80,
  minOpacity: 0.14,
  maxOpacity: 1,
  maxBlurPx: 6,
  minBrightness: 0.72,
  maxBrightness: 1,
};
const YEARLY_VIEW_RANGE_MS = MS_PER_YEAR;

const CENTURY_VIEW_VERTICAL_PADDING_PX = 18;
const CENTURY_VIEW_MAX_EVENT_WIDTH_PX = 500;
const CENTURY_VIEW_MIN_EVENT_WIDTH_PX = 132;
const CENTURY_VIEW_PREFERRED_EVENT_WIDTH_PX = 320;
const CENTURY_VIEW_COLUMN_GAP_PX = 12;
const CENTURY_VIEW_ROW_GAP_PX = 10;
const CENTURY_VIEW_LOG_SCALE_EXPONENT = 0.28;
const CENTURY_VIEW_UNSCHEDULED_GAP_PX = 28;
const CENTURY_VIEW_UNSCHEDULED_COLUMN_MIN_WIDTH_PX = 280;
const CENTURY_VIEW_UNSCHEDULED_COLUMN_MAX_WIDTH_PX = 420;
const CENTURY_VIEW_UNSCHEDULED_CARD_MAX_WIDTH_PX = 340;
const CENTURY_VIEW_EVENT_BASE_SCALE = 0.76;
const CENTURY_VIEW_FUTURE_EVENT_MIN_SCALE = 0.72;

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getCenturyViewScaledHeight = (childHeight: number, scale: number): number =>
  Number((childHeight * scale).toFixed(3));

const getCenturyViewScaledWidth = (childWidth: number, scale: number): number =>
  Number((childWidth * scale).toFixed(3));

const getTemporalDistanceMs = (date: Date, nowMs: number): number =>
  Math.abs(date.getTime() - nowMs);

const getTemporalFadeOpacity = (distanceMs: number): number => {
  const normalized = Math.min(distanceMs / TEMPORAL_FADE_CONFIG.fadeRangeMs, 1);
  const opacity =
    TEMPORAL_FADE_CONFIG.maxOpacity -
    normalized * (TEMPORAL_FADE_CONFIG.maxOpacity - TEMPORAL_FADE_CONFIG.minOpacity);

  return clampNumber(opacity, TEMPORAL_FADE_CONFIG.minOpacity, TEMPORAL_FADE_CONFIG.maxOpacity);
};

const getTemporalYearIncrementOpacity = (distanceMs: number): number => {
  const normalized = Math.min(distanceMs / TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.fadeRangeMs, 1);
  const opacity =
    TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.maxOpacity -
    normalized *
      (TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.maxOpacity - TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.minOpacity);

  return clampNumber(
    opacity,
    TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.minOpacity,
    TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.maxOpacity
  );
};

const getTemporalYearIncrementBlur = (distanceMs: number): number => {
  const normalized = Math.min(distanceMs / TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.fadeRangeMs, 1);
  return Number((normalized * TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.maxBlurPx).toFixed(2));
};

const getTemporalYearIncrementBrightness = (distanceMs: number): number => {
  const normalized = Math.min(distanceMs / TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.fadeRangeMs, 1);
  const brightness =
    TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.maxBrightness -
    normalized *
      (TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.maxBrightness -
        TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.minBrightness);

  return Number(
    clampNumber(
      brightness,
      TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.minBrightness,
      TEMPORAL_YEAR_INCREMENT_VISUAL_CONFIG.maxBrightness
    ).toFixed(2)
  );
};

const getCenturyViewFutureEventScale = (
  date: Date,
  nowMs: number,
  endYear: number
): number => {
  const distanceMs = date.getTime() - nowMs;
  if (distanceMs <= 0) return CENTURY_VIEW_EVENT_BASE_SCALE;

  const horizonMs = Math.max(Date.UTC(endYear + 1, 0, 1) - nowMs, MS_PER_YEAR);
  const normalized = clampNumber(distanceMs / horizonMs, 0, 1);
  return Number(
    (
      CENTURY_VIEW_EVENT_BASE_SCALE *
      (1 - normalized * (1 - CENTURY_VIEW_FUTURE_EVENT_MIN_SCALE))
    ).toFixed(3)
  );
};

interface TemporalOrderYearIncrement {
  year: number;
  positionRatio: number;
  opacity: number;
  blurPx: number;
  lineOpacity: number;
  showLabel: boolean;
  isPresent: boolean;
  topPx: number;
}

interface TemporalOrderTimelineLayoutItem {
  key: string;
  year: number | null;
  date: Date | null;
  slotKey: string | null;
  specificity: TemporalOrderCenturySpecificity | null;
}

interface TemporalOrderMonthTick {
  key: string;
  topPx: number;
}

interface TemporalOrderCenturyViewPlacementInput {
  index: number;
  targetAnchorPx: number;
  childHeight: number;
  scale: number;
  yearKey: string | null;
  slotKey: string | null;
  specificity: TemporalOrderCenturySpecificity;
}

interface TemporalOrderCenturyViewResolvedPlacement {
  index: number;
  laneIndex: number;
  topPx: number;
  leftPx: number;
  bottomPx: number;
  visibleTopPx: number;
  scale: number;
}

interface TemporalOrderCenturyTopBandPlacementInput {
  index: number;
  childHeight: number;
  scale: number;
}

interface TemporalOrderCenturyTopBandResolvedPlacement {
  index: number;
  laneIndex: number;
  topPx: number;
  leftPx: number;
  bottomPx: number;
}

interface TemporalOrderClickTimePointAttrs {
  id: string;
  label: string;
  'data-date': string;
  'data-formatted': string;
  'data-relative-label': string;
}

const isRetimableTimePointAttrs = (attrs: Record<string, unknown> | null | undefined): boolean => {
  if (!attrs) return false;

  const id = typeof attrs.id === 'string' ? attrs.id : '';
  const specificity = inferTemporalOrderCenturySpecificity(attrs);
  if (specificity === 'someday') {
    return true;
  }

  const dateValue = typeof attrs['data-date'] === 'string' ? attrs['data-date'].trim() : '';
  if (!dateValue) {
    return false;
  }

  if (id.startsWith('timepoint:weekday-')) {
    return false;
  }

  if (
    id === 'timepoint:daily' ||
    id === 'timepoint:this-week' ||
    id === 'timepoint:this-month' ||
    id === 'timepoint:next-week' ||
    id === 'timepoint:next-month' ||
    id === 'timepoint:this-summer' ||
    id === 'timepoint:today' ||
    id === 'timepoint:tomorrow' ||
    id === 'timepoint:yesterday' ||
    id === 'timepoint:current-focus'
  ) {
    return false;
  }

  return true;
};

const hasRetimableTemporalOrderNodeJson = (nodeJson: JSONContent | null | undefined): boolean => {
  if (!nodeJson || typeof nodeJson !== 'object') {
    return false;
  }

  if (
    nodeJson.type === 'timepoint' &&
    isRetimableTimePointAttrs((nodeJson.attrs ?? {}) as Record<string, unknown>)
  ) {
    return true;
  }

  const content = Array.isArray(nodeJson.content) ? nodeJson.content : [];
  return content.some((child) => hasRetimableTemporalOrderNodeJson(child as JSONContent));
};

export const retimeTemporalOrderNodeJson = (
  nodeJson: JSONContent,
  attrs: TemporalOrderClickTimePointAttrs
): JSONContent | null => {
  let didUpdate = false;

  const visit = (node: JSONContent): JSONContent => {
    if (
      !didUpdate &&
      node.type === 'timepoint' &&
      isRetimableTimePointAttrs((node.attrs ?? {}) as Record<string, unknown>)
    ) {
      didUpdate = true;
      return {
        ...node,
        attrs: {
          ...(node.attrs ?? {}),
          ...attrs,
        },
      };
    }

    if (!Array.isArray(node.content) || !node.content.length) {
      return node;
    }

    return {
      ...node,
      content: node.content.map((child) => visit(child as JSONContent)),
    };
  };

  const updatedNodeJson = visit(nodeJson);
  return didUpdate ? updatedNodeJson : null;
};

interface TemporalOrderHoverIndicatorState {
  topPx: number;
  leftPx: number;
  label: string;
  mode: TemporalOrderCenturyHoverMode;
}

type TemporalOrderCenturyHoverMode = 'day' | 'week' | 'month' | 'someday';
type TemporalOrderCenturyClickPrecision = 'year' | 'month' | 'week' | 'date' | 'someday';

const TEMPORAL_ORDER_CLICK_YEAR_THRESHOLD_PX = 8;
const TEMPORAL_ORDER_CLICK_MONTH_THRESHOLD_PX = 5;
const TEMPORAL_ORDER_TIMELINE_LEFT_PADDING_PX = 88;
const TEMPORAL_ORDER_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const TEMPORAL_ORDER_HOVER_DAY_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const TEMPORAL_ORDER_HOVER_MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
});

const resolveCenturyViewHoverMode = (horizontalRatio: number): TemporalOrderCenturyHoverMode => {
  if (horizontalRatio < 0.25) {
    return 'day';
  }

  if (horizontalRatio < 0.5) {
    return 'week';
  }

  if (horizontalRatio < 0.75) {
    return 'month';
  }

  return 'someday';
};

export const buildTemporalOrderClickTimePointAttrs = (
  date: Date,
  precision: TemporalOrderCenturyClickPrecision
): TemporalOrderClickTimePointAttrs => {
  if (precision === 'someday') {
    const anchorDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return {
      id: 'timepoint:someday',
      label: '⏳ Some day',
      'data-date': anchorDate.toISOString(),
      'data-formatted': 'Some day',
      'data-relative-label': 'Some day',
    };
  }

  if (precision === 'year') {
    const year = date.getFullYear();
    const yearDate = new Date(year, 0, 1);
    return {
      id: `timepoint:year-${year}`,
      label: `📆 ${year}`,
      'data-date': yearDate.toISOString(),
      'data-formatted': `${year}`,
      'data-relative-label': `${year}`,
    };
  }

  if (precision === 'month') {
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthDate = new Date(year, month, 1);
    const formatted = `${TEMPORAL_ORDER_MONTH_NAMES[month]} ${year}`;
    return {
      id: `timepoint:month-${year}-${month + 1}`,
      label: `📅 ${formatted}`,
      'data-date': monthDate.toISOString(),
      'data-formatted': formatted,
      'data-relative-label': formatted,
    };
  }

  if (precision === 'week') {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const weekStart = new Date(year, month, day);
    const formatted = `Week of ${day} ${TEMPORAL_ORDER_MONTH_NAMES[month]} ${year}`;
    return {
      id: `timepoint:week-${year}-${month + 1}-${day}`,
      label: `📅 ${formatted}`,
      'data-date': weekStart.toISOString(),
      'data-formatted': formatted,
      'data-relative-label': formatted,
    };
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const formatted = `${day} ${TEMPORAL_ORDER_MONTH_NAMES[month]} ${year}`;
  const fullDate = new Date(year, month, day);

  return {
    id: `timepoint:date-${year}-${month + 1}-${day}`,
    label: `📅 ${formatted}`,
    'data-date': fullDate.toISOString(),
    'data-formatted': formatted,
    'data-relative-label': formatted,
  };
};

const resolveCenturyViewClickDate = (
  offsetTopPx: number,
  increments: TemporalOrderYearIncrement[]
): Date => {
  if (!increments.length) return new Date();

  for (let index = 0; index < increments.length - 1; index += 1) {
    const current = increments[index];
    const next = increments[index + 1];
    if (!current || !next) continue;

    const upperBound = next.topPx;
    const lowerBound = current.topPx;
    if (offsetTopPx < upperBound || offsetTopPx > lowerBound) continue;

    const gapPx = Math.max(lowerBound - upperBound, 1);
    const progress = clampNumber((lowerBound - offsetTopPx) / gapPx, 0, 1);
    const yearStart = new Date(current.year, 0, 1);
    const nextYearStart = new Date(current.year + 1, 0, 1);
    const timeMs =
      yearStart.getTime() + (nextYearStart.getTime() - yearStart.getTime()) * progress;

    return new Date(timeMs);
  }

  if (offsetTopPx <= (increments[increments.length - 1]?.topPx ?? 0)) {
    const endYear = increments[increments.length - 1]?.year ?? new Date().getFullYear();
    return new Date(endYear, 0, 1);
  }

  return new Date(increments[0]?.year ?? new Date().getFullYear(), 0, 1);
};

const startOfWeek = (date: Date): Date => {
  const resolved = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = resolved.getDay();
  const deltaToMonday = (day + 6) % 7;
  resolved.setDate(resolved.getDate() - deltaToMonday);
  return resolved;
};

const snapCenturyViewHoverDate = (
  date: Date,
  mode: TemporalOrderCenturyHoverMode
): Date => {
  if (mode === 'someday') {
    return date;
  }

  if (mode === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  if (mode === 'week') {
    return startOfWeek(date);
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatCenturyViewHoverLabel = (
  date: Date,
  mode: TemporalOrderCenturyHoverMode
): string => {
  if (mode === 'someday') {
    return 'Some day';
  }

  if (mode === 'month') {
    return TEMPORAL_ORDER_HOVER_MONTH_FORMATTER.format(date);
  }

  if (mode === 'week') {
    return `Week of ${TEMPORAL_ORDER_HOVER_DAY_FORMATTER.format(date)}`;
  }

  return TEMPORAL_ORDER_HOVER_DAY_FORMATTER.format(date);
};

export const resolveCenturyViewClickSelection = (
  offsetTopPx: number,
  horizontalRatio: number,
  yearIncrements: TemporalOrderYearIncrement[],
  monthTicks: TemporalOrderMonthTick[]
): {
  date: Date;
  precision: TemporalOrderCenturyClickPrecision;
  hoverMode: TemporalOrderCenturyHoverMode;
} => {
  const hoverMode = resolveCenturyViewHoverMode(horizontalRatio);
  const rawDate = resolveCenturyViewClickDate(offsetTopPx, yearIncrements);

  if (hoverMode === 'someday') {
    return {
      date: rawDate,
      precision: 'someday',
      hoverMode,
    };
  }

  const nearestYear = yearIncrements.reduce<TemporalOrderYearIncrement | null>((best, increment) => {
    if (!best) return increment;
    return Math.abs(increment.topPx - offsetTopPx) < Math.abs(best.topPx - offsetTopPx) ? increment : best;
  }, null);
  const nearestMonthTick = monthTicks.reduce<TemporalOrderMonthTick | null>((best, tick) => {
    if (!best) return tick;
    return Math.abs(tick.topPx - offsetTopPx) < Math.abs(best.topPx - offsetTopPx) ? tick : best;
  }, null);

  if (
    nearestYear &&
    Math.abs(nearestYear.topPx - offsetTopPx) <= TEMPORAL_ORDER_CLICK_YEAR_THRESHOLD_PX
  ) {
    return {
      date: new Date(nearestYear.year, 0, 1),
      precision: 'year',
      hoverMode,
    };
  }

  if (hoverMode === 'month') {
    return {
      date: snapCenturyViewHoverDate(rawDate, 'month'),
      precision: 'month',
      hoverMode,
    };
  }

  if (hoverMode === 'week') {
    return {
      date: snapCenturyViewHoverDate(rawDate, 'week'),
      precision: 'week',
      hoverMode,
    };
  }

  if (
    nearestMonthTick &&
    Math.abs(nearestMonthTick.topPx - offsetTopPx) <= TEMPORAL_ORDER_CLICK_MONTH_THRESHOLD_PX
  ) {
    return {
      date: snapCenturyViewHoverDate(rawDate, 'month'),
      precision: 'month',
      hoverMode,
    };
  }

  return {
    date: snapCenturyViewHoverDate(rawDate, 'day'),
    precision: 'date',
    hoverMode,
  };
};

const getCenturyViewScaledOffsetPx = (
  distanceFromPresentYears: number,
  totalGapCount: number,
  totalHeightPx: number
): number => {
  if (totalGapCount <= 0) return 0;

  const normalized =
    Math.log1p(Math.max(distanceFromPresentYears, 0)) /
    Math.log1p(totalGapCount);

  return totalHeightPx * Math.pow(normalized, CENTURY_VIEW_LOG_SCALE_EXPONENT);
};

const buildCenturyViewYearAnchors = (
  startYear: number,
  endYear: number,
  minimumHeightPx = 960
) => {
  const resolvedEndYear = Math.max(startYear, endYear);
  const totalGapCount = Math.max(resolvedEndYear - startYear, 0);
  const totalHeightPx = Math.max(minimumHeightPx, totalGapCount * 24);
  const anchors: Array<{
    year: number;
    distanceYears: number;
    offsetFromStartPx: number;
  }> = [];

  for (let year = startYear; year <= resolvedEndYear; year += 1) {
    const distanceYears = year - startYear;
    anchors.push({
      year,
      distanceYears,
      offsetFromStartPx: getCenturyViewScaledOffsetPx(distanceYears, totalGapCount, totalHeightPx),
    });
  }

  const totalOffsetPx = anchors[anchors.length - 1]?.offsetFromStartPx ?? 0;

  return {
    totalOffsetPx,
    anchors: anchors.map((anchor) => ({
      ...anchor,
      topPx: CENTURY_VIEW_VERTICAL_PADDING_PX + (totalOffsetPx - anchor.offsetFromStartPx),
    })),
  };
};

export const buildTemporalOrderYearIncrements = (
  startYear = new Date().getFullYear(),
  endYear = 2100,
  options?: {
    minimumHeightPx?: number;
  }
): TemporalOrderYearIncrement[] => {
  const resolvedEndYear = Math.max(startYear, endYear);
  const span = resolvedEndYear - startYear;
  const { anchors, totalOffsetPx } = buildCenturyViewYearAnchors(
    startYear,
    resolvedEndYear,
    options?.minimumHeightPx
  );

  return anchors.map(({ year, distanceYears, offsetFromStartPx, topPx }) => {
    const distanceMs = distanceYears * MS_PER_YEAR;
    const normalized = span === 0 ? 0 : distanceYears / span;

    return {
      year,
      positionRatio: totalOffsetPx === 0 ? 0.5 : 1 - offsetFromStartPx / totalOffsetPx,
      opacity: getTemporalYearIncrementOpacity(distanceMs),
      blurPx: getTemporalYearIncrementBlur(distanceMs),
      lineOpacity: clampNumber(0.72 - normalized * 0.54, 0.16, 0.72),
      showLabel:
        year === startYear ||
        year === startYear + 1 ||
        distanceYears <= 10 ||
        (distanceYears <= 30 && distanceYears % 5 === 0) ||
        year === resolvedEndYear ||
        year % 10 === 0,
      isPresent: year === startYear,
      topPx,
    };
  });
};

export const buildTemporalOrderMonthTicks = (
  increments: TemporalOrderYearIncrement[]
): TemporalOrderMonthTick[] => {
  const ticks: TemporalOrderMonthTick[] = [];

  for (let index = 0; index < increments.length - 1; index += 1) {
    const current = increments[index];
    const next = increments[index + 1];
    if (!current || !next) continue;

    const gapPx = current.topPx - next.topPx;
    if (gapPx <= 0) continue;

    for (let month = 0; month < 12; month += 1) {
      const monthRatio = (month + 1) / 12;
      ticks.push({
        key: `${current.year}-${month + 1}`,
        topPx: current.topPx - gapPx * monthRatio,
      });
    }
  }

  return ticks;
};

export const getCenturyViewDateOffsetPx = (
  date: Date,
  yearTopLookup: Map<number, number>,
  fallbackTopPx: number
): number => {
  const year = date.getUTCFullYear();
  const yearTopPx = yearTopLookup.get(year);
  const nextYearTopPx = yearTopLookup.get(year + 1);

  if (typeof yearTopPx !== 'number') {
    return fallbackTopPx;
  }

  if (typeof nextYearTopPx !== 'number') {
    return yearTopPx;
  }

  const yearStartMs = Date.UTC(year, 0, 1);
  const nextYearStartMs = Date.UTC(year + 1, 0, 1);
  const progress = clampNumber(
    (date.getTime() - yearStartMs) / Math.max(nextYearStartMs - yearStartMs, 1),
    0,
    1
  );

  return yearTopPx - (yearTopPx - nextYearTopPx) * progress;
};

const getTemporalOrderCenturySpecificityRank = (
  specificity: TemporalOrderCenturySpecificity,
  presentSpecificities = TEMPORAL_ORDER_CENTURY_SPECIFICITY_ORDER
) => presentSpecificities.indexOf(specificity);

const resolveTemporalOrderCenturyPreferredLane = (
  specificity: TemporalOrderCenturySpecificity,
  columnCount: number,
  presentSpecificities: TemporalOrderCenturySpecificity[]
) => {
  if (columnCount <= 1) {
    return 0;
  }

  const resolvedSpecificities = specificity === 'someday'
    ? TEMPORAL_ORDER_CENTURY_SPECIFICITY_ORDER
    : presentSpecificities.length
      ? presentSpecificities
      : TEMPORAL_ORDER_CENTURY_SPECIFICITY_ORDER;
  const maxRank = resolvedSpecificities.length - 1;
  const specificityRank = getTemporalOrderCenturySpecificityRank(specificity, resolvedSpecificities);

  return Math.round((specificityRank * (columnCount - 1)) / Math.max(maxRank, 1));
};

export const buildTemporalOrderCenturyViewPlacements = (
  placements: TemporalOrderCenturyViewPlacementInput[],
  columnCount: number,
  cardWidth: number,
  availableWidth: number
): {
  placements: TemporalOrderCenturyViewResolvedPlacement[];
  contentBottom: number;
} => {
  const resolvedColumnCount = Math.max(columnCount, 1);
  const visibleCardWidth = getCenturyViewScaledWidth(cardWidth, CENTURY_VIEW_EVENT_BASE_SCALE);
  const laneStepPx = visibleCardWidth + CENTURY_VIEW_COLUMN_GAP_PX;
  const packedWidth = visibleCardWidth * resolvedColumnCount + CENTURY_VIEW_COLUMN_GAP_PX * Math.max(resolvedColumnCount - 1, 0);
  const laneOffsetPx = Math.max((availableWidth - packedWidth) / 2, 0);
  const laneTopEdges = Array.from({ length: resolvedColumnCount }, () => Number.POSITIVE_INFINITY);
  const resolvedPlacements: TemporalOrderCenturyViewResolvedPlacement[] = [];
  const presentSpecificities = TEMPORAL_ORDER_CENTURY_SPECIFICITY_ORDER.filter((specificity) =>
    placements.some((placement) => placement.specificity === specificity)
  );
  let contentBottom = CENTURY_VIEW_VERTICAL_PADDING_PX;

  const buildLanePreferenceOrder = (
    preferredLane: number,
    restrictToPreferredLane = false
  ) => {
    if (restrictToPreferredLane) {
      return [preferredLane];
    }

    return Array.from({ length: resolvedColumnCount }, (_, laneIndex) => laneIndex).sort((left, right) => {
      const leftDistance = Math.abs(left - preferredLane);
      const rightDistance = Math.abs(right - preferredLane);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return right - left;
    });
  };

  placements
    .slice()
    // Place cards starting from the present and build upward into the future.
    // This preserves the "future is up" direction even when lanes collide.
    .sort((left, right) => {
      if (right.targetAnchorPx !== left.targetAnchorPx) {
        return right.targetAnchorPx - left.targetAnchorPx;
      }

      return left.index - right.index;
    })
    .forEach((placement) => {
      const lanePreferenceOrder = buildLanePreferenceOrder(
        resolveTemporalOrderCenturyPreferredLane(
          placement.specificity,
          resolvedColumnCount,
          presentSpecificities
        ),
        placement.specificity === 'someday'
      );
      let bestLaneIndex = 0;
      let bestBottomPx = Number.NEGATIVE_INFINITY;
      const scaledHeight = getCenturyViewScaledHeight(placement.childHeight, placement.scale);

      lanePreferenceOrder.forEach((laneIndex) => {
        const laneTopEdge = laneTopEdges[laneIndex];
        const candidateBottomPx = Number.isFinite(laneTopEdge)
          ? Math.min(placement.targetAnchorPx, laneTopEdge - CENTURY_VIEW_ROW_GAP_PX)
          : placement.targetAnchorPx;

        if (candidateBottomPx > bestBottomPx) {
          bestBottomPx = candidateBottomPx;
          bestLaneIndex = laneIndex;
        }
      });

      const topPx = Math.max(
        CENTURY_VIEW_VERTICAL_PADDING_PX,
        bestBottomPx - placement.childHeight
      );
      const bottomPx = topPx + placement.childHeight;
      const visibleTopPx = bottomPx - scaledHeight;

      laneTopEdges[bestLaneIndex] = visibleTopPx;
      contentBottom = Math.max(contentBottom, bottomPx + CENTURY_VIEW_ROW_GAP_PX);

      resolvedPlacements.push({
        index: placement.index,
        laneIndex: bestLaneIndex,
        topPx,
        leftPx: laneOffsetPx + bestLaneIndex * laneStepPx,
        bottomPx,
        visibleTopPx,
        scale: placement.scale,
      });
    });

  return {
    placements: resolvedPlacements,
    contentBottom,
  };
};

export const buildTemporalOrderCenturyTopBandPlacements = (
  placements: TemporalOrderCenturyTopBandPlacementInput[],
  availableWidth: number,
  columnCount: number,
  cardWidth: number
): {
  placements: TemporalOrderCenturyTopBandResolvedPlacement[];
  bandHeight: number;
} => {
  if (!placements.length) {
    return {
      placements: [],
      bandHeight: 0,
    };
  }

  const resolvedColumnCount = Math.max(1, Math.min(columnCount, placements.length));
  const laneBottomEdges = Array.from(
    { length: resolvedColumnCount },
    () => CENTURY_VIEW_VERTICAL_PADDING_PX
  );
  const visibleCardWidth = getCenturyViewScaledWidth(cardWidth, CENTURY_VIEW_EVENT_BASE_SCALE);
  const laneStepPx = visibleCardWidth + CENTURY_VIEW_COLUMN_GAP_PX;
  const packedWidth = visibleCardWidth * resolvedColumnCount + CENTURY_VIEW_COLUMN_GAP_PX * Math.max(resolvedColumnCount - 1, 0);
  const laneOffsetPx = Math.max((availableWidth - packedWidth) / 2, 0);
  const resolvedPlacements: TemporalOrderCenturyTopBandResolvedPlacement[] = [];

  placements.forEach((placement) => {
    let bestLaneIndex = 0;
    let bestTopPx = laneBottomEdges[0] ?? CENTURY_VIEW_VERTICAL_PADDING_PX;

    for (let laneIndex = 1; laneIndex < laneBottomEdges.length; laneIndex += 1) {
      const laneTopPx = laneBottomEdges[laneIndex] ?? CENTURY_VIEW_VERTICAL_PADDING_PX;
      if (laneTopPx < bestTopPx) {
        bestTopPx = laneTopPx;
        bestLaneIndex = laneIndex;
      }
    }

    const topPx = bestTopPx;
    const bottomPx = topPx + getCenturyViewScaledHeight(placement.childHeight, placement.scale);
    laneBottomEdges[bestLaneIndex] = bottomPx + CENTURY_VIEW_ROW_GAP_PX;

    resolvedPlacements.push({
      index: placement.index,
      laneIndex: bestLaneIndex,
      topPx,
      leftPx: laneOffsetPx + laneStepPx * bestLaneIndex,
      bottomPx,
    });
  });

  return {
    placements: resolvedPlacements,
    bandHeight: Math.max(...laneBottomEdges) - CENTURY_VIEW_VERTICAL_PADDING_PX,
  };
};

export const resolveTemporalOrderCenturyViewColumnCount = (
  placements: Array<
    Pick<TemporalOrderCenturyViewPlacementInput, 'yearKey' | 'slotKey' | 'childHeight' | 'scale' | 'specificity'> & {
      bandTopPx: number;
      bandBottomPx: number;
    }
  >,
  timelineWidth: number
): number => {
  if (!placements.length) return 1;

  const maxColumnsByWidth = Math.max(
    1,
    Math.floor(
      (timelineWidth + CENTURY_VIEW_COLUMN_GAP_PX) /
        (CENTURY_VIEW_MIN_EVENT_WIDTH_PX + CENTURY_VIEW_COLUMN_GAP_PX)
    )
  );
  const minimumSpecificityColumns = placements.some((placement) => placement.specificity === 'someday')
    ? Math.min(maxColumnsByWidth, TEMPORAL_ORDER_CENTURY_PANE_COUNT)
    : 1;
  const maxUsableColumns = Math.max(
    minimumSpecificityColumns,
    Math.min(maxColumnsByWidth, placements.length)
  );

  const canFitYearBandInColumns = (heights: number[], bandHeight: number, columnCount: number) => {
    if (!heights.length) return true;
    const laneHeights = Array.from({ length: columnCount }, () => 0);

    return heights
      .slice()
      .sort((left, right) => right - left)
      .every((height) => {
        let bestLaneIndex = -1;
        let bestLaneHeight = Number.POSITIVE_INFINITY;

        for (let laneIndex = 0; laneIndex < laneHeights.length; laneIndex += 1) {
          const laneHeight = laneHeights[laneIndex];
          const candidateHeight = laneHeight === 0
            ? height
            : laneHeight + CENTURY_VIEW_ROW_GAP_PX + height;

          if (candidateHeight > bandHeight) {
            continue;
          }

          if (candidateHeight < bestLaneHeight) {
            bestLaneHeight = candidateHeight;
            bestLaneIndex = laneIndex;
          }
        }

        if (bestLaneIndex === -1) {
          return false;
        }

        laneHeights[bestLaneIndex] = bestLaneHeight;
        return true;
      });
  };

  const yearCounts = new Map<string, number>();
  const slotCounts = new Map<string, number>();
  const yearBands = new Map<string, { heights: number[]; bandHeight: number }>();

  placements.forEach((placement) => {
    const scaledHeight = getCenturyViewScaledHeight(placement.childHeight, placement.scale);

    if (placement.yearKey) {
      yearCounts.set(placement.yearKey, (yearCounts.get(placement.yearKey) ?? 0) + 1);

      const bandHeight = Math.max(
        placement.bandBottomPx - placement.bandTopPx - CENTURY_VIEW_ROW_GAP_PX,
        scaledHeight
      );
      const existingBand = yearBands.get(placement.yearKey);
      if (existingBand) {
        existingBand.heights.push(scaledHeight);
        existingBand.bandHeight = Math.max(existingBand.bandHeight, bandHeight);
      } else {
        yearBands.set(placement.yearKey, {
          heights: [scaledHeight],
          bandHeight,
        });
      }
    }
    if (placement.slotKey) {
      slotCounts.set(placement.slotKey, (slotCounts.get(placement.slotKey) ?? 0) + 1);
    }
  });

  const densestYearCount = Math.max(...yearCounts.values(), 1);
  const densestSlotCount = Math.max(...slotCounts.values(), 1);
  const densityDrivenColumns = Math.max(
    densestSlotCount,
    Math.ceil(densestYearCount / 2)
  );

  const startingColumnCount = clampNumber(
    densityDrivenColumns,
    minimumSpecificityColumns,
    maxUsableColumns
  );

  for (let candidateColumnCount = startingColumnCount; candidateColumnCount <= maxUsableColumns; candidateColumnCount += 1) {
    const everyYearFits = Array.from(yearBands.values()).every((yearBand) =>
      canFitYearBandInColumns(yearBand.heights, yearBand.bandHeight, candidateColumnCount)
    );

    if (everyYearFits) {
      return candidateColumnCount;
    }
  }

  return maxUsableColumns;
};

// ============================================================================
// Clipboard Utilities
// ============================================================================

interface ClipboardPayload {
  html: string | null;
  text: string | null;
  internal: string | null;
}

export const sanitizeClipboardHtmlContainer = (container: HTMLElement) => {
  container.querySelectorAll('style, script, noscript').forEach((node) => node.remove());
  container
    .querySelectorAll('[data-drag-handle], .node-overlay-grip-handle, input, button, select, option, svg')
    .forEach((node) => node.remove());

  const unwrapSelectors = [
    '[data-node-overlay="true"]',
    '[data-scrollview-node-view="true"]',
    '[data-group-node-view="true"]',
    '[data-temporal-space-node-view="true"]',
    '[data-portal-lens]',
  ];

  unwrapSelectors.forEach((selector) => {
    container.querySelectorAll(selector).forEach((node) => {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
      }
      parent.removeChild(node);
    });
  });
};

/**
 * ARCHITECTURE: Prefer HTML clipboard parsing to preserve rich formatting,
 * then fall back to plain text so paste works even from external sources.
 */
const parseClipboardPayloadToNodes = (
  payload: ClipboardPayload,
  schema: Schema
): ProseMirrorNode[] => {
  const internalNodes = parseInternalClipboardNodes(payload.internal, schema);
  if (internalNodes.length) {
    return internalNodes;
  }

  if (payload.html && typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = payload.html;
    sanitizeClipboardHtmlContainer(container);
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
    const internal = readInternalClipboardPayload(e.clipboardData);

    if (!internal && !html && !text) {
      return;
    }

    isProcessingRef.current = true;
    setIsDragOver(false);
    onPaste({ html, text, internal });

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
  globeLocations: TemporalOrderGlobeLocation[];
  yearIncrements: TemporalOrderYearIncrement[];
  timelineLayout: TemporalOrderTimelineLayoutItem[];
  auraGraphData: ForceGraph3DData;
  graph2DData: TemporalOrderForceGraph2DData;
  flowGraphData: TemporalOrderQuantaFlowGraphData;
  onCreateTemporalSpaceAtTimePoint: (attrs: TemporalOrderClickTimePointAttrs) => void;
  onCaptureDraggedNode: () => DraggedNodeInfo | null;
  onRetimeDraggedNodeAtTimePoint: (
    draggedNode: DraggedNodeInfo,
    attrs: TemporalOrderClickTimePointAttrs
  ) => boolean;
}

interface TemporalOrderEventSource {
  key: string;
  nodeId: string;
  label: string;
  content: JSONContent;
  hasMap: boolean;
  date: Date | null;
  dateMs: number | null;
  year: number | null;
  slotKey: string | null;
  specificity: TemporalOrderCenturySpecificity | null;
  aura: AuraSpec | null;
  locations: TemporalOrderEventLocation[];
}

interface TemporalOrderForceGraph2DNode {
  id: string;
  label: string;
  content: JSONContent;
  previewLines: string[];
  timeLabel: string | null;
  hasMapPreview: boolean;
  cardWidthPx: number;
  cardHeightPx: number;
  collisionRadius: number;
  color: string;
  val: number;
  x?: number;
  y?: number;
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

interface TemporalOrderQuantaFlowGraphData {
  nodes: ReactFlowNode<QuantaFlowGraphNodeData>[];
  edges: ReactFlowEdge[];
  signature: string;
}

interface ForceGraph2DHandle {
  d3Force: {
    (name: string): {
      strength?: (value: number) => void;
      distance?: (value: number) => void;
      distanceMax?: (value: number) => void;
      distanceMin?: (value: number) => void;
    } | undefined;
    (name: string, forceFn: unknown): ForceGraph2DHandle;
  };
  graph2ScreenCoords: (x: number, y: number) => { x: number; y: number };
  zoomToFit: (durationMs?: number, padding?: number) => void;
}

type ReactForceGraph2DComponent = React.ComponentType<Record<string, unknown>>;

const FORCE_GRAPH_2D_MIN_WIDTH = 280;
const FORCE_GRAPH_2D_MIN_HEIGHT = 260;
const FORCE_GRAPH_2D_DEFAULT_HEIGHT = 480;
const FORCE_GRAPH_CARD_WIDTH = 360;
const FORCE_GRAPH_CARD_WIDTH_MAP = 420;
const FORCE_GRAPH_CARD_HEIGHT = 180;
const FORCE_GRAPH_CARD_HEIGHT_MAP = 300;
const FORCE_GRAPH_CARD_CORNER_RADIUS = 16;
const TEMPORAL_ORDER_FLOW_NODE_WIDTH = 620;
const TEMPORAL_ORDER_FLOW_NODE_HEIGHT = 430;
const TEMPORAL_ORDER_FLOW_NODE_MAP_WIDTH = 700;
const TEMPORAL_ORDER_FLOW_NODE_MAP_HEIGHT = 520;
const TEMPORAL_ORDER_FLOW_NODE_PRIMARY_X = 48;
const TEMPORAL_ORDER_FLOW_NODE_SECONDARY_X = 796;
const TEMPORAL_ORDER_FLOW_NODE_VERTICAL_STEP = 340;

const drawTemporalOrderRoundedRect = (
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number
) => {
  context.beginPath();
  context.moveTo(left + radius, top);
  context.lineTo(left + width - radius, top);
  context.quadraticCurveTo(left + width, top, left + width, top + radius);
  context.lineTo(left + width, top + height - radius);
  context.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
  context.lineTo(left + radius, top + height);
  context.quadraticCurveTo(left, top + height, left, top + height - radius);
  context.lineTo(left, top + radius);
  context.quadraticCurveTo(left, top, left + radius, top);
  context.closePath();
};

const buildTemporalOrderCardPositions = (count: number, radius: number): { x: number; y: number }[] => {
  if (!count) return [];

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const positions: { x: number; y: number }[] = [];

  for (let index = 0; index < count; index += 1) {
    const spread = radius * Math.sqrt((index + 0.5) / count);
    const theta = goldenAngle * index;
    positions.push({
      x: Math.cos(theta) * spread,
      y: Math.sin(theta) * spread,
    });
  }

  return positions;
};

const walkJSONContent = (
  node: JSONContent | null | undefined,
  visitor: (current: JSONContent) => void
) => {
  if (!node) return;
  visitor(node);
  node.content?.forEach((child) => walkJSONContent(child, visitor));
};

const extractTextFromJSONNode = (node: JSONContent | null | undefined): string => {
  const chunks: string[] = [];
  walkJSONContent(node, (current) => {
    if (current.type === 'text' && typeof current.text === 'string' && current.text.trim()) {
      chunks.push(current.text.trim());
    }
  });
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
};

const extractTextPreviewFromJSONContent = (content: JSONContent): string => {
  const chunks: string[] = [];
  walkJSONContent(content, (node) => {
    if (node.type === 'text' && typeof node.text === 'string' && node.text.trim()) {
      chunks.push(node.text.trim());
      return;
    }
    if (node.type === 'timepoint') {
      const attrs = (node.attrs || {}) as Record<string, unknown>;
      const rawLabel =
        attrs['data-relative-label'] ??
        attrs['data-formatted'] ??
        attrs.label;
      if (typeof rawLabel === 'string' && rawLabel.trim()) {
        chunks.push(rawLabel.replace(/^📆\s*/, '').trim());
      }
    }
  });
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
};

const extractTimeLabelFromJSONContent = (content: JSONContent): string | null => {
  let discovered: string | null = null;
  walkJSONContent(content, (node) => {
    if (discovered || node.type !== 'timepoint') return;
    const attrs = (node.attrs || {}) as Record<string, unknown>;
    const rawValue =
      attrs['data-relative-label'] ??
      attrs['data-formatted'] ??
      attrs.label;
    if (typeof rawValue === 'string' && rawValue.trim()) {
      discovered = rawValue.replace(/^📆\s*/, '').trim();
    }
  });
  return discovered;
};

interface TemporalOrderEventLocation {
  id?: string;
  name: string;
  label: string;
  country?: string;
  coords: [number, number] | null;
}

const parseTemporalOrderLocationCoords = (rawCoords: unknown): [number, number] | null => {
  if (Array.isArray(rawCoords) && rawCoords.length === 2) {
    const lng = Number(rawCoords[0]);
    const lat = Number(rawCoords[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [lng, lat];
    }
    return null;
  }

  if (typeof rawCoords !== 'string' || !rawCoords.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawCoords);
    if (Array.isArray(parsed) && parsed.length === 2) {
      const lng = Number(parsed[0]);
      const lat = Number(parsed[1]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        return [lng, lat];
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const extractTemporalOrderLocationsFromJSONContent = (
  content: JSONContent
): TemporalOrderEventLocation[] => {
  const extractedLocations: TemporalOrderEventLocation[] = [];
  const seenLocations = new Set<string>();

  const pushLocation = (location: TemporalOrderEventLocation) => {
    const coordsKey = location.coords
      ? `${location.coords[0].toFixed(5)},${location.coords[1].toFixed(5)}`
      : 'unknown';
    const locationKey = `${location.name.toLowerCase()}::${(location.country || '').toLowerCase()}::${coordsKey}`;
    if (seenLocations.has(locationKey)) {
      return;
    }
    seenLocations.add(locationKey);
    extractedLocations.push(location);
  };

  walkJSONContent(content, (node) => {
    const attrs = (node.attrs || {}) as Record<string, unknown>;

    if (node.type === 'location') {
      const nestedTextLabel = extractTextFromJSONNode(node).replace(/^📍\s*/, '').trim();
      const name =
        (typeof attrs['data-name'] === 'string' && attrs['data-name'].trim()) ||
        (typeof attrs.label === 'string' && attrs.label.replace(/^📍\s*/, '').trim()) ||
        nestedTextLabel ||
        '';

      if (!name) {
        return;
      }

      pushLocation({
        id: typeof attrs.id === 'string' ? attrs.id : undefined,
        name,
        label:
          (typeof attrs.label === 'string' && attrs.label.replace(/^📍\s*/, '').trim()) ||
          nestedTextLabel ||
          name,
        country: typeof attrs['data-country'] === 'string' ? attrs['data-country'] : undefined,
        coords: parseTemporalOrderLocationCoords(attrs['data-coords']),
      });
      return;
    }

    if (node.type !== 'mapboxMap') {
      return;
    }

    const rawMarkers = Array.isArray(attrs.markers) ? attrs.markers : [];
    rawMarkers.forEach((rawMarker) => {
      if (!rawMarker || typeof rawMarker !== 'object') {
        return;
      }

      const marker = rawMarker as Record<string, unknown>;
      const lng = Number(marker.lng);
      const lat = Number(marker.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return;
      }

      const label =
        (typeof marker.label === 'string' && marker.label.trim()) ||
        'Pinned location';

      pushLocation({
        name: label,
        label,
        coords: [lng, lat],
      });
    });
  });

  return extractedLocations;
};

const splitTextIntoPreviewLines = (text: string, maxCharsPerLine = 42, maxLines = 3): string[] => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      return;
    }
    if (current) {
      lines.push(current);
      current = word;
      return;
    }
    lines.push(word.slice(0, maxCharsPerLine));
    current = word.slice(maxCharsPerLine);
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    const clamped = lines.slice(0, maxLines);
    const last = clamped[maxLines - 1];
    clamped[maxLines - 1] = `${last.slice(0, Math.max(1, maxCharsPerLine - 1))}…`;
    return clamped;
  }

  return lines;
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

const hashTemporalAuraSeed = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const resolveTemporalAuraUnit = (value: string) => {
  return (hashTemporalAuraSeed(value) % 10_000) / 10_000;
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
  const clusterAssignments: number[] = [];
  const clusterSizes: number[] = [];
  const AURA_CLUSTER_GAP_MS = MS_PER_YEAR * 0.75;
  const AURA_CLUSTER_MAX_SIZE = 6;

  let currentCluster = 0;
  let previousDateMs: number | null = null;
  let currentClusterSize = 0;

  eventSources.forEach((source, index) => {
    const nextDateMs = source.dateMs;
    const shouldStartNewCluster =
      index > 0 &&
      ((previousDateMs !== null &&
        nextDateMs !== null &&
        Math.abs(nextDateMs - previousDateMs) > AURA_CLUSTER_GAP_MS) ||
        (previousDateMs === null) !== (nextDateMs === null) ||
        currentClusterSize >= AURA_CLUSTER_MAX_SIZE);

    if (shouldStartNewCluster) {
      currentCluster += 1;
      currentClusterSize = 0;
    }

    clusterAssignments.push(currentCluster);
    clusterSizes[currentCluster] = (clusterSizes[currentCluster] ?? 0) + 1;
    currentClusterSize += 1;

    if (nextDateMs !== null) {
      previousDateMs = nextDateMs;
    }
  });

  const clusterCounts = new Map<number, number>();
  const totalClusterCount = Math.max(clusterSizes.length, 1);
  const clusterAnchors = clusterSizes.map((_, clusterIndex) => {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const radialProgress =
      totalClusterCount <= 1 ? 0.22 : Math.sqrt((clusterIndex + 0.5) / totalClusterCount);
    const orbitAngle =
      clusterIndex * goldenAngle +
      (resolveTemporalAuraUnit(`cluster:${clusterIndex}:angle`) - 0.5) * 0.34;
    const orbitRadius =
      (92 + radialProgress * (132 + Math.min(totalClusterCount, 9) * 20)) *
      (0.9 + resolveTemporalAuraUnit(`cluster:${clusterIndex}:radius`) * 0.18);

    return {
      x:
        Math.cos(orbitAngle) * orbitRadius * 1.02 +
        (resolveTemporalAuraUnit(`cluster:${clusterIndex}:jitter-x`) - 0.5) * 64,
      y:
        Math.sin(orbitAngle) * orbitRadius * 0.84 +
        (resolveTemporalAuraUnit(`cluster:${clusterIndex}:jitter-y`) - 0.5) * 76,
      z: (resolveTemporalAuraUnit(`cluster:${clusterIndex}:jitter-z`) - 0.5) * 132,
      spin:
        orbitAngle +
        (resolveTemporalAuraUnit(`cluster:${clusterIndex}:spin`) - 0.5) * 0.9,
    };
  });

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
    const clusterIndex = clusterAssignments[index] ?? 0;
    const clusterSize = clusterSizes[clusterIndex] ?? 1;
    const localIndex = clusterCounts.get(clusterIndex) ?? 0;
    clusterCounts.set(clusterIndex, localIndex + 1);

    const clusterAnchor = clusterAnchors[clusterIndex] ?? { x: 0, y: 0, z: 0, spin: 0 };
    const branchCount = clusterSize <= 2 ? clusterSize : Math.min(3, Math.max(2, Math.ceil(clusterSize / 2)));
    const nodeSeedKey = `${source.key}:${graphNodeId}:${localIndex}`;
    const branchIndex = localIndex <= 0 ? 0 : (localIndex - 1) % Math.max(branchCount, 1);
    const branchDepth = localIndex <= 0 ? 0 : Math.floor((localIndex - 1) / Math.max(branchCount, 1)) + 1;
    const branchArc = Math.PI * 1.78;
    const branchBaseAngle =
      clusterAnchor.spin -
      branchArc / 2 +
      (branchIndex / Math.max(branchCount - 1, 1)) * branchArc;
    const branchAngle =
      branchBaseAngle + (resolveTemporalAuraUnit(`${nodeSeedKey}:angle`) - 0.5) * 0.7;
    const branchRadius =
      localIndex <= 0
        ? 0
        : 26 +
          branchDepth * (34 + resolveTemporalAuraUnit(`${nodeSeedKey}:radius`) * 22) +
          resolveTemporalAuraUnit(`${nodeSeedKey}:fine-radius`) * 14;
    const localX =
      localIndex <= 0
        ? (resolveTemporalAuraUnit(`${nodeSeedKey}:core-x`) - 0.5) * 18
        : Math.cos(branchAngle) * branchRadius +
          (branchIndex - (branchCount - 1) / 2) * 11;
    const localY =
      localIndex <= 0
        ? (resolveTemporalAuraUnit(`${nodeSeedKey}:core-y`) - 0.5) * 18
        : Math.sin(branchAngle) * branchRadius +
          (resolveTemporalAuraUnit(`${nodeSeedKey}:lift`) - 0.5) * 28;
    const localZ =
      localIndex <= 0
        ? (resolveTemporalAuraUnit(`${nodeSeedKey}:core-z`) - 0.5) * 24
        : (resolveTemporalAuraUnit(`${nodeSeedKey}:depth`) - 0.5) * 88 + branchDepth * 10;
    const x = clusterAnchor.x + localX;
    const y = clusterAnchor.y + localY;
    const z = clusterAnchor.z + localZ;

    return {
      id: graphNodeId,
      group: isFuture ? 1 : 2,
      tone: (isFuture ? 'light' : 'dark') as 'light' | 'dark',
      x,
      y,
      z,
      fx: x,
      fy: y,
      fz: z,
      ...(source.aura
        ? {
            color: source.aura.color,
            auraLuminance: source.aura.luminance,
            auraSize: source.aura.size,
          }
        : {}),
    };
  });

  const links: ForceGraph3DData["links"] = [];
  const seenLinks = new Set<string>();
  const addLink = (sourceIndex: number, targetIndex: number, value = 1) => {
    if (sourceIndex === targetIndex) return;
    const sourceId = resolvedNodeIds[sourceIndex];
    const targetId = resolvedNodeIds[targetIndex];
    if (!sourceId || !targetId) return;
    const key = sourceId < targetId ? `${sourceId}::${targetId}` : `${targetId}::${sourceId}`;
    if (seenLinks.has(key)) return;
    seenLinks.add(key);
    links.push({
      source: sourceId,
      target: targetId,
      value,
    });
  };

  resolvedNodeIds.slice(0, -1).forEach((_, index) => {
    const sourceCluster = clusterAssignments[index] ?? 0;
    const targetCluster = clusterAssignments[index + 1] ?? 0;
    if (sourceCluster !== targetCluster) return;
    addLink(index, index + 1, 1);
  });

  const clusterNodeIndexes = new Map<number, number[]>();
  clusterAssignments.forEach((clusterIndex, index) => {
    const bucket = clusterNodeIndexes.get(clusterIndex);
    if (bucket) {
      bucket.push(index);
      return;
    }
    clusterNodeIndexes.set(clusterIndex, [index]);
  });

  clusterNodeIndexes.forEach((indexes) => {
    if (indexes.length < 3) return;

    for (let localIndex = 0; localIndex < indexes.length; localIndex += 1) {
      const currentIndex = indexes[localIndex];

      if (localIndex >= 2) {
        addLink(currentIndex, indexes[localIndex - 2], 0.86);
      }

      if (localIndex >= 1 && localIndex < indexes.length - 1) {
        addLink(indexes[localIndex - 1], indexes[localIndex + 1], 0.72);
      }

      if (indexes.length >= 5 && localIndex === 0) {
        addLink(currentIndex, indexes[Math.min(3, indexes.length - 1)], 0.68);
      }

      if (indexes.length >= 6 && localIndex === indexes.length - 1) {
        addLink(currentIndex, indexes[Math.max(indexes.length - 4, 0)], 0.68);
      }
    }
  });

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
      nodes: [],
      links: [],
    };
  }

  const nowMs = Date.now();
  const radius = 220 + Math.min(eventSources.length, 24) * 16;
  const initialPositions = buildTemporalOrderCardPositions(eventSources.length, radius);
  const nodes = eventSources.map((source, index) => {
    const isFuture = source.dateMs !== null ? source.dateMs >= nowMs : index % 2 === 0;
    const fallbackColor = isFuture ? '#4f6cb2' : '#475569';
    const auraSize = source.aura?.size;
    const auraLuminance = source.aura?.luminance;
    const previewText = extractTextPreviewFromJSONContent(source.content);
    const previewLines = splitTextIntoPreviewLines(previewText || source.label);
    const timeLabel = extractTimeLabelFromJSONContent(source.content);
    const hasMapPreview = source.hasMap;
    const cardWidthPx = hasMapPreview ? FORCE_GRAPH_CARD_WIDTH_MAP : FORCE_GRAPH_CARD_WIDTH;
    const cardHeightPx = hasMapPreview ? FORCE_GRAPH_CARD_HEIGHT_MAP : FORCE_GRAPH_CARD_HEIGHT;
    const collisionRadius = hasMapPreview ? 240 : 200;

    return {
      id: source.nodeId,
      label: source.label,
      content: source.content,
      previewLines: previewLines.length > 0 ? previewLines : [source.label],
      timeLabel,
      hasMapPreview,
      cardWidthPx,
      cardHeightPx,
      collisionRadius,
      color: source.aura?.color || fallbackColor,
      val: auraSize ? 8 + auraSize / 22 : hasMapPreview ? 9.6 : 8.8,
      x: initialPositions[index]?.x ?? 0,
      y: initialPositions[index]?.y ?? 0,
      ...(auraLuminance ? { auraLuminance } : {}),
      ...(auraSize ? { auraSize } : {}),
    };
  });

  return {
    nodes,
    // Match old non-linear card field behavior: free-floating cards without chain edges.
    links: [],
  };
};

const buildTemporalOrderQuantaFlowGraphData = (
  eventSources: TemporalOrderEventSource[]
): TemporalOrderQuantaFlowGraphData => {
  const nodes: ReactFlowNode<QuantaFlowGraphNodeData>[] = eventSources.map((source, index) => ({
    id: source.nodeId,
    type: 'quantaNode',
    position: {
      x: index % 2 === 0 ? TEMPORAL_ORDER_FLOW_NODE_PRIMARY_X : TEMPORAL_ORDER_FLOW_NODE_SECONDARY_X,
      y: index * TEMPORAL_ORDER_FLOW_NODE_VERTICAL_STEP,
    },
    data: {
      label: source.label,
      content: source.content,
    },
    style: {
      width: source.hasMap ? TEMPORAL_ORDER_FLOW_NODE_MAP_WIDTH : TEMPORAL_ORDER_FLOW_NODE_WIDTH,
      height: source.hasMap ? TEMPORAL_ORDER_FLOW_NODE_MAP_HEIGHT : TEMPORAL_ORDER_FLOW_NODE_HEIGHT,
    },
  }));

  const edges: ReactFlowEdge[] = eventSources.slice(0, -1).map((source, index) => ({
    id: `temporal-order-flow-${source.nodeId}-${eventSources[index + 1].nodeId}`,
    source: source.nodeId,
    target: eventSources[index + 1].nodeId,
    type: 'handDrawn',
  }));

  const signature = JSON.stringify(
    eventSources.map((source) => ({
      nodeId: source.nodeId,
      key: source.key,
      label: source.label,
      hasMap: source.hasMap,
      dateMs: source.dateMs,
      content: source.content,
    }))
  );

  return {
    nodes,
    edges,
    signature,
  };
};

const buildTemporalOrderGlobeLocations = (
  eventSources: TemporalOrderEventSource[]
): TemporalOrderGlobeLocation[] => {
  return eventSources.flatMap((source) =>
    source.locations.map((location, index) => ({
      id: `${source.nodeId}-location-${index}`,
      name: location.name,
      label: location.label,
      country: location.country,
      coords: location.coords,
      eventLabel: source.label,
      eventNodeId: source.nodeId,
      dateMs: source.dateMs,
    }))
  );
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
  const graphRef = useRef<ForceGraph2DHandle | null>(null);
  const cardElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [GraphComponent, setGraphComponent] = useState<ReactForceGraph2DComponent | null>(null);
  const [graphSize, setGraphSize] = useState({
    width: FORCE_GRAPH_2D_MIN_WIDTH,
    height: FORCE_GRAPH_2D_DEFAULT_HEIGHT,
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const resolvedGraphData = useMemo(
    () => cloneTemporalOrderForceGraph2DData(graphData),
    [graphData]
  );

  const stopEditorEventBubble = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  useEffect(() => {
    let cancelled = false;
    import('react-force-graph-2d')
      .then((module) => {
        if (cancelled) return;
        setGraphComponent(() => module.default as unknown as ReactForceGraph2DComponent);
        setLoadError(null);
      })
      .catch((error) => {
        console.error('Failed to load react-force-graph-2d:', error);
        if (!cancelled) {
          setLoadError('Unable to load 2D graph.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setGraphSize({
        width: Math.max(FORCE_GRAPH_2D_MIN_WIDTH, Math.floor(entry.contentRect.width)),
        height: Math.max(FORCE_GRAPH_2D_MIN_HEIGHT, Math.floor(entry.contentRect.height)),
      });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const chargeForce = graph.d3Force('charge');
    if (chargeForce?.strength) {
      chargeForce.strength(-960);
    }
    if (chargeForce?.distanceMax) {
      chargeForce.distanceMax(920);
    }
    if (chargeForce?.distanceMin) {
      chargeForce.distanceMin(16);
    }

    graph.d3Force(
      'collide',
      forceCollide<any>()
        .radius((node: any) => Number(node?.collisionRadius) || 180)
        .strength(0.92)
        .iterations(2)
    );

    const fitTimeoutId = window.setTimeout(() => {
      graph.zoomToFit(280, 140);
    }, 520);

    return () => window.clearTimeout(fitTimeoutId);
  }, [resolvedGraphData]);

  useEffect(() => {
    let frameId = 0;
    const updateCardTransforms = () => {
      const graph = graphRef.current;
      if (!graph) {
        frameId = window.requestAnimationFrame(updateCardTransforms);
        return;
      }

      const maxX = graphSize.width + 240;
      const maxY = graphSize.height + 240;
      resolvedGraphData.nodes.forEach((node) => {
        const element = cardElementsRef.current[node.id];
        if (!element) return;

        const graphX = Number.isFinite(node.x) ? Number(node.x) : 0;
        const graphY = Number.isFinite(node.y) ? Number(node.y) : 0;
        const screenPoint = graph.graph2ScreenCoords(graphX, graphY);
        const isVisible =
          Number.isFinite(screenPoint.x) &&
          Number.isFinite(screenPoint.y) &&
          screenPoint.x > -220 &&
          screenPoint.y > -220 &&
          screenPoint.x < maxX &&
          screenPoint.y < maxY;

        element.style.opacity = isVisible ? '1' : '0';
        element.style.transform = `translate(${screenPoint.x}px, ${screenPoint.y}px) translate(-50%, -50%)`;
      });

      frameId = window.requestAnimationFrame(updateCardTransforms);
    };

    frameId = window.requestAnimationFrame(updateCardTransforms);
    return () => window.cancelAnimationFrame(frameId);
  }, [graphSize.height, graphSize.width, resolvedGraphData]);

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
      <div ref={containerRef} className="temporal-order-graph-canvas-host">
        {GraphComponent && (
          <GraphComponent
            ref={graphRef}
            graphData={resolvedGraphData as unknown as Record<string, unknown>}
            width={graphSize.width}
            height={graphSize.height}
            backgroundColor="#f8fafc"
            nodeId="id"
            nodeLabel={(node: any) => node.label}
            nodeCanvasObjectMode={() => 'replace'}
            nodeCanvasObject={() => {}}
            nodePointerAreaPaint={(node: any, color: string, context: CanvasRenderingContext2D, globalScale: number) => {
              const safeScale = Math.max(0.0001, globalScale || 1);
              const cardWidth = (Number(node.cardWidthPx) || FORCE_GRAPH_CARD_WIDTH) / safeScale;
              const cardHeight = (Number(node.cardHeightPx) || FORCE_GRAPH_CARD_HEIGHT) / safeScale;
              const cornerRadius = FORCE_GRAPH_CARD_CORNER_RADIUS / safeScale;
              const left = (Number.isFinite(node.x) ? node.x : 0) - cardWidth / 2;
              const top = (Number.isFinite(node.y) ? node.y : 0) - cardHeight / 2;

              context.fillStyle = color;
              drawTemporalOrderRoundedRect(context, left, top, cardWidth, cardHeight, cornerRadius);
              context.fill();
            }}
            linkColor={() => 'rgba(71, 85, 105, 0.24)'}
            linkWidth={0.8}
            enableNodeDrag
            cooldownTicks={160}
          />
        )}
        <div className="temporal-order-graph-cards-overlay" aria-hidden="true">
          {resolvedGraphData.nodes.map((node) => (
            <div
              key={node.id}
              ref={(element) => {
                cardElementsRef.current[node.id] = element;
              }}
              className="temporal-order-graph-card-anchor"
              style={{ width: node.cardWidthPx }}
            >
              <TemporalEventCardRenderer
                data={{
                  nodeId: node.id,
                  label: truncateTemporalOrderLabel(node.label, 54),
                  content: node.content,
                } as TemporalEventCanvasNodeData}
              />
            </div>
          ))}
        </div>
      </div>
      {loadError && (
        <div className="temporal-order-graph-canvas-error">{loadError}</div>
      )}
    </div>
  );
};

const TemporalOrderYearRail: React.FC<{
  increments: TemporalOrderYearIncrement[];
  topOffsetPx?: number;
}> = ({ increments, topOffsetPx = 0 }) => {
  if (!increments.length) return null;

  const railHeight = (increments[0]?.topPx ?? 0) + CENTURY_VIEW_VERTICAL_PADDING_PX + topOffsetPx;
  const monthTicks = buildTemporalOrderMonthTicks(increments);

  return (
    <div
      aria-hidden="true"
      className="temporal-order-year-rail"
    >
      <div
        className="temporal-order-year-rail-axis"
        style={{
          top: CENTURY_VIEW_VERTICAL_PADDING_PX + topOffsetPx,
          height: Math.max(railHeight - CENTURY_VIEW_VERTICAL_PADDING_PX * 2, 0),
        }}
      />
      {monthTicks.map((tick) => (
        <div
          key={tick.key}
          className="temporal-order-year-rail-month-row"
          style={{ top: tick.topPx + topOffsetPx }}
        >
          <div className="temporal-order-year-rail-month-tick" />
        </div>
      ))}
      {increments.map((increment) => {
        return (
          <div
            key={increment.year}
            className="temporal-order-year-rail-row"
            style={{ top: increment.topPx + topOffsetPx }}
          >
            <div
              className="temporal-order-year-rail-tick"
              style={{
                width: increment.isPresent ? 34 : increment.showLabel ? 22 : 14,
                opacity: increment.lineOpacity,
              }}
            />
            {increment.showLabel && (
              <div
                className={`temporal-order-year-rail-label${increment.isPresent ? ' is-present' : ''}`}
                style={{
                  opacity: increment.opacity,
                }}
              >
                {increment.year}
              </div>
            )}
            <div
              className="temporal-order-year-rail-guideline"
              style={{
                opacity: increment.lineOpacity,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const TemporalOrderGlobalYearlyCards: React.FC<{
  eventSources: TemporalOrderEventSource[];
  yearIncrements: TemporalOrderYearIncrement[];
  yearlyViewRange: { startMs: number; endMs: number } | null;
  minimumHeightPx: number;
}> = ({ eventSources, yearIncrements, yearlyViewRange, minimumHeightPx }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const cardElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const layoutFrameRef = useRef<number | null>(null);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [contentMinHeight, setContentMinHeight] = useState(minimumHeightPx);

  const visibleSources = useMemo(() => {
    return eventSources.filter((source) => {
      if (!source.date) return false;
      if (!yearlyViewRange) return true;
      const dateMs = source.date.getTime();
      return dateMs >= yearlyViewRange.startMs && dateMs <= yearlyViewRange.endMs;
    });
  }, [eventSources, yearlyViewRange]);

  const scheduleLayout = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (layoutFrameRef.current !== null) return;

    layoutFrameRef.current = window.requestAnimationFrame(() => {
      layoutFrameRef.current = null;
      setLayoutRevision((previous) => previous + 1);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && layoutFrameRef.current !== null) {
        window.cancelAnimationFrame(layoutFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new ResizeObserver(() => {
      scheduleLayout();
    });

    observer.observe(host);

    visibleSources.forEach((source) => {
      const element = cardElementsRef.current[source.key];
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [scheduleLayout, visibleSources]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const cardElements = visibleSources
      .map((source) => ({ source, element: cardElementsRef.current[source.key] }))
      .filter((entry): entry is { source: TemporalOrderEventSource; element: HTMLDivElement } => entry.element instanceof HTMLDivElement);

    if (!cardElements.length) {
      setContentMinHeight(minimumHeightPx);
      return;
    }

    const yearTopLookup = new Map(yearIncrements.map((increment) => [increment.year, increment.topPx]));
    const horizonEndYear = yearIncrements[yearIncrements.length - 1]?.year ?? new Date().getFullYear();
    const nowMs = Date.now();
    const timelineWidth = Math.max(host.clientWidth - 96, CENTURY_VIEW_MIN_EVENT_WIDTH_PX);
    const maxColumnsByWidth = Math.max(
      1,
      Math.min(
        cardElements.length,
        Math.floor(
          (timelineWidth + CENTURY_VIEW_COLUMN_GAP_PX) /
            (CENTURY_VIEW_MIN_EVENT_WIDTH_PX + CENTURY_VIEW_COLUMN_GAP_PX)
        )
      )
    );
    const minimumScheduledColumnCount = cardElements.some((entry) => entry.source.specificity === 'someday')
      ? Math.min(maxColumnsByWidth, TEMPORAL_ORDER_CENTURY_PANE_COUNT)
      : 1;
    const computeCardWidth = (columnCount: number) =>
      Math.max(
        Math.min(
          Math.floor(
            (timelineWidth - (columnCount - 1) * CENTURY_VIEW_COLUMN_GAP_PX) /
              Math.max(columnCount, 1)
          ),
          CENTURY_VIEW_MAX_EVENT_WIDTH_PX
        ),
        CENTURY_VIEW_MIN_EVENT_WIDTH_PX
      );

    const applyWidths = (cardWidth: number) => {
      cardElements.forEach(({ element }) => {
        element.style.display = '';
        element.style.width = `${cardWidth}px`;
        element.style.maxWidth = `${CENTURY_VIEW_MAX_EVENT_WIDTH_PX}px`;
      });
    };

    const buildMeasuredPlacements = () =>
      cardElements.map(({ source, element }, index) => {
        const targetAnchorPx = getCenturyViewDateOffsetPx(
          source.date as Date,
          yearTopLookup,
          yearTopLookup.get(source.year ?? NaN) ?? CENTURY_VIEW_VERTICAL_PADDING_PX
        );
        const childHeight = element.getBoundingClientRect().height;
        const scale = getCenturyViewFutureEventScale(
          source.date as Date,
          nowMs,
          horizonEndYear
        );
        const bandBottomPx = yearTopLookup.get(source.year ?? NaN) ?? targetAnchorPx;
        const bandTopPx =
          yearTopLookup.get((source.year ?? NaN) + 1) ??
          Math.max(CENTURY_VIEW_VERTICAL_PADDING_PX, bandBottomPx - 96);

        return {
          index,
          childHeight,
          scale,
          targetAnchorPx,
          yearKey: source.year !== null ? String(source.year) : null,
          slotKey: source.slotKey,
          specificity: source.specificity ?? 'date',
          bandTopPx,
          bandBottomPx,
        };
      });

    let columnCount = clampNumber(
      Math.min(maxColumnsByWidth, Math.max(1, cardElements.length > 1 ? 2 : 1)),
      minimumScheduledColumnCount,
      maxColumnsByWidth
    );
    let cardWidth = computeCardWidth(columnCount);
    let placements = [] as ReturnType<typeof buildMeasuredPlacements>;

    for (let iteration = 0; iteration < maxColumnsByWidth; iteration += 1) {
      applyWidths(cardWidth);
      placements = buildMeasuredPlacements();

      const requiredColumnCount = resolveTemporalOrderCenturyViewColumnCount(placements, timelineWidth);
      if (requiredColumnCount <= columnCount || columnCount >= maxColumnsByWidth) {
        break;
      }

      columnCount = Math.min(requiredColumnCount, maxColumnsByWidth);
      cardWidth = computeCardWidth(columnCount);
    }

    cardWidth = computeCardWidth(columnCount);
    applyWidths(cardWidth);
    placements = buildMeasuredPlacements();

    const {
      placements: resolvedPlacements,
      contentBottom,
    } = buildTemporalOrderCenturyViewPlacements(
      placements,
      columnCount,
      cardWidth,
      timelineWidth
    );

    resolvedPlacements.forEach((placement) => {
      const element = cardElements[placement.index]?.element;
      if (!element) return;

      element.style.position = 'absolute';
      element.style.marginTop = '0px';
      element.style.top = `${placement.topPx}px`;
      element.style.left = `${placement.leftPx}px`;
      element.style.transformOrigin = 'bottom left';
      element.style.transform = placement.scale < 0.999 ? `scale(${placement.scale})` : '';
    });

    setContentMinHeight(
      Math.max(
        contentBottom + CENTURY_VIEW_VERTICAL_PADDING_PX,
        minimumHeightPx
      )
    );
  }, [layoutRevision, minimumHeightPx, visibleSources, yearIncrements]);

  if (!visibleSources.length) {
    return (
      <div
        ref={hostRef}
        className="temporal-order-global-yearly-host"
        style={{ position: 'relative', minHeight: minimumHeightPx }}
      />
    );
  }

  return (
    <div
      ref={hostRef}
      className="temporal-order-global-yearly-host"
      style={{ position: 'relative', minHeight: contentMinHeight }}
    >
      {visibleSources.map((source) => (
        <div
          key={source.key}
          ref={(element) => {
            cardElementsRef.current[source.key] = element;
          }}
          data-temporal-order-global-card="true"
        >
          <TemporalEventCardRenderer
            data={{
              nodeId: source.nodeId,
              label: truncateTemporalOrderLabel(source.label, 54),
              content: source.content,
            }}
          />
        </div>
      ))}
    </div>
  );
};

const TemporalOrderContent: React.FC<TemporalOrderContentProps> = ({
  children,
  isCollapsed,
  lens,
  eventSources,
  globeLocations,
  yearIncrements,
  timelineLayout,
  auraGraphData,
  graph2DData,
  flowGraphData,
  onCreateTemporalSpaceAtTimePoint,
  onCaptureDraggedNode,
  onRetimeDraggedNodeAtTimePoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentHostRef = useRef<HTMLDivElement>(null);
  const centuryLayoutFrameRef = useRef<number | null>(null);
  const draggedTimelineNodeRef = useRef<DraggedNodeInfo | null>(null);
  const [contentHeight, setContentHeight] = useState(200);
  const [centuryLayoutRevision, setCenturyLayoutRevision] = useState(0);
  const [centuryTopInset, setCenturyTopInset] = useState(0);
  const [timelineHoverIndicator, setTimelineHoverIndicator] = useState<TemporalOrderHoverIndicatorState | null>(null);
  const isIdentityLens = lens === 'identity';
  const isCenturyViewLens = lens === 'centuryView';
  const isGlobalYearlyViewLens = lens === 'globalYearlyView';
  const isYearlyViewLens = lens === 'yearlyView' || isGlobalYearlyViewLens;
  const isYearIncrementLens = isCenturyViewLens || isYearlyViewLens;
  const isLinearLens = isIdentityLens || isYearIncrementLens;
  const isGlobeLens = lens === 'globeView';
  const isMap2DLens = lens === 'map2DView';
  const isAuraLens = lens === 'auraView';
  const isGraph2DLens = lens === 'graph2D';
  const isFlowGraphLens = lens === 'flowGraph';
  const isImmersiveGraphLens = isGlobeLens || isMap2DLens || isAuraLens || isGraph2DLens || isFlowGraphLens;
  const hasGraphNodes = eventSources.length > 0;
  const monthTicks = useMemo(() => buildTemporalOrderMonthTicks(yearIncrements), [yearIncrements]);
  const yearTopLookup = useMemo(
    () => new Map(yearIncrements.map((increment) => [increment.year, increment.topPx])),
    [yearIncrements]
  );
  const yearlyViewRange = useMemo(() => {
    if (!isYearlyViewLens) return null;

    const start = new Date();
    const end = new Date(start.getTime() + YEARLY_VIEW_RANGE_MS);
    return {
      startMs: start.getTime(),
      endMs: end.getTime(),
    };
  }, [isYearlyViewLens]);
  const centuryViewMinHeight = useMemo(() => {
    if (!yearIncrements.length) return 100;
    return Math.max(
      100,
      (yearIncrements[0]?.topPx ?? 0) + CENTURY_VIEW_VERTICAL_PADDING_PX
    );
  }, [yearIncrements]);

  const scheduleCenturyViewLayout = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (centuryLayoutFrameRef.current !== null) return;

    centuryLayoutFrameRef.current = window.requestAnimationFrame(() => {
      centuryLayoutFrameRef.current = null;
      setCenturyLayoutRevision((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && centuryLayoutFrameRef.current !== null) {
        window.cancelAnimationFrame(centuryLayoutFrameRef.current);
      }
    };
  }, []);

  // Track content height for the arrow
  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight((prev) =>
            prev === entry.contentRect.height ? prev : entry.contentRect.height
          );
        }
        scheduleCenturyViewLayout();
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [scheduleCenturyViewLayout]);

  useEffect(() => {
    const host = contentHostRef.current;
    const contentNode = host?.querySelector('.temporal-order-node-view-content') as HTMLElement | null;

    if (!isYearIncrementLens || !host || !contentNode) return;

    const wrapperNode =
      contentNode.children.length === 1 &&
      contentNode.firstElementChild instanceof HTMLElement &&
      contentNode.firstElementChild.hasAttribute('data-node-view-wrapper')
        ? contentNode.firstElementChild
        : null;
    const itemContainer = (wrapperNode instanceof HTMLElement ? wrapperNode : contentNode) as HTMLElement;
    const itemElements = Array.from(itemContainer.children) as HTMLElement[];

    if (!itemElements.length) return;

    // Embedded editors and maps can grow after first paint, so century view
    // needs to remeasure each card instead of relying on the initial layout pass.
    const resizeObserver = new ResizeObserver(() => {
      scheduleCenturyViewLayout();
    });

    itemElements.forEach((child) => {
      resizeObserver.observe(child);
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [isYearIncrementLens, scheduleCenturyViewLayout, timelineLayout]);

  useLayoutEffect(() => {
    const host = contentHostRef.current;
    const contentNode = host?.querySelector('.temporal-order-node-view-content') as HTMLElement | null;

    if (!host || !contentNode) return;

    const wrapperNode =
      contentNode.children.length === 1 &&
      contentNode.firstElementChild instanceof HTMLElement &&
      contentNode.firstElementChild.hasAttribute('data-node-view-wrapper')
        ? contentNode.firstElementChild
        : null;
    const itemContainer = (wrapperNode instanceof HTMLElement ? wrapperNode : contentNode) as HTMLElement;
    const itemElements = Array.from(itemContainer.children) as HTMLElement[];

    const resetCenturyViewStyles = () => {
      containerRef.current?.style.removeProperty('--temporal-order-century-timeline-width');
      setCenturyTopInset((prev) => (prev === 0 ? prev : 0));
      itemContainer.style.position = '';
      if (wrapperNode instanceof HTMLElement) {
        wrapperNode.style.marginTop = '';
        wrapperNode.style.removeProperty('zoom');
        wrapperNode.style.transformOrigin = '';
        wrapperNode.style.minHeight = '';
      }
      itemElements.forEach((child) => {
        child.style.marginTop = '';
        child.style.removeProperty('zoom');
        child.style.transformOrigin = '';
        child.style.transform = '';
        child.style.position = '';
        child.style.top = '';
        child.style.left = '';
        child.style.width = '';
        child.style.maxWidth = '';
        child.style.display = '';
        child.style.removeProperty('--temporal-order-century-cloud-opacity');
        child.removeAttribute('data-century-cloud');
      });
      itemContainer.style.minHeight = '';
      contentNode.style.minHeight = '';
    };

    if (!isYearIncrementLens || !timelineLayout.length || !itemElements.length) {
      resetCenturyViewStyles();
      return;
    }

    resetCenturyViewStyles();
    itemContainer.style.position = 'relative';

    const yearTopLookup = new Map(yearIncrements.map((increment) => [increment.year, increment.topPx]));
    const horizonEndYear = yearIncrements[yearIncrements.length - 1]?.year ?? new Date().getFullYear();
    const nowMs = Date.now();
    const itemCount = Math.min(itemElements.length, timelineLayout.length);
    const contentWidth = Math.max(host.clientWidth - 96, CENTURY_VIEW_MIN_EVENT_WIDTH_PX);
    const isTimelineItemVisible = (layoutItem: TemporalOrderTimelineLayoutItem | undefined) => {
      if (!layoutItem) return false;
      if (!isYearlyViewLens) return true;
      if (!layoutItem.date) return false;

      const dateMs = layoutItem.date.getTime();
      const rangeStartMs = yearlyViewRange?.startMs ?? nowMs;
      const rangeEndMs = yearlyViewRange?.endMs ?? (rangeStartMs + YEARLY_VIEW_RANGE_MS);
      return dateMs >= rangeStartMs && dateMs <= rangeEndMs;
    };
    const scheduledPlacements = timelineLayout
      .slice(0, itemCount)
      .map((layoutItem, index) => ({ index, layoutItem, child: itemElements[index] }))
      .filter((placement) => placement.layoutItem?.date && isTimelineItemVisible(placement.layoutItem));
    const unscheduledPlacements = timelineLayout
      .slice(0, itemCount)
      .map((layoutItem, index) => ({ index, layoutItem, child: itemElements[index] }))
      .filter((placement) => !placement.layoutItem?.date && !isYearlyViewLens);
    const visibleIndexes = new Set([
      ...scheduledPlacements.map((placement) => placement.index),
      ...unscheduledPlacements.map((placement) => placement.index),
    ]);
    for (let index = 0; index < itemCount; index += 1) {
      const child = itemElements[index];
      if (!child) continue;
      child.style.display = visibleIndexes.has(index) ? '' : 'none';
    }
    const hasUnscheduledItems = unscheduledPlacements.length > 0;
    const timelineWidth = contentWidth;
    containerRef.current?.style.setProperty('--temporal-order-century-timeline-width', `${timelineWidth}px`);
    const maxColumnsByWidth = Math.max(
      1,
      Math.min(
        scheduledPlacements.length || 1,
        Math.floor(
          (timelineWidth + CENTURY_VIEW_COLUMN_GAP_PX) /
            (CENTURY_VIEW_MIN_EVENT_WIDTH_PX + CENTURY_VIEW_COLUMN_GAP_PX)
        )
      )
    );
    const minimumScheduledColumnCount = scheduledPlacements.some(
      (placement) => placement.layoutItem?.specificity === 'someday'
    )
      ? Math.min(maxColumnsByWidth, TEMPORAL_ORDER_CENTURY_PANE_COUNT)
      : 1;
    const computeCardWidth = (columnCount: number) =>
      Math.max(
        Math.min(
          Math.floor(
            (timelineWidth - (columnCount - 1) * CENTURY_VIEW_COLUMN_GAP_PX) /
              Math.max(columnCount, 1)
          ),
          CENTURY_VIEW_MAX_EVENT_WIDTH_PX
        ),
        CENTURY_VIEW_MIN_EVENT_WIDTH_PX
      );
    const unscheduledColumnCount = hasUnscheduledItems
      ? Math.max(
          1,
          Math.min(
            unscheduledPlacements.length,
            Math.floor(
              (contentWidth + CENTURY_VIEW_COLUMN_GAP_PX) /
                (CENTURY_VIEW_UNSCHEDULED_COLUMN_MIN_WIDTH_PX + CENTURY_VIEW_COLUMN_GAP_PX)
            )
          )
        )
      : 1;
    const computeUnscheduledCardWidth = (scheduledCardWidth: number) =>
      hasUnscheduledItems
        ? clampNumber(
            Math.floor(
              (contentWidth - (unscheduledColumnCount - 1) * CENTURY_VIEW_COLUMN_GAP_PX) /
                Math.max(unscheduledColumnCount, 1)
            ),
            CENTURY_VIEW_UNSCHEDULED_COLUMN_MIN_WIDTH_PX,
            CENTURY_VIEW_UNSCHEDULED_COLUMN_MAX_WIDTH_PX
          )
        : scheduledCardWidth;

    const applyCenturyViewWidths = (scheduledCardWidth: number, unscheduledCardWidth: number) => {
      for (let index = 0; index < itemCount; index += 1) {
        const child = itemElements[index];
        const layoutItem = timelineLayout[index];
        const isUnscheduled = !layoutItem?.date;
        const resolvedWidth = isUnscheduled ? unscheduledCardWidth : scheduledCardWidth;
        child.style.width = `${resolvedWidth}px`;
        child.style.maxWidth = `${isUnscheduled ? CENTURY_VIEW_UNSCHEDULED_CARD_MAX_WIDTH_PX : CENTURY_VIEW_MAX_EVENT_WIDTH_PX}px`;
        if (isUnscheduled) {
          child.style.setProperty('--temporal-order-century-cloud-opacity', '0.74');
          child.setAttribute('data-century-cloud', 'true');
        }
      }
    };

    const buildMeasuredPlacements = () => scheduledPlacements.map(({ index, layoutItem, child }) => {
      const targetAnchorPx = getCenturyViewDateOffsetPx(
        layoutItem.date as Date,
        yearTopLookup,
        yearTopLookup.get(layoutItem.year ?? NaN) ?? CENTURY_VIEW_VERTICAL_PADDING_PX
      );
      const childHeight = child.getBoundingClientRect().height;
      const scale = getCenturyViewFutureEventScale(
        layoutItem.date as Date,
        nowMs,
        horizonEndYear
      );
      const yearKey = layoutItem.year !== null ? String(layoutItem.year) : null;
      const bandBottomPx = yearTopLookup.get(layoutItem.year ?? NaN) ?? targetAnchorPx;
      const bandTopPx =
        yearTopLookup.get((layoutItem.year ?? NaN) + 1) ??
        Math.max(CENTURY_VIEW_VERTICAL_PADDING_PX, bandBottomPx - 96);

      return {
        index,
        childHeight,
        scale,
        targetAnchorPx,
        yearKey,
        slotKey: layoutItem.slotKey ?? null,
        specificity: layoutItem.specificity ?? 'date',
        bandTopPx,
        bandBottomPx,
      };
    });

    let columnCount = clampNumber(
      Math.min(maxColumnsByWidth, Math.max(1, scheduledPlacements.length > 1 ? 2 : 1)),
      minimumScheduledColumnCount,
      maxColumnsByWidth
    );
    let cardWidth = computeCardWidth(columnCount);
    let unscheduledCardWidth = computeUnscheduledCardWidth(cardWidth);
    let placements = [] as ReturnType<typeof buildMeasuredPlacements>;

    for (let iteration = 0; iteration < maxColumnsByWidth; iteration += 1) {
      applyCenturyViewWidths(cardWidth, unscheduledCardWidth);
      placements = buildMeasuredPlacements();

      const requiredColumnCount = resolveTemporalOrderCenturyViewColumnCount(placements, timelineWidth);
      if (requiredColumnCount <= columnCount || columnCount >= maxColumnsByWidth) {
        break;
      }

      columnCount = Math.min(requiredColumnCount, maxColumnsByWidth);
      cardWidth = computeCardWidth(columnCount);
      unscheduledCardWidth = computeUnscheduledCardWidth(cardWidth);
    }

    cardWidth = computeCardWidth(columnCount);
    unscheduledCardWidth = computeUnscheduledCardWidth(cardWidth);
    applyCenturyViewWidths(cardWidth, unscheduledCardWidth);
    placements = buildMeasuredPlacements();
    const unscheduledMeasurements = unscheduledPlacements.map(({ index, child }) => ({
      index,
      childHeight: child.getBoundingClientRect().height,
      scale: CENTURY_VIEW_EVENT_BASE_SCALE,
    }));
    const {
      placements: resolvedUnscheduledPlacements,
      bandHeight: unscheduledBandHeight,
    } = buildTemporalOrderCenturyTopBandPlacements(
      unscheduledMeasurements,
      timelineWidth,
      unscheduledColumnCount,
      unscheduledCardWidth
    );
    const resolvedCenturyTopInset = hasUnscheduledItems
      ? unscheduledBandHeight + CENTURY_VIEW_UNSCHEDULED_GAP_PX
      : 0;

    setCenturyTopInset((prev) => (prev === resolvedCenturyTopInset ? prev : resolvedCenturyTopInset));

    const {
      placements: resolvedScheduledPlacements,
      contentBottom: scheduledContentBottom,
    } = buildTemporalOrderCenturyViewPlacements(
      placements,
      columnCount,
      cardWidth,
      timelineWidth
    );
    let contentBottom = scheduledContentBottom + resolvedCenturyTopInset;

    resolvedScheduledPlacements.forEach((placement) => {
      const child = itemElements[placement.index];
      if (!child) return;

      child.style.position = 'absolute';
      child.style.marginTop = '0px';
      child.style.top = `${placement.topPx + resolvedCenturyTopInset}px`;
      child.style.left = `${placement.leftPx}px`;
      child.style.transformOrigin = 'bottom left';
      child.style.transform = placement.scale < 0.999 ? `scale(${placement.scale})` : '';
    });

    unscheduledPlacements.forEach(({ child }, index) => {
      const placement = resolvedUnscheduledPlacements[index];
      if (!placement) return;

      child.style.position = 'absolute';
      child.style.marginTop = '0px';
      child.style.left = `${placement.leftPx}px`;
      child.style.top = `${placement.topPx}px`;
      child.style.transformOrigin = 'top left';
      child.style.transform = `scale(${CENTURY_VIEW_EVENT_BASE_SCALE})`;

      contentBottom = Math.max(contentBottom, placement.bottomPx + CENTURY_VIEW_ROW_GAP_PX);
    });

    for (let index = itemCount; index < itemElements.length; index += 1) {
      itemElements[index].style.marginTop = '0px';
    }

    const resolvedMinHeight = `${Math.max(
      contentBottom + CENTURY_VIEW_VERTICAL_PADDING_PX,
      centuryViewMinHeight + resolvedCenturyTopInset
    )}px`;
    itemContainer.style.minHeight = resolvedMinHeight;
    contentNode.style.minHeight = resolvedMinHeight;
  }, [
    centuryLayoutRevision,
    centuryViewMinHeight,
    contentHeight,
    isYearIncrementLens,
    isYearlyViewLens,
    timelineLayout,
    yearIncrements,
    yearlyViewRange,
  ]);

  const handleCenturyTimelineClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isYearIncrementLens || isCollapsed) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest('[data-temporal-space="true"]') ||
      target.closest('[data-temporal-space-node-view="true"]') ||
      target.closest('[data-temporal-order-global-card="true"]') ||
      target.closest('[data-temporal-order-node-view="true"] [contenteditable="true"]') ||
      target.closest('.node-overlay-grip') ||
      target.closest('[data-century-cloud="true"]') ||
      target.closest('button, input, textarea, a')
    ) {
      return;
    }

    const host = contentHostRef.current;
    const container = containerRef.current;
    if (!host || !container || !yearIncrements.length) return;

    const timelineWidthValue = Number.parseFloat(
      container.style.getPropertyValue('--temporal-order-century-timeline-width') || ''
    );
    if (!Number.isFinite(timelineWidthValue)) return;

    const hostRect = host.getBoundingClientRect();
    const timelineLeft = hostRect.left + TEMPORAL_ORDER_TIMELINE_LEFT_PADDING_PX;
    const timelineRight = timelineLeft + timelineWidthValue;

    if (event.clientX < timelineLeft || event.clientX > timelineRight) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rawTopPx = event.clientY - containerRect.top;
    if (rawTopPx < centuryTopInset) {
      return;
    }

    const offsetTopPx = rawTopPx - centuryTopInset;
    const horizontalRatio = clampNumber((event.clientX - timelineLeft) / Math.max(timelineWidthValue, 1), 0, 0.999);
    const { date, precision } = resolveCenturyViewClickSelection(
      offsetTopPx,
      horizontalRatio,
      yearIncrements,
      monthTicks
    );

    event.preventDefault();
    event.stopPropagation();
    onCreateTemporalSpaceAtTimePoint(buildTemporalOrderClickTimePointAttrs(date, precision));
  }, [
    centuryTopInset,
    isCollapsed,
    isYearIncrementLens,
    monthTicks,
    onCreateTemporalSpaceAtTimePoint,
    yearIncrements,
  ]);

  const resolveCenturyTimelineDropAttrs = useCallback((clientX: number, clientY: number) => {
    const host = contentHostRef.current;
    const container = containerRef.current;
    if (!host || !container || !yearIncrements.length) return null;

    const timelineWidthValue = Number.parseFloat(
      container.style.getPropertyValue('--temporal-order-century-timeline-width') || ''
    );
    if (!Number.isFinite(timelineWidthValue)) return null;

    const hostRect = host.getBoundingClientRect();
    const timelineLeft = hostRect.left + TEMPORAL_ORDER_TIMELINE_LEFT_PADDING_PX;
    const timelineRight = timelineLeft + timelineWidthValue;

    if (clientX < timelineLeft || clientX > timelineRight) {
      return null;
    }

    const containerRect = container.getBoundingClientRect();
    const rawTopPx = clientY - containerRect.top;
    if (rawTopPx < centuryTopInset) {
      return null;
    }

    const offsetTopPx = rawTopPx - centuryTopInset;
    const horizontalRatio = clampNumber((clientX - timelineLeft) / Math.max(timelineWidthValue, 1), 0, 0.999);
    const { date, precision } = resolveCenturyViewClickSelection(
      offsetTopPx,
      horizontalRatio,
      yearIncrements,
      monthTicks
    );

    if (precision === 'someday') {
      return null;
    }

    return buildTemporalOrderClickTimePointAttrs(date, precision);
  }, [centuryTopInset, monthTicks, yearIncrements]);

  const resolveCenturyTimelineHoverIndicator = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const host = contentHostRef.current;
    if (!container || !host) {
      return null;
    }

    const timelineWidthValue = Number.parseFloat(
      container.style.getPropertyValue('--temporal-order-century-timeline-width') || ''
    );
    if (!Number.isFinite(timelineWidthValue)) {
      return null;
    }

    const hostRect = host.getBoundingClientRect();
    const timelineLeft = hostRect.left + TEMPORAL_ORDER_TIMELINE_LEFT_PADDING_PX;
    const timelineRight = timelineLeft + timelineWidthValue;

    if (clientX < timelineLeft || clientX > timelineRight) {
      return null;
    }

    const containerRect = container.getBoundingClientRect();
    const rawTopPx = clientY - containerRect.top;
    if (rawTopPx < centuryTopInset) {
      return null;
    }

    const offsetTopPx = rawTopPx - centuryTopInset;
    const horizontalRatio = clampNumber((clientX - timelineLeft) / Math.max(timelineWidthValue, 1), 0, 0.999);
    const hoverMode = resolveCenturyViewHoverMode(horizontalRatio);
    const localLeftPx = clientX - containerRect.left;

    if (hoverMode === 'someday') {
      return {
        topPx: rawTopPx,
        leftPx: localLeftPx,
        label: 'Some day',
        mode: hoverMode,
      } satisfies TemporalOrderHoverIndicatorState;
    }

    const rawDate = resolveCenturyViewClickDate(offsetTopPx, yearIncrements);
    const snappedDate = snapCenturyViewHoverDate(rawDate, hoverMode);
    const snappedTopPx = getCenturyViewDateOffsetPx(
      snappedDate,
      yearTopLookup,
      offsetTopPx
    ) + centuryTopInset;

    return {
      topPx: snappedTopPx,
      leftPx: localLeftPx,
      label: formatCenturyViewHoverLabel(snappedDate, hoverMode),
      mode: hoverMode,
    } satisfies TemporalOrderHoverIndicatorState;
  }, [centuryTopInset, yearIncrements, yearTopLookup]);

  const handleCenturyTimelineDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isYearIncrementLens || isCollapsed) return;

    const draggedNode = onCaptureDraggedNode();
    if (!draggedNode || !hasRetimableTemporalOrderNodeJson(draggedNode.nodeJson as JSONContent)) {
      return;
    }

    if (!resolveCenturyTimelineDropAttrs(event.clientX, event.clientY)) {
      return;
    }

    draggedTimelineNodeRef.current = draggedNode;
    setTimelineHoverIndicator(resolveCenturyTimelineHoverIndicator(event.clientX, event.clientY));
  }, [isCollapsed, isYearIncrementLens, onCaptureDraggedNode, resolveCenturyTimelineDropAttrs, resolveCenturyTimelineHoverIndicator]);

  const handleCenturyTimelineDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isYearIncrementLens || isCollapsed) return;

    const draggedNode = draggedTimelineNodeRef.current;
    if (!draggedNode || !hasRetimableTemporalOrderNodeJson(draggedNode.nodeJson as JSONContent)) {
      return;
    }

    const hoverIndicator = resolveCenturyTimelineHoverIndicator(event.clientX, event.clientY);
    setTimelineHoverIndicator(hoverIndicator);

    if (!hoverIndicator) {
      return;
    }

    if (!resolveCenturyTimelineDropAttrs(event.clientX, event.clientY)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, [isCollapsed, isYearIncrementLens, resolveCenturyTimelineDropAttrs, resolveCenturyTimelineHoverIndicator]);

  const handleCenturyTimelineDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    draggedTimelineNodeRef.current = null;
    setTimelineHoverIndicator(null);
  }, []);

  const handleCenturyTimelineDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isYearIncrementLens || isCollapsed) return;

    const draggedNode = draggedTimelineNodeRef.current;
    draggedTimelineNodeRef.current = null;
    setTimelineHoverIndicator(null);

    if (!draggedNode || !hasRetimableTemporalOrderNodeJson(draggedNode.nodeJson as JSONContent)) {
      return;
    }

    const attrs = resolveCenturyTimelineDropAttrs(event.clientX, event.clientY);
    if (!attrs) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onRetimeDraggedNodeAtTimePoint(draggedNode, attrs);
  }, [isCollapsed, isYearIncrementLens, onRetimeDraggedNodeAtTimePoint, resolveCenturyTimelineDropAttrs]);

  const handleCenturyTimelineMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isYearIncrementLens || isCollapsed) {
      setTimelineHoverIndicator(null);
      return;
    }

    setTimelineHoverIndicator(resolveCenturyTimelineHoverIndicator(event.clientX, event.clientY));
  }, [isCollapsed, isYearIncrementLens, resolveCenturyTimelineHoverIndicator]);

  const handleCenturyTimelineMouseLeave = useCallback(() => {
    setTimelineHoverIndicator(null);
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={handleCenturyTimelineClick}
      onDragEnter={handleCenturyTimelineDragEnter}
      onDragOver={handleCenturyTimelineDragOver}
      onDragLeave={handleCenturyTimelineDragLeave}
      onDrop={handleCenturyTimelineDrop}
      onMouseMove={handleCenturyTimelineMouseMove}
      onMouseLeave={handleCenturyTimelineMouseLeave}
      style={{
        position: 'relative',
        minHeight: isCollapsed ? 48 : isYearIncrementLens ? centuryViewMinHeight + centuryTopInset : isLinearLens ? 100 : 480,
        paddingLeft: isLinearLens ? 8 : 0,
        borderRadius: isImmersiveGraphLens ? 16 : 0,
        overflow: isImmersiveGraphLens ? 'hidden' : 'visible',
      }}
    >
      {/* Temporal Arrow */}
      <TemporalArrow height={contentHeight} isCollapsed={isCollapsed || !isLinearLens} />

      {isYearIncrementLens && timelineHoverIndicator && (
        <>
          {timelineHoverIndicator.mode !== 'someday' && (
            <div
              aria-hidden="true"
              className="temporal-order-hover-line"
              style={{ top: timelineHoverIndicator.topPx }}
            />
          )}
          <div
            aria-hidden="true"
            className="temporal-order-hover-label"
            style={{
              top: timelineHoverIndicator.topPx,
              left: timelineHoverIndicator.leftPx,
            }}
          >
            {timelineHoverIndicator.label}
          </div>
        </>
      )}

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
            {isYearIncrementLens && (
              <TemporalOrderYearRail
                increments={yearIncrements}
                topOffsetPx={centuryTopInset}
              />
            )}
            <div
              ref={contentHostRef}
              className={`temporal-order-content-host ${isLinearLens ? 'is-linear' : 'is-graph-source'}${isYearIncrementLens ? ' is-year-increments' : ''}`}
            >
              {isGlobalYearlyViewLens ? (
                <TemporalOrderGlobalYearlyCards
                  eventSources={eventSources}
                  yearIncrements={yearIncrements}
                  yearlyViewRange={yearlyViewRange}
                  minimumHeightPx={centuryViewMinHeight + centuryTopInset}
                />
              ) : (
                children
              )}
            </div>

            <AnimatePresence>
              {(isGlobeLens || isMap2DLens || isAuraLens || isGraph2DLens || isFlowGraphLens) && (
                <motion.div
                  key={`temporal-order-graph-${lens}`}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.985 }}
                  transition={{ duration: 0.28 }}
                  className={
                    isAuraLens
                      ? "temporal-order-graph-layer is-edge-to-edge"
                      : isGlobeLens || isMap2DLens
                        ? "temporal-order-globe-layer is-edge-to-edge"
                        : "temporal-order-flow-layer is-edge-to-edge"
                  }
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
                  ) : isGlobeLens ? (
                    <TemporalOrderGlobeView
                      locations={globeLocations}
                    />
                  ) : isMap2DLens ? (
                    <TemporalOrder2DMapView
                      locations={globeLocations}
                    />
                  ) : isGraph2DLens ? (
                    <TemporalOrderForceGraph2D
                      graphData={graph2DData}
                    />
                  ) : (
                    <TemporalOrderQuantaFlowGraph
                      key={flowGraphData.signature}
                      initialNodes={flowGraphData.nodes}
                      initialEdges={flowGraphData.edges}
                      hideInsertToolbar
                      editableNodes={false}
                      showNodeFlowMenu={false}
                      showControls={false}
                      showBackground={false}
                      canvasBackground="transparent"
                    />
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
            attrs: {
              lens: 'identity',
            },
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
              const isYearIncrementLens =
                node.attrs.lens === 'centuryView' || node.attrs.lens === 'yearlyView' || node.attrs.lens === 'globalYearlyView';

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
                const opacity = isYearIncrementLens
                  ? getTemporalYearIncrementOpacity(distanceMs)
                  : getTemporalFadeOpacity(distanceMs);
                const filter = isYearIncrementLens
                  ? `brightness(${getTemporalYearIncrementBrightness(distanceMs)})`
                  : 'none';
                const distanceDays = Math.round(distanceMs / (1000 * 60 * 60 * 24));

                decorations.push(
                  Decoration.node(childPos, childPos + child.nodeSize, {
                    style: `opacity: ${opacity}; filter: ${filter}; transition: opacity 0.2s ease, filter 0.2s ease;`,
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
        if (
          lensAttr === 'globeView' ||
          lensAttr === 'map2DView' ||
          lensAttr === 'auraView' ||
          lensAttr === 'graph2D' ||
          lensAttr === 'flowGraph' ||
          lensAttr === 'identity' ||
          lensAttr === 'centuryView' ||
          lensAttr === 'yearlyView' ||
          lensAttr === 'globalYearlyView'
        ) {
          return lensAttr;
        }
        if (legacyTimeMode === 'nonLinear') {
          return 'graph2D';
        }
        return 'identity';
      })();
      const localEventSources = useMemo<TemporalOrderEventSource[]>(
        () => buildTemporalOrderEventSourcesFromNode(props.node),
        [props.node]
      );
      const [globalEventSources, setGlobalEventSources] = useState<TemporalOrderEventSource[]>([]);

      useEffect(() => {
        if (lens !== 'globalYearlyView') {
          setGlobalEventSources([]);
          return;
        }

        let cancelled = false;

        const loadGlobalEventSources = async () => {
          const userId = readTemporalOrderUserIdFromLocation();
          const roomNames = await listTemporalOrderUserRoomNames(userId);
          const loadedSources: TemporalOrderEventSource[] = [];

          for (const roomName of roomNames) {
            const content = await fetchTemporalOrderContentFromIndexedDB(roomName);
            if (!content) {
              continue;
            }

            try {
              const normalizedContent = normalizeTemporalOrderContentToDoc(content);
              const documentNode = props.editor.schema.nodeFromJSON(normalizedContent);
              loadedSources.push(...buildTemporalOrderEventSourcesFromNode(documentNode, roomName));
            } catch {
              continue;
            }
          }

          loadedSources.sort((left, right) => {
            if (left.dateMs !== null && right.dateMs !== null) {
              return right.dateMs - left.dateMs;
            }
            if (left.dateMs !== null) return -1;
            if (right.dateMs !== null) return 1;
            return left.label.localeCompare(right.label);
          });

          if (!cancelled) {
            setGlobalEventSources(loadedSources);
          }
        };

        loadGlobalEventSources();

        return () => {
          cancelled = true;
        };
      }, [lens, props.editor.schema]);

      const eventSources = lens === 'globalYearlyView' ? globalEventSources : localEventSources;
      const auraGraphData = useMemo(
        () => buildTemporalOrderAuraGraphData(eventSources),
        [eventSources]
      );
      const globeLocations = useMemo(
        () => buildTemporalOrderGlobeLocations(eventSources),
        [eventSources]
      );
      const graph2DData = useMemo(
        () => buildTemporalOrderForceGraph2DData(eventSources),
        [eventSources]
      );
      const flowGraphData = useMemo(
        () => buildTemporalOrderQuantaFlowGraphData(eventSources),
        [eventSources]
      );
      const timelineLayout = useMemo<TemporalOrderTimelineLayoutItem[]>(() => {
        if (lens === 'globalYearlyView') {
          return eventSources.map((source) => ({
            key: source.key,
            year: source.year,
            date: source.date,
            slotKey: source.slotKey,
            specificity: source.specificity,
          }));
        }

        const items: TemporalOrderTimelineLayoutItem[] = [];

        props.node.forEach((child, offset) => {
          const childQuantaId = (child.attrs as any)?.quantaId;
          const { date: earliestDate, specificity } = extractEarliestTemporalMetadataFromNode(child);
          const normalizedDate =
            earliestDate && !Number.isNaN(earliestDate.getTime())
              ? new Date(earliestDate.getTime())
              : null;
          items.push({
            key:
              typeof childQuantaId === 'string' && childQuantaId.trim()
                ? childQuantaId
                : `${child.type.name}-${offset}`,
            year: normalizedDate?.getUTCFullYear() ?? normalizedDate?.getFullYear() ?? null,
            date: normalizedDate,
            slotKey: normalizedDate
              ? `${normalizedDate.getUTCFullYear()}-${normalizedDate.getUTCMonth()}`
              : null,
            specificity,
          });
        });

        return items;
      }, [eventSources, lens, props.node]);
      const yearIncrements = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const isCompactYearLens = lens === 'yearlyView' || lens === 'globalYearlyView';
        return buildTemporalOrderYearIncrements(
          currentYear,
          isCompactYearLens ? currentYear + 1 : 2100,
          isCompactYearLens
            ? {
                minimumHeightPx: 1040,
              }
            : undefined
        );
      }, [lens]);
      const isImmersiveGraphLens =
        lens === 'globeView' || lens === 'map2DView' || lens === 'auraView' || lens === 'graph2D' || lens === 'flowGraph';

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

      const handleCreateTemporalSpaceAtTimePoint = useCallback(
        (attrs: TemporalOrderClickTimePointAttrs) => {
          const pos = props.getPos();
          if (typeof pos !== 'number') return;

          const insertPos = pos + 1;
          const temporalSpaceContent = {
            type: 'temporalSpace',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'timepoint',
                    attrs,
                  },
                  { type: 'text', text: ' ' },
                ],
              },
              {
                type: 'paragraph',
              },
            ],
          };

          props.editor.commands.focus();
          const temporalSpaceNode = props.editor.schema.nodeFromJSON(temporalSpaceContent);
          const firstParagraphNode = temporalSpaceNode.firstChild;
          const firstParagraphSize = firstParagraphNode?.nodeSize ?? 0;
          const cursorPos = insertPos + firstParagraphSize + 2;
          const { state, view } = props.editor;
          const tr = state.tr.insert(insertPos, temporalSpaceNode);

          tr.setSelection(TextSelection.create(tr.doc, cursorPos)).scrollIntoView();

          view.dispatch(tr);
        },
        [props.editor, props.getPos]
      );

      const handleRetimeDraggedNodeAtTimePoint = useCallback(
        (draggedNode: DraggedNodeInfo, attrs: TemporalOrderClickTimePointAttrs) => {
          const { from, to, nodeJson, nodeTypeName } = draggedNode;
          const { state, view } = props.editor;
          const currentNode = state.doc.nodeAt(from);

          if (!currentNode || currentNode.type.name !== nodeTypeName) {
            return false;
          }

          const updatedNodeJson = retimeTemporalOrderNodeJson(nodeJson as JSONContent, attrs);
          if (!updatedNodeJson) {
            return false;
          }

          const updatedNode = props.editor.schema.nodeFromJSON(updatedNodeJson);
          const tr = state.tr.replaceWith(from, to, updatedNode).scrollIntoView();
          view.dispatch(tr);
          return true;
        },
        [props.editor]
      );

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
              globeLocations={globeLocations}
              yearIncrements={yearIncrements}
              timelineLayout={timelineLayout}
              auraGraphData={auraGraphData}
              graph2DData={graph2DData}
              flowGraphData={flowGraphData}
              onCreateTemporalSpaceAtTimePoint={handleCreateTemporalSpaceAtTimePoint}
              onCaptureDraggedNode={handleDropZoneDragEnter}
              onRetimeDraggedNodeAtTimePoint={handleRetimeDraggedNodeAtTimePoint}
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
