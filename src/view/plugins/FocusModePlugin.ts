import { Extension } from '@tiptap/core'

export const FocusModePlugin = Extension.create({
    name: 'focusMode',

    addOptions() {
        return {
            focusModeEnabled: false,
        }
    },

    addCommands() {
        return {
            toggleFocusMode: 
                () => 
                ({ editor }) => {
                    // Toggle the focus mode state
                    const currentState = this.options.focusModeEnabled
                    this.options.focusModeEnabled = !currentState
                    return true
                },
        }
    },
})