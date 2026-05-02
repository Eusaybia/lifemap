import { describe, expect, test } from 'vitest'

import {
  buildTemporalAnalysisRanges,
  linearizeTextBlockWithLocations,
  looksLikeTemporalRelationText,
  normalizeLocationName,
} from './TemporalRelationAutotaggingExtension'

describe('TemporalRelationAutotaggingExtension helpers', () => {
  test('sends any non-trivial paragraph text to the temporal relation LLM', () => {
    expect(looksLikeTemporalRelationText('Sydney to Shanghai')).toBe(true)
    expect(looksLikeTemporalRelationText('Then to Bankstown')).toBe(true)
    expect(looksLikeTemporalRelationText('Visit mum and book tickets')).toBe(true)
    expect(looksLikeTemporalRelationText('Sydney')).toBe(false)
  })

  test('builds sentence-level ranges plus a paragraph-level range', () => {
    expect(
      buildTemporalAnalysisRanges('Sydney to Shanghai. Then to Paris.')
    ).toEqual([
      {
        text: 'Sydney to Shanghai.',
        startIndex: 0,
        endIndex: 19,
        level: 'sentence',
      },
      {
        text: 'Then to Paris.',
        startIndex: 20,
        endIndex: 34,
        level: 'sentence',
      },
      {
        text: 'Sydney to Shanghai. Then to Paris.',
        startIndex: 0,
        endIndex: 34,
        level: 'paragraph',
      },
    ])
  })

  test('does not duplicate paragraph analysis for a single sentence paragraph', () => {
    expect(
      buildTemporalAnalysisRanges('Sydney to Shanghai.')
    ).toEqual([
      {
        text: 'Sydney to Shanghai.',
        startIndex: 0,
        endIndex: 19,
        level: 'sentence',
      },
    ])
  })

  test('normalizes rendered location labels back to plain location names', () => {
    expect(normalizeLocationName('📍 Shanghai Hongqiao')).toBe('Shanghai Hongqiao')
    expect(normalizeLocationName('  Sydney   Airport  ')).toBe('Sydney Airport')
  })

  test('linearizes a text block at paragraph level while preserving existing location nodes', () => {
    const doc = {
      nodesBetween(_from: number, _to: number, visitor: (node: any, pos: number) => boolean | void) {
        visitor({ isText: true, text: 'Sydney to ' }, 1)
        visitor({
          isText: false,
          nodeSize: 1,
          type: { name: 'location' },
          attrs: {
            label: '📍 Shanghai',
            'data-name': 'Shanghai',
            locationId: 'loc-123',
          },
        }, 11)
        visitor({ isText: true, text: ' then to Bankstown' }, 12)
      },
    }

    const linearized = linearizeTextBlockWithLocations(doc, 0, 100)

    expect(linearized.text).toBe('Sydney to Shanghai then to Bankstown')
    expect(linearized.segments).toHaveLength(3)
    expect(linearized.segments[1]).toMatchObject({
      text: 'Shanghai',
      isLocationNode: true,
      locationConnectionId: 'loc-123',
    })
    expect(linearized.indexToPos[0]).toBe(1)
    expect(linearized.indexToPos[10]).toBe(11)
  })
})
