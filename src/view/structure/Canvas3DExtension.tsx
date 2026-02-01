"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import InfiniteViewer from "infinite-viewer"
import { Node as TipTapNode } from "@tiptap/core"
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from "@tiptap/react"
import { motion, AnimatePresence } from "framer-motion"
import { NodeOverlay } from "../components/NodeOverlay"
import { NodeConnectionManager } from "../content/NodeConnectionManager"
import { CanvasItemComponent, CanvasSlashMenuItem, getNodeDefaults, SlashMenuDropdown, CanvasItem } from "./CanvasExtension"

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

type Canvas3DLenses = "identity" | "private"

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    canvas3D: {
      insertCanvas3D: () => ReturnType
      setCanvas3DLens: (options: { lens: Canvas3DLenses }) => ReturnType
    }
  }
}

interface UnsplashPhoto {
  id: string
  alt_description?: string | null
  description?: string | null
  width: number
  height: number
  color?: string | null
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  links: {
    html: string
    download_location: string
  }
  user: {
    name: string
    links: {
      html: string
    }
  }
}

interface CanvasImageItem {
  id: string
  url: string
  thumbUrl: string
  x: number
  y: number
  width: number
  height: number
  authorName?: string
  authorUrl?: string
  photoUrl?: string
  downloadLocation?: string
  alt: string
}

// Generate UUID using browser's crypto API (for external portal IDs)
const generateCanvasUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const generateCanvasItemId = () => Math.random().toString(36).substring(2, 10)

// ARCHITECTURE DECISION: Keep Canvas3D at a fixed desktop size and let
// smaller viewports clip it instead of scaling the content.
const CANVAS3D_WIDTH = 1920
const CANVAS3D_HEIGHT = 1080

