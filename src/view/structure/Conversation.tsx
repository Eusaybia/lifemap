import React from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "./Group";
import { Qi } from "../../core/Qi";
import { group } from "console";

export const tildeInputRegex = /~>$/

export const Conversation = Node.create({
  name: "conversation",
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
        tag: "conversation",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["conversation", HTMLAttributes, 0];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: tildeInputRegex,
        type: this.type,
        getAttributes: ({ groups }) => groups,
      }),
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      return (
        <NodeViewWrapper>
          <div style={{position: "absolute", left:0 }}>
            🗣️
          </div>
          <Group lens={"verticalArray"} qid={props.node.attrs.qid}>
            <NodeViewContent />
          </Group>
        </NodeViewWrapper>
      );
    });
  },
});