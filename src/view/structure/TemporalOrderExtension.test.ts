import { expect, test } from 'vitest';
import { JSDOM } from 'jsdom';

import {
  buildTemporalOrderClickTimePointAttrs,
  buildTemporalOrderCenturyTopBandPlacements,
  buildTemporalOrderCenturyViewPlacements,
  buildTemporalOrderMonthTicks,
  buildTemporalOrderYearIncrements,
  extractTemporalOrderLocationsFromJSONContent,
  getCenturyViewDateOffsetPx,
  retimeTemporalOrderNodeJson,
  resolveCenturyViewClickSelection,
  resolveTemporalOrderCenturyViewColumnCount,
  sanitizeClipboardHtmlContainer,
} from './TemporalOrderExtension';

test('sanitizeClipboardHtmlContainer removes style tags and unwraps node overlays', () => {
  const dom = new JSDOM('<div></div>');
  const container = dom.window.document.createElement('div');
  container.innerHTML = `
    <div data-node-overlay="true">
      <select><option>Show all</option></select>
      <button>Open</button>
      <style>.scrollview::-webkit-scrollbar { display: none; }</style>
      <div data-temporal-space="true"><p>Explore China</p></div>
    </div>
    <div class="node-overlay-grip-handle">grip</div>
  `;

  sanitizeClipboardHtmlContainer(container);

  expect(container.querySelector('style')).toBeNull();
  expect(container.querySelector('.node-overlay-grip-handle')).toBeNull();
  expect(container.querySelector('[data-node-overlay="true"]')).toBeNull();
  expect(container.querySelector('select')).toBeNull();
  expect(container.querySelector('button')).toBeNull();

  const temporalSpace = container.querySelector('[data-temporal-space="true"]');
  expect(temporalSpace).not.toBeNull();
  expect(temporalSpace?.textContent).toContain('Explore China');
});

test('buildTemporalOrderYearIncrements creates a present-to-2100 ladder', () => {
  const increments = buildTemporalOrderYearIncrements(2026, 2100);
  const nextYearGap = (increments[0]?.topPx ?? 0) - (increments[1]?.topPx ?? 0);
  const yearFiveGap = (increments[5]?.topPx ?? 0) - (increments[6]?.topPx ?? 0);
  const yearTenGap = (increments[10]?.topPx ?? 0) - (increments[11]?.topPx ?? 0);
  const distantGap = (increments[30]?.topPx ?? 0) - (increments[31]?.topPx ?? 0);

  expect(increments[0]?.year).toBe(2026);
  expect(increments[0]?.isPresent).toBe(true);
  expect(increments[0]?.positionRatio).toBe(1);
  expect(increments[0]?.blurPx).toBe(0);
  expect(increments[1]?.showLabel).toBe(true);
  expect(increments[9]?.showLabel).toBe(true);
  expect(increments[11]?.showLabel).toBe(false);

  expect(increments[increments.length - 1]?.year).toBe(2100);
  expect(increments[increments.length - 1]?.positionRatio).toBe(0);
  expect(increments[increments.length - 1]?.opacity).toBeLessThan(increments[0]?.opacity ?? 1);
  expect(increments[increments.length - 1]?.blurPx).toBeGreaterThan(increments[0]?.blurPx ?? 0);
  expect(nextYearGap).toBeGreaterThan(yearFiveGap);
  expect(yearFiveGap).toBeGreaterThan(yearTenGap);
  expect(yearTenGap).toBeGreaterThan(distantGap);
});

test('buildTemporalOrderYearIncrements collapses to the start year when already past 2100', () => {
  const increments = buildTemporalOrderYearIncrements(2125, 2100);

  expect(increments).toHaveLength(1);
  expect(increments[0]).toMatchObject({
    year: 2125,
    isPresent: true,
    positionRatio: 0.5,
  });
});

test('buildTemporalOrderMonthTicks creates 12 monthly subdivisions per year interval', () => {
  const increments = buildTemporalOrderYearIncrements(2026, 2028);
  const monthTicks = buildTemporalOrderMonthTicks(increments);

  expect(monthTicks).toHaveLength(24);
  expect(monthTicks[0]?.topPx).toBeLessThan(increments[0]?.topPx ?? Infinity);
  expect(monthTicks[11]?.topPx).toBeCloseTo(increments[1]?.topPx ?? 0, 5);
});

