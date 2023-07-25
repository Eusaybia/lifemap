import { Node } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { motion } from "framer-motion";
import { parchment } from "../Theme";
import React from "react";

export const CalculationExtension = Node.create({
  name: "calculation",
  group: "block",
  content: "inline*",
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
  // addCommands() {
  //   return {
  //     insertCalculation: () => ({ commands }) => {
  //       return commands.insertContent({
  //         type: 'calculation',
  //         content: [
  //           {
  //             type: 'math',
  //             attrs: {
  //               lensDisplay: 'natural',
  //               lensEvaluation: 'evaluate',
  //               equationValue: ''
  //             }
  //           },
  //           {
  //             type: 'math',
  //             attrs: {
  //               lensDisplay: 'natural',
  //               lensEvaluation: 'evaluate',
  //               equationValue: ''
  //             }
  //           }
  //         ]
  //       });
  //     }
  //   }
  // },
  addNodeView() {
    return (props) => {
      return (
        <NodeViewWrapper>
          <motion.div style={{
            backgroundColor: parchment, borderRadius: 5, padding: `20px 20px 20px 20px`, color: "#343434"
          }}>
            <NodeViewContent />
          </motion.div>
        </NodeViewWrapper>
      );
    };
  },
});
