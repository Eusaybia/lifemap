import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Extension } from '@tiptap/core';
import { openai } from './AI';
import { highlightGreen, purple } from '../view/Theme';
import { generatePrompt } from '../utils/Utils';

// The Finesse agent scans every added word to see if it's related to emotions.
export const Finesse = Extension.create({
    name: 'finesse',
    addProseMirrorPlugins() {
        return [FinesseAgent];
    },
});


const wordsCloselyRelatedToEmotions = ['excited', 'excite']; 

let debounceTimeout: any = null;

const FinesseAgent = new Plugin({
  key: new PluginKey('myPlugin'),
  view: () => ({
    update: (view) => {
      if (debounceTimeout) {
        return;
      }

      debounceTimeout = setTimeout(() => {
        debounceTimeout = null;
        const { state, dispatch } = view;
        const { schema } = state;
        const highlightMarkType = state.schema.marks.highlight;

        // Find all message nodes with a mention tag with the label "needs-reply"
        state.doc.descendants((node, pos) => {
          if (node.isText && !node.marks.some(mark => mark.type === highlightMarkType)) {
            wordsCloselyRelatedToEmotions.forEach((word) => {
              const regex = new RegExp(`\\b${word}\\b`, 'gi');
              let match;

              while ((match = regex.exec(node.text!)) !== null) {
                const from = pos + match.index;
                const to = from + match[0].length;

                dispatch(
                  state.tr
                    .setSelection(TextSelection.create(state.doc, from, to))
                    .addMark(from, to, schema.marks.highlight.create())
                );
              }
            });
          }
        });
      }, 1000);
    },
  }),
});
