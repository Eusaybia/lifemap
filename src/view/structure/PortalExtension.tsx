import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  nodeInputRule,
} from "@tiptap/react";
import { Node } from "@tiptap/react";
import {
  Editor,
  JSONContent,
  generateHTML,
  isNodeSelection,
  isTextSelection,
  mergeAttributes,
} from "@tiptap/core";
import React, { useCallback, useEffect, useState } from "react";
import { Fragment, Node as ProseMirrorNode, Slice } from "prosemirror-model";
import { debounce } from "lodash";
import { DragGrip } from "../components/DragGrip";
import { Plugin, PluginKey, Transaction } from "prosemirror-state";
import { GroupLenses, Group } from "./Group";
import { getSelectedNodeType, logCurrentLens } from "../../utils/utils";
import { motion } from "framer-motion";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    portal: {
      setLens: (options: {
        lens: string;
      }) => ReturnType;
    }
  }
}

const REGEX_BLOCK_TILDE = /(^~(.+?)~)/;
const sharedBorderRadius = 15;

// Currently they are the same but in future they will diverge
type PortalLenses = GroupLenses

/**
 * Get JSON representation of a Quanta referenced by ID
 * @param quantaId - the quantaId to search for
 * @param doc - the ProseMirrorNode
 * @returns - JSON content (if quanta was found)
 */
const getReferencedQuantaJSON = (
  quantaId: string,
  doc: ProseMirrorNode
): JSONContent | null => {
  let node: ProseMirrorNode | null = null;

  doc.descendants((descendant, _pos, parent) => {
    if (descendant.type.name === "portal") {
      return false;
    }
    if (descendant.attrs.quantaId === quantaId && !node) {
      node = descendant;
    }
  });

  if (node) {
    const jsonContent: JSONContent = (node as ProseMirrorNode).toJSON();

    return jsonContent;
  }

  return null;
};

const inputFocused = { current: false };

