import React from 'react';
import { useState, useCallback, ChangeEvent } from 'react';
import ReactFlow, { Controls, Background, applyEdgeChanges, applyNodeChanges, NodeChange, EdgeChange, Node, Edge, addEdge, Handle, Position, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';
import './react-flow.css';
import { Quanta } from '../../core/Quanta';

type NodeType = "richText"

export const Sidebar = () => {
    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    };
  
    return (
      <aside>
        <div className="description">You can drag these nodes to the pane on the right.</div>
        <div className="dndnode input" style={{
              borderColor: "#0041d0"
        }} onDragStart={(event) => onDragStart(event, 'richText')} draggable>
          Rich Text
        </div>
      </aside>
    );
  };

const handleStyle = { left: 10 };

const rfStyle = {
    backgroundColor: '#B8CEFF',
  };

const RichTextNode = () => {
    return (
        <div className="nodrag nopan" style={{cursor: "default"}}>
            <Handle type="target" position={Position.Top} />
            <div style={{ minWidth: 100, minHeight: 100, backgroundColor: "white", borderRadius: 5, padding: 20 }}>
                <Quanta quantaId={'999999'} userId={'000000'} />
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

let id = 0;
const getId = () => `dndnode_${id++}`;

export const TwoDGraph = () => {
    const reactFlowWrapper = React.useRef(null);
    const nodeTypes = React.useMemo(() => ({ textUpdater: RichTextNode }), []);

    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

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

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }, []);
    
      const onDrop = useCallback(
        (event: React.DragEvent) => {
          event.preventDefault();
    
          const type = event.dataTransfer.getData('application/reactflow');
    
          // check if the dropped element is valid
          if (typeof type === 'undefined' || !type) {
            return;
          }
    
          // reactFlowInstance.project was renamed to reactFlowInstance.screenToFlowPosition
          // and you don't need to subtract the reactFlowBounds.left/top anymore
          // details: https://reactflow.dev/whats-new/2023-11-10
              if (reactFlowInstance) {
                  const position = reactFlowInstance.screenToFlowPosition({
                      x: event.clientX,
                      y: event.clientY,
                  });
                  const newNode = {
                      id: getId(),
                      type,
                      position,
                      data: { label: `${type} node` },
                  };

                  setNodes((nds) => nds.concat(newNode));

              }
        },
        [reactFlowInstance],
      );

    return (
        <div className="dndflow">
            <div style={{ height: 'fit-content', width: '100%', borderRadius: 10 }}>
                <div className="reactflow-wrapper" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodeTypes={nodeTypes}
                        nodes={nodes}
                        edges={edges}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        fitView
                        style={rfStyle}
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </div>
                <div style={{height: "200px"}}>
                <Sidebar />
                </div>
            </div>
        </div>
    );
}