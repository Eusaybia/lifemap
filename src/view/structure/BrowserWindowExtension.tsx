import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NodeOverlay } from "../components/NodeOverlay";
import { Group } from "./Group";

const DEFAULT_IFRAME_HEIGHT = 360;
const MIN_IFRAME_HEIGHT = 160;
const MAX_IFRAME_HEIGHT = 720;
const sharedBorderRadius = 15;
const DESKTOP_SURFACE_INSET = {
  top: 44,
  right: 14,
  bottom: 14,
  left: 14,
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    browserWindow: {
      insertBrowserWindow: (attributes?: { url?: string; height?: number }) => ReturnType;
    };
  }
}

const normalizeUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  // Allow app-internal routes for embedded experiences (e.g. /spiritual-construct-landing).
  if (/^(\/|\.\/|\.\.\/)/.test(trimmed)) return trimmed;
  if (/^(https?:|about:|data:|blob:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const BrowserWindowNodeView: React.FC<NodeViewProps> = (props) => {
  const rawUrl = String(props.node.attrs.url || "");
  const resolvedUrl = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);
  const [inputValue, setInputValue] = useState(rawUrl);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const desktopApi = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    if (window.kairosDesktop) return window.kairosDesktop;
    try {
      return window.top?.kairosDesktop;
    } catch {
      return undefined;
    }
  }, []);
  const isDesktopSurfaceEnabled = Boolean(desktopApi?.isElectron);
  const [surfaceId, setSurfaceId] = useState(() => {
    const existingQuantaId = String(props.node.attrs.quantaId || "").trim();
    if (existingQuantaId) return `browser-window:${existingQuantaId}`;
    return `browser-window:tmp-${Math.random().toString(36).slice(2, 10)}`;
  });

  useEffect(() => {
    setInputValue(rawUrl);
  }, [rawUrl]);

  const storedHeight = Number(props.node.attrs.height);
  const iframeHeight = Number.isFinite(storedHeight)
    ? Math.min(Math.max(storedHeight, MIN_IFRAME_HEIGHT), MAX_IFRAME_HEIGHT)
    : DEFAULT_IFRAME_HEIGHT;
  const resolvedQuantaId = String(props.node.attrs.quantaId || "browser-window");
  const normalizedPartition = `browser-${resolvedQuantaId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  useEffect(() => {
    const existingQuantaId = String(props.node.attrs.quantaId || "").trim();
    if (!existingQuantaId) return;
    const canonical = `browser-window:${existingQuantaId}`;
    if (surfaceId === canonical) return;
    setSurfaceId(canonical);
  }, [props.node.attrs.quantaId, surfaceId]);

  const computeBounds = useCallback(() => {
    const hostElement = hostRef.current;
    if (!hostElement) return null;

    // Compute bounds relative to the top-level Electron BrowserWindow even when
    // the node is rendered inside nested same-origin iframes with CSS transforms.
    const rect = hostElement.getBoundingClientRect();
    let x = rect.left;
    let y = rect.top;
    let width = rect.width;
    let height = rect.height;

    try {
      let currentWindow: Window | null = window;
      while (currentWindow && currentWindow !== currentWindow.top) {
        const frameElement = currentWindow.frameElement as HTMLElement | null;
        if (!frameElement) break;
        const frameRect = frameElement.getBoundingClientRect();

        // When parent scenes scale/transform the iframe, BrowserView bounds must
        // include that scale or the native surface will drift and overshoot.
        const frameClientWidth = Math.max(frameElement.clientWidth, 1);
        const frameClientHeight = Math.max(frameElement.clientHeight, 1);
        const scaleX = frameRect.width / frameClientWidth;
        const scaleY = frameRect.height / frameClientHeight;

        x = frameRect.left + x * scaleX;
        y = frameRect.top + y * scaleY;
        width *= scaleX;
        height *= scaleY;
        currentWindow = currentWindow.parent;
      }
    } catch {
      // Cross-origin access should not happen in this app path, but if it does,
      // keep best-effort local-frame coordinates.
    }

    // BrowserView is rendered above the DOM layer, so map it to the inner
    // viewport region instead of the full node card (so URL chrome/frame keeps
    // visual ownership and the page appears contained).
    const insetWidth = Math.max(
      0,
      width - DESKTOP_SURFACE_INSET.left - DESKTOP_SURFACE_INSET.right,
    );
    const insetHeight = Math.max(
      0,
      height - DESKTOP_SURFACE_INSET.top - DESKTOP_SURFACE_INSET.bottom,
    );

    return {
      x: Math.round(x + DESKTOP_SURFACE_INSET.left),
      y: Math.round(y + DESKTOP_SURFACE_INSET.top),
      width: Math.round(insetWidth),
      height: Math.round(insetHeight),
    };
  }, []);

  const syncDesktopSurfaceBounds = useCallback(async () => {
    if (!isDesktopSurfaceEnabled || !desktopApi) return;
    const bounds = computeBounds();
    if (!bounds) return;

    const hasArea = bounds.width > 1 && bounds.height > 1;
    await desktopApi.surface.updateBounds({
      surfaceId,
      bounds: hasArea ? bounds : { ...bounds, width: 0, height: 0 },
    });
  }, [computeBounds, desktopApi, isDesktopSurfaceEnabled, surfaceId]);

  useEffect(() => {
    if (!isDesktopSurfaceEnabled || !desktopApi) return;
    let isDisposed = false;

    const createSurface = async () => {
      const bounds = computeBounds() ?? { x: 0, y: 0, width: 0, height: 0 };
      await desktopApi.surface.create({
        surfaceId,
        url: resolvedUrl || "about:blank",
        bounds,
        partition: normalizedPartition,
      });
      if (!isDisposed) {
        await syncDesktopSurfaceBounds();
      }
    };

    createSurface();

    return () => {
      isDisposed = true;
      desktopApi.surface.destroy({ surfaceId });
    };
  }, [
    computeBounds,
    desktopApi,
    isDesktopSurfaceEnabled,
    normalizedPartition,
    resolvedUrl,
    surfaceId,
    syncDesktopSurfaceBounds,
  ]);

  useEffect(() => {
    if (!isDesktopSurfaceEnabled || !desktopApi) return;
    if (!resolvedUrl) return;
    desktopApi.surface.navigate({ surfaceId, url: resolvedUrl });
  }, [desktopApi, isDesktopSurfaceEnabled, resolvedUrl, surfaceId]);

  useEffect(() => {
    if (!isDesktopSurfaceEnabled) return;
    let rafId: number | null = null;
    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        syncDesktopSurfaceBounds();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleSync);
    if (hostRef.current) resizeObserver.observe(hostRef.current);
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("scroll", scheduleSync, true);
    scheduleSync();

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("scroll", scheduleSync, true);
    };
  }, [isDesktopSurfaceEnabled, syncDesktopSurfaceBounds]);

  const commitInputValue = () => {
    if (inputValue === rawUrl) return;
    props.updateAttributes({ url: inputValue });
  };

  const handleOpenInNewTab = () => {
    if (!resolvedUrl) return;
    window.open(resolvedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <NodeViewWrapper>
      <NodeOverlay
        nodeProps={props}
        nodeType="browserWindow"
        backgroundColor="#ffffff"
      >
        <div
          contentEditable={false}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onBlur={commitInputValue}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitInputValue();
              }
            }}
            placeholder="https://www.notion.so"
            style={{
              flex: 1,
              border: "1.5px solid #34343430",
              borderRadius: sharedBorderRadius,
              outline: "none",
              backgroundColor: "transparent",
              padding: "2px 8px",
              fontSize: "12px",
              fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
            }}
          />
          <button
            type="button"
            onClick={handleOpenInNewTab}
            style={{
              border: "1px solid rgba(100,100,100,0.25)",
              borderRadius: 10,
              background: "#ffffff",
              padding: "3px 8px",
              fontSize: 11,
              lineHeight: 1,
              cursor: resolvedUrl ? "pointer" : "default",
              opacity: resolvedUrl ? 1 : 0.55,
            }}
            title="Open URL in new tab"
          >
            Open
          </button>
        </div>

        <Group lens="identity" quantaId={resolvedQuantaId}>
          <div contentEditable={false}>
            {isDesktopSurfaceEnabled ? (
              <div
                ref={hostRef}
                onPointerDown={() => {
                  desktopApi?.surface.focus({ surfaceId });
                }}
                style={{
                  width: "100%",
                  height: `${iframeHeight}px`,
                  border: "1px solid rgba(148, 163, 184, 0.45)",
                  borderRadius: 10,
                  background: "rgba(248, 250, 252, 0.88)",
                }}
              />
            ) : resolvedUrl ? (
              <iframe
                src={resolvedUrl}
                loading="lazy"
                style={{
                  width: "100%",
                  height: `${iframeHeight}px`,
                  border: "none",
                  borderRadius: 10,
                  background: "white",
                }}
                title={`Browser Window: ${resolvedUrl}`}
              />
            ) : (
              <div
                style={{
                  height: `${iframeHeight}px`,
                  display: "grid",
                  placeItems: "center",
                  border: "1px dashed rgba(100,100,100,0.35)",
                  borderRadius: 10,
                  color: "#666",
                  fontSize: 13,
                  textAlign: "center",
                  padding: 16,
                }}
              >
                Enter a URL in the top bar to load a browser window.
              </div>
            )}
          </div>
        </Group>
      </NodeOverlay>
    </NodeViewWrapper>
  );
};

const BrowserWindowExtension = Node.create({
  name: "browserWindow",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      id: { default: null },
      url: { default: "" },
      height: { default: DEFAULT_IFRAME_HEIGHT },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-browser-window="true"]' }];
  },

  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-browser-window": "true",
        "data-browser-url": node.attrs.url,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BrowserWindowNodeView);
  },

  addCommands() {
    return {
      insertBrowserWindow:
        (attributes?: { url?: string; height?: number }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              url: attributes?.url ?? "",
              height: attributes?.height ?? DEFAULT_IFRAME_HEIGHT,
            },
          }),
    };
  },
});

export { BrowserWindowExtension };
