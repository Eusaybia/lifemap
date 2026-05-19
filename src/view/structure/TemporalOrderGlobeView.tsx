'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'

import { DEFAULT_MAP_STYLE, type MapMarker } from '../content/MapboxMapAttrs'
import {
  buildStaticMapUrl,
  ensureMapboxCssLoaded,
  forceMapboxLayout,
  MAPBOX_ACCESS_TOKEN,
  type MapViewportSize,
} from '../content/MapboxMapShared'
import {
  LOCATION_CONNECTOR_END_OPACITY,
  LOCATION_CONNECTOR_START_OPACITY,
  LOCATION_CONNECTOR_STROKE,
  LocationConnectorVisual,
} from '../content/TemporalArrowVisual'

declare global {
  interface Window {
    mapboxgl?: any
  }
}

export interface TemporalOrderGlobeLocation {
  id: string
  name: string
  label: string
  country?: string
  coords: [number, number] | null
  eventLabel: string
  eventNodeId: string
  dateMs: number | null
}

interface ResolvedTemporalOrderGlobeLocation extends TemporalOrderGlobeLocation {
  coords: [number, number]
}

interface TemporalOrderGlobeMarker {
  id: string
  lng: number
  lat: number
  locationLabels: string[]
  eventLabels: string[]
}

interface TemporalOrderResolvedMapLocation {
  id: string
  lng: number
  lat: number
  name: string
  label: string
  eventLabel: string
  eventNodeId: string
}

interface TemporalOrderMapRouteOverlayPath {
  id: string
  d: string
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  futureIndex: number
  futureTotal: number
  sourceLabel: string
  targetLabel: string
}

type MapboxGlobal = {
  Map: new (options: Record<string, unknown>) => any
  Popup: new (options?: Record<string, unknown>) => any
  LngLatBounds: new () => { extend: (coords: [number, number]) => void }
  accessToken: string
  version?: string
}

