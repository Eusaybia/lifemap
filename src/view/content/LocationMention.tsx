'use client'

import './MentionList.scss'
import { Extension, mergeAttributes } from '@tiptap/core'
import { Node } from '@tiptap/core'
import { ReactRenderer, NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react'
import Suggestion, { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import React, { forwardRef, useEffect, useImperativeHandle, useState, useRef, useCallback } from 'react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import { motion, AnimatePresence } from 'framer-motion'
import { PluginKey } from '@tiptap/pm/state'
import mapboxgl from 'mapbox-gl'

// Unique plugin key to avoid conflicts with other extensions
const LocationPluginKey = new PluginKey('location-suggestion')

// Mapbox access token
const MAPBOX_ACCESS_TOKEN = 'MAPBOX_TOKEN_REMOVED'

// ============================================================================
// Types
// ============================================================================

export interface Location {
  id: string
  name: string
  country?: string
  emoji: string
  coords?: [number, number] // [lng, lat]
}

interface LocationListProps extends SuggestionProps {
  items: Location[]
}

type LocationListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

// ============================================================================
// Popular Locations Database (with coordinates)
// ============================================================================

const POPULAR_LOCATIONS: Location[] = [
  // Australia
  { id: 'loc:sydney', name: 'Sydney', country: 'Australia', emoji: '📍', coords: [151.2093, -33.8688] },
  { id: 'loc:melbourne', name: 'Melbourne', country: 'Australia', emoji: '📍', coords: [144.9631, -37.8136] },
  { id: 'loc:brisbane', name: 'Brisbane', country: 'Australia', emoji: '📍', coords: [153.0251, -27.4698] },
  { id: 'loc:perth', name: 'Perth', country: 'Australia', emoji: '📍', coords: [115.8605, -31.9505] },
  { id: 'loc:adelaide', name: 'Adelaide', country: 'Australia', emoji: '📍', coords: [138.6007, -34.9285] },
  { id: 'loc:gold-coast', name: 'Gold Coast', country: 'Australia', emoji: '📍', coords: [153.4000, -28.0167] },
  { id: 'loc:canberra', name: 'Canberra', country: 'Australia', emoji: '📍', coords: [149.1300, -35.2809] },
  
  // USA
  { id: 'loc:new-york', name: 'New York', country: 'USA', emoji: '📍', coords: [-74.0060, 40.7128] },
  { id: 'loc:los-angeles', name: 'Los Angeles', country: 'USA', emoji: '📍', coords: [-118.2437, 34.0522] },
  { id: 'loc:san-francisco', name: 'San Francisco', country: 'USA', emoji: '📍', coords: [-122.4194, 37.7749] },
  { id: 'loc:chicago', name: 'Chicago', country: 'USA', emoji: '📍', coords: [-87.6298, 41.8781] },
  { id: 'loc:miami', name: 'Miami', country: 'USA', emoji: '📍', coords: [-80.1918, 25.7617] },
  { id: 'loc:seattle', name: 'Seattle', country: 'USA', emoji: '📍', coords: [-122.3321, 47.6062] },
  { id: 'loc:boston', name: 'Boston', country: 'USA', emoji: '📍', coords: [-71.0589, 42.3601] },
  { id: 'loc:las-vegas', name: 'Las Vegas', country: 'USA', emoji: '📍', coords: [-115.1398, 36.1699] },
  
  // Europe
  { id: 'loc:london', name: 'London', country: 'UK', emoji: '📍', coords: [-0.1276, 51.5074] },
  { id: 'loc:paris', name: 'Paris', country: 'France', emoji: '📍', coords: [2.3522, 48.8566] },
  { id: 'loc:berlin', name: 'Berlin', country: 'Germany', emoji: '📍', coords: [13.4050, 52.5200] },
  { id: 'loc:rome', name: 'Rome', country: 'Italy', emoji: '📍', coords: [12.4964, 41.9028] },
  { id: 'loc:amsterdam', name: 'Amsterdam', country: 'Netherlands', emoji: '📍', coords: [4.9041, 52.3676] },
  { id: 'loc:barcelona', name: 'Barcelona', country: 'Spain', emoji: '📍', coords: [2.1734, 41.3851] },
  { id: 'loc:madrid', name: 'Madrid', country: 'Spain', emoji: '📍', coords: [-3.7038, 40.4168] },
  { id: 'loc:vienna', name: 'Vienna', country: 'Austria', emoji: '📍', coords: [16.3738, 48.2082] },
  { id: 'loc:prague', name: 'Prague', country: 'Czech Republic', emoji: '📍', coords: [14.4378, 50.0755] },
  { id: 'loc:dublin', name: 'Dublin', country: 'Ireland', emoji: '📍', coords: [-6.2603, 53.3498] },
  
  // Asia
  { id: 'loc:tokyo', name: 'Tokyo', country: 'Japan', emoji: '📍', coords: [139.6917, 35.6895] },
  { id: 'loc:singapore', name: 'Singapore', country: 'Singapore', emoji: '📍', coords: [103.8198, 1.3521] },
  { id: 'loc:hong-kong', name: 'Hong Kong', country: 'China', emoji: '📍', coords: [114.1694, 22.3193] },
  { id: 'loc:shanghai', name: 'Shanghai', country: 'China', emoji: '📍', coords: [121.4737, 31.2304] },
  { id: 'loc:beijing', name: 'Beijing', country: 'China', emoji: '📍', coords: [116.4074, 39.9042] },
  { id: 'loc:seoul', name: 'Seoul', country: 'South Korea', emoji: '📍', coords: [126.9780, 37.5665] },
  { id: 'loc:bangkok', name: 'Bangkok', country: 'Thailand', emoji: '📍', coords: [100.5018, 13.7563] },
  { id: 'loc:dubai', name: 'Dubai', country: 'UAE', emoji: '📍', coords: [55.2708, 25.2048] },
  { id: 'loc:mumbai', name: 'Mumbai', country: 'India', emoji: '📍', coords: [72.8777, 19.0760] },
  { id: 'loc:delhi', name: 'Delhi', country: 'India', emoji: '📍', coords: [77.1025, 28.7041] },
  { id: 'loc:taipei', name: 'Taipei', country: 'Taiwan', emoji: '📍', coords: [121.5654, 25.0330] },
  
  // Other
  { id: 'loc:toronto', name: 'Toronto', country: 'Canada', emoji: '📍', coords: [-79.3832, 43.6532] },
  { id: 'loc:vancouver', name: 'Vancouver', country: 'Canada', emoji: '📍', coords: [-123.1207, 49.2827] },
  { id: 'loc:auckland', name: 'Auckland', country: 'New Zealand', emoji: '📍', coords: [174.7633, -36.8485] },
  { id: 'loc:cape-town', name: 'Cape Town', country: 'South Africa', emoji: '📍', coords: [18.4241, -33.9249] },
  { id: 'loc:rio', name: 'Rio de Janeiro', country: 'Brazil', emoji: '📍', coords: [-43.1729, -22.9068] },
  { id: 'loc:buenos-aires', name: 'Buenos Aires', country: 'Argentina', emoji: '📍', coords: [-58.3816, -34.6037] },
  { id: 'loc:mexico-city', name: 'Mexico City', country: 'Mexico', emoji: '📍', coords: [-99.1332, 19.4326] },
]

// ============================================================================
// Location Search
// ============================================================================

const createCustomLocation = (name: string): Location => ({
  id: `loc:custom-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name: name,
  emoji: '📍',
})

const fetchLocations = (query: string): Location[] => {
  // Allow any text with at least 1 character
  if (!query || query.length < 1) return []
  
  const lowerQuery = query.toLowerCase()
  
  // Filter matching predefined locations
  const matches = POPULAR_LOCATIONS.filter((loc) =>
    loc.name.toLowerCase().includes(lowerQuery) ||
    (loc.country && loc.country.toLowerCase().includes(lowerQuery))
  )
  
  // Check if query exactly matches a predefined location name
  const exactMatch = matches.find(loc => loc.name.toLowerCase() === lowerQuery)
  
  // Build results: predefined matches first, then custom option if no exact match
  const results = matches.slice(0, 7)
  
  // Always offer custom location option if query doesn't exactly match a predefined location
  if (!exactMatch && query.length >= 1) {
    results.push(createCustomLocation(query))
  }
  
  return results
}

// ============================================================================
// Location List Component (Dropdown UI)
// ============================================================================

const LocationList = forwardRef<LocationListRef, LocationListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    if (index >= props.items.length) return

    const location = props.items[index]
    
    props.command({
      id: location.id,
      label: `${location.emoji} ${location.name}`,
      'data-name': location.name,
      'data-country': location.country || '',
      'data-coords': location.coords ? JSON.stringify(location.coords) : null,
    })
  }

  const upHandler = () => setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  const downHandler = () => setSelectedIndex((selectedIndex + 1) % props.items.length)
  const enterHandler = () => selectItem(selectedIndex)

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') { upHandler(); return true }
      if (event.key === 'ArrowDown') { downHandler(); return true }
      if (event.key === 'Enter') { enterHandler(); return true }
      return false
    },
  }))

  const isCustomLocation = (item: Location) => item.id.startsWith('loc:custom-')

  return (
    <div className="location-items">
      {props.items.length > 0 ? (
        props.items.map((item: Location, index) => (
          <motion.div
            className={`location-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={item.id}
            onClick={() => selectItem(index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="location-emoji">{item.emoji}</span>
            <div className="location-content">
              <span className="location-name">
                {isCustomLocation(item) ? `Create: ${item.name}` : item.name}
              </span>
              {item.country && !isCustomLocation(item) && (
                <span className="location-country">{item.country}</span>
              )}
            </div>
          </motion.div>
        ))
      ) : (
        <div className="location-item">No matching locations.</div>
      )}
    </div>
  )
})

