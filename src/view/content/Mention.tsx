import './MentionList.scss';
import { Mention, MentionOptions } from '@tiptap/extension-mention';
import { Node as ProsemirrorNode } from 'prosemirror-model';

export const CustomMention = Mention.extend({
  addOptions(): MentionOptions {
    return {
      ...this.parent?.(),
      renderLabel: ({ node }: { node: ProsemirrorNode }) => node.attrs.label,
    };
  },
  draggable: true,
  selectable: true
});