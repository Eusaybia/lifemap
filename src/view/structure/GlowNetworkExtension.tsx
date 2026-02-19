import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Node as TipTapNode, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { NodeOverlay } from "../components/NodeOverlay";

export interface GlowNetworkNode {
  id: string;
  group?: number;
  tone?: "light" | "dark";
  color?: string;
  [key: string]: unknown;
}

export interface GlowNetworkLink {
  source: string;
  target: string;
  value?: number;
  [key: string]: unknown;
}

export interface GlowNetworkData {
  nodes: GlowNetworkNode[];
  links: GlowNetworkLink[];
}

interface GlowNetworkGraphInstance {
  graphData: (data: GlowNetworkData) => GlowNetworkGraphInstance;
  backgroundColor: (color: string) => GlowNetworkGraphInstance;
  nodeLabel: (label: string) => GlowNetworkGraphInstance;
  nodeColor: (colorAccessor: (node: GlowNetworkNode) => string) => GlowNetworkGraphInstance;
  nodeThreeObject: (objectAccessor: (node: GlowNetworkNode) => unknown) => GlowNetworkGraphInstance;
  nodeThreeObjectExtend: (extend: boolean) => GlowNetworkGraphInstance;
  linkColor: (colorAccessor: () => string) => GlowNetworkGraphInstance;
  linkWidth: (width: number) => GlowNetworkGraphInstance;
  showNavInfo: (enabled: boolean) => GlowNetworkGraphInstance;
  width: (width: number) => GlowNetworkGraphInstance;
  height: (height: number) => GlowNetworkGraphInstance;
  enableNodeDrag: (enabled: boolean) => GlowNetworkGraphInstance;
  enableNavigationControls: (enabled: boolean) => GlowNetworkGraphInstance;
  enablePointerInteraction: (enabled: boolean) => GlowNetworkGraphInstance;
  onEngineStop: (handler: () => void) => GlowNetworkGraphInstance;
  zoomToFit: (durationMs?: number, padding?: number) => GlowNetworkGraphInstance;
  camera?: () => { position?: { x: number; y: number; z: number } };
  cameraPosition?: (
    position: { x?: number; y?: number; z?: number },
    lookAt?: { x?: number; y?: number; z?: number },
    durationMs?: number
  ) => GlowNetworkGraphInstance;
  d3Force: (name: string) => { strength?: (value: number) => void } | undefined;
  postProcessingComposer: () => {
    addPass: (pass: unknown) => void;
  };
  _destructor: () => void;
}

type GlowNetworkGraphConstructor = new (
  element: HTMLElement,
  config?: {
    controlType?: "trackball" | "orbit" | "fly";
  }
) => GlowNetworkGraphInstance;

const getForceGraph3DConstructor = (): GlowNetworkGraphConstructor | undefined => {
  return (window as Window & { ForceGraph3D?: GlowNetworkGraphConstructor }).ForceGraph3D;
};

const NODE_TONE_COLORS = {
  light: "#c9cfde",
  dark: "#727a8a",
};

const NODE_LABEL_COLORS = {
  light: "#dddfe8",
  dark: "#7f8798",
};

