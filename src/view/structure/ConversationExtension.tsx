import React from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { Group } from "./Group";
import { Quanta } from "../../core/Quanta";
import { group } from "console";
import { Message } from "../content/Message";

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
          <>
          </>
          <Group lens={"identity"} quantaId={props.node.attrs.qid} isIrrelevant={false}>
            <div style={{fontFamily: "EB Garamond", fontSize: 30}}>
              Group Chat
            </div>
            <NodeViewContent/>
          </Group>
        </NodeViewWrapper>
      );
    });
  },
});