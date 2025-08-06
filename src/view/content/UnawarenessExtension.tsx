import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    unawarenessAura: {
      /**
       * Toggle unawareness aura using highlight
       */
      toggleUnawarenessAura: () => ReturnType
    }
  }
}

export const UnawarenessExtension = Extension.create({
  name: 'unawarenessAura',

  addCommands() {
    return {
      toggleUnawarenessAura:
        () =>
        ({ commands, state, editor }) => {
          const { from, to } = state.selection
          
          // Check if there's selected text
          if (from === to) {
            return false
          }

          // Check if already has unawareness highlight
          const isActive = editor.isActive('highlight', { color: 'var(--tt-color-unawareness)' })
          
          if (isActive) {
            // Remove unawareness aura
            return commands.unsetHighlight()
          } else {
            // Apply unawareness aura
            return commands.setHighlight({ color: 'var(--tt-color-unawareness)' })
          }
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-F6': () => this.editor.commands.toggleUnawarenessAura(),
    }
  },
})