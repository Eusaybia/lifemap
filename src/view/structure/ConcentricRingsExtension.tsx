"use client"

import React from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"
import { NodeOverlay } from "../components/NodeOverlay"

// ============================================================================
// ConcentricRings Extension
// ============================================================================
// This extension renders a visualization of 3 overlapping rings stacked
// vertically (like the Audi logo but vertical). Each ring interlocks with
// its neighbors, creating a chain-like visual. Each ring can have its own
// label and color.
// ============================================================================

// ============================================================================
// Constants & Types
// ============================================================================

interface RingData {
  label: string
  color: string
}

const DEFAULT_RINGS: RingData[] = [
  { label: 'Deep Mind', color: 'rgba(0, 0, 0, 0.85)' },        // Top
  { label: 'Deep Emotional', color: 'rgba(0, 0, 0, 0.85)' },   // Middle
  { label: 'Deep Physical', color: 'rgba(0, 0, 0, 0.85)' },    // Bottom
]

const RING_DIAMETER = 140 // Diameter for each ring
const RING_STROKE_WIDTH = 3 // Thickness of ring stroke
const RING_OVERLAP = 45 // How much rings overlap vertically


// ============================================================================
// Overlapping Rings Visualization Component (Audi-style, vertical)
// ============================================================================
// Creates 3 interlocking rings stacked vertically like a chain.
// Each ring weaves through its neighbors - going in front on one side
// and behind on the other, creating the classic linked rings effect.
// ============================================================================

interface ConcentricRingsVisualizationProps {
  rings: RingData[]
  isSelected: boolean
}

const ConcentricRingsVisualization: React.FC<ConcentricRingsVisualizationProps> = ({ 
  rings, 
  isSelected 
}) => {
  // Calculate total height needed for vertically stacked overlapping rings
  const totalHeight = RING_DIAMETER + (rings.length - 1) * (RING_DIAMETER - RING_OVERLAP)
  const totalWidth = RING_DIAMETER + 100 // Extra space for labels
  
  // SVG dimensions with padding
  const svgWidth = totalWidth + 40
  const svgHeight = totalHeight + 40
  const centerX = (svgWidth - 60) / 2 // Offset to leave room for labels on right

  // Helper to create arc path for half circle
  // sweepFlag: 0 = counter-clockwise (left half), 1 = clockwise (right half)
  const createArcPath = (cx: number, cy: number, r: number, isLeftHalf: boolean) => {
    if (isLeftHalf) {
      // Left half: from bottom to top, counter-clockwise
      return `M ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`
    } else {
      // Right half: from top to bottom, counter-clockwise  
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r}`
    }
  }

  const radius = (RING_DIAMETER - RING_STROKE_WIDTH) / 2

  // Build the render order for proper interlocking:
  // For Audi-style links, we need to draw arcs in a specific order
  // Ring N's right half goes BEHIND Ring N+1's left half
  // Ring N's left half goes IN FRONT of Ring N-1's right half
  
  const renderElements: { 
    type: 'arc' | 'label'
    ringIndex: number
    isLeftHalf?: boolean
    zOrder: number 
  }[] = []
  
  rings.forEach((_, index) => {
    // For each ring, we draw left half and right half separately
    // Z-order determines the interlocking pattern
    
    // Right half - goes behind the ring below it
    renderElements.push({
      type: 'arc',
      ringIndex: index,
      isLeftHalf: false,
      zOrder: index * 2, // Lower z-order = drawn first = behind
    })
    
    // Left half - goes in front of the ring above it
    renderElements.push({
      type: 'arc',
      ringIndex: index,
      isLeftHalf: true,
      zOrder: index * 2 + 1, // Higher z-order = drawn later = in front
    })
    
    // Labels
    renderElements.push({
      type: 'label',
      ringIndex: index,
      zOrder: 100 + index, // Labels always on top
    })
  })
  
  // Sort by z-order so elements render in correct order
  renderElements.sort((a, b) => a.zOrder - b.zOrder)

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{
          filter: isSelected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none',
        }}
      >
        {renderElements.map((element, i) => {
          const ringY = 20 + RING_DIAMETER / 2 + element.ringIndex * (RING_DIAMETER - RING_OVERLAP)
          const ring = rings[element.ringIndex]
          
          if (element.type === 'arc') {
            const pathD = createArcPath(centerX, ringY, radius, element.isLeftHalf!)
            
            return (
              <motion.path
                key={`${element.ringIndex}-${element.isLeftHalf ? 'left' : 'right'}-${i}`}
                d={pathD}
                fill="none"
                stroke={ring.color}
                strokeWidth={RING_STROKE_WIDTH}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ 
                  delay: element.ringIndex * 0.15,
                  duration: 0.6,
                  ease: "easeOut",
                }}
              />
            )
          } else {
            // Label
            return (
              <motion.text
                key={`label-${element.ringIndex}`}
                x={centerX + RING_DIAMETER / 2 + 20}
                y={ringY + 5}
                fill="#1a1a1a"
                fontSize={13}
                fontWeight={500}
                fontFamily="system-ui, -apple-system, sans-serif"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + element.ringIndex * 0.1 }}
              >
                {ring.label}
              </motion.text>
            )
          }
        })}
      </svg>
    </div>
  )
}

// ============================================================================
// ConcentricRings Node View Component
// ============================================================================

const ConcentricRingsNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, selected } = props
  
  // Parse rings from attributes or use defaults
  const rings: RingData[] = node.attrs.rings 
    ? JSON.parse(node.attrs.rings) 
    : DEFAULT_RINGS

  return (
    <NodeViewWrapper
      data-concentric-rings="true"
      style={{ margin: '16px 0' }}
    >
      <NodeOverlay nodeProps={props} nodeType="concentricRings">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
            borderRadius: 16,
            border: selected ? '2px solid #3b82f6' : '1px solid #e5e5e5',
            overflow: 'visible',
            padding: 20,
          }}
        >
          {/* Visualization */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: RING_DIAMETER * 2.5,
            }}
          >
            <ConcentricRingsVisualization rings={rings} isSelected={selected} />
          </div>
        </motion.div>
      </NodeOverlay>
    </NodeViewWrapper>
  )
}

// ============================================================================
// ConcentricRings TipTap Extension
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    concentricRings: {
      insertConcentricRings: (attrs?: { rings?: string }) => ReturnType
    }
  }
}

export const ConcentricRingsExtension = TipTapNode.create({
  name: "concentricRings",
  group: "block",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  
  addAttributes() {
    return {
      rings: {
        default: JSON.stringify(DEFAULT_RINGS),
      },
    }
  },
  
  parseHTML() {
    return [{ tag: 'div[data-type="concentric-rings"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'concentric-rings' }, 0]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ConcentricRingsNodeView)
  },
  
  addCommands() {
    return {
      insertConcentricRings: (attrs) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: attrs || {},
          })
          .run()
      },
    }
  },
})

export default ConcentricRingsExtension
