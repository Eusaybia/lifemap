import { Editor, EditorContent, NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer, wrappingInputRule } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Node, NodeViewRenderer, NodeViewRendererProps } from '@tiptap/react'
import { Editor as CoreEditor } from '@tiptap/core'
import React, { useEffect, useState } from 'react'
import { Attrs, Node as ProseMirrorNode } from 'prosemirror-model'
import { QiId } from '../../core/Model'
import { CustomisedEditor } from '../content/RichText'

const REGEX_BLOCK_TILDE = /~[^~]+~/

// TODO: Ideally, there shouldn't be a CoreEditor and Editor, it should be the same time. Mismatch should not be happening
const Portal = (props: { editor: CoreEditor, referencedQiId: QiId }) => {
    let editor = CustomisedEditor("Content has not been updated to match the referenced node")

    useEffect(() => {
        const updateContent = () => {
            let referencedNode: ProseMirrorNode | undefined = undefined;

            props.editor.state.doc.descendants(descendant => {
                if (descendant.attrs.qiId === props.referencedQiId) {
                    referencedNode = descendant
                }
            })

            if (!referencedNode) {
                editor.commands.setContent("Couldn't find referenced qi")
            }
            else {
                console.log("referenced node", referencedNode)
                const nodeContent = (referencedNode as ProseMirrorNode).toJSON()
                console.log("node content", nodeContent)
                editor.commands.setContent(nodeContent)
            }
        }

        // Update the content initially
        updateContent()

        // Subscribe to changes in the editor state and update the content whenever the state changes
        props.editor.on('update', updateContent)

    }, [props])

    return <EditorContent editor={editor} style={{border: `1.5px dashed black`, borderRadius: 5}}/>
}

export const PortalExtension = Node.create({
    name: 'portal',
    group: 'block',
    content: "block*",
    atom: true,
    addAttributes() {
        return {
            referencedQiId: {
                default: null,
            },
        }
    },
    parseHTML() {
        return [
            {
                tag: 'portal[id]',
                getAttrs: (element: HTMLElement | string) => {
                    return {
                        id: (element as HTMLElement).getAttribute('id'),
                    }
                },
            },
        ]
    },
    renderHTML({ HTMLAttributes }) {
        return ['transclusion', HTMLAttributes]
    },
    addInputRules() {
        return [
            wrappingInputRule({
                find: REGEX_BLOCK_TILDE,
                type: this.type,
            }),
        ];
    },
    addNodeView() {
        return ReactNodeViewRenderer((props: NodeViewProps) => {
          return (
            <NodeViewWrapper>
                <NodeViewContent/>
                <Portal editor={props.editor} referencedQiId={props.node.textContent}/>
            </NodeViewWrapper>
          );
        });
      },
})
