import React from "react";
import { Node, mergeAttributes, InputRule, wrappingInputRule, markInputRule, Mark } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule, NodeViewContent } from "@tiptap/react";
import { MathfieldElement, MathfieldOptions } from "mathlive";
import { BoxedExpression, ComputeEngine } from '@cortex-js/compute-engine';

export const REGEX_BLOCK_MATH_QUESTION_MARKS: RegExp = /\?\?\s+$/; //new RegExp("\?\?\s+$", "i");
export const REGEX_INLINE_MATH_QUESTION_MARKS: RegExp = /\?(.+)\?/; //new RegExp("\?(.+)\?", "i");

export const CalculationExtension = Mark.create({
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
  addInputRules() {
    return [
      markInputRule({
        find: REGEX_INLINE_MATH_QUESTION_MARKS,
        type: this.type,
        getAttributes: ({ groups }) => groups,
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
      return (
        <NodeViewWrapper>
          <div>
            {"hellosdsds"}
          </div>
        </NodeViewWrapper>
      );
    });
  },
});

// (props.matchedContent) => return (<math-live>props.matchedContent<math-live>)