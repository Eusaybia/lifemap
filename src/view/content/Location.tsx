import './LocationList.scss';
import './styles.scss';
import { Mention, MentionOptions } from '@tiptap/extension-mention';
import { Node as ProsemirrorNode } from 'prosemirror-model';
import { mergeAttributes, nodeInputRule } from '@tiptap/core';

export const CustomLocation = Mention.extend({
  name: 'location',
  addOptions(): MentionOptions {
    return {
      ...this.parent?.(),
      // @ts-ignore
      renderLabel: ({ node }: { node: ProsemirrorNode }) => ( node.attrs.label ),
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    // Add a class based on the 'data' attribute
    let classes = 'location'
    if ((node.attrs.label as string).includes('⭐️ important')) {
      classes = 'glow location'
    } else if ((node.attrs.label as string).includes('✅ complete')) {
      classes = 'green-glow location'
    }

    return [
      'Location',
      mergeAttributes(HTMLAttributes, { 
        class: classes,
        'data-type': 'location',
        'data-id': node.attrs.id || node.attrs.label
      }),
      [
        'span',
        { class: 'location-pin' },
        '📍'
      ],
      [
        'span',
        { class: 'location-text' },
        `${node.attrs.label}`
      ]
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