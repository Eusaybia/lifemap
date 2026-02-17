import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { Extension } from '@tiptap/core';

export const HighlightImportantLinePluginKey = new PluginKey(
  'highlightImportantLine'
);

const MENTION_TYPE_NAME = 'mention'; // Assuming 'mention' is the registered name for your CustomMention node
const HASHTAG_TYPE_NAME = 'hashtag';
const IMPORTANT_LABEL_SUBSTRING = '⭐️ important';
const FOCUS_LABEL_SUBSTRING = '☀️ focus';
const HIGHLIGHT_CLASS = 'highlight-important-line';
const FOCUS_HIGHLIGHT_CLASS = 'highlight-focus-line';
const HIGHLIGHT_NODE_CLASS = 'highlight-important-line-node';
const FOCUS_HIGHLIGHT_NODE_CLASS = 'highlight-focus-line-node';

function findImportantMentions(doc: ProsemirrorNode): Decoration[] {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    // ONLY target paragraph nodes for potential highlighting
    if (node.type.name === 'paragraph') {
      let currentLineStartPos = pos + 1; // Start position inside the paragraph's content
      let currentLineHasImportantMention = false;
      let currentLineHasFocusMention = false;
      let currentLineChildren: Array<{
        node: ProsemirrorNode
        from: number
        to: number
        isHardBreak: boolean
      }> = [];

      // Helper function to check a node and its descendants
      const checkNodeRecursively = (n: ProsemirrorNode): { hasImportant: boolean; hasFocus: boolean } => {
        let hasImportant = false;
        let hasFocus = false;

        if (n.type.name === MENTION_TYPE_NAME || n.type.name === HASHTAG_TYPE_NAME) {
          const label = String(n.attrs.label ?? '');
          const dataTag = String(n.attrs['data-tag'] ?? '').toLowerCase();
          const id = String(n.attrs.id ?? '').toLowerCase();

          if (
            label.includes(IMPORTANT_LABEL_SUBSTRING) ||
            dataTag === 'important' ||
            id === 'tag:important' ||
            label.toLowerCase() === 'important' ||
            label.toLowerCase() === '#important'
          ) {
            hasImportant = true;
          }

          if (
            label.includes(FOCUS_LABEL_SUBSTRING) ||
            dataTag === 'focus' ||
            id === 'tag:focus' ||
            label.toLowerCase() === 'focus' ||
            label.toLowerCase() === '#focus'
          ) {
            hasFocus = true;
          }
        }

        for (let i = 0; i < n.childCount; i++) {
          const childResult = checkNodeRecursively(n.child(i));
          hasImportant = hasImportant || childResult.hasImportant;
          hasFocus = hasFocus || childResult.hasFocus;
          if (hasImportant && hasFocus) break;
        }

        return { hasImportant, hasFocus };
      };

      // Iterate through the direct children of the PARAGRAPH
      node.content.forEach((childNode, offset, index) => {
        const childStartPos = pos + 1 + offset;
        const childEndPos = childStartPos + childNode.nodeSize;

        // Check if this child or its descendants contain the mention
        if (!currentLineHasImportantMention || !currentLineHasFocusMention) {
          const tagResult = checkNodeRecursively(childNode);
          currentLineHasImportantMention = currentLineHasImportantMention || tagResult.hasImportant;
          currentLineHasFocusMention = currentLineHasFocusMention || tagResult.hasFocus;
        }

        // Determine if this is the end of a visual line
        const isHardBreak = childNode.type.name === 'hardBreak';
        currentLineChildren.push({
          node: childNode,
          from: childStartPos,
          to: childEndPos,
          isHardBreak,
        });
        const isLastChild = index === node.childCount - 1;
        const isLineEnd = isHardBreak || isLastChild;

        if (isLineEnd) {
          // Calculate the end position for the decoration range
          const decorationEndPos = isHardBreak ? childStartPos : childEndPos;

          if (currentLineHasFocusMention) {
            // Focus takes priority over important if both are present on the same line.
            if (currentLineStartPos < decorationEndPos) {
              decorations.push(
                Decoration.inline(currentLineStartPos, decorationEndPos, {
                  class: FOCUS_HIGHLIGHT_CLASS,
                })
              );
            }
            // Inline decorations don't style atom node views (e.g., todoMention),
            // so add node decorations to the non-text nodes on this line.
            currentLineChildren.forEach(({ node: lineNode, from, to, isHardBreak: lineIsHardBreak }) => {
              if (lineIsHardBreak || lineNode.isText || from >= to) return;
              decorations.push(
                Decoration.node(from, to, {
                  class: FOCUS_HIGHLIGHT_NODE_CLASS,
                })
              );
            });
          } else if (currentLineHasImportantMention) {
            // Check if start/end positions are valid
            if (currentLineStartPos < decorationEndPos) {
                decorations.push(
                    Decoration.inline(currentLineStartPos, decorationEndPos, {
                        class: HIGHLIGHT_CLASS,
                    })
                );
            } else {
                // console.log(`[HighlightPlugin] Skipping decoration: startPos ${currentLineStartPos} >= endPos ${decorationEndPos}`);
            }
            currentLineChildren.forEach(({ node: lineNode, from, to, isHardBreak: lineIsHardBreak }) => {
              if (lineIsHardBreak || lineNode.isText || from >= to) return;
              decorations.push(
                Decoration.node(from, to, {
                  class: HIGHLIGHT_NODE_CLASS,
                })
              );
            });
          }

          // Reset for the next line, starting after the hardBreak or last child
          currentLineStartPos = childEndPos;
          currentLineHasImportantMention = false;
          currentLineHasFocusMention = false;
          currentLineChildren = [];
        }
      });

      // We processed the paragraph, no need for the main loop to descend further *into* it.
      return false;
    }

    // If not a paragraph, continue traversing normally.
    return true;
  });

  return decorations;
}

export const HighlightImportantLinePlugin = Extension.create({
  name: 'highlightImportantLine',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: HighlightImportantLinePluginKey,
        state: {
          init(_, { doc }) {
            return DecorationSet.create(doc, findImportantMentions(doc));
          },
          apply(tr, oldSet) {
            if (!tr.docChanged) {
              return oldSet.map(tr.mapping, tr.doc);
            }
            return DecorationSet.create(tr.doc, findImportantMentions(tr.doc));
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
}); 
