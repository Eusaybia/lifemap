'use client'

import React, { memo } from 'react'
import { motion } from 'framer-motion'
import { Handle, NodeResizeControl, Position, useStore, type NodeProps } from 'reactflow'

export interface QuantaCanvasNodeData {
  quantaId: string
  label?: string
  showHandles?: boolean
  showResizeControl?: boolean
  showDragHandle?: boolean
  iframeMode?: string
}

const zoomSelector = (state: any) => state.transform[2]

export const QuantaCanvasNode = memo(({ data }: NodeProps<QuantaCanvasNodeData>) => {
  const quantaId = data?.quantaId || 'richtext-test'
  const zoom = useStore(zoomSelector)
  const inverseScale = 1 / zoom
  const scaledWidth = 100 * zoom
  const scaledHeight = 100 * zoom

  const showHandles = data?.showHandles ?? true
  const showResizeControl = data?.showResizeControl ?? true
  const showDragHandle = data?.showDragHandle ?? true
  const iframeMode = data?.iframeMode || 'graph'

  const baseHandleStyle: React.CSSProperties = {
    background: '#6366f1',
    width: 16,
    height: 16,
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    borderRadius: '50%',
  }

  return (
    <>
      {showHandles && (
        <>
          <Handle type="target" position={Position.Top} id="top" isConnectable style={{ ...baseHandleStyle, top: -12 }} />
          <Handle type="source" position={Position.Bottom} id="bottom" isConnectable style={{ ...baseHandleStyle, bottom: -12 }} />
          <Handle type="target" position={Position.Left} id="left" isConnectable style={{ ...baseHandleStyle, left: -12 }} />
          <Handle type="source" position={Position.Right} id="right" isConnectable style={{ ...baseHandleStyle, right: -12 }} />
        </>
      )}

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        }}
      >
        {showDragHandle && (
          <motion.div
            className="custom-drag-handle"
            onMouseLeave={(event) => {
              event.currentTarget.style.cursor = 'grab'
            }}
            onMouseDown={(event) => {
              event.currentTarget.style.cursor = 'grabbing'
            }}
            onMouseUp={(event) => {
              event.currentTarget.style.cursor = 'grab'
            }}
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              padding: '6px',
              borderRadius: '6px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              zIndex: 1,
            }}
            whileHover={{
              background: '#f3f4f6',
              borderColor: '#d1d5db',
            }}
          >
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="2.5" cy="3" r="1.5" fill="#9ca3af" />
              <circle cx="2.5" cy="7" r="1.5" fill="#9ca3af" />
              <circle cx="2.5" cy="11" r="1.5" fill="#9ca3af" />
              <circle cx="7.5" cy="3" r="1.5" fill="#9ca3af" />
              <circle cx="7.5" cy="7" r="1.5" fill="#9ca3af" />
              <circle cx="7.5" cy="11" r="1.5" fill="#9ca3af" />
            </svg>
          </motion.div>
        )}

        <div
          style={{
            flex: 1,
            overflow: 'visible',
            background: '#fff',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${scaledWidth}%`,
              height: `${scaledHeight}%`,
              transform: `scale(${inverseScale})`,
              transformOrigin: 'top left',
            }}
          >
            <iframe
              src={`/q/${quantaId}?mode=${iframeMode}`}
              title={data?.label || `Quanta: ${quantaId}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>

      {showResizeControl && (
        <NodeResizeControl
          minWidth={180}
          minHeight={100}
          style={{
            background: 'transparent',
            border: 'none',
          }}
          position="bottom-right"
        >
          <div
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'nwse-resize',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              transform: 'translate(-17px, -17px)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </NodeResizeControl>
      )}
    </>
  )
})

QuantaCanvasNode.displayName = 'QuantaCanvasNode'

