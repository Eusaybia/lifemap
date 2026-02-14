import React from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "./Group";
import { Quanta } from "../../core/Quanta";
import { group } from "console";
import { Message } from "../content/Message";
import { NodeOverlay } from "../components/NodeOverlay";

export const tildeInputRegex = /~>$/

export const ConversationExtension = Node.create({
  name: "conversation",
  group: "block",
  // TODO: Technically this should only accept message nodes
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "conversation",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["conversation", HTMLAttributes, 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: tildeInputRegex,
        type: this.type,
      }),
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      return (
        <NodeViewWrapper>
          <NodeOverlay nodeProps={props} nodeType="conversation">
            <>
            </>
            <div style={{fontFamily: "EB Garamond", fontSize: 30}}>
              Group Chat
            </div>
            <Group
              quantaId={props.node.attrs.qid}
              lens={"identity"}
              // @ts-ignore - Suppressing prop mismatch for isIrrelevant
              isIrrelevant={false}
            >
              <NodeViewContent/>
            </Group>
          </NodeOverlay>
        </NodeViewWrapper>
      );
    });
  },
});