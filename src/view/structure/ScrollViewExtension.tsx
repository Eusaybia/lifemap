import React, { useEffect, useState, useRef } from "react";
import { Node as ProseMirrorNode, Fragment } from "prosemirror-model"
import { Editor, Node as TipTapNode, NodeViewProps, wrappingInputRule, JSONContent } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { ScrollView, ScrollViewLenses } from "./ScrollView";
import './styles.scss';
import { motion, useMotionTemplate, useTransform } from "framer-motion";
import { offWhite } from "../Theme";
import { getSelectedNodeType } from "../../utils/utils";
import { DocumentAttributes, defaultDocumentAttributes } from "./DocumentAttributesExtension";
import { throttle } from 'lodash';
import { NodeOverlay } from "../components/NodeOverlay";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    scrollview: {
      setBackgroundColor: (options: {
        backgroundColor: string
      }) => ReturnType;
      setLens: (options: {
        lens: string;
      }) => ReturnType;
    }
  }
}

export type InteractionType = "onHover" | "onClick" | "onSelectionChanged" | "onMarkChange" | "onTextChange"

// Determine whether this node should be hidden based on event type irrelevance or learning tag in call mode
export const shouldHideScrollView = (
  scrollViewNode: JSONContent,
  selectedEventType: DocumentAttributes['selectedEventLens'],
  selectedFocusLens: DocumentAttributes['selectedFocusLens']
): boolean => {
  let isIrrelevant = false;
  let isLearningGroup = false;

  type EventTypes = DocumentAttributes['selectedEventLens'];
  const eventTypes: EventTypes[] = ['wedding', 'birthday', 'corporate'];
  // Ensure selectedEventType is valid before filtering
  const validSelectedEventType = eventTypes.includes(selectedEventType) ? selectedEventType : defaultDocumentAttributes.selectedEventLens;
  const irrelevantEventTypes = eventTypes.filter((eventType) => eventType !== validSelectedEventType);

  scrollViewNode.content?.forEach((childNode: JSONContent) => {
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
            mentionEventType = labelParts[0].toLowerCase();
          }
          else if (labelParts.length >= 2) {
            mentionEventType = labelParts[1].toLowerCase();
          }

          // This handles the case where the node contains a mention of the selected event type
          if (mentionEventType === validSelectedEventType) {
            isIrrelevant = false;
            return // Exit the inner loop early if relevant event type found
          }

          if (irrelevantEventTypes.includes(mentionEventType as EventTypes)) {
            isIrrelevant = true;
            // Don't return here, need to check all children for relevance and learning tags
          }
        }
      })
    }
  });

  // Determine if the scroll view should be hidden
  if (isIrrelevant) {
    return true; // Hide if irrelevant to the selected event type
  }
  if (selectedFocusLens === 'call-mode' && isLearningGroup) {
    return true; // Hide if it's a learning group and we are in call-mode
  }

  return false; // Show otherwise
};

// Match for | anything |
const REGEX_SCROLL_VIEW = /(^\|(.+?)\|)/;

export const ScrollViewExtension = TipTapNode.create({
  name: "scrollview",
  group: "block",
  content: "block*",
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

        if (nodeType === "scrollview" && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "backgroundColor", attributes.backgroundColor));
          return true; // Indicate that the command ran successfully
        }
        return false
      },
      setLens: (attributes: { lens: string }) => ({ editor, state, dispatch }) => {
        const { selection } = state;
        const nodeType = getSelectedNodeType(editor)

        if (nodeType === "scrollview" && dispatch) {
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
        tag: "div",
        attrs: {
          "data-scrollview": "true",
        },
      },
    ];
  },
  addAttributes() {
    return {
      pathos: { default: 0 }, // the emotional content of the scrollview and children
      backgroundColor: { default: offWhite },
      lens: { default: "identity" as ScrollViewLenses },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-scrollview": "true" }, 0];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: REGEX_SCROLL_VIEW,
        type: this.type,
        getAttributes: (match: any) => {
          return {};
        },
        editor: this.editor,
        handler: ({ state, range, match }: { state: any; range: { from: number; to: number }; match: RegExpMatchArray; }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;

          // Delete the trigger text
          tr.delete(start, end);

          // Insert the ScrollView with an empty paragraph inside
          const scrollViewNode = this.type.create(this.options.HTMLAttributes, [
            state.schema.nodes.paragraph.create()
          ]);

          tr.insert(start, scrollViewNode);
          tr.setSelection(state.selection.constructor.near(tr.doc.resolve(start + 2)));
        },
      } as any)
    ]
  },
  onSelectionUpdate() {
    // Similar to GroupExtension - placeholder for future refinement logic
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      // Force re-render when docAttrs changes via ProseMirror plugin
      const [, forceUpdate] = React.useState({});
      
      React.useEffect(() => {
        const handleTransaction = ({ transaction }: any) => {
          if (transaction.getMeta('forceGroupUpdate')) {
            forceUpdate({});
          }
        };
        
        props.editor.on('transaction', handleTransaction);
        return () => {
          props.editor.off('transaction', handleTransaction);
        };
      }, [props.editor]);

      const nodeViewRef = useRef<HTMLDivElement>(null);
      const overlayRef = useRef<HTMLDivElement>(null);

      // State for document attributes
      // @ts-ignore
      const [docAttributes, setDocAttributes] = useState<DocumentAttributes>(() => props.editor.commands.getDocumentAttributes());
      // State to track if the node is centered
      const [isCentered, setIsCentered] = useState(docAttributes.selectedFocusLens === 'call-mode');

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
          return; // Skip observer and state updates outside call-mode
        }

        const observer = new IntersectionObserver(
          ([entry]) => {
            setIsCentered(prev => prev === entry.isIntersecting ? prev : entry.isIntersecting);
          },
          {
            root: null,
            rootMargin: '-25% 0% -25% 0%',
            threshold: 0.0,
          }
        );

        const computeInitialCenter = () => {
          const rect = nodeElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const topBoundary = viewportHeight * 0.25;
          const bottomBoundary = viewportHeight * 0.75;
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

      // Determine if the scrollview should be hidden (display: none)
      const isHidden = shouldHideScrollView(props.node.toJSON(), docAttributes.selectedEventLens, docAttributes.selectedFocusLens);

      // Determine overlay opacity for dimming
      const dimmingOpacity = (docAttributes.selectedFocusLens === 'call-mode' && !isCentered) ? 0.8 : 0;

      return (
        <NodeViewWrapper
          ref={nodeViewRef}
          data-scrollview-node-view="true"
          style={{ scrollSnapAlign: 'start' }}
        >
          <NodeOverlay nodeProps={props} nodeType="scrollview">
            {/* Note: Glow effects are now handled by Aura component via NodeOverlay */}
            <div
              style={{
                borderRadius: 10,
                position: 'relative',
                display: isHidden ? 'none' : 'block',
              }}
            >
              <ScrollView
                lens={props.node.attrs.lens}
                quantaId={props.node.attrs.quantaId}
                backgroundColor={props.node.attrs.backgroundColor}
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
              </ScrollView>
              {/* Call-mode dimming overlay - dims non-centered nodes during call-mode */}
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
    });
  },
});