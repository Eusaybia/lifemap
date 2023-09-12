import React from "react";
import { Node, mergeAttributes, InputRule, wrappingInputRule, markInputRule, Mark } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule, NodeViewContent } from "@tiptap/react";
import { MathfieldElement, MathfieldOptions } from "mathlive";
import { Math } from "../content/Math"
import { BoxedExpression, ComputeEngine } from '@cortex-js/compute-engine';
import { Calculation } from "./Calculation";

const REGEX_BLOCK_MATH_DOLLARS: RegExp = /\$\$.*\$\$/;

export const CalculationExtension = Node.create({
  name: "calculation",
  group: "(block | inline)",
  content: "text*",
  code: true,
  inline: true,
  selectable: true,
  atom: true,
  draggable: true,
  parseHTML() {
    return [
      {
        tag: "calculation",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["calculation", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addAttributes() {
    // Return an object with attribute configuration
    return {
      lensDisplay1: {
        default: 'natural'
      },
      lensEvaluation1: {
        default: 'identity'
      },
      equationValue1: {
        default: ''
      },
      lensDisplay2: {
        default: 'natural'
      },
      lensEvaluation2: {
        default: 'evaluate'
      },
      equationValue2: {
        default: ''
      }
    }
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: REGEX_BLOCK_MATH_DOLLARS,
        type: this.type,
      }),
    ]
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        return this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name }).focus().run()
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: any) => {
      const updateContent1 = (changedEquation: string) => {
        props.updateAttributes({ equationValue1: changedEquation });
        console.log("updated attributes", props.node.attrs)
      }
      const updateContent2 = (changedEquation: string) => {
        props.updateAttributes({ equationValue2: changedEquation });
        console.log("updated attributes", props.node.attrs)
      }

      return (
        <NodeViewWrapper>
          <Calculation
            inputMaths={{
              style: "cards",
              equationString: props.node.attrs.equationValue1,
              lensDisplay: props.node.attrs.lensDisplay1,
              lensEvaluation: props.node.attrs.lensEvaluation1,
              updateContent: updateContent1
            }} 
            outputMath={{
              style: "cards",
              equationString: "",
              lensDisplay: "natural",
              lensEvaluation: "evaluate",
              updateContent: updateContent2
            }} />
        </NodeViewWrapper>
      );
    });
  },
});

// (props.matchedContent) => return (<math-live>props.matchedContent<math-live>)