const SOURCE_GRAPH_DATA: GlowNetworkData = {
  nodes: [
    { id: "Arcturus", group: 1, tone: "dark", x: -340, y: 120, z: 0 },
    { id: "Polaris", group: 1, tone: "light", x: -290, y: 58, z: 0 },
    { id: "Antares", group: 1, tone: "dark", x: -355, y: 2, z: 0 },
    { id: "Aldebaran", group: 1, tone: "light", x: -285, y: -76, z: 0 },
    { id: "Deneb", group: 1, tone: "dark", x: -220, y: -12, z: 0 },
    { id: "Altair", group: 2, tone: "light", x: 215, y: -88, z: 0 },
    { id: "Vega", group: 2, tone: "dark", x: 268, y: -14, z: 0 },
    { id: "Betelgeuse", group: 2, tone: "light", x: 350, y: 24, z: 0 },
    { id: "Rigel", group: 2, tone: "dark", x: 345, y: -98, z: 0 },
    { id: "Sirius", group: 2, tone: "light", x: 420, y: -42, z: 0 },
  ],
  links: [
    // Component A (left graph)
    { source: "Arcturus", target: "Polaris" },
    { source: "Polaris", target: "Antares" },
    { source: "Antares", target: "Aldebaran" },
    { source: "Aldebaran", target: "Deneb" },
    { source: "Deneb", target: "Polaris" },
    // Component B (right graph)
    { source: "Sirius", target: "Rigel" },
    { source: "Sirius", target: "Betelgeuse" },
    { source: "Rigel", target: "Betelgeuse" },
    { source: "Vega", target: "Betelgeuse" },
    { source: "Vega", target: "Rigel" },
    { source: "Altair", target: "Vega" },
    { source: "Altair", target: "Sirius" },
  ],
};

const cloneGraphData = (data: GlowNetworkData): GlowNetworkData => ({
  nodes: data.nodes.map((node) => ({ ...node })),
  links: data.links.map((link) => ({ ...link })),
});

const MIN_WIDTH = 280;
const MIN_HEIGHT = 240;
const FORCE_GRAPH_3D_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/3d-force-graph";
const FORCE_GRAPH_3D_SCRIPT_ATTR = "data-force-graph-3d";
const ASTRO_FONT_FAMILY = '"Cormorant Garamond", "Cinzel Decorative", "Marcellus", serif';
const ASTRO_FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Marcellus&display=swap";
const ASTRO_FONT_LINK_ATTR = "data-glow-network-font";

let forceGraph3DScriptPromise: Promise<void> | null = null;
let astrologyFontPromise: Promise<void> | null = null;

