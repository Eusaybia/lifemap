import React, { useEffect, useState, useRef } from "react";
import { Node as ProseMirrorNode, Fragment } from "prosemirror-model"
import { Editor, Node as TipTapNode, NodeViewProps, wrappingInputRule, JSONContent } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Group, GroupLenses } from "./Group";
import { ForceGraph3DData, ForceGraph3DFigure } from "./GlowNetworkExtension";
import './styles.scss';
import { motion, useMotionTemplate, useTransform, AnimatePresence } from "framer-motion";
import { offWhite } from "../Theme";
import { getSelectedNodeType } from "../../utils/utils";
import { DocumentAttributes, defaultDocumentAttributes } from "./DocumentAttributesExtension";
import { throttle } from 'lodash';
import { DragGrip } from "../components/DragGrip";
import { NodeOverlay } from "../components/NodeOverlay";
import {
  AuraSpec,
  areAurasEqual,
  blendWeightedAuras,
  readAuraFromAttrs,
  readTimepointAuraFromAttrs,
  sanitizeAura,
} from "../aura/AuraModel";

// ============================================================================
// GROUP ARCHITECTURE
// ============================================================================
// Groups are a fundamental unit for organizing content in the editor.
// There are two variants:
//
// 1. BLOCK GROUP (this file - GroupTipTapExtension)
//    - A TipTap Node that wraps block-level content
//    - Rendered as a card with a DragGrip component
//    - Identified by: data-group-node-view="true" and data-group-id="<uuid>"
//
// 2. INLINE SPAN GROUP (SpanGroupMark.ts)
//    - A TipTap Mark that wraps inline text
//    - Rendered as a highlighted span with a CSS pseudo-element grip
//    - Identified by: class="span-group" and data-span-group-id="<uuid>"
//
// Both types can participate in the connection system (GroupConnectionManager)
// which allows drawing arrows/relationships between any Group elements.
// ============================================================================

// Helper to generate unique group IDs (shared format with SpanGroupMark)
const generateGroupId = () => Math.random().toString(36).substring(2, 8);
const GROUP_NODE_BOX_SHADOW = `-1px 1px 3px -1px rgba(0, 0, 0, 0.24), -2px 2px 6px -2px rgba(0, 0, 0, 0.17), -3px 4px 10px -3px rgba(0, 0, 0, 0.11)`;
const truncateGlowLabel = (label: string, maxLength = 14) =>
  label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;

const prettifyNodeType = (typeName: string) =>
  typeName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const getGlowNodeLabel = (node: ProseMirrorNode, index: number) => {
  const text = node.textBetween(0, node.content.size, ' ', ' ').replace(/\s+/g, ' ').trim();
  if (text.length > 0) return truncateGlowLabel(text);
  return `${prettifyNodeType(node.type.name)} ${index + 1}`;
};

