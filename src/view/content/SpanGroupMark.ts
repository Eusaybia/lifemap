import { Mark, mergeAttributes } from '@tiptap/core';

// ============================================================================
// SPAN GROUP MARK - Inline Group Variant
// ============================================================================
// SpanGroups are the inline variant of Groups in the editor architecture.
// 
// GROUP TYPES:
// 1. Block Group (GroupTipTapExtension.tsx) - wraps block-level content as cards
// 2. Span Group (this file) - wraps inline text with highlighting
//
// Both types share:
// - A 6-dot grip pattern (CSS ::after for spans, DragGrip component for blocks)
// - Unique IDs for connection targeting (data-span-group-id / data-group-id)
// - Participation in GroupConnectionManager for drawing arrows between groups
//
// SpanGroups are conceptually a "lightweight" or "inline" Group - they allow
// users to mark up specific text segments that can be connected to other
// groups (block or inline) via the connection system.
// ============================================================================

// Generate a short 6-character ID (same format as block Group IDs)
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
