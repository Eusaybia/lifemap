import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clarityAura: {
      /**
       * Toggle clarity aura using highlight
       */
      toggleClarityAura: () => ReturnType
    }
  }
}

export const ClarityMarkExtension = Extension.create({
  name: 'clarityAura',

  addCommands() {
    return {
      toggleClarityAura:
        () =>
        ({ commands, state, editor }) => {
          const { from, to } = state.selection
          
          // Check if there's selected text
          if (from === to) {
            return false
          }

          // Check if already has clarity highlight
          const isActive = editor.isActive('highlight', { color: 'var(--tt-color-clarity)' })
          
          if (isActive) {
            // Remove clarity aura
            return commands.unsetHighlight()
          } else {
            // Apply clarity aura
            return commands.setHighlight({ color: 'var(--tt-color-clarity)' })
          }
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-F4': () => this.editor.commands.toggleClarityAura(),
    }
  },
})