const MAPBOX_IMPORTED_GL_VERSION = String((mapboxgl as typeof mapboxgl & { version?: string }).version || '2.15.0')
const MAPBOX_IMPORTED_GL_CSS_URL = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_IMPORTED_GL_VERSION}/mapbox-gl.css`
const MAPBOX_GL_CSP_WORKER_URL = '/vendor/mapbox-gl-csp-worker-v2.15.0.js'
const mapboxglWithWorkerUrl = mapboxgl as typeof mapboxgl & { workerUrl: string }
const MAPBOX_GL_VERSION = '3.12.0'
const MAPBOX_GL_CSS_URL = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`
const MAPBOX_GL_JS_URL = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`
const DEFAULT_CENTER: [number, number] = [151.2093, -33.8688]
const DEFAULT_ZOOM = 1.3
const MAPBOX_GLOBE_STYLE = DEFAULT_MAP_STYLE
const MAPBOX_2D_STYLE = DEFAULT_MAP_STYLE
const MARKER_SOURCE_ID = 'temporal-order-globe-markers'
const MARKER_LAYER_ID = 'temporal-order-globe-marker'
const MARKER_LABEL_LAYER_ID = 'temporal-order-globe-marker-label'
const ROUTE_SOURCE_ID = 'temporal-order-map-routes'
const ROUTE_LAYER_ID = 'temporal-order-map-route-line'
const ROUTE_LINE_GRADIENT = [
  'interpolate',
  ['linear'],
  ['line-progress'],
  0,
  `rgba(66, 133, 244, ${LOCATION_CONNECTOR_START_OPACITY})`,
  1,
  `rgba(66, 133, 244, ${LOCATION_CONNECTOR_END_OPACITY})`,
]
type TemporalOrderMapMode = 'globe' | 'map2D'
const MAPBOX_GLOBE_FOG = {
  color: 'rgb(228, 236, 255)',
  'high-color': 'rgb(120, 158, 255)',
  'space-color': 'rgb(8, 14, 28)',
  'horizon-blend': 0.28,
  'star-intensity': 0.08,
}

let mapboxLoadPromise: Promise<void> | null = null

const configureMapboxWorker = () => {
  const majorVersion = Number.parseInt(MAPBOX_IMPORTED_GL_VERSION.split('.')[0] || '0', 10)
  if (Number.isFinite(majorVersion) && majorVersion > 0 && majorVersion < 3) {
    mapboxglWithWorkerUrl.workerUrl = MAPBOX_GL_CSP_WORKER_URL
  }
}

const getMapboxGlobal = (): MapboxGlobal | null => {
  if (typeof window === 'undefined' || !window.mapboxgl || typeof window.mapboxgl.Map !== 'function') {
    return null
  }

  return window.mapboxgl as MapboxGlobal
}

const hasCompatibleMapbox = (): boolean => {
  const mapboxgl = getMapboxGlobal()
  if (!mapboxgl) return false
  const version = String(mapboxgl.version || '')
  return version.startsWith(MAPBOX_GL_VERSION)
}

const ensureMapboxLoaded = (): Promise<void> => {
  if (typeof document === 'undefined') {
    return Promise.resolve()
  }

  if (hasCompatibleMapbox()) {
    return Promise.resolve()
  }

  if (mapboxLoadPromise) {
    return mapboxLoadPromise
  }

  mapboxLoadPromise = new Promise((resolve, reject) => {
    let cssReady = false
    let scriptReady = false
    let settled = false

    const completeIfReady = () => {
      if (settled || !cssReady || !scriptReady) return
      settled = true
      resolve()
    }

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      mapboxLoadPromise = null
      reject(error)
    }

    const existingLink = document.querySelector<HTMLLinkElement>('link[data-temporal-order-mapbox-css="true"]')
    if (existingLink) {
      if (existingLink.dataset.loaded === 'true' || !!existingLink.sheet) {
        existingLink.dataset.loaded = 'true'
        cssReady = true
      } else {
        existingLink.addEventListener(
          'load',
          () => {
            existingLink.dataset.loaded = 'true'
            cssReady = true
            completeIfReady()
          },
          { once: true },
        )
        existingLink.addEventListener('error', () => fail(new Error('Failed to load Mapbox CSS')), {
          once: true,
        })
      }
    } else {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = MAPBOX_GL_CSS_URL
      link.setAttribute('data-temporal-order-mapbox-css', 'true')
      link.addEventListener(
        'load',
        () => {
          link.dataset.loaded = 'true'
          cssReady = true
          completeIfReady()
        },
        { once: true },
      )
      link.addEventListener('error', () => fail(new Error('Failed to load Mapbox CSS')), {
        once: true,
      })
      document.head.appendChild(link)
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-temporal-order-mapbox-js="true"]')
    if (existingScript) {
      if (hasCompatibleMapbox()) {
        scriptReady = true
      } else {
        existingScript.addEventListener(
          'load',
          () => {
            scriptReady = hasCompatibleMapbox()
            if (!scriptReady) {
              fail(new Error('Loaded incompatible Mapbox runtime'))
              return
            }
            completeIfReady()
          },
          { once: true },
        )
        existingScript.addEventListener('error', () => fail(new Error('Failed to load Mapbox JS')), {
          once: true,
        })
      }
    } else {
      const script = document.createElement('script')
      script.src = MAPBOX_GL_JS_URL
      script.async = true
      script.setAttribute('data-temporal-order-mapbox-js', 'true')
      script.addEventListener(
        'load',
        () => {
          scriptReady = hasCompatibleMapbox()
          if (!scriptReady) {
            fail(new Error('Loaded incompatible Mapbox runtime'))
            return
          }
          completeIfReady()
        },
        { once: true },
      )
      script.addEventListener('error', () => fail(new Error('Failed to load Mapbox JS')), {
        once: true,
      })
      document.head.appendChild(script)
    }

    completeIfReady()
  })

  return mapboxLoadPromise
}

const resolveFallbackCoords = (query: string): [number, number] | null => {
  const fallbackRules: Array<{ pattern: RegExp; coords: [number, number] }> = [
    { pattern: /(mount\s+)?everest|base\s*camp\s*trek/i, coords: [86.8578, 27.9881] },
    { pattern: /annapurna/i, coords: [83.8203, 28.5961] },
    { pattern: /\bbankstown\b/i, coords: [151.0333, -33.917] },
    { pattern: /sydney\s+airport|kingsford\s+smith/i, coords: [151.1772, -33.9399] },
    { pattern: /hongqiao/i, coords: [121.3278, 31.1979] },
    { pattern: /family\s+home.*shanghai|shanghai.*family\s+home/i, coords: [121.4737, 31.2304] },
    { pattern: /\bsydney\b/i, coords: [151.2093, -33.8688] },
    { pattern: /\bshanghai\b/i, coords: [121.4737, 31.2304] },
    { pattern: /(san\s*francisco|\bsf\b)/i, coords: [-122.4194, 37.7749] },
  ]

  const matchedRule = fallbackRules.find((rule) => rule.pattern.test(query))
  return matchedRule?.coords ?? null
}

const aggregateResolvedLocations = (
  resolvedLocations: ResolvedTemporalOrderGlobeLocation[],
): TemporalOrderGlobeMarker[] => {
  const markerMap = new Map<string, TemporalOrderGlobeMarker>()

  resolvedLocations.forEach((location, index) => {
    const [lng, lat] = location.coords
    const markerKey = `${lng.toFixed(4)},${lat.toFixed(4)}`
    const existingMarker = markerMap.get(markerKey)

    if (!existingMarker) {
      markerMap.set(markerKey, {
        id: `temporal-order-globe-marker-${index}`,
        lng,
        lat,
        locationLabels: [location.label || location.name],
        eventLabels: [location.eventLabel],
      })
      return
    }

    const locationLabel = location.label || location.name
    if (!existingMarker.locationLabels.includes(locationLabel)) {
      existingMarker.locationLabels.push(locationLabel)
    }
    if (!existingMarker.eventLabels.includes(location.eventLabel)) {
      existingMarker.eventLabels.push(location.eventLabel)
    }
  })

  return Array.from(markerMap.values()).sort((left, right) => {
    if (right.eventLabels.length !== left.eventLabels.length) {
      return right.eventLabels.length - left.eventLabels.length
    }
    return left.locationLabels[0].localeCompare(right.locationLabels[0])
  })
}

const buildMarkerFeatureCollection = (markers: TemporalOrderGlobeMarker[]) => ({
  type: 'FeatureCollection' as const,
  features: markers.map((marker) => ({
    type: 'Feature' as const,
    properties: {
      markerId: marker.id,
      city: marker.locationLabels[0] || 'Location',
      eventCount: marker.eventLabels.length,
    },
    geometry: {
      type: 'Point' as const,
      coordinates: [marker.lng, marker.lat] as [number, number],
    },
  })),
})

const compactRouteLocations = (
  locations: TemporalOrderResolvedMapLocation[],
): TemporalOrderResolvedMapLocation[] => {
  return locations.reduce<TemporalOrderResolvedMapLocation[]>((output, location) => {
    const previous = output[output.length - 1]
    if (
      previous &&
      previous.lng.toFixed(5) === location.lng.toFixed(5) &&
      previous.lat.toFixed(5) === location.lat.toFixed(5)
    ) {
      return output
    }

    output.push(location)
    return output
  }, [])
}

const buildRouteFeatureCollection = (locations: TemporalOrderResolvedMapLocation[]) => {
  const routeStops = compactRouteLocations(locations)

  return {
    type: 'FeatureCollection' as const,
    features: routeStops.slice(0, -1).map((location, index) => {
      const target = routeStops[index + 1]

      return {
        type: 'Feature' as const,
        properties: {
          routeIndex: index,
          opacity: 1,
          sourceLabel: location.label,
          targetLabel: target.label,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [location.lng, location.lat],
            [target.lng, target.lat],
          ],
        },
      }
    }),
  }
}

const normalizeLocationTagLabel = (label?: string): string => {
  const trimmedLabel = label?.trim()
  if (!trimmedLabel) return '📍 Location'
  return trimmedLabel.includes('📍') ? trimmedLabel : `📍 ${trimmedLabel}`
}

const buildLocationTagElement = (label?: string): HTMLSpanElement => {
  const tagElement = document.createElement('span')
  tagElement.className = 'location-mention'
  tagElement.setAttribute('data-map-location-popup-tag', 'true')

  const gripElement = document.createElement('span')
  gripElement.className = 'location-grip'
  gripElement.setAttribute('aria-hidden', 'true')
  tagElement.appendChild(gripElement)

  tagElement.appendChild(document.createTextNode(normalizeLocationTagLabel(label)))
  return tagElement
}

const buildLocationTagPopupContent = (labels: Array<string | undefined>): HTMLDivElement => {
  const container = document.createElement('div')
  container.setAttribute('data-map-location-popup', 'true')
  container.style.display = 'grid'
  container.style.gap = '6px'
  container.style.justifyItems = 'start'

  const normalizedLabels = Array.from(new Set(labels.filter((label): label is string => !!label?.trim())))
  ;(normalizedLabels.length ? normalizedLabels : ['📍 Location']).forEach((label) => {
    container.appendChild(buildLocationTagElement(label))
  })

  return container
}

const buildPopupContent = (marker: TemporalOrderGlobeMarker): HTMLDivElement => {
  return buildLocationTagPopupContent(marker.locationLabels)
}

const focusMapOnMarkers = (
  map: any,
  mapboxgl: MapboxGlobal,
  nextMarkers: TemporalOrderGlobeMarker[],
) => {
  if (!nextMarkers.length) {
    map.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 500 })
    return
  }

  if (nextMarkers.length === 1) {
    map.easeTo({
      center: [nextMarkers[0].lng, nextMarkers[0].lat],
      zoom: 2.1,
      duration: 700,
    })
    return
  }

  const bounds = new mapboxgl.LngLatBounds()
  nextMarkers.forEach((marker) => {
    bounds.extend([marker.lng, marker.lat])
  })

  map.fitBounds(bounds, {
    padding: 72,
    duration: 700,
    maxZoom: 2.25,
  })
}

const TemporalOrderGeoMapView: React.FC<{
  locations: TemporalOrderGlobeLocation[]
  mode: TemporalOrderMapMode
}> = ({ locations, mode }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const popupRef = useRef<any>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const geocodeCacheRef = useRef<Map<string, [number, number] | null>>(new Map())
  const markersRef = useRef<TemporalOrderGlobeMarker[]>([])
  const markerLookupRef = useRef<Map<string, TemporalOrderGlobeMarker>>(new Map())
  const [markers, setMarkers] = useState<TemporalOrderGlobeMarker[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const stopEditorEventBubble = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation()
  }, [])

  const normalizedLocations = useMemo(
    () => locations.filter((location) => location.name || location.label),
    [locations],
  )

  const inferredMapConnections = useMemo(
    () => normalizedLocations.slice(0, -1).map((location, index) => ({
      source: {
        id: location.id,
        label: location.label,
        name: location.name,
        eventNodeId: location.eventNodeId,
      },
      target: {
        id: normalizedLocations[index + 1].id,
        label: normalizedLocations[index + 1].label,
        name: normalizedLocations[index + 1].name,
        eventNodeId: normalizedLocations[index + 1].eventNodeId,
      },
    })),
    [normalizedLocations],
  )

  const resolveLocationCoords = useCallback(
    async (location: TemporalOrderGlobeLocation): Promise<[number, number] | null> => {
      if (location.coords) {
        return location.coords
      }

      const query = [location.name, location.country].filter(Boolean).join(', ').trim()
      if (!query) {
        return null
      }

      const cacheKey = query.toLowerCase()
      if (geocodeCacheRef.current.has(cacheKey)) {
        return geocodeCacheRef.current.get(cacheKey) || null
      }

      const fallbackCoords = resolveFallbackCoords(query)
      if (fallbackCoords) {
        geocodeCacheRef.current.set(cacheKey, fallbackCoords)
        return fallbackCoords
      }

      if (!MAPBOX_ACCESS_TOKEN) {
        geocodeCacheRef.current.set(cacheKey, fallbackCoords)
        return fallbackCoords
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`,
        )
        const data = await response.json()
        const center = data?.features?.[0]?.center
        const coords =
          Array.isArray(center) && center.length === 2
            ? ([Number(center[0]), Number(center[1])] as [number, number])
            : fallbackCoords
        geocodeCacheRef.current.set(cacheKey, coords)
        return coords
      } catch {
        geocodeCacheRef.current.set(cacheKey, fallbackCoords)
        return fallbackCoords
      }
    },
    [],
  )

  const syncMapMarkers = useCallback((map: any, mapboxgl: MapboxGlobal, nextMarkers: TemporalOrderGlobeMarker[]) => {
    markerLookupRef.current = new Map(nextMarkers.map((marker) => [marker.id, marker]))

    const sourceData = buildMarkerFeatureCollection(nextMarkers)
    const existingSource = map.getSource(MARKER_SOURCE_ID)
    if (existingSource) {
      existingSource.setData(sourceData)
    } else {
      map.addSource(MARKER_SOURCE_ID, {
        type: 'geojson',
        data: sourceData,
      })
    }

    if (!map.getLayer(MARKER_LAYER_ID)) {
      map.addLayer({
        id: MARKER_LAYER_ID,
        type: 'circle',
        source: MARKER_SOURCE_ID,
        paint: {
          'circle-radius': [
            'case',
            ['>=', ['get', 'eventCount'], 3], 8,
            ['>=', ['get', 'eventCount'], 2], 7,
            6,
          ],
          'circle-color': '#3b82f6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.92,
        },
      })
    }

    if (!map.getLayer(MARKER_LABEL_LAYER_ID)) {
      map.addLayer({
        id: MARKER_LABEL_LAYER_ID,
        type: 'symbol',
        source: MARKER_SOURCE_ID,
        layout: {
          'text-field': ['get', 'city'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-offset': [0, -2],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      })
    }

    focusMapOnMarkers(map, mapboxgl, nextMarkers)
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!normalizedLocations.length) {
      setMarkers([])
      setIsResolving(false)
      setLoadError(null)
      return
    }

    setIsResolving(true)
    setLoadError(null)

    Promise.all(
      normalizedLocations.map(async (location) => {
        const coords = await resolveLocationCoords(location)
        if (!coords) return null
        return {
          ...location,
          coords,
        } satisfies ResolvedTemporalOrderGlobeLocation
      }),
    )
      .then((resolvedLocations) => {
        if (cancelled) return

        const validLocations = resolvedLocations.filter(Boolean) as ResolvedTemporalOrderGlobeLocation[]
        setMarkers(aggregateResolvedLocations(validLocations))
        setIsResolving(false)
      })
      .catch((error) => {
        console.error('[TemporalOrderGlobeView] Failed to resolve locations:', error)
        if (cancelled) return
        setMarkers([])
        setIsResolving(false)
        setLoadError('Unable to resolve event locations for the globe.')
      })

    return () => {
      cancelled = true
    }
  }, [normalizedLocations, resolveLocationCoords])

  useEffect(() => {
    markersRef.current = markers

    const map = mapRef.current
    const mapboxgl = getMapboxGlobal()
    if (!map || !mapboxgl || !map.isStyleLoaded()) {
      return
    }

    syncMapMarkers(map, mapboxgl, markers)
  }, [markers, syncMapMarkers])

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || mapRef.current) {
      return
    }

    let cancelled = false

    const initMap = async () => {
      if (!MAPBOX_ACCESS_TOKEN) {
        setLoadError('Mapbox access token unavailable for the globe view.')
        return
      }

      try {
        await ensureMapboxLoaded()
      } catch (error) {
        console.error('[TemporalOrderGlobeView] Failed to load Mapbox runtime:', error)
        if (!cancelled) {
          setLoadError('Unable to load the globe runtime.')
        }
        return
      }

      if (cancelled || !containerRef.current || mapRef.current) {
        return
      }

      const mapboxgl = getMapboxGlobal()
      if (!mapboxgl) {
        setLoadError('Mapbox runtime unavailable.')
        return
      }

      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: mode === 'globe' ? MAPBOX_GLOBE_STYLE : MAPBOX_2D_STYLE,
        projection: mode === 'globe' ? 'globe' : 'mercator',
        zoom: DEFAULT_ZOOM,
        center: DEFAULT_CENTER,
      })

      mapRef.current = map

      map.on('error', (event: { error?: Error | string }) => {
        const message =
          event?.error instanceof Error
            ? event.error.message
            : typeof event?.error === 'string'
              ? event.error
              : ''

        if (!message) return
        console.error('[TemporalOrderGlobeView] Mapbox error:', event.error)
        setLoadError(message)
      })

      const handleMarkerClick = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
        const markerId = typeof event.features?.[0]?.properties?.markerId === 'string'
          ? event.features?.[0]?.properties?.markerId
          : null
        if (!markerId) return

        const marker = markerLookupRef.current.get(markerId)
        if (!marker) return

        popupRef.current?.remove()
        popupRef.current = new mapboxgl.Popup({
          className: 'location-tag-map-popup',
          closeButton: false,
          closeOnClick: true,
          offset: 14,
          maxWidth: '280px',
        })
          .setLngLat([marker.lng, marker.lat])
          .setDOMContent(buildPopupContent(marker))
          .addTo(map)
      }

      const handleMarkerPointerEnter = () => {
        map.getCanvas().style.cursor = 'pointer'
      }

      const handleMarkerPointerLeave = () => {
        map.getCanvas().style.cursor = ''
      }

      const handleStyleLoad = () => {
        if (mode === 'globe') {
          map.setFog({})
        } else {
          map.setFog(null)
          map.setProjection('mercator')
        }
        syncMapMarkers(map, mapboxgl, markersRef.current)
        map.off('click', MARKER_LAYER_ID, handleMarkerClick)
        map.off('mouseenter', MARKER_LAYER_ID, handleMarkerPointerEnter)
        map.off('mouseleave', MARKER_LAYER_ID, handleMarkerPointerLeave)
        map.on('click', MARKER_LAYER_ID, handleMarkerClick)
        map.on('mouseenter', MARKER_LAYER_ID, handleMarkerPointerEnter)
        map.on('mouseleave', MARKER_LAYER_ID, handleMarkerPointerLeave)
        setLoadError(null)
      }

      map.on('style.load', handleStyleLoad)

      resizeObserverRef.current = new ResizeObserver(() => {
        map.resize()
      })
      resizeObserverRef.current.observe(containerRef.current)
    }

    void initMap()

    return () => {
      cancelled = true
      popupRef.current?.remove()
      popupRef.current = null
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [mode, syncMapMarkers])

  const statusMessage = useMemo(() => {
    if (loadError) return loadError
    if (isResolving) return 'Resolving event locations...'
    if (!normalizedLocations.length) return 'No event locations found in this timeline.'
    if (!markers.length) return 'No mappable event locations found yet.'
    return null
  }, [isResolving, loadError, markers.length, normalizedLocations.length])

  return (
    <div
      className="temporal-order-globe-canvas"
      onMouseDown={stopEditorEventBubble}
      onMouseUp={stopEditorEventBubble}
      onPointerDown={stopEditorEventBubble}
      onPointerUp={stopEditorEventBubble}
      onTouchStart={stopEditorEventBubble}
      onWheel={stopEditorEventBubble}
    >
      <div ref={containerRef} className="temporal-order-globe-canvas-host" />
      {statusMessage && (
        <div className="temporal-order-globe-canvas-error">{statusMessage}</div>
      )}
    </div>
  )
}

