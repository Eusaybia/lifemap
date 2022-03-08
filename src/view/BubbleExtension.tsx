import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import React from "react";
import { QiCorrect } from "../core/Model";
import { AlphaBubble } from "./Bubble";

export const tildeInputRegex = /~>$/

export const BubbleExtension = Node.create({
  name: "bubbleExtension",
  group: "inline",
  inline: true,
  selectable: false,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "bubble-extension",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["bubble-extension", mergeAttributes(HTMLAttributes)];
  },
  draggable: true,
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
    return ReactNodeViewRenderer((props: any) => {
      return (
        <NodeViewWrapper>
          {/* When created, this needs to accept a shen, that should resolve all issues */}
          <AlphaBubble q={QiCorrect.createQi()} hideDetail={false} />
        </NodeViewWrapper>
      );
    });
  },
});
