import { Extension } from '@tiptap/core';

const DocumentExtension = Extension.create({
    name: 'document',

    addAttributes() {
        // This works the same as the node level attributes that contain selected lens information, but this time it's at the document level
        return {
            selectedFocusLens: { default: "clear" },
            selectedHideIrrelevantEventsNodes: { default: 'wedding' },
        };
    },
});