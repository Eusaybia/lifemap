// ============================================================================
// Voice-note storage layer
//
// Architecture: the collaborative document (Yjs) only ever carries a small
// *reference* to a recording — never the audio bytes. This module owns the two
// out-of-band lanes that move the bytes:
//
//   • Local cache  → IndexedDB, keyed by audioId. Works offline and inside the
//                    file:// iOS WebView (same store family y-indexeddb uses).
//   • Cloud        → POST to /api/upload (Vercel Blob), returns a public URL
//                    that gets written back into the node as `remoteUrl`.
//
// Playback resolves local cache → remoteUrl, so a recording plays instantly on
// the device that made it and is fetched on demand by peers that sync only the
// pointer through Yjs.
// ============================================================================

const DB_NAME = 'kairos-voice-notes'
const DB_VERSION = 1
const STORE = 'audio'

// Highest-quality capture we can negotiate in the browser. AAC (audio/mp4) is
// preferred because it plays natively in <audio> on Safari/WKWebView; Opus is
// the fallback for Chromium where mp4 recording is unavailable.
export const AUDIO_BITS_PER_SECOND = 256000

const MIME_CANDIDATES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
]

export function pickAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const candidate of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate
    } catch {
      // isTypeSupported can throw on some engines; keep probing.
    }
  }
  return ''
}

function extensionForMime(mime: string): string {
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('webm')) return 'webm'
  return 'audio'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function storeLocalAudio(audioId: string, blob: Blob): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, audioId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function getLocalAudioBlob(audioId: string): Promise<Blob | null> {
  const db = await openDB()
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(audioId)
      request.onsuccess = () => resolve((request.result as Blob) ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

// Upload the *original* recording so the cloud copy is full quality. Returns
// the public URL on success; throws when offline or unconfigured (callers treat
// this as "remoteUrl stays null", relying on the local cache until next sync).
export async function uploadAudio(audioId: string, blob: Blob): Promise<string> {
  const filename = `${audioId}.${extensionForMime(blob.type)}`
  const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    body: blob,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.error || `Upload failed (${response.status})`)
  }
  const result = await response.json()
  return result.url
}
