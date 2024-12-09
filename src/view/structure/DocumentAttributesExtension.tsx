import { Editor, mergeAttributes, Node as TipTapNode } from '@tiptap/core';
import { ReplaceStep, ReplaceAroundStep } from '@tiptap/pm/transform';
import { NodeType } from 'prosemirror-model';
import { EditorState, PluginKey } from 'prosemirror-state';
import { Plugin, Transaction } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';

// The problem that this extension solves is the question of how to store document level attributes (or information)
// This is used for things such as changing how the user views an entire document.
// For example, the user can edit the document, or it can be read-only. These are two different views of the document,
// and this preference needs to be stored alongside the document itself.

// There were several hypotheses and approaches on how to solve this, with many not working when actually implemented,
// due to various idiosyncracies in ProseMirror and TipTap.

// Approach 1: Add attributes to the root "doc" node.
// In TipTap, it is possible to add attributes to almost any node using props.updateAttributes("key", "value").
// However, it was discovered that it is not possible to do this for the root "doc" node.
// See this issue here: https://github.com/ueberdosis/tiptap/issues/3948

// Approach 2: Create a custom step using ProseMirror to directly add attributes to the root "doc" node.
// Apparently it is possible to create a custom DocAttrStep to add an attribute to the root "doc" node.
// https://discuss.prosemirror.net/t/changing-doc-attrs/784/32
// But after trying this approach and inspecting the root "doc" node, no attributes could be found.
// Maybe this is due to an implementation error, but I decided to move onto a more basic and reliable approach.

// Approach 3: Create a custom extension node that has its own attributes
// This is to create a node that always exists in the document tree, much like any other node would have attributes
// It's called "docAttrs" and is always the first child of the root "doc" node.
// This means it's always at position 0 in the document tree.
// It can be updated using the props.updateAttributes("key", "value") method.
// It's a bit hacky, compared to some of the purer methods above, but this should be the most reliable and simplest to understand.
// https://tiptap.dev/docs/editor/api/commands/nodes-and-marks/update-attributes
// This is the approach that was chosen and is implemented in this file.

// Extend TipTap's Commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    /**
     * Sets document-level attributes.
     */
    setDocumentAttribute: (attributes: Record<string, any>) => ReturnType;

    /**
     * Retrieves document-level attributes.
     */
    getDocumentAttributes: () => Record<string, any>;

    /**
     * Ensures the `docAttrs` node exists in the document.
     */
    ensureDocumentAttributes: () => boolean;
  }
}

// Define the structure of the `docAttrs` node's attributes
export interface DocumentAttributes {
  // These control whether the document is editable, viewed through a focus
  // view that blacks out any elements that are not currently selected, or
  // read-only
  selectedFocusLens: 'editing' | 'focus' | 'read-only';
  // This controls which event type is selected. This will affect non-event types
  // based on irrelevantEventNodesDisplayLens 
  selectedEventLens: "wedding" | "birthday" | "corporate";
  // This controls whether irrelevant event nodes have dimmed opacity, are hidden completely, or shown normally
  irrelevantEventNodesDisplayLens: 'dim' | 'hide' | 'show';
  // This controls whether unimportant nodes have dimmed opacity, are hidden completely, or shown normally
  unimportantNodesDisplayLens: 'dim' | 'hide' | 'show';
}

export interface DocumentAttributesDefaults {
  selectedFocusLens?: {
    default: DocumentAttributes['selectedFocusLens']
  };
  selectedEventLens?: {
    default: DocumentAttributes['selectedEventLens']
  };
  irrelevantEventNodesDisplayLens?: {
    default: DocumentAttributes['irrelevantEventNodesDisplayLens']
  };
  unimportantNodesDisplayLens?: {
    default: DocumentAttributes['unimportantNodesDisplayLens']
  };
  // ... any other existing options
}

const defaultDocumentAttributes = {
  selectedFocusLens: 'editing' as const,
  selectedEventLens: 'wedding' as const,
  irrelevantEventNodesDisplayLens: 'dim' as const,
  unimportantNodesDisplayLens: 'hide' as const,
} satisfies Record<keyof DocumentAttributes, DocumentAttributes[keyof DocumentAttributes]>;

