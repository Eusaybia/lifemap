import React, { useEffect, useState, useRef } from "react";
import { Node as ProseMirrorNode, Fragment } from "prosemirror-model"
import { Editor, Node as TipTapNode, NodeViewProps, wrappingInputRule, JSONContent } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Group, GroupLenses } from "./Group";
import './styles.scss';
import { motion, useMotionTemplate, useTransform } from "framer-motion";
import { offWhite } from "../Theme";
import { getSelectedNodeType } from "../../utils/utils";
import { DocumentAttributes, defaultDocumentAttributes } from "./DocumentAttributesExtension";
import { throttle } from 'lodash';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    group: {
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
export const shouldHideGroup = (
  groupNode: JSONContent,
  selectedEventType: DocumentAttributes['selectedEventLens'],
  selectedFocusLens: DocumentAttributes['selectedFocusLens']
): boolean => {
  let isIrrelevant = false;
  let isLearningGroup = false;
  let hasRelevantEventType = false; // Track if we find a relevant event type

  console.log("Selected event type from perspective of group: ", selectedEventType)
  console.log("Selected focus lens from perspective of group: ", selectedFocusLens)

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

        if (nodeType === "group" && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "backgroundColor", attributes.backgroundColor));
          return true; // Indicate that the command ran successfully
        }
        return false
      },
      setLens: (attributes: { lens: string }) => ({ editor, state, dispatch }) => {

        const { selection } = state;

        const nodeType = getSelectedNodeType(editor)

        if (nodeType === "group" && dispatch) {
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
          "data-group": "true",
        },
      },
    ];
  },
  addAttributes() {
    return {
      pathos: { default: 0 }, // the emotional content of the group and children - basically a colour mixture of all emotions within
      // experimental: density: amount of qi in this group (amount of people in this group)
      // experimental: rationality: is this statement based on reason (rather than "truth")? 1 + 1 = 3
      backgroundColor: { default: offWhite },
      lens: { default: "identity" as GroupLenses },
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
      })
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

      let glowStyles: string[] = [`0px 0px 0px 0px rgba(0, 0, 0, 0)`];
      const orangeGlow = `0 0 100px 40px hsla(30, 100%, 50%, 0.3)`;
      const greenGlow = `0 0 100px 40px hsl(104, 64%, 45%, 0.4)`;
      let containsUncheckedTodo = false;
      let containsCheckItem = false;
      let hasConfusionHighlight = false;
      let hasClarityHighlight = false;

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
        // Check for confusion highlight (grey)
        if (childNode.type.name === 'text' && childNode.marks) {
          childNode.marks.forEach((mark) => {
            if (mark.type.name === 'highlight' && mark.attrs.color === 'var(--tt-color-highlight-gray)') {
              hasConfusionHighlight = true;
            }
            if (mark.type.name === 'highlight' && mark.attrs.color === 'var(--tt-color-clarity)') {
              hasClarityHighlight = true;
            }
          });
        }
      });
      if (glowStyles.length > 1) glowStyles.splice(0, 1);
      if (containsUncheckedTodo) glowStyles.push(orangeGlow);
      else if (containsCheckItem) glowStyles.push(greenGlow);

      // Determine if the group should be hidden (display: none)
      const isHidden = shouldHideGroup(props.node.toJSON(), docAttributes.selectedEventLens, docAttributes.selectedFocusLens);

      // Determine overlay opacity for dimming
      const dimmingOpacity = (docAttributes.selectedFocusLens === 'call-mode' && !isCentered) ? 0.8 : 0;

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
          data-group-node-view="true"
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
                top: '10px',
                bottom: '10px',
                width: '8px',
                borderRadius: '2px',
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
            <Group
              lens={props.node.attrs.lens}
              quantaId={props.node.attrs.quantaId}
              backgroundColor={props.node.attrs.backgroundColor}
              hasConfusionHighlight={hasConfusionHighlight}
              hasClarityHighlight={hasClarityHighlight}
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
            </Group>
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
