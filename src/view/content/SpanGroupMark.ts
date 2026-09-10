import { eventEnclosures } from './eventEnclosures';
import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

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
      setEventSpan: () => ReturnType;
      /**
       * Remove a span group mark from the current selection
       */
      unsetSpanGroup: () => ReturnType;
      setEventFill: (filled: boolean) => ReturnType;
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
      groupType: {
        default: null,
        parseHTML: element => element.getAttribute('data-group-type'),
        renderHTML: attributes => attributes.groupType === 'event'
          ? { 'data-group-type': 'event', title: 'Event' }
          : {},
      },
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

  addProseMirrorPlugins() {
    return [new Plugin({
      view: eventEnclosures,
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];
          const starts = new Map<string, number>();
          const recordStart = (id: string, pos: number) => starts.set(id, Math.min(starts.get(id) ?? pos, pos));
          state.doc.descendants((node, pos) => {
            const event = node.marks.find(mark => mark.type.name === 'spanGroup' && mark.attrs.groupType === 'event');
            if (event) recordStart(event.attrs.groupId, pos);
          });
          state.doc.descendants((block, pos) => {
            if (!block.isTextblock) return;
            const children: { node: typeof block; pos: number }[] = [];
            block.forEach((node, offset) => children.push({ node, pos: pos + 1 + offset }));
            const identity = (node: typeof block) => node.marks.find(mark =>
              mark.type.name === 'spanGroup' && mark.attrs.groupType === 'event')?.attrs.groupId;
            children.forEach(({ node, pos: childPos }, index) => {
              if (!node.isInline || node.isText) return;
              // Collaboration stores marks on text; bridge inline tags between the same event's text runs.
              const before = children.slice(0, index).reverse().find(item => item.node.isText);
              const after = children.slice(index + 1).find(item => item.node.isText);
              const left = before && identity(before.node);
              let right = after && identity(after.node);
              if (!before && !after) {
                let found = false;
                state.doc.nodesBetween(pos + block.nodeSize, state.doc.content.size, candidate => {
                  if (found || !candidate.isText) return;
                  right = identity(candidate);
                  found = true;
                });
              }
              const groupId = identity(node) || (!before ? right : left && left === right ? left : null);
              if (groupId) recordStart(groupId, childPos);
              if (groupId) decorations.push(Decoration.node(childPos, childPos + node.nodeSize, {
                class: 'event-inline-atom',
                'data-event-group-id': groupId,
              }));
            });
          });
          for (const [id, pos] of starts) {
            decorations.push(Decoration.widget(pos, () => {
              const tag = document.createElement('span');
              tag.className = 'location-mention event-type-tag';
              tag.setAttribute('data-event-group-id', id);
              tag.setAttribute('aria-label', 'Event type');
              tag.contentEditable = 'false';
              tag.textContent = '◷ Event';
              return tag;
            }, { side: -1, key: `event-type:${id}` }));
          }
          return DecorationSet.create(state.doc, decorations);
        },
      },
    })];
  },

  addCommands() {
    return {
      setSpanGroup: () => ({ commands }) => {
        return commands.setMark(this.name, { groupId: generateShortId() });
      },
      setEventFill: (filled: boolean) => ({ editor }) => {
        localStorage.setItem('inline-events-filled', String(filled));
        editor.view.dom.parentElement?.querySelector('.event-enclosures')?.setAttribute('data-filled', String(filled));
        return true;
      },
      setEventSpan: () => ({ state, commands }) => {
        if (state.selection.empty) return false;
        return commands.setMark(this.name, { groupId: generateShortId(), groupType: 'event' });
      },
      unsetSpanGroup: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});

export default SpanGroupMark;
