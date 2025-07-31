import { Ai, getHTMLContentBetween } from '@tiptap-pro/extension-ai'

// Declare extension types if TypeScript is used.
// More info: https://tiptap.dev/docs/guides/typescript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    locationAi: {
      aiDetectLocations: (options?: any) => ReturnType,
    }
  }
}

export const LocationAiExtended = Ai.extend({
  addCommands() {
    return {
      ...this.parent?.(),

      aiDetectLocations:
        (options = {}) =>
        ({ editor, state }) => {
          console.log('aiDetectLocations command called');
          const { from, to } = state.selection
          let selectedText = getHTMLContentBetween(editor, from, to)
          console.log('Selected text:', selectedText);
          console.log('Selection range:', { from, to });

          // If no text is selected, use the entire document content
          if (!selectedText || selectedText.trim().length === 0) {
            console.log('No text selected, using entire document content');
            selectedText = editor.getHTML();
            
            if (!selectedText || selectedText.trim().length === 0) {
              console.warn('No content available for location detection');
              return false;
            }
          }

          const promptText = `Translate the following text to French and add some emojis: ${selectedText}`;
          console.log('📤 Calling aiTextPrompt...');
          console.log('📤 Full prompt being sent:', promptText);
          console.log('📤 Prompt length:', promptText.length);
          console.log('📤 Options passed:', options);
          
          return editor.commands.aiTextPrompt({
            text: promptText,
            ...options,
          })
        },
    }
  },
})