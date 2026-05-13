import { describe, expect, test } from 'vitest'

import { parseTemporalEntities } from './TemporalEntityParser'

const referenceDate = new Date(2026, 4, 13, 9, 0, 0)

describe('TemporalEntityParser', () => {
  test('splits a combined time and date phrase into separate timepoint entities', () => {
    const text = '11 a.m., 15th of November, 2026'
    const entities = parseTemporalEntities(text, referenceDate)

    expect(entities).toHaveLength(2)
    expect(entities[0]).toMatchObject({
      kind: 'time',
      text: '11 a.m.',
      start: 0,
      end: 7,
      attrs: {
        id: 'timepoint:time-11-0',
        label: '🕐 11 AM',
      },
    })
    expect(entities[0].attrs['data-date']).toBe(new Date(2026, 10, 15, 11, 0, 0).toISOString())
    expect(entities[1]).toMatchObject({
      kind: 'date',
      text: '15th of November, 2026',
      attrs: {
        id: 'timepoint:date-2026-11-15',
        label: '📅 15 November 2026',
      },
    })
    expect(entities[1].attrs['data-date']).toBe(new Date(2026, 10, 15).toISOString())
    expect(entities[0].groupId).toBe(entities[1].groupId)
  })

  test('parses travel times and dates without consuming nearby locations', () => {
    const text = '上海虹桥机场 at 11.20am Sunday 21 June 2026 to Guangzhou Baiyun Airport'
    const entities = parseTemporalEntities(text, referenceDate)

    expect(entities.map((entity) => ({
      kind: entity.kind,
      text: entity.text,
      id: entity.attrs.id,
    }))).toEqual([
      {
        kind: 'time',
        text: '11.20am',
        id: 'timepoint:time-11-20',
      },
      {
        kind: 'date',
        text: 'Sunday 21 June 2026',
        id: 'timepoint:date-2026-6-21',
      },
    ])
    expect(entities[0].attrs['data-date']).toBe(new Date(2026, 5, 21, 11, 20, 0).toISOString())
  })

  test('rejects invalid times, flight labels, and generic direction words', () => {
    expect(parseTemporalEntities('20am Sunday 21 June 2026', referenceDate).map((entity) => entity.text)).toEqual([
      'Sunday 21 June 2026',
    ])
    expect(parseTemporalEntities('CZ326 China Southern Airlines', referenceDate)).toEqual([])
    expect(parseTemporalEntities('Then back to Bankstown station', referenceDate)).toEqual([])
  })

  test('anchors a standalone time to the reference date', () => {
    const [entity] = parseTemporalEntities('Depart at 14:30', referenceDate)

    expect(entity).toMatchObject({
      kind: 'time',
      text: '14:30',
      attrs: {
        id: 'timepoint:time-14-30',
        label: '🕐 2:30 PM',
      },
    })
    expect(entity.attrs['data-date']).toBe(new Date(2026, 4, 13, 14, 30, 0).toISOString())
  })
})