const PortalExtension = Node.create({
  name: "portal",
  group: "block",
  content: "block*",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      id: {
        default: null,
      },
      referencedQuantaId: {
        default: undefined,
        parseHTML: (element) => {
          return element.getAttribute("data-referenced-quanta-id");
        },
      },
      lens: {
        default: "identity" satisfies PortalLenses,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div",
        attrs: {
          "data-portal": "true",
        },
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-portal": "true",
        "data-referenced-quanta-id": node.attrs.referencedQuantaId,
      }),
      0,
    ];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: REGEX_BLOCK_TILDE,
        type: this.type,
        getAttributes: (match) => {
          return { referencedQuantaId: match[2] || "" };
        },
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(
      (props: NodeViewProps) => {
        // On node instantiation, useState will draw from the node attributes
        // If the attributes are updated, this will re-render, therefore this state is always synced with the node attributes
        const [referencedQuantaId, setReferencedQuantaId] = useState(props.node.attrs.referencedQuantaId);
        const [showMode, setShowMode] = useState<'all' | 'important'>('all');
        const [filteredHtml, setFilteredHtml] = useState<string | null>(null);

        const portalContent = props.node.content.firstChild;

        // If the input is updated, this handler is called
        const handleReferencedQuantaIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          const newQuantaId = event.target.value;
          setReferencedQuantaId(newQuantaId);
          updateTranscludedContent(newQuantaId);

          props.updateAttributes({ referencedQuantaId: event.target.value });
        };

        const updateTranscludedContent = useCallback((referencedQuantaId: string) => {
          let referencedQuantaJSON = getReferencedQuantaJSON(referencedQuantaId, props.editor.state.doc);

          // Handle invalid referenced quanta id input
          if (!referencedQuantaId) {
            referencedQuantaJSON = {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "You need to enter a referenced quanta id, this field is currently empty.",
                },
              ],
            };
          } else if (referencedQuantaJSON === null) {
            // Couldn't find a quanta with that id, possibly invalid
            referencedQuantaJSON = {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Couldn't find referenced quanta. Are you sure the id you're using is a valid one?",
                },
              ],
            };
          }

          const pos = props.getPos();

          // Currently shouldn't support references to text, nor references to other portals
          if (!pos || referencedQuantaJSON.text || referencedQuantaJSON.type === "portal") return;

          // Get the current selection before updating the portal content, so we can restore it after the portal has been updated
          const initialSelection = props.editor.state.selection;

          // Preserve existing attributes
          const currentAttrs = props.node.attrs;

          // Replace the current portal (containing old referenced quanta content) with a new portal 
          // containing the updated referenced quanta content
          let chain = props.editor
            .chain()
            .setMeta("fromPortalNode", true)
            .setNodeSelection(pos)
            .deleteSelection()
            .insertContentAt(pos, {
              type: "portal",
              attrs: {
                id: `${referencedQuantaId}`,
                referencedQuantaId: referencedQuantaId,
                ...currentAttrs, // Preserve existing attributes
              },
              content: [referencedQuantaJSON],
            });

          // After updating the portal content, restore the original selection:
          // - If a node was selected, reselect that node at its position
          // - If text was selected, restore the text selection range from start to end position
          // This preserves the user's selection state after the portal update
          if (isNodeSelection(initialSelection)) {
            chain = chain.setNodeSelection(initialSelection.$from.pos);
          } else if (isTextSelection(initialSelection)) {
            chain = chain.setTextSelection({
              from: initialSelection.$from.pos,
              to: initialSelection.$to.pos,
            });
          }

          chain.run();
        }, [props.editor, props.getPos]);

        const handleEditorUpdate = ({ transaction }: { transaction: Transaction }) => {
          // Skip if there's no document change
          if (!transaction.docChanged) return;
          
          // Allow lens changes to trigger updates
          const isLensChange = transaction.getMeta("fromLensChange");
          const isPortalUpdate = transaction.getMeta("fromPortalNode");

          // Skip if it's a portal content update
          if (isPortalUpdate && !isLensChange) {
            return;
          }

          // Check if the referenced quanta content actually changed
          const oldContent = getReferencedQuantaJSON(referencedQuantaId, transaction.before);
          const newContent = getReferencedQuantaJSON(referencedQuantaId, transaction.doc);
          
          if (JSON.stringify(oldContent) === JSON.stringify(newContent) && !isLensChange) {
            return;
          }

          updateTranscludedContent(referencedQuantaId);
        };

        useEffect(() => {
          if (showMode !== 'important') {
            setFilteredHtml(null);
            return;
          }

          const portalContent = props.node.content.firstChild;
          if (!portalContent || portalContent.type.name !== 'group') {
            return;
          }

          const importantParagraphs: JSONContent[] = [];

          portalContent.content.forEach(paragraphNode => {
            if (paragraphNode.type.name !== 'paragraph') {
              return;
            }

            const lines: ProseMirrorNode[][] = [];
            let currentLine: ProseMirrorNode[] = [];

            paragraphNode.content.forEach(inlineNode => {
              if (inlineNode.type.name === 'hardBreak') {
                lines.push(currentLine);
                currentLine = [];
              } else {
                currentLine.push(inlineNode);
              }
            });
            lines.push(currentLine);

            const importantLinesContent: JSONContent[] = [];
            lines.forEach(line => {
              const hasImportant = line.some(
                n => n.type.name === 'mention' && (n.attrs.label as string)?.includes('⭐️ important')
              );
              if (hasImportant && line.length > 0) {
                line.forEach(n => importantLinesContent.push(n.toJSON()));
                importantLinesContent.push({ type: 'hardBreak' });
              }
            });

            if (importantLinesContent.length > 0) {
              importantLinesContent.pop(); // remove trailing hardBreak
              importantParagraphs.push({
                type: 'paragraph',
                attrs: paragraphNode.attrs,
                content: importantLinesContent,
              });
            }
          });
          
          const filteredDoc: JSONContent = {
            type: 'doc', // generateHTML requires a doc
            content: importantParagraphs
          };

          const html = generateHTML(filteredDoc, props.editor.options.extensions);
          setFilteredHtml(html);
        }, [showMode, props.node, props.editor.options.extensions]);

        useEffect(() => {
        // Update the transclusion if the document has changed
        // TODO: To optimise, make it only if the particular node or referencedQuantaId has changed
          props.editor.on("update", handleEditorUpdate);
        
          // Clean up the event listener when the component unmounts
          return () => {
            props.editor.off("update", handleEditorUpdate);
          };
        }, [props.editor, referencedQuantaId]);

        const checkForImportantMention = (node: any): boolean => {
          let hasImportantMention = false;
          
          node.descendants((descendant: any) => {
            if (descendant.type.name === 'mention' && 
                (descendant.attrs.label as string).includes('⭐️ important')) {
              hasImportantMention = true;
            }
          });
          
          return hasImportantMention;
        };

        // Get the current lens from node attributes
        const currentLens = props.node.attrs.lens as PortalLenses;
        const isPrivate = currentLens === 'private';
        const isPreview = currentLens === 'preview';

        return (
          <NodeViewWrapper>
            <div contentEditable={false}>
              <input
                type="text"
                value={referencedQuantaId}
                onFocus={() => {
                  inputFocused.current = true;
                }}
                onBlur={() => {
                  inputFocused.current = false;
                }}
                onChange={handleReferencedQuantaIdChange}
                style={{
                  border: "1.5px solid #34343430",
                  borderRadius: sharedBorderRadius,
                  outline: "none",
                  backgroundColor: "transparent",
                  width: `80px`,
                  position: "absolute",
                  zIndex: 1,
                }}
              />
            </div>
            <div
              style={{
                borderRadius: sharedBorderRadius,
                background: `#FFFFFF`,
                position: "relative",
                boxShadow: `inset 10px 10px 10px #bebebe,
                    inset -10px -10px 10px #FFFFFF99`,
                minHeight: 20,
                maxHeight: (isPreview || isPrivate) ? 100 : undefined,
                overflow: (isPreview || isPrivate) ? 'hidden' : undefined,
                padding: `11px 15px 11px 15px`,
                marginBottom: 10,
              }}
              contentEditable={false}
            >
              <DragGrip
                position="absolute-right"
                dotColor="#999"
                hoverBackground="rgba(0, 0, 0, 0.08)"
                onClick={() => {
                  const pos = props.getPos();
                  if (typeof pos === 'number') {
                    props.editor.commands.setNodeSelection(pos);
                  }
                }}
              />
              {/* Private lens overlay - truncated like preview with black background */}
              {isPrivate && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: '#000000',
                      borderRadius: sharedBorderRadius,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 20,
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    <span style={{ color: '#666', fontSize: 14 }}>Private</span>
                  </motion.div>
                  {/* Private lens fade gradient at bottom */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 40,
                      background: 'linear-gradient(to bottom, transparent, #000000)',
                      borderRadius: `0 0 ${sharedBorderRadius}px ${sharedBorderRadius}px`,
                      pointerEvents: 'none',
                      zIndex: 21,
                    }}
                  />
                </>
              )}
              {/* Preview lens fade gradient at bottom */}
              {isPreview && !isPrivate && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    background: 'linear-gradient(to bottom, transparent, #FFFFFF)',
                    borderRadius: `0 0 ${sharedBorderRadius}px ${sharedBorderRadius}px`,
                    pointerEvents: 'none',
                  }}
                />
              )}
              <select
                value={showMode}
                onChange={(e) => setShowMode(e.target.value as 'all' | 'important')}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  zIndex: 2,
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
                contentEditable={false}
              >
                <option value="all">Show all</option>
                <option value="important">Show only important</option>
              </select>

              <div style={{ display: showMode === 'important' ? 'none' : 'block' }}>
                <NodeViewContent node={props.node} />
              </div>

              {showMode === 'important' && portalContent && (
                <Group
                  lens="identity"
                  quantaId={portalContent.attrs.quantaId}
                  backgroundColor={portalContent.attrs.backgroundColor}
                >
                  <div
                    className="ProseMirror"
                    dangerouslySetInnerHTML={{ __html: filteredHtml ?? '' }}
                  />
                </Group>
              )}
            </div>
          </NodeViewWrapper>
        );
      },
    );
  },
  addCommands() {
    return {
      setLens: (attributes: { lens: string }) => ({ editor, state, dispatch }) => {
        const { selection } = state;
        const pos = selection.$from.pos;
        const node = state.doc.nodeAt(pos);
        
        if (node && node.type.name === "portal" && dispatch) {

          const tr = state.tr
            .setMeta("fromLensChange", true)
            .setNodeMarkup(
              pos,
              null,
              {
                ...node.attrs,
                lens: attributes.lens
              }
            );
          
          dispatch(tr);
          
          return true;
        }
        
        return false;
      },
    };
  },
});

export { PortalExtension };
