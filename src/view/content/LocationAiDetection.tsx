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
          const { from, to } = state.selection
          const selectedText = getHTMLContentBetween(editor, from, to)

          return editor.commands.aiTextPrompt({
            text: `Translate the following text to French: ${selectedText}`,
            ...options,
          })
        },
    }
  },
})