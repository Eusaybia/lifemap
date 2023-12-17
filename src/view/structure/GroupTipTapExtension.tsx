import React from "react";
import { Node, NodeViewProps, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "./Group";
import './styles.scss';
import { orange } from "@mui/material/colors";

// TODO: Match for brackets with text in between
export const groupInputRegex = /{([^{}]*)}/;

export const GroupExtension = Node.create({
  name: "group",
  group: "block",
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "group",
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["group", HTMLAttributes, 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: groupInputRegex,
        type: this.type,
      })
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      let node = props.node
      let containsCompleteMention = false;
      let glowStyles: string[] = []
      const orangeGlow = `0 0 5px #ff7f00, 0 0 20px #ff7f00, 0 0 30px #ff7f00, 0 0 40px #ff7f00`
      const greenGlow = `0 0 5px #33cc00, 0 0 10px #33cc00, 0 0 15px #33cc00, 0 0 20px #33cc00`

      // Check whether this group contains subnodes that is a mention
      node.descendants((childNode) => {
        if (childNode.type.name === 'mention' && (childNode.attrs.label as string).includes('✅ complete')) {
          containsCompleteMention = true;
        }
      });

      if (containsCompleteMention) {
        glowStyles.push(greenGlow)
      } else {
        console.log("The node does not contain a mention node.");
      }

      // Assume 'node' is the specific node you want to check
      let containsUncheckedTodo = false;

      // Check whether this group contains subnodes that is an incomplete task
      node.descendants((childNode) => {
        if (childNode.type.name === 'taskItem' && !childNode.attrs.checked) {
          containsUncheckedTodo = true;
        }
      });

      if (containsUncheckedTodo) {
        console.log("The node contains an unchecked to-do list item.");
        glowStyles.push(orangeGlow)
      } else {
        console.log("The node does not contain an unchecked to-do list item.");
      }


      return (
        <NodeViewWrapper>
          <div style={{borderRadius: 10, boxShadow: glowStyles.join(',')}}>
            <Group lens={"verticalArray"} quantaId={props.node.attrs.qid}>
              <NodeViewContent />
            </Group>
          </div>
        </NodeViewWrapper>
      );
    });
  },
});