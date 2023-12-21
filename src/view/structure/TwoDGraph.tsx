import React from 'react';
import { useState, useCallback, ChangeEvent } from 'react';
import ReactFlow, { Controls, Background, applyEdgeChanges, applyNodeChanges, NodeChange, EdgeChange, Node, Edge, addEdge, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import './text-updater-node.css';
import { Quanta } from '../../core/Quanta';

const handleStyle = { left: 10 };

const rfStyle = {
    backgroundColor: '#B8CEFF',
  };

const RichTextNode = () => {
    return (
        <div className="nodrag nopan" style={{cursor: "default"}}>
            <Handle type="target" position={Position.Top} />
            <div style={{ minWidth: 100, minHeight: 100, backgroundColor: "white", borderRadius: 5, padding: 20 }}>
                <Quanta quantaId={'000009'} userId={'000000'} />
            </div>
            <Handle type="source" position={Position.Bottom} id="a" />
            <Handle
                type="source"
                position={Position.Bottom}
                id="b"
                style={handleStyle}
            />
        </div>
    );
}

const initialNodes: Node[] = [
    { id: 'node-1', type: 'textUpdater', position: { x: 0, y: 0 }, data: { value: 123 } },
  ];

const initialEdges: Edge[] = [
];

export const TwoDGraph = () => {
    const nodeTypes = React.useMemo(() => ({ textUpdater: RichTextNode }), []);

    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds: Node<any>[]) => applyNodeChanges(changes, nds)),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds: Edge<any>[]) => applyEdgeChanges(changes, eds)),
        [],
    );

    const onConnect = useCallback(
        (params: any) => setEdges((eds) => addEdge(params, eds)),
        [],
    );

    return (
        <div style={{ height: '500px', width: '100%', borderRadius: 10 }}>
            <ReactFlow
                nodeTypes={nodeTypes}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                style={rfStyle}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}