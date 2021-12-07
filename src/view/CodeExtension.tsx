import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import React from "react";
import { QiCorrect } from "../core/LifeGraphModel";
import { AlphaBubble } from "./Bubble";

export const tildeInputRegex = /^```(?<language>[a-z]*)?[\s\n]$/

export const BubbleExtension = Node.create({
  name: "bubbleExtension",
  group: "block",
  content: "text*",
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
          <AlphaBubble q={QiCorrect.createQi()} hideDetail={false}/>
        </NodeViewWrapper>
      );
    });
  },
});
