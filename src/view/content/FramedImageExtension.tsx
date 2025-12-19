'use client'

import React from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { NodeViewProps } from '@tiptap/react'

// Wooden frame styled image component
const FramedImageNodeView = ({ node, selected }: NodeViewProps) => {
  const { src, alt, title } = node.attrs
  
  // Frame styling inspired by classic wooden picture frames
  const frameWidth = 16 // Width of the frame border
  
  return (
    <NodeViewWrapper 
      style={{ 
        display: 'flex', 
        justifyContent: 'center',
        margin: '16px 0',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          // Outer frame with wood texture
          background: `url('/textures/wood/dark_wood_diff_1k.jpg')`,
          backgroundSize: '200px 200px',
          padding: frameWidth,
          borderRadius: 4,
          // Outer shadow for depth - light source from top right
          boxShadow: `
            -6px 8px 12px rgba(0, 0, 0, 0.35),
            -12px 16px 24px rgba(0, 0, 0, 0.2),
            -2px 3px 6px rgba(0, 0, 0, 0.25),
            inset 0 0 0 2px rgba(0, 0, 0, 0.1)
          `,
          // Selection highlight
          outline: selected ? '3px solid #6366f1' : 'none',
          outlineOffset: 4,
        }}
      >
        {/* Inner bevel effect - light edge (top-right light source) */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: frameWidth + 2,
            right: 2,
            bottom: frameWidth + 2,
            borderTop: '2px solid rgba(255, 255, 255, 0.35)',
            borderRight: '2px solid rgba(255, 255, 255, 0.25)',
            pointerEvents: 'none',
          }}
        />
        
        {/* Inner bevel effect - dark edge (top-right light source) */}
        <div
          style={{
            position: 'absolute',
            top: frameWidth - 2,
            left: 2,
            right: frameWidth + 2,
            bottom: 2,
            borderBottom: '2px solid rgba(0, 0, 0, 0.45)',
            borderLeft: '2px solid rgba(0, 0, 0, 0.35)',
            pointerEvents: 'none',
          }}
        />
        
        {/* Inner gold/brass liner */}
        <div
          style={{
            padding: 3,
            background: 'linear-gradient(135deg, #d4af37 0%, #aa8c2c 50%, #d4af37 100%)',
            boxShadow: 'inset 0 0 2px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Mat/mount (off-white inner border) */}
          <div
            style={{
              padding: 20,
              background: 'linear-gradient(135deg, #f5f5f0 0%, #e8e8e3 100%)',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* The actual image */}
            <img
              src={src}
              alt={alt || ''}
              title={title || ''}
              style={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                // Subtle shadow under the image
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// Custom Image extension with wooden frame
export const FramedImageExtension = Node.create({
  name: 'image',
  
  group: 'block',
  
  atom: true,
  
  draggable: true,
  
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FramedImageNodeView)
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})

