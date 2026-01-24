'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
import mapboxgl from 'mapbox-gl'
import { NodeOverlay } from "../components/NodeOverlay"

// Mapbox access token
const MAPBOX_ACCESS_TOKEN = 'MAPBOX_TOKEN_REMOVED'

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

const MapboxMapNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, selected } = props
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Cast attrs to our custom type for type-safe access
  const attrs = node.attrs as unknown as MapboxMapAttrs
  const { center, zoom, markers, style } = attrs

  // Load Mapbox CSS
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.16.1/mapbox-gl.css'
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // Helper function to add a marker to the map
  const addMarkerToMap = useCallback((markerData: MapMarker) => {
    if (!map.current) return null
    
    const marker = new mapboxgl.Marker({ 
      color: '#e11d48',
      scale: 1.2 
    })
      .setLngLat([markerData.lng, markerData.lat])
      .addTo(map.current)

    if (markerData.label) {
      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: false,
      })
        .setHTML(`<div style="font-family: Inter, sans-serif; font-size: 14px; padding: 4px 8px; max-width: 200px;">${markerData.label}</div>`)
      marker.setPopup(popup)
      marker.togglePopup()
    }

    return marker
  }, [])

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: style || 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

    // Set map as loaded when ready - also check if already loaded
    if (map.current.loaded()) {
      setMapLoaded(true)
    } else {
      map.current.on('load', () => {
        setMapLoaded(true)
      })
    }

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
      map.current?.remove()
      map.current = null
      setMapLoaded(false)
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

      // Add all markers from the node attributes
      markers.forEach((markerData: MapMarker) => {
        const marker = addMarkerToMap(markerData)
        if (marker) {
          markersRef.current.push(marker)
        }
      })
    }

    if (map.current.loaded()) {
      syncMarkers()
    } else {
      map.current.once('load', syncMarkers)
    }
  }, [markers, mapLoaded, addMarkerToMap])

  // Search for locations using Mapbox Geocoding API
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
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

  // Remove a marker
  const removeMarker = (index: number) => {
    const newMarkers = markers.filter((_: MapMarker, i: number) => i !== index)
    updateAttributes({ markers: newMarkers })
  }

  return (
    <NodeViewWrapper style={{ margin: '16px 0' }}>
      <NodeOverlay nodeProps={props} nodeType="mapboxMap">
        <div
          style={{
            borderRadius: 8,
            overflow: 'hidden',
            outline: selected ? '3px solid #6366f1' : 'none',
            outlineOffset: 2,
          }}
        >
        {/* Search Bar */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
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
                fontSize: 14,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                color: '#374151',
                backgroundColor: 'transparent',
              }}
            />
            {isSearching && (
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: '2px solid #e5e7eb',
                  borderTopColor: '#6366f1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {searchResults.map((result, index) => (
                <div
                  key={result.id || index}
                  onClick={() => handleSelectLocation(result)}
                  style={{
                    padding: '10px 16px',
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

        {/* Pinned Locations List */}
        {markers.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {markers.map((marker: MapMarker, index: number) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontFamily: "'Inter', sans-serif",
                  color: '#374151',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="#e11d48"
                  stroke="none"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                </svg>
                <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {marker.label || `${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}`}
                </span>
                <button
                  onClick={() => removeMarker(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    color: '#9ca3af',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Map Container */}
        <div
          ref={mapContainer}
          style={{
            width: '100%',
            height: 400,
          }}
        />
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      </NodeOverlay>
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

