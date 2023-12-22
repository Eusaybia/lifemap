import React from "react";
import { Node, NodeViewProps, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "./Group";
import './styles.scss';
import { motion } from "framer-motion";
import { TwoDGraph } from "./TwoDGraph";

export const graphInputRegex = /%([^%]*)%/;

export const TwoDGraphExtension = Node.create({
  name: "two-d-graph",
  group: "block",
  content: "block",
  inline: false,
  selectable: false,
  draggable: true,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "two-d-graph",
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["two-d-graph", HTMLAttributes, 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: graphInputRegex,
        type: this.type,
      })
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {

      return (
        <NodeViewWrapper>
          <TwoDGraph/>
        </NodeViewWrapper>
      );
    });
  },
});