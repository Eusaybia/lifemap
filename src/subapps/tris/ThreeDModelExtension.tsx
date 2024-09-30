import React from 'react';
import { Node, nodeInputRule } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
} from '@tiptap/react';
import { ThreeDModel } from './ThreeDModel';

export const threeDModelInputRegex = /--model--$/;

export const ThreeDModelExtension = Node.create({
  name: 'three-d-model',
  group: 'block',
  inline: false,
  atom: true,
  selectable: false,
  draggable: true,
  parseHTML() {
    return [
      {
        tag: 'three-d-model',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['three-d-model', HTMLAttributes, 0];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: threeDModelInputRegex,
        type: this.type,
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(() => (
      <NodeViewWrapper>
        <ThreeDModel />
      </NodeViewWrapper>
    ));
  },
});