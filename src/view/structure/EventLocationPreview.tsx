'use client'
import React from 'react'
import { MAPBOX_ACCESS_TOKEN } from '../content/MapboxMapShared'

const coordinates = new Map<string, Promise<[number, number] | null>>()
function locate(name: string) {
  let pending = coordinates.get(name)
  if (!pending) {
    pending = fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(name)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`)
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        const center = result?.features?.[0]?.center
        return Array.isArray(center) && center.length === 2 && center.every(Number.isFinite) ? [center[0], center[1]] as [number, number] : null
      }).catch(() => null)
    coordinates.set(name, pending)
  }
  return pending
}

export function EventLocationPreview({ location }: { location: { name: string; coords: [number, number] | null } }) {
  const [center, setCenter] = React.useState(location.coords)
  React.useEffect(() => {
    let active = true
    setCenter(location.coords)
    if (!location.coords && MAPBOX_ACCESS_TOKEN) void locate(location.name).then(value => { if (active) setCenter(value) })
    return () => { active = false }
  }, [location.name, location.coords])
  const url = center && MAPBOX_ACCESS_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+e11d48(${center.join(',')})/${center.join(',')},13/320x180?access_token=${MAPBOX_ACCESS_TOKEN}` : null
  return <div style={{ marginTop: 3, flex: 1, minHeight: 0, overflow: 'hidden' }}>
    {url && <img src={url} alt={`Map showing ${location.name}`} loading="lazy" draggable={false}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, display: 'block', pointerEvents: 'none' }} />}
  </div>
}
