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
          <div style={{
            padding: 5,
            backgroundColor: "grey",
            borderRadius: 5,
            boxShadow: `0px 0.6032302072222955px 0.6032302072222955px -1.25px rgba(0, 0, 0, 0.18), 0px 2.290210571630906px 2.290210571630906px -2.5px rgba(0, 0, 0, 0.15887), 0px 10px 10px -3.75px rgba(0, 0, 0, 0.0625)`,
          }}
          contentEditable="false"
                onMouseLeave={(event) => {
                    event.currentTarget.style.cursor = "grab";
                }}
                onMouseDown={(event) => {
                    event.currentTarget.style.cursor = "grabbing";
                }}
                onMouseUp={(event) => {
                    event.currentTarget.style.cursor = "grab";
                }}
            data-drag-handle
          >
          <Math
            equationString={props.node.attrs.equationValue}
            loupe={getMathsLoupeFromAttributes(props.node.attrs)}
            updateContent={updateContent}
          />
          </div>
        </NodeViewWrapper>
      )
    })
  },
});

// (props.matchedContent) => return (<math-live>props.matchedContent<math-live>)