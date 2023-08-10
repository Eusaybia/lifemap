import { Editor, Node, findParentNode, mergeAttributes, nodeInputRule, wrappingInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Message } from './Message';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import React from 'react';
import { blue } from '../Theme';

export const MessageExtension = Node.create({
    name: 'message',
    group: 'block',
    content: 'inline*',
    selectable: true,
    addAttributes() {
        return {
            backgroundColor: {
                default: blue,
                parseHTML: element => ({
                    backgroundColor: element.style.backgroundColor,
                }),
                renderHTML: attributes => ({
                    style: `background-color: ${attributes.backgroundColor}`,
                }),
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'message',
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ['message', mergeAttributes(HTMLAttributes), 0];
    },
    addInputRules() {
        return [
            // TODO: make the Regex rule, "" which automatically converts to a single chat message
            // Whoever, creates the message will automatically add a avatar assigning the message to them
            nodeInputRule({
                find: /''([^'']*)''/,
                type: this.type,
                getAttributes: (match) => {
                    console.log(match)
                    return {
                        // TODO: This isn't even properly added to attributes
                        textContent: match[1],
                    };
                }
            }),
        ];
    },
    addKeyboardShortcuts() {
        return {
            Enter: ({ editor }) => {
                const { selection } = editor.state;
                const messageNode = findParentNode(node => node.type.name === 'message')(selection);
    
                if (messageNode) {
                    // Insert a mention tag at the current cursor position
                    editor.commands.insertContent(' ')
                    editor.commands.insertContent({
                        type: 'mention',
                        attrs: {
                            id: 'mention-id',
                            label: '↪️ needs reply'
                        }
                    });
                    // Move the cursor to the position after the message node
                    // TODO: THis doesn't cover the case of if there are new lines after the message - so kind of hacky
                    // TODO: THis doesn't work if there;s actually no space after the message node
                    let newPosition = selection.$from.after(messageNode.depth) + 2;
                    editor.commands.setTextSelection(newPosition)

                    return true;
                }
    
                return false;
            }
        }
    },
    // addKeyboardShortcuts() {
    //     return {
    //         Enter: ({ editor }) => {
    //             const { selection } = editor.state;
    //             const messageNode = selection.$from.node(1);
    //             console.log("mn", messageNode)

    //             if (messageNode && messageNode.type.name === 'message') {
    //                 // Insert a new mention node at the end of the message node
    //                 const endPosition = selection.$from.end(2);
    //                 editor.commands.insertContentAt(endPosition, {
    //                     type: 'mention',
    //                     attrs: {
    //                         id: 'mention-id',
    //                         label: 'needs reply'
    //                     }
    //                 });

    //                 // Move the cursor to the position after the message node
    //                 // TODO: This is kinda hacky, see if I can get after the message node without using magic variables like newPos + 2
    //                 const newPosition = selection.$from.after(2);
    //                 editor.commands.setTextSelection(newPosition + 2);
    //                 return true;
    //                }


    //             return false;
    //         }
    //     }
    // },
    addProseMirrorPlugins() {
        return [messageCursorPlugin];
    },
    addNodeView() {
        return ReactNodeViewRenderer((props: NodeViewProps) => {
            return <NodeViewWrapper>
                <Message backgroundColor={props.node.attrs.backgroundColor}>
                    {console.log(props.node)}
                    <NodeViewContent/>
                </Message>
            </NodeViewWrapper>
        });
    },
});


const messageCursorPlugin = new Plugin({
    key: new PluginKey('messageCursor'),
    view: () => ({
        update: (view) => {
            const { state } = view;
            const { selection } = state;
            const messageNode = state.doc.nodeAt(selection.from);

            if (messageNode && messageNode.type.name === 'message') {
                // Set the cursor position to the end of the message node
                const endPosition = selection.from + messageNode.nodeSize - 1;
                view.dispatch(
                    state.tr.setSelection(
                        TextSelection.create(state.doc, endPosition)
                    )
                );
            }
        },
    }),
});