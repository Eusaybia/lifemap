import { expect, test } from 'vitest'

import { mergeLocationEntities } from './TransformersLocationSpans'

test('mergeLocationEntities merges Chinese location tokens without spaces', () => {
  expect(
    mergeLocationEntities([
      { entity: 'B-LOC', score: 0.99, index: 1, word: '上' },
      { entity: 'I-LOC', score: 0.98, index: 2, word: '海' },
    ]),
  ).toEqual([
    {
      text: '上海',
      score: 0.985,
      tokens: [
        { entity: 'B-LOC', score: 0.99, index: 1, word: '上' },
        { entity: 'I-LOC', score: 0.98, index: 2, word: '海' },
      ],
    },
  ])
})

test('mergeLocationEntities merges wordpiece English locations into one span', () => {
  expect(
    mergeLocationEntities([
      { entity: 'B-LOC', score: 0.91, index: 5, word: 'Shang' },
      { entity: 'I-LOC', score: 0.93, index: 6, word: '##hai' },
      { entity: 'I-LOC', score: 0.89, index: 7, word: 'Airport' },
    ]),
  ).toEqual([
    {
      text: 'Shanghai Airport',
      score: 0.91,
      tokens: [
        { entity: 'B-LOC', score: 0.91, index: 5, word: 'Shang' },
        { entity: 'I-LOC', score: 0.93, index: 6, word: '##hai' },
        { entity: 'I-LOC', score: 0.89, index: 7, word: 'Airport' },
      ],
    },
  ])
})
