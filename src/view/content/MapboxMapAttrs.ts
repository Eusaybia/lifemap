export interface MapMarker {
  lng: number
  lat: number
  label?: string
}

export type MapboxMapLens = 'map2DView' | 'globeView'

export interface MapboxMapAttrs {
  center: [number, number]
  zoom: number
  markers: MapMarker[]
  style: string
  lens: MapboxMapLens
}

export const DEFAULT_MAP_CENTER: [number, number] = [-74.5, 40]
export const DEFAULT_MAP_ZOOM = 9
export const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12'
export const DEFAULT_MAP_LENS: MapboxMapLens = 'map2DView'

const parseFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const parseCoordinatePair = (value: unknown): [number, number] | null => {
  if (Array.isArray(value) && value.length === 2) {
    const lng = parseFiniteNumber(value[0])
    const lat = parseFiniteNumber(value[1])
    if (lng !== null && lat !== null) {
      return [lng, lat]
    }
    return null
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      const coords = parseCoordinatePair(parsed)
      if (coords) {
        return coords
      }
    } catch {
      const parts = value.split(',').map((part) => part.trim())
      if (parts.length === 2) {
        const lng = parseFiniteNumber(parts[0])
        const lat = parseFiniteNumber(parts[1])
        if (lng !== null && lat !== null) {
          return [lng, lat]
        }
      }
    }
  }

  return null
}

const sanitizeMarker = (value: unknown): MapMarker | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const marker = value as Record<string, unknown>
  const lng = parseFiniteNumber(marker.lng)
  const lat = parseFiniteNumber(marker.lat)
  if (lng === null || lat === null) {
    return null
  }

  const label = typeof marker.label === 'string' && marker.label.trim() ? marker.label : undefined

  return {
    lng,
    lat,
    label,
  }
}

const isFiniteCoordinatePair = (value: unknown): value is [number, number] => {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  )
}

const isValidMarkerArray = (value: unknown): value is MapMarker[] => {
  return (
    Array.isArray(value) &&
    value.every(
      (marker) =>
        !!marker &&
        typeof marker === 'object' &&
        typeof (marker as MapMarker).lng === 'number' &&
        Number.isFinite((marker as MapMarker).lng) &&
        typeof (marker as MapMarker).lat === 'number' &&
        Number.isFinite((marker as MapMarker).lat) &&
        (typeof (marker as MapMarker).label === 'undefined' ||
          typeof (marker as MapMarker).label === 'string'),
    )
  )
}

export const sanitizeMapboxMapAttrs = (value: unknown): MapboxMapAttrs => {
  const attrs = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const center = parseCoordinatePair(attrs.center) || DEFAULT_MAP_CENTER
  const zoom = parseFiniteNumber(attrs.zoom) ?? DEFAULT_MAP_ZOOM
  const markers = Array.isArray(attrs.markers) ? attrs.markers.map(sanitizeMarker).filter((marker): marker is MapMarker => !!marker) : []
  const style = typeof attrs.style === 'string' && attrs.style.trim() ? attrs.style.trim() : DEFAULT_MAP_STYLE
  const lens = attrs.lens === 'globeView' || attrs.lens === 'map2DView' ? attrs.lens : DEFAULT_MAP_LENS

  return {
    center,
    zoom,
    markers,
    style,
    lens,
  }
}

export const needsMapboxMapAttrRepair = (value: unknown): boolean => {
  const attrs = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  if (!isFiniteCoordinatePair(attrs.center)) {
    return true
  }

  if (typeof attrs.zoom !== 'number' || !Number.isFinite(attrs.zoom)) {
    return true
  }

  if (!isValidMarkerArray(attrs.markers || [])) {
    return true
  }

  if (typeof attrs.style !== 'string' || attrs.style.trim() !== attrs.style || !attrs.style.trim()) {
    return true
  }

  if (attrs.lens !== 'globeView' && attrs.lens !== 'map2DView') {
    return true
  }

  return false
}
