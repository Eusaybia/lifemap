import React from "react";
import { Node, NodeViewProps, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { HorizontalQuantaSection } from "./HorizontalQuantaSection";

export const horizontalQuantaSectionInputRegex = /---quanta-section---/;

export const HorizontalQuantaSectionExtension = Node.create({
  name: "horizontal-quanta-section",
  group: "block",
  content: "block",
  inline: false,
  selectable: false,
  draggable: true,
  atom: true,

  parseHTML() {
    return [
      {
        tag: "horizontal-quanta-section",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["horizontal-quanta-section", mergeAttributes(HTMLAttributes), 0];
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: horizontalQuantaSectionInputRegex,
        type: this.type,
      })
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      return (
        <NodeViewWrapper>
          <HorizontalQuantaSection />
        </NodeViewWrapper>
      );
    });
  },
});