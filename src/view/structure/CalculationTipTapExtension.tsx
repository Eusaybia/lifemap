import React from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { motion } from "framer-motion";
import { parchment, purple } from "../Theme";

const REGEX_PLUS = /^\+.+\+$/


export const Calculation = Node.create({
  name: "calculation",
  group: "block",
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: false,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "calculation",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["calculation", HTMLAttributes, 0];
  },
  draggable: true,
  addInputRules() {
    return [
      wrappingInputRule({
        find: REGEX_PLUS,
        type: this.type,
      })
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      return (
        <NodeViewWrapper>
          <motion.div style={{
            backgroundColor: parchment, borderRadius: 5, padding: `20px 20px 20px 20px`, color: "#343434"
          }}>
            <math lensDisplay="natural" lensEvaluation="evaluate" equationValue=""/>
            <math lensDisplay="natural" lensEvaluation="evaluate" equationValue=""/>
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});