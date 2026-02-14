'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
import mapboxgl from 'mapbox-gl'

// Mapbox access token (must be provided by environment variable)
const MAPBOX_ACCESS_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
  ''

interface MapMarker {
  lng: number
  lat: number
  label?: string
}

// Custom attrs for this node - accessed via node.attrs with type assertion
interface MapboxMapAttrs {
  center: [number, number]
  zoom: number
  markers: MapMarker[]
  style: string
}

interface LocationNodeAttrs {
  id?: string
  label?: string
  'data-name'?: string
  'data-country'?: string
  'data-coords'?: string | [number, number] | null
}

interface TemporalLocationCandidate {
  id?: string
  name: string
  label: string
  country?: string
  coords: [number, number] | null
}

interface TemporalSpaceContext {
  insideTemporalSpace: boolean
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

const MapboxMapNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes } = props
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const autoFitSignatureRef = useRef('')
  const geocodeCacheRef = useRef(new Map<string, [number, number] | null>())
  const temporalContextSignatureRef = useRef('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isInsideTemporalSpace, setIsInsideTemporalSpace] = useState(false)
  const [temporalLocationCandidates, setTemporalLocationCandidates] = useState<TemporalLocationCandidate[]>([])
  const [temporalSpaceMarkers, setTemporalSpaceMarkers] = useState<MapMarker[]>([])

  // Cast attrs to our custom type for type-safe access
  const attrs = node.attrs as unknown as MapboxMapAttrs
  const { center, zoom, markers, style } = attrs
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
      let temporalNode: any | null = null

      for (let depth = $pos.depth; depth >= 0; depth -= 1) {
        const ancestor = $pos.node(depth)
        if (ancestor.type.name === 'temporalSpace') {
          temporalNode = ancestor
          break
        }
      }

      if (!temporalNode) {
        return emptyContext
      }

      const locations: TemporalLocationCandidate[] = []
      temporalNode.descendants((childNode: any) => {
        if (childNode.type.name !== 'location') return

        const locationAttrs = (childNode.attrs || {}) as LocationNodeAttrs
        const name = locationAttrs['data-name'] || locationAttrs.label || ''
        if (!name) return

        const label = locationAttrs.label?.replace(/^📍\s*/, '') || name
        locations.push({
          id: locationAttrs.id,
          name,
          label,
          country: locationAttrs['data-country'] || undefined,
          coords: parseCoords(locationAttrs['data-coords']),
        })
      })

      return {
        insideTemporalSpace: true,
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
    const existingLink = document.querySelector<HTMLLinkElement>('link[data-mapbox-gl-css="true"]')
    if (existingLink) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css'
    link.setAttribute('data-mapbox-gl-css', 'true')
    document.head.appendChild(link)
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

  // Track location tags inside the same containing temporalSpace node.
  useEffect(() => {
    const syncTemporalSpaceLocations = (): boolean => {
      if (props.editor.isDestroyed) return false

      const temporalContext = findTemporalSpaceContext()
      if (!temporalContext) return false

      const nextSignature = `${temporalContext.insideTemporalSpace}:${temporalContext.locations
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

  // Resolve coordinates for temporalSpace location tags (including custom tags
  // without saved coordinates yet) and convert them into map markers.
  useEffect(() => {
    let cancelled = false

    const resolveTemporalMarkers = async () => {
      if (!isInsideTemporalSpace || temporalLocationCandidates.length === 0) {
        setTemporalSpaceMarkers([])
        return
      }

      const resolvedMarkers: MapMarker[] = []
      for (const candidate of temporalLocationCandidates) {
        let coords = candidate.coords
        if (!coords) {
          coords = await geocodeLocationCandidate(candidate, anchorPoints)
        }
        if (!coords) continue

        resolvedMarkers.push({
          lng: coords[0],
          lat: coords[1],
          label: candidate.label || candidate.name,
        })
      }

      if (!cancelled) {
        const dedupedMarkers = dedupeMarkers(resolvedMarkers)
        setTemporalSpaceMarkers(dedupedMarkers)
      }
    }

    resolveTemporalMarkers()

    return () => {
      cancelled = true
    }
  }, [isInsideTemporalSpace, temporalLocationCandidates, geocodeLocationCandidate, anchorPoints])

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return
    if (!MAPBOX_ACCESS_TOKEN) return

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style || 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
      attributionControl: false,
    })

    // Set map as loaded when ready - also check if already loaded
    if (map.current.loaded()) {
      setMapLoaded(true)
      map.current.resize()
    } else {
      map.current.on('load', () => {
        setMapLoaded(true)
        map.current?.resize()
      })
    }

    // In node views, layout can settle after initial mount.
    // Force follow-up resizes so the map fills the card on first render.
    const frameId = requestAnimationFrame(() => map.current?.resize())
    const timeoutId = window.setTimeout(() => map.current?.resize(), 120)

    // Update attributes when map moves
    map.current.on('moveend', () => {
      if (map.current) {
        const newCenter = map.current.getCenter()
        const newZoom = map.current.getZoom()
        updateAttributes({
          center: [newCenter.lng, newCenter.lat],
          zoom: newZoom,
        })
      }
    })

    return () => {
      cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      map.current?.remove()
      map.current = null
      setMapLoaded(false)
    }
  }, [])

  // Keep map dimensions in sync with container changes.
  useEffect(() => {
    if (!map.current || !mapContainer.current) return

    const resizeMap = () => map.current?.resize()
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

      // Add all markers from node attrs + sibling location tags in temporalSpace.
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
    <NodeViewWrapper style={{ margin: '16px 0' }}>
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
          style={{
            position: 'relative',
            width: '100%',
            height: 280,
          }}
        >
          {/* ARCHITECTURE: Keep the search UI as a floating overlay so the
              map remains the primary surface and the controls are always
              within reach (top-right) without adding layout height. */}
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

          <div
            ref={mapContainer}
            style={{
              width: '100%',
              height: '100%',
            }}
          />

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
        default: [-74.5, 40], // Default to New York area
      },
      zoom: {
        default: 9,
      },
      markers: {
        default: [],
      },
      style: {
        default: 'mapbox://styles/mapbox/streets-v12',
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
