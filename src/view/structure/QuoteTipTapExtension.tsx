import React from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { motion } from "framer-motion";
import { purple } from "../Theme";

export const doubleDoubleQuoteInputRegex = /""([^""]*)""/

export const QuoteExtension = Node.create({
  name: "quote",
  group: "block",
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: false,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "quote",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["quote", HTMLAttributes, 0];
  },
  draggable: true,
  addInputRules() {
    return [
      wrappingInputRule({
        find: doubleDoubleQuoteInputRegex,
        type: this.type,
      })
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      return (
        <NodeViewWrapper>
          <motion.div style={{
            backgroundColor: purple, borderRadius: 5, padding: `20px 20px 20px 20px`, color: "#FFFFFF"
          }}>
            <div style={{fontFamily: "Times New Roman", fontSize: 50}}>
              {"💬"}
            </div>
            <NodeViewContent />
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});