const ensureForceGraph3DScript = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  if (getForceGraph3DConstructor()) return;
  if (forceGraph3DScriptPromise) return forceGraph3DScriptPromise;

  forceGraph3DScriptPromise = new Promise<void>((resolve, reject) => {
    const completeLoad = () => {
      if (getForceGraph3DConstructor()) {
        resolve();
        return;
      }
      reject(new Error("ForceGraph3D global was not found after script load."));
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[${FORCE_GRAPH_3D_SCRIPT_ATTR}="true"]`
    );
    if (existingScript) {
      existingScript.addEventListener("load", completeLoad, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load 3d-force-graph script.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.setAttribute(FORCE_GRAPH_3D_SCRIPT_ATTR, "true");
    script.src = FORCE_GRAPH_3D_SCRIPT_URL;
    script.async = true;
    script.onload = completeLoad;
    script.onerror = () => reject(new Error("Failed to load 3d-force-graph script."));
    document.head.appendChild(script);
  });

  try {
    await forceGraph3DScriptPromise;
  } catch (error) {
    forceGraph3DScriptPromise = null;
    throw error;
  }
};

const waitForStylesheet = (link: HTMLLinkElement) =>
  new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    link.addEventListener("load", finish, { once: true });
    link.addEventListener("error", finish, { once: true });
    window.setTimeout(finish, 1800);
  });

const ensureAstrologyFont = async (): Promise<void> => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (astrologyFontPromise) return astrologyFontPromise;

  astrologyFontPromise = (async () => {
    let fontLink = document.querySelector<HTMLLinkElement>(`link[${ASTRO_FONT_LINK_ATTR}="true"]`);
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href = ASTRO_FONT_STYLESHEET_URL;
      fontLink.setAttribute(ASTRO_FONT_LINK_ATTR, "true");
      document.head.appendChild(fontLink);
    }

    await waitForStylesheet(fontLink);

    if (document.fonts?.load) {
      await Promise.race([
        Promise.all([
          document.fonts.load(`italic 700 28px ${ASTRO_FONT_FAMILY}`),
          document.fonts.load(`italic 400 28px ${ASTRO_FONT_FAMILY}`),
        ]),
        new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
      ]);
    }
  })();

  try {
    await astrologyFontPromise;
  } catch (error) {
    astrologyFontPromise = null;
    throw error;
  }
};

interface GlowNetworkFigureProps {
  graphData?: GlowNetworkData;
  aspectRatio?: string;
  minHeight?: number;
  showNavHint?: boolean;
  fitPadding?: number;
  autoFitDelayMs?: number;
  edgeToEdge?: boolean;
  fitZoomScale?: number;
}

export const GlowNetworkFigure: React.FC<GlowNetworkFigureProps> = ({
  graphData,
  aspectRatio = "8 / 3",
  minHeight = 216,
  showNavHint = true,
  fitPadding = 100,
  autoFitDelayMs = 700,
  edgeToEdge = false,
  fitZoomScale = 1,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<GlowNetworkGraphInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const resolvedGraphData = useMemo(
    () => cloneGraphData(graphData ?? SOURCE_GRAPH_DATA),
    [graphData]
  );

  const stopEditorEventBubble = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let bloomPass:
      | {
          resolution?: { set: (x: number, y: number) => void };
          dispose?: () => void;
        }
      | null = null;
    let fitTimeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const applyFit = (graph: GlowNetworkGraphInstance, durationMs: number) => {
      graph.zoomToFit(durationMs, fitPadding);
      if (fitZoomScale >= 1) return;

      const camera = graph.camera?.();
      const currentPosition = camera?.position;
      if (!currentPosition || !graph.cameraPosition) return;

      graph.cameraPosition(
        {
          x: currentPosition.x * fitZoomScale,
          y: currentPosition.y * fitZoomScale,
          z: currentPosition.z * fitZoomScale,
        },
        undefined,
        durationMs > 0 ? Math.max(80, Math.floor(durationMs * 0.6)) : 0
      );
    };

    const initGraph = async () => {
      try {
        const [THREE, { default: SpriteText }, { UnrealBloomPass }] = await Promise.all([
          import("three"),
          import("three-spritetext"),
          import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
        ]);
        await Promise.all([ensureForceGraph3DScript(), ensureAstrologyFont()]);
        const ForceGraph3D = getForceGraph3DConstructor();

        if (disposed || !ForceGraph3D) return;
        const { width: rawWidth, height: rawHeight } = container.getBoundingClientRect();
        const width = Math.max(MIN_WIDTH, Math.floor(rawWidth));
        const height = Math.max(MIN_HEIGHT, Math.floor(rawHeight));

        const graph = new ForceGraph3D(container, { controlType: "orbit" });

        graphRef.current = graph;

        graph
          .graphData(resolvedGraphData)
          .backgroundColor("#000003")
          .nodeLabel("id")
          .nodeColor((node) =>
            node.tone === "dark" ? NODE_TONE_COLORS.dark : NODE_TONE_COLORS.light
          )
          .nodeThreeObject((node) => {
            const sprite = new SpriteText(node.id);
            if (sprite.material) {
              sprite.material.depthWrite = false;
            }
            sprite.color = NODE_LABEL_COLORS.dark;
            sprite.textHeight = 8;
            sprite.fontFace = ASTRO_FONT_FAMILY;
            sprite.fontWeight = "italic 700";
            if (sprite.center) {
              sprite.center.y = -0.6;
            }
            return sprite;
          })
          .nodeThreeObjectExtend(true)
          .linkColor(() => "rgba(236, 245, 255, 0.55)")
          .linkWidth(0.9)
          .showNavInfo(false)
          .width(width)
          .height(height)
          .enableNodeDrag(true)
          .enableNavigationControls(true)
          .enablePointerInteraction(true)
          .onEngineStop(() => {
            if (disposed) return;
            applyFit(graph, 300);
          });

        const chargeForce = graph.d3Force("charge");
        if (chargeForce?.strength) {
          chargeForce.strength(-120);
        }

        const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 2.5, 0.7, 0);
        graph.postProcessingComposer().addPass(bloom);
        bloomPass = bloom;

        fitTimeoutId = window.setTimeout(() => {
          if (disposed || !graphRef.current) return;
          applyFit(graphRef.current, 350);
        }, autoFitDelayMs);

        resizeObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          const nextGraph = graphRef.current;
          if (!entry || !nextGraph) return;

          const nextWidth = Math.max(MIN_WIDTH, Math.floor(entry.contentRect.width));
          const nextHeight = Math.max(MIN_HEIGHT, Math.floor(entry.contentRect.height));

          nextGraph.width(nextWidth).height(nextHeight);
          bloomPass?.resolution?.set(nextWidth, nextHeight);
          applyFit(nextGraph, 0);
        });

        resizeObserver.observe(container);
      } catch (error) {
        console.error("Failed to initialize glow network graph:", error);
        if (!disposed) {
          setLoadError("Unable to load 3D graph.");
        }
      }
    };

    initGraph();

    return () => {
      disposed = true;
      if (fitTimeoutId !== null) {
        window.clearTimeout(fitTimeoutId);
      }
      resizeObserver?.disconnect();
      bloomPass?.dispose?.();
      if (graphRef.current) {
        graphRef.current._destructor();
        graphRef.current = null;
      }
      container.innerHTML = "";
    };
  }, [autoFitDelayMs, fitPadding, fitZoomScale, resolvedGraphData]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "none",
        margin: 0,
        aspectRatio,
        minHeight,
        position: "relative",
        background: "#000003",
        overflow: "hidden",
        borderRadius: edgeToEdge ? 0 : 16,
      }}
      onMouseDown={stopEditorEventBubble}
      onMouseUp={stopEditorEventBubble}
      onPointerDown={stopEditorEventBubble}
      onPointerUp={stopEditorEventBubble}
      onTouchStart={stopEditorEventBubble}
      onWheel={stopEditorEventBubble}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
        }}
      />

      {showNavHint && (
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 10,
            fontSize: 11,
            letterSpacing: 0.2,
            color: "rgba(230, 240, 255, 0.76)",
            background: "rgba(4, 8, 45, 0.45)",
            border: "1px solid rgba(138, 165, 255, 0.25)",
            borderRadius: 999,
            padding: "4px 10px",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          Orbit drag | Scroll zoom | Drag nodes
        </div>
      )}

      {loadError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255, 232, 232, 0.88)",
            fontSize: 13,
            background: "rgba(4, 7, 25, 0.45)",
            pointerEvents: "none",
          }}
        >
          {loadError}
        </div>
      )}
    </div>
  );
};

const GlowNetworkNodeView: React.FC<NodeViewProps> = (props) => {
  const { selected } = props;

  return (
    <NodeViewWrapper data-glow-network-node-view="true" style={{ margin: "12px 0", overflow: "visible" }}>
      <NodeOverlay
        nodeProps={props}
        nodeType="glowNetwork"
        borderRadius={18}
        padding="12px"
        backgroundColor="transparent"
        boxShadow={`
          0 8px 26px rgba(0, 0, 0, 0.28),
          0 2px 8px rgba(0, 0, 0, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.12)
        `}
      >
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            border: selected ? "1px solid rgba(132, 171, 255, 0.8)" : "1px solid rgba(91, 117, 201, 0.5)",
            background: "#000003",
          }}
        >
          <GlowNetworkFigure />
        </div>
      </NodeOverlay>
    </NodeViewWrapper>
  );
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    glowNetwork: {
      insertGlowNetwork: () => ReturnType;
    };
  }
}

export const GlowNetworkExtension = TipTapNode.create({
  name: "glowNetwork",
  group: "block",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="glow-network"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "glow-network" }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GlowNetworkNodeView);
  },

  addCommands() {
    return {
      insertGlowNetwork: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
          })
          .run();
      },
    };
  },
});

export default GlowNetworkExtension;
