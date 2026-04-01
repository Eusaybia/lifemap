'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

type MapboxGlobal = {
  Map: new (options: Record<string, unknown>) => any
  Popup: new (options?: Record<string, unknown>) => any
  LngLatBounds: new () => { extend: (coords: [number, number]) => void }
  accessToken: string
  version?: string
}

const MAPBOX_ACCESS_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
  ''
const MAPBOX_GL_VERSION = '3.12.0'
const MAPBOX_GL_CSS_URL = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`
const MAPBOX_GL_JS_URL = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`
const DEFAULT_CENTER: [number, number] = [151.2093, -33.8688]
const DEFAULT_ZOOM = 1.3
const MAPBOX_GLOBE_STYLE = 'mapbox://styles/mapbox/satellite-v9'
const MAPBOX_2D_STYLE = 'mapbox://styles/mapbox/streets-v12'
const MARKER_SOURCE_ID = 'temporal-order-globe-markers'
const MARKER_LAYER_ID = 'temporal-order-globe-marker'
const MARKER_LABEL_LAYER_ID = 'temporal-order-globe-marker-label'
type TemporalOrderMapMode = 'globe' | 'map2D'

let mapboxLoadPromise: Promise<void> | null = null

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

const summarizeLabels = (labels: string[]): string => {
  if (labels.length <= 2) return labels.join(' • ')
  return `${labels[0]} + ${labels.length - 1} more`
}

const buildPopupContent = (marker: TemporalOrderGlobeMarker): HTMLDivElement => {
  const container = document.createElement('div')
  container.style.display = 'grid'
  container.style.gap = '8px'
  container.style.minWidth = '180px'
  container.style.maxWidth = '260px'
  container.style.fontFamily = 'Inter, system-ui, sans-serif'

  const title = document.createElement('div')
  title.style.fontSize = '13px'
  title.style.fontWeight = '700'
  title.style.color = '#0f172a'
  title.textContent = summarizeLabels(marker.locationLabels)
  container.appendChild(title)

  const subtitle = document.createElement('div')
  subtitle.style.fontSize = '11px'
  subtitle.style.color = '#475569'
  subtitle.textContent = `${marker.eventLabels.length} temporal event${marker.eventLabels.length === 1 ? '' : 's'}`
  container.appendChild(subtitle)

  const eventList = document.createElement('div')
  eventList.style.display = 'grid'
  eventList.style.gap = '4px'

  marker.eventLabels.slice(0, 5).forEach((label) => {
    const item = document.createElement('div')
    item.style.fontSize = '12px'
    item.style.lineHeight = '1.35'
    item.style.color = '#1e293b'
    item.textContent = label
    eventList.appendChild(item)
  })

  if (marker.eventLabels.length > 5) {
    const overflow = document.createElement('div')
    overflow.style.fontSize = '11px'
    overflow.style.color = '#64748b'
    overflow.textContent = `+${marker.eventLabels.length - 5} more`
    eventList.appendChild(overflow)
  }

  container.appendChild(eventList)
  return container
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

export const TemporalOrderGlobeView: React.FC<{
  locations: TemporalOrderGlobeLocation[]
}> = ({ locations }) => (
  <TemporalOrderGeoMapView locations={locations} mode="globe" />
)

export const TemporalOrder2DMapView: React.FC<{
  locations: TemporalOrderGlobeLocation[]
}> = ({ locations }) => (
  <TemporalOrderGeoMapView locations={locations} mode="map2D" />
)

export default TemporalOrderGlobeView
