import React from "react";
import { Node, mergeAttributes, InputRule, wrappingInputRule, markInputRule, Mark, JSONContent, nodeInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Math } from "./Math"
import { MathsLoupeC } from "../../core/Model";
import { NodeViewProps } from '@tiptap/core'
import { getMathsLoupeFromAttributes } from "../../utils/Utils";
import { Tag } from "./Tag";
import { FlowSwitch } from "../structure/FlowSwitch";
import { motion } from "framer-motion";
import { Location } from "./Location";

const REGEX_BLOCK_AT = /@[^@]+@/

export const LocationExtension = Node.create({
  name: "location",
  group: "block",
  content: "block*",
  selectable: true,
  atom: true,
  draggable: true,
  parseHTML() {
    return [
      {
        tag: "location",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["location", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: REGEX_BLOCK_AT,
        type: this.type,
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        return this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name }).focus().run()
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      return (
        <NodeViewWrapper>
          <Location location={props.node.textContent}/>
        </NodeViewWrapper>
      );
    });
  },
});

// (props.matchedContent) => return (<math-live>props.matchedContent<math-live>)