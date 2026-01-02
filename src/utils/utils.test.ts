import { expect, test } from 'vitest'
import { isActualUrl } from './utils'

test('that urls and non-urls are correctly identified', () => {

    expect(isActualUrl("www.google.com")).toBe(true)
    expect(isActualUrl("apple")).toBe(false)

})