const TemporalOrderImportedMapView: React.FC<{
  locations: TemporalOrderGlobeLocation[]
  mode: 'globe' | 'map2D'
}> = ({ locations, mode }) => {
  const mapSurfaceRef = useRef<HTMLDivElement | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const autoFitSignatureRef = useRef('')
  const geocodeCacheRef = useRef<Map<string, [number, number] | null>>(new Map())
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [routeLocations, setRouteLocations] = useState<TemporalOrderResolvedMapLocation[]>([])
  const [routeOverlayPaths, setRouteOverlayPaths] = useState<TemporalOrderMapRouteOverlayPath[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isInteractiveMapReady, setIsInteractiveMapReady] = useState(false)
  const [mapViewportSize, setMapViewportSize] = useState<MapViewportSize>({ width: 1280, height: 280 })
  const mapStyle = mode === 'globe' ? MAPBOX_GLOBE_STYLE : MAPBOX_2D_STYLE
  const isGlobeMode = mode === 'globe'

  const stopEditorEventBubble = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation()
  }, [])

  const normalizedLocations = useMemo(
    () => locations.filter((location) => location.name || location.label),
    [locations],
  )

  const importedMapConnections = useMemo(
    () => normalizedLocations.slice(0, -1).map((location, index) => ({
      source: {
        id: location.id,
        label: location.label,
        name: location.name,
        eventNodeId: location.eventNodeId,
      },
      target: {
        id: normalizedLocations[index + 1].id,
        label: normalizedLocations[index + 1].label,
        name: normalizedLocations[index + 1].name,
        eventNodeId: normalizedLocations[index + 1].eventNodeId,
      },
    })),
    [normalizedLocations],
  )

  const resolveLocationCoords = useCallback(
    async (location: TemporalOrderGlobeLocation): Promise<[number, number] | null> => {
      if (location.coords) {
        return location.coords
      }

      const query = [location.name, location.country].filter(Boolean).join(', ').trim()
      if (!query) {
        return null
      }

      const cacheKey = query.toLowerCase()
      if (geocodeCacheRef.current.has(cacheKey)) {
        return geocodeCacheRef.current.get(cacheKey) || null
      }

      const fallbackCoords = resolveFallbackCoords(query)
      if (fallbackCoords) {
        geocodeCacheRef.current.set(cacheKey, fallbackCoords)
        return fallbackCoords
      }

      if (!MAPBOX_ACCESS_TOKEN) {
        geocodeCacheRef.current.set(cacheKey, fallbackCoords)
        return fallbackCoords
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`,
        )
        const data = await response.json()
        const center = data?.features?.[0]?.center
        const coords =
          Array.isArray(center) && center.length === 2
            ? ([Number(center[0]), Number(center[1])] as [number, number])
            : fallbackCoords
        geocodeCacheRef.current.set(cacheKey, coords)
        return coords
      } catch {
        geocodeCacheRef.current.set(cacheKey, fallbackCoords)
        return fallbackCoords
      }
    },
    [],
  )

  useEffect(() => {
    ensureMapboxCssLoaded(MAPBOX_IMPORTED_GL_CSS_URL).catch((error) => {
      console.error('[TemporalOrder2DMapView] Failed to ensure Mapbox GL CSS:', error)
    })
  }, [])

  useEffect(() => {
    if (!mapSurfaceRef.current) return

    const syncViewportSize = () => {
      if (!mapSurfaceRef.current) return
      const nextWidth = mapSurfaceRef.current.clientWidth
      const nextHeight = mapSurfaceRef.current.clientHeight
      if (!nextWidth || !nextHeight) return

      setMapViewportSize((previous) => {
        if (previous.width === nextWidth && previous.height === nextHeight) {
          return previous
        }
        return { width: nextWidth, height: nextHeight }
      })
    }

    syncViewportSize()
    const observer = new ResizeObserver(syncViewportSize)
    observer.observe(mapSurfaceRef.current)
    window.addEventListener('resize', syncViewportSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncViewportSize)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!normalizedLocations.length) {
      setMarkers([])
      setRouteLocations([])
      setIsResolving(false)
      setLoadError(null)
      return
    }

    setIsResolving(true)
    setLoadError(null)

    Promise.all(
      normalizedLocations.map(async (location) => {
        const coords = await resolveLocationCoords(location)
        if (!coords) return null
        return {
          marker: {
            lng: coords[0],
            lat: coords[1],
            label: location.label || location.name,
            tagLabels: [location.label || location.name],
          } satisfies MapMarker,
          routeLocation: {
            id: location.id,
            lng: coords[0],
            lat: coords[1],
            name: location.name,
            label: location.label || location.name,
            eventLabel: location.eventLabel,
            eventNodeId: location.eventNodeId,
          } satisfies TemporalOrderResolvedMapLocation,
        }
      }),
    )
      .then((resolvedItems) => {
        if (cancelled) return

        const validItems = resolvedItems.filter(Boolean) as Array<{
          marker: MapMarker
          routeLocation: TemporalOrderResolvedMapLocation
        }>
        const validMarkers = validItems.map((item) => item.marker)
        const dedupedMarkers = validMarkers.filter((marker, index, input) => (
          input.findIndex((candidate) => (
            candidate.lng.toFixed(6) === marker.lng.toFixed(6) &&
            candidate.lat.toFixed(6) === marker.lat.toFixed(6)
          )) === index
        ))

        setMarkers(dedupedMarkers)
        setRouteLocations(validItems.map((item) => item.routeLocation))
        setIsResolving(false)
      })
      .catch((error) => {
        console.error('[TemporalOrder2DMapView] Failed to resolve locations:', error)
        if (cancelled) return
        setMarkers([])
        setRouteLocations([])
        setIsResolving(false)
        setLoadError('Unable to resolve event locations for the map.')
      })

    return () => {
      cancelled = true
    }
  }, [normalizedLocations, resolveLocationCoords])

  const staticMapImageUrl = useMemo(
    () => buildStaticMapUrl(mapStyle, markers, DEFAULT_CENTER, DEFAULT_ZOOM, mapViewportSize, mapStyle),
    [mapStyle, markers, mapViewportSize],
  )

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.pathname !== '/atlas') return

    const atlasMapDebugPayload = {
      mode,
      inputLocations: locations.map((location) => ({
        id: location.id,
        name: location.name,
        label: location.label,
        country: location.country,
        coords: location.coords,
        eventLabel: location.eventLabel,
        eventNodeId: location.eventNodeId,
      })),
      normalizedLocations: normalizedLocations.map((location) => ({
        id: location.id,
        name: location.name,
        label: location.label,
        country: location.country,
        coords: location.coords,
        eventLabel: location.eventLabel,
        eventNodeId: location.eventNodeId,
      })),
      inferredMapConnections: importedMapConnections,
      resolvedMarkers: markers,
      routeLocations,
    }

    ;(window as Window & { __LIFEMAP_LAST_TEMPORAL_ORDER_MAP_DEBUG__?: typeof atlasMapDebugPayload })
      .__LIFEMAP_LAST_TEMPORAL_ORDER_MAP_DEBUG__ = atlasMapDebugPayload

    console.log('[TemporalOrderGlobeView] Atlas map debug', atlasMapDebugPayload)
  }, [importedMapConnections, locations, markers, mode, normalizedLocations, routeLocations])

  const addMarkerToMap = useCallback((markerData: MapMarker) => {
    if (!mapRef.current) return null

    const applyMarkerDataset = (element: HTMLElement) => {
      element.dataset.temporalOrderGlobeMarker = 'true'
      element.dataset.temporalOrderLocationLabel = markerData.label || ''
      element.dataset.temporalOrderLocationLng = String(markerData.lng)
      element.dataset.temporalOrderLocationLat = String(markerData.lat)
    }

    const marker = isGlobeMode
      ? new mapboxgl.Marker({
          element: (() => {
            const element = document.createElement('div')
            element.className = 'temporal-order-globe-marker'
            element.setAttribute('aria-hidden', 'true')
            applyMarkerDataset(element)
            return element
          })(),
          anchor: 'center',
        })
          .setLngLat([markerData.lng, markerData.lat])
          .setPopup(
            new mapboxgl.Popup({
              className: 'location-tag-map-popup',
              closeButton: false,
              closeOnClick: true,
              offset: 18,
            }).setDOMContent(buildLocationTagPopupContent(markerData.tagLabels || [markerData.label])),
          )
          .addTo(mapRef.current)
      : new mapboxgl.Marker({
          color: '#e11d48',
          scale: 1.1,
        })
          .setLngLat([markerData.lng, markerData.lat])
          .setPopup(
            new mapboxgl.Popup({
              className: 'location-tag-map-popup',
              closeButton: false,
              closeOnClick: true,
              offset: 18,
            }).setDOMContent(buildLocationTagPopupContent(markerData.tagLabels || [markerData.label])),
          )
          .addTo(mapRef.current)

    applyMarkerDataset(marker.getElement())
    return marker
  }, [isGlobeMode])

  const syncRouteLayer = useCallback(() => {
    const mapInstance = mapRef.current
    if (!mapInstance || !mapInstance.isStyleLoaded()) return

    const routeCollection = buildRouteFeatureCollection(routeLocations)
    const existingSource = mapInstance.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined

    if (existingSource) {
      existingSource.setData(routeCollection)
    } else {
      mapInstance.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: routeCollection,
        lineMetrics: true,
      })
    }

    if (!mapInstance.getLayer(ROUTE_LAYER_ID)) {
      const beforeLayer = mapInstance.getLayer(MARKER_LAYER_ID) ? MARKER_LAYER_ID : undefined
      mapInstance.addLayer(
        {
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': LOCATION_CONNECTOR_STROKE,
            'line-gradient': ROUTE_LINE_GRADIENT,
            'line-width': 6,
            'line-opacity': ['coalesce', ['get', 'opacity'], 1],
          },
        },
        beforeLayer,
      )
    }
  }, [routeLocations])

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    if (!MAPBOX_ACCESS_TOKEN) {
      setIsInteractiveMapReady(false)
      return
    }

    let cancelled = false
    let mapInstance: mapboxgl.Map | null = null
    let frameId = 0
    let timeoutId = 0
    let didFallback = false

    const initializeMap = async () => {
      try {
        await ensureMapboxCssLoaded(MAPBOX_IMPORTED_GL_CSS_URL)
      } catch (error) {
        console.error('[TemporalOrder2DMapView] Failed to load Mapbox CSS before init:', error)
      }

      if (cancelled || !mapContainerRef.current || mapRef.current) return

      forceMapboxLayout(mapContainerRef.current)
      configureMapboxWorker()
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN

      try {
        mapInstance = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: mapStyle,
          projection: isGlobeMode ? 'globe' : 'mercator',
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: false,
        })
        mapRef.current = mapInstance
      } catch (error) {
        console.error('[TemporalOrder2DMapView] Failed to initialize map:', error)
        return
      }

      const failToStaticMap = (error: unknown) => {
        if (didFallback) return
        didFallback = true
        setIsInteractiveMapReady(false)
        console.warn('[TemporalOrder2DMapView] Falling back to static map image:', error)
        try {
          mapInstance?.remove()
        } catch (disposeError) {
          console.warn('[TemporalOrder2DMapView] Failed to dispose broken live map:', disposeError)
        } finally {
          if (mapRef.current === mapInstance) {
            mapRef.current = null
          }
        }
      }

      mapInstance.on('error', (event) => {
        const message =
          event?.error instanceof Error
            ? event.error.message
            : typeof event?.error === 'string'
              ? event.error
              : ''

        if (!message) return
        if (
          message.includes('not iterable') ||
          message.includes('composite') ||
          message.includes("reading 'send'")
        ) {
          failToStaticMap(event.error)
          return
        }
        setLoadError(message)
      })

      if (mapInstance.loaded()) {
        setMapLoaded(true)
        setIsInteractiveMapReady(true)
        mapInstance.setFog(isGlobeMode ? MAPBOX_GLOBE_FOG : null)
        mapInstance.setProjection(isGlobeMode ? 'globe' : 'mercator')
        forceMapboxLayout(mapContainerRef.current)
        mapInstance.resize()
      } else {
        mapInstance.on('load', () => {
          if (!mapContainerRef.current) return
          setMapLoaded(true)
          setIsInteractiveMapReady(true)
          mapInstance?.setFog(isGlobeMode ? MAPBOX_GLOBE_FOG : null)
          mapInstance?.setProjection(isGlobeMode ? 'globe' : 'mercator')
          forceMapboxLayout(mapContainerRef.current)
          mapInstance?.resize()
        })
      }

      frameId = requestAnimationFrame(() => {
        forceMapboxLayout(mapContainerRef.current)
        mapInstance?.resize()
      })
      timeoutId = window.setTimeout(() => {
        forceMapboxLayout(mapContainerRef.current)
        mapInstance?.resize()
      }, 120)
    }

    void initializeMap()

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      try {
        mapInstance?.remove()
      } catch (error) {
        console.error('[TemporalOrder2DMapView] Failed to dispose map:', error)
      } finally {
        if (mapRef.current === mapInstance) {
          mapRef.current = null
        }
      }
      setMapLoaded(false)
      setIsInteractiveMapReady(false)
    }
  }, [isGlobeMode, mapStyle])

  useEffect(() => {
    if (!mapRef.current || !mapContainerRef.current) return

    const resizeMap = () => {
      forceMapboxLayout(mapContainerRef.current)
      mapRef.current?.resize()
    }
    const observer = new ResizeObserver(resizeMap)
    observer.observe(mapContainerRef.current)
    window.addEventListener('resize', resizeMap)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resizeMap)
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    const syncMarkers = () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      markers.forEach((markerData) => {
        const marker = addMarkerToMap(markerData)
        if (marker) {
          markersRef.current.push(marker)
        }
      })

      if (markers.length === 0 || !mapRef.current) {
        autoFitSignatureRef.current = ''
        return
      }

      const nextSignature = markers
        .map((markerData) => `${markerData.lng.toFixed(4)},${markerData.lat.toFixed(4)}`)
        .sort()
        .join('|')

      if (autoFitSignatureRef.current === nextSignature) return
      autoFitSignatureRef.current = nextSignature

      if (markers.length === 1) {
        const onlyMarker = markers[0]
        mapRef.current.easeTo({
          center: [onlyMarker.lng, onlyMarker.lat],
          zoom: Math.max(mapRef.current.getZoom(), isGlobeMode ? 2.1 : 11),
          duration: 600,
        })
        return
      }

      const bounds = new mapboxgl.LngLatBounds()
      markers.forEach((markerData) => {
        bounds.extend([markerData.lng, markerData.lat])
      })
      mapRef.current.fitBounds(bounds, {
        padding: isGlobeMode ? 72 : 60,
        maxZoom: isGlobeMode ? 2.25 : 11,
        duration: 700,
      })
    }

    if (mapRef.current.loaded()) {
      syncMarkers()
    } else {
      mapRef.current.once('load', syncMarkers)
    }
  }, [addMarkerToMap, isGlobeMode, mapLoaded, markers])

  useEffect(() => {
    if (!mapRef.current) return

    const syncRoutes = () => {
      syncRouteLayer()
    }

    if (mapRef.current.loaded()) {
      syncRoutes()
    } else {
      mapRef.current.once('load', syncRoutes)
    }

    mapRef.current.on('style.load', syncRoutes)

    return () => {
      mapRef.current?.off('style.load', syncRoutes)
    }
  }, [mapLoaded, routeLocations, syncRouteLayer])

  useEffect(() => {
    if (!mapRef.current || !mapSurfaceRef.current) {
      setRouteOverlayPaths([])
      return
    }

    const syncRouteOverlayPaths = () => {
      const mapInstance = mapRef.current
      if (!mapInstance || !mapSurfaceRef.current) {
        setRouteOverlayPaths([])
        return
      }

      const routeStops = compactRouteLocations(routeLocations)
      if (routeStops.length < 2) {
        setRouteOverlayPaths([])
        return
      }

      const nextPaths = routeStops
        .slice(0, -1)
        .map((location, index): TemporalOrderMapRouteOverlayPath | null => {
          const target = routeStops[index + 1]
          const startPoint = mapInstance.project([location.lng, location.lat])
          const endPoint = mapInstance.project([target.lng, target.lat])

          if (
            !Number.isFinite(startPoint.x) ||
            !Number.isFinite(startPoint.y) ||
            !Number.isFinite(endPoint.x) ||
            !Number.isFinite(endPoint.y)
          ) {
            return null
          }

          const controlY = Math.min(startPoint.y, endPoint.y) - Math.max(34, Math.abs(endPoint.x - startPoint.x) * 0.12)
          const controlX = startPoint.x + (endPoint.x - startPoint.x) * 0.55
          const d = `M ${startPoint.x} ${startPoint.y} Q ${controlX} ${controlY} ${endPoint.x} ${endPoint.y}`

          return {
            id: `temporal-order-map-route-overlay-${location.id}-${target.id}-${index}`,
            d,
            startPoint,
            endPoint,
            futureIndex: index,
            futureTotal: Math.max(1, routeStops.length - 1),
            sourceLabel: location.label,
            targetLabel: target.label,
          }
        })
        .filter((path): path is TemporalOrderMapRouteOverlayPath => !!path)

      setRouteOverlayPaths(nextPaths)
    }

    syncRouteOverlayPaths()
    mapRef.current.on('move', syncRouteOverlayPaths)
    mapRef.current.on('zoom', syncRouteOverlayPaths)
    mapRef.current.on('resize', syncRouteOverlayPaths)
    mapRef.current.on('rotate', syncRouteOverlayPaths)
    mapRef.current.on('pitch', syncRouteOverlayPaths)

    return () => {
      mapRef.current?.off('move', syncRouteOverlayPaths)
      mapRef.current?.off('zoom', syncRouteOverlayPaths)
      mapRef.current?.off('resize', syncRouteOverlayPaths)
      mapRef.current?.off('rotate', syncRouteOverlayPaths)
      mapRef.current?.off('pitch', syncRouteOverlayPaths)
    }
  }, [mapLoaded, routeLocations])

  const statusMessage = useMemo(() => {
    if (loadError) return loadError
    if (isResolving) return 'Resolving event locations...'
    if (!normalizedLocations.length) return 'No event locations found in this timeline.'
    if (!markers.length) return 'No mappable event locations found yet.'
    return null
  }, [isResolving, loadError, markers.length, normalizedLocations.length])

  return (
    <div
      className="temporal-order-globe-canvas"
      onMouseDown={stopEditorEventBubble}
      onMouseUp={stopEditorEventBubble}
      onPointerDown={stopEditorEventBubble}
      onPointerUp={stopEditorEventBubble}
      onTouchStart={stopEditorEventBubble}
      onWheel={stopEditorEventBubble}
    >
      <div
        ref={mapSurfaceRef}
        className="temporal-order-globe-canvas-host"
        style={{ position: 'relative', inset: 'auto', width: '100%', height: '100%' }}
      >
        {staticMapImageUrl && !isInteractiveMapReady && (
          <img
            aria-hidden="true"
            alt=""
            referrerPolicy="no-referrer"
            src={staticMapImageUrl}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        )}
        <div ref={mapContainerRef} className="temporal-order-globe-canvas-host" />
        {routeOverlayPaths.length > 0 && (
          <svg
            data-temporal-order-map-route-overlay="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 3,
              overflow: 'visible',
            }}
          >
            {routeOverlayPaths.map((routePath) => (
              <g
                key={routePath.id}
                data-temporal-order-map-route="true"
                data-temporal-order-route-source={routePath.sourceLabel}
                data-temporal-order-route-target={routePath.targetLabel}
              >
                <LocationConnectorVisual
                  d={routePath.d}
                  start={routePath.startPoint}
                  end={routePath.endPoint}
                />
              </g>
            ))}
          </svg>
        )}
      </div>
      {statusMessage && (
        <div className="temporal-order-globe-canvas-error">{statusMessage}</div>
      )}
    </div>
  )
}

export const TemporalOrderGlobeView: React.FC<{
  locations: TemporalOrderGlobeLocation[]
}> = ({ locations }) => (
  <TemporalOrderImportedMapView locations={locations} mode="globe" />
)

export const TemporalOrder2DMapView: React.FC<{
  locations: TemporalOrderGlobeLocation[]
}> = ({ locations }) => (
  <TemporalOrderImportedMapView locations={locations} mode="map2D" />
)

export default TemporalOrderGlobeView
