import { expect, test } from 'vitest'
import { isActualUrl, isWordEmotionRelated, similarityBetweenWordEmbeddings } from './utils'

test('that commonsense embeddings are valid', () => {

    // Words not relating to emotion are identified
    expect(similarityBetweenWordEmbeddings("black", "white")).toBe(0)
    expect(similarityBetweenWordEmbeddings("healed", "sealed")).toBe(0.8)
    expect(similarityBetweenWordEmbeddings("healed", "sealed")).toBe(0.8)
})

test('that urls and non-urls are correctly identified', () => {

    expect(isActualUrl("www.google.com")).toBe(true)
    expect(isActualUrl("apple")).toBe(false)

})