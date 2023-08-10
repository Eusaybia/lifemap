import Link, { LinkOptions } from '@tiptap/extension-link'
import { Command, Editor, KeyboardShortcutCommand } from '@tiptap/core'

export const CustomLink = Link.extend({
  addKeyboardShortcuts(): Record<string, KeyboardShortcutCommand> {
    return {
      'Mod-k': () => {
        const href = prompt('URL')
        if (href) {
          this.editor.commands.setLink({ href })
        }
        return true
      },
    }
  },
})
