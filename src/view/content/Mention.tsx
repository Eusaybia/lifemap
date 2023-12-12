import './MentionList.scss';
import { Mention, MentionOptions } from '@tiptap/extension-mention';
import { Node as ProsemirrorNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { InputRule } from 'prosemirror-inputrules'
import { nodeInputRule, textblockTypeInputRule } from '@tiptap/core';

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
  addInputRules() {
    return [
      nodeInputRule({ find: /!!!$/, type: this.type, getAttributes: () => ({ label: '⭐️ important' }) }),
    ]
  },
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