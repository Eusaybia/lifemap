import React, { useEffect, useState, useRef } from "react";
import { Node as ProseMirrorNode, Fragment } from "prosemirror-model"
import { Editor, Node as TipTapNode, NodeViewProps, JSONContent, wrappingInputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { GroupLenses } from "./Group";
import './styles.scss';
import { motion, AnimatePresence } from "framer-motion";
import { offWhite } from "../Theme";
import { getSelectedNodeType } from "../../utils/utils";
import { DocumentAttributes, defaultDocumentAttributes } from "./DocumentAttributesExtension";
import { throttle } from 'lodash';
import { DragGrip } from "../components/DragGrip";

// ============================================================================
// Finesse Energy Glow Helper
// ============================================================================
// Detects finesse nodes and returns a glow style for the container
// Higher Energy = light glow (yang), Lower Energy = dark glow (yin)

export const getFinesseGlow = (node: ProseMirrorNode): string | null => {
  let glowStyle: string | null = null;
  
  node.descendants((childNode) => {
    if (childNode.type.name === 'finesse') {
      const finesseId = childNode.attrs.id as string;
      if (finesseId?.includes('higher-energy')) {
        // Strong Yang - bright yellow sun glow surrounding all sides
        glowStyle = '0 0 35px 10px rgba(255, 240, 50, 0.55), 0 0 70px 20px rgba(255, 250, 100, 0.3), 0 0 100px 30px rgba(255, 255, 150, 0.18)';
      } else if (finesseId?.includes('semi-higher-energy') && !glowStyle?.includes('255, 240')) {
        // Lesser Yang - soft white-grey glow
        glowStyle = '0 0 20px 5px rgba(240, 240, 245, 0.5), 0 0 40px 10px rgba(230, 230, 235, 0.3)';
      } else if (finesseId?.includes('semi-lower-energy') && !glowStyle) {
        // Lesser Yin - soft dark shadow
        glowStyle = '0 0 20px 5px rgba(0, 0, 0, 0.15), 0 0 40px 10px rgba(0, 0, 0, 0.1)';
      } else if (finesseId?.includes('lower-energy')) {
        // Strong Yin - deeper dark shadow surrounding all sides
        glowStyle = '0 0 30px 8px rgba(0, 0, 0, 0.25), 0 0 60px 15px rgba(0, 0, 0, 0.15)';
      }
    }
  });
  
  return glowStyle;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    temporalSpace: {
      setTemporalSpaceBackgroundColor: (options: {
        backgroundColor: string
      }) => ReturnType;
      setTemporalSpaceLens: (options: {
        lens: string;
      }) => ReturnType;
      insertTemporalSpace: () => ReturnType;
    }
  }
}

export type InteractionType = "onHover" | "onClick" | "onSelectionChanged" | "onMarkChange" | "onTextChange"

// Determine whether this node should be hidden based on event type irrelevance or learning tag in call mode
export const shouldHideTemporalSpace = (
  temporalSpaceNode: JSONContent,
  selectedEventType: DocumentAttributes['selectedEventLens'],
  selectedFocusLens: DocumentAttributes['selectedFocusLens']
): boolean => {
  let isIrrelevant = false;
  let isLearningTemporalSpace = false;
  let hasRelevantEventType = false;

  type EventTypes = DocumentAttributes['selectedEventLens'];
  const eventTypes: EventTypes[] = ['wedding', 'birthday', 'corporate'];
  const validSelectedEventType = eventTypes.includes(selectedEventType) ? selectedEventType : defaultDocumentAttributes.selectedEventLens;
  const irrelevantEventTypes = eventTypes.filter((eventType) => eventType !== validSelectedEventType);

  temporalSpaceNode.content?.forEach((childNode: JSONContent) => {
    if (childNode.type === 'paragraph') {
      childNode.content?.forEach((grandChildNode: JSONContent) => {
        if (grandChildNode.type === 'mention') {
          const label = grandChildNode.attrs?.label as string;
          if (!label) return;

          if (label.includes('🎓 learning')) {
            isLearningTemporalSpace = true;
          }

          const labelParts = label.split(' ');
          let mentionEventType = "";

          if (labelParts.length === 1) {
            mentionEventType = labelParts[0].toLowerCase();
          }
          else if (labelParts.length >= 2) {
            mentionEventType = labelParts[1].toLowerCase();
          }

          if (mentionEventType === validSelectedEventType) {
            hasRelevantEventType = true;
          }

          if (irrelevantEventTypes.includes(mentionEventType as EventTypes)) {
            isIrrelevant = true;
          }
        }
      })
    }
  });

  if (hasRelevantEventType) {
    isIrrelevant = false;
  }

  if (isIrrelevant) {
    return true;
  }
  if (selectedFocusLens === 'call-mode' && isLearningTemporalSpace) {
    return true;
  }

  return false;
};

