import React from "react";
import { Node, NodeViewProps, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "./Group";
import './styles.scss';
import { motion, useInView } from "framer-motion";

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
  addAttributes() {
    return {
      attention: { default: 0 }, // if the viewport displays this specific group
      refinement: { default: 0 }, // if the user interacts via onHover, onClick
      pathos: { default: 0 } // the emotional content of the group and children
      // experimental: density: amount of qi in this group (amount of people in this group)
    }
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


      // If this group is in the viewport, then add to attention
      const ref = React.useRef<HTMLDivElement | null>(null);
      React.useEffect(() => {
        props.updateAttributes({ attention: props.node.attrs.attention + 1 })
      }, [
        useInView
      ])

      return (
        <NodeViewWrapper>
          <motion.div ref={ref} style={{ borderRadius: 10 }} animate={{ boxShadow: glowStyles.join(','), filter: `brightness(${props.node.attrs.attention}%)` }} transition={{ duration: 0.5, ease: "circOut" }}>
            <Group lens={"verticalArray"} quantaId={props.node.attrs.qid}>
              <NodeViewContent />
            </Group>
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});