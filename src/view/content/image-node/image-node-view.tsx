import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";

function parseNodeStringAttr(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function ImageNodeView(props: NodeViewProps) {
  const { node } = props;
  const isUploading = node.attrs["data-uploading"] === "true";
  const uploadName = parseNodeStringAttr(node.attrs["data-upload-name"]);
  const uploadError = parseNodeStringAttr(node.attrs["data-upload-error"]);
  const width =
    typeof node.attrs.width === "number" || typeof node.attrs.width === "string"
      ? node.attrs.width
      : undefined;

  return (
    <NodeViewWrapper
      style={{
        position: "relative",
        width: "100%",
        margin: "12px 0",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "inline-block",
          maxWidth: "100%",
          borderRadius: 14,
          overflow: "hidden",
          background: "rgba(217, 199, 170, 0.16)",
        }}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          style={{
            display: "block",
            maxWidth: "100%",
            width: width ?? "auto",
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
    </NodeViewWrapper>
  );
}