// TemporalSpace can be inserted via:
// - Input rule: type "<text>" (angle brackets with text inside)
// - Slash menu: /temporal
// - FlowMenu

// Match for angle brackets with text in between: <some text>
export const temporalSpaceInputRegex = /<([^<>]*)>/;

export const TemporalSpaceExtension = TipTapNode.create({
  name: "temporalSpace",
  group: "block",
  content: "block*",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  priority: 999, // Lower than Paragraph (1000) so empty documents default to paragraph, not temporalSpace. Still higher than Group for correct parsing when copy/pasting.
  onUpdate() {
    if (this.editor.state.selection) {
      return true
    }
    return false
  },
  addCommands() {
    return {
      setTemporalSpaceBackgroundColor: (attributes: { backgroundColor: string }) => ({ editor, state, dispatch }) => {
        const { selection } = state;
        const nodeType = getSelectedNodeType(editor)

        if (nodeType === "temporalSpace" && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "backgroundColor", attributes.backgroundColor));
          return true;
        }
        return false
      },
      setTemporalSpaceLens: (attributes: { lens: string }) => ({ editor, state, dispatch }) => {
        const { selection } = state;
        const nodeType = getSelectedNodeType(editor)

        if (nodeType === "temporalSpace" && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "lens", attributes.lens));
          return true;
        }
        return false
      },
      insertTemporalSpace: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'temporalSpace',
            content: [{ type: 'paragraph' }],
          })
          .run()
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-temporal-space="true"]',
        getAttrs: (element) => {
          // Only parse if this element has the temporal-space attribute
          if (typeof element === 'string') return false;
          const hasAttr = element.getAttribute('data-temporal-space') === 'true';
          return hasAttr ? {} : false;
        },
      },
    ];
  },
  addAttributes() {
    return {
      pathos: { default: 0 },
      backgroundColor: { default: offWhite },
      lens: { default: "identity" as GroupLenses },
      collapsed: { default: false },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-temporal-space": "true" }, 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: temporalSpaceInputRegex,
        type: this.type,
      })
    ]
  },
  onSelectionUpdate() {
    // Placeholder for future selection update logic
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('temporalSpaceUpdater'),
        view: () => ({
          update: (view, prevState) => {
            const oldDocAttrs = prevState.doc.firstChild?.attrs;
            const newDocAttrs = view.state.doc.firstChild?.attrs;
            
            if (oldDocAttrs?.selectedEventLens !== newDocAttrs?.selectedEventLens || 
                oldDocAttrs?.selectedFocusLens !== newDocAttrs?.selectedFocusLens) {
              view.dispatch(view.state.tr.setMeta('forceTemporalSpaceUpdate', true));
            }
          }
        })
      })
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const nodeViewRef = useRef<HTMLDivElement>(null);

      const [, forceUpdate] = React.useState({});
      
      React.useEffect(() => {
        const handleTransaction = ({ transaction }: any) => {
          if (transaction.getMeta('forceTemporalSpaceUpdate')) {
            forceUpdate({});
          }
        };
        
        const editor = props.editor.on('transaction', handleTransaction);
        return () => {
          props.editor.off('transaction', handleTransaction);
        };
      }, [props.editor]);

      // Initialize with default values to avoid calling getDocumentAttributes during render
      // (which triggers flushSync and causes React errors)
      const [docAttributes, setDocAttributes] = useState<DocumentAttributes>(defaultDocumentAttributes);
      const [isCentered, setIsCentered] = useState(false);

      // Fetch actual document attributes after mount
      useEffect(() => {
        // Use setTimeout to defer the command call outside of React's render cycle
        const timer = setTimeout(() => {
          try {
            // @ts-ignore
            const attrs = props.editor.commands.getDocumentAttributes();
            if (attrs) {
              setDocAttributes(attrs);
              setIsCentered(attrs.selectedFocusLens === 'call-mode');
            }
          } catch (e) {
            // Ignore errors if editor is not ready
          }
        }, 0);
        return () => clearTimeout(timer);
      }, [props.editor]);

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

      useEffect(() => {
        const nodeElement = nodeViewRef.current;
        if (!nodeElement || docAttributes.selectedFocusLens !== 'call-mode') {
          return;
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

        requestAnimationFrame(() => {
          computeInitialCenter();
          setTimeout(() => {
            computeInitialCenter();
          }, 50);
        });
        
        observer.observe(nodeElement);

        return () => {
          observer.disconnect();
        };
      }, [docAttributes.selectedFocusLens]);

      let glowStyles: string[] = [`0px 0px 0px 0px rgba(0, 0, 0, 0)`];
      // Right-side only glow - using large X offset and inset to keep glow on right edge
      const orangeGlow = `80px 0 60px -20px hsla(30, 100%, 50%, 0.4)`;
      const greenGlow = `80px 0 60px -20px hsl(104, 64%, 45%, 0.5)`;
      let containsUncheckedTodo = false;
      let containsCheckItem = false;

      props.node.descendants((childNode) => {
        if (childNode.type.name === 'mention' && (childNode.attrs.label as string)?.includes('✅ complete')) {
          glowStyles.push(greenGlow);
        }
        if (childNode.type.name === 'taskItem') {
          containsCheckItem = true;
          if (!childNode.attrs.checked) {
            containsUncheckedTodo = true;
          }
        }
      });
      if (glowStyles.length > 1) glowStyles.splice(0, 1);
      if (containsUncheckedTodo) glowStyles.push(orangeGlow);
      else if (containsCheckItem) glowStyles.push(greenGlow);

      const isHidden = shouldHideTemporalSpace(props.node.toJSON(), docAttributes.selectedEventLens, docAttributes.selectedFocusLens);
      const dimmingOpacity = (docAttributes.selectedFocusLens === 'call-mode' && !isCentered) ? 0.8 : 0;

      const isCollapsed = props.node.attrs.lens === 'collapsed';

      return (
        <NodeViewWrapper
          ref={nodeViewRef}
          data-temporal-space-node-view="true"
          style={{ scrollSnapAlign: 'start', overflow: 'visible' }}
        >
          {/* Debug logs removed for performance */}
          <motion.div
            style={{
              borderRadius: 12,
              position: 'relative',
              display: isHidden ? 'none' : 'block',
              // Frosted glass effect - with subtle gradient for depth even on white
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 240, 245, 0.85) 50%, rgba(255, 255, 255, 0.9) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)', // Safari support
              // Multi-layer border for glass edge effect
              border: '1px solid rgba(200, 200, 210, 0.4)',
              // Complex shadow for glass depth: outer shadow + inner highlight + subtle inner shadow
              boxShadow: `
                0 4px 24px rgba(0, 0, 0, 0.08),
                0 1px 3px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.8),
                inset 0 -1px 0 rgba(0, 0, 0, 0.05),
                inset 1px 0 0 rgba(255, 255, 255, 0.4),
                inset -1px 0 0 rgba(0, 0, 0, 0.03)
              `,
              padding: isCollapsed ? '10px 20px' : '20px',
              margin: '8px 0px',
              minHeight: isCollapsed ? 48 : 20,
              overflow: 'visible',
            }}
            animate={{
              boxShadow: glowStyles.length > 1 
                ? `0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.05), ${glowStyles.join(',')}`
                : `0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.05)`,
            }}
            transition={{ duration: 0.5, ease: "circOut" }}
          >
            {/* 6-dot grip handle on the top right - clicking selects the node to show FlowMenu */}
            <DragGrip
              position="absolute-top-right"
              top={10}
              dotColor="#999"
              hoverBackground="rgba(0, 0, 0, 0.08)"
              onClick={(e) => {
                e.preventDefault();
                const pos = props.getPos();
                if (typeof pos === 'number') {
                  // Use requestAnimationFrame to ensure selection persists after other event handlers
                  requestAnimationFrame(() => {
                    props.editor.commands.setNodeSelection(pos);
                  });
                }
              }}
            />

            {/* Content */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {(() => {
                    switch (props.node.attrs.lens) {
                      case "identity":
                        return <NodeViewContent />;
                      case "hideUnimportantNodes":
                        return <div>Important Nodes Only (Pending)</div>;
                      default:
                        return <NodeViewContent />;
                    }
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dimming overlay */}
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
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});

export default TemporalSpaceExtension;

