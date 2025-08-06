import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    confusionAura: {
      /**
       * Toggle confusion aura
       */
      toggleConfusionAura: () => ReturnType
    }
  }
}

export const ConfusionAuraExtension = Extension.create({
  name: 'confusionAura',

  addCommands() {
    return {
      toggleConfusionAura:
        () =>
        ({ commands }) => {
          const greyColor = 'var(--tt-color-highlight-gray)'
          return commands.toggleMark('highlight', { color: greyColor })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-/': () => this.editor.commands.toggleConfusionAura(),
    }
  },
})