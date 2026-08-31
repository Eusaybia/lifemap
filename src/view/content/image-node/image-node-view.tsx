import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

/**
 * Corner handles only, and the aspect ratio is never a choice.
 *
 * The image is laid out with `height: auto`, so its height is a function of its
 * width and there is no way to express a squashed image in the first place.
 * Edge handles would therefore be a lie: dragging the bottom edge could only
 * either do nothing or change the width, and neither is what the handle looks
 * like it promises. Corners are also what an image in an ordinary canvas app
 * offers, so this is the conventional shape rather than a reduced one.
 */
const HANDLES = [
  { key: "nw", x: 0, y: 0, cursor: "nwse-resize", grow: -1 },
  { key: "ne", x: 1, y: 0, cursor: "nesw-resize", grow: 1 },
  { key: "sw", x: 0, y: 1, cursor: "nesw-resize", grow: -1 },
  { key: "se", x: 1, y: 1, cursor: "nwse-resize", grow: 1 },
] as const;

/** Small enough to be a thumbnail, large enough to still be grabbable. */
const MIN_WIDTH = 48;

function parseNodeStringAttr(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ImageNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor } = props;
  const isUploading = node.attrs["data-uploading"] === "true";
  const uploadName = parseNodeStringAttr(node.attrs["data-upload-name"]);
  const uploadError = parseNodeStringAttr(node.attrs["data-upload-error"]);
  const width =
    typeof node.attrs.width === "number" || typeof node.attrs.width === "string"
      ? node.attrs.width
      : undefined;

  const imgRef = useRef<HTMLImageElement | null>(null);
  /*
   * The width being dragged, held here rather than written to the node on every
   * pointer move. A resize is one edit, not sixty: committing per frame would
   * fill the undo stack with intermediate widths and, under collaboration, send
   * a document update per frame to every peer. The node attribute is written
   * once on release, and this drives the pixels until then.
   */
  const [draft, setDraft] = useState<number | null>(null);
  const drag = useRef<{ startX: number; startWidth: number; grow: number } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent, grow: number) => {
      const el = imgRef.current;
      if (!el) return;
      // The editor must not also treat this as a selection drag.
      event.preventDefault();
      event.stopPropagation();
      (event.target as Element).setPointerCapture?.(event.pointerId);
      drag.current = {
        startX: event.clientX,
        startWidth: el.getBoundingClientRect().width,
        grow,
      };
      setDraft(el.getBoundingClientRect().width);
    },
    []
  );

  useEffect(() => {
    if (draft === null) return;
    const move = (event: PointerEvent) => {
      const d = drag.current;
      const el = imgRef.current;
      if (!d || !el) return;
      /*
       * `grow` is +1 for the right-hand handles and -1 for the left. Dragging
       * the left edge outward means a DECREASING clientX, so without it the
       * left handles would shrink the image while being pulled to make it
       * bigger.
       */
      const next = d.startWidth + (event.clientX - d.startX) * d.grow;
      const parent = el.parentElement?.parentElement;
      // Never wider than the column, which is what `maxWidth: 100%` enforces
      // visually; clamping here keeps the committed number honest too.
      const max = parent ? parent.getBoundingClientRect().width : Infinity;
      setDraft(Math.max(MIN_WIDTH, Math.min(next, max)));
    };
    const up = () => {
      const final = draft;
      drag.current = null;
      setDraft(null);
      if (final !== null) updateAttributes({ width: Math.round(final) });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [draft, updateAttributes]);

  // Handles only while the node is selected and the document is editable, so a
  // read-only card never shows grips it will not honour.
  const showHandles = selected && editor.isEditable;
  const renderedWidth = draft !== null ? `${Math.round(draft)}px` : width ?? "auto";

  return (
    <NodeViewWrapper
      style={{
        position: "relative",
        width: "100%",
        margin: "12px 0",
      }}
    >
      {/*
        TWO divs, and the split is load-bearing.

        The outer one positions the handles. The inner one clips the image to
        the rounded corners, which needs `overflow: hidden` — and that would
        also clip any handle sitting proud of the edge, which is where a resize
        grip belongs. Putting the grips outside the clip is the whole reason
        this is not one element.
      */}
      <div
        style={{
          position: "relative",
          display: "inline-block",
          maxWidth: "100%",
          verticalAlign: "top",
        }}
      >
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          background: "rgba(217, 199, 170, 0.16)",
        }}
      >
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          draggable={false}
          style={{
            display: "block",
            maxWidth: "100%",
            width: renderedWidth,
            height: "auto",
            opacity: isUploading || Boolean(uploadError) ? 0.58 : 1,
            filter: isUploading ? "saturate(0.92)" : "none",
            transition: "opacity 220ms ease, filter 220ms ease",
          }}
        />

        {(isUploading || uploadError) && (
          <div
            data-testid="image-upload-overlay"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: 20,
              textAlign: "center",
              color: "#fff",
              background:
                "linear-gradient(180deg, rgba(32, 24, 15, 0.28), rgba(32, 24, 15, 0.58))",
              animation:
                "lifemap-image-upload-overlay-fade-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            <style>
              {`@keyframes lifemap-image-upload-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes lifemap-image-upload-overlay-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes lifemap-image-upload-content-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}`}
            </style>

            {isUploading ? (
              <>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: "2px solid rgba(255, 255, 255, 0.38)",
                    borderTopColor: "#ffffff",
                    animation:
                      "lifemap-image-upload-content-fade-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1), lifemap-image-upload-spin 0.9s linear infinite",
                  }}
                />
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: 0.2,
                    animation:
                      "lifemap-image-upload-content-fade-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                >
                  Uploading image...
                </div>
              </>
            ) : (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: "rgba(190, 24, 24, 0.88)",
                  fontSize: 16,
                  fontWeight: 700,
                  animation:
                    "lifemap-image-upload-content-fade-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
              >
                !
              </div>
            )}

            {uploadName && (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.45,
                  maxWidth: 280,
                  opacity: 0.92,
                  animation:
                    "lifemap-image-upload-content-fade-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
              >
                {uploadName}
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.45,
                  maxWidth: 280,
                  color: "rgba(255, 232, 232, 0.96)",
                }}
              >
                {uploadError}
              </div>
            )}
          </div>
        )}

        </div>

        {showHandles && (
          <>
            {/*
              A ring around the image as well as the grips. Four dots alone
              read as decoration on a busy photograph; the outline is what says
              "this object is selected and has an extent".
            */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: "1px solid rgba(90, 140, 235, 0.9)",
                borderRadius: 14,
                pointerEvents: "none",
              }}
            />
            {HANDLES.map((h) => (
              <div
                key={h.key}
                onPointerDown={(event) => onPointerDown(event, h.grow)}
                style={{
                  position: "absolute",
                  left: h.x === 0 ? -5 : undefined,
                  right: h.x === 1 ? -5 : undefined,
                  top: h.y === 0 ? -5 : undefined,
                  bottom: h.y === 1 ? -5 : undefined,
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: "#fff",
                  border: "1px solid rgba(90, 140, 235, 0.95)",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.28)",
                  cursor: h.cursor,
                  // The grips have to stay grabbable while the wrapper clips
                  // the image's rounded corners.
                  zIndex: 2,
                  touchAction: "none",
                }}
              />
            ))}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
