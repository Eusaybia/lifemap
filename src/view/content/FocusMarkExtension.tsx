import { Mark, mergeAttributes } from '@tiptap/core'

export interface FocusOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    focus: {
      /**
       * Set a focus mark
       */
      setFocus: () => ReturnType
      /**
       * Toggle a focus mark
       */
      toggleFocus: () => ReturnType
      /**
       * Unset a focus mark
       */
      unsetFocus: () => ReturnType
    }
  }
}

export const FocusMarkExtension = Mark.create<FocusOptions>({
  name: 'focusMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {}
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-focus]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-focus': '',
        class: 'focus-mark',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setFocus:
        () =>
        ({ commands, state }) => {
          // Remove any existing focus marks first
          const { tr } = state
          let hasExistingFocus = false

          state.doc.descendants((node, pos) => {
            if (node.marks) {
              const focusMark = node.marks.find(mark => mark.type.name === 'focusMark')
              if (focusMark) {
                tr.removeMark(pos, pos + node.nodeSize, focusMark)
                hasExistingFocus = true
              }
            }
          })

          if (hasExistingFocus) {
            commands.command(({ dispatch }) => {
              if (dispatch) {
                dispatch(tr)
              }
              return true
            })
          }

          return commands.setMark(this.name)
        },

      toggleFocus:
        () =>
        ({ commands, state }) => {
          // Check if current selection has focus
          const { from, to } = state.selection
          const hasFocus = state.doc.rangeHasMark(from, to, state.schema.marks.focusMark)
          
          if (hasFocus) {
            return commands.unsetFocus()
          } else {
            return commands.setFocus()
          }
        },

      unsetFocus:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-F2': () => this.editor.commands.toggleFocus(),
    }
  },
})