export const DocumentAttributeExtension = TipTapNode.create<DocumentAttributes & DocumentAttributesDefaults>({
  name: 'docAttrs',
  group: 'block',

  // Prevent user from directly editing this node
  selectable: false,
  draggable: false,
  atom: true, // Treat as atomic to prevent internal modifications

  // Define attributes to hold document-level data
  addAttributes() {
    return {
      selectedFocusLens: {
        default: 'editing' as const,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-selected-focus-lens') || this.options.selectedFocusLens.default,
        renderHTML: (attributes: DocumentAttributes) => ({
          'data-selected-focus-lens': attributes.selectedFocusLens,
        }),
      },
      selectedEventLens: {
        default: "wedding" as const,
        parseHTML: (element: HTMLElement) => 
          element.getAttribute('data-selected-event-lens') || this.options.selectedEventLens.default,
        renderHTML: (attributes: DocumentAttributes) => ({
          'data-selected-event-lens': attributes.selectedEventLens,
        }),
      },
      irrelevantEventNodesDisplayLens: {
        default: "dim" as const,
        parseHTML: (element: HTMLElement) => 
          element.getAttribute('data-irrelevant-event-nodes-display-lens') || this.options.irrelevantEventNodesDisplayLens.default,
        renderHTML: (attributes: DocumentAttributes) => ({
          'data-irrelevant-event-nodes-display-lens': attributes.irrelevantEventNodesDisplayLens,
        }),
      },
      unimportantNodesDisplayLens: {
        default: "hide" as const,
        parseHTML: (element: HTMLElement) => 
          element.getAttribute('data-unimportant-nodes-display-lens') || this.options.unimportantNodesDisplayLens.default,
        renderHTML: (attributes: DocumentAttributes) => ({
          'data-unimportant-nodes-display-lens': attributes.unimportantNodesDisplayLens,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="document-attributes"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    // @ts-ignore
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'document-attributes' })]
  },

  // Define custom commands for this node
  // @ts-ignore
  addCommands() {
    return {
      /**
       * Sets document-level attributes.
       * Finds the `docAttrs` node and updates its attributes.
       * If the node is not found, it ensures it exists first.
       * @param attributes - The attributes to set.
       */
      setDocumentAttribute:
        (attributes: Record<string, any>) =>
        ({ commands, state, tr, dispatch }: {
          commands: any;
          state: EditorState;
          tr: Transaction;
          dispatch: ((tr: Transaction) => void) | undefined;
        }) => {
          let docAttrsNode = state.doc.firstChild;

          state.doc.descendants((node) => {
            if (node.type.name === 'docAttrs') {
              // @ts-ignore
              docAttrsNode = node;
            }
          })

          if (docAttrsNode != null) {
            // Merge existing attributes with new ones
            const currentAttrs = docAttrsNode!.attrs;
            const newAttrs = { ...currentAttrs, ...attributes };

            if (dispatch) {
              // Update the node's attributes
              // const transaction = tr.setNodeMarkup(docAttrsNode!.pos, undefined, newAttrs);
              // dispatch(transaction);
            }
            return true;
          }

          // If `docAttrs` is not found, ensure it exists and retry
          if (commands.ensureDocumentAttributes()) {
            // After ensuring, set the attributes
            return commands.setDocumentAttribute(attributes);
          }

          return false;
        },

      /**
       * Retrieves document-level attributes.
       * @returns The current document attributes or a default object if not found.
       */
      getDocumentAttributes:
        () =>
        ({ state }: { state: EditorState }) => {
          let docAttrsNode: TipTapNode | null = null;
          state.doc.descendants((node) => {
            if (node.type.name === 'docAttrs') {
              // @ts-ignore
              docAttrsNode = node;
              return
            }
          })

          if (docAttrsNode != null) {
            // @ts-ignore
            return docAttrsNode.attrs;
          } else {
            console.error("No `docAttrs` node found in the document")
            return { attrs: 'noneFound' };
          }
        },

      /**
       * The document must contain just one `docAttrs` node, at the top level set of descendants
       * Ensures only one `docAttrs` node exists in the document.
       * If not, it inserts the node with default attributes.
       */
      ensureDocumentAttributes:
        () =>
        ({ commands, state, dispatch }: {
          commands: any;
          state: EditorState;
          dispatch: ((tr: Transaction) => void) | undefined;
        }) => {
          const docAttrsNodes: { node: ProseMirrorNode, pos: number }[] = [];

          // First traversal to collect existing docAttrs nodes
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'docAttrs') {
              docAttrsNodes.push({ node, pos });
            }
          });

          if (docAttrsNodes.length === 0) {
            // No docAttrs nodes found, insert a new one
            const docAttrsNode = this.type.create(); // Create a new `docAttrs` node with default attributes
            if (dispatch) {
              dispatch(state.tr.insert(0, docAttrsNode));
            }
            return true;
          } else if (docAttrsNodes.length === 1) {
            // Exactly one docAttrs node exists
            return true;
          } else {
            console.error("Multiple `docAttrs` nodes found in the document");

            if (dispatch) {
              let tr = state.tr;
              // Keep the first docAttrs node and remove the rest
              const nodesToRemove = docAttrsNodes.slice(1); // All except the first

              // Sort in descending order to prevent shifting positions
              nodesToRemove.sort((a, b) => b.pos - a.pos);

              nodesToRemove.forEach(({ pos, node }) => {
                try {
                  tr = tr.delete(pos, pos + node.nodeSize);
                } catch (error) {
                  console.error(`Failed to delete docAttrs node at position ${pos}:`, error);
                }
              });

              dispatch(tr);
              console.log(`Removed ${nodesToRemove.length} duplicate docAttrs nodes`);
            }
          }

          // Reset the array before the second traversal
          const updatedDocAttrsNodes: { node: ProseMirrorNode, pos: number }[] = [];

          // Second traversal to verify the state after potential modifications
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'docAttrs') {
              updatedDocAttrsNodes.push({ node, pos });
            }
          });

          if (updatedDocAttrsNodes.length === 1) {
            // Now ensure that the node has all the default attributes keys
            const docAttrsNode = updatedDocAttrsNodes[0].node;
            const docAttrsNodeAttrs = docAttrsNode.attrs;

            const docAttrsNodeAttrsKeys = Object.keys(docAttrsNodeAttrs).sort();
            const defaultDocAttrsNodeAttrsKeys = Object.keys(defaultDocumentAttributes).sort();

            const keysMatch = 
              docAttrsNodeAttrsKeys.length === defaultDocAttrsNodeAttrsKeys.length &&
              docAttrsNodeAttrsKeys.every((key, index) => key === defaultDocAttrsNodeAttrsKeys[index]);

            if (keysMatch) {
              return true;
            } else {
              console.error("docAttrs node does not contain all default attributes");
              return false;
            }
          } else {
            console.error("Could not ensure that there is just one `docAttrs` node in the document");
            return false;
          }
        },
    };
  },

  // Add a ProseMirror plugin to ensure `docAttrs` is always present
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('docAttrsInitializer'),
        /**
         * The appendTransaction hook allows modifying the transaction before it's applied.
         * Here, it checks if `docAttrs` exists and inserts it if missing.
         */
        appendTransaction: (transactions, oldState, newState) => {
          let hasDocAttrs = false;
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'docAttrs') {
              hasDocAttrs = true;
              return false; // Stop traversal once found
            }
          });
          if (!hasDocAttrs) {
            const docAttrsNode = this.type.create(); // Create a new `docAttrs` node with default attributes
            const transaction = newState.tr.insert(0, docAttrsNode);
            return transaction; // Return the transaction to insert `docAttrs`
          }
          return;
        },
      })
    ];
  },

  // Prevent 'doc' node from being draggable or selectable
  addNodeView() {
    return () => ({
      dom: document.createElement('div'),
      contentDOM: null,
      ignoreMutation: () => true,
    });
  },
});
