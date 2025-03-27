import { Editor, Extension, RawCommands } from '@tiptap/core';

// The problem that this extension solves is the question of how to store document level attributes (or information)
// This is used for things such as changing how the user views an entire document.
// For example, the user can edit the document, or it can be read-only. These are two different views of the document,
// and this preference needs to be stored alongside the document itself.

// There were several hypotheses and approaches on how to solve this, with many not working when actually implemented,
// due to various idiosyncracies in ProseMirror and TipTap.

// Approach: Use localStorage to store document attributes locally.
// Commands are provided to interact with this storage.
// Components needing these attributes should use the `getDocumentAttributes` command
// and listen for the 'doc-attributes-updated' custom event on the window.

// Extend TipTap's Commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    docAttrsCommands: {
      /**
       * Sets document-level attributes in localStorage.
       */
      setDocumentAttribute: (attributes: Partial<DocumentAttributes>) => ReturnType;

      /**
       * Retrieves document-level attributes synchronously from localStorage.
       */
      getDocumentAttributes: () => DocumentAttributes;
    }
  }
}

// Define the structure of the attributes
export interface DocumentAttributes {
  selectedFocusLens: 'editing' | 'focus' | 'read-only';
  selectedEventLens: "wedding" | "birthday" | "corporate";
  irrelevantEventNodesDisplayLens: 'dim' | 'hide' | 'show';
  unimportantNodesDisplayLens: 'dim' | 'hide' | 'show';
}

// Define default attributes
export const defaultDocumentAttributes: DocumentAttributes = {
  selectedFocusLens: 'editing' as const,
  selectedEventLens: 'wedding' as const,
  irrelevantEventNodesDisplayLens: 'dim' as const,
  unimportantNodesDisplayLens: 'hide' as const,
};

// Key for localStorage
const LOCAL_STORAGE_KEY = 'tiptapDocumentAttributes';

// Replace the Node extension with a simple Extension providing commands
export const DocumentAttributeExtension = Extension.create({
  name: 'docAttrsCommands',

  // No node-specific properties

  // Define custom commands for interacting with localStorage
  addCommands(): Partial<RawCommands> {
    return {
      /**
       * Sets document-level attributes in localStorage.
       * @param attributes - The attributes to set or merge.
       */
      setDocumentAttribute:
        (attributes: Partial<DocumentAttributes>) =>
        ({ commands }) => {
          let currentAttributes = defaultDocumentAttributes;
          try {
            const storedAttrs = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedAttrs) {
              currentAttributes = { ...defaultDocumentAttributes, ...JSON.parse(storedAttrs) };
            }
          } catch (error) {
            console.error("Error reading document attributes from localStorage:", error);
          }

          const updatedAttributes = { ...currentAttributes, ...attributes };

          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAttributes));
            // Dispatch a custom event on the window object to notify listeners
            window.dispatchEvent(new CustomEvent('doc-attributes-updated', { detail: updatedAttributes }));
          } catch (error) {
            console.error("Error saving document attributes to localStorage:", error);
          }
          // Command itself returns true synchronously
          return true;
        },

      /**
       * Synchronously retrieves document attributes from localStorage.
       * @returns The current document attributes.
       */
      // @ts-ignore - getDocumentAttributes exists via the extension
      getDocumentAttributes:
        () =>
        // @ts-ignore - getDocumentAttributes exists via the extension
        ({ commands }) => {
          try {
            const storedAttrs = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedAttrs) {
              // Merge with defaults to ensure all keys are present
              return { ...defaultDocumentAttributes, ...JSON.parse(storedAttrs) };
            }
          } catch (error) {
            console.error("Error reading document attributes from localStorage:", error);
          }
          // Return defaults if nothing stored or on error
          return defaultDocumentAttributes;
        },
    };
  },

  // No ProseMirror plugins needed
});
