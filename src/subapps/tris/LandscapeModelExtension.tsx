import React from 'react';
import { Node, nodeInputRule } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
} from '@tiptap/react';
import { LandscapeModel } from './LandscapeModel'; // Adjust the import path as needed

export const landscapeModelInputRegex = /--landscape--$/;

export const LandscapeModelExtension = Node.create({
  name: 'landscape-model',
  group: 'block',
  inline: false,
  atom: true,
  selectable: false,
  draggable: true,
  parseHTML() {
    return [
      {
        tag: 'landscape-model',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['landscape-model', HTMLAttributes];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: landscapeModelInputRegex,
        type: this.type,
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(() => (
      <NodeViewWrapper>
        <LandscapeModel
          modelPath='/models-3d/chinese-mountains.glb' // Replace with your landscape model path
          onClick={() => {
            // Define onClick behavior if applicable
          }}
          size={600} // Larger size for landscape models
          color='white'
          scale={[0.1, 0.1, 0.1]} // Adjust scale as needed for landscapes
          cameraPosition={[0, 10, 20]} // Adjusted camera position for better landscape view
          fov={60} // Wider field of view for landscapes
        />
      </NodeViewWrapper>
    ));
  },
});