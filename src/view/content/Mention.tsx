import './MentionList.scss';
import { Mention, MentionOptions } from '@tiptap/extension-mention';
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node as ProsemirrorNode } from 'prosemirror-model';
import { Tag, TypeTag } from './Tag';

export const CustomMention = Mention.extend({
  addOptions(): MentionOptions {
    return {
      ...this.parent?.(),
      renderLabel: ({ node }: { node: ProsemirrorNode }) => node.attrs.label,
    };
  },
  draggable: true,
  selectable: true,
  // content: "inline",
  inline: true,
  // TODO: Problem with this is the following: when enabled, the tags go block
  // addNodeView() {
  //   return ReactNodeViewRenderer((props: NodeViewProps) => {
  //     return (
  //       <NodeViewWrapper>
  //         <TypeTag label={props.node.attrs.label} />
  //       </NodeViewWrapper>
  //     );
  //   });
  // },
});