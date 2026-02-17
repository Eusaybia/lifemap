"use client"

import React, { useRef, useMemo } from "react"
import { Editor } from "@tiptap/core"
import { Node as ProseMirrorNode } from "prosemirror-model"
import { motion } from "framer-motion"
import { DragGrip } from "./DragGrip"
import { Aura, scanNodeForTags, calculateGlowStyles } from "./Aura"

// Minimal props interface - accepts any node view props that have the required fields
// This allows custom node interfaces (e.g., MapboxMapNodeViewProps) to work with NodeOverlay
interface MinimalNodeViewProps {
  node: { attrs: Record<string, unknown> } | ProseMirrorNode
  getPos: () => number | undefined
  editor: Editor
}

// ============================================================================
// NODE OVERLAY COMPONENT
// ============================================================================
// A reusable wrapper component that adds connection support to any TipTap node.
// 
// PURPOSE:
// Provides a standard overlay pattern for nodes that need to participate in
// the connection system (GroupConnectionManager). This includes:
// - A 6-dot DragGrip on the top-right (consistent with Group, ExternalPortal)
// - Uses the TipTap UniqueID extension's `quantaId` attribute for connection targeting
//
// PREREQUISITES:
// For a node to work with NodeOverlay, add it to the `types` array in:
// RichText.tsx → UniqueID.configure({ types: [...] })
// This automatically gives the node a unique `quantaId` attribute.
//
// USAGE:
// Wrap your node's content inside NodeOverlay within the ReactNodeViewRenderer:
//
//   <NodeViewWrapper>
//     <NodeOverlay nodeProps={props} nodeType="daily">
//       {/* Your node content here */}
//     </NodeOverlay>
//   </NodeViewWrapper>
//
// CONNECTION ARCHITECTURE:
// The connection system (GroupConnectionManager) supports three element types:
// 1. Block Groups - data-group-node-view="true" + data-group-id
// 2. Span Groups - class="span-group" + data-span-group-id
// 3. Generic Nodes - data-node-overlay="true" + data-quanta-id (this component)
//
// All three types share the same 6-dot grip pattern for visual consistency.
// ============================================================================

// Standard drop shadow matching Group component - creates nice depth effect
// Multi-layer shadow: close shadow for crispness, medium for depth, far for ambient
const GROUP_BOX_SHADOW = `-2px 3px 6px -1px rgba(0, 0, 0, 0.25), -4px 6px 12px -2px rgba(0, 0, 0, 0.2), -8px 12px 24px -3px rgba(0, 0, 0, 0.15)`
const GROUP_BORDER_RADIUS = 10

export interface NodeOverlayProps {
  /** The NodeViewProps from ReactNodeViewRenderer (accepts custom interfaces too) */
  nodeProps: MinimalNodeViewProps
  /** The type of node (e.g., 'daily', 'weekly', 'canvas') - used for debugging */
  nodeType: string
  /** Children to render inside the overlay */
  children: React.ReactNode
  /** Optional additional styles for the wrapper */
  style?: React.CSSProperties
  /** Whether to show the grip (default: true) */
  showGrip?: boolean
  /** Position of the grip (default: 'top-right') */
  gripPosition?: 'top-right' | 'top-left'
  /** Top offset for grip (default: 10) */
  gripTop?: number
  /** Right offset for grip (default: 6) */
  gripRight?: number
  /** Dot color for grip (default: '#999') */
  gripDotColor?: string
  /** Custom box shadow (defaults to Group-style multi-layer shadow) */
  boxShadow?: string
  /** Border radius in pixels (default: 10, matching Group) */
  borderRadius?: number
  /** Background color (default: 'transparent' for 3D scene integration) */
  backgroundColor?: string
  /** Padding (default: '20px', matching Group) */
  padding?: string | number
  /** Whether to enable Aura glow effects (default: true) */
  enableAuraGlow?: boolean
  /** Deprecated no-op: focus spotlighting is disabled in favor of line-level highlighting */
  enableAuraFocus?: boolean
  /** Whether this node is in private lens mode - shows full-coverage black overlay */
  isPrivate?: boolean
  /** Custom mouseDown handler for the grip - overrides default selection behavior
      Useful for canvas items where grip should trigger dragging instead of selection */
  onGripMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void
}

const GRIP_HIT_TARGET = 40
const GRIP_HIT_EXPANSION = 6

