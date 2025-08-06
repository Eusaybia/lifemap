import { Mark, mergeAttributes } from '@tiptap/core'

export interface BlockageOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockage: {
      /**
       * Set a blockage mark
       */
      setBlockage: () => ReturnType
      /**
       * Toggle a blockage mark
       */
      toggleBlockage: () => ReturnType
      /**
       * Unset a blockage mark
       */
      unsetBlockage: () => ReturnType
    }
  }
}

export const BlockageMarkExtension = Mark.create<BlockageOptions>({
  name: 'blockageMark',

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
        tag: 'mark[data-blockage]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-blockage': '',
        class: 'blockage-mark',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setBlockage:
        () =>
        ({ commands, state }) => {
          // Remove any existing blockage marks first
          const { tr } = state
          let hasExistingBlockage = false

          state.doc.descendants((node, pos) => {
            if (node.marks) {
              const blockageMark = node.marks.find(mark => mark.type.name === 'blockageMark')
              if (blockageMark) {
                tr.removeMark(pos, pos + node.nodeSize, blockageMark)
                hasExistingBlockage = true
              }
            }
          })

          if (hasExistingBlockage) {
            commands.command(({ dispatch }) => {
              if (dispatch) {
                dispatch(tr)
              }
              return true
            })
          }

          return commands.setMark(this.name)
        },

      toggleBlockage:
        () =>
        ({ commands, state }) => {
          // Check if current selection has blockage
          const { from, to } = state.selection
          const hasBlockage = state.doc.rangeHasMark(from, to, state.schema.marks.blockageMark)
          
          if (hasBlockage) {
            return commands.unsetBlockage()
          } else {
            return commands.setBlockage()
          }
        },

      unsetBlockage:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-F3': () => this.editor.commands.toggleBlockage(),
    }
  },
})