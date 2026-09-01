'use client'

import type { MapMarker } from './MapboxMapAttrs'

export interface MapViewportSize {
  width: number
  height: number
}

export const MAPBOX_ACCESS_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
  ''

export const ensureMapboxCssLoaded = (
  cssUrl: string,
  dataAttribute = 'data-mapbox-gl-css',
): Promise<void> => {
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }

  const attrSelector = `link[${dataAttribute}="true"]`
  const existingLink = document.querySelector<HTMLLinkElement>(attrSelector)

  if (existingLink) {
    if (existingLink.dataset.loaded === 'true' || !!existingLink.sheet) {
      existingLink.dataset.loaded = 'true'
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const handleLoad = () => {
        existingLink.dataset.loaded = 'true'
        resolve()
      }
      const handleError = () => {
        reject(new Error('Failed to load Mapbox GL CSS'))
      }

      existingLink.addEventListener('load', handleLoad, { once: true })
      existingLink.addEventListener('error', handleError, { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = cssUrl
    link.setAttribute(dataAttribute, 'true')
    link.addEventListener(
      'load',
      () => {
        link.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    link.addEventListener(
      'error',
      () => {
        reject(new Error('Failed to load Mapbox GL CSS'))
      },
      { once: true },
    )
    document.head.appendChild(link)
  })
}

export const forceMapboxLayout = (container: HTMLDivElement | null) => {
  if (!container) return

  container.style.position = 'relative'
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.minWidth = '100%'
  container.style.minHeight = '100%'
  container.style.overflow = 'hidden'

  const mapRoot = container.querySelector<HTMLElement>('.mapboxgl-map')
  const canvasContainer = container.querySelector<HTMLElement>('.mapboxgl-canvas-container')
  const canvas = container.querySelector<HTMLCanvasElement>('.mapboxgl-canvas')

  if (mapRoot) {
    mapRoot.style.position = 'relative'
    mapRoot.style.width = '100%'
    mapRoot.style.height = '100%'
  }

  if (canvasContainer) {
    canvasContainer.style.width = '100%'
    canvasContainer.style.height = '100%'
  }

  if (canvas) {
    canvas.style.width = '100%'
    canvas.style.height = '100%'
  }
}

type NativeBridgeWindow = Window & {
  webkit?: {
    messageHandlers?: Record<string, unknown>
  }
}

/*
 * Whether this document may mount live Mapbox GL instances at all.
 *
 * Off inside the Kairos Lifemap board. There, notes are live HTML documents
 * rasterised into a 3D canvas every frame, and a Mapbox GL map inside one
 * keeps tiling, placing labels and serialising worker messages on the main
 * thread for as long as it exists. Debugger.pause on a hung board landed in
 * mapbox's _render -> updateSources -> _addTile -> serialize on three of four
 * loads, and the fourth died of OOM. The static Mapbox image is what a card
 * face needs; the GL map is what was freezing the tab.
 *
 * A module flag rather than a URL parameter because the board is a host that
 * embeds these documents, and it is the host that knows they are decorative.
 */
let interactiveMapsEnabled = true

export const setInteractiveMapsEnabled = (enabled: boolean) => {
  interactiveMapsEnabled = enabled
}

export const areInteractiveMapsEnabled = () => interactiveMapsEnabled

export const shouldSuppressLocationTagMapPopup = (): boolean => {
  if (typeof window === 'undefined') return false
  if (!interactiveMapsEnabled) return true

  // Embedded in a host shell that already shows a map beside the note (the
  // Atlas web layout, the iOS editor): a second inline map on tag click is
  // redundant, and it covers the note while the real map sits right there.
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('iosEmbed') === 'true' || params.get('hideMapPopup') === 'true') {
      return true
    }
  } catch {
    // Malformed URL: fall through to the checks below.
  }

  const nativeBridge = (window as NativeBridgeWindow).webkit?.messageHandlers
  if (nativeBridge && Object.keys(nativeBridge).length > 0) {
    return true
  }

  const hasTouchInput = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
  const coarsePointer = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false
  const narrowViewport = window.matchMedia?.('(max-width: 768px)').matches ?? false
  return hasTouchInput && (coarsePointer || narrowViewport)
}

export const buildStaticMapUrl = (
  requestedStyle: string | undefined,
  markers: MapMarker[],
  center: [number, number],
  zoom: number,
  viewportSize: MapViewportSize,
  defaultStyle: string,
): string | null => {
  if (!MAPBOX_ACCESS_TOKEN) return null

  const staticStyle = requestedStyle?.trim() || defaultStyle
  const stylePath = staticStyle.replace(/^mapbox:\/\/styles\//, '')
  if (!stylePath) return null

  const width = Math.max(320, Math.min(Math.round(viewportSize.width || 1280), 1280))
  const height = Math.max(180, Math.min(Math.round(viewportSize.height || 280), 1280))
  const dimensions = `${width}x${height}@2x`
  const markerOverlay = markers
    .slice(0, 20)
    .map((marker) => `pin-s+e11d48(${marker.lng.toFixed(5)},${marker.lat.toFixed(5)})`)
    .join(',')

  const viewportPath = markerOverlay
    ? `${markerOverlay}/auto`
    : `${center[0].toFixed(5)},${center[1].toFixed(5)},${zoom.toFixed(2)},0`

  const query = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    attribution: 'false',
    logo: 'false',
  })

  if (markerOverlay) {
    query.set('padding', '48')
  }

  return `https://api.mapbox.com/styles/v1/${stylePath}/static/${viewportPath}/${dimensions}?${query.toString()}`
}
