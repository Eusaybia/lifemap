"use client"

import React, { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Node as ProseMirrorNode } from "prosemirror-model"
import { DocumentAttributes, defaultDocumentAttributes } from "../structure/DocumentAttributesExtension"

// ============================================================================
// AURA COMPONENT
// ============================================================================
// A visual effects wrapper that applies glows and focus dimming to nodes.
// 
// PURPOSE:
// Provides consistent visual feedback across all nodes based on their content:
// - Glow effects for task completion status (orange for pending, green for done)
// - Focus mode: highlights nodes with "☀️ focus" tag, dims all others
//
// ARCHITECTURE:
// The Aura component wraps node content and applies visual effects based on:
// 1. Node content scanning (for tags like "☀️ focus", "✅ complete")
// 2. Document-level state (focusedNodeIds from DocumentAttributes)
//
// When ANY node in the document has a focus tag, all nodes without focus
// get dimmed, creating a spotlight effect on the focused content.
//
// USAGE:
// Integrated into NodeOverlay - wraps children automatically.
// Can also be used standalone:
//   <Aura node={proseMirrorNode}>
//     {children}
//   </Aura>
// ============================================================================

// Glow effect constants - rim glow that traces the edge of the group
// These are EXPORTED so NodeOverlay can combine them with the drop shadow
// Very wide, faint bloom effect - spreads far with soft ethereal glow
// Multiple layers create a dramatic bloom from the edge outward
export const ORANGE_GLOW = `0 0 20px 5px hsla(30, 100%, 50%, 0.35), 0 0 80px 20px hsla(30, 100%, 50%, 0.18), 0 0 160px 40px hsla(30, 100%, 50%, 0.08), 0 0 250px 60px hsla(30, 100%, 50%, 0.04)`
export const GREEN_GLOW = `0 0 20px 5px hsl(104, 64%, 45%, 0.35), 0 0 80px 20px hsl(104, 64%, 45%, 0.18), 0 0 160px 40px hsl(104, 64%, 45%, 0.08), 0 0 250px 60px hsl(104, 64%, 45%, 0.04)`
export const FOCUS_GLOW = `0 0 20px 5px hsla(55, 100%, 50%, 0.4), 0 0 80px 20px hsla(55, 100%, 50%, 0.2), 0 0 160px 40px hsla(55, 100%, 50%, 0.1), 0 0 250px 60px hsla(55, 100%, 50%, 0.05)`
export const NO_GLOW = ``

// Tag detection patterns
const FOCUS_TAG = "☀️ focus"
const COMPLETE_TAG = "✅ complete"

export interface AuraProps {
  /** The ProseMirror node to scan for tags */
  node: ProseMirrorNode | { attrs: Record<string, unknown> }
  /** The quantaId of this node (for focus tracking) */
  quantaId?: string
  /** Children to render inside the aura */
  children: React.ReactNode
  /** Border radius (unused but kept for API compatibility) */
  borderRadius?: number
  /** Whether to enable glow effects (unused - now handled by NodeOverlay) */
  enableGlow?: boolean
  /** Whether to enable focus mode effects (default: true) */
  enableFocus?: boolean
}

/**
 * Scans a ProseMirror node and its descendants for specific tags/mentions
 * EXPORTED so NodeOverlay can use this for glow calculations
 */
export const scanNodeForTags = (node: ProseMirrorNode | { attrs: Record<string, unknown> }) => {
  let hasFocusTag = false
  let hasCompleteTag = false
  let hasUncheckedTodo = false
  let hasCheckItem = false

  // Check if node has descendants method (real ProseMirrorNode)
  if ('descendants' in node && typeof node.descendants === 'function') {
    node.descendants((childNode: ProseMirrorNode) => {
      // Check for mention tags (legacy CustomMention extension)
      // and hashtag nodes (current HashtagMention extension)
      if (childNode.type.name === 'mention' || childNode.type.name === 'hashtag') {
        const label = childNode.attrs.label as string
        const dataTag = childNode.attrs['data-tag'] as string
        
        // Check for focus tag - either by label or data-tag attribute
        if (label?.includes(FOCUS_TAG) || dataTag === 'focus') {
          hasFocusTag = true
        }
        // Check for complete tag
        if (label?.includes(COMPLETE_TAG) || dataTag === 'complete') {
          hasCompleteTag = true
        }
      }
      // Check for task items
      if (childNode.type.name === 'taskItem') {
        hasCheckItem = true
        if (!childNode.attrs.checked) {
          hasUncheckedTodo = true
        }
      }
    })
  }

  return { hasFocusTag, hasCompleteTag, hasUncheckedTodo, hasCheckItem }
}

/**
 * Calculates the glow styles based on node tags
 * EXPORTED so NodeOverlay can combine glows with drop shadow
 */
