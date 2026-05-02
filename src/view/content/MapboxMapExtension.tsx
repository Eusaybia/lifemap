'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
import mapboxgl from 'mapbox-gl'

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_STYLE,
  DEFAULT_MAP_ZOOM,
  MapboxMapAttrs,
  MapMarker,
  needsMapboxMapAttrRepair,
  sanitizeMapboxMapAttrs,
} from './MapboxMapAttrs'
import {
  buildStaticMapUrl,
  ensureMapboxCssLoaded,
  forceMapboxLayout,
  MAPBOX_ACCESS_TOKEN,
  type MapViewportSize,
} from './MapboxMapShared'
import {
  buildTemporalArrowPolygonPoints,
  getTemporalArrowFutureOpacity,
  TemporalArrowVisual,
} from './TemporalArrowVisual'

const MAPBOX_GL_VERSION = String((mapboxgl as typeof mapboxgl & { version?: string }).version || '2.15.0')
const MAPBOX_GL_CSS_URL = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`
const MAPBOX_GL_CSP_WORKER_URL = '/vendor/mapbox-gl-csp-worker-v2.15.0.js'
const MAPBOX_STATIC_DEFAULT_STYLE = DEFAULT_MAP_STYLE
const ENABLE_INTERACTIVE_MAP = true
const ENABLE_MAP_SEARCH_OVERLAY = false
const CONNECTIONS_STORAGE_KEY = 'span-group-connections'
const CONNECTIONS_UPDATED_EVENT = 'node-connections-updated'
const mapboxglWithWorkerUrl = mapboxgl as typeof mapboxgl & { workerUrl: string }

const configureMapboxWorker = () => {
  const majorVersion = Number.parseInt(MAPBOX_GL_VERSION.split('.')[0] || '0', 10)
  if (Number.isFinite(majorVersion) && majorVersion > 0 && majorVersion < 3) {
    mapboxglWithWorkerUrl.workerUrl = MAPBOX_GL_CSP_WORKER_URL
  }
}

const resolveMapboxStyle = (requestedStyle?: string): string => {
  return requestedStyle?.trim() || MAPBOX_STATIC_DEFAULT_STYLE
}

interface LocationNodeAttrs {
  id?: string
  label?: string
  locationId?: string
  'data-name'?: string
  'data-country'?: string
  'data-coords'?: string | [number, number] | null
}

interface TemporalLocationCandidate {
  id?: string
  connectionId?: string
  name: string
  label: string
  country?: string
  coords: [number, number] | null
}

interface ResolvedTemporalLocation extends TemporalLocationCandidate {
  coords: [number, number]
}

interface NodeConnectionRecord {
  sourceId?: string
  targetId?: string
  sourceType?: string
  targetType?: string
  connectionKind?: 'temporal-order' | 'association' | 'manual'
}

interface TemporalRoutePath {
  coordinates: [number, number][]
  futureIndex: number
}

interface TemporalRouteFeature {
  type: 'Feature'
  properties: {
    routeIndex: number
    temporalFutureIndex: number
    temporalFutureTotal: number
    strokeOpacity: number
    durationSeconds: number
    durationLabel: string
    durationEmoji: string
    midpoint: [number, number]
  }
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
}

interface TemporalRouteOverlayPath {
  id: string
  d: string
  arrowPoints: string
  futureIndex: number
  futureTotal: number
}

interface TemporalSpaceContext {
  insideTemporalSpace: boolean
  containerType: 'temporalSpace' | 'group' | 'document' | null
  locations: TemporalLocationCandidate[]
}

interface AnchorPoint {
  lng: number
  lat: number
}

const parseCoords = (rawCoords: unknown): [number, number] | null => {
  if (Array.isArray(rawCoords) && rawCoords.length === 2) {
    const lng = Number(rawCoords[0])
    const lat = Number(rawCoords[1])
    if (Number.isFinite(lng) && Number.isFinite(lat)) return [lng, lat]
    return null
  }

  if (typeof rawCoords !== 'string' || !rawCoords.trim()) return null

  try {
    const parsed = JSON.parse(rawCoords)
    if (Array.isArray(parsed) && parsed.length === 2) {
      const lng = Number(parsed[0])
      const lat = Number(parsed[1])
      if (Number.isFinite(lng) && Number.isFinite(lat)) return [lng, lat]
    }
  } catch (error) {
    return null
  }

  return null
}

const dedupeMarkers = (inputMarkers: MapMarker[]): MapMarker[] => {
  const seen = new Set<string>()
  const deduped: MapMarker[] = []

  inputMarkers.forEach((marker) => {
    const key = `${marker.lng.toFixed(6)},${marker.lat.toFixed(6)}`
    if (seen.has(key)) return
    seen.add(key)
    deduped.push(marker)
  })

  return deduped
}

const toRad = (value: number): number => value * (Math.PI / 180)

const distanceKm = (a: AnchorPoint, b: AnchorPoint): number => {
  const earthRadiusKm = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h))
}

const distanceBetweenCoords = (a: [number, number], b: [number, number]): number => {
  return distanceKm({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] })
}

const computeAnchorSpanKm = (anchors: AnchorPoint[]): number => {
  if (anchors.length < 2) return 0
  let maxDistance = 0
  for (let i = 0; i < anchors.length; i += 1) {
    for (let j = i + 1; j < anchors.length; j += 1) {
      const dist = distanceKm(anchors[i], anchors[j])
      if (dist > maxDistance) maxDistance = dist
    }
  }
  return maxDistance
}

const formatRouteDurationLabel = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 minutes'

  const roundedMinutes = Math.max(1, Math.round(seconds / 60))
  if (roundedMinutes < 60) {
    return `${roundedMinutes} minute${roundedMinutes === 1 ? '' : 's'}`
  }

  const hours = roundedMinutes / 60
  if (Number.isInteger(hours)) {
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }

  const roundedHours = Math.round(hours * 10) / 10
  return `${roundedHours} hours`
}

const computeLineMidpoint = (coordinates: [number, number][]): [number, number] | null => {
  if (coordinates.length === 0) return null
  if (coordinates.length === 1) return coordinates[0]

  const segments = coordinates.slice(1).map((coordinate, index) => ({
    start: coordinates[index],
    end: coordinate,
    distance: distanceBetweenCoords(coordinates[index], coordinate),
  }))
  const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0)

  if (!Number.isFinite(totalDistance) || totalDistance <= 0) {
    return coordinates[Math.floor(coordinates.length / 2)] || coordinates[0]
  }

  const midpointDistance = totalDistance / 2
  let traversed = 0

  for (const segment of segments) {
    if (traversed + segment.distance >= midpointDistance) {
      const remainder = midpointDistance - traversed
      const ratio = segment.distance <= 0 ? 0 : remainder / segment.distance
      return [
        segment.start[0] + (segment.end[0] - segment.start[0]) * ratio,
        segment.start[1] + (segment.end[1] - segment.start[1]) * ratio,
      ]
    }
    traversed += segment.distance
  }

  return coordinates[coordinates.length - 1]
}

const resolveFallbackCoords = (query: string): [number, number] | null => {
  const normalized = query.toLowerCase()
  const fallbackRules: Array<{ pattern: RegExp; coords: [number, number] }> = [
    // Everest Base Camp region (Khumbu, Nepal)
    { pattern: /(mount\s+)?everest|base\s*camp\s*trek/i, coords: [86.8578, 27.9881] },
    // Annapurna Base Camp / Circuit region (Gandaki, Nepal)
    { pattern: /annapurna(\s+circuit)?/i, coords: [83.8781, 28.5307] },
  ]

  for (const rule of fallbackRules) {
    if (rule.pattern.test(normalized)) {
      return rule.coords
    }
  }

  return null
}

const loadLocationConnections = (): NodeConnectionRecord[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(CONNECTIONS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((connection): connection is NodeConnectionRecord => {
      if (!connection || typeof connection !== 'object') return false
      const record = connection as NodeConnectionRecord
      return (
        record.sourceType === 'location' &&
        record.targetType === 'location' &&
        typeof record.sourceId === 'string' &&
        !!record.sourceId &&
        typeof record.targetId === 'string' &&
        !!record.targetId
      )
    })
  } catch {
    return []
  }
}

const buildConnectedLocationRoutes = (
  locations: ResolvedTemporalLocation[],
  connections: NodeConnectionRecord[],
): TemporalRoutePath[] => {
  if (locations.length < 2 || connections.length === 0) return []

  const locationsByConnectionId = new Map<string, ResolvedTemporalLocation>()
  locations.forEach((location) => {
    if (location.connectionId) {
      locationsByConnectionId.set(location.connectionId, location)
    }
  })

  if (locationsByConnectionId.size < 2) return []

  const routePaths: TemporalRoutePath[] = []
  connections.forEach((connection) => {
    const sourceId = connection.sourceId
    const targetId = connection.targetId
    if (!sourceId || !targetId) return
    if (connection.connectionKind && connection.connectionKind !== 'temporal-order') return
    if (!locationsByConnectionId.has(sourceId) || !locationsByConnectionId.has(targetId)) return

    const sourceLocation = locationsByConnectionId.get(sourceId)
    const targetLocation = locationsByConnectionId.get(targetId)
    if (!sourceLocation || !targetLocation) return
    if (
      sourceLocation.coords[0] === targetLocation.coords[0] &&
      sourceLocation.coords[1] === targetLocation.coords[1]
    ) return

    routePaths.push({
      coordinates: [sourceLocation.coords, targetLocation.coords],
      futureIndex: routePaths.length,
    })
  })

  return routePaths
}

const MapboxMapNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes } = props
  const mapSurface = useRef<HTMLDivElement>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const routeDurationMarkersRef = useRef<mapboxgl.Marker[]>([])
  const autoFitSignatureRef = useRef('')
  const geocodeCacheRef = useRef(new Map<string, [number, number] | null>())
  const temporalContextSignatureRef = useRef('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isInteractiveMapReady, setIsInteractiveMapReady] = useState(false)
  const [isInsideTemporalSpace, setIsInsideTemporalSpace] = useState(false)
  const [temporalLocationCandidates, setTemporalLocationCandidates] = useState<TemporalLocationCandidate[]>([])
  const [temporalSpaceMarkers, setTemporalSpaceMarkers] = useState<MapMarker[]>([])
  const [resolvedTemporalLocations, setResolvedTemporalLocations] = useState<ResolvedTemporalLocation[]>([])
  const [locationConnections, setLocationConnections] = useState<NodeConnectionRecord[]>([])
  const [temporalRouteFeatures, setTemporalRouteFeatures] = useState<TemporalRouteFeature[]>([])
  const [temporalRouteOverlayPaths, setTemporalRouteOverlayPaths] = useState<TemporalRouteOverlayPath[]>([])
  const [mapViewportSize, setMapViewportSize] = useState<MapViewportSize>({ width: 1280, height: 280 })

  const attrs = useMemo<MapboxMapAttrs>(() => sanitizeMapboxMapAttrs(node.attrs), [node.attrs])
  const { center, zoom, markers, style } = attrs

  useEffect(() => {
    if (!needsMapboxMapAttrRepair(node.attrs)) return

    updateAttributes(attrs)
  }, [attrs, node.attrs, updateAttributes])

  const activeMarkers = useMemo(() => {
    // Inside a temporalSpace card, treat location tags as the source of truth.
    // This prevents stale persisted map attrs.markers (e.g. old Shanghai pin)
    // from lingering after the corresponding tag is removed.
    if (isInsideTemporalSpace) {
      return dedupeMarkers([...temporalSpaceMarkers])
    }
    return dedupeMarkers([...markers])
  }, [isInsideTemporalSpace, temporalSpaceMarkers, markers])
  const hasTemporalPins = temporalSpaceMarkers.length > 0
  const temporalRoutePaths = useMemo(
    () => buildConnectedLocationRoutes(resolvedTemporalLocations, locationConnections),
    [resolvedTemporalLocations, locationConnections],
  )
  const staticMapImageUrl = useMemo(
    () => buildStaticMapUrl(style, activeMarkers, center, zoom, mapViewportSize, MAPBOX_STATIC_DEFAULT_STYLE),
    [style, activeMarkers, center, zoom, mapViewportSize],
  )
  const anchorPoints = useMemo<AnchorPoint[]>(() => {
    const anchorsFromLocations = temporalLocationCandidates
      .filter((candidate) => !!candidate.coords)
      .map((candidate) => ({
        lng: candidate.coords![0],
        lat: candidate.coords![1],
      }))

    const anchorsFromManual = markers.map((marker) => ({
      lng: marker.lng,
      lat: marker.lat,
    }))

    return dedupeMarkers(
      [...anchorsFromLocations, ...anchorsFromManual].map((point) => ({
        lng: point.lng,
        lat: point.lat,
      })),
    ).map((point) => ({ lng: point.lng, lat: point.lat }))
  }, [temporalLocationCandidates, markers])

  const findTemporalSpaceContext = useCallback((): TemporalSpaceContext | null => {
    const emptyContext: TemporalSpaceContext = {
      insideTemporalSpace: false,
      containerType: null,
      locations: [],
    }

    if (props.editor.isDestroyed) {
      return null
    }

    try {
      const rawPosition = props.getPos()
      if (typeof rawPosition !== 'number' || !Number.isFinite(rawPosition)) {
        return null
      }

      const position = Math.trunc(rawPosition)
      const doc = props.editor.state?.doc
      if (!doc) {
        return null
      }
      if (position < 0 || position > doc.content.size) {
        return null
      }

      let $pos
      try {
        $pos = doc.resolve(position)
      } catch (error) {
        return null
      }
      let contextNode: any | null = null
      let containerType: 'temporalSpace' | 'group' | 'document' | null = null

      for (let depth = $pos.depth; depth >= 0; depth -= 1) {
        const ancestor = $pos.node(depth)
        if (ancestor.type.name === 'temporalSpace' || ancestor.type.name === 'group') {
          contextNode = ancestor
          containerType = ancestor.type.name as 'temporalSpace' | 'group'
          break
        }
      }

      if (!contextNode) {
        contextNode = doc
        containerType = 'document'
      }

      const locations: TemporalLocationCandidate[] = []
      contextNode.descendants((childNode: any) => {
        if (childNode.type.name !== 'location') return

        const locationAttrs = (childNode.attrs || {}) as LocationNodeAttrs
        const name = locationAttrs['data-name'] || locationAttrs.label || ''
        if (!name) return

        const label = locationAttrs.label?.replace(/^📍\s*/, '') || name
        locations.push({
          id: locationAttrs.id,
          connectionId: locationAttrs.locationId,
          name,
          label,
          country: locationAttrs['data-country'] || undefined,
          coords: parseCoords(locationAttrs['data-coords']),
        })
      })

      return {
        insideTemporalSpace: true,
        containerType,
        locations,
      }
    } catch (error) {
      return null
    }
  }, [props.editor, props.getPos])

  const geocodeLocationCandidate = useCallback(async (
    candidate: TemporalLocationCandidate,
    anchors: AnchorPoint[],
  ): Promise<[number, number] | null> => {
    if (!MAPBOX_ACCESS_TOKEN) return null

    const query = [candidate.name, candidate.country].filter(Boolean).join(', ')
    if (!query.trim()) return null

    const cacheKey = query.toLowerCase()
    if (geocodeCacheRef.current.has(cacheKey)) {
      return geocodeCacheRef.current.get(cacheKey) || null
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
      )
      const data = await response.json()
      const center = data?.features?.[0]?.center
      const coords = Array.isArray(center) && center.length === 2
        ? [Number(center[0]), Number(center[1])] as [number, number]
        : null

      if (coords && anchors.length > 0) {
        const nearestAnchorDistance = anchors.reduce((nearest, anchor) => {
          const dist = distanceKm(anchor, { lng: coords[0], lat: coords[1] })
          return Math.min(nearest, dist)
        }, Number.POSITIVE_INFINITY)

        const anchorSpanKm = computeAnchorSpanKm(anchors)
        const maxAllowedDistanceKm = anchors.length === 1
          ? 1500
          : Math.min(8000, Math.max(1500, anchorSpanKm * 1.5 + 500))

        if (nearestAnchorDistance > maxAllowedDistanceKm) {
          const fallbackCoords = resolveFallbackCoords(query)
          if (fallbackCoords) {
            geocodeCacheRef.current.set(cacheKey, fallbackCoords)
            return fallbackCoords
          }

          geocodeCacheRef.current.set(cacheKey, null)
          return null
        }
      }

      geocodeCacheRef.current.set(cacheKey, coords)
      return coords
    } catch (error) {
      const fallbackCoords = resolveFallbackCoords(query)
      if (fallbackCoords) {
        geocodeCacheRef.current.set(cacheKey, fallbackCoords)
        return fallbackCoords
      }

      console.error('[MapboxMap] Temporal location geocoding error:', error)
      geocodeCacheRef.current.set(cacheKey, null)
      return null
    }
  }, [])

  // Load Mapbox CSS once globally so marker styling stays stable even when
  // multiple map nodes mount/unmount in the editor.
  useEffect(() => {
    ensureMapboxCssLoaded(MAPBOX_GL_CSS_URL).catch((error) => {
      console.error('[MapboxMap] Failed to ensure Mapbox GL CSS:', error)
    })
  }, [])

  useEffect(() => {
    if (!mapSurface.current) return

    const syncViewportSize = () => {
      if (!mapSurface.current) return
      const nextWidth = mapSurface.current.clientWidth
      const nextHeight = mapSurface.current.clientHeight
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
    observer.observe(mapSurface.current)
    window.addEventListener('resize', syncViewportSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncViewportSize)
    }
  }, [])

  useEffect(() => {
    const syncConnections = () => {
      setLocationConnections(loadLocationConnections())
    }

    syncConnections()
    window.addEventListener(CONNECTIONS_UPDATED_EVENT, syncConnections)
    window.addEventListener('storage', syncConnections)

    return () => {
      window.removeEventListener(CONNECTIONS_UPDATED_EVENT, syncConnections)
      window.removeEventListener('storage', syncConnections)
    }
  }, [])

  // Helper function to add a marker to the map
  const addMarkerToMap = useCallback((markerData: MapMarker) => {
    if (!map.current) return null

    const marker = new mapboxgl.Marker({
      color: '#e11d48',
      scale: 1.1,
    })
      .setLngLat([markerData.lng, markerData.lat])
      .addTo(map.current)

    return marker
  }, [])

  // Track location tags inside the same containing temporalSpace/group node.
  useEffect(() => {
    const syncTemporalSpaceLocations = (): boolean => {
      if (props.editor.isDestroyed) return false

      const temporalContext = findTemporalSpaceContext()
      if (!temporalContext) return false

      const nextSignature = `${temporalContext.insideTemporalSpace}:${temporalContext.containerType || 'none'}:${temporalContext.locations
        .map((location) => {
          const coords = location.coords ? `${location.coords[0].toFixed(6)},${location.coords[1].toFixed(6)}` : 'null'
          return `${location.id || ''}:${location.name}:${location.country || ''}:${coords}`
        })
        .join('|')}`

      if (nextSignature === temporalContextSignatureRef.current) return true
      temporalContextSignatureRef.current = nextSignature

      setIsInsideTemporalSpace(temporalContext.insideTemporalSpace)
      setTemporalLocationCandidates(temporalContext.locations)
      return true
    }

    const hydrated = syncTemporalSpaceLocations()
    let retries = 0
    let retryTimeoutId: number | null = null
    if (!hydrated) {
      const tryHydrate = () => {
        if (syncTemporalSpaceLocations()) return
        retries += 1
        if (retries >= 8) return
        retryTimeoutId = window.setTimeout(tryHydrate, 40)
      }
      retryTimeoutId = window.setTimeout(tryHydrate, 40)
    }
    props.editor.on('transaction', syncTemporalSpaceLocations)

    return () => {
      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId)
      }
      props.editor.off('transaction', syncTemporalSpaceLocations)
    }
  }, [findTemporalSpaceContext, props.editor])

  // Resolve coordinates for temporalSpace/group location tags (including custom tags
  // without saved coordinates yet) and convert them into map markers.
  useEffect(() => {
    let cancelled = false

    const resolveTemporalMarkers = async () => {
      if (!isInsideTemporalSpace || temporalLocationCandidates.length === 0) {
        setTemporalSpaceMarkers([])
        setResolvedTemporalLocations([])
        return
      }

      const resolvedMarkers: MapMarker[] = []
      const resolvedLocations: ResolvedTemporalLocation[] = []
      for (const candidate of temporalLocationCandidates) {
        let coords = candidate.coords
        if (!coords) {
          coords = await geocodeLocationCandidate(candidate, anchorPoints)
        }
        if (!coords) continue

        resolvedLocations.push({
          ...candidate,
          coords,
        })
        resolvedMarkers.push({
          lng: coords[0],
          lat: coords[1],
          label: candidate.label || candidate.name,
        })
      }

      if (!cancelled) {
        setResolvedTemporalLocations(resolvedLocations)
        const dedupedMarkers = dedupeMarkers(resolvedMarkers)
        setTemporalSpaceMarkers(dedupedMarkers)
      }
    }

    resolveTemporalMarkers()

    return () => {
      cancelled = true
    }
  }, [isInsideTemporalSpace, temporalLocationCandidates, geocodeLocationCandidate, anchorPoints])

  useEffect(() => {
    let cancelled = false

    const resolveTemporalRoutes = async () => {
      if (!MAPBOX_ACCESS_TOKEN || temporalRoutePaths.length === 0) {
        setTemporalRouteFeatures([])
        return
      }

      const routeFeatures = await Promise.all(
        temporalRoutePaths.map(async (routePath, routeIndex) => {
          if (routePath.coordinates.length < 2) return null

          const coordinatePath = routePath.coordinates.slice(0, 25)
          const coordinatesParam = coordinatePath
            .map(([lng, lat]) => `${lng},${lat}`)
            .join(';')

          try {
            const response = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesParam}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=full&steps=false&alternatives=false`,
            )
            if (!response.ok) {
              return null
            }

            const data = await response.json()
            const geometry = data?.routes?.[0]?.geometry
            const durationSeconds = Number(data?.routes?.[0]?.duration)
            if (
              geometry?.type !== 'LineString' ||
              !Array.isArray(geometry.coordinates) ||
              geometry.coordinates.length < 2
            ) {
              return null
            }

            const routeCoordinates = geometry.coordinates
              .map((coordinate: unknown) => {
                if (!Array.isArray(coordinate) || coordinate.length < 2) return null
                const lng = Number(coordinate[0])
                const lat = Number(coordinate[1])
                if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
                return [lng, lat] as [number, number]
              })
              .filter((coordinate: [number, number] | null): coordinate is [number, number] => !!coordinate)

            const midpoint = computeLineMidpoint(routeCoordinates)
            if (routeCoordinates.length < 2 || !midpoint) {
              return null
            }

            return {
              type: 'Feature' as const,
              properties: {
                routeIndex,
                temporalFutureIndex: routePath.futureIndex,
                temporalFutureTotal: temporalRoutePaths.length,
                strokeOpacity: getTemporalArrowFutureOpacity(routePath.futureIndex, temporalRoutePaths.length),
                durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
                durationLabel: formatRouteDurationLabel(durationSeconds),
                durationEmoji: '⏳',
                midpoint,
              },
              geometry: {
                type: 'LineString' as const,
                coordinates: routeCoordinates,
              },
            }
          } catch (error) {
            console.error('[MapboxMap] Failed to fetch route directions:', error)
            return null
          }
        }),
      )

      if (!cancelled) {
        setTemporalRouteFeatures(routeFeatures.filter((feature): feature is TemporalRouteFeature => !!feature))
      }
    }

    resolveTemporalRoutes()

    return () => {
      cancelled = true
    }
  }, [temporalRoutePaths])

  // Initialize map
  useEffect(() => {
    if (!ENABLE_INTERACTIVE_MAP) {
      setIsInteractiveMapReady(false)
      return
    }

    if (map.current || !mapContainer.current) return
    if (!MAPBOX_ACCESS_TOKEN) return

    let cancelled = false
    let mapInstance: mapboxgl.Map | null = null
    let frameId = 0
    let timeoutId = 0
    let didFallback = false

    const initializeMap = async () => {
      try {
        await ensureMapboxCssLoaded(MAPBOX_GL_CSS_URL)
      } catch (error) {
        console.error('[MapboxMap] Failed to load Mapbox CSS before init:', error)
      }

      if (cancelled || !mapContainer.current || map.current) return

      forceMapboxLayout(mapContainer.current)
      configureMapboxWorker()
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN

      try {
        mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: resolveMapboxStyle(style),
          center: center,
          zoom: zoom,
          attributionControl: false,
        })
        map.current = mapInstance
      } catch (error) {
        console.error('[MapboxMap] Failed to initialize map:', error)
        return
      }

      const failToStaticMap = (error: unknown) => {
        if (didFallback) return
        didFallback = true
        setIsInteractiveMapReady(false)
        console.warn('[MapboxMap] Falling back to static map image:', error)
        try {
          mapInstance?.remove()
        } catch (disposeError) {
          console.warn('[MapboxMap] Failed to dispose broken live map:', disposeError)
        } finally {
          if (map.current === mapInstance) {
            map.current = null
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
        }
      })

      if (mapInstance.loaded()) {
        setMapLoaded(true)
        setIsInteractiveMapReady(true)
        forceMapboxLayout(mapContainer.current)
        mapInstance.resize()
      } else {
        mapInstance.on('load', () => {
          if (!mapContainer.current) return
          setMapLoaded(true)
          setIsInteractiveMapReady(true)
          forceMapboxLayout(mapContainer.current)
          mapInstance?.resize()
        })
      }

      frameId = requestAnimationFrame(() => {
        forceMapboxLayout(mapContainer.current)
        mapInstance?.resize()
      })
      timeoutId = window.setTimeout(() => {
        forceMapboxLayout(mapContainer.current)
        mapInstance?.resize()
      }, 120)

      mapInstance.on('moveend', () => {
        if (mapInstance) {
          const newCenter = mapInstance.getCenter()
          const newZoom = mapInstance.getZoom()
          updateAttributes({
            center: [newCenter.lng, newCenter.lat],
            zoom: newZoom,
          })
        }
      })
    }

    initializeMap()

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      try {
        mapInstance?.remove()
      } catch (error) {
        console.error('[MapboxMap] Failed to dispose map:', error)
      } finally {
        if (map.current === mapInstance) {
          map.current = null
        }
      }
      setMapLoaded(false)
      setIsInteractiveMapReady(false)
    }
  }, [])

  // Keep map dimensions in sync with container changes.
  useEffect(() => {
    if (!map.current || !mapContainer.current) return

    const resizeMap = () => {
      forceMapboxLayout(mapContainer.current)
      map.current?.resize()
    }
    const observer = new ResizeObserver(resizeMap)
    observer.observe(mapContainer.current)
    window.addEventListener('resize', resizeMap)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resizeMap)
    }
  }, [])

  // Sync markers with map whenever markers array or mapLoaded changes
  useEffect(() => {
    if (!map.current) return
    
    // Wait for map to be loaded before adding markers
    const syncMarkers = () => {
      // Remove existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []

      // Add all markers from node attrs + sibling location tags in temporalSpace/group.
      activeMarkers.forEach((markerData: MapMarker) => {
        const marker = addMarkerToMap(markerData)
        if (marker) {
          markersRef.current.push(marker)
        }
      })

      if (!hasTemporalPins || activeMarkers.length === 0 || !map.current) {
        autoFitSignatureRef.current = ''
        return
      }

      const nextSignature = activeMarkers
        .map((markerData) => `${markerData.lng.toFixed(4)},${markerData.lat.toFixed(4)}`)
        .sort()
        .join('|')

      if (autoFitSignatureRef.current === nextSignature) return
      autoFitSignatureRef.current = nextSignature

      if (activeMarkers.length === 1) {
        const onlyMarker = activeMarkers[0]
        map.current.easeTo({
          center: [onlyMarker.lng, onlyMarker.lat],
          zoom: Math.max(map.current.getZoom(), 11),
          duration: 600,
        })
        return
      }

      const bounds = new mapboxgl.LngLatBounds()
      activeMarkers.forEach((markerData) => {
        bounds.extend([markerData.lng, markerData.lat])
      })
      map.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 11,
        duration: 700,
      })
    }

    if (map.current.loaded()) {
      syncMarkers()
    } else {
      map.current.once('load', syncMarkers)
    }
  }, [activeMarkers, hasTemporalPins, mapLoaded, addMarkerToMap])

  useEffect(() => {
    if (!map.current) return

    const syncRouteDurationMarkers = () => {
      routeDurationMarkersRef.current.forEach((marker) => marker.remove())
      routeDurationMarkersRef.current = []

      if (!map.current || temporalRouteFeatures.length === 0) {
        return
      }

      temporalRouteFeatures.forEach((feature) => {
        const markerElement = document.createElement('span')
        markerElement.className = 'duration-badge'
        markerElement.setAttribute('data-type', 'duration-badge')
        markerElement.style.pointerEvents = 'none'

        const emoji = document.createElement('span')
        emoji.className = 'duration-badge-emoji'
        emoji.textContent = feature.properties.durationEmoji

        const label = document.createElement('span')
        label.className = 'duration-badge-label'
        label.textContent = feature.properties.durationLabel

        markerElement.appendChild(emoji)
        markerElement.appendChild(label)

        const durationMarker = new mapboxgl.Marker({
          element: markerElement,
          anchor: 'center',
        })
          .setLngLat(feature.properties.midpoint)
          .addTo(map.current!)

        durationMarker.getElement().style.zIndex = '5'

        routeDurationMarkersRef.current.push(durationMarker)
      })
    }

    const syncRoutes = () => {
      if (!map.current) return

      if (temporalRouteFeatures.length === 0) {
        syncRouteDurationMarkers()
        return
      }

      syncRouteDurationMarkers()
    }

    if (map.current.loaded()) {
      syncRoutes()
    } else {
      map.current.once('load', syncRoutes)
    }

    return () => {
      routeDurationMarkersRef.current.forEach((marker) => marker.remove())
      routeDurationMarkersRef.current = []
    }
  }, [mapLoaded, temporalRouteFeatures])

  useEffect(() => {
    if (!map.current || !mapSurface.current) {
      setTemporalRouteOverlayPaths([])
      return
    }

    const syncRouteOverlayPaths = () => {
      const mapInstance = map.current
      if (!mapInstance || !mapSurface.current || temporalRouteFeatures.length === 0) {
        setTemporalRouteOverlayPaths([])
        return
      }

      const nextPaths = temporalRouteFeatures
        .map((feature): TemporalRouteOverlayPath | null => {
          const points = feature.geometry.coordinates
            .map((coordinate) => mapInstance.project(coordinate))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))

          if (points.length < 2) return null

          const d = points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ')
          const endPoint = points[points.length - 1]
          const previousPoint = points[points.length - 2]
          const angle = Math.atan2(endPoint.y - previousPoint.y, endPoint.x - previousPoint.x)

          return {
            id: `route-overlay-${feature.properties.routeIndex}`,
            d,
            arrowPoints: buildTemporalArrowPolygonPoints(endPoint.x, endPoint.y, angle),
            futureIndex: feature.properties.temporalFutureIndex,
            futureTotal: feature.properties.temporalFutureTotal,
          }
        })
        .filter((path): path is TemporalRouteOverlayPath => !!path)

      setTemporalRouteOverlayPaths(nextPaths)
    }

    syncRouteOverlayPaths()
    map.current.on('move', syncRouteOverlayPaths)
    map.current.on('zoom', syncRouteOverlayPaths)
    map.current.on('resize', syncRouteOverlayPaths)

    return () => {
      map.current?.off('move', syncRouteOverlayPaths)
      map.current?.off('zoom', syncRouteOverlayPaths)
      map.current?.off('resize', syncRouteOverlayPaths)
    }
  }, [mapLoaded, temporalRouteFeatures])

  // Search for locations using Mapbox Geocoding API
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    if (!MAPBOX_ACCESS_TOKEN) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5`
      )
      const data = await response.json()
      setSearchResults(data.features || [])
      setShowResults(true)
    } catch (error) {
      console.error('Geocoding error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchLocation])

  // Handle selecting a search result
  const handleSelectLocation = (result: any) => {
    const [lng, lat] = result.center
    
    // Create marker data
    const newMarker: MapMarker = {
      lng,
      lat,
      label: result.place_name,
    }
    
    // Add marker to map immediately
    if (map.current) {
      const marker = addMarkerToMap(newMarker)
      if (marker) {
        markersRef.current.push(marker)
      }
    }
    
    // Update attributes for persistence
    updateAttributes({
      markers: [...markers, newMarker],
      center: [lng, lat],
    })

    // Fly to location
    map.current?.flyTo({
      center: [lng, lat],
      zoom: 14,
      duration: 1500,
    })

    // Clear search
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  return (
    <NodeViewWrapper data-mapbox-map="" style={{ margin: '16px 0' }}>
        <div
          style={{
            borderRadius: 8,
            overflow: 'hidden',
            outline: 'none',
          }}
        >
        {/* Map Container */}
        {/* ARCHITECTURE: Height increased to 280px so the embedded map
            doesn't dominate the timeline card — keeps the location context
            visible without pushing surrounding content too far apart. */}
        <div
          ref={mapSurface}
          style={{
            position: 'relative',
            width: '100%',
            height: 280,
          }}
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

          {/* ARCHITECTURE: Keep the search UI as a floating overlay so the
              map remains the primary surface and the controls are always
              within reach (top-right) without adding layout height. */}
          {ENABLE_MAP_SEARCH_OVERLAY && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 5,
                width: 240,
                maxWidth: 'calc(100% - 24px)',
                backgroundColor: '#ffffff',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                boxShadow: '0 8px 20px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search for a location to pin..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: 12,
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: '#374151',
                      backgroundColor: 'transparent',
                    }}
                  />
                  {isSearching && (
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid #e5e7eb',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div
                  style={{
                    borderTop: '1px solid #e5e7eb',
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}
                >
                  {searchResults.map((result, index) => (
                    <div
                      key={result.id || index}
                      onClick={() => handleSelectLocation(result)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: index < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#9ca3af"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ marginTop: 2, flexShrink: 0 }}
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: '#374151',
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {result.text}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#9ca3af',
                              fontFamily: "'Inter', sans-serif",
                              marginTop: 2,
                            }}
                          >
                            {result.place_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div
            ref={mapContainer}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: isInteractiveMapReady ? 1 : 0,
            }}
          />

          {temporalRouteOverlayPaths.length > 0 && (
            <svg
              data-temporal-map-route-overlay="true"
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
              {temporalRouteOverlayPaths.map((routePath) => (
                <g key={routePath.id}>
                  <TemporalArrowVisual
                    d={routePath.d}
                    arrowPoints={routePath.arrowPoints}
                    futureIndex={routePath.futureIndex}
                    futureTotal={routePath.futureTotal}
                  />
                </g>
              ))}
            </svg>
          )}

          {/* Keep a visible center pin in the map viewport so the selected
              location is clearly shown on-map. */}
          {!hasTemporalPins && markers.length > 0 && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                zIndex: 4,
                filter: 'drop-shadow(0 4px 4px rgba(0, 0, 0, 0.35))',
              }}
            >
              <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.059 27.941 0 18 0z" fill="#e11d48" />
                <circle cx="18" cy="18" r="7" fill="white" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .mapboxgl-ctrl-bottom-right,
        .mapboxgl-ctrl-bottom-left,
        .mapboxgl-ctrl-logo,
        .mapboxgl-ctrl-attrib {
          display: none !important;
        }
      `}</style>
    </NodeViewWrapper>
  )
}

// Mapbox Map Tiptap Extension
export const MapboxMapExtension = Node.create({
  name: 'mapboxMap',

  group: 'block',

  atom: true,

  draggable: true,

  selectable: true,

  addAttributes() {
    return {
      center: {
        default: DEFAULT_MAP_CENTER,
      },
      zoom: {
        default: DEFAULT_MAP_ZOOM,
      },
      markers: {
        default: [],
      },
      style: {
        default: DEFAULT_MAP_STYLE,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-mapbox-map]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mapbox-map': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MapboxMapNodeView)
  },

  addCommands() {
    return {
      insertMapboxMap:
        (options?: { center?: [number, number]; zoom?: number }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options || {},
          })
        },
    }
  },
})