const Canvas3DNodeView: React.FC<NodeViewProps> = (props) => {
  const { selected, deleteNode, node, updateAttributes } = props
  const canvasLens = (node.attrs.lens as Canvas3DLenses) || "identity"
  const [showImporter, setShowImporter] = useState(false)
  // Store the glTF download URL (expires in ~5 mins) or Sketchfab model UID for embed fallback
  const [modelUrl, setModelUrl] = useState<string | null>(node.attrs.modelUrl || null)
  const [modelUid, setModelUid] = useState<string | null>(node.attrs.modelUid || null)
  const [modelName, setModelName] = useState<string | null>(node.attrs.modelName || null)
  const [isLoading, setIsLoading] = useState(false)
  const importerContainerRef = useRef<HTMLDivElement>(null)
  const importerInitialized = useRef(false)
  const unsplashAccessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
  
  // 2D backing square position within the canvas (percentage-based for storage)
  const [backingPosition, setBackingPosition] = useState<{ x: number; y: number }>({
    x: node.attrs.backingX ?? 50, // Center by default
    y: node.attrs.backingY ?? 50,
  })
  const canvasRef = useRef<HTMLDivElement>(null)
  const viewerContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<InfiniteViewer | null>(null)
  const backingRef = useRef<HTMLDivElement>(null)
  const isDraggingBacking = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const backingStartPos = useRef({ x: 50, y: 50 })

  // 2D image search + canvas images
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [imageQuery, setImageQuery] = useState("")
  const [imageResults, setImageResults] = useState<UnsplashPhoto[]>([])
  const [imageSearchLoading, setImageSearchLoading] = useState(false)
  const [imageSearchError, setImageSearchError] = useState<string | null>(null)
  const [canvasImages, setCanvasImages] = useState<CanvasImageItem[]>(
    Array.isArray(node.attrs.images) ? node.attrs.images : []
  )
  const canvasImagesRef = useRef<CanvasImageItem[]>(canvasImages)
  const isDraggingImage = useRef<string | null>(null)
  const imageDragStart = useRef({ x: 0, y: 0 })
  const imageStartPos = useRef({ x: 50, y: 50 })

  // Old Canvas-style node items (arbitrary nodes on canvas)
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(() => {
    if (typeof node.attrs.items === 'string') {
      try {
        return JSON.parse(node.attrs.items) as CanvasItem[]
      } catch {
        return []
      }
    }
    return []
  })
  const canvasItemsRef = useRef<CanvasItem[]>(canvasItems)
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null)
  const [showCanvasSlashMenu, setShowCanvasSlashMenu] = useState(false)
  const [canvasSlashMenuPosition, setCanvasSlashMenuPosition] = useState({ x: 100, y: 100 })
  const [canvasSearchQuery, setCanvasSearchQuery] = useState('')

  // InfiniteViewer manages pan/zoom for the canvas3D surface.

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

  useEffect(() => {
    canvasImagesRef.current = canvasImages
  }, [canvasImages])

  useEffect(() => {
    if (Array.isArray(node.attrs.images)) {
      setCanvasImages(node.attrs.images)
    }
  }, [node.attrs.images])

  useEffect(() => {
    canvasItemsRef.current = canvasItems
  }, [canvasItems])

  // ARCHITECTURE DECISION: Only sync from node.attrs.items when the serialized
  // value actually differs from our current state. This prevents the loop where
  // updateCanvasItems → updateAttributes → node.attrs.items change → setCanvasItems
  // which would cause MiniEditor to see "new" content and re-initialize nodes.
  useEffect(() => {
    if (typeof node.attrs.items === 'string') {
      const currentSerialized = JSON.stringify(canvasItemsRef.current)
      if (node.attrs.items !== currentSerialized) {
        try {
          setCanvasItems(JSON.parse(node.attrs.items) as CanvasItem[])
        } catch {
          setCanvasItems([])
        }
      }
    }
  }, [node.attrs.items])

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

  // Send model data to parent window (mobile-prototype) for unified 3D rendering
  // This enables all models to render in a single Three.js scene with shared lighting
  useEffect(() => {
    // Generate a unique ID for this node instance
    const nodeId = node.attrs.nodeId || `canvas3d-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Store nodeId in attributes if not already set
    if (!node.attrs.nodeId) {
      updateAttributes({ nodeId })
    }
    
    // Send model data to parent using percentage-based positioning
    // Percentages work reliably across iframe boundaries (screen coords don't)
    if (modelUrl || modelUid) {
      window.parent?.postMessage({
        type: 'canvas3d-model-update',
        nodeId,
        modelUrl,
        modelUid,
        modelName,
        // Percentage-based position (0-100) for cross-iframe compatibility
        backingX: backingPosition.x,
        backingY: backingPosition.y,
      }, '*')
      setIsLoading(false)
    } else {
      // Send removal message when model is cleared
      window.parent?.postMessage({
        type: 'canvas3d-model-remove',
        nodeId,
      }, '*')
    }
    
    // Cleanup: remove model when component unmounts
    return () => {
      window.parent?.postMessage({
        type: 'canvas3d-model-remove',
        nodeId,
      }, '*')
    }
  }, [modelUrl, modelUid, modelName, node.attrs.nodeId, updateAttributes, backingPosition])

  const handleOpenImporter = () => {
    importerInitialized.current = false
    setShowImporter(true)
  }

  const handleOpenImageSearch = () => {
    setImageSearchError(null)
    setShowImageSearch(true)
  }

  const handleUploadImage = () => {
    // Reuse the same upload flow as the Image slash menu item
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const response = await fetch(
          `/api/upload?filename=${encodeURIComponent(file.name)}`,
          { method: 'POST', body: file }
        )
        if (!response.ok) throw new Error('Upload failed')
        const blob = await response.json()

        const width = 180
        const objectUrl = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
          const aspect = img.width > 0 ? img.height / img.width : 1
          const height = Math.max(100, Math.round(aspect * width))
          const newItem: CanvasImageItem = {
            id: `${file.name}-${Date.now()}`,
            url: blob.url,
            thumbUrl: blob.url,
            x: 50,
            y: 50,
            width,
            height,
            alt: file.name || 'Uploaded image',
          }

          const nextImages = [...canvasImagesRef.current, newItem]
          // Architectural choice: keep uploads in node attributes so they persist
          // with the canvas layout and can be synced later if needed.
          canvasImagesRef.current = nextImages
          setCanvasImages(nextImages)
          updateAttributes({ images: nextImages })
          URL.revokeObjectURL(objectUrl)
        }
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl)
        }
        img.src = objectUrl
      } catch (error) {
        console.error('Image upload failed:', error)
      }
    }
    input.click()
  }

  const updateCanvasItems = useCallback((newItems: CanvasItem[]) => {
    canvasItemsRef.current = newItems
    setCanvasItems(newItems)
    updateAttributes({ items: JSON.stringify(newItems) })
  }, [updateAttributes])

  const addCanvasItemFromMenu = useCallback((menuItem: CanvasSlashMenuItem) => {
    const defaults = getNodeDefaults(menuItem.id)

    // Generate node content - handle special cases that need dynamic IDs
    let nodeContent = menuItem.nodeContent
    if (menuItem.id === 'external-portal') {
      const newQuantaId = generateCanvasUUID()
      nodeContent = {
        type: 'externalPortal',
        attrs: { externalQuantaId: newQuantaId },
      }
    }

    const newItem: CanvasItem = {
      id: generateCanvasItemId(),
      nodeType: menuItem.id,
      x: canvasSlashMenuPosition.x,
      y: canvasSlashMenuPosition.y,
      rotation: 0,
      width: defaults.width,
      height: defaults.height,
      content: { type: 'doc', content: [nodeContent] },
    }

    updateCanvasItems([...canvasItemsRef.current, newItem])
    setSelectedCanvasItemId(newItem.id)
    setShowCanvasSlashMenu(false)
    setCanvasSearchQuery('')
  }, [canvasSlashMenuPosition, updateCanvasItems])

  // ARCHITECTURE DECISION: Skip update if the item's content hasn't actually changed.
  // This prevents unnecessary state churn when MiniEditor fires onUpdate with identical content.
  const updateCanvasItem = useCallback((id: string, updates: Partial<CanvasItem>) => {
    const existingItem = canvasItemsRef.current.find(item => item.id === id)
    if (existingItem && updates.content) {
      const oldContent = JSON.stringify(existingItem.content)
      const newContent = JSON.stringify(updates.content)
      if (oldContent === newContent) {
        // Content unchanged, skip update to avoid re-render cascade
        return
      }
    }
    const newItems = canvasItemsRef.current.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
    updateCanvasItems(newItems)
  }, [updateCanvasItems])

  const deleteCanvasItem = useCallback((id: string) => {
    const newItems = canvasItemsRef.current.filter(item => item.id !== id)
    updateCanvasItems(newItems)
    if (selectedCanvasItemId === id) {
      setSelectedCanvasItemId(null)
    }
  }, [selectedCanvasItemId, updateCanvasItems])

  const handleCanvasClick = useCallback(() => {
    setSelectedCanvasItemId(null)
  }, [])

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return

    const x = e.clientX - canvasRect.left
    const y = e.clientY - canvasRect.top

    setCanvasSlashMenuPosition({ x, y })
    setShowCanvasSlashMenu(true)
    setCanvasSearchQuery('')
  }, [])

  const handleCanvasKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === '/' && !showCanvasSlashMenu) {
      e.preventDefault()
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      const centerX = canvasRect ? canvasRect.width / 2 - 100 : 100
      const centerY = canvasRect ? canvasRect.height / 2 - 100 : 100
      setCanvasSlashMenuPosition({ x: centerX, y: centerY })
      setShowCanvasSlashMenu(true)
      setCanvasSearchQuery('')
    } else if (e.key === 'Escape' && showCanvasSlashMenu) {
      setShowCanvasSlashMenu(false)
      setCanvasSearchQuery('')
    }
  }, [showCanvasSlashMenu])

  const handleAddNodeClick = useCallback(() => {
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    const centerX = canvasRect ? canvasRect.width / 2 - 100 : 100
    const centerY = canvasRect ? canvasRect.height / 2 - 100 : 100
    setCanvasSlashMenuPosition({ x: centerX, y: centerY })
    setShowCanvasSlashMenu(true)
    setCanvasSearchQuery('')
  }, [])

  const handleCloseImageSearch = () => {
    setShowImageSearch(false)
  }

  const handleSearchImages = async (queryOverride?: string) => {
    const query = (queryOverride ?? imageQuery).trim()
    if (!query) return
    if (!unsplashAccessKey) {
      setImageSearchError("Missing Unsplash access key. Set NEXT_PUBLIC_UNSPLASH_ACCESS_KEY.")
      return
    }

    setImageSearchLoading(true)
    setImageSearchError(null)

    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20`,
        {
          headers: {
            Authorization: `Client-ID ${unsplashAccessKey}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()
      setImageResults(Array.isArray(data?.results) ? data.results : [])
    } catch (error) {
      setImageSearchError("Unable to fetch images. Please try again.")
    } finally {
      setImageSearchLoading(false)
    }
  }

  const handleSelectImage = async (photo: UnsplashPhoto) => {
    const width = 180
    const height = Math.max(100, Math.round((photo.height / photo.width) * width))
    const newItem: CanvasImageItem = {
      id: `${photo.id}-${Date.now()}`,
      url: photo.urls.regular,
      thumbUrl: photo.urls.small,
      x: 50,
      y: 50,
      width,
      height,
      authorName: photo.user.name,
      authorUrl: `${photo.user.links.html}?utm_source=kairos&utm_medium=referral`,
      photoUrl: `${photo.links.html}?utm_source=kairos&utm_medium=referral`,
      downloadLocation: photo.links.download_location,
      alt: photo.alt_description || photo.description || "Unsplash photo",
    }

    const nextImages = [...canvasImagesRef.current, newItem]
    // Architectural choice: store image metadata on the node so 2D canvas persists
    // across editor sessions and can be synced later to the 3D scene if needed.
    canvasImagesRef.current = nextImages
    setCanvasImages(nextImages)
    updateAttributes({ images: nextImages })
    setShowImageSearch(false)

    // Trigger Unsplash download tracking (required by API guidelines)
    if (unsplashAccessKey) {
      fetch(photo.links.download_location, {
        headers: {
          Authorization: `Client-ID ${unsplashAccessKey}`,
        },
      }).catch(() => null)
    }
  }
  
  // Handle backing square drag
  const handleBackingPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    isDraggingBacking.current = true
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    backingStartPos.current = { ...backingPosition }
    document.body.style.cursor = 'grabbing'
  }
  
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingBacking.current || !canvasRef.current) return
      
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const deltaX = e.clientX - dragStartPos.current.x
      const deltaY = e.clientY - dragStartPos.current.y
      
      // Convert pixel delta to percentage
      const deltaXPercent = (deltaX / canvasRect.width) * 100
      const deltaYPercent = (deltaY / canvasRect.height) * 100
      
      const newX = Math.max(10, Math.min(90, backingStartPos.current.x + deltaXPercent))
      const newY = Math.max(10, Math.min(90, backingStartPos.current.y + deltaYPercent))
      
      setBackingPosition({ x: newX, y: newY })
    }
    
    const handlePointerUp = () => {
      if (isDraggingBacking.current) {
        isDraggingBacking.current = false
        document.body.style.cursor = ''
        // Persist position to node attributes
        updateAttributes({ 
          backingX: backingPosition.x, 
          backingY: backingPosition.y 
        })
      }
    }
    
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [backingPosition, updateAttributes])

  const handleImagePointerDown = (e: React.PointerEvent, imageId: string) => {
    e.stopPropagation()
    e.preventDefault()
    isDraggingImage.current = imageId
    imageDragStart.current = { x: e.clientX, y: e.clientY }
    const currentImage = canvasImagesRef.current.find((image) => image.id === imageId)
    imageStartPos.current = {
      x: currentImage?.x ?? 50,
      y: currentImage?.y ?? 50,
    }
    document.body.style.cursor = 'grabbing'
  }

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingImage.current || !canvasRef.current) return

      const canvasRect = canvasRef.current.getBoundingClientRect()
      const deltaX = e.clientX - imageDragStart.current.x
      const deltaY = e.clientY - imageDragStart.current.y
      const deltaXPercent = (deltaX / canvasRect.width) * 100
      const deltaYPercent = (deltaY / canvasRect.height) * 100

      const nextX = Math.max(5, Math.min(95, imageStartPos.current.x + deltaXPercent))
      const nextY = Math.max(5, Math.min(95, imageStartPos.current.y + deltaYPercent))

      setCanvasImages((prev) => {
        const next = prev.map((image) =>
          image.id === isDraggingImage.current
            ? { ...image, x: nextX, y: nextY }
            : image
        )
        canvasImagesRef.current = next
        return next
      })
    }

    const handlePointerUp = () => {
      if (!isDraggingImage.current) return
      isDraggingImage.current = null
      document.body.style.cursor = ''
      // Architectural choice: persist image positions only on drag end to avoid
      // high-frequency editor updates while dragging.
      updateAttributes({ images: canvasImagesRef.current })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [updateAttributes])
  
  // Determine if we have any model to display
  const hasModel = modelUrl || modelUid

  useEffect(() => {
    if (!viewerContainerRef.current || !canvasRef.current) return

    const viewer = new InfiniteViewer(
      viewerContainerRef.current,
      canvasRef.current,
      {
        useTransform: true,
        useResizeObserver: true,
        pinchThreshold: 40,
        zoomRange: [0.2, 4],
        maxPinchWheel: 10,
        useWheelScroll: true,
        useAutoZoom: true,
        useMouseDrag: true,
        preventWheelClick: false,
      }
    )

    viewer.on("dragStart", (e) => {
      const target = e.inputEvent.target as HTMLElement
      if (target.closest('[data-canvas3d-draggable="true"]')) {
        e.stop()
      }
    })

    viewerRef.current = viewer

    // ARCHITECTURE DECISION: default to desktop-scale zoom across all devices.
    viewer.setZoom(1)
    viewer.scrollCenter()

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  return (
    <NodeViewWrapper
      data-canvas-3d="true"
      style={{ margin: '16px 0', overflow: 'hidden' }}
    >
      {/* NodeOverlay provides the grip, shadow, and connection support */}
      <NodeOverlay
        nodeProps={props}
        nodeType="canvas3D"
        isPrivate={canvasLens === "private"}
        backgroundColor="transparent"
        padding={0}
        boxShadow="none"
      >
        <div
          ref={viewerContainerRef}
          style={{
            position: 'relative',
            width: `${CANVAS3D_WIDTH}px`,
            height: `${CANVAS3D_HEIGHT}px`,
            borderRadius: '12px',
            overflow: 'hidden',
            // Transparent background so 3D models from parent scene show through
            background: 'transparent',
            border: selected ? '2px solid rgba(100, 150, 255, 0.8)' : '1px solid rgba(0, 0, 0, 0.3)',
          }}
        >
        <div
          ref={canvasRef}
          tabIndex={0}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          onKeyDown={handleCanvasKeyDown}
          style={{
            position: 'relative',
            width: `${CANVAS3D_WIDTH}px`,
            height: `${CANVAS3D_HEIGHT}px`,
          }}
        >
          {/* Black dot grid - spaced apart for clean look */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                radial-gradient(circle, rgba(0, 0, 0, 0.2) 1.5px, transparent 1.5px)
              `,
              backgroundSize: '40px 40px',
              pointerEvents: 'none',
            }}
          />

          {/* Old Canvas-style node items */}
          {canvasItems.map(item => (
            <CanvasItemComponent
              key={item.id}
              item={item}
              isSelected={selectedCanvasItemId === item.id}
              onSelect={() => setSelectedCanvasItemId(item.id)}
              onUpdate={(updates) => updateCanvasItem(item.id, updates)}
              onDelete={() => deleteCanvasItem(item.id)}
              canvasRef={canvasRef}
            />
          ))}

          {/* NodeConnectionManager enables drawing connections between canvas items */}
          <NodeConnectionManager containerRef={canvasRef} />

          <AnimatePresence>
            {showCanvasSlashMenu && (
              <SlashMenuDropdown
                isOpen={showCanvasSlashMenu}
                onClose={() => {
                  setShowCanvasSlashMenu(false)
                  setCanvasSearchQuery('')
                }}
                onSelect={addCanvasItemFromMenu}
                searchQuery={canvasSearchQuery}
                onSearchChange={setCanvasSearchQuery}
                position={canvasSlashMenuPosition}
              />
            )}
          </AnimatePresence>

          {/* 2D images placed on the canvas */}
          {canvasImages.map((image) => (
            <div
              key={image.id}
              onPointerDown={(e) => handleImagePointerDown(e, image.id)}
              data-canvas3d-draggable="true"
              style={{
                position: 'absolute',
                left: `${image.x}%`,
                top: `${image.y}%`,
                transform: 'translate(-50%, -50%)',
                width: `${image.width}px`,
                height: `${image.height}px`,
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
                cursor: 'grab',
                backgroundColor: 'transparent',
                border: 'none',
              }}
            >
              <img
                src={image.url}
                alt={image.alt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              {image.authorName && image.authorUrl && (
                <div
                  style={{
                    position: 'absolute',
                    left: 6,
                    bottom: 6,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '10px',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: '#444',
                    lineHeight: 1.2,
                  }}
                >
                  <a
                    href={image.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {image.authorName}
                  </a>
                </div>
              )}
            </div>
          ))}
          
          {/* 2D Backing square - draggable within canvas, shows model position */}
          {hasModel && (
            <div
              ref={backingRef}
              onPointerDown={handleBackingPointerDown}
              data-canvas3d-draggable="true"
              style={{
                position: 'absolute',
                left: `${backingPosition.x}%`,
                top: `${backingPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#666',
                fontFamily: "'Inter', system-ui, sans-serif",
                userSelect: 'none',
              }}
            >
            </div>
          )}
        {/* Search buttons - top right */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            display: 'flex',
            gap: '10px',
          }}
        >
          <motion.button
            type="button"
            onClick={handleAddNodeClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-canvas3d-draggable="true"
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
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Add node
          </motion.button>
          <motion.button
            type="button"
            onClick={handleUploadImage}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-canvas3d-draggable="true"
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
            {/* Upload icon */}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 5 17 10" />
              <line x1="12" y1="5" x2="12" y2="19" />
            </svg>
            Upload photo
          </motion.button>
          <motion.button
            type="button"
            onClick={handleOpenImageSearch}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-canvas3d-draggable="true"
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
            Search for 2D images
          </motion.button>
          <motion.button
            type="button"
            onClick={handleOpenImporter}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-canvas3d-draggable="true"
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

        {/* Unsplash Image Search Modal */}
        {showImageSearch && (
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
            onClick={handleCloseImageSearch}
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
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={handleCloseImageSearch}
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

              <div
                style={{
                  padding: '20px 24px 12px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchImages()
                  }}
                  placeholder="Search Unsplash images"
                  style={{
                    flex: 1,
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '14px',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSearchImages()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#111',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Search
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px 24px 24px',
                }}
              >
                {imageSearchError && (
                  <div
                    style={{
                      marginBottom: '12px',
                      color: '#b91c1c',
                      fontSize: '13px',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {imageSearchError}
                  </div>
                )}

                {imageSearchLoading && (
                  <div
                    style={{
                      color: '#666',
                      fontSize: '13px',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Searching Unsplash...
                  </div>
                )}

                {!imageSearchLoading && imageResults.length === 0 && (
                  <div
                    style={{
                      color: '#999',
                      fontSize: '13px',
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    Type a search term to find images.
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '12px',
                    marginTop: '12px',
                  }}
                >
                  {imageResults.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => handleSelectImage(photo)}
                      style={{
                        border: 'none',
                        padding: 0,
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid #eee',
                          backgroundColor: '#f4f4f4',
                        }}
                      >
                        <img
                          src={photo.urls.small}
                          alt={photo.alt_description || photo.description || 'Unsplash photo'}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          marginTop: '6px',
                          fontSize: '11px',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          color: '#555',
                        }}
                      >
                        {photo.user.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

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


        {/* Empty state / drop zone */}
        {!hasModel && !isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'rgba(0, 0, 0, 0.2)',
              pointerEvents: 'none',
            }}
          >
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
              color: 'rgba(0, 0, 0, 0.4)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
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
        </div>
        </div>
      </NodeOverlay>
    </NodeViewWrapper>
  )
}

// ============================================================================
// 3D Canvas TipTap Extension
// ============================================================================

export const Canvas3DExtension = TipTapNode.create({
  name: "canvas3D",
  group: "block",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  
  addAttributes() {
    return {
      // Unique ID for this node instance (used for parent-child communication)
      nodeId: {
        default: null,
      },
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
      // 2D backing square position (percentage within canvas)
      backingX: {
        default: 50,
      },
      backingY: {
        default: 50,
      },
      images: {
        default: [],
      },
      items: {
        default: '[]',
      },
      lens: {
        default: "identity" as Canvas3DLenses,
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
      setCanvas3DLens: (attributes: { lens: Canvas3DLenses }) => ({ state, dispatch }) => {
        const { selection } = state
        const pos = selection.$from.pos
        const node = state.doc.nodeAt(pos)

        if (node && node.type.name === "canvas3D" && dispatch) {
          const tr = state.tr.setNodeMarkup(
            pos,
            null,
            {
              ...node.attrs,
              lens: attributes.lens,
            }
          )
          dispatch(tr)
          return true
        }
        return false
      },
    }
  },
})

export default Canvas3DExtension
