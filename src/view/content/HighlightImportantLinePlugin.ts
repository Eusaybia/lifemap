import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { Extension } from '@tiptap/core';

export const HighlightImportantLinePluginKey = new PluginKey(
  'highlightImportantLine'
);

const MENTION_TYPE_NAME = 'mention'; // Assuming 'mention' is the registered name for your CustomMention node
const IMPORTANT_LABEL_SUBSTRING = '⭐️ important';
const HIGHLIGHT_CLASS = 'highlight-important-line';

function findImportantMentions(doc: ProsemirrorNode): Decoration[] {
  console.log("[HighlightPlugin] findImportantMentions called");
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' || node.type.name === 'listItem') {
      let currentLineStartPos = pos + 1; // Start position inside the node's content
      let currentLineHasImportantMention = false;

      // Helper function to check a node and its descendants
      const checkNodeRecursively = (n: ProsemirrorNode): boolean => {
        if (n.type.name === MENTION_TYPE_NAME && (n.attrs.label as string)?.includes(IMPORTANT_LABEL_SUBSTRING)) {
          return true;
        }
        for (let i = 0; i < n.childCount; i++) {
          if (checkNodeRecursively(n.child(i))) {
            return true;
          }
        }
        return false;
      };

      // Iterate through the direct children of the paragraph/listItem
      node.content.forEach((childNode, offset) => {
        const childStartPos = pos + 1 + offset;
        const childEndPos = childStartPos + childNode.nodeSize;

        // Check if this child or its descendants contain the mention
        if (!currentLineHasImportantMention) {
            if (checkNodeRecursively(childNode)) {
                currentLineHasImportantMention = true;
                // console.log(`[HighlightPlugin] Mention found in child starting at ${childStartPos}`);
            }
        }

        // Determine if this is the end of a visual line
        const isHardBreak = childNode.type.name === 'hardBreak';
        const isLastChild = offset === node.content.size - 1;
        const isLineEnd = isHardBreak || isLastChild;

        if (isLineEnd) {
          // Calculate the end position for the decoration range
          // If it's a hardBreak, end decoration *before* it.
          // If it's the last child, end decoration *after* it.
          const decorationEndPos = isHardBreak ? childStartPos : childEndPos;

          if (currentLineHasImportantMention) {
            // Check if start/end positions are valid
            if (currentLineStartPos < decorationEndPos) {
                console.log(`[HighlightPlugin] Applying inline decoration from ${currentLineStartPos} to ${decorationEndPos} in ${node.type.name}`);
                decorations.push(
                    Decoration.inline(currentLineStartPos, decorationEndPos, {
                        class: HIGHLIGHT_CLASS,
                    })
                );
            } else {
                // console.log(`[HighlightPlugin] Skipping decoration: startPos ${currentLineStartPos} >= endPos ${decorationEndPos}`);
            }
          }

          // Reset for the next line, starting after the hardBreak or last child
          currentLineStartPos = childEndPos;
          currentLineHasImportantMention = false;
        }
      });

      // Prevent descending further into this node from the outer loop
      return false;
    }
    return true; // Continue traversal for other node types
  });

  console.log("[HighlightPlugin] Returning decorations:", decorations.length > 0 ? decorations : "None");
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
            console.log("[HighlightPlugin] Document changed, recalculating decorations.");
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