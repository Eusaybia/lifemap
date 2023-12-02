import { Editor, EditorContent, NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer, wrappingInputRule } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Node, NodeViewRenderer, NodeViewRendererProps } from '@tiptap/react'
import { Editor as CoreEditor } from '@tiptap/core'
import React, { useEffect, useState } from 'react'
import { Attrs, Node as ProseMirrorNode } from 'prosemirror-model'
import { QuantaId } from '../../core/Model'
import { CustomisedEditor } from '../content/RichText'
import { debounce } from 'lodash'

const REGEX_BLOCK_TILDE = /~[^~]+~/

// TODO: Ideally, there shouldn't be a CoreEditor and Editor, it should be the same time. Mismatch should not be happening
const Portal = (props: { editor: CoreEditor, referencedQuantaId: QuantaId }) => {
    const [editor, setEditor] = React.useState(CustomisedEditor("Content has not been updated to match the referenced node.", true))
    console.log("editor", editor)


    useEffect(() => {
        const updateContent = () => {
            if (!editor) return

            let referencedNode: ProseMirrorNode | undefined = undefined;

            props.editor.state.doc.descendants(descendant => {
                if (descendant.attrs.quantaId === props.referencedQuantaId) {
                    referencedNode = descendant
                }
            })

            if (!referencedNode) {
                editor.commands.setContent("Couldn't find referenced quanta. Are you sure the id you're using is a valid one?")
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
        const debouncedUpdateContent = debounce(updateContent, 2000)
        props.editor.on('update', debouncedUpdateContent)

    }, [props, editor])

    return (
        <EditorContent editor={editor} style={{ border: `2px dashed grey`, borderRadius: 5, minHeight: 20, padding: 10 }} />
    )
}

export const PortalExtension = Node.create({
    name: 'portal',
    group: 'block',
    content: "block*",
    atom: true,
    addAttributes() {
        return {
            referencedQuantaId: {
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
    }, addInputRules() {
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
                    <div style={{ border: `1.5px solid grey`, borderRadius: 4, padding: 10, marginBottom: 2, width: "100px", height: "10px", overflow: "hidden", fontSize: 12, flexWrap: "nowrap" }}>
                        <NodeViewContent />
                    </div>
                    <Portal editor={props.editor} referencedQuantaId={props.node.textContent} />
                </NodeViewWrapper>
            );
        });
    },
})
