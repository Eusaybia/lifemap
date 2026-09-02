import type mapboxgl from 'mapbox-gl'

/**
 * mapbox-gl is close to a megabyte of script that only a note with a map,
 * a location tag or a temporal-order view ever runs. Every map surface loads
 * it through here, on first use, so the editor bundle does not carry it.
 */
export type MapboxGl = typeof mapboxgl

/** The version lifemap pins; the CSS must match the script that renders. */
export const MAPBOX_GL_VERSION = '2.15.0'
export const MAPBOX_GL_CSS_URL = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`
const MAPBOX_GL_CSP_WORKER_URL = '/vendor/mapbox-gl-csp-worker-v2.15.0.js'

let loading: Promise<MapboxGl> | null = null

export const loadMapboxGl = (): Promise<MapboxGl> => {
  loading ??= import('mapbox-gl').then((module) => {
    const gl = ((module as { default?: MapboxGl }).default ?? module) as MapboxGl
    const version = String((gl as MapboxGl & { version?: string }).version || MAPBOX_GL_VERSION)
    const majorVersion = Number.parseInt(version.split('.')[0] || '0', 10)
    // v2 builds run their worker from a same-origin file under a strict CSP.
    if (Number.isFinite(majorVersion) && majorVersion > 0 && majorVersion < 3) {
      ;(gl as MapboxGl & { workerUrl: string }).workerUrl = MAPBOX_GL_CSP_WORKER_URL
    }
    return gl
  })
  return loading
}
