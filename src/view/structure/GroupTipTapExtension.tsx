import React from "react";
import { Attributes, Editor, Node, NodeViewProps, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Group } from "./Group";
import './styles.scss';
import { motion, useInView } from "framer-motion";


export type InteractionType = "onHover" | "onClick" | "onSelectionChanged" | "onMarkChange" | "onTextChange"

// Finesse - refinement
// Refinement starts at 0 and maxes out at 100
const increaseRefinement = (interactionType: InteractionType, editor: Editor, nodeName: string) => {
  let refinementIncrement = 0

  switch (interactionType) {
    case "onHover":
      refinementIncrement = 0.01
      break;
    case "onClick":
      refinementIncrement = 1
      break;
    case "onSelectionChanged":
      refinementIncrement = 2
      break;
    case "onMarkChange":
      refinementIncrement = 5
      break;
    case "onTextChange":
      refinementIncrement = 5
      break;
    default:
      break;
  }

  editor.commands.updateAttributes(nodeName, { refinement: node.attrs.refinement + refinementIncrement })
}

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
      attention: { default: 0 }, // if the viewport displays this specific group - in seconds
      refinement: { default: 0 }, // if the user interacts via onHover, onClick - actions taken
      pathos: { default: 0 } // the emotional content of the group and children - basically a colour mixture of all emotions within
      // experimental: density: amount of qi in this group (amount of people in this group)
      // experimental: rationality: is this statement based on reason (rather than "truth")? 1 + 1 = 3
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
  onSelectionUpdate() {
    increaseRefinement("onSelectionChanged", this.editor, this.name)
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      let node = props.node

      // Finesse - emotions
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


      // Finesse - attention
      // Scale of 0 - 100
      // If the group is being interacted with, then add to attention
      const increaseAttention = (interactionType: InteractionType) => {
        let refinementIncrement = 0

        switch (interactionType) {
          case "onHover":
            refinementIncrement = 0.5
            break;
          case "onClick":
            refinementIncrement = 1
            break;
          case "onSelectionChanged":
            refinementIncrement = 2
            break;
          case "onMarkChange":
            refinementIncrement = 5
            break;
          case "onTextChange":
            refinementIncrement = 5
            break;
          default:
            break;
        }

        props.updateAttributes({refinement: node.attrs.refinement + refinementIncrement})
      }




      // If this group is in the viewport, then add to attention
      const ref = React.useRef<HTMLDivElement | null>(null);
      const isInView = useInView(ref, {
        // This means that the viewport is effectively shrunken by this size
        margin: "-250px 0px -250px 0px"
      })
      const attentionUnitsPerSecond = 1
      const peripheralScaleFactor = 0.25
      const refreshRate = 5 // Reducing this improves performance drastically
      const focalScaleFactor = 1

      const [attention, setAttention] = React.useState(props.node.attrs.attention);

      // Uncomment this to reset attention 
      // props.updateAttributes({ attention: 0 })

      // I think there's a bug where attention = 0, gets parsed into luminance = 100
      const convertAttentionToBrightness = (attention: number) => {
        if (attention <= 0) {
          return 0
        }

        // Make 100 the limit for luminance, with inverse exponential scaling towards that ceiling
        // Type this equation into this calculator to visualise the scaling
        // https://www.desmos.com/calculator
        let rawLuminance = -(1 / (0.05 * attention)) + 100
        // console.log("raw luminance", rawLuminance)

        // e.g. 75.4325435435435
        // Brightness must be higher than 0, must set a floor
        const luminance = Math.max(0, rawLuminance)
        // console.log("luminance", luminance)

        // e.g. 75
        const truncatedLuminance = Math.floor(luminance)

        // Brightness must be lower than 100
        const ceilingLuminance = Math.min(100, truncatedLuminance)

        // console.log("trunc luminance", truncatedLuminance)

        return ceilingLuminance 
      }

      React.useEffect(() => {
        let timer: NodeJS.Timer | undefined;
        if (isInView) {
          // Maybe it's better to use a Framer Motion primitive since it runs outside the React render loop
          // https://arc.net/l/quote/tsaviucv
          timer = setInterval(() => {
            let newAttention = 0
            setAttention((prevAttention: number) => {
              newAttention = prevAttention + (attentionUnitsPerSecond / refreshRate) * peripheralScaleFactor
              props.updateAttributes({ attention: newAttention })
              return newAttention
            });
          }, 1000 / refreshRate);
        } else {
          if (timer) {
            clearInterval(timer)
          }
        }
      
        return () => {
          if (timer) {
            clearInterval(timer)
          }
        }
      }, [isInView])

      const luminance = convertAttentionToBrightness(props.node.attrs.attention)


      return (
        <NodeViewWrapper>
          <motion.div
            onHoverStart={() => {
              increaseAttention("onHover")
              increaseRefinement("onHover")
            }}
            onClick={() => {
              increaseAttention("onClick")
              increaseRefinement("onClick")
            }}
            ref={ref}
            style={{ borderRadius: 10 }}
            animate={{
              boxShadow: glowStyles.join(','),
              filter: `brightness(${luminance}%)`
            }}
            transition={{ duration: 0.5, ease: "circOut" }}>
            <Group lens={"verticalArray"} quantaId={props.node.attrs.qid}>
              <NodeViewContent />
            </Group>
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});