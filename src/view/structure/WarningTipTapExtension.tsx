import React from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { motion } from "framer-motion";
import { grey, purple, red } from "../Theme";
import { NodeOverlay } from "../components/NodeOverlay";

export const doubleDoubleQuoteInputRegex = /!\s([^!]*)\s!/


export const WarningExtension = Node.create({
  name: "warning",
  group: "block",
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: false,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "warning",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["warning", HTMLAttributes, 0];
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
          <NodeOverlay nodeProps={props} nodeType="warning">
            <motion.div style={{
              backgroundColor: grey, borderRadius: 5, padding: `20px 20px 20px 20px`, color: red 
            }}>
              <div style={{fontFamily: "Times New Roman", fontSize: 50}}>
                {"⚠️"}
              </div>
              <NodeViewContent />
            </motion.div>
          </NodeOverlay>
        </NodeViewWrapper>
      );
    });
  },
});