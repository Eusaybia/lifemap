import { Node, wrappingInputRule, } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Attrs, DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model'

const REGEX_BLOCK_COLON = /:[^:]+:/;

export const ExperimentalPortalExtension = Node.create({
    name: 'customNode',

    group: 'block',
    content: "block*",

    addAttributes() {
        return {
            id: {
                default: "2fcb9417-5273-4532-a2ba-41a2ade7d2b5",
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div',
            },
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
        return ['div', { ...HTMLAttributes, 'data-id': node.attrs.id }, 0]
    },

    addInputRules() {
        return [
            wrappingInputRule({
                find: REGEX_BLOCK_COLON,
                type: this.type,
            }),
        ];
    },

    addNodeView() {
        // @ts-ignore
        return ReactNodeViewRenderer(({ node, editor, getPos }) => {
          // Find the referenced node
          let referencedNode = null
        // @ts-ignore
          editor.state.doc.descendants((n, pos) => {
            if (n.attrs.id === node.attrs.id) {
              referencedNode = n
            }
          })
    
          // Render the referenced node
            // @ts-ignore
          let ReferencedNodeComponent = referencedNode ? referencedNode.type.component : null
    
          // Re-render the node when its id changes
          editor.on('transaction', () => {
            const updatedNode = editor.state.doc.nodeAt(getPos())
            if (updatedNode && updatedNode.attrs.id !== node.attrs.id) {
              // Find the new referenced node
              let newReferencedNode: ProseMirrorNode | null = null
            // @ts-ignore
              editor.state.doc.descendants((n, pos) => {
                if (n.attrs.id === updatedNode.attrs.id) {
                  newReferencedNode = n
                }
              })
    
              // Update the DOM element based on the new referenced node
              if (newReferencedNode) {
                // @ts-ignore
                ReferencedNodeComponent = (newReferencedNode as ProseMirrorNode).type.component
              }
            }
          })
    
          return (
            <div>
              {ReferencedNodeComponent && <ReferencedNodeComponent node={referencedNode} />}
            </div>
          )
        })
      },
})

export default ExperimentalPortalExtension