export const calculateGlowStyles = (tags: ReturnType<typeof scanNodeForTags>): string[] => {
  const glowStyles: string[] = []

  // Focus tag adds a warm yellow glow
  if (tags.hasFocusTag) {
    glowStyles.push(FOCUS_GLOW)
  }

  // Complete tag adds green glow
  if (tags.hasCompleteTag) {
    glowStyles.push(GREEN_GLOW)
  }

  // Task items: orange for unchecked, green if all checked
  if (tags.hasUncheckedTodo) {
    glowStyles.push(ORANGE_GLOW)
  } else if (tags.hasCheckItem) {
    glowStyles.push(GREEN_GLOW)
  }

  // Return at least a no-glow default
  return glowStyles.length > 0 ? glowStyles : [NO_GLOW]
}

export const Aura: React.FC<AuraProps> = ({
  node,
  quantaId,
  children,
  enableFocus = true,
}) => {
  // Document-level state for focus mode
  const [focusedNodeIds, setFocusedNodeIds] = useState<string[]>([])

  // Scan node for tags (needed to track focus tag for updating focusedNodeIds)
  const tags = useMemo(() => scanNodeForTags(node), [node])

  // Note: Glow rendering is now handled by NodeOverlay on the outer wrapper
  // Aura only handles focus mode tracking and scale animation

  // Listen for document attribute updates (focus mode changes)
  useEffect(() => {
    const handleAttributeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<DocumentAttributes>
      const updatedAttributes = customEvent.detail
      if (updatedAttributes?.focusedNodeIds) {
        setFocusedNodeIds(updatedAttributes.focusedNodeIds)
      }
    }

    window.addEventListener('doc-attributes-updated', handleAttributeUpdate as EventListener)

    // Initialize from localStorage
    try {
      const stored = localStorage.getItem('tiptapDocumentAttributes')
      if (stored) {
        const attrs = JSON.parse(stored) as DocumentAttributes
        if (attrs.focusedNodeIds) {
          setFocusedNodeIds(attrs.focusedNodeIds)
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return () => {
      window.removeEventListener('doc-attributes-updated', handleAttributeUpdate as EventListener)
    }
  }, [])

  // Update focused node IDs when this node has focus tag
  useEffect(() => {
    if (!enableFocus || !quantaId) return

    // Get current focused IDs from localStorage
    let currentFocusedIds: string[] = []
    try {
      const stored = localStorage.getItem('tiptapDocumentAttributes')
      if (stored) {
        const attrs = JSON.parse(stored) as DocumentAttributes
        currentFocusedIds = attrs.focusedNodeIds || []
      }
    } catch (e) {
      // Ignore errors
    }

    const isCurrentlyFocused = currentFocusedIds.includes(quantaId)

    if (tags.hasFocusTag && !isCurrentlyFocused) {
      // Add this node to focused list
      const newFocusedIds = [...currentFocusedIds, quantaId]
      updateFocusedNodeIds(newFocusedIds)
    } else if (!tags.hasFocusTag && isCurrentlyFocused) {
      // Remove this node from focused list
      const newFocusedIds = currentFocusedIds.filter(id => id !== quantaId)
      updateFocusedNodeIds(newFocusedIds)
    }
  }, [tags.hasFocusTag, quantaId, enableFocus])

  // Determine spotlight state
  // When focus mode is active, the SpotlightOverlay darkens everything at z-index 100
  // Focused nodes are elevated to z-index 200 to appear above the overlay
  const isFocusModeActive = focusedNodeIds.length > 0
  const thisNodeHasFocus = quantaId ? focusedNodeIds.includes(quantaId) : tags.hasFocusTag
  const isSpotlit = enableFocus && isFocusModeActive && thisNodeHasFocus

  // Note: Glow effects are now applied by NodeOverlay on the outer wrapper
  // Aura only handles spotlight elevation (z-index) for focus mode
  // This ensures glows appear on the rim of the card alongside the drop shadow

  return (
    <motion.div
      style={{
        position: 'relative',
        overflow: 'visible',
      }}
      animate={{
        // Scale up slightly when spotlit for emphasis
        scale: isSpotlit ? 1.02 : 1,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Node content */}
      {children}
    </motion.div>
  )
}

/**
 * Helper function to update focused node IDs in localStorage and dispatch event
 */
const updateFocusedNodeIds = (newFocusedIds: string[]) => {
  try {
    const stored = localStorage.getItem('tiptapDocumentAttributes')
    const currentAttrs = stored 
      ? { ...defaultDocumentAttributes, ...JSON.parse(stored) }
      : { ...defaultDocumentAttributes }
    
    const updatedAttributes = { ...currentAttrs, focusedNodeIds: newFocusedIds }
    localStorage.setItem('tiptapDocumentAttributes', JSON.stringify(updatedAttributes))
    
    // Dispatch event to notify all listeners
    window.dispatchEvent(new CustomEvent('doc-attributes-updated', { detail: updatedAttributes }))
  } catch (e) {
    console.error('Error updating focused node IDs:', e)
  }
}

export default Aura
