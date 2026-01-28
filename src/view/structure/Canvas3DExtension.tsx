"use client"

import React, { useState, useEffect, useRef } from "react"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion } from "framer-motion"

// ============================================================================
// 3D Canvas Component
// Architecture: A cork-board style canvas for placing 3D models from Sketchfab.
// Uses Sketchfab Web Importer widget for authentication, search, and download.
// 3D rendering is done via embedded Sketchfab viewer to avoid React version conflicts.
// Reference: https://sketchfab.com/developers/download-api/libraries#javascript-libraries
// ============================================================================

// Declare the global SketchfabImporter type
declare global {
  interface Window {
    SketchfabImporter: new (
      element: HTMLElement,
      options: { onModelSelected: (result: SketchfabModelResult) => void }
    ) => void
  }
}

// Sketchfab Web Importer returns nested structure with model info and download URLs
interface SketchfabModelResult {
  model?: {
    uid?: string
    name?: string
    thumbnails?: {
      images: Array<{ url: string; width: number; height: number }>
    }
  }
  download?: {
    gltf?: {
      url: string
      size: number
      expires: number
    }
    glb?: {
      url: string
      size: number
      expires: number
    }
    usdz?: {
      url: string
      size: number
      expires: number
    }
  }
}

const Canvas3DNodeView: React.FC<NodeViewProps> = (props) => {
  const { selected, deleteNode, node, updateAttributes } = props
  const [showImporter, setShowImporter] = useState(false)
  // Store the glTF download URL (expires in ~5 mins) or Sketchfab model UID for embed fallback
  const [modelUrl, setModelUrl] = useState<string | null>(node.attrs.modelUrl || null)
  const [modelUid, setModelUid] = useState<string | null>(node.attrs.modelUid || null)
  const [modelName, setModelName] = useState<string | null>(node.attrs.modelName || null)
  const [isLoading, setIsLoading] = useState(false)
  const importerContainerRef = useRef<HTMLDivElement>(null)
  const importerInitialized = useRef(false)

  // Load the Sketchfab Importer script
  useEffect(() => {
    if (!showImporter) return

    // Check if script already loaded
    if (window.SketchfabImporter) {
      initializeImporter()
      return
    }

    // Load the script
    const script = document.createElement('script')
    script.src = 'https://apps.sketchfab.com/web-importer/sketchfab-importer.js'
    script.async = true
    script.onload = () => {
      initializeImporter()
    }
    document.body.appendChild(script)

    return () => {
      // Cleanup if needed
    }
  }, [showImporter])

  const initializeImporter = () => {
    if (!importerContainerRef.current || importerInitialized.current) return
    if (!window.SketchfabImporter) return

    importerInitialized.current = true
    
    new window.SketchfabImporter(importerContainerRef.current, {
      onModelSelected: (result: SketchfabModelResult) => {
        console.log('Model selected - full result:', result)
        
        // Extract from nested structure
        const modelInfo = result.model
        const downloadInfo = result.download
        
        console.log('Model info:', modelInfo)
        console.log('Download info:', downloadInfo)
        
        setShowImporter(false)
        
        const name = modelInfo?.name || 'Untitled Model'
        const uid = modelInfo?.uid
        // Prefer GLB (single binary file) over GLTF (which is a ZIP archive from Sketchfab)
        const glbUrl = downloadInfo?.glb?.url
        const gltfUrl = downloadInfo?.gltf?.url
        const downloadUrl = glbUrl || gltfUrl
        
        console.log('GLB URL:', glbUrl)
        console.log('GLTF URL:', gltfUrl)
        
        // Prefer GLB download URL (single binary, no extraction needed)
        if (downloadUrl) {
          console.log('Using download URL:', downloadUrl, glbUrl ? '(GLB)' : '(GLTF ZIP)')
          
          // If only GLTF (ZIP) is available, fall back to Sketchfab embed
          // since we can't easily extract ZIP files in the browser
          if (!glbUrl && gltfUrl) {
            console.log('GLTF is a ZIP archive - falling back to Sketchfab embed')
            setModelUrl(null)
            setModelUid(uid || null)
            setModelName(name)
            updateAttributes({ 
              modelUrl: null,
              modelUid: uid || null,
              modelName: name
            })
            return
          }
          
          setIsLoading(true)
          setModelUrl(downloadUrl)
          setModelUid(uid || null)
          setModelName(name)
          updateAttributes({ 
            modelUrl: downloadUrl,
            modelUid: uid || null,
            modelName: name
          })
        } 
        // Fall back to Sketchfab embed viewer using model UID
        else if (uid) {
          console.log('Using Sketchfab embed with UID:', uid)
          setModelUrl(null)
          setModelUid(uid)
          setModelName(name)
          updateAttributes({ 
            modelUrl: null,
            modelUid: uid,
            modelName: name
          })
        }
        else {
          console.error('No model URL or UID available in result')
        }
      }
    })
  }

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'model-loaded') {
        setIsLoading(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleOpenImporter = () => {
    importerInitialized.current = false
    setShowImporter(true)
  }
  
  const handleClearModel = () => {
    setModelUrl(null)
    setModelUid(null)
    setModelName(null)
    updateAttributes({ modelUrl: null, modelUid: null, modelName: null })
  }
  
  // Determine if we have any model to display
  const hasModel = modelUrl || modelUid

  return (
    <NodeViewWrapper
      data-canvas-3d="true"
      style={{ margin: '16px 0' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '400px',
          borderRadius: '12px',
          overflow: 'hidden',
          // Cork board background - warm brown with subtle texture appearance
          background: 'linear-gradient(135deg, #C4A574 0%, #B8956E 25%, #D4B896 50%, #C9A87C 75%, #BF9A6C 100%)',
          border: selected ? '2px solid rgba(100, 150, 255, 0.8)' : '1px solid rgba(139, 90, 43, 0.4)',
          boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.1), 0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Cork texture overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(139, 90, 43, 0.15) 1px, transparent 1px),
              radial-gradient(circle at 60% 70%, rgba(139, 90, 43, 0.12) 1px, transparent 1px),
              radial-gradient(circle at 40% 50%, rgba(139, 90, 43, 0.1) 2px, transparent 2px),
              radial-gradient(circle at 80% 20%, rgba(139, 90, 43, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px, 40px 40px, 50px 50px, 35px 35px',
            pointerEvents: 'none',
          }}
        />

        {/* Search button - top right */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
          }}
        >
          <motion.button
            type="button"
            onClick={handleOpenImporter}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              padding: '10px 16px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              fontSize: '14px',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 500,
              color: '#333',
            }}
          >
            {/* Search icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#666"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Search for 3D models
          </motion.button>
        </div>

        {/* Sketchfab Importer Modal */}
        {showImporter && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setShowImporter(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '900px',
                height: '80vh',
                maxHeight: '700px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setShowImporter(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  zIndex: 10,
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                ✕ Close
              </button>
              
              {/* Sketchfab Importer container */}
              <div
                ref={importerContainerRef}
                className="skfb-widget"
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            </motion.div>
          </div>
        )}

        {/* 3D Model viewer - shows when model is selected */}
        {hasModel && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {/* If we have a glTF URL, use our custom 3D canvas */}
            {modelUrl && (
              <iframe
                title={modelName || '3D Model'}
                src={`/canvas-3d?url=${encodeURIComponent(modelUrl)}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            )}
            
            {/* If we only have a UID (no download available), use Sketchfab embed */}
            {!modelUrl && modelUid && (
              <iframe
                title={modelName || 'Sketchfab 3D Model'}
                src={`https://sketchfab.com/models/${modelUid}/embed?autostart=1&ui_controls=1&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0&ui_watermark_link=0`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
              />
            )}
            
            {/* Model name overlay */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                padding: '6px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {modelName}
            </div>
            
            {/* Clear model button */}
            <button
              type="button"
              onClick={handleClearModel}
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              Choose different model
            </button>
          </div>
        )}

        {/* Empty state / drop zone */}
        {!hasModel && !isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'rgba(139, 90, 43, 0.6)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '12px',
              }}
            >
              🎨
            </div>
            <div
              style={{
                fontSize: '16px',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 500,
              }}
            >
              Click "Search for 3D models" to browse Sketchfab
            </div>
            <div
              style={{
                fontSize: '13px',
                fontFamily: "'Inter', system-ui, sans-serif",
                marginTop: '8px',
                opacity: 0.8,
              }}
            >
              Over 1 million free 3D models available
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'rgba(139, 90, 43, 0.8)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
            <div
              style={{
                fontSize: '16px',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 500,
              }}
            >
              Loading model...
            </div>
          </div>
        )}

        {/* Delete button - only show when selected */}
        {selected && (
          <button
            type="button"
            onClick={deleteNode}
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              padding: '6px 10px',
              background: 'rgba(220, 38, 38, 0.9)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#FFFFFF',
              fontWeight: 500,
            }}
            title="Delete"
          >
            ✕ Delete
          </button>
        )}

        {/* Sketchfab attribution - required by API guidelines */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#666',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <span>3D models by</span>
          <a
            href="https://sketchfab.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#1CAAD9',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            Sketchfab
          </a>
        </div>
      </motion.div>
    </NodeViewWrapper>
  )
}

// ============================================================================
// 3D Canvas TipTap Extension
// ============================================================================

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    canvas3D: {
      insertCanvas3D: () => ReturnType
    }
  }
}

export const Canvas3DExtension = TipTapNode.create({
  name: "canvas3D",
  group: "block",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  
  addAttributes() {
    return {
      // Store the glTF download URL (note: expires after ~5 mins, for session use)
      modelUrl: {
        default: null,
      },
      // Store Sketchfab model UID for embed fallback when glTF not available
      modelUid: {
        default: null,
      },
      modelName: {
        default: null,
      },
    }
  },
  
  parseHTML() {
    return [{ tag: 'div[data-type="canvas-3d"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'canvas-3d' }, 0]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(Canvas3DNodeView)
  },
  
  addCommands() {
    return {
      insertCanvas3D: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
          })
          .run()
      },
    }
  },
})

export default Canvas3DExtension
