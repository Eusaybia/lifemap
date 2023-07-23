import React from "react";
import { Node, mergeAttributes, InputRule, wrappingInputRule, markInputRule, Mark, JSONContent, nodeInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Math } from "../content/Math"
import { MathsLoupeC } from "../../core/Model";
import { NodeViewProps } from '@tiptap/core'
import { getMathsLoupeFromAttributes } from "../../utils/utils";
import { Tag } from "./Tag";
import { FlowSwitch } from "../structure/FlowSwitch";
import { motion } from "framer-motion";
import { TextSelection } from "prosemirror-state";

const REGEX_BLOCK_MATH_DOLLARS: RegExp = /\$\$\s+$/; //new RegExp("\$\$\s+$", "i");
const REGEX_INLINE_MATH_DOLLARS: RegExp = /\$(.+)\$/; //new RegExp("\$(.+)\$", "i");

export const MathExtension = Node.create({
  name: "math",
  group: "inline",
  inline: true,
  content: "block*",
  selectable: true,
  atom: true,
  draggable: true,
  parseHTML() {
    return [
      {
        tag: "math",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["math", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addAttributes() {
    // Return an object with attribute configuration
    return {
      lensDisplay: {
        default: 'natural'
      },
      lensEvaluation: {
        default: 'evaluate'
      },
      equationValue: {
        default: ''
      }
    }
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: REGEX_INLINE_MATH_DOLLARS,
        type: this.type,
      }),
      wrappingInputRule({
        find: REGEX_BLOCK_MATH_DOLLARS,
        type: this.type,
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const updateContent = (changedEquation: string) => {
        props.updateAttributes({ equationValue: changedEquation });
      }
      
      return (
        <NodeViewWrapper>
          <Math
            equationString={props.node.attrs.equationValue}
            loupe={getMathsLoupeFromAttributes(props.node.attrs)}
            updateContent={updateContent}
          />
        </NodeViewWrapper>
      )
    })
  },
});

// (props.matchedContent) => return (<math-live>props.matchedContent<math-live>)