test('buildTemporalOrderCenturyViewPlacements keeps future cards at or above their anchors', () => {
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 820, childHeight: 260, scale: 0.7, yearKey: '2026', slotKey: '2026-10', specificity: 'date' },
      { index: 1, targetAnchorPx: 760, childHeight: 180, scale: 0.7, yearKey: '2026', slotKey: '2026-08', specificity: 'date' },
      { index: 2, targetAnchorPx: 700, childHeight: 160, scale: 0.7, yearKey: '2027', slotKey: '2027-02', specificity: 'date' },
    ],
    1,
    320,
    320
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(0)?.bottomPx).toBeLessThanOrEqual(820);
  expect(placementByIndex.get(1)?.bottomPx).toBeLessThanOrEqual(760);
  expect(placementByIndex.get(2)?.bottomPx).toBeLessThanOrEqual(700);
  expect(placementByIndex.get(1)?.bottomPx ?? Infinity).toBeLessThanOrEqual((placementByIndex.get(0)?.visibleTopPx ?? 0) - 10);
  expect(placementByIndex.get(2)?.bottomPx ?? Infinity).toBeLessThanOrEqual((placementByIndex.get(1)?.visibleTopPx ?? 0) - 10);
  expect(placementByIndex.get(1)?.bottomPx ?? 0).toBeGreaterThan(placementByIndex.get(0)?.topPx ?? Infinity);
});

test('buildTemporalOrderCenturyViewPlacements uses free columns before pushing cards upward', () => {
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 760, childHeight: 210, scale: 0.7, yearKey: '2026', slotKey: '2026-10', specificity: 'date' },
      { index: 1, targetAnchorPx: 720, childHeight: 170, scale: 0.7, yearKey: '2026', slotKey: '2026-08', specificity: 'date' },
    ],
    2,
    280,
    560
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(0)?.laneIndex).toBe(0);
  expect(placementByIndex.get(1)?.laneIndex).toBe(1);
  expect(placementByIndex.get(0)?.bottomPx).toBe(760);
  expect(placementByIndex.get(1)?.bottomPx).toBe(720);
});

test('buildTemporalOrderCenturyViewPlacements keeps more specific cards to the left of less specific ones', () => {
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 760, childHeight: 210, scale: 0.7, yearKey: '2026', slotKey: '2026-09', specificity: 'date' },
      { index: 1, targetAnchorPx: 760, childHeight: 170, scale: 0.7, yearKey: '2026', slotKey: '2026-09', specificity: 'month' },
    ],
    2,
    280,
    560
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(0)?.laneIndex).toBe(0);
  expect(placementByIndex.get(1)?.laneIndex).toBe(1);
  expect((placementByIndex.get(0)?.leftPx ?? Infinity)).toBeLessThan(placementByIndex.get(1)?.leftPx ?? -Infinity);
});

test('buildTemporalOrderCenturyViewPlacements pushes month cards right of crowded date cards in the same band', () => {
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 780, childHeight: 260, scale: 0.7, yearKey: '2026', slotKey: '2026-09', specificity: 'date' },
      { index: 1, targetAnchorPx: 760, childHeight: 180, scale: 0.7, yearKey: '2026', slotKey: '2026-09', specificity: 'date' },
      { index: 2, targetAnchorPx: 750, childHeight: 140, scale: 0.7, yearKey: '2026', slotKey: '2026-09', specificity: 'month' },
    ],
    3,
    240,
    720
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(2)?.laneIndex).toBeGreaterThanOrEqual(placementByIndex.get(0)?.laneIndex ?? 0);
  expect(placementByIndex.get(2)?.laneIndex).toBeGreaterThanOrEqual(placementByIndex.get(1)?.laneIndex ?? 0);
});

test('buildTemporalOrderCenturyViewPlacements lets month cards use the left lanes when no more specific cards exist', () => {
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 760, childHeight: 170, scale: 0.7, yearKey: '2026', slotKey: '2026-09', specificity: 'month' },
      { index: 1, targetAnchorPx: 720, childHeight: 160, scale: 0.7, yearKey: '2026', slotKey: '2026-11', specificity: 'month' },
    ],
    2,
    280,
    560
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(0)?.laneIndex).toBe(0);
  expect(placementByIndex.get(1)?.laneIndex).toBe(1);
});

