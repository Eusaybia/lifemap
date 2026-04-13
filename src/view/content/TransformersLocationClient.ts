import type { TransformersLocationEntity } from './TransformersLocationSpans'

declare global {
  interface Window {
    __LIFEMAP_MOCK_LOCATION_DETECTOR__?: (
      text: string,
    ) => TransformersLocationEntity[] | Promise<TransformersLocationEntity[]>
  }
}

type DetectLocationsResponse =
  | {
      type: 'progress'
      requestId: number
      payload: unknown
    }
  | {
      type: 'ready'
      requestId: number
    }
  | {
      type: 'result'
      requestId: number
      entities: TransformersLocationEntity[]
    }
  | {
      type: 'error'
      requestId: number
      message: string
    }

type PendingRequest = {
  resolve: (entities: TransformersLocationEntity[]) => void
  reject: (error: Error) => void
}

let workerSingleton: Worker | null = null
let nextRequestId = 1
const pendingRequests = new Map<number, PendingRequest>()

const getWorker = (): Worker | null => {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null
  }

  if (!workerSingleton) {
    workerSingleton = new Worker(new URL('./TransformersLocationWorker.ts', import.meta.url), {
      type: 'module',
    })

    workerSingleton.addEventListener('message', (event: MessageEvent<DetectLocationsResponse>) => {
      const message = event.data
      if (!message || message.type === 'progress' || message.type === 'ready') return

      const pending = pendingRequests.get(message.requestId)
      if (!pending) return

      if (message.type === 'result') {
        pending.resolve(message.entities)
      } else {
        pending.reject(new Error(message.message))
      }

      pendingRequests.delete(message.requestId)
    })
  }

  return workerSingleton
}

export const detectLocationsWithTransformers = (text: string): Promise<TransformersLocationEntity[]> => {
  if (typeof window !== 'undefined' && window.__LIFEMAP_MOCK_LOCATION_DETECTOR__) {
    return Promise.resolve(window.__LIFEMAP_MOCK_LOCATION_DETECTOR__(text))
  }

  const worker = getWorker()
  if (!worker) {
    return Promise.resolve([])
  }

  const requestId = nextRequestId
  nextRequestId += 1

  return new Promise<TransformersLocationEntity[]>((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject })
    worker.postMessage({
      type: 'detect-locations',
      requestId,
      text,
    })
  })
}
