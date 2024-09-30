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
  addAttributes() {
    return {
      quantaIds: {
        default: ['2a033c00-f810-4b97-a4ca-135c3a6df3ee', '21ea5993-4269-46ee-aaa7-4802b1d690f7', '2c6edd03-2be5-4fff-b65d-dd0eb1a87c50'],
      },
    };
  },

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
          <HorizontalQuantaSection editor={props.editor} updateAttributes={props.updateAttributes} quantaIds={props.node.attrs.quantaIds} />
        </NodeViewWrapper>
      );
    });
  },
});