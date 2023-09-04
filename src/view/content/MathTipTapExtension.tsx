import React from "react";
import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Math } from "../content/Math"
import { NodeViewProps } from '@tiptap/core'

const REGEX_BLOCK_MATH_DOLLARS: RegExp = /\$\$\s+$/; //new RegExp("\$\$\s+$", "i");
const REGEX_INLINE_MATH_DOLLARS: RegExp = /\$(.+)\$/; //new RegExp("\$(.+)\$", "i");

export const MathExtension = Node.create({
  name: "math",
  group: "block",
  inline: false,
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
        console.log("updated attributes", props.node.attrs)
      }

      console.log("maths node attrs", props.node.attrs)

      return (
        <NodeViewWrapper>
          <Math
            style={"flat"}
            equationString={props.node.attrs.equationValue}
            lensEvaluation={props.node.attrs.lensEvaluation}
            lensDisplay={props.node.attrs.lensDisplay}
            updateContent={updateContent}
          />
        </NodeViewWrapper>
      )
    })
  },
});

// (props.matchedContent) => return (<math-live>props.matchedContent<math-live>)