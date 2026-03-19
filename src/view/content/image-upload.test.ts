// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { promptAndUploadImage } from "./image-upload";

type FakeImageNode = {
  type: { name: string };
  attrs: Record<string, unknown>;
  nodeSize: number;
};

type FakeTransaction =
  | { type: "setNodeMarkup"; attrs: Record<string, unknown> }
  | { type: "delete" };

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createEditorDouble() {
  let currentNode: FakeImageNode | null = null;

  const chainApi = {
    focus() {
      return chainApi;
    },
    insertContent(content: { type: string; attrs: Record<string, unknown> }) {
      currentNode = {
        type: { name: content.type },
        attrs: content.attrs,
        nodeSize: 1,
      };

      return chainApi;
    },
    run() {
      return true;
    },
  };

  const editor = {
    chain: () => chainApi,
    state: {
      doc: {
        descendants(
          callback: (node: FakeImageNode, pos: number) => boolean | void,
        ) {
          if (!currentNode) {
            return;
          }

          callback(currentNode, 0);
        },
      },
      tr: {
        setNodeMarkup(
          _pos: number,
          _type: unknown,
          attrs: Record<string, unknown>,
        ): FakeTransaction {
          return { type: "setNodeMarkup", attrs };
        },
        delete(_from: number, _to: number): FakeTransaction {
          return { type: "delete" };
        },
      },
    },
    view: {
      dispatch(transaction: FakeTransaction) {
        if (transaction.type === "setNodeMarkup" && currentNode) {
          currentNode = {
            ...currentNode,
            attrs: transaction.attrs,
          };
          return;
        }

        if (transaction.type === "delete") {
          currentNode = null;
        }
      },
    },
  };

  return {
    editor,
    getImageNode: () => currentNode,
  };
}

function captureCreatedFileInput() {
  let createdInput: HTMLInputElement | null = null;
  const originalCreateElement = document.createElement.bind(document);

  const createElementSpy = vi
    .spyOn(document, "createElement")
    .mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);

      if (tagName.toLowerCase() === "input") {
        createdInput = element as HTMLInputElement;
      }

      return element;
    }) as typeof document.createElement);

  return {
    createElementSpy,
    getCreatedInput() {
      if (!createdInput) {
        throw new Error("Expected promptAndUploadImage to create a file input");
      }

      return createdInput;
    },
  };
}

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalInputClick = HTMLInputElement.prototype.click;

describe("promptAndUploadImage", () => {
  beforeEach(() => {
    vi.stubGlobal("alert", vi.fn());
    (URL as typeof URL & {
      createObjectURL: (object: Blob) => string;
      revokeObjectURL: (url: string) => void;
    }).createObjectURL = vi.fn(() => "blob:preview-image");
    (URL as typeof URL & {
      createObjectURL: (object: Blob) => string;
      revokeObjectURL: (url: string) => void;
    }).revokeObjectURL = vi.fn();
    HTMLInputElement.prototype.click = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    HTMLInputElement.prototype.click = originalInputClick;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("marks the inserted image node as uploading before the upload resolves", async () => {
    const uploadResponse = createDeferred<{
      ok: boolean;
      json: () => Promise<{ url: string }>;
    }>();
    const fetchMock = vi.fn(() => uploadResponse.promise);
    vi.stubGlobal("fetch", fetchMock);

    const { editor, getImageNode } = createEditorDouble();
    const { getCreatedInput } = captureCreatedFileInput();
    const file = new File(["image-bytes"], "avatar.png", {
      type: "image/png",
    });

    expect(promptAndUploadImage(editor as never)).toBe(true);

    const input = getCreatedInput();
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });

    const changePromise = input.onchange?.({ target: input } as unknown as Event);

    expect(fetchMock).toHaveBeenCalledWith("/api/upload?filename=avatar.png", {
      method: "POST",
      body: file,
    });
    expect(getImageNode()?.attrs["data-uploading"]).toBe("true");
    expect(getImageNode()?.attrs["data-upload-name"]).toBe("avatar.png");
    expect(getImageNode()?.attrs.src).toBe("blob:preview-image");

    uploadResponse.resolve({
      ok: true,
      json: vi.fn().mockResolvedValue({
        url: "https://example.com/avatar.png",
      }),
    });

    await changePromise;

    expect(getImageNode()?.attrs["data-uploading"]).toBeNull();
    expect(getImageNode()?.attrs["data-upload-id"]).toBeNull();
    expect(getImageNode()?.attrs["data-upload-name"]).toBeNull();
    expect(getImageNode()?.attrs.src).toBe("https://example.com/avatar.png");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-image");
  });

  it("removes the placeholder and alerts when the upload fails", async () => {
    const uploadResponse = createDeferred<{
      ok: boolean;
      json: () => Promise<{ error: string }>;
    }>();
    const fetchMock = vi.fn(() => uploadResponse.promise);
    const alertMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("alert", alertMock);

    const { editor, getImageNode } = createEditorDouble();
    const { getCreatedInput } = captureCreatedFileInput();
    const file = new File(["image-bytes"], "broken.png", {
      type: "image/png",
    });

    promptAndUploadImage(editor as never);

    const input = getCreatedInput();
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });

    const changePromise = input.onchange?.({ target: input } as unknown as Event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getImageNode()?.attrs["data-uploading"]).toBe("true");

    uploadResponse.resolve({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: "Upload failed upstream",
      }),
    });

    await changePromise;

    expect(getImageNode()).toBeNull();
    expect(alertMock).toHaveBeenCalledWith(
      "Failed to upload image: Upload failed upstream",
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-image");
  });
});
