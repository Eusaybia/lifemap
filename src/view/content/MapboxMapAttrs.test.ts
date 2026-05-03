import { expect, test } from 'vitest'

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_LENS,
  DEFAULT_MAP_STYLE,
  DEFAULT_MAP_ZOOM,
  needsMapboxMapAttrRepair,
  sanitizeMapboxMapAttrs,
} from './MapboxMapAttrs'

test('sanitizeMapboxMapAttrs coerces pasted string values into valid map attrs', () => {
  expect(
    sanitizeMapboxMapAttrs({
      center: ['151.2093', '-33.8688'],
      zoom: '12.5',
      markers: [
        { lng: '-0.1276', lat: '51.5072', label: 'London', tagLabels: ['📍 London'] },
        { lng: 'bad', lat: 12, label: 'Broken marker' },
      ],
      style: '  mapbox://styles/mapbox/light-v11  ',
    }),
  ).toEqual({
    center: [151.2093, -33.8688],
    zoom: 12.5,
    markers: [{ lng: -0.1276, lat: 51.5072, label: 'London', tagLabels: ['📍 London'] }],
    style: 'mapbox://styles/mapbox/light-v11',
    lens: DEFAULT_MAP_LENS,
  })
})

test('sanitizeMapboxMapAttrs falls back when pasted attrs are unusable', () => {
  expect(
    sanitizeMapboxMapAttrs({
      center: { lng: 10, lat: 20 },
      zoom: 'not-a-number',
      markers: 'also-bad',
      style: '   ',
    }),
  ).toEqual({
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    markers: [],
    style: DEFAULT_MAP_STYLE,
    lens: DEFAULT_MAP_LENS,
  })
})

test('needsMapboxMapAttrRepair detects non-canonical pasted map attrs', () => {
  expect(
    needsMapboxMapAttrRepair({
      center: ['151.2093', '-33.8688'],
      zoom: '12',
      markers: [{ lng: '151.2093', lat: '-33.8688', label: 'Sydney' }],
      style: ' mapbox://styles/mapbox/streets-v12 ',
    }),
  ).toBe(true)

  expect(
    needsMapboxMapAttrRepair({
      center: [151.2093, -33.8688],
      zoom: 12,
      markers: [{ lng: 151.2093, lat: -33.8688, label: 'Sydney' }],
      style: 'mapbox://styles/mapbox/streets-v12',
      lens: DEFAULT_MAP_LENS,
    }),
  ).toBe(false)
})