test('buildTemporalOrderCenturyViewPlacements keeps someday cards stacked in the rightmost lane', () => {
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 760, childHeight: 170, scale: 0.76, yearKey: '2026', slotKey: '2026-09', specificity: 'date' },
      { index: 1, targetAnchorPx: 720, childHeight: 160, scale: 0.76, yearKey: '2026', slotKey: '2026-10', specificity: 'month' },
      { index: 2, targetAnchorPx: 700, childHeight: 160, scale: 0.76, yearKey: '2026', slotKey: '2026-11', specificity: 'someday' },
      { index: 3, targetAnchorPx: 680, childHeight: 150, scale: 0.76, yearKey: '2026', slotKey: '2026-11', specificity: 'someday' },
    ],
    4,
    280,
    1120
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(0)?.laneIndex).toBe(0);
  expect(placementByIndex.get(1)?.laneIndex).toBe(2);
  expect(placementByIndex.get(2)?.laneIndex).toBe(3);
  expect(placementByIndex.get(3)?.laneIndex).toBe(3);
  expect((placementByIndex.get(3)?.bottomPx ?? Infinity)).toBeLessThanOrEqual((placementByIndex.get(2)?.visibleTopPx ?? 0) - 10);
});

test('buildTemporalOrderCenturyViewPlacements keeps someday-only cards in the rightmost lane', () => {
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 760, childHeight: 170, scale: 0.76, yearKey: '2026', slotKey: '2026-09', specificity: 'someday' },
      { index: 1, targetAnchorPx: 720, childHeight: 160, scale: 0.76, yearKey: '2026', slotKey: '2026-10', specificity: 'someday' },
    ],
    4,
    280,
    1120
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(0)?.laneIndex).toBe(3);
  expect(placementByIndex.get(1)?.laneIndex).toBe(3);
  expect((placementByIndex.get(0)?.leftPx ?? 0)).toBeGreaterThan(700);
});

test('buildTemporalOrderCenturyTopBandPlacements anchors atemporal cards at the top band', () => {
  const { placements, bandHeight } = buildTemporalOrderCenturyTopBandPlacements(
    [
      { index: 0, childHeight: 160, scale: 0.76 },
      { index: 1, childHeight: 180, scale: 0.76 },
      { index: 2, childHeight: 140, scale: 0.76 },
    ],
    960,
    3,
    300
  );

  expect(placements).toHaveLength(3);
  expect(placements.every((placement) => placement.topPx >= 18)).toBe(true);
  expect(new Set(placements.map((placement) => placement.laneIndex)).size).toBe(3);
  expect(placements[2]?.leftPx ?? 0).toBeGreaterThan(placements[1]?.leftPx ?? 0);
  expect(bandHeight).toBeGreaterThan(0);
});

test('buildTemporalOrderCenturyViewPlacements packs lane width from scaled card width', () => {
  const cardWidth = 300;
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 760, childHeight: 210, scale: 0.76, yearKey: '2026', slotKey: '2026-10', specificity: 'date' },
      { index: 1, targetAnchorPx: 720, childHeight: 170, scale: 0.76, yearKey: '2026', slotKey: '2026-08', specificity: 'date' },
    ],
    2,
    cardWidth,
    900
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));
  const laneGap = (placementByIndex.get(1)?.leftPx ?? 0) - (placementByIndex.get(0)?.leftPx ?? 0);

  expect(laneGap).toBeCloseTo(cardWidth * 0.76 + 12, 3);
  expect(laneGap).toBeLessThan(cardWidth);
});

test('resolveTemporalOrderCenturyViewColumnCount adds columns when a year band is overcrowded', () => {
  const columnCount = resolveTemporalOrderCenturyViewColumnCount(
    [
      { yearKey: '2026', slotKey: '2026-03', childHeight: 220, scale: 1, specificity: 'date', bandTopPx: 120, bandBottomPx: 520 },
      { yearKey: '2026', slotKey: '2026-03', childHeight: 210, scale: 1, specificity: 'date', bandTopPx: 120, bandBottomPx: 520 },
      { yearKey: '2026', slotKey: '2026-04', childHeight: 200, scale: 1, specificity: 'date', bandTopPx: 120, bandBottomPx: 520 },
    ],
    760
  );

  expect(columnCount).toBeGreaterThan(1);
});

test('resolveTemporalOrderCenturyViewColumnCount preserves a dedicated someday pane when width allows', () => {
  const columnCount = resolveTemporalOrderCenturyViewColumnCount(
    [
      {
        yearKey: '2030',
        slotKey: '2030-01',
        childHeight: 180,
        scale: 0.76,
        specificity: 'someday',
        bandTopPx: 120,
        bandBottomPx: 760,
      },
    ],
    760
  );

  expect(columnCount).toBe(4);
});

