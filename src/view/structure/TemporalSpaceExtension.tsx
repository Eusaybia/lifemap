import React, { useEffect, useState, useRef } from "react";
import { Node as ProseMirrorNode, Fragment } from "prosemirror-model"
import { Editor, Node as TipTapNode, NodeViewProps, JSONContent } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { GroupLenses } from "./Group";
import './styles.scss';
import { motion, AnimatePresence } from "framer-motion";
import { offWhite } from "../Theme";
import { getSelectedNodeType } from "../../utils/utils";
import { DocumentAttributes, defaultDocumentAttributes } from "./DocumentAttributesExtension";
import { throttle } from 'lodash';

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

// TemporalSpace can be inserted via slash menu (/temporal) or FlowMenu
// No input rule to avoid conflicts with task list checkbox syntax [ ]

export const TemporalSpaceExtension = TipTapNode.create({
  name: "temporalSpace",
  group: "block",
  content: "block*",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
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
        tag: "div",
        attrs: {
          "data-temporal-space": "true",
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
  // No input rules - use slash menu (/temporal) or FlowMenu to insert
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

      // @ts-ignore
      const [docAttributes, setDocAttributes] = useState<DocumentAttributes>(() => props.editor.commands.getDocumentAttributes());
      const [isCentered, setIsCentered] = useState(docAttributes.selectedFocusLens === 'call-mode');

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

      const isCollapsed = props.node.attrs.collapsed;

      return (
        <NodeViewWrapper
          ref={nodeViewRef}
          data-temporal-space-node-view="true"
          style={{ scrollSnapAlign: 'start' }}
        >
          <motion.div
            style={{
              borderRadius: 10,
              position: 'relative',
              display: isHidden ? 'none' : 'block',
              border: '2px solid #c0c0c0',
              backgroundColor: 'transparent',
              padding: isCollapsed ? '10px 20px' : '20px',
              margin: '8px 0px',
              minHeight: isCollapsed ? 48 : 20,
              overflow: 'hidden',
            }}
            animate={{
              boxShadow: glowStyles.join(','),
            }}
            transition={{ duration: 0.5, ease: "circOut" }}
          >
            {/* Collapse toggle */}
            <motion.div
              onClick={(e) => {
                e.stopPropagation();
                props.updateAttributes({ collapsed: !isCollapsed });
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                padding: 4,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <path
                  d="M3 6L8 11L13 6"
                  stroke="#888"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.div>

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

