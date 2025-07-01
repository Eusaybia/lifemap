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
          return true; // Indicate that the command ran successfully
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
        getAttributes: (match) => {
          return {};
        },
        editor: this.editor,
        handler: ({ state, range, match }) => {
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
      })
    ]
  },
  onSelectionUpdate() {
    // Similar to GroupExtension - placeholder for future refinement logic
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const nodeViewRef = useRef<HTMLDivElement>(null);
      const overlayRef = useRef<HTMLDivElement>(null);

      // State for document attributes
      // @ts-ignore
      const [docAttributes, setDocAttributes] = useState<DocumentAttributes>(() => props.editor.commands.getDocumentAttributes());

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
        const overlayElement = overlayRef.current;
        if (!nodeElement || !overlayElement) return;

        // A function to set opacity directly on the DOM element
        const setDimmed = (dim: boolean) => {
          overlayElement.style.transition = 'opacity 0.2s ease-in-out';
          overlayElement.style.opacity = dim ? '0.8' : '0';
        };

        if (docAttributes.selectedFocusLens !== 'call-mode') {
          setDimmed(false);
          return; // No observer needed
        }

        const observer = new IntersectionObserver(
          ([entry]) => {
            setDimmed(!entry.isIntersecting);
          },
          {
            root: null,
            rootMargin: '-25% 0% -25% 0%',
            threshold: 0.0,
          }
        );

        // Perform an initial synchronous check to prevent flash of dimmed content
        const rect = nodeElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const topBoundary = viewportHeight * 0.25;
        const bottomBoundary = viewportHeight * 0.75;
        setDimmed(!(rect.bottom > topBoundary && rect.top < bottomBoundary));

        observer.observe(nodeElement);

        return () => {
          observer.disconnect();
        };
      }, [docAttributes.selectedFocusLens]);

      let glowStyles: string[] = [`0px 0px 0px 0px rgba(0, 0, 0, 0)`];
      const orangeGlow = `0 0 100px 40px hsla(30, 100%, 50%, 0.3)`;
      const greenGlow = `0 0 100px 40px hsl(104, 64%, 45%, 0.4)`;
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

      // Determine if the scrollview should be hidden (display: none)
      const isHidden = shouldHideScrollView(props.node.toJSON(), docAttributes.selectedEventLens, docAttributes.selectedFocusLens);

      // Determine strip color based on completion state
      let stripColor = 'transparent';
      if (containsUncheckedTodo) {
        stripColor = '#ff4444'; // Red for uncompleted
      } else if (containsCheckItem || glowStyles.some(style => style.includes('hsl(104'))) {
        stripColor = '#44aa44'; // Green for completed
      }

      return (
        <NodeViewWrapper
          ref={nodeViewRef}
          data-scrollview-node-view="true"
          style={{ scrollSnapAlign: 'start' }}
        >
          <motion.div
            style={{
              borderRadius: 10,
              position: 'relative',
              display: isHidden ? 'none' : 'block',
              marginLeft: '8px',
            }}
            animate={{
              boxShadow: glowStyles.join(','),
            }}
            transition={{ duration: 0.5, ease: "circOut" }}
          >
            <motion.div
              style={{
                position: 'absolute',
                left: '-8px',
                top: 0,
                bottom: 0,
                width: '8px',
                pointerEvents: 'none',
              }}
              initial={{
                backgroundColor: 'transparent',
              }}
              animate={{
                backgroundColor: stripColor,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
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
            <motion.div
              ref={overlayRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'black',
                borderRadius: 10,
                pointerEvents: 'none',
                opacity: 0,
              }}
            />
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});