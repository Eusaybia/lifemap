"use client"

import React from "react"
import { motion } from "framer-motion"
import { Node as ProseMirrorNode } from "prosemirror-model"

// ============================================================================
// AURA COMPONENT
// ============================================================================
// A visual effects wrapper that applies glows to nodes.
// 
// PURPOSE:
// Provides consistent visual feedback across all nodes based on their content:
// - Glow effects for task completion status (orange for pending, green for done)
// - Focus tags are intentionally handled at line-level (HighlightImportantLinePlugin),
//   not at container level.
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
// Yellow glow for important tag - uses yellow hue (50°), reduced brightness for moderate emphasis
export const IMPORTANT_GLOW = `0 0 15px 4px hsla(50, 100%, 50%, 0.25), 0 0 60px 15px hsla(50, 100%, 50%, 0.12), 0 0 120px 30px hsla(50, 100%, 50%, 0.06), 0 0 180px 45px hsla(50, 100%, 50%, 0.03)`
// Very important glow - bright yellow for maximum attention
export const VERY_IMPORTANT_GLOW = `0 0 20px 5px hsla(50, 100%, 50%, 0.4), 0 0 80px 20px hsla(50, 100%, 50%, 0.2), 0 0 160px 40px hsla(50, 100%, 50%, 0.1), 0 0 250px 60px hsla(50, 100%, 50%, 0.05)`
export const NO_GLOW = ``

// Tag detection patterns
const COMPLETE_TAG = "✅ complete"
const IMPORTANT_TAG = "⭐️ important"
const VERY_IMPORTANT_TAG = "🌟 very important"
const UNIMPORTANT_TAG = "🌫️ unimportant"
const NOT_A_PRIORITY_TAG = "not-a-priority"

export interface AuraProps {
  /** The ProseMirror node to scan for tags */
  node: ProseMirrorNode | { attrs: Record<string, unknown> }
  /** Deprecated no-op: retained for API compatibility */
  quantaId?: string
  /** Children to render inside the aura */
  children: React.ReactNode
  /** Border radius (unused but kept for API compatibility) */
  borderRadius?: number
  /** Whether to enable glow effects (unused - now handled by NodeOverlay) */
  enableGlow?: boolean
  /** Deprecated no-op: focus spotlighting is disabled in favor of line-level highlighting */
  enableFocus?: boolean
}

/**
 * Scans a ProseMirror node for specific tags/mentions - SHALLOW SCAN ONLY
 * 
 * ARCHITECTURE DECISION: One-level-deep scanning
 * ==============================================
 * We only scan the node's immediate children and their inline content,
 * NOT deeply nested block nodes. This prevents a tag inside a nested
 * TemporalSpace from causing the parent container to glow.
 * 
 * Scan depth:
 * - Immediate children (paragraphs, taskItems, etc.)
 * - Inline content within those children (mentions, hashtags)
 * - STOPS at nested block nodes (temporalSpace, group, etc.) which have their own NodeOverlay
 * 
 * EXPORTED so NodeOverlay can use this for glow calculations
 */
