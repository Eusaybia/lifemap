import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NodeOverlay } from "../components/NodeOverlay";
import { Group } from "./Group";

const DEFAULT_IFRAME_HEIGHT = 360;
const DEFAULT_IFRAME_WIDTH = 760;
const MIN_IFRAME_HEIGHT = 160;
const MAX_IFRAME_HEIGHT = 2400;
const MIN_IFRAME_WIDTH = 360;
const MAX_IFRAME_WIDTH = 2400;
const DEFAULT_BROWSER_HOME = "https://kairoslifemap.com";
const RESIZE_GUTTER_SIZE = 18;
const DESKTOP_SURFACE_INSET = {
  top: 0,
  right: RESIZE_GUTTER_SIZE,
  bottom: RESIZE_GUTTER_SIZE,
  left: 0,
};

export type BrowserSurfaceState = {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  errorCode: number | null;
  errorDescription: string | null;
  failedUrl: string | null;
};

type BrowserSurfaceEventState = Partial<BrowserSurfaceState> & {
  surfaceId?: string;
  type?: string;
};

export const mergeBrowserSurfaceState = (
  current: BrowserSurfaceState,
  next: BrowserSurfaceEventState,
): BrowserSurfaceState => ({
  url: next.url ?? current.url,
  title: next.title ?? current.title,
  loading: typeof next.loading === "boolean" ? next.loading : current.loading,
  canGoBack: typeof next.canGoBack === "boolean" ? next.canGoBack : current.canGoBack,
  canGoForward: typeof next.canGoForward === "boolean" ? next.canGoForward : current.canGoForward,
  errorCode: typeof next.errorCode === "number" ? next.errorCode : next.errorCode === null ? null : current.errorCode,
  errorDescription:
    typeof next.errorDescription === "string"
      ? next.errorDescription
      : next.errorDescription === null
        ? null
        : current.errorDescription,
  failedUrl:
    typeof next.failedUrl === "string"
      ? next.failedUrl
      : next.failedUrl === null
        ? null
        : current.failedUrl,
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    browserWindow: {
      insertBrowserWindow: (attributes?: {
        url?: string;
        width?: number;
        height?: number;
        sessionPartition?: string;
      }) => ReturnType;
    };
  }
}

const normalizeUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  // Allow app-internal routes for embedded experiences (e.g. /spiritual-construct-landing).
  if (/^(\/|\.\/|\.\.\/)/.test(trimmed)) return trimmed;
  if (/^(https?:|about:|data:|blob:)/i.test(trimmed)) return trimmed;

  // Check if it's likely a URL: no spaces, and contains a dot or is localhost
  const isLikelyUrl = !/\s/.test(trimmed) && (trimmed.includes(".") || trimmed.startsWith("localhost:"));
  
  if (isLikelyUrl) {
    return `https://${trimmed}`;
  }
  
  // Otherwise, treat it as a search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
};

const generateBrowserSessionPartitionId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `browser-session-${crypto.randomUUID()}`;
  }
  return `browser-session-${Math.random().toString(36).slice(2, 10)}`;
};

const isIgnorableSurfaceError = (value: unknown): boolean => {
  const message =
    typeof value === "string"
      ? value
      : value instanceof Error
        ? value.message
        : String(value ?? "");

  return [
    "ERR_ABORTED",
    "ERR_FAILED",
    "No handler registered",
    "surface not found",
  ].some((fragment) => message.includes(fragment));
};

const logBrowserWindowFailure = (message: string, details?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  const payload = details ? JSON.stringify(details) : "";
  console.warn(`[BrowserWindowExtension] ${message}${payload ? ` ${payload}` : ""}`);
};

