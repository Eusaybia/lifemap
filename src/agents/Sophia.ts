import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '@tiptap/core';
import { openai } from './AI';
import { purple } from '../view/Theme';
import { generatePrompt } from '../utils/utils';

export const SophiaAI = Extension.create({
    name: 'myPlugin',
    addProseMirrorPlugins() {
        return [SophiaAIPlugin];
    },
});

let debounceTimeout: any = null;

const SophiaAIPlugin = new Plugin({
    key: new PluginKey('myPlugin'),
    view: () => ({
        update: (view) => {
            if (debounceTimeout) {
                return;
            }

            debounceTimeout = setTimeout(() => {
                debounceTimeout = null;
                const { state } = view;

                // Find all message nodes with a mention tag with the label "needs-reply"
                state.doc.descendants((node, pos) => {
                    if (node.type.name === 'message') {
                        let needsReplyMentionPos: any = null;
                        node.content.forEach((child, offset) => {
                            if (child.type.name === 'mention' && child.attrs.label.includes('needs reply')) {
                                needsReplyMentionPos = pos + 1 + offset;
                            }
                        });

                        if (needsReplyMentionPos !== null) {
                            console.log("Detected mention")
                            // Get the text of the detected message node
                            const messageText = node.textContent
                            console.log(`Message node text content: ${node.textContent}`);

                            // Create some AI generated text in response to the message node
                            openai.createChatCompletion({
                                model: "gpt-3.5-turbo",
                                messages: [{ role: "user", content: generatePrompt(messageText) }],
                            }).then((response: any) => {
                                const responseText = response.data.choices[0].message.content
                                console.log("response text", responseText)
                                // Change the label of the mention node to "replied"
                                const tr = view.state.tr;
                                const mentionNode = state.schema.nodes.mention.create({ ...node.attrs, label: 'replied' });
                                tr.replaceWith(needsReplyMentionPos, needsReplyMentionPos + 1, mentionNode);
                                // Insert a new message node after the current message node
                                tr.insert(pos + node.nodeSize, state.schema.nodes.message.create({backgroundColor: purple}, state.schema.text(responseText)))
                                view.dispatch(tr);
                            });
                        }
                    }
                });
            }, 1000);
        },
    }),
});
