import React from "react";
import { Editor, Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Group } from "./Group";
import './styles.scss';
import { motion, useInView, useMotionTemplate, useMotionValue, useTransform } from "framer-motion";
import { offWhite } from "../Theme";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    group: {
      setBackgroundColor: (options: {
        backgroundColor: string
      }) => ReturnType
    }
  }
}


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

  // editor.commands.updateAttributes(nodeName, { refinement: node.attrs.refinement + refinementIncrement })
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
  onUpdate() {
    // If there is a selection inside the node, don't update the node
    // Updating the node will cause the selection to disappear
    if (this.editor.state.selection) {
      return true
    }

    return false
  },
  addCommands() {
    return {
      setBackgroundColor: (attributes: { backgroundColor: string }) => ({ state, dispatch }) => {

        const { selection } = state;
        const groupNode = selection && selection.$from.depth > 0 && selection.$from.node(selection.$from.depth).type.name === this.name;

        if (groupNode && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "backgroundColor", attributes.backgroundColor));
          return true; // Indicate that the command ran successfully
        }
        return false
      },
    }
  },
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
      pathos: { default: 0 }, // the emotional content of the group and children - basically a colour mixture of all emotions within
      // experimental: density: amount of qi in this group (amount of people in this group)
      // experimental: rationality: is this statement based on reason (rather than "truth")? 1 + 1 = 3
      backgroundColor: { default: offWhite }
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
    console.log("group had selection")
    // Get the current node
    // const node = this.editor.state.selection.$head.parent;
  
    // // Check if the node is of the correct type
    // if (node.type.name === this.name) {
    //   // Calculate the new refinement value
    //   const refinementIncrement = calculateRefinementIncrement("onSelectionChanged");
    //   const newRefinement = node.attrs.refinement + refinementIncrement;
  
    //   // Update the refinement attribute
    //   this.editor.commands.updateAttributes(this.name, { refinement: newRefinement });
    // }
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
      const attentionUnitsPerSecond = 100
      const peripheralScaleFactor = 0.3
      const refreshRate = 60
      const focalScaleFactor = 1

      const [attention, setAttention] = React.useState(props.node.attrs.attention);

      // Uncomment this to reset attention 
      // props.updateAttributes({ attention: 0 })

      // This is a high frequency updating interpolation of the actual attention value, which is stored in the node attributes above
      const attentionProxy = useMotionValue(props.node.attrs.attention)

      React.useEffect(() => {
        let motionValueUpdateTimer: NodeJS.Timer | undefined;
        let nodeAttrsUpdateTimer: NodeJS.Timer | undefined;
        if (isInView) {
          // Maybe it's better to use a Framer Motion primitive since it runs outside the React render loop
          // https://arc.net/l/quote/tsaviucv
          motionValueUpdateTimer = setInterval(() => {
            const currentAttention = attentionProxy.get()

            let newAttention = currentAttention + (attentionUnitsPerSecond / refreshRate) * peripheralScaleFactor

            // Use motion value updates to maintain performance
            attentionProxy.set(newAttention)

          }, 1000 / refreshRate);

          // Every so often, update the actual attention value associated with the group
          // This is done for performance reasons, as well as the fact that updatingAttributes causes a re-render of the node
          // This re-render wipes any text selections, which is undesireable
          // Still kind of hacky, a real solution would maybe
          // Prevent re-rendering if there is a selection
          // Even better solution would be to somehow remember the selection, and then re-apply it after an update
          nodeAttrsUpdateTimer = setInterval(() => {
            props.updateAttributes({ attention: attentionProxy.get() })
          }, 10000)

        } else {
          if (motionValueUpdateTimer) {
            clearInterval(motionValueUpdateTimer)
          }
          if (nodeAttrsUpdateTimer) {
            clearInterval(nodeAttrsUpdateTimer)
          }
        }
      
        return () => {
          if (motionValueUpdateTimer) {
            clearInterval(motionValueUpdateTimer)
          }
          if (nodeAttrsUpdateTimer) {
            clearInterval(nodeAttrsUpdateTimer)
          }
        }
      }, [isInView])

      // Have an exponentially growing attention to brightness curve
      // For a little bit of increase in attention, have a large initial increase in brightness
      // Make it hard to reach maximum brightness
      // If something has a lot of attention, then make it hyper bright, with a brightness percentage greater than 100%
      const brightnessStyle = useMotionTemplate`brightness(${useTransform(attentionProxy, [0, 60, 500, 1000], [0, 80, 90, 105])}%)`

      return (
        <NodeViewWrapper>
          <motion.div
            onHoverStart={() => {
              // increaseAttention("onHover")
              // increaseRefinement("onHover")
            }}
            onClick={() => {
              // increaseAttention("onClick")
              // increaseRefinement("onClick")
            }}
            ref={ref}
            style={{ borderRadius: 10, filter: brightnessStyle }}
            animate={{
              boxShadow: glowStyles.join(','),
            }}
            transition={{ duration: 0.5, ease: "circOut" }}>
            <Group 
              lens={"verticalArray"} 
              quantaId={props.node.attrs.qid} 
              backgroundColor={props.node.attrs.backgroundColor}
            >
              {/* {props.node.attrs.quantaId} */}
              <NodeViewContent />
            </Group>
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});