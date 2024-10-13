import { Editor, mergeAttributes, Node } from '@tiptap/core';
import { ReplaceStep, ReplaceAroundStep } from '@tiptap/pm/transform';
import { NodeType } from 'prosemirror-model';
import { EditorState, PluginKey } from 'prosemirror-state';
import { Plugin, Transaction } from 'prosemirror-state';

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

export interface DocumentAttributesOptions {
  HTMLAttributes: Record<string, any>,
}

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
     * If not, it inserts the node with default attributes.
     */
    ensureDocumentAttributes: () => ReturnType;
  }
}

// Define the structure of the `docAttrs` node's attributes
export interface DocumentAttributes {
  selectedFocusLens: 'editing' | 'focus' | 'read-only';
  selectedEventLens: string;
  // Add other attributes as needed
}

export const DocumentAttributeExtension = Node.create<DocumentAttributesOptions>({
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
          (element.getAttribute('data-selected-focus-lens') as DocumentAttributes['selectedFocusLens']) || 'editing',
        renderHTML: (attributes: DocumentAttributes) => ({
          'data-selected-focus-lens': attributes.selectedFocusLens,
        }),
      },
      selectedEventLens: {
        default: "wedding",
        parseHTML: element => element.getAttribute('data-selected-event-lens') || null,
        renderHTML: attributes => ({
          'data-selected-event-lens': attributes.selectedEventLens,
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
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'document-attributes' })]
  },

  // Define custom commands for this node
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
          let pos: number | null = null;
          // Traverse the document to find `docAttrs` node
          state.doc.descendants((node, position) => {
            if (node.type.name === 'docAttrs') {
              pos = position;
              return false; // Stop traversal once found
            }
          });

          if (pos !== null) {
            // Merge existing attributes with new ones
            const currentAttrs = state.doc.nodeAt(pos)!.attrs;
            const newAttrs = { ...currentAttrs, ...attributes };

            if (dispatch) {
              // Update the node's attributes
              const transaction = tr.setNodeMarkup(pos, undefined, newAttrs);
              dispatch(transaction);
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
          let attrs: Record<string, any> = { attrs: 'noneFound' };
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'docAttrs') {
              attrs = node.attrs;
              console.log('found docAttrs');
              return false; // Stop traversal once found
            }
          });
          return attrs;
        },

      /**
       * Ensures the `docAttrs` node exists in the document.
       * If not, it inserts the node with default attributes.
       */
      ensureDocumentAttributes:
        () =>
        ({ commands, state, dispatch }: {
          commands: any;
          state: EditorState;
          dispatch: ((tr: Transaction) => void) | undefined;
        }) => {
          let hasDocAttrs = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'docAttrs') {
              hasDocAttrs = true;
              return false;
            }
          });
          if (!hasDocAttrs) {
            const docAttrsNode = this.type.create(); // Create a new `docAttrs` node with default attributes
            if (dispatch) {
              dispatch(state.tr.insert(0, docAttrsNode));
            }
            return true;
          }
          return false;
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