const BrowserWindowNodeView: React.FC<NodeViewProps> = (props) => {
  const rawUrl = String(props.node.attrs.url || "");
  const resolvedUrl = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);
  const [inputValue, setInputValue] = useState(rawUrl);
  const [isEditingAddressBar, setIsEditingAddressBar] = useState(false);
  const [draftIframeWidth, setDraftIframeWidth] = useState<number | null>(null);
  const [draftIframeHeight, setDraftIframeHeight] = useState<number | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const [browserState, setBrowserState] = useState<BrowserSurfaceState>(() => ({
    url: "",
    title: "",
    loading: false,
    canGoBack: false,
    canGoForward: false,
    errorCode: null,
    errorDescription: null,
    failedUrl: null,
  }));
  const browserStateRef = useRef<BrowserSurfaceState>({
    url: "",
    title: "",
    loading: false,
    canGoBack: false,
    canGoForward: false,
    errorCode: null,
    errorDescription: null,
    failedUrl: null,
  });
  const [isUserVisibleLoading, setIsUserVisibleLoading] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const lastSentBoundsKeyRef = useRef<string | null>(null);
  const lastPersistedSurfaceUrlRef = useRef<string | null>(rawUrl.trim() || null);
  const syncInFlightRef = useRef(false);
  const surfaceHasErrorRef = useRef(false);
  const reloadRequestedRef = useRef(false);
  const pendingSurfaceNavigationRef = useRef<{
    targetUrl: string;
    sourceUrl: string | null;
  } | null>(null);
  const desktopApi = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    if (window.kairosDesktop) return window.kairosDesktop;
    try {
      return window.top?.kairosDesktop;
    } catch {
      return undefined;
    }
  }, []);
  const surfaceApi = desktopApi?.surface;
  const hasRequiredSurfaceApi =
    typeof surfaceApi?.create === "function" &&
    typeof surfaceApi?.navigate === "function" &&
    typeof surfaceApi?.updateBounds === "function" &&
    typeof surfaceApi?.destroy === "function";
  const hasSurfaceStateApi = typeof surfaceApi?.getState === "function";
  const hasSurfaceBackApi = typeof surfaceApi?.goBack === "function";
  const hasSurfaceForwardApi = typeof surfaceApi?.goForward === "function";
  const hasSurfaceReloadApi = typeof surfaceApi?.reload === "function";
  const hasSurfaceStopApi = typeof surfaceApi?.stop === "function";
  const isDesktopSurfaceEnabled = Boolean(desktopApi?.isElectron && hasRequiredSurfaceApi);
  const [surfaceLifecycleState, setSurfaceLifecycleState] = useState<"idle" | "ready" | "failed">("idle");
  const [isInsideGraphNode, setIsInsideGraphNode] = useState(false);

  const runSurfaceRequest = useCallback(
    async <T extends KairosSurfaceRequestResult | KairosSurfaceStateResult>(
      request: () => Promise<T>,
    ): Promise<T | null> => {
      try {
        const result = await request();
        if (!result.ok) {
          if (!isIgnorableSurfaceError(result.error)) {
            console.warn("[BrowserWindowExtension] Surface request failed:", result.error);
          }
          return null;
        }
        return result;
      } catch (error) {
        if (!isIgnorableSurfaceError(error)) {
          console.warn("[BrowserWindowExtension] Surface request threw:", error);
        }
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!isEditingAddressBar) {
      setInputValue(rawUrl);
    }
    lastPersistedSurfaceUrlRef.current = rawUrl.trim() || null;
  }, [isEditingAddressBar, rawUrl]);

  useEffect(() => {
    if (!browserState.url) return;
    if (!isEditingAddressBar) {
      setInputValue(browserState.url);
    }
  }, [browserState.url, isEditingAddressBar]);

  useEffect(() => {
    surfaceHasErrorRef.current = Boolean(browserState.errorDescription);
  }, [browserState.errorDescription]);

  useEffect(() => {
    browserStateRef.current = browserState;
  }, [browserState]);

  useEffect(() => {
    if (isDesktopSurfaceEnabled) return;
    setBrowserState((current) => {
      const nextState = {
        ...current,
        url: resolvedUrl,
      };
      browserStateRef.current = nextState;
      return nextState;
    });
  }, [isDesktopSurfaceEnabled, resolvedUrl]);

  const persistSurfaceUrlAttribute = useCallback(
    (nextUrl: string | null | undefined) => {
      const trimmedNextUrl = String(nextUrl ?? "").trim();
      if (!trimmedNextUrl) return;
      if (trimmedNextUrl === lastPersistedSurfaceUrlRef.current) return;
      lastPersistedSurfaceUrlRef.current = trimmedNextUrl;
      props.updateAttributes({ url: trimmedNextUrl });
    },
    [props],
  );

  const reconcileSurfaceUrlAttribute = useCallback(
    (nextUrl: string | null | undefined) => {
      const trimmedNextUrl = String(nextUrl ?? "").trim();
      if (!trimmedNextUrl) return;
      if (surfaceHasErrorRef.current) return;

      const pendingNavigation = pendingSurfaceNavigationRef.current;
      if (pendingNavigation) {
        const sourceUrl = String(pendingNavigation.sourceUrl ?? "").trim();
        if (sourceUrl && trimmedNextUrl === sourceUrl) {
          return;
        }
        pendingSurfaceNavigationRef.current = null;
      }

      persistSurfaceUrlAttribute(trimmedNextUrl);
    },
    [persistSurfaceUrlAttribute],
  );

  const applySurfaceState = useCallback(
    (nextState: BrowserSurfaceState) => {
      browserStateRef.current = nextState;
      setBrowserState(nextState);
      reconcileSurfaceUrlAttribute(nextState.url);
      if (!nextState.loading) {
        reloadRequestedRef.current = false;
        setIsUserVisibleLoading(false);
      } else if (pendingSurfaceNavigationRef.current || reloadRequestedRef.current) {
        setIsUserVisibleLoading(true);
      }
    },
    [reconcileSurfaceUrlAttribute],
  );

  const mergeSurfaceEventState = useCallback(
    (event: BrowserSurfaceEventState) => {
      const nextState = mergeBrowserSurfaceState(browserStateRef.current, event);
      browserStateRef.current = nextState;
      setBrowserState(nextState);
      if (event.type !== "loadError") {
        reconcileSurfaceUrlAttribute(nextState.url);
      }
    },
    [reconcileSurfaceUrlAttribute],
  );

  const storedHeight = Number(props.node.attrs.height);
  const iframeHeight = Number.isFinite(storedHeight)
    ? Math.min(Math.max(storedHeight, MIN_IFRAME_HEIGHT), MAX_IFRAME_HEIGHT)
    : DEFAULT_IFRAME_HEIGHT;
  const storedWidth = Number(props.node.attrs.width);
  const iframeWidth = Number.isFinite(storedWidth)
    ? Math.min(Math.max(storedWidth, MIN_IFRAME_WIDTH), MAX_IFRAME_WIDTH)
    : null;
  const shellWidth = draftIframeWidth ?? iframeWidth ?? DEFAULT_IFRAME_WIDTH;
  const shellHeight = draftIframeHeight ?? iframeHeight;
  const contentViewportWidth = Math.max(
    MIN_IFRAME_WIDTH,
    shellWidth - (!isInsideGraphNode ? RESIZE_GUTTER_SIZE : 0),
  );
  const contentViewportHeight = Math.max(
    MIN_IFRAME_HEIGHT,
    shellHeight - (!isInsideGraphNode ? RESIZE_GUTTER_SIZE : 0),
  );
  const resolvedQuantaId = String(props.node.attrs.quantaId || "browser-window");
  const explicitPartitionKey = String(props.node.attrs.sessionPartition || "").trim();
  const stableSurfaceKey = explicitPartitionKey || String(props.node.attrs.quantaId || "").trim();
  const surfaceId = stableSurfaceKey ? `browser-window:${stableSurfaceKey}` : null;
  const normalizedPartition = `browser-${(explicitPartitionKey || resolvedQuantaId).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const targetDesktopUrl = resolvedUrl || DEFAULT_BROWSER_HOME;

  // Sync iframe height with React Flow node height if we are inside one
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nodeElement = hostRef.current?.closest(".react-flow__node") as HTMLElement | null;
    if (!nodeElement) return;
    
    setIsInsideGraphNode(true);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Only sync if the React Flow node has a fixed height (user is resizing it)
        const hasFixedHeight = nodeElement.style.height && nodeElement.style.height !== "auto";
        if (!hasFixedHeight) continue;

        const nodeHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        
        // The browser window has about 133px of vertical chrome/margins
        // (24px ProseMirror padding + 48px margin + 8px wrapper padding + 52px header + 1px borders)
        const CHROME_HEIGHT = 133;
        const targetIframeHeight = Math.max(MIN_IFRAME_HEIGHT, Math.min(nodeHeight - CHROME_HEIGHT, MAX_IFRAME_HEIGHT));
        
        if (Math.abs(targetIframeHeight - iframeHeight) > 2) {
          props.updateAttributes({ height: targetIframeHeight });
        }
      }
    });

    observer.observe(nodeElement);
    return () => observer.disconnect();
  }, [iframeHeight, props]);

  useEffect(() => {
    if (explicitPartitionKey) return;
    props.updateAttributes({
      sessionPartition: generateBrowserSessionPartitionId(),
    });
  }, [explicitPartitionKey, props]);

  useEffect(() => {
    lastSentBoundsKeyRef.current = null;
    setSurfaceLifecycleState("idle");
  }, [surfaceId]);

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

  const syncDesktopSurfaceBounds = useCallback(async (force: boolean = false) => {
    if (!isDesktopSurfaceEnabled || !desktopApi) return;
    if (!surfaceId) return;
    if (surfaceLifecycleState !== "ready") return;
    if (syncInFlightRef.current) return;

    const bounds = computeBounds();
    if (!bounds) return;

    const shouldHideForError = surfaceHasErrorRef.current;
    const hasArea = !shouldHideForError && bounds.width > 1 && bounds.height > 1;
    const nextBounds = hasArea ? bounds : { ...bounds, width: 0, height: 0 };
    const nextKey = `${nextBounds.x}:${nextBounds.y}:${nextBounds.width}:${nextBounds.height}`;
    if (!force && nextKey === lastSentBoundsKeyRef.current) return;

    syncInFlightRef.current = true;
    try {
      const result = await runSurfaceRequest(() => desktopApi.surface.updateBounds({
        surfaceId,
        bounds: nextBounds,
      }));
      if (!result) return;
      lastSentBoundsKeyRef.current = nextKey;
    } finally {
      syncInFlightRef.current = false;
    }
  }, [computeBounds, desktopApi, isDesktopSurfaceEnabled, runSurfaceRequest, surfaceId, surfaceLifecycleState]);

  useEffect(() => {
    if (!isDesktopSurfaceEnabled || !desktopApi) {
      setSurfaceLifecycleState("idle");
      return;
    }
    if (!surfaceId) {
      setSurfaceLifecycleState("idle");
      return;
    }
    let isDisposed = false;
    let waitFrameId: number | null = null;

    const createSurface = async () => {
      const initialBounds = computeBounds() ?? { x: 0, y: 0, width: 0, height: 0 };
      const result = await runSurfaceRequest(() => desktopApi.surface.create({
        surfaceId,
        bounds: initialBounds,
        partition: normalizedPartition,
      }));
      if (isDisposed) return;
      if (!result) {
        setSurfaceLifecycleState("failed");
        return;
      }

      const settledBounds = await new Promise<typeof initialBounds>((resolve) => {
        const startedAt = Date.now();
        const resolveBounds = (bounds: typeof initialBounds) => {
          if (waitFrameId !== null) {
            window.cancelAnimationFrame(waitFrameId);
            waitFrameId = null;
          }
          resolve(bounds);
        };
        const tick = () => {
          const nextBounds = computeBounds() ?? initialBounds;
          if (nextBounds.width > 1 && nextBounds.height > 1) {
            resolveBounds(nextBounds);
            return;
          }
          if (Date.now() - startedAt >= 500) {
            resolveBounds(nextBounds);
            return;
          }
          waitFrameId = window.requestAnimationFrame(tick);
        };
        tick();
      });
      if (isDisposed) return;

      const boundedArea = settledBounds.width > 1 && settledBounds.height > 1;
      const nextBounds = boundedArea ? settledBounds : { ...settledBounds, width: 0, height: 0 };
      const updateResult = await runSurfaceRequest(() => desktopApi.surface.updateBounds({
        surfaceId,
        bounds: nextBounds,
      }));
      if (isDisposed) return;
      if (updateResult) {
        lastSentBoundsKeyRef.current = `${nextBounds.x}:${nextBounds.y}:${nextBounds.width}:${nextBounds.height}`;
      }
      setSurfaceLifecycleState("ready");
    };

    void createSurface();

    return () => {
      isDisposed = true;
      if (waitFrameId !== null) {
        window.cancelAnimationFrame(waitFrameId);
      }
      setSurfaceLifecycleState("idle");
      void runSurfaceRequest(() => desktopApi.surface.destroy({ surfaceId }));
    };
  }, [computeBounds, desktopApi, isDesktopSurfaceEnabled, normalizedPartition, runSurfaceRequest, surfaceId]);

  useEffect(() => {
    if (!isDesktopSurfaceEnabled || !desktopApi) return;
    if (!surfaceId) return;
    if (surfaceLifecycleState !== "ready") return;
    if (!targetDesktopUrl) return;
    const currentSurfaceUrl = String(browserStateRef.current.url || "").trim();
    if (currentSurfaceUrl && currentSurfaceUrl === targetDesktopUrl) {
      pendingSurfaceNavigationRef.current = null;
      if (!browserStateRef.current.loading) {
        reloadRequestedRef.current = false;
        setIsUserVisibleLoading(false);
      }
      return;
    }
    pendingSurfaceNavigationRef.current = {
      targetUrl: targetDesktopUrl,
      sourceUrl: currentSurfaceUrl || null,
    };
    reloadRequestedRef.current = false;
    setIsUserVisibleLoading(true);
    setBrowserState((current) => {
      const nextState = {
        ...current,
        errorCode: null,
        errorDescription: null,
        failedUrl: null,
      };
      browserStateRef.current = nextState;
      return nextState;
    });
    void runSurfaceRequest(() => desktopApi.surface.navigate({ surfaceId, url: targetDesktopUrl }));
  }, [desktopApi, isDesktopSurfaceEnabled, runSurfaceRequest, surfaceId, surfaceLifecycleState, targetDesktopUrl]);

  useEffect(() => {
    if (!isDesktopSurfaceEnabled || !desktopApi) return;
    if (!surfaceId) return;
    if (surfaceLifecycleState !== "ready") return;

    let isCancelled = false;
    if (hasSurfaceStateApi) {
      void runSurfaceRequest(() => surfaceApi.getState({ surfaceId })).then((result) => {
        if (isCancelled || !result?.state) return;
        applySurfaceState(result.state);
      });
    }

    const unsubscribe = desktopApi.onSurfaceEvent((event) => {
      if (event.surfaceId !== surfaceId) return;
      if (event.type === "loadError") {
        pendingSurfaceNavigationRef.current = null;
        reloadRequestedRef.current = false;
        setIsUserVisibleLoading(false);
        logBrowserWindowFailure("surface load error", {
          surfaceId,
          errorCode: event.errorCode,
          errorDescription: event.errorDescription,
          failedUrl: event.failedUrl,
        });
      }
      if (event.type === "loadState") {
        if (event.loading === false) {
          reloadRequestedRef.current = false;
          setIsUserVisibleLoading(false);
        } else if (pendingSurfaceNavigationRef.current || reloadRequestedRef.current) {
          setIsUserVisibleLoading(true);
        }
      }
      mergeSurfaceEventState(event);
    });

    return () => {
      isCancelled = true;
      unsubscribe?.();
    };
  }, [applySurfaceState, desktopApi, hasSurfaceStateApi, isDesktopSurfaceEnabled, mergeSurfaceEventState, runSurfaceRequest, surfaceApi, surfaceId, surfaceLifecycleState]);

  useEffect(() => {
    if (!isDesktopSurfaceEnabled || !hasSurfaceStateApi) return;
    if (!desktopApi || !surfaceApi) return;
    if (!surfaceId) return;
    if (surfaceLifecycleState !== "ready") return;

    let isDisposed = false;
    const syncSurfaceState = async () => {
      const result = await runSurfaceRequest(() => surfaceApi.getState({ surfaceId }));
      if (isDisposed || !result?.state) return;
      applySurfaceState(result.state);
    };

    const intervalId = window.setInterval(() => {
      void syncSurfaceState();
    }, 1000);

    void syncSurfaceState();

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
    };
  }, [applySurfaceState, desktopApi, hasSurfaceStateApi, isDesktopSurfaceEnabled, runSurfaceRequest, surfaceApi, surfaceId, surfaceLifecycleState]);

  useEffect(() => {
    if (!isDesktopSurfaceEnabled) return;
    if (!surfaceId) return;
    let rafId: number | null = null;
    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        void syncDesktopSurfaceBounds();
      });
    };

    let animationFrameLoopId: number | null = null;
    const loop = () => {
      void syncDesktopSurfaceBounds();
      animationFrameLoopId = window.requestAnimationFrame(loop);
    };

    const resizeObserver = new ResizeObserver(scheduleSync);
    if (hostRef.current) resizeObserver.observe(hostRef.current);
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("scroll", scheduleSync, true);
    animationFrameLoopId = window.requestAnimationFrame(loop);
    scheduleSync();

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (animationFrameLoopId !== null) window.cancelAnimationFrame(animationFrameLoopId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("scroll", scheduleSync, true);
    };
  }, [isDesktopSurfaceEnabled, surfaceId, syncDesktopSurfaceBounds]);

  const commitInputValue = () => {
    if (inputValue === rawUrl) return;
    props.updateAttributes({ url: inputValue });
  };

  const handleNavigateBack = () => {
    if (isDesktopSurfaceEnabled && hasSurfaceBackApi) {
      void runSurfaceRequest(() => surfaceApi.goBack({ surfaceId }));
      return;
    }
    window.history.back();
  };

  const handleNavigateForward = () => {
    if (isDesktopSurfaceEnabled && hasSurfaceForwardApi) {
      void runSurfaceRequest(() => surfaceApi.goForward({ surfaceId }));
      return;
    }
    window.history.forward();
  };

  const handleReload = () => {
    if (isDesktopSurfaceEnabled) {
      setBrowserState((current) => {
        const nextState = {
          ...current,
          errorCode: null,
          errorDescription: null,
          failedUrl: null,
        };
        browserStateRef.current = nextState;
        return nextState;
      });
      if (isUserVisibleLoading && hasSurfaceStopApi) {
        pendingSurfaceNavigationRef.current = null;
        reloadRequestedRef.current = false;
        setIsUserVisibleLoading(false);
        void runSurfaceRequest(() => surfaceApi.stop({ surfaceId }));
        return;
      }
      if (hasSurfaceReloadApi) {
        reloadRequestedRef.current = true;
        setIsUserVisibleLoading(true);
        void runSurfaceRequest(() => surfaceApi.reload({ surfaceId }));
        return;
      }
    }
    props.updateAttributes({ url: rawUrl });
  };

  const displayUrl = browserState.url || resolvedUrl;
  const addressBarValue = isEditingAddressBar ? inputValue : displayUrl || inputValue;
  const urlObject = useMemo(() => {
    try {
      if (!displayUrl || typeof window === "undefined") return null;
      return new URL(displayUrl, window.location.origin);
    } catch {
      return null;
    }
  }, [displayUrl]);
  const faviconUrl = urlObject
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObject.hostname)}&sz=64`
    : null;
  const originLabel = urlObject
    ? urlObject.protocol === "https:"
      ? urlObject.hostname
      : `${urlObject.protocol.replace(":", "")}://${urlObject.hostname}`
    : "Enter a web address";
  const canGoBack = isDesktopSurfaceEnabled && hasSurfaceBackApi ? browserState.canGoBack : false;
  const canGoForward = isDesktopSurfaceEnabled && hasSurfaceForwardApi ? browserState.canGoForward : false;
  const shouldShowStopControl = isDesktopSurfaceEnabled ? isUserVisibleLoading : browserState.loading;
  const shouldRenderDesktopSurface = isDesktopSurfaceEnabled && surfaceLifecycleState !== "failed";
  const shouldShowDesktopFailure = shouldRenderDesktopSurface && Boolean(browserState.errorDescription);
  const failureUrl = browserState.failedUrl || displayUrl || resolvedUrl || rawUrl;

  const beginAddressBarEditing = () => {
    const nextValue = displayUrl || rawUrl || "";
    setInputValue(nextValue);
    setIsEditingAddressBar(true);
    window.requestAnimationFrame(() => {
      const input = addressInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(nextValue.length, nextValue.length);
    });
  };

  const endAddressBarEditing = () => {
    setIsEditingAddressBar(false);
  };

  const beginResize = (
    event: React.PointerEvent<HTMLDivElement>,
    mode: "width" | "both",
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const eventTarget = event.currentTarget;
    eventTarget.setPointerCapture?.(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const measuredWidth = shellRef.current?.getBoundingClientRect().width ?? DEFAULT_IFRAME_WIDTH;
    const startWidth = iframeWidth ?? measuredWidth;
    const startHeight = iframeHeight;

    setDraftIframeWidth(startWidth);
    if (mode === "both") {
      setDraftIframeHeight(startHeight);
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.max(MIN_IFRAME_WIDTH, Math.min(startWidth + deltaX, MAX_IFRAME_WIDTH));
      setDraftIframeWidth(nextWidth);

      if (mode === "both") {
        const deltaY = moveEvent.clientY - startY;
        const nextHeight = Math.max(MIN_IFRAME_HEIGHT, Math.min(startHeight + deltaY, MAX_IFRAME_HEIGHT));
        setDraftIframeHeight(nextHeight);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      if (eventTarget.hasPointerCapture?.(event.pointerId)) {
        eventTarget.releasePointerCapture?.(event.pointerId);
      }

      const deltaX = upEvent.clientX - startX;
      const committedWidth = Math.max(MIN_IFRAME_WIDTH, Math.min(startWidth + deltaX, MAX_IFRAME_WIDTH));
      const nextAttributes: Record<string, number> = { width: committedWidth };

      if (mode === "both") {
        const deltaY = upEvent.clientY - startY;
        nextAttributes.height = Math.max(MIN_IFRAME_HEIGHT, Math.min(startHeight + deltaY, MAX_IFRAME_HEIGHT));
      }

      props.updateAttributes(nextAttributes);
      setDraftIframeWidth(null);
      setDraftIframeHeight(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <NodeViewWrapper style={{ padding: "4px 0", display: "inline-block", width: "fit-content", maxWidth: "none", verticalAlign: "top" }}>
      <NodeOverlay
        nodeProps={props}
        nodeType="browserWindow"
        backgroundColor="transparent"
        padding={0}
        style={{ width: "fit-content", maxWidth: "none" }}
      >
        <div
          ref={shellRef}
          data-testid="browser-window-node"
          contentEditable={false}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 0,
            height: "100%",
            width: `${shellWidth}px`,
            borderRadius: "10px",
            boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.08)",
            overflow: "hidden",
            margin: "24px 0",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "10px 14px",
              background: "#f1f5f9",
              borderBottom: "1px solid #e2e8f0",
              borderTopLeftRadius: "10px",
              borderTopRightRadius: "10px",
            }}
          >
            <div style={{ display: "flex", gap: 8, marginRight: 8, paddingLeft: 4, width: 56, flexShrink: 0 }}>
              {/* Window controls (macOS style) */}
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f56", border: "1px solid #e0443e" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e", border: "1px solid #dea123" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f", border: "1px solid #1aab29" }} />
            </div>
            
            <div style={{ display: "flex", gap: 2 }}>
              {[
                { label: "←", onClick: handleNavigateBack, disabled: !canGoBack, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> },
                { label: "→", onClick: handleNavigateForward, disabled: !canGoForward, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> },
                { label: shouldShowStopControl ? "✕" : "↻", onClick: handleReload, disabled: false, icon: shouldShowStopControl ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline></svg> },
              ].map((control) => (
                <button
                  key={control.label}
                  type="button"
                  onClick={control.onClick}
                  disabled={control.disabled}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: control.disabled ? "#cbd5e1" : "#475569",
                    cursor: control.disabled ? "default" : "pointer",
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                    transition: "background 0.2s, color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!control.disabled) {
                      e.currentTarget.style.background = "rgba(0, 0, 0, 0.06)";
                      e.currentTarget.style.color = "#0f172a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!control.disabled) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#475569";
                    }
                  }}
                >
                  {control.icon}
                </button>
              ))}
            </div>
            
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 6,
                background: "#ffffff",
                padding: "0 12px",
                height: 32,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05), inset 0 1px 1px rgba(0,0,0,0.02)",
                marginLeft: 16,
                marginRight: 16,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "absolute",
                  left: 12, // Adjusted left position for more padding
                  opacity: inputValue ? 1 : 0.6,
                }}
              >
                {faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faviconUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                )}
              </div>
              <input
                ref={addressInputRef}
                data-testid="browser-window-address-input"
                type="text"
                value={addressBarValue}
                onChange={(event) => setInputValue(event.target.value)}
                onFocus={() => {
                  if (!isEditingAddressBar) {
                    beginAddressBarEditing();
                  }
                }}
                onBlur={() => {
                  commitInputValue();
                  endAddressBarEditing();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitInputValue();
                    endAddressBarEditing();
                    event.currentTarget.blur();
                  }
                }}
                onPointerDown={(event) => {
                  if (!isEditingAddressBar) {
                    event.preventDefault();
                    beginAddressBarEditing();
                  }
                }}
                placeholder="Search Google or type a URL"
                spellCheck={false}
                title={displayUrl || rawUrl}
                style={{
                  minWidth: 0,
                  width: "100%",
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  padding: "0 36px", // Make room for absolute positioned icons
                  fontSize: "13.5px",
                  color: "#334155",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  textAlign: "left",
                }}
              />
              {/* Star/bookmark icon */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "absolute",
                  right: 4,
                  color: "#94a3b8",
                  cursor: "pointer",
                  borderRadius: "50%",
                  transition: "background 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                  e.currentTarget.style.color = "#475569";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
            </div>

            {/* Empty space on the right to balance window controls, allowing the URL bar to be centered */}
            <div style={{ width: 48, flexShrink: 0, display: "flex", gap: 4, justifyContent: "flex-end" }}>
              {/* Optional right-side controls like extensions or settings could go here */}
            </div>
          </div>

          <div
            style={{
              display: "none", // Hide the old bottom bar
            }}
          >
            <span
              style={{
                width: 14,
                textAlign: "center",
                color: displayUrl.startsWith("https://") ? "#16a34a" : "#94a3b8",
                flexShrink: 0,
              }}
            >
              {displayUrl.startsWith("https://") ? "•" : "○"}
            </span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {browserState.title || originLabel}
            </span>
          </div>

          <div
            contentEditable={false}
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 0,
              flex: 1,
              minHeight: 0,
              background: "#ffffff",
              borderBottomLeftRadius: "10px",
              borderBottomRightRadius: "10px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <Group lens="identity" quantaId={resolvedQuantaId} padding={0}>
              <div contentEditable={false}>
                {shouldShowDesktopFailure ? (
                  <div
                    style={{
                      width: `${contentViewportWidth}px`,
                      height: `${contentViewportHeight}px`,
                      borderBottomLeftRadius: "10px",
                      borderBottomRightRadius: !isInsideGraphNode ? "0px" : "10px",
                      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                      color: "#334155",
                      padding: "32px 28px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 14,
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                      This page could not be loaded
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
                      {browserState.errorDescription}
                    </div>
                    {failureUrl ? (
                      <div
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                          wordBreak: "break-all",
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "#eef2f7",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {failureUrl}
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={handleReload}
                        style={{
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#0f172a",
                          borderRadius: 8,
                          padding: "10px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : shouldRenderDesktopSurface ? (
                  <div
                    data-testid="browser-window-surface-host"
                    ref={hostRef}
                    onPointerDown={() => {
                      if (!desktopApi || !surfaceApi) return;
                      void runSurfaceRequest(() => surfaceApi.focus({ surfaceId }));
                    }}
                    style={{
                      width: `${contentViewportWidth}px`,
                      height: `${contentViewportHeight}px`,
                      border: "none",
                      borderBottomLeftRadius: "10px",
                      borderBottomRightRadius: !isInsideGraphNode ? "0px" : "10px",
                      background: "rgba(248, 250, 252, 0.88)",
                    }}
                  />
                ) : resolvedUrl || !isDesktopSurfaceEnabled ? (
                  <iframe
                    data-testid="browser-window-iframe"
                    src={resolvedUrl || DEFAULT_BROWSER_HOME}
                    loading="lazy"
                    style={{
                      width: `${contentViewportWidth}px`,
                      height: `${contentViewportHeight}px`,
                      border: "none",
                      borderBottomLeftRadius: "10px",
                      borderBottomRightRadius: !isInsideGraphNode ? "0px" : "10px",
                      background: "white",
                    }}
                    title={`Browser Window: ${resolvedUrl || "Kairos"}`}
                  />
                ) : (
                  <div
                    style={{
                      width: `${contentViewportWidth}px`,
                      height: `${contentViewportHeight}px`,
                      display: "grid",
                      placeItems: "center",
                      border: "none",
                      borderBottomLeftRadius: "10px",
                      borderBottomRightRadius: !isInsideGraphNode ? "0px" : "10px",
                      background: "#ffffff",
                      color: "#64748b",
                      fontSize: 13,
                      textAlign: "center",
                      padding: 16,
                    }}
                  >
                    Search Google or type a URL in the address bar.
                  </div>
                )}
              </div>
            </Group>

            {/* Resize Handle (only show if not in a graph node, as graph nodes have their own resizer) */}
            {!isInsideGraphNode && (
              <>
              <div
                onPointerDown={(e) => beginResize(e, "width")}
                style={{
                  position: "absolute",
                  top: 54,
                  right: 0,
                  width: RESIZE_GUTTER_SIZE,
                  height: `calc(100% - ${54 + RESIZE_GUTTER_SIZE}px)`,
                  cursor: "ew-resize",
                  zIndex: 12,
                  background: "rgba(255, 255, 255, 0.001)",
                  touchAction: "none",
                }}
              />
              <div
                onPointerDown={(e) => beginResize(e, "both")}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 22,
                height: 22,
                cursor: "nwse-resize",
                zIndex: 13,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                padding: 5,
                color: "#cbd5e1",
                background: "rgba(255, 255, 255, 0.001)",
                transition: "color 0.2s",
                touchAction: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#94a3b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15L15 21" />
                <path d="M21 8L8 21" />
              </svg>
            </div>
            </>
            )}
          </div>
        </div>
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
      url: {
        default: DEFAULT_BROWSER_HOME,
        parseHTML: (element) => element.getAttribute("data-browser-url") ?? DEFAULT_BROWSER_HOME,
        renderHTML: (attributes) => ({
          "data-browser-url": attributes.url || DEFAULT_BROWSER_HOME,
        }),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const rawWidth = element.getAttribute("data-browser-width");
          const parsedWidth = Number(rawWidth);
          return Number.isFinite(parsedWidth) ? parsedWidth : null;
        },
        renderHTML: (attributes) => {
          const parsedWidth = Number(attributes.width);
          return Number.isFinite(parsedWidth)
            ? { "data-browser-width": String(parsedWidth) }
            : {};
        },
      },
      height: {
        default: DEFAULT_IFRAME_HEIGHT,
        parseHTML: (element) => {
          const rawHeight = element.getAttribute("data-browser-height");
          const parsedHeight = Number(rawHeight);
          return Number.isFinite(parsedHeight) ? parsedHeight : DEFAULT_IFRAME_HEIGHT;
        },
        renderHTML: (attributes) => ({
          "data-browser-height": String(
            Number.isFinite(Number(attributes.height))
              ? Number(attributes.height)
              : DEFAULT_IFRAME_HEIGHT,
          ),
        }),
      },
      sessionPartition: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-browser-session-partition"),
        renderHTML: (attributes) =>
          attributes.sessionPartition
            ? { "data-browser-session-partition": attributes.sessionPartition }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-browser-window="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-browser-window": "true",
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
        (attributes?: {
          url?: string;
          width?: number;
          height?: number;
          sessionPartition?: string;
        }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              url: attributes?.url ?? DEFAULT_BROWSER_HOME,
              width: attributes?.width ?? null,
              height: attributes?.height ?? DEFAULT_IFRAME_HEIGHT,
              sessionPartition: attributes?.sessionPartition ?? generateBrowserSessionPartitionId(),
            },
          }),
    };
  },
});

export { BrowserWindowExtension };
