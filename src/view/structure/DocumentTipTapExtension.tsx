import { Extension } from '@tiptap/core';

export const defaultDocumentAttributeValues = {
    selectedFocusLens: { default: "editing" },
    selectedHideIrrelevantEventsNodes: { default: 'wedding' },
}

export const DocumentExtension = Extension.create({
    name: 'document',
    addAttributes() {
        // This works the same as the node level attributes that contain selected lens information, but this time it's at the document level
        return defaultDocumentAttributeValues;
    },
});