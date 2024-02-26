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
            boxShadow: `0px 0.6021873017743928px 2.0474368260329356px -1px rgba(0, 0, 0, 0.29), 0px 2.288533303243457px 7.781013231027754px -2px rgba(0, 0, 0, 0.27711), 0px 5px 5px -3px rgba(0, 0, 0, 0.2)`,
            backgroundColor: "#F3DFAB", 
            borderRadius: 5, 
            padding: `20px 20px 20px 20px`, 
            color: "#222222", 
            fontSize: 16
          }}>
            <div style={{fontFamily: "Georgia", fontSize: 100, height: 70}}>
              {"\“"}
            </div>
            <NodeViewContent />
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});