test('resolveTemporalOrderCenturyViewColumnCount does not spread cards wider than needed', () => {
  const columnCount = resolveTemporalOrderCenturyViewColumnCount(
    [
      { yearKey: '2026', slotKey: '2026-02', childHeight: 180, scale: 1, specificity: 'date', bandTopPx: 120, bandBottomPx: 760 },
      { yearKey: '2026', slotKey: '2026-03', childHeight: 220, scale: 1, specificity: 'date', bandTopPx: 120, bandBottomPx: 760 },
      { yearKey: '2026', slotKey: '2026-04', childHeight: 200, scale: 1, specificity: 'date', bandTopPx: 120, bandBottomPx: 760 },
      { yearKey: '2026', slotKey: '2026-05', childHeight: 210, scale: 1, specificity: 'date', bandTopPx: 120, bandBottomPx: 760 },
    ],
    1800
  );

  expect(columnCount).toBe(2);
});

test('resolveCenturyViewClickSelection uses month precision in the month hover region', () => {
  const increments = buildTemporalOrderYearIncrements(2026, 2028);
  const monthTicks = buildTemporalOrderMonthTicks(increments);
  const yearTopLookup = new Map(increments.map((increment) => [increment.year, increment.topPx]));
  const novemberOffsetPx = getCenturyViewDateOffsetPx(new Date(2026, 10, 15), yearTopLookup, 0);

  const selection = resolveCenturyViewClickSelection(
    novemberOffsetPx,
    0.65,
    increments,
    monthTicks
  );

  expect(selection.precision).toBe('month');
  expect(selection.date.getFullYear()).toBe(2026);
  expect(selection.date.getMonth()).toBe(10);
  expect(selection.date.getDate()).toBe(1);
});

test('resolveCenturyViewClickSelection uses someday precision in the rightmost hover region', () => {
  const increments = buildTemporalOrderYearIncrements(2026, 2028);
  const monthTicks = buildTemporalOrderMonthTicks(increments);
  const yearTopLookup = new Map(increments.map((increment) => [increment.year, increment.topPx]));
  const novemberOffsetPx = getCenturyViewDateOffsetPx(new Date(2026, 10, 15), yearTopLookup, 0);

  const selection = resolveCenturyViewClickSelection(
    novemberOffsetPx,
    0.9,
    increments,
    monthTicks
  );

  expect(selection.precision).toBe('someday');
  expect(selection.hoverMode).toBe('someday');
});

test('resolveCenturyViewClickSelection uses week precision in the week hover region', () => {
  const increments = buildTemporalOrderYearIncrements(2026, 2028);
  const monthTicks = buildTemporalOrderMonthTicks(increments);
  const yearTopLookup = new Map(increments.map((increment) => [increment.year, increment.topPx]));
  const novemberOffsetPx = getCenturyViewDateOffsetPx(new Date(2026, 10, 15), yearTopLookup, 0);

  const selection = resolveCenturyViewClickSelection(
    novemberOffsetPx,
    0.35,
    increments,
    monthTicks
  );

  expect(selection.precision).toBe('week');
  expect(selection.hoverMode).toBe('week');
});

test('buildTemporalOrderClickTimePointAttrs creates week timepoints for week precision', () => {
  const attrs = buildTemporalOrderClickTimePointAttrs(new Date(2026, 4, 18), 'week');

  expect(attrs.id).toBe('timepoint:week-2026-5-18');
  expect(attrs.label).toBe('📅 Week of 18 May 2026');
  expect(attrs['data-formatted']).toBe('Week of 18 May 2026');
});

test('resolveCenturyViewClickSelection keeps day precision in the day hover region', () => {
  const increments = buildTemporalOrderYearIncrements(2026, 2028);
  const monthTicks = buildTemporalOrderMonthTicks(increments);
  const yearTopLookup = new Map(increments.map((increment) => [increment.year, increment.topPx]));
  const novemberOffsetPx = getCenturyViewDateOffsetPx(new Date(2026, 10, 15), yearTopLookup, 0);

  const selection = resolveCenturyViewClickSelection(
    novemberOffsetPx,
    0.1,
    increments,
    monthTicks
  );

  expect(selection.precision).toBe('date');
  expect(selection.date.getFullYear()).toBe(2026);
  expect(selection.date.getMonth()).toBe(10);
  expect(selection.date.getDate()).toBeGreaterThan(1);
});

