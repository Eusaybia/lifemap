import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ImageOptions } from "@tiptap/extension-image";
import { Image as TiptapImage } from "@tiptap/extension-image";

import { ImageNodeView } from "./image-node-view";

export const Image = TiptapImage.extend<ImageOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
      },
      "data-align": {
        default: null,
      },
      "data-offset-x": {
        default: null,
      },
      "data-offset-y": {
        default: null,
      },
      "data-upload-id": {
        default: null,
      },
      "data-uploading": {
        default: null,
      },
      "data-upload-name": {
        default: null,
      },
      "data-upload-error": {
        default: null,
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView, {
      stopEvent: (props) => {
        if (/dragstart|dragover|dragend|drop/.test(props.event.type)) {
          return false;
        }

        return !/mousedown|drag|drop/.test(props.event.type);
      },
    });
  },
});

export default Image;
