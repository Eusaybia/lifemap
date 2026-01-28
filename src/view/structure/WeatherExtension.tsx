"use client"

import React from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"

// ============================================================================
// Weather Card Component
// Architecture: Self-contained visual weather card that renders a sunny day
// with animated sun, clouds, and blue sky gradient background.
// No NodeOverlay wrapper - just the weather visualization directly.
// ============================================================================

const WeatherCardNodeView: React.FC<NodeViewProps> = (props) => {
  const { selected, deleteNode } = props

  return (
    <NodeViewWrapper
      data-weather-card="true"
      style={{ margin: '8px 0', display: 'inline-block' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'relative',
          width: '320px',
          height: '180px',
          borderRadius: '16px',
          overflow: 'hidden',
          // Blue sky gradient background
          background: 'linear-gradient(180deg, #4A90D9 0%, #87CEEB 50%, #B0E0E6 100%)',
          border: selected ? '2px solid rgba(100, 150, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          cursor: 'default',
        }}
      >
          {/* Sun */}
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '30px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #FFE066 0%, #FFD700 50%, #FFA500 100%)',
              boxShadow: '0 0 40px rgba(255, 215, 0, 0.6), 0 0 80px rgba(255, 165, 0, 0.3)',
            }}
          />

          {/* Sun rays */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                top: '50px',
                right: '60px',
                width: '3px',
                height: '20px',
                background: 'linear-gradient(180deg, #FFD700 0%, transparent 100%)',
                borderRadius: '2px',
                transformOrigin: 'center -10px',
                transform: `rotate(${i * 45}deg)`,
              }}
            />
          ))}

          {/* Cloud 1 - large */}
          <motion.div
            animate={{ 
              x: [0, 10, 0],
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              top: '40px',
              left: '20px',
            }}
          >
            <CloudShape width={80} height={40} />
          </motion.div>

          {/* Cloud 2 - medium */}
          <motion.div
            animate={{ 
              x: [0, -8, 0],
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              top: '70px',
              left: '140px',
            }}
          >
            <CloudShape width={60} height={30} />
          </motion.div>

          {/* Cloud 3 - small */}
          <motion.div
            animate={{ 
              x: [0, 6, 0],
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              top: '25px',
              left: '100px',
            }}
          >
            <CloudShape width={45} height={22} />
          </motion.div>

          {/* Temperature and condition text */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '20px',
              color: '#FFFFFF',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 300,
                fontFamily: "'Inter', system-ui, sans-serif",
                letterSpacing: '-1px',
              }}
            >
              24°
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                opacity: 0.9,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Sunny
            </div>
          </div>

          {/* Delete button - only show when selected */}
          {selected && (
            <button
              type="button"
              onClick={deleteNode}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '4px 8px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#FFFFFF',
              }}
              title="Delete"
            >
              ✕
            </button>
          )}
      </motion.div>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Cloud Shape Component
// ============================================================================

interface CloudShapeProps {
  width: number
  height: number
}

const CloudShape: React.FC<CloudShapeProps> = ({ width, height }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 50"
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
    >
      <ellipse cx="30" cy="35" rx="25" ry="15" fill="rgba(255, 255, 255, 0.95)" />
      <ellipse cx="50" cy="25" rx="20" ry="18" fill="rgba(255, 255, 255, 0.95)" />
      <ellipse cx="70" cy="32" rx="22" ry="14" fill="rgba(255, 255, 255, 0.95)" />
      <ellipse cx="45" cy="38" rx="30" ry="12" fill="rgba(255, 255, 255, 0.95)" />
    </svg>
  )
}

// ============================================================================
// Weather TipTap Extension
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    weatherCard: {
      insertWeatherCard: () => ReturnType
    }
  }
}

export const WeatherExtension = TipTapNode.create({
  name: "weatherCard",
  group: "block",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  
  addAttributes() {
    return {}
  },
  
  parseHTML() {
    return [{ tag: 'div[data-type="weather-card"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'weather-card' }, 0]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(WeatherCardNodeView)
  },
  
  addCommands() {
    return {
      insertWeatherCard: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
          })
          .run()
      },
    }
  },
})

export default WeatherExtension
