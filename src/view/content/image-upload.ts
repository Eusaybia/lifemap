import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type UploadingImageNodeMatch = {
  node: ProseMirrorNode;
  pos: number;
};

function createUploadId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function findUploadingImageNode(
  editor: Editor,
  uploadId: string,
): UploadingImageNodeMatch | null {
  let match: UploadingImageNodeMatch | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name === "image" &&
      node.attrs["data-upload-id"] === uploadId
    ) {
      match = { node, pos };
      return false;
    }

    return true;
  });

  return match;
}

function updateUploadingImageNode(
  editor: Editor,
  uploadId: string,
  attrsPatch: Record<string, unknown>,
): boolean {
  const match = findUploadingImageNode(editor, uploadId);
  if (!match) return false;

  const nextAttrs = {
    ...match.node.attrs,
    ...attrsPatch,
  };

  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(match.pos, undefined, nextAttrs),
  );

  return true;
}

function removeUploadingImageNode(editor: Editor, uploadId: string): boolean {
  const match = findUploadingImageNode(editor, uploadId);
  if (!match) return false;

  editor.view.dispatch(
    editor.state.tr.delete(match.pos, match.pos + match.node.nodeSize),
  );

  return true;
}

async function uploadImageFile(file: File): Promise<string> {
  const response = await fetch(
    `/api/upload?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      body: file,
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Upload failed");
  }

  const blob = await response.json();
  return blob.url;
}

function insertUploadingImagePlaceholder(
  editor: Editor,
  file: File,
  uploadId: string,
  previewUrl: string,
): boolean {
  return editor
    .chain()
    .focus()
    .insertContent({
      type: "image",
      attrs: {
        src: previewUrl,
        alt: file.name,
        title: file.name,
        "data-upload-id": uploadId,
        "data-uploading": "true",
        "data-upload-name": file.name,
        "data-upload-error": null,
      },
    })
    .run();
}

export function promptAndUploadImage(editor: Editor): boolean {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.setAttribute("data-testid", "image-upload-input");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  input.style.top = "0";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.appendChild(input);

  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      input.remove();
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert(
        `File size exceeds maximum allowed (${MAX_IMAGE_SIZE / (1024 * 1024)}MB)`,
      );
      input.remove();
      return;
    }

    const uploadId = createUploadId();
    const previewUrl = URL.createObjectURL(file);
    const inserted = insertUploadingImagePlaceholder(
      editor,
      file,
      uploadId,
      previewUrl,
    );

    if (!inserted) {
      URL.revokeObjectURL(previewUrl);
      input.remove();
      return;
    }

    try {
      const uploadedUrl = await uploadImageFile(file);
      updateUploadingImageNode(editor, uploadId, {
        src: uploadedUrl,
        alt: file.name,
        title: file.name,
        "data-upload-id": null,
        "data-uploading": null,
        "data-upload-name": null,
        "data-upload-error": null,
      });
    } catch (error) {
      removeUploadingImageNode(editor, uploadId);
      alert(
        `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      URL.revokeObjectURL(previewUrl);
      input.remove();
    }
  };

  input.addEventListener(
    "cancel",
    () => {
      input.remove();
    },
    { once: true },
  );

  input.click();
  return true;
}
