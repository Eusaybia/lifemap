import { httpsCallable } from 'firebase/functions'
import { functions } from './Firebase'

/**
 * The Tiptap Cloud JWT that QuantaStore hands to its collaboration provider.
 * The Firebase callable that mints it is the slowest step between the editor
 * mounting and the note appearing, so the token is fetched once per page
 * (started as soon as this module loads, ahead of the editor mounting) and
 * kept in localStorage until shortly before it expires. Only the callable's
 * token is cached: the /api/getCollabToken fallback is scoped to one room.
 */
const STORAGE_KEY = 'kairos.collab.jwt'
const EXPIRY_MARGIN_MS = 5 * 60_000

let inflight: Promise<string | null> | null = null

const expiresAt = (token: string): number => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

const readCached = (): string | null => {
  try {
    const token = window.localStorage.getItem(STORAGE_KEY)
    return token && expiresAt(token) > Date.now() + EXPIRY_MARGIN_MS ? token : null
  } catch {
    return null
  }
}

const fetchFromCallable = async (): Promise<string> => {
  const generateAuthenticationToken = httpsCallable(functions, 'generateAuthenticationToken')
  const result = await generateAuthenticationToken()
  const token = (result.data as { token?: string } | undefined)?.token
  if (!token) throw new Error('Cloud Function returned no token')
  try {
    window.localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Storage may be unavailable; the token still serves this page.
  }
  return token
}

const fetchFallback = async (roomName: string): Promise<string> => {
  const response = await fetch(`/api/getCollabToken?documentName=${encodeURIComponent(roomName)}`)
  if (!response.ok) throw new Error(`Fallback token request failed with status ${response.status}`)
  const payload = (await response.json()) as { token?: string }
  if (!payload.token) throw new Error('Fallback token response missing token')
  return payload.token
}

/** Resolves to a token, or null when neither source could produce one. */
export const getCollabToken = (roomName: string): Promise<string | null> => {
  const cached = readCached()
  if (cached) return Promise.resolve(cached)
  inflight ??= (async () => {
    try {
      return await fetchFromCallable()
    } catch (firebaseError) {
      console.warn('[collabToken] Firebase callable token fetch failed, falling back to /api/getCollabToken', firebaseError)
    }
    try {
      return await fetchFallback(roomName)
    } catch (fallbackError) {
      console.warn('[collabToken] Failed to generate JWT token via Firebase and fallback API. Running without cloud sync.', fallbackError)
      return null
    }
  })().finally(() => {
    inflight = null
  })
  return inflight
}

// Start minting before any editor mounts; the room only matters to the fallback.
if (typeof window !== 'undefined' && !readCached()) {
  void getCollabToken('')
}
