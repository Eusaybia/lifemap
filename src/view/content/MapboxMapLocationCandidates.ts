export interface LocationNodeAttrs {
  id?: string
  label?: string
  locationId?: string
  'data-name'?: string
  'data-country'?: string
  'data-coords'?: string | [number, number] | null
}

export interface TemporalLocationCandidate {
  id?: string
  connectionId?: string
  name: string
  label: string
  country?: string
  coords: [number, number] | null
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

const getNodeTypeName = (node: unknown): string | null => {
  if (!node || typeof node !== 'object') return null

  const type = (node as { type?: unknown }).type
  if (typeof type === 'string') return type
  if (type && typeof type === 'object' && typeof (type as { name?: unknown }).name === 'string') {
    return (type as { name: string }).name
  }

  return null
}

const getNodeAttrs = (node: unknown): Record<string, unknown> => {
  if (!node || typeof node !== 'object') return {}
  const attrs = (node as { attrs?: unknown }).attrs
  return attrs && typeof attrs === 'object' ? (attrs as Record<string, unknown>) : {}
}

const forEachChildNode = (node: unknown, callback: (childNode: unknown) => void) => {
  if (!node || typeof node !== 'object') return

  const maybeProseMirrorNode = node as { forEach?: (callback: (childNode: unknown) => void) => void }
  if (typeof maybeProseMirrorNode.forEach === 'function') {
    maybeProseMirrorNode.forEach(callback)
    return
  }

  const content = (node as { content?: unknown }).content
  if (Array.isArray(content)) {
    content.forEach(callback)
  }
}

export const collectTemporalLocationCandidatesFromNode = (node: unknown): TemporalLocationCandidate[] => {
  const locations: TemporalLocationCandidate[] = []

  const visit = (childNode: unknown) => {
    if (getNodeTypeName(childNode) === 'location') {
      const locationAttrs = getNodeAttrs(childNode) as LocationNodeAttrs
      const name = locationAttrs['data-name'] || locationAttrs.label || ''
      if (name) {
        const label = locationAttrs.label?.replace(/^📍\s*/, '') || name
        locations.push({
          id: locationAttrs.id,
          connectionId: locationAttrs.locationId,
          name,
          label,
          country: locationAttrs['data-country'] || undefined,
          coords: parseCoords(locationAttrs['data-coords']),
        })
      }
    }

    forEachChildNode(childNode, visit)
  }

  visit(node)
  return locations
}
