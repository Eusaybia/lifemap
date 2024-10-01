import React from 'react';
import { Node, nodeInputRule } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
} from '@tiptap/react';
import { Generic3DModel } from './ThreeDModel'; // Adjust the import path as needed

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
    return ['three-d-model', HTMLAttributes];
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
        <Generic3DModel
          modelPath='/models-3d/nelson-statue.glb' // Replace with dynamic path if needed
          onClick={() => {
            // Define onClick behavior if applicable
          }}
          size={400} // Adjust size as needed
          color='white' // Adjust color if applicable
        />
      </NodeViewWrapper>
    ));
  },
});