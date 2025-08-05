import './PeopleList.scss';
import './styles.scss';
import { Mention, MentionOptions } from '@tiptap/extension-mention';
import { Node as ProsemirrorNode } from 'prosemirror-model';
import { mergeAttributes, nodeInputRule } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';

export const PeoplePluginKey = new PluginKey('people');

export const CustomPeople = Mention.extend({
  name: 'people',
  addOptions(): MentionOptions {
    return {
      ...this.parent?.(),
      // @ts-ignore
      renderLabel: ({ node }: { node: ProsemirrorNode }) => ( node.attrs.label ),
      suggestion: {
        ...this.parent?.().suggestion,
        pluginKey: PeoplePluginKey,
      }
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    // Add a class based on the 'data' attribute
    let classes = 'people'
    if ((node.attrs.label as string).includes('⭐️ important')) {
      classes = 'glow people'
    } else if ((node.attrs.label as string).includes('✅ complete')) {
      classes = 'green-glow people'
    }

    return [
      'People',
      mergeAttributes(HTMLAttributes, { 
        class: classes,
        'data-type': 'people',
        'data-id': node.attrs.id || node.attrs.label
      }),
      [
        'span',
        { class: 'people-pin' },
        '👤'
      ],
      [
        'span',
        { class: 'people-text' },
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