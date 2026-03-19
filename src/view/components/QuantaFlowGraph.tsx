import React from "react";

export type QuantaFlowGraphNodeData = Record<string, unknown>;

type QuantaFlowGraphProps = {
  initialNodes?: Array<unknown>;
  initialEdges?: Array<unknown>;
  hideInsertToolbar?: boolean;
  editableNodes?: boolean;
  showNodeFlowMenu?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  canvasBackground?: string;
};

export default function QuantaFlowGraph(_props: QuantaFlowGraphProps) {
  return (
    <div
      style={{
        minHeight: 280,
        width: "100%",
        borderRadius: 18,
        border: "1px solid rgba(160, 160, 160, 0.25)",
        background:
          "linear-gradient(180deg, rgba(250, 248, 243, 0.95), rgba(242, 236, 226, 0.9))",
        display: "grid",
        placeItems: "center",
        color: "rgba(73, 58, 37, 0.78)",
        fontSize: 14,
      }}
    >
      Flow graph preview unavailable in standalone lifemap.
    </div>
  );
}
