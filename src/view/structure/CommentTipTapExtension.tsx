import React from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { motion } from "framer-motion";
import { parchment, purple } from "../Theme";

const REGEX_BLOCK_SLASH = /\/\/[^/]+\/\//

export const CommentExtension = Node.create({
  name: "comment",
  group: "block",
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: false,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "comment",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["comment", HTMLAttributes, 0];
  },
  draggable: true,
  addInputRules() {
    return [
      wrappingInputRule({
        find: REGEX_BLOCK_SLASH,
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
            <div style={{fontFamily: "EB Garamond", fontSize: 18}}>
              <NodeViewContent />
            </div>
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});