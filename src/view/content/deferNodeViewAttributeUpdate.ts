export function deferNodeViewAttributeUpdate(callback: () => void): () => void {
  let cancelled = false

  const timeoutId = globalThis.setTimeout(() => {
    if (!cancelled) {
      callback()
    }
  }, 0)

  return () => {
    cancelled = true
    globalThis.clearTimeout(timeoutId)
  }
}