test('retimeTemporalOrderNodeJson converts someday mentions into concrete month timepoints', () => {
  const updated = retimeTemporalOrderNodeJson(
    {
      type: 'temporalSpace',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'timepoint',
              attrs: {
                id: 'timepoint:someday',
                label: '⏳ Some day',
                'data-date': '',
                'data-formatted': 'Some day',
                'data-relative-label': 'Some day',
              },
            },
            { type: 'text', text: ' Build the thing' },
          ],
        },
      ],
    },
    {
      id: 'timepoint:month-2026-11',
      label: '📅 November 2026',
      'data-date': '2026-11-01T00:00:00.000Z',
      'data-formatted': 'November 2026',
      'data-relative-label': 'November 2026',
    }
  );

  const timepointAttrs = updated?.content?.[0]?.content?.[0]?.attrs as Record<string, string> | undefined;

  expect(timepointAttrs?.id).toBe('timepoint:month-2026-11');
  expect(timepointAttrs?.label).toBe('📅 November 2026');
  expect(timepointAttrs?.['data-date']).toBe('2026-11-01T00:00:00.000Z');
});

test('retimeTemporalOrderNodeJson retimes existing dated mentions to a new concrete date', () => {
  const updated = retimeTemporalOrderNodeJson(
    {
      type: 'temporalSpace',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'timepoint',
              attrs: {
                id: 'timepoint:date-2026-5-25',
                label: '📅 25 May 2026',
                'data-date': '2026-05-25T00:00:00.000Z',
                'data-formatted': '25 May 2026',
                'data-relative-label': '25 May 2026',
              },
            },
            { type: 'text', text: ' Natural UI open source' },
          ],
        },
      ],
    },
    {
      id: 'timepoint:month-2026-8',
      label: '📅 August 2026',
      'data-date': '2026-08-01T00:00:00.000Z',
      'data-formatted': 'August 2026',
      'data-relative-label': 'August 2026',
    }
  );

  const timepointAttrs = updated?.content?.[0]?.content?.[0]?.attrs as Record<string, string> | undefined;

  expect(timepointAttrs?.id).toBe('timepoint:month-2026-8');
  expect(timepointAttrs?.label).toBe('📅 August 2026');
  expect(timepointAttrs?.['data-date']).toBe('2026-08-01T00:00:00.000Z');
});

test('extractTemporalOrderLocationsFromJSONContent reads inline location mentions and manual map markers', () => {
  const locations = extractTemporalOrderLocationsFromJSONContent({
    type: 'temporalSpace',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'location',
            attrs: {
              id: 'sydney',
              label: '📍 Sydney',
              'data-name': 'Sydney',
              'data-country': 'Australia',
              'data-coords': JSON.stringify([151.2093, -33.8688]),
            },
          },
        ],
      },
      {
        type: 'mapboxMap',
        attrs: {
          markers: [
            { lng: -122.4194, lat: 37.7749, label: 'San Francisco' },
            { lng: -122.4194, lat: 37.7749, label: 'San Francisco' },
          ],
        },
      },
    ],
  });

  expect(locations).toEqual([
    {
      id: 'sydney',
      name: 'Sydney',
      label: 'Sydney',
      country: 'Australia',
      coords: [151.2093, -33.8688],
    },
    {
      name: 'San Francisco',
      label: 'San Francisco',
      coords: [-122.4194, 37.7749],
    },
  ]);
});

test('extractTemporalOrderLocationsFromJSONContent keeps unresolved custom locations for later geocoding', () => {
  const locations = extractTemporalOrderLocationsFromJSONContent({
    type: 'temporalSpace',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'location',
            attrs: {
              label: '📍 Cusco',
              'data-name': 'Cusco',
            },
          },
        ],
      },
    ],
  });

  expect(locations).toEqual([
    {
      name: 'Cusco',
      label: 'Cusco',
      country: undefined,
      coords: null,
    },
  ]);
});

test('extractTemporalOrderLocationsFromJSONContent reads legacy block location nodes from nested text', () => {
  const locations = extractTemporalOrderLocationsFromJSONContent({
    type: 'temporalSpace',
    content: [
      {
        type: 'location',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Alexandria, Egypt' },
            ],
          },
        ],
      },
    ],
  });

  expect(locations).toEqual([
    {
      name: 'Alexandria, Egypt',
      label: 'Alexandria, Egypt',
      country: undefined,
      coords: null,
    },
  ]);
});
