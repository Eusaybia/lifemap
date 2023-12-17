import './MentionList.scss';
import './styles.scss';
import { Mention, MentionOptions } from '@tiptap/extension-mention';
import { Node as ProsemirrorNode } from 'prosemirror-model';
import { mergeAttributes, nodeInputRule } from '@tiptap/core';

export const CustomMention = Mention.extend({
  addOptions(): MentionOptions {
    return {
      ...this.parent?.(),
      renderLabel: ({ node }: { node: ProsemirrorNode }) => ( node.attrs.label ),
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    // Add a class based on the 'data' attribute
      let classes =  'mention'
    if (node.attrs.label === '⭐️ important') {
      classes =  'glow mention'
    } else if (node.attrs.label === '✅ complete') {
      classes =  'green-glow mention'
    }

    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: classes }),
      `${node.attrs.label}`
    ]
  },
  draggable: true,
  selectable: true,
  group: "inline",
  inline: true,
  addInputRules() {
    return [
      nodeInputRule({ find: /!!!$/, type: this.type, getAttributes: () => ({ label: '⭐️ important' }) }),
      nodeInputRule({ find: /\\\/.*$/, type: this.type, getAttributes: () => ({ label: '️✅ complete' }) }),
    ]
  },
  // TODO: Problem with this is the following: when enabled, the tags go block
  // addNodeView() {
  //   return ReactNodeViewRenderer((props: NodeViewProps) => {
  //     return (
  //       <NodeViewWrapper>
  //         <span>

  //         <TypeTag label={props.node.attrs.label} />
  //         </span>
  //       </NodeViewWrapper>
  //     );
  //   });
  // },
});