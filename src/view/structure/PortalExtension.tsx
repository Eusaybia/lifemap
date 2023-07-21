import { Editor, EditorContent, NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer, wrappingInputRule } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Node, NodeViewRenderer, NodeViewRendererProps } from '@tiptap/react'
import { Editor as CoreEditor } from '@tiptap/core'
import React, { useEffect, useState } from 'react'
import { Attrs, Node as ProseMirrorNode } from 'prosemirror-model'
import { QiId } from '../../core/Model'

const REGEX_BLOCK_TILDE = /~[^~]+~/

// TODO: Ideally, there shouldn't be a CoreEditor and Editor, it should be the same time. Mismatch should not be happening
const Portal = (props: { editor: CoreEditor, referencedQiId: QiId }) => {
    let editor = new Editor({
        extensions: [StarterKit],
        content: "Hello world",
        editable: false,
    })

    useEffect(() => {
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
            const nodeContent = (referencedNode as ProseMirrorNode).content.toJSON()
            editor.commands.setContent(nodeContent)
        }
    }, [props])

    return <EditorContent editor={editor} style={{border: `1px solid black`, borderRadius: 5}}/>
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
                {console.log("textContent", props.node.textContent)}
                <Portal editor={props.editor} referencedQiId={props.node.textContent}/>
            </NodeViewWrapper>
          );
        });
      },
})
