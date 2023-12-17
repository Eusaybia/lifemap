import React from "react";
import { Node, NodeViewProps, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "./Group";
import './styles.scss';

// TODO: Match for brackets with text in between
export const groupInputRegex = /{([^{}]*)}/;

export const GroupExtension = Node.create({
  name: "group",
  group: "block",
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "group",
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["group", HTMLAttributes, 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: groupInputRegex,
        type: this.type,
      })
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      let node = props.node
      let containsCompleteMention = false;
      let classes = ''

      node.descendants((childNode) => {
        if (childNode.type.name === 'mention' && (childNode.attrs.label as string).includes('✅ complete')) {
          containsCompleteMention = true;
        }
      });

      if (containsCompleteMention) {
        classes = 'green-glow'
      } else {
        console.log("The node does not contain a mention node.");
      }

      return (
        <NodeViewWrapper>
          <div className={classes} style={{borderRadius: 10}}>
            <Group lens={"verticalArray"} quantaId={props.node.attrs.qid}>
              <NodeViewContent />
            </Group>
          </div>
        </NodeViewWrapper>
      );
    });
  },
});