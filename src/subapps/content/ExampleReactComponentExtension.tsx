import React from "react";
import { Node, NodeViewProps, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "../logos/Group";
import './styles.scss';
import { motion } from "framer-motion";
import { TwoDGraph } from "./ExampleReactComponent";
import { ThreeDGraph } from "./ThreeDGraph"; // Assuming you have a ThreeDGraph component

export const graphInputRegex = /%([^%]*)%/;
export const threeDGraphInputRegex = /OOO/;

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

export const ThreeDGraphExtension = Node.create({
  name: "three-d-graph",
  group: "block",
  content: "block",
  inline: false,
  selectable: false,
  draggable: true,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "three-d-graph",
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["three-d-graph", HTMLAttributes, 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: threeDGraphInputRegex,
        type: this.type,
      })
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      return (
        <NodeViewWrapper>
          <ThreeDGraph/>
        </NodeViewWrapper>
      );
    });
  },
});