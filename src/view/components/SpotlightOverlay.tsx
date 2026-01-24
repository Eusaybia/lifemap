"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DocumentAttributes } from "../structure/DocumentAttributesExtension"

// ============================================================================
// SPOTLIGHT OVERLAY COMPONENT
// ============================================================================
// Creates a full-editor dark overlay when focus mode is active.
// 
// PURPOSE:
// When any node has the "☀️ focus" tag, this overlay darkens the entire editor
// while the Aura component elevates focused nodes above the overlay, creating
// a dramatic spotlight effect.
//
// ARCHITECTURE:
// - Listens for `doc-attributes-updated` events to detect focus mode changes
// - Renders a semi-transparent black overlay that covers the editor
// - Focused nodes (via Aura) get elevated z-index to appear above this overlay
// - The overlay has pointer-events: none so users can still interact with content
//
// USAGE:
// Add this component inside the editor container (e.g., in RichText.tsx):
//   <div style={{ position: 'relative' }}>
//     <EditorContent editor={editor} />
//     <SpotlightOverlay />
//   </div>
// ============================================================================

export const SpotlightOverlay: React.FC = () => {
  const [focusedNodeIds, setFocusedNodeIds] = useState<string[]>([])

  // Listen for document attribute updates
  useEffect(() => {
    const handleAttributeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<DocumentAttributes>
      const updatedAttributes = customEvent.detail
      if (updatedAttributes?.focusedNodeIds !== undefined) {
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

  const isActive = focusedNodeIds.length > 0

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            // z-index 100 - focused nodes will be at z-index 200
            zIndex: 100,
            // Allow clicks to pass through to content
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  )
}

export default SpotlightOverlay
