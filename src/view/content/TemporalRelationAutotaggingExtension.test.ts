import { describe, expect, test } from 'vitest'

import {
  linearizeTextBlockWithLocations,
  looksLikeTemporalRelationText,
  normalizeLocationName,
} from './TemporalRelationAutotaggingExtension'

describe('TemporalRelationAutotaggingExtension helpers', () => {
  test('detects paragraph text that is worth sending to the temporal relation LLM', () => {
    expect(looksLikeTemporalRelationText('Sydney to Shanghai')).toBe(true)
    expect(looksLikeTemporalRelationText('Then to Bankstown')).toBe(true)
    expect(looksLikeTemporalRelationText('Visit mum and book tickets')).toBe(false)
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
