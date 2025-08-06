import { Mark, mergeAttributes } from '@tiptap/core'

export interface ClarityOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clarity: {
      /**
       * Set a clarity mark
       */
      setClarity: () => ReturnType
      /**
       * Toggle a clarity mark
       */
      toggleClarity: () => ReturnType
      /**
       * Unset a clarity mark
       */
      unsetClarity: () => ReturnType
    }
  }
}

export const ClarityMarkExtension = Mark.create<ClarityOptions>({
  name: 'clarityMark',

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
        tag: 'mark[data-clarity]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-clarity': '',
        class: 'clarity-mark',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setClarity:
        () =>
        ({ commands, state }) => {
          // Remove any existing clarity marks first
          const { tr } = state
          let hasExistingClarity = false

          state.doc.descendants((node, pos) => {
            if (node.marks) {
              const clarityMark = node.marks.find(mark => mark.type.name === 'clarityMark')
              if (clarityMark) {
                tr.removeMark(pos, pos + node.nodeSize, clarityMark)
                hasExistingClarity = true
              }
            }
          })

          if (hasExistingClarity) {
            commands.command(({ dispatch }) => {
              if (dispatch) {
                dispatch(tr)
              }
              return true
            })
          }

          return commands.setMark(this.name)
        },

      toggleClarity:
        () =>
        ({ commands, state }) => {
          // Check if current selection has clarity
          const { from, to } = state.selection
          const hasClarity = state.doc.rangeHasMark(from, to, state.schema.marks.clarityMark)
          
          if (hasClarity) {
            return commands.unsetClarity()
          } else {
            return commands.setClarity()
          }
        },

      unsetClarity:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-F4': () => this.editor.commands.toggleClarity(),
    }
  },
})