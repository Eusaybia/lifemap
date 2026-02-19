import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Node as TipTapNode, NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { NodeOverlay } from "../components/NodeOverlay";
import miserablesData from "./data/miserables.json";

interface GlowNetworkNode {
  id: string;
  group?: number;
  [key: string]: unknown;
}

interface GlowNetworkLink {
  source: string;
  target: string;
  value?: number;
  [key: string]: unknown;
}

interface GlowNetworkData {
  nodes: GlowNetworkNode[];
  links: GlowNetworkLink[];
}

interface GlowNetworkGraphInstance {
  graphData: (data: GlowNetworkData) => GlowNetworkGraphInstance;
  backgroundColor: (color: string) => GlowNetworkGraphInstance;
  nodeLabel: (label: string) => GlowNetworkGraphInstance;
  nodeAutoColorBy: (key: string) => GlowNetworkGraphInstance;
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

const SOURCE_GRAPH_DATA = miserablesData as GlowNetworkData;

const cloneGraphData = (): GlowNetworkData => ({
  nodes: SOURCE_GRAPH_DATA.nodes.map((node) => ({ ...node })),
  links: SOURCE_GRAPH_DATA.links.map((link) => ({ ...link })),
});

const MIN_WIDTH = 280;
const MIN_HEIGHT = 240;
const FORCE_GRAPH_3D_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/3d-force-graph";
const FORCE_GRAPH_3D_SCRIPT_ATTR = "data-force-graph-3d";

let forceGraph3DScriptPromise: Promise<void> | null = null;

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

const GlowNetworkFigure: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<GlowNetworkGraphInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const graphData = useMemo(() => cloneGraphData(), []);

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
    let didFitCamera = false;

    const initGraph = async () => {
      try {
        const [THREE, { UnrealBloomPass }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
        ]);
        await ensureForceGraph3DScript();
        const ForceGraph3D = getForceGraph3DConstructor();

        if (disposed || !ForceGraph3D) return;
        const { width: rawWidth, height: rawHeight } = container.getBoundingClientRect();
        const width = Math.max(MIN_WIDTH, Math.floor(rawWidth));
        const height = Math.max(MIN_HEIGHT, Math.floor(rawHeight));

        const graph = new ForceGraph3D(container, { controlType: "orbit" });

        graphRef.current = graph;

        graph
          .graphData(graphData)
          .backgroundColor("#000003")
          .nodeLabel("id")
          .nodeAutoColorBy("group")
          .linkColor(() => "rgba(236, 245, 255, 0.55)")
          .linkWidth(0.9)
          .showNavInfo(false)
          .width(width)
          .height(height)
          .enableNodeDrag(true)
          .enableNavigationControls(true)
          .enablePointerInteraction(true)
          .onEngineStop(() => {
            if (disposed || didFitCamera) return;
            didFitCamera = true;
            graph.zoomToFit(450, 90);
          });

        const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 4, 1, 0);
        graph.postProcessingComposer().addPass(bloom);
        bloomPass = bloom;

        resizeObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          const nextGraph = graphRef.current;
          if (!entry || !nextGraph) return;

          const nextWidth = Math.max(MIN_WIDTH, Math.floor(entry.contentRect.width));
          const nextHeight = Math.max(MIN_HEIGHT, Math.floor(entry.contentRect.height));

          nextGraph.width(nextWidth).height(nextHeight);
          bloomPass?.resolution?.set(nextWidth, nextHeight);
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
      resizeObserver?.disconnect();
      bloomPass?.dispose?.();
      if (graphRef.current) {
        graphRef.current._destructor();
        graphRef.current = null;
      }
      container.innerHTML = "";
    };
  }, [graphData]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "none",
        margin: 0,
        aspectRatio: "8 / 3",
        minHeight: 216,
        position: "relative",
        background: "#000003",
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
    return ["div", { ...HTMLAttributes, "data-type": "glow-network" }, 0];
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