const buildGlowVisualisationData = (groupNode: ProseMirrorNode): ForceGraph3DData => {
  const children: ProseMirrorNode[] = [];
  groupNode.content.forEach((childNode) => {
    children.push(childNode);
  });

  const usedIds = new Set<string>();
  const nodes = children.map((childNode, index) => {
    const baseId = getGlowNodeLabel(childNode, index);
    let uniqueId = baseId;
    let suffix = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${baseId} ${suffix}`;
      suffix += 1;
    }
    usedIds.add(uniqueId);

    const fallbackTone = (index % 2 === 0 ? 'light' : 'dark') as 'light' | 'dark';
    const aura =
      readAuraFromAttrs(childNode.attrs as Record<string, unknown>) ??
      deriveAuraForNode(childNode);
    const tone = aura ? (aura.luminance < 420 ? 'dark' : 'light') : fallbackTone;

    return {
      id: uniqueId,
      group: index < Math.ceil(children.length / 2) ? 1 : 2,
      tone,
      ...(aura
        ? {
            color: aura.color,
            auraLuminance: aura.luminance,
            auraSize: aura.size,
          }
        : {}),
    };
  });

  if (nodes.length === 0) {
    nodes.push({ id: 'Empty group', group: 1, tone: 'light' });
  }

  // ── Constellation-style link generation ──
  // Real constellation maps are composed of many small, disconnected clusters
  // of 2-5 stars each, connected by simple angular shapes (chains, triangles,
  // L-shapes, zigzags). We partition the nodes into small groups and wire each
  // group internally with a sparse pattern, leaving gaps between groups so they
  // float apart like separate constellations in the night sky.

  const links: { source: string; target: string }[] = [];

  if (nodes.length <= 1) {
    return { nodes, links };
  }

  // Use a seeded-ish shuffle based on node count so the layout is stable
  // for the same content but looks organic
  const shuffled = [...nodes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (i * 7 + shuffled.length * 3) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Partition into small clusters of 2-4 nodes each
  const clusters: typeof nodes[] = [];
  let cursor = 0;
  const clusterSizes = [3, 2, 4, 2, 3, 5, 2, 3, 4, 2];
  let sizeIdx = 0;
  while (cursor < shuffled.length) {
    const size = Math.min(
      clusterSizes[sizeIdx % clusterSizes.length],
      shuffled.length - cursor
    );
    clusters.push(shuffled.slice(cursor, cursor + size));
    cursor += size;
    sizeIdx++;
  }

  // Assign a group index to each node based on its cluster
  clusters.forEach((cluster, clusterIdx) => {
    cluster.forEach((node) => {
      node.group = clusterIdx + 1;
    });
  });

  // Wire each cluster with a simple angular constellation pattern
  clusters.forEach((cluster) => {
    if (cluster.length === 1) return;

    if (cluster.length === 2) {
      links.push({ source: cluster[0].id, target: cluster[1].id });
      return;
    }

    // Primary chain through all nodes in the cluster
    for (let i = 0; i < cluster.length - 1; i++) {
      links.push({ source: cluster[i].id, target: cluster[i + 1].id });
    }

    // Add one cross-link to create a triangle/fork shape (not a closed loop)
    // This gives the angular, geometric feel of real constellations
    if (cluster.length >= 4) {
      links.push({ source: cluster[0].id, target: cluster[2].id });
    }
  });

  return { nodes, links };
};

const GROUP_AURA_DERIVED_META = "groupAuraDerived";
const GROUP_AURA_PLUGIN_KEY = new PluginKey("groupAuraUpdater");
const GROUP_AURA_DEPTH_FALLOFF = 0.85;

const getAuraSourceWeight = (aura: AuraSpec, depth: number) => {
  const sizeComponent = aura.size / 100;
  const luminanceComponent = aura.luminance / 1000;
  const baseWeight = Math.max(0.05, sizeComponent * 0.7 + luminanceComponent * 0.3);
  return baseWeight * Math.pow(GROUP_AURA_DEPTH_FALLOFF, Math.max(0, depth - 1));
};

const collectAuraSources = (
  node: ProseMirrorNode,
  depth: number,
  sources: Array<{ aura: AuraSpec; weight: number }>
) => {
  node.forEach((childNode) => {
    const nextDepth = depth + 1;

    if (childNode.type.name === "timepoint") {
      const aura = readTimepointAuraFromAttrs(childNode.attrs as Record<string, unknown>);
      if (aura) {
        sources.push({
          aura,
          weight: getAuraSourceWeight(aura, nextDepth),
        });
      }
    } else if (childNode.type.name === "hashtag" || childNode.type.name === "mention") {
      const aura = readAuraFromAttrs(childNode.attrs as Record<string, unknown>);
      if (aura) {
        sources.push({
          aura,
          weight: getAuraSourceWeight(aura, nextDepth),
        });
      }
    }

    if (childNode.childCount > 0) {
      collectAuraSources(childNode, nextDepth, sources);
    }
  });
};

const deriveAuraForNode = (node: ProseMirrorNode): AuraSpec | null => {
  const sources: Array<{ aura: AuraSpec; weight: number }> = [];
  collectAuraSources(node, 0, sources);
  return blendWeightedAuras(sources);
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    group: {
      setBackgroundColor: (options: {
        backgroundColor: string
      }) => ReturnType;
      setLens: (options: {
        lens: string;
      }) => ReturnType;
      setGroupLens: (options: {
        lens: string;
      }) => ReturnType;
    }
  }
}


export type InteractionType = "onHover" | "onClick" | "onSelectionChanged" | "onMarkChange" | "onTextChange"

// Determine whether this node should be hidden based on event type irrelevance or learning tag in call mode
export const shouldHideGroup = (
  groupNode: JSONContent,
  selectedEventType: DocumentAttributes['selectedEventLens'],
  selectedFocusLens: DocumentAttributes['selectedFocusLens']
): boolean => {
  let isIrrelevant = false;
  let isLearningGroup = false;
  let hasRelevantEventType = false; // Track if we find a relevant event type

  // Debug logs removed for performance - these were firing on every NodeView re-render
  // console.log("Selected event type from perspective of group: ", selectedEventType)
  // console.log("Selected focus lens from perspective of group: ", selectedFocusLens)

  type EventTypes = DocumentAttributes['selectedEventLens'];
  const eventTypes: EventTypes[] = ['wedding', 'birthday', 'corporate'];
  // Ensure selectedEventType is valid before filtering
  const validSelectedEventType = eventTypes.includes(selectedEventType) ? selectedEventType : defaultDocumentAttributes.selectedEventLens;
  const irrelevantEventTypes = eventTypes.filter((eventType) => eventType !== validSelectedEventType);

  groupNode.content?.forEach((childNode: JSONContent) => {
    if (childNode.type === 'paragraph') {
      childNode.content?.forEach((grandChildNode: JSONContent) => {
        if (grandChildNode.type === 'mention') {
          const label = grandChildNode.attrs?.label as string;
          if (!label) return; // Skip if label is missing

          // Check for Learning Tag
          if (label.includes('🎓 learning')) {
            isLearningGroup = true;
          }

          // Check for Event Type Relevance
          const labelParts = label.split(' ');
          let mentionEventType = "";

          if (labelParts.length === 1) {
            // Just the mention text
            mentionEventType = labelParts[0].toLowerCase();
          }
          else if (labelParts.length >= 2) {
            // Just the mention text, not the emoji
            mentionEventType = labelParts[1].toLowerCase();
          }

          // This handles the case where the node contains a mention of the selected event type
          if (mentionEventType === validSelectedEventType) {
            hasRelevantEventType = true;
            // Don't return here, need to check all children for learning tags too
          }

          if (irrelevantEventTypes.includes(mentionEventType as EventTypes)) {
            isIrrelevant = true;
            // Don't return here, need to check all children for relevance and learning tags
          }
        }
      })
    }
  });

  // If we found a relevant event type, the node is not irrelevant regardless of other mentions
  if (hasRelevantEventType) {
    isIrrelevant = false;
  }

  // Determine if the group should be hidden
  if (isIrrelevant) {
    return true; // Hide if irrelevant to the selected event type
  }
  if (selectedFocusLens === 'call-mode' && isLearningGroup) {
    return true; // Hide if it's a learning group and we are in call-mode
  }

  return false; // Show otherwise
};

// Finesse - refinement
// Refinement starts at 0 and maxes out at 100
const increaseRefinement = (interactionType: InteractionType, editor: Editor, nodeName: string) => {
  let refinementIncrement = 0

  switch (interactionType) {
    case "onHover":
      refinementIncrement = 0.01
      break;
    case "onClick":
      refinementIncrement = 1
      break;
    case "onSelectionChanged":
      refinementIncrement = 2
      break;
    case "onMarkChange":
      refinementIncrement = 5
      break;
    case "onTextChange":
      refinementIncrement = 5
      break;
    default:
      break;
  }

  // editor.commands.updateAttributes(nodeName, { refinement: node.attrs.refinement + refinementIncrement })
}

// TODO: Match for brackets with text in between
export const groupInputRegex = /{([^{}]*)}/;

export const GroupExtension = TipTapNode.create({
  name: "group",
  group: "block",
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  onUpdate() {
    // If there is a selection inside the node, don't update the node
    // Updating the node will cause the selection to disappear
    if (this.editor.state.selection) {
      return true
    }

    return false
  },
  addCommands() {
    return {
      setBackgroundColor: (attributes: { backgroundColor: string }) => ({ editor, state, dispatch }) => {

        const { selection } = state;

        const nodeType = getSelectedNodeType(editor)

        console.log('[setBackgroundColor] Called with:', attributes.backgroundColor);
        console.log('[setBackgroundColor] nodeType:', nodeType);
        console.log('[setBackgroundColor] selection.$from.pos:', selection.$from.pos);

        // Support background color for group and temporalSpace nodes
        if ((nodeType === "group" || nodeType === "temporalSpace") && dispatch) {
          // Use original position: selection.$from.pos
          const pos = selection.$from.pos;
          console.log('[setBackgroundColor] Dispatching setNodeAttribute at pos', pos, 'with backgroundColor:', attributes.backgroundColor);
          
          dispatch(state.tr.setNodeAttribute(pos, "backgroundColor", attributes.backgroundColor));
          return true;
        }
        console.log('[setBackgroundColor] Condition not met, returning false');
        return false
      },
      setLens: (attributes: { lens: string }) => ({ editor, state, dispatch }) => {
        const { selection } = state;
        const nodeType = getSelectedNodeType(editor)

        if (nodeType === "group" && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "lens", attributes.lens));
          return true;
        }
        return false
      },
      // Unique command name for Group to avoid conflicts with Portal's setLens
      setGroupLens: (attributes: { lens: string }) => ({ editor, state, dispatch }) => {
        const { selection } = state;
        const nodeType = getSelectedNodeType(editor)

        if (nodeType === "group" && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "lens", attributes.lens));
          return true;
        }
        return false
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-group="true"]',
        getAttrs: (element) => {
          // Only parse if this element has the group attribute AND NOT the temporal-space attribute
          if (typeof element === 'string') return false;
          const hasGroupAttr = element.getAttribute('data-group') === 'true';
          const hasTemporalSpaceAttr = element.getAttribute('data-temporal-space') === 'true';
          // Reject if it's a temporal space
          if (hasTemporalSpaceAttr) return false;
          return hasGroupAttr ? {} : false;
        },
      },
    ];
  },
  addAttributes() {
    return {
      // Unique identifier for this group, used for connections between groups
      // Format matches SpanGroupMark.groupId for consistency across Group types
      groupId: { 
        default: null,
        parseHTML: element => element.getAttribute('data-group-id'),
        renderHTML: attributes => {
          if (!attributes.groupId) return {};
          return { 'data-group-id': attributes.groupId };
        },
      },
      pathos: { default: 0 }, // the emotional content of the group and children - basically a colour mixture of all emotions within
      // experimental: density: amount of qi in this group (amount of people in this group)
      // experimental: rationality: is this statement based on reason (rather than "truth")? 1 + 1 = 3
      backgroundColor: { default: '#FFFFFF' },
      aura: {
        default: null,
        parseHTML: element => {
          const rawAura = element.getAttribute('data-aura');
          if (!rawAura) return null;

          try {
            return sanitizeAura(JSON.parse(rawAura));
          } catch {
            return null;
          }
        },
        renderHTML: attributes => {
          const aura = sanitizeAura(attributes.aura);
          if (!aura) return {};
          return { 'data-aura': JSON.stringify(aura) };
        },
      },
      lens: { default: "identity" as GroupLenses },
      collapsed: { default: false },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-group": "true" }, 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: groupInputRegex,
        type: this.type,
      })
    ]
  },
  onSelectionUpdate() {
    // Get the current node
    // const node = this.editor.state.selection.$head.parent;
  
    // // Check if the node is of the correct type
    // if (node.type.name === this.name) {
    //   // Calculate the new refinement value
    //   const refinementIncrement = calculateRefinementIncrement("onSelectionChanged");
    //   const newRefinement = node.attrs.refinement + refinementIncrement;
  
    //   // Update the refinement attribute
    //   this.editor.commands.updateAttributes(this.name, { refinement: newRefinement });
    // }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('groupUpdater'),
        view: () => ({
          update: (view, prevState) => {
            // Check if docAttrs changed
            const oldDocAttrs = prevState.doc.firstChild?.attrs;
            const newDocAttrs = view.state.doc.firstChild?.attrs;
            
            // Force re-render when event type or focus lens changes
            if (oldDocAttrs?.selectedEventLens !== newDocAttrs?.selectedEventLens || 
                oldDocAttrs?.selectedFocusLens !== newDocAttrs?.selectedFocusLens) {
              // Force re-render of all group nodes
              view.dispatch(view.state.tr.setMeta('forceGroupUpdate', true));
            }
          }
        })
      }),
      new Plugin({
        key: GROUP_AURA_PLUGIN_KEY,
        appendTransaction: (transactions, _oldState, newState) => {
          const hasDocChanges = transactions.some((transaction) => transaction.docChanged);
          if (!hasDocChanges) return null;
          if (transactions.some((transaction) => transaction.getMeta(GROUP_AURA_DERIVED_META))) {
            return null;
          }

          const transaction = newState.tr;
          let hasAuraUpdates = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'group') return true;

            const currentAura = readAuraFromAttrs(node.attrs as Record<string, unknown>);
            const derivedAura = deriveAuraForNode(node);

            if (areAurasEqual(currentAura, derivedAura)) {
              return true;
            }

            transaction.setNodeMarkup(
              pos,
              node.type,
              { ...node.attrs, aura: derivedAura },
              node.marks
            );
            hasAuraUpdates = true;
            return true;
          });

          if (!hasAuraUpdates) return null;

          transaction.setMeta(GROUP_AURA_DERIVED_META, true);
          return transaction;
        },
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const nodeViewRef = useRef<HTMLDivElement>(null);

      // Force re-render when docAttrs changes via ProseMirror plugin
      const [, forceUpdate] = React.useState({});
      
      React.useEffect(() => {
        const handleTransaction = ({ transaction }: any) => {
          if (transaction.getMeta('forceGroupUpdate')) {
            forceUpdate({});
          }
        };
        
        const editor = props.editor.on('transaction', handleTransaction);
        return () => {
          props.editor.off('transaction', handleTransaction);
        };
      }, [props.editor]);

      // Initialize with defaults to avoid command calls during render.
      const [docAttributes, setDocAttributes] = useState<DocumentAttributes>(defaultDocumentAttributes);
      // State to track if the node is centered
      const [isCentered, setIsCentered] = useState(false);

      // Fetch actual document attributes after mount.
      useEffect(() => {
        const timer = setTimeout(() => {
          try {
            // @ts-ignore - getDocumentAttributes may not exist in all editor contexts
            if (typeof props.editor.commands.getDocumentAttributes === 'function') {
              // @ts-ignore
              const attrs = props.editor.commands.getDocumentAttributes();
              if (attrs) {
                setDocAttributes(attrs);
                setIsCentered(attrs.selectedFocusLens === 'call-mode');
              }
            }
          } catch (e) {
            // Ignore errors if editor is not ready.
          }
        }, 0);

        return () => clearTimeout(timer);
      }, [props.editor]);

      // Effect to update docAttributes from localStorage changes
      useEffect(() => {
        const handleUpdate = (event: Event) => {
          // @ts-ignore
          const updatedAttributes = event.detail as DocumentAttributes;
          if (updatedAttributes) {
            setDocAttributes(updatedAttributes);
          }
        };
        window.addEventListener('doc-attributes-updated', handleUpdate);
        return () => {
          window.removeEventListener('doc-attributes-updated', handleUpdate);
        };
      }, []);

      // Effect to handle scroll listener for centerline intersection
      useEffect(() => {
        const nodeElement = nodeViewRef.current;
        if (!nodeElement || docAttributes.selectedFocusLens !== 'call-mode') {
          return; // No observer or state updates needed outside call-mode
        }

        const scrollParent = nodeElement.closest('.scrollview') as HTMLElement | null;

        const observer = new IntersectionObserver(
          ([entry]) => {
            setIsCentered(prev => prev === entry.isIntersecting ? prev : entry.isIntersecting);
          },
          {
            root: scrollParent,
            rootMargin: '-45% 0% -45% 0%',
            threshold: 0.0,
          }
        );

        const computeInitialCenter = () => {
          const rect = nodeElement.getBoundingClientRect();
          let topBoundary: number, bottomBoundary: number;
          if (scrollParent) {
            const parentRect = scrollParent.getBoundingClientRect();
            topBoundary = parentRect.top + parentRect.height * 0.45;
            bottomBoundary = parentRect.top + parentRect.height * 0.55;
          } else {
            const viewportHeight = window.innerHeight;
            topBoundary = viewportHeight * 0.45;
            bottomBoundary = viewportHeight * 0.55;
          }
          const isInitiallyCentered = rect.bottom > topBoundary && rect.top < bottomBoundary;
          setIsCentered(prev => prev === isInitiallyCentered ? prev : isInitiallyCentered);
        };

        // Use requestAnimationFrame to ensure DOM layout is complete
        requestAnimationFrame(() => {
          computeInitialCenter();
          // Additional fallback check after a short delay
          setTimeout(() => {
            computeInitialCenter();
          }, 50);
        });
        
        observer.observe(nodeElement);

        return () => {
          observer.disconnect();
        };
      }, [docAttributes.selectedFocusLens]);

      // Note: Glow effects (orange for unchecked todos, green for completed tasks)
      // are now handled by the Aura component which wraps all NodeOverlay children.
      // The Aura component scans node content for tags and applies appropriate glows.

      // Determine if the group should be hidden (display: none)
      const isHidden = shouldHideGroup(props.node.toJSON(), docAttributes.selectedEventLens, docAttributes.selectedFocusLens);

      // Determine overlay opacity for dimming
      const dimmingOpacity = (docAttributes.selectedFocusLens === 'call-mode' && !isCentered) ? 0.8 : 0;

      // Extract title from first heading or first text content for chip lens
      const getGroupTitle = () => {
        let title = '';
        props.node.content.forEach((child: any) => {
          if (title) return; // Already found a title
          if (child.type.name === 'heading') {
            child.content?.forEach((textNode: any) => {
              if (textNode.text) title += textNode.text;
            });
          } else if (child.type.name === 'paragraph' && !title) {
            child.content?.forEach((textNode: any) => {
              if (textNode.text && !title) title = textNode.text;
            });
          }
        });
        return title || 'Untitled';
      };

      const currentLens =
        props.node.attrs.lens === "glowVisualisation"
          ? "auraView"
          : props.node.attrs.lens;
      const isAuraLens = currentLens === "auraView";
      const glowVisualisationData = React.useMemo(
        () => buildGlowVisualisationData(props.node),
        [props.node]
      );
      
      // State and refs for chip preview - must be declared at top level (not conditionally)
      const [showChipPreview, setShowChipPreview] = useState(false);
      const chipRef = useRef<HTMLSpanElement>(null);
      const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });

      // Chip lens renderer - compact inline element matching .hashtag-mention style
      const renderChipLens = () => {
        const title = getGroupTitle();
        
        // Calculate position when showing preview - diagonal offset (down-right)
        const handleShowPreview = () => {
          if (chipRef.current) {
            const rect = chipRef.current.getBoundingClientRect();
            setPreviewPosition({
              top: rect.bottom + 12,
              left: rect.left + 24, // Offset to the right for diagonal effect
            });
          }
          setShowChipPreview(true);
        };
        
        const chipLayoutId = `chip-${props.node.attrs.quantaId}`;
        
        return (
          <NodeViewWrapper
            ref={nodeViewRef}
            data-group-node-view="true"
            style={{ 
              display: 'inline',
            }}
          >
            <AnimatePresence mode="wait">
              {!showChipPreview ? (
                <motion.span
                  ref={chipRef}
                  layoutId={chipLayoutId}
                  className="hashtag-mention"
                  style={{ paddingRight: 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleShowPreview();
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {title}
                  </span>
                  {/* Mini grip for FlowMenu - click to toggle */}
                  <span
                    data-drag-handle
                    contentEditable={false}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const pos = props.getPos();
                      if (typeof pos === 'number') {
                        const { selection } = props.editor.state;
                        const isSelected = selection.$from.pos === pos;
                        if (isSelected) {
                          props.editor.commands.blur();
                        } else {
                          props.editor.commands.setNodeSelection(pos);
                        }
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      marginLeft: 4,
                      padding: '2px 3px',
                      cursor: 'pointer',
                      borderRadius: 3,
                      verticalAlign: 'middle',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title="Toggle menu"
                  >
                    {[0, 1, 2].map((row) => (
                      <span key={row} style={{ display: 'flex', gap: 1.5 }}>
                        {[0, 1].map((col) => (
                          <span
                            key={col}
                            style={{
                              width: 2.5,
                              height: 2.5,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0, 0, 0, 0.35)',
                            }}
                          />
                        ))}
                      </span>
                    ))}
                  </span>
                </motion.span>
              ) : (
                // Placeholder to maintain inline flow
                <span style={{ display: 'inline-block', width: 0, height: 0 }} />
              )}
            </AnimatePresence>
            
            {/* Fixed position preview overlay with shared element transition */}
            <AnimatePresence>
              {showChipPreview && (
                <>
                  {/* Click-away area (transparent) */}
                  <div
                    onClick={() => setShowChipPreview(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 999,
                    }}
                  />
                  {/* Preview panel */}
                  <motion.div
                    layoutId={chipLayoutId}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                      position: 'fixed',
                      top: previewPosition.top,
                      left: previewPosition.left,
                      zIndex: 1000,
                      minWidth: 320,
                      maxWidth: 500,
                      maxHeight: '70vh',
                      overflow: 'visible',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Render group with proper styling */}
                    <Group
                      lens="identity"
                      quantaId={props.node.attrs.quantaId}
                      backgroundColor={props.node.attrs.backgroundColor}
                    >
                      {/* Close button inside the group */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowChipPreview(false);
                        }}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: '#666',
                          fontSize: 14,
                          fontWeight: 600,
                          transition: 'background 0.15s',
                          zIndex: 10,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        ✕
                      </div>
                      <NodeViewContent />
                    </Group>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </NodeViewWrapper>
        );
      };

      switch (currentLens) {
        case "chip":
          return renderChipLens();
        default:
          return (
            <NodeViewWrapper
              ref={nodeViewRef}
              data-group-node-view="true"
              style={{ scrollSnapAlign: 'start', overflow: 'visible' }}
            >
              {/* NodeOverlay provides the grip, shadow, and connection support */}
              <NodeOverlay
                nodeProps={props}
                nodeType="group"
                boxShadow={GROUP_NODE_BOX_SHADOW}
                padding={isAuraLens ? 0 : '20px'}
                style={{ display: isHidden ? 'none' : 'block' }}
                isPrivate={currentLens === 'private'}
              >
                {/* Note: Glow effects are now handled by Aura component via NodeOverlay */}
                <div
                  style={{
                    borderRadius: 10,
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  <Group
                    lens={currentLens}
                    quantaId={props.node.attrs.quantaId}
                    backgroundColor={props.node.attrs.backgroundColor}
                  >
                    {(() => {
                      switch (currentLens) {
                        case "identity":
                          return <NodeViewContent />;
                        case "hideUnimportantNodes":
                          return <div>Important Nodes Only (Pending)</div>;
                        case "private":
                          // Content still renders but overlay covers it in Group component
                          return <NodeViewContent />;
                        case "collapsed":
                          // Content is hidden by Group component when collapsed
                          return <NodeViewContent />;
                        case "auraView":
                          return (
                            <ForceGraph3DFigure
                              graphData={glowVisualisationData}
                              aspectRatio="7 / 3"
                              minHeight={220}
                              showNavHint={false}
                              fitPadding={0}
                              autoFitDelayMs={500}
                              edgeToEdge
                              fitZoomScale={0.62}
                            />
                          );
                        default:
                          return <NodeViewContent />;
                      }
                    })()}
                  </Group>

                  {/* Call-mode dimming overlay - dims non-centered nodes during call-mode */}
                  {/* This is separate from the Aura focus system which uses focus tags */}
                  <motion.div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'black',
                      borderRadius: 10,
                      pointerEvents: 'none',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: dimmingOpacity }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  />
                </div>
              </NodeOverlay>
            </NodeViewWrapper>
          );
      }
    });
  },
});