export const NodeOverlay: React.FC<NodeOverlayProps> = ({
  nodeProps,
  nodeType,
  children,
  style,
  showGrip = true,
  gripPosition = 'top-right',
  gripTop = 10,
  gripRight = 6,
  gripDotColor = '#999',
  boxShadow = GROUP_BOX_SHADOW,
  borderRadius = GROUP_BORDER_RADIUS,
  // ARCHITECTURE DECISION: Transparent default for 3D scene integration
  // ===================================================================
  // When embedded in 3D scenes (natural-calendar-v3, notes-natural-ui),
  // we want shadows to show through from the Canvas behind.
  backgroundColor = 'transparent',
  padding = '20px',
  enableAuraGlow = true,
  enableAuraFocus,
  isPrivate = false,
  onGripMouseDown,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  
  // Get the quantaId from the node - this is automatically managed by TipTap's UniqueID extension
  // Make sure the node type is added to UniqueID.configure({ types: [...] }) in RichText.tsx
  const quantaId = nodeProps.node.attrs.quantaId as string | undefined

  // Scan node for tags to determine glow effects
  const tags = useMemo(() => scanNodeForTags(nodeProps.node as ProseMirrorNode), [nodeProps.node])
  
  // Calculate glow styles based on tags
  const glowStyles = useMemo(() => {
    if (!enableAuraGlow) return []
    return calculateGlowStyles(tags)
  }, [tags, enableAuraGlow])

  // Combine drop shadow with glow effects
  // Glows appear on the rim alongside the drop shadow
  const combinedShadow = useMemo(() => {
    const shadows = [boxShadow]
    
    // Add tag-based glows
    if (glowStyles.length > 0) {
      shadows.push(...glowStyles.filter(g => g !== ''))
    }

    return shadows.filter(s => s).join(', ')
  }, [boxShadow, glowStyles])

  // Default grip handler - selects the node in the editor
  // Can be overridden via onGripMouseDown prop for custom behavior (e.g., dragging in canvas)
  // IMPORTANT: Do NOT call e.preventDefault() or e.stopPropagation() here, as this would
  // block TipTap's native drag behavior. The data-drag-handle attribute on DragGrip tells
  // TipTap to use that element as the drag handle, and we need to let events bubble up.
  const handleGripMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onGripMouseDown) {
      // Use custom handler if provided (caller is responsible for event handling)
      onGripMouseDown(e)
    } else {
      // Default behavior: select the node for TipTap dragging
      // We don't preventDefault or stopPropagation to allow native drag to work
      const pos = nodeProps.getPos()
      if (typeof pos === 'number') {
        // Ensure keyboard shortcuts (cut/copy/paste) target the editor after grip clicks.
        nodeProps.editor.chain().focus().setNodeSelection(pos).run()
      }
    }
  }

  return (
    <motion.div
      ref={overlayRef}
      data-node-overlay="true"
      data-quanta-id={quantaId}
      data-node-type={nodeType}
      style={{
        position: 'relative',
        borderRadius,
        backgroundColor,
        padding,
        margin: '8px 0',
        ...style,
      }}
      animate={{
        boxShadow: combinedShadow,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* DragGrip for selection and connection support
          Can be customized via onGripMouseDown prop for dragging etc. */}
      {showGrip && (
        <div
          onMouseDown={handleGripMouseDown}
          className="node-overlay-grip-handle"
          data-drag-handle
          style={{
            position: 'absolute',
            top: Math.max(0, gripTop - GRIP_HIT_EXPANSION),
            [gripPosition === 'top-right' ? 'right' : 'left']: Math.max(0, gripRight - GRIP_HIT_EXPANSION),
            zIndex: 10,
            cursor: 'pointer',
            width: GRIP_HIT_TARGET,
            height: GRIP_HIT_TARGET,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <DragGrip
            position="inline"
            dotColor={gripDotColor}
            hoverBackground="rgba(0, 0, 0, 0.08)"
          />
        </div>
      )}
      
      {/* Aura wrapper for shared node visual behavior */}
      <Aura
        node={nodeProps.node as ProseMirrorNode}
        quantaId={quantaId}
        borderRadius={borderRadius}
        enableGlow={enableAuraGlow}
        enableFocus={enableAuraFocus}
      >
        {children}
      </Aura>

      {/* Unimportant tag overlay - 55% white overlay to strongly fade/de-emphasize content
          ARCHITECTURE DECISION: Fading via semi-transparent white overlay
          ================================================================
          Using a semi-transparent white overlay creates a "faded" appearance that 
          de-emphasizes content while preserving readability and allowing 3D shadows
          to partially show through. */}
      {tags.hasUnimportantTag && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Private lens overlay - full coverage black overlay */}
      {isPrivate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000000',
            borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: '#666', fontSize: 14 }}>Private</span>
        </motion.div>
      )}
    </motion.div>
  )
}

export default NodeOverlay
