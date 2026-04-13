import { env, pipeline } from '@huggingface/transformers'

import type { TransformersLocationEntity } from './TransformersLocationSpans'

env.allowLocalModels = false

const MODEL_ID = 'Xenova/distilbert-base-multilingual-cased-ner-hrl'
const TASK = 'token-classification'

type DetectLocationsRequest = {
  type: 'detect-locations'
  requestId: number
  text: string
}

type WorkerProgressMessage = {
  type: 'progress'
  requestId: number
  payload: unknown
}

type WorkerReadyMessage = {
  type: 'ready'
  requestId: number
}

type WorkerResultMessage = {
  type: 'result'
  requestId: number
  entities: TransformersLocationEntity[]
}

type WorkerErrorMessage = {
  type: 'error'
  requestId: number
  message: string
}

type WorkerMessage =
  | WorkerProgressMessage
  | WorkerReadyMessage
  | WorkerResultMessage
  | WorkerErrorMessage

class LocationPipelineSingleton {
  static instance: Promise<any> | null = null

  static async getInstance(progressCallback?: (payload: unknown) => void) {
    if (this.instance === null) {
      this.instance = pipeline(TASK, MODEL_ID, {
        progress_callback: progressCallback,
      })
    }

    return this.instance
  }
}

self.addEventListener('message', async (event: MessageEvent<DetectLocationsRequest>) => {
  if (event.data?.type !== 'detect-locations') return

  try {
    const classifier = await LocationPipelineSingleton.getInstance((payload) => {
      const progressMessage: WorkerProgressMessage = {
        type: 'progress',
        requestId: event.data.requestId,
        payload,
      }
      self.postMessage(progressMessage satisfies WorkerMessage)
    })

    const readyMessage: WorkerReadyMessage = {
      type: 'ready',
      requestId: event.data.requestId,
    }
    self.postMessage(readyMessage satisfies WorkerMessage)

    const output = await classifier(event.data.text)

    const resultMessage: WorkerResultMessage = {
      type: 'result',
      requestId: event.data.requestId,
      entities: Array.isArray(output) ? output as TransformersLocationEntity[] : [],
    }
    self.postMessage(resultMessage satisfies WorkerMessage)
  } catch (error) {
    const errorMessage: WorkerErrorMessage = {
      type: 'error',
      requestId: event.data.requestId,
      message: error instanceof Error ? error.message : 'Unknown Transformers.js error',
    }
    self.postMessage(errorMessage satisfies WorkerMessage)
  }
})
