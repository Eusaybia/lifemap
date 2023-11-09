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


// TODO: Detect grammatical variants of words, so I don't have to hardcode variants
const wordsCloselyRelatedToEmotions = ['excited', 'excite', 'magical']; 

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

          state.doc.descendants((node, pos) => {
              // Find all text strings that are related to emotions, and highlight them
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

              // Find all "important" tags and highlight them
              if (node.type.name) {
                  let importantMentionPos: any = null;
                  let importantMentionSize: any = null;

                  node.content.forEach((child, offset) => {
                      if (child.type.name === 'mention' && child.attrs.label.includes('important')) {
                          importantMentionPos = pos + 1 + offset;
                          importantMentionSize = child.nodeSize;
                      }
                  });

                  // Wrap this node with the highlight tag
                  if (importantMentionPos !== null) {
                      const from = importantMentionPos;
                      const to = from + importantMentionSize;
                      const highlightMark = schema.marks.highlight.create();

                      // Check if the "important" tag is already highlighted
                      const isAlreadyHighlighted = node.marks.some(mark => mark.type === highlightMarkType);

                      if (!isAlreadyHighlighted) {

                          dispatch(
                              state.tr
                                  .setSelection(TextSelection.create(state.doc, from, to))
                                  .addMark(from, to, highlightMark)
                          );
                      }


                  }
              }
          });
      }, 1000);
        },
    }),
});
