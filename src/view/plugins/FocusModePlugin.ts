import { Extension } from '@tiptap/core'

export const FocusModePlugin = Extension.create({
    name: 'focusMode',

    addOptions() {
        return {
            focusModeEnabled: false,
        }
    },

    // @ts-ignore
    addCommands() {
        return {
            // @ts-ignore
            toggleFocus: ({ editor }) => {
                // Toggle the focus state
                editor.setOptions('focusMode', {
                    focusModeEnabled: !editor.options.focusMode.focusModeEnabled,
                });
            },
        };
    },
})