LocationList.displayName = 'LocationList'

// ============================================================================
// Location Node View (Expandable with Map)
// ============================================================================


const LocationNodeView = ({ node, selected, updateAttributes }: NodeViewProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markerAdded = useRef(false)

  const attrs = node.attrs as {
    id: string
    label: string
    'data-name': string
    'data-country': string
    'data-coords': string | null
  }
  
  const label = attrs.label
  const name = attrs['data-name'] || label
  const coordsStr = attrs['data-coords']
  
  // Parse coordinates
  let coords: [number, number] | null = null
  if (coordsStr) {
    try {
      coords = JSON.parse(coordsStr)
    } catch (e) {
      // Invalid coords, will geocode later
    }
  }

  // Geocode location if no coords (memoized function ref)
  const geocodeLocationRef = useRef<() => Promise<[number, number] | null>>()
  geocodeLocationRef.current = async () => {
    if (coords || !name) return null
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(name)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
      )
      const data = await response.json()
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center
        updateAttributes({ 'data-coords': JSON.stringify([lng, lat]) })
        return [lng, lat] as [number, number]
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
    return null
  }

  // Track if CSS is loaded
  const [cssLoaded, setCssLoaded] = useState(false)
  
  // Load Mapbox CSS BEFORE initializing map
  useEffect(() => {
    const existingLink = document.querySelector('link[href*="mapbox-gl.css"]')
    if (existingLink) {
      setCssLoaded(true)
      return
    }
    
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.16.1/mapbox-gl.css'
    link.onload = () => setCssLoaded(true)
    document.head.appendChild(link)
    
    // Fallback if onload doesn't fire
    setTimeout(() => setCssLoaded(true), 500)
  }, [])

  // Initialize map when expanded - use requestAnimationFrame to wait for DOM
  useEffect(() => {
    if (!isExpanded || !cssLoaded) return

    let cancelled = false
    let mapInstance: mapboxgl.Map | null = null

    const initMap = async () => {
      // Wait for DOM to be ready using requestAnimationFrame with timeout
      let attempts = 0
      const maxAttempts = 50 // ~500ms max wait
      
      await new Promise<void>((resolve) => {
        const checkContainer = () => {
          attempts++
          if (mapContainer.current) {
            resolve()
          } else if (!cancelled && attempts < maxAttempts) {
            requestAnimationFrame(checkContainer)
          } else {
            resolve()
          }
        }
        requestAnimationFrame(checkContainer)
      })

      if (cancelled || !mapContainer.current) return
      
      // Get coords - either from props or geocode
      let mapCoords = coords
      if (!mapCoords && geocodeLocationRef.current) {
        mapCoords = await geocodeLocationRef.current()
      }
      
      if (cancelled) return
      
      // Default to Sydney if no coords
      const center: [number, number] = mapCoords || [151.2093, -33.8688]

      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN
      
      try {
        mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: 12,
        })
        map.current = mapInstance
      } catch (e) {
        console.error('[LocationMention] Failed to create map:', e)
        return
      }

      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

      // Store center in closure for marker function
      const markerCenter = center
      const locationName = name

      // Add Google Maps style marker using native Mapbox layers
      const addMarkerLayer = () => {
        if (cancelled || !mapInstance || markerAdded.current) return
        
        try {
          // Create Google Maps style pin SVG as data URL
          const pinSvg = `
            <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
                </filter>
              </defs>
              <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.059 27.941 0 18 0z" fill="#e11d48" filter="url(#shadow)"/>
              <circle cx="18" cy="18" r="7" fill="white"/>
            </svg>
          `
          const pinImage = new Image(36, 48)
          pinImage.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pinSvg)
          
          pinImage.onload = () => {
            if (cancelled || !mapInstance) return
            
            // Add the pin image to the map
            if (!mapInstance.hasImage('google-pin')) {
              mapInstance.addImage('google-pin', pinImage, { pixelRatio: 2 })
            }
            
            // Add marker source
            mapInstance.addSource('location-marker', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  properties: { name: locationName },
                  geometry: { type: 'Point', coordinates: markerCenter }
                }]
              }
            })

            // Add marker symbol layer with the pin icon
            mapInstance.addLayer({
              id: 'marker-pin',
              type: 'symbol',
              source: 'location-marker',
              layout: {
                'icon-image': 'google-pin',
                'icon-size': 1,
                'icon-anchor': 'bottom',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
              }
            })

            // Add label below the marker
            mapInstance.addLayer({
              id: 'marker-label',
              type: 'symbol',
              source: 'location-marker',
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 13,
                'text-offset': [0, 0.8],
                'text-anchor': 'top'
              },
              paint: {
                'text-color': '#1f2937',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2
              }
            })

            markerAdded.current = true
          }
          
          // Fallback if image doesn't load
          pinImage.onerror = () => {
            if (cancelled || !mapInstance) return
            
            // Add marker source
            mapInstance.addSource('location-marker', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  properties: { name: locationName },
                  geometry: { type: 'Point', coordinates: markerCenter }
                }]
              }
            })

            // Fallback to circle marker
            mapInstance.addLayer({
              id: 'marker-circle',
              type: 'circle',
              source: 'location-marker',
              paint: {
                'circle-radius': 10,
                'circle-color': '#e11d48',
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff'
              }
            })
            
            markerAdded.current = true
          }
        } catch (e) {
          console.error('[LocationMention] Failed to add marker layer:', e)
        }
      }

      // Wait for map to fully load before adding marker
      mapInstance.on('load', addMarkerLayer)
      mapInstance.on('style.load', addMarkerLayer)
      
      // Fallback: if neither event fires within 2 seconds, add marker anyway
      setTimeout(() => {
        if (!markerAdded.current && !cancelled) addMarkerLayer()
      }, 2000)
    }

    initMap()

    return () => {
      cancelled = true
      markerAdded.current = false
      if (mapInstance) {
        mapInstance.remove()
        mapInstance = null
      }
      map.current = null
    }
  }, [isExpanded, coords, name, cssLoaded])

  const tagRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Calculate position before expanding
    if (tagRef.current && !isExpanded) {
      const rect = tagRef.current.getBoundingClientRect()
      setPopoverPosition({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
    
    setIsExpanded(!isExpanded)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsExpanded(false)
  }

  // Close popover when clicking outside
  useEffect(() => {
    if (!isExpanded) return
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        popoverRef.current && 
        !popoverRef.current.contains(target) &&
        tagRef.current &&
        !tagRef.current.contains(target)
      ) {
        setIsExpanded(false)
      }
    }

    // Add listener after a short delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline', position: 'relative' }}>
      <span
        ref={tagRef}
        className={`location-mention ${selected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {label}
      </span>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: popoverPosition.top,
              left: popoverPosition.left,
              backgroundColor: '#ffffff',
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 10px 40px -5px rgba(0, 0, 0, 0.2), 0 4px 12px -2px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              width: 350,
              zIndex: 99999,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>📍</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
                  {name}
                </span>
              </div>
              <button
                onClick={handleClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb'
                  e.currentTarget.style.color = '#111827'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#6b7280'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            {/* Map Container */}
            <div
              ref={mapContainer}
              style={{
                width: '100%',
                height: 220,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </NodeViewWrapper>
  )
}

// ============================================================================
// Location Node (for rendering inserted locations)
// ============================================================================

export const LocationNode = Node.create({
  name: 'location',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      'data-name': { default: null },
      'data-country': { default: null },
      'data-coords': { default: null }, // JSON stringified [lng, lat]
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="location"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'location-mention',
        'data-type': 'location',
        'data-id': node.attrs.id,
      }),
      node.attrs.label || '',
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(LocationNodeView)
  },
})

// ============================================================================
// Location Extension (combines Node + Suggestion)
// ============================================================================

export interface LocationOptions {
  HTMLAttributes: Record<string, any>
  suggestion: Omit<SuggestionOptions<Location>, 'editor'>
}

export const LocationMention = Extension.create<LocationOptions>({
  name: 'location-extension',

  addOptions() {
    return {
      HTMLAttributes: { class: 'location-mention' },
      suggestion: {
        char: '!',  // Use ! for locations to avoid conflict with @ for timepoints
        allowSpaces: true,
        pluginKey: LocationPluginKey,
        items: ({ query }) => fetchLocations(query),
        command: ({ editor, range, props }) => {
          // Delete the trigger text and insert the location node
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'location',
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
        render: () => {
          let component: ReactRenderer<LocationListRef> | undefined
          let popup: TippyInstance | undefined

          return {
            onStart: (props) => {
              component = new ReactRenderer(LocationList, {
                props,
                editor: props.editor,
              })

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })[0]
            },

            onUpdate: (props) => {
              component?.updateProps(props)
              popup?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              })
            },

            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.hide()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },

            onExit: () => {
              popup?.destroy()
              component?.destroy()
            },
          }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

export default LocationMention

