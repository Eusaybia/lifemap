import { Editor, EditorContent, NodeViewContent, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer, wrappingInputRule } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Node, NodeViewRenderer, NodeViewRendererProps } from '@tiptap/react'
import { Editor as CoreEditor } from '@tiptap/core'
import React, { useEffect, useState } from 'react'
import { Attrs, Node as ProseMirrorNode } from 'prosemirror-model'
import { QuantaId } from '../../core/Model'
import { MainEditor, TransclusionEditor } from '../content/RichText'
import { debounce } from 'lodash'

const REGEX_BLOCK_TILDE = /~[^~]+~/

const sharedBorderRadius = 15

const Portal = (props: { editor: CoreEditor, referencedQuantaId: QuantaId }) => {
    const [transclusionEditor, setEditor] = React.useState(TransclusionEditor("Content has not been updated to match the referenced node.", true, true))

    const updateContent = () => {
        if (transclusionEditor) {
            console.log("portal has editor")

            let referencedNode: ProseMirrorNode | undefined = undefined;

            // Check all the nodes of the parent editor to see which one matches
            props.editor.state.doc.descendants(descendant => {
                // A match was found
                if (descendant.attrs.quantaId === props.referencedQuantaId) {
                    referencedNode = descendant
                }
            })

            // No match was found
            if (!referencedNode) {
                transclusionEditor.commands.setContent("Couldn't find referenced quanta. Are you sure the id you're using is a valid one?")
            }
            // A match was found
            else {
                // Copy the referencedNode
                const nodeContent = (referencedNode as ProseMirrorNode).toJSON()
                transclusionEditor.commands.setContent(nodeContent)
            }
        } else {
            console.error("TransclusionEditor in Portal was unable to initialise.")
        }
    }

    useEffect(() => {
        // Update the content initially
        updateContent()

        // Subscribe to changes in the editor state and update the content whenever the state changes
        const debouncedUpdateContent = debounce(updateContent, 1000)
        props.editor.on('update', debouncedUpdateContent)

    }, [props.editor, props.referencedQuantaId])

    return (
        <div style={{
            borderRadius: sharedBorderRadius,
            background: `#e0e0e0`,
            boxShadow: `inset 10px 10px 10px #bebebe,
            inset -10px -10px 10px #FFFFFF99`,
            minHeight: 20,
            padding: `11px 15px 11px 15px`,
            marginBottom: 10
        }}>
            <EditorContent editor={transclusionEditor} />
        </div>
    )
}

export const PortalExtension = Node.create({
    name: 'portal',
    group: 'block',
    content: "block*",
    atom: true,
    selectable: true,
    addAttributes() {
        return {
            referencedQuantaId: {
                default: undefined,
            },
            text: ""
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
        return ['transclusion', HTMLAttributes, 0]
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
            // On node instantiation, useState will draw from the node attributes
            // If the attributes are updated, this will re-render, therefore this state is always synced with the node attributes
            const [referencedQuantaId, setReferencedQuantaId] = useState(props.node.attrs.referencedQuantaId);

            // If the input is updated, this handler is called
            const handleReferencedQuantaIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                setReferencedQuantaId(event.target.value);
                props.updateAttributes({ referencedQuantaId: event.target.value });
            };

            // get node with id, referencedQuantaId
            // node.textContent
            // set attrs

            return (
                <NodeViewWrapper>
                    <input type="text" value={referencedQuantaId} onChange={handleReferencedQuantaIdChange} style={{ border: '1.5px solid #34343430', borderRadius: sharedBorderRadius, outline: 'none', backgroundColor: 'transparent', width: `80px`, position: "absolute", zIndex: 1 }} />
                    <Portal editor={props.editor} referencedQuantaId={referencedQuantaId} />
                </NodeViewWrapper>
            );
        });
    },
})
