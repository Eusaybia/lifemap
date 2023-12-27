import { expect, test } from 'vitest'
import { isActualUrl, isWordEmotionRelated, similarityBetweenWordEmbeddings } from './utils'

test('that commonsense embeddings are valid', () => {

    // Words not relating to emotion are identified
    expect(similarityBetweenWordEmbeddings("black", "white")).toBe(0)
    expect(similarityBetweenWordEmbeddings("healed", "sealed")).toBe(0.8)
    expect(similarityBetweenWordEmbeddings("healed", "sealed")).toBe(0.8)
})

test('that emotion words are related to the word "emotions"', () => {
    expect(similarityBetweenWordEmbeddings("emotions", "fear")).greaterThan(0.4)
})

test('that words related to emotion are correctly identified', () => {

    // Words relating to emotion are identified
    expect(isWordEmotionRelated("excited")).toBe(true)
    expect(isWordEmotionRelated("wonderful")).toBe(true)
    expect(isWordEmotionRelated("amazing")).toBe(true)

    // Words not relating to emotion are identified
    expect(isWordEmotionRelated("the")).toBe(false)
    expect(isWordEmotionRelated("dog")).toBe(false)
    expect(isWordEmotionRelated("cat")).toBe(false)
})

test('that urls and non-urls are correctly identified', () => {

    expect(isActualUrl("www.google.com")).toBe(true)
    expect(isActualUrl("apple")).toBe(false)

})