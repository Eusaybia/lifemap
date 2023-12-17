import React from "react";
import { Node, NodeViewProps, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "./Group";
import './styles.scss';
import { orange } from "@mui/material/colors";
import { motion } from "framer-motion";

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
      let glowStyles: string[] = []
      const orangeGlow = `0 0 5px #ff7f0030, 0 0 20px #ff7f0030, 0 0 30px #ff7f0030, 0 0 40px #ff7f0030`
      const greenGlow = `0 0 5px #33cc0040, 0 0 10px #33cc0040, 0 0 15px #33cc0040, 0 0 20px #33cc0040`
      const yellowGlow = `0 0 5px #ffec80, 0 0 10px #fff1a3, 0 0 15px #ffed87, 0 0 20px #ffeb7a`

      // Check whether this group contains subnodes that is a mention
      node.descendants((childNode) => {
        if (childNode.type.name === 'mention' && (childNode.attrs.label as string).includes('✅ complete')) {
          glowStyles.push(greenGlow)
        }
        if (childNode.type.name === 'mention' && (childNode.attrs.label as string).includes('⭐️ important')) {
          glowStyles.push(yellowGlow)
        }
      });

      // Assume 'node' is the specific node you want to check
      let containsUncheckedTodo = false;
      let containsCheckItem = false;

      // Check whether this group contains subnodes that is an incomplete task
      node.descendants((childNode) => {
        if (childNode.type.name === 'taskItem') {
          containsCheckItem = true
        }
        if (childNode.type.name === 'taskItem' && !childNode.attrs.checked) {
          containsUncheckedTodo = true;
        }
      });

      if (containsUncheckedTodo) {
        glowStyles.push(orangeGlow)
      } else {
        // Basically if there's no check items then no glow should appear
        if (containsCheckItem) {
          glowStyles.push(greenGlow)
        }
      }

      return (
        <NodeViewWrapper>
          <motion.div style={{ borderRadius: 10 }} animate={{ boxShadow: glowStyles.join(',') }} transition={{ duration: 0.5, ease: "circOut" }}>
            <Group lens={"verticalArray"} quantaId={props.node.attrs.qid}>
              <NodeViewContent />
            </Group>
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});