export const scanNodeForTags = (node: ProseMirrorNode | { attrs: Record<string, unknown> }) => {
  // Retained in return shape for backward compatibility, but no longer set here.
  let hasFocusTag = false
  let hasCompleteTag = false
  let hasImportantTag = false
  let hasVeryImportantTag = false
  let hasUnimportantTag = false
  let hasNotPriorityTag = false
  let hasUncheckedTodo = false
  let hasCheckItem = false

  // Block node types that have their own NodeOverlay - don't scan into these
  const BLOCK_NODE_TYPES_WITH_OVERLAY = ['temporalSpace', 'group', 'daily', 'weekly', 'canvas3D', 'mapboxMap']

  // Helper to check a single node for tags
  const checkNodeForTags = (childNode: ProseMirrorNode) => {
    // Check for mention tags (legacy CustomMention extension)
    // and hashtag nodes (current HashtagMention extension)
    if (childNode.type.name === 'mention' || childNode.type.name === 'hashtag') {
      const label = childNode.attrs.label as string
      const dataTag = childNode.attrs['data-tag'] as string
      const id = childNode.attrs.id as string

      // Check for complete tag
      if (label?.includes(COMPLETE_TAG) || dataTag === 'complete') {
        hasCompleteTag = true
      }
      // Check for very important tag (must check before important since "very important" contains "important")
      if (label?.includes(VERY_IMPORTANT_TAG) || dataTag === 'very important') {
        hasVeryImportantTag = true
      }
      // Check for important tag (only if not already very important)
      else if (label?.includes(IMPORTANT_TAG) || dataTag === 'important') {
        hasImportantTag = true
      }
      // Check for unimportant tag (triggers darkening overlay)
      if (
        label?.includes(UNIMPORTANT_TAG) ||
        label?.includes(NOT_A_PRIORITY_TAG) ||
        dataTag === 'unimportant' ||
        dataTag === NOT_A_PRIORITY_TAG ||
        id === 'tag:not-a-priority'
      ) {
        hasUnimportantTag = true
        if (
          label?.includes(NOT_A_PRIORITY_TAG) ||
          dataTag === NOT_A_PRIORITY_TAG ||
          id === 'tag:not-a-priority'
        ) {
          hasNotPriorityTag = true
        }
      }
    }
    // Check for task items
    if (childNode.type.name === 'taskItem') {
      hasCheckItem = true
      if (!childNode.attrs.checked) {
        hasUncheckedTodo = true
      }
    }
  }

  // Check if node has forEach method (real ProseMirrorNode)
  if ('forEach' in node && typeof node.forEach === 'function') {
    // Scan immediate children only
    (node as ProseMirrorNode).forEach((childNode: ProseMirrorNode) => {
      // Skip nested block nodes that have their own NodeOverlay
      if (BLOCK_NODE_TYPES_WITH_OVERLAY.includes(childNode.type.name)) {
        return // Don't scan into nested blocks
      }

      // Check the child node itself
      checkNodeForTags(childNode)

      // For inline containers (paragraphs, etc.), scan their inline content
      if ('forEach' in childNode && typeof childNode.forEach === 'function') {
        childNode.forEach((inlineNode: ProseMirrorNode) => {
          checkNodeForTags(inlineNode)
        })
      }
    })
  }

  return {
    hasFocusTag,
    hasCompleteTag,
    hasImportantTag,
    hasVeryImportantTag,
    hasUnimportantTag,
    hasNotPriorityTag,
    hasUncheckedTodo,
    hasCheckItem,
  }
}

/**
 * Calculates the glow styles based on node tags
 * EXPORTED so NodeOverlay can combine glows with drop shadow
 */
export const calculateGlowStyles = (tags: ReturnType<typeof scanNodeForTags>): string[] => {
  const glowStyles: string[] = []

  // Complete tag adds green glow
  if (tags.hasCompleteTag) {
    glowStyles.push(GREEN_GLOW)
  }

  // Very important tag adds bright yellow glow (maximum emphasis)
  if (tags.hasVeryImportantTag) {
    glowStyles.push(VERY_IMPORTANT_GLOW)
  }
  // Important tag adds yellow glow (moderate emphasis)
  else if (tags.hasImportantTag) {
    glowStyles.push(IMPORTANT_GLOW)
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
  children,
}) => {
  // Node is intentionally accepted for API compatibility with existing NodeOverlay usage.
  void node

  // Note: Glow effects are now applied by NodeOverlay on the outer wrapper
  // Aura now acts as a lightweight content wrapper only.

  return (
    <motion.div
      style={{
        position: 'relative',
        overflow: 'visible',
      }}
      animate={{
        scale: 1,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Node content */}
      {children}
    </motion.div>
  )
}

export default Aura
