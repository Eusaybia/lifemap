import { Mark, mergeAttributes } from '@tiptap/core';

// Generate a short 6-character ID
const generateShortId = () => Math.random().toString(36).substring(2, 8);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spanGroup: {
      /**
       * Set a span group mark on the current selection
       */
      setSpanGroup: () => ReturnType;
      /**
       * Remove a span group mark from the current selection
       */
      unsetSpanGroup: () => ReturnType;
    };
  }
}

export interface SpanGroupOptions {
  HTMLAttributes: Record<string, any>;
}

export const SpanGroupMark = Mark.create<SpanGroupOptions>({
  name: 'spanGroup',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      groupId: {
        default: null,
        parseHTML: element => element.getAttribute('data-span-group-id'),
        renderHTML: attributes => {
          if (!attributes.groupId) {
            return {};
          }
          return {
            'data-span-group-id': attributes.groupId,
            'data-span-group-label': attributes.groupId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-span-group-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { class: 'span-group' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setSpanGroup: () => ({ commands }) => {
        return commands.setMark(this.name, { groupId: generateShortId() });
      },
      unsetSpanGroup: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});

export default SpanGroupMark;
