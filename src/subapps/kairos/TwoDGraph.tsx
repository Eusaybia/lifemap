import React, { useState, useCallback, memo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  addEdge,
  Handle,
  Position,
  ReactFlowInstance,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './react-flow.css';
import { Quanta } from '../../core/Quanta';
import { borderRadius } from '../Theme';
import { motion } from 'framer-motion';

const QuantaNode = ({ data }: { data: { quantaId: string; label: string } }) => {
  const [quantaId, setQuantaId] = useState(data.quantaId || '999999');

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuantaId(event.target.value);
  };

  return (
    <div
      style={{
        width: '550px',
        maxWidth: '550px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px',
        boxSizing: 'border-box',
        position: 'relative', // Ensure positioning for the drag handle
      }}
    >
      <Handle type="target" position={Position.Top} />
      
      {/* TODO: Need to abstract drag handle and make consistent across components */}

      {/* Drag Handle */}
      <motion.div
        className="custom-drag-handle"
        onMouseLeave={(event) => {
          event.currentTarget.style.cursor = "grab";
        }}
        onMouseDown={(event) => {
          event.currentTarget.style.cursor = "grabbing";
        }}
        onMouseUp={(event) => {
          event.currentTarget.style.cursor = "grab";
        }}
        style={{
          position: 'absolute',
          right: -4,
          top: 10,
          display: 'flex',
          flexDirection: 'column',
          cursor: 'grab',
          fontSize: '24px',
          color: 'grey',
        }}
        contentEditable="false"
        suppressContentEditableWarning={true}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      >
        ⠿
      </motion.div>
      
      <input
        type="text"
        value={quantaId}
        onChange={onChange}
        placeholder="Enter Quanta ID"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '5px',
          padding: '5px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
      />
      <div
        style={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        <Quanta quantaId={quantaId} userId={'user-id'} />
      </div>
      <Handle type="source" position={Position.Bottom} id="a" />
    </div>
  );
};

let id = 0;
const getId = () => `dndnode_${id++}`;
export const TwoDGraph = () => {
  const nodeTypes = React.useMemo(() => ({ quantaNode: QuantaNode }), []);

  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'node-1',
      type: 'quantaNode',
      position: { x: 50, y: 20 },
      data: { quantaId: '000005', label: 'Node 1' },
      dragHandle: '.custom-drag-handle', // Specify the drag handle selector
    },
    {
      id: 'node-2',
      type: 'quantaNode',
      position: { x: -80, y: -280 },
      data: { quantaId: '59010df8-9321-4864-abfd-5fdbb4dac9f4', label: 'Node 2' },
      dragHandle: '.custom-drag-handle', // Specify the drag handle selector
    },
    {
      id: 'node-3',
      type: 'quantaNode',
      position: { x: 680, y: -320 }, // Slightly adjusted from node-2
      data: { quantaId: '1e75b219-0ad5-44be-9898-b970cc986040', label: 'Node 3' },
      dragHandle: '.custom-drag-handle', // Specify the drag handle selector
    },
    {
      id: 'node-4',
      type: 'quantaNode',
      position: { x: 720, y: -580 }, // Slightly adjusted from node-3
      data: { quantaId: 'a4cc26ce-4fbf-425d-b6ca-8f3ea6258064', label: 'Node 4' },
      dragHandle: '.custom-drag-handle', // Specify the drag handle selector
    },
    {
      id: 'node-5',
      type: 'quantaNode',
      position: { x: -80, y: -580 }, // Positioned above node-2
      data: { quantaId: '34bb7afb-b959-473c-a2c7-76e32ae91a0f', label: 'Node 5' },
      dragHandle: '.custom-drag-handle', // Specify the drag handle selector
    },
    {
      id: 'node-6',
      type: 'quantaNode',
      position: { x: -80, y: -920 }, // Positioned above node-5
      data: { quantaId: 'f0c75b08-bb3d-407d-8666-a56a40c8c6cd', label: 'Node 6' },
      dragHandle: '.custom-drag-handle', // Specify the drag handle selector
    },
    {
      id: 'node-7',
      type: 'quantaNode',
      position: { x: -80, y: -1260 }, // Positioned above node-6
      data: { quantaId: 'abdfbe6d-578c-4fe8-bbd0-2be2b08b5f19', label: 'Node 7' },
      dragHandle: '.custom-drag-handle', // Specify the drag handle selector
    },
  ]);

  const [edges, setEdges] = useState<Edge[]>([
    { id: 'edge-1', source: 'node-1', target: 'node-2' },
    { id: 'edge-2', source: 'node-1', target: 'node-3' },
    { id: 'edge-3', source: 'node-3', target: 'node-4' },
    { id: 'edge-4', source: 'node-5', target: 'node-2' },
    { id: 'edge-5', source: 'node-6', target: 'node-5' },
    { id: 'edge-6', source: 'node-7', target: 'node-6' },
  ]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (!type) {
        return;
      }

      if (reactFlowInstance) {
        const position = reactFlowInstance.project({
          x: event.clientX,
          y: event.clientY,
        });
        const newNode: Node = {
          id: getId(),
          type: 'quantaNode',
          position,
          data: { quantaId: '999999', label: `${type} node` },
          dragHandle: '.custom-drag-handle', // Specify the drag handle selector
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance]
  );

  // Add this new constant for the default viewport
  const defaultViewport = { x: 0, y: -800, zoom: 0.03 };

  const fitViewOptions = {
    padding: 0.2,
    minZoom: 0.01,
    maxZoom: 1,
  };

  React.useEffect(() => {
    if (reactFlowInstance) {
      setTimeout(() => reactFlowInstance.fitView(fitViewOptions), 0);
    }
  }, [reactFlowInstance]);

  return (
    <div
      style={{
        height: '80vh',
        width: '100%',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '100%',
          borderRadius: borderRadius,
          overflow: 'hidden',
          border: '1px solid #ddd', // Added light border
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)', // Optional: adds a subtle shadow
        }}
      >
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
          defaultViewport={defaultViewport}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};