import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Node as ProseMirrorNode, Fragment } from "prosemirror-model";
import { Node as TipTapNode, NodeViewProps, JSONContent, wrappingInputRule } from "@tiptap/core";
import { Plugin, PluginKey, Transaction, EditorState } from "prosemirror-state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import { offWhite } from "../Theme";
import { NodeOverlay } from "../components/NodeOverlay";
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

/**
 * Sorts child nodes by their earliest TimePointMention date.
 * Nodes with dates are sorted reverse-chronologically (newest first for top-to-bottom display).
 * This means: TOP = FUTURE (newer), BOTTOM = PAST (older).
 * Nodes without dates are placed at the end (bottom).
 * 
 * ARCHITECTURE: We sort DESCENDING (newest first) because TipTap's NodeViewContent
 * renders children as a single block, so flex-direction tricks don't work.
 * The first item in the DOM appears at the top, so newest must come first.
 * 
 * @param children - Array of child JSON content
 * @param schema - ProseMirror schema for node creation
 * @returns Sorted array of children (newest first)
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

  // Sort: nodes with dates come first (newest to oldest), then nodes without dates
  // Newest at top (start of array) for top-to-bottom visual display
  return withDates
    .sort((a, b) => {
      if (a.date && b.date) {
        // DESCENDING: newer dates first (larger timestamp first)
        return b.date.getTime() - a.date.getTime();
      }
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return a.originalIndex - b.originalIndex;
    })
    .map(item => item.child);
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
  isCollapsed: boolean;
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
const DropZone: React.FC<DropZoneProps> = ({ onDrop, onDragEnter, isCollapsed }) => {
  const [isDragOver, setIsDragOver] = useState(false);
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

  return (
    <motion.div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      initial={false}
      animate={{
        backgroundColor: isDragOver ? 'rgba(100, 149, 237, 0.15)' : 'rgba(100, 100, 110, 0.03)',
        borderColor: isDragOver ? 'rgba(100, 149, 237, 0.5)' : 'rgba(100, 100, 110, 0.15)',
        scale: isDragOver ? 1.01 : 1,
      }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '24px 16px',
        marginBottom: 12,
        borderRadius: 10,
        border: '2px dashed',
        cursor: 'default',
        userSelect: 'none',
        minHeight: 60,
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
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {isDragOver ? 'Release to move here' : 'Drop to add to timeline'}
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
  backgroundColor?: string;
  onDropZoneDrop: (draggedNode: DraggedNodeInfo | null) => void;
  onDropZoneDragEnter: () => DraggedNodeInfo | null;
}

const TemporalOrderContent: React.FC<TemporalOrderContentProps> = ({
  children,
  isCollapsed,
  backgroundColor = '#FFFFFF',
  onDropZoneDrop,
  onDropZoneDragEnter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(200);

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
        minHeight: isCollapsed ? 48 : 100,
        paddingLeft: 8, // Space for the arrow
      }}
    >
      {/* Temporal Arrow */}
      <TemporalArrow height={contentHeight} isCollapsed={isCollapsed} />

      {/* Drop Zone at the top */}
      <DropZone onDrop={onDropZoneDrop} onDragEnter={onDropZoneDragEnter} isCollapsed={isCollapsed} />

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              // ARCHITECTURE: Children are sorted DESCENDING (newest first) in the
              // ProseMirror document, so normal column display shows future at top.
              // We don't use column-reverse because NodeViewContent renders as a single block.
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {children}
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
        const { selection } = state;
        const node = state.doc.nodeAt(selection.from);
        
        if (node?.type.name === "temporalOrder" && dispatch) {
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
    const extensionThis = this;

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
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const isCollapsed = props.node.attrs.collapsed;
      const backgroundColor = props.node.attrs.backgroundColor || '#FFFFFF';

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
        if (selection && 'node' in selection && selection.node) {
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

          // Wrap non-temporalSpace nodes in a temporalSpace for consistency
          let contentToInsert: any;
          if (nodeTypeName === 'temporalSpace') {
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

      return (
        <NodeViewWrapper
          data-temporal-order-node-view="true"
          style={{ overflow: 'visible' }}
        >
          {/* ARCHITECTURE: TemporalOrder uses NodeOverlay for consistent grip system
              and connection support, matching TemporalSpace and Group patterns. */}
          <NodeOverlay
            nodeProps={props}
            nodeType="temporalOrder"
            boxShadow={`
              0 4px 24px rgba(0, 0, 0, 0.1),
              0 1px 3px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.9)
            `}
            borderRadius={16}
            padding="24px 20px 24px 32px"
            backgroundColor="rgba(250, 250, 252, 0.95)"
          >
            <TemporalOrderContent
              isCollapsed={isCollapsed}
              backgroundColor={backgroundColor}
              onDropZoneDrop={handleDropZoneDrop}
              onDropZoneDragEnter={handleDropZoneDragEnter}
            >
              <NodeViewContent />
            </TemporalOrderContent>
          </NodeOverlay>
        </NodeViewWrapper>
      );
    });
  },
});

export default TemporalOrderExtension;
