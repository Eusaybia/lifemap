import { afterEach, describe, expect, it, vi } from 'vitest'
import { deferNodeViewAttributeUpdate } from './deferNodeViewAttributeUpdate'

describe('deferNodeViewAttributeUpdate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('defers the callback until a later task', () => {
    vi.useFakeTimers()

    const callback = vi.fn()
    deferNodeViewAttributeUpdate(callback)

    expect(callback).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancels the callback when cleaned up before it runs', () => {
    vi.useFakeTimers()

    const callback = vi.fn()
    const cancel = deferNodeViewAttributeUpdate(callback)

    cancel()
    vi.runAllTimers()

    expect(callback).not.toHaveBeenCalled()
  })
})
