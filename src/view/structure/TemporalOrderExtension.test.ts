import { expect, test } from 'vitest';

import {
  buildTemporalOrderCenturyTopBandPlacements,
  buildTemporalOrderCenturyViewPlacements,
  buildTemporalOrderMonthTicks,
  buildTemporalOrderYearIncrements,
  getCenturyViewDateOffsetPx,
  resolveCenturyViewClickSelection,
  resolveTemporalOrderCenturyViewColumnCount,
} from './TemporalOrderExtension';

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
    320
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(0)?.bottomPx).toBeLessThanOrEqual(820);
  expect(placementByIndex.get(1)?.bottomPx).toBeLessThanOrEqual(760);
  expect(placementByIndex.get(2)?.bottomPx).toBeLessThanOrEqual(700);
  expect(placementByIndex.get(1)?.bottomPx ?? Infinity).toBeLessThanOrEqual((placementByIndex.get(0)?.topPx ?? 0) - 10);
  expect(placementByIndex.get(2)?.bottomPx ?? Infinity).toBeLessThanOrEqual((placementByIndex.get(1)?.topPx ?? 0) - 10);
});

test('buildTemporalOrderCenturyViewPlacements uses free columns before pushing cards upward', () => {
  const { placements } = buildTemporalOrderCenturyViewPlacements(
    [
      { index: 0, targetAnchorPx: 760, childHeight: 210, scale: 0.7, yearKey: '2026', slotKey: '2026-10', specificity: 'date' },
      { index: 1, targetAnchorPx: 720, childHeight: 170, scale: 0.7, yearKey: '2026', slotKey: '2026-08', specificity: 'date' },
    ],
    2,
    280
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
    280
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
    240
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
    280
  );

  const placementByIndex = new Map(placements.map((placement) => [placement.index, placement]));

  expect(placementByIndex.get(0)?.laneIndex).toBe(0);
  expect(placementByIndex.get(1)?.laneIndex).toBe(1);
});

test('buildTemporalOrderCenturyTopBandPlacements anchors atemporal cards at the top band', () => {
  const { placements, bandHeight } = buildTemporalOrderCenturyTopBandPlacements(
    [
      { index: 0, childHeight: 160 },
      { index: 1, childHeight: 180 },
      { index: 2, childHeight: 140 },
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

test('resolveTemporalOrderCenturyViewColumnCount adds columns when a year band is overcrowded', () => {
  const columnCount = resolveTemporalOrderCenturyViewColumnCount(
    [
      { yearKey: '2026', slotKey: '2026-03', childHeight: 220, bandTopPx: 120, bandBottomPx: 520 },
      { yearKey: '2026', slotKey: '2026-03', childHeight: 210, bandTopPx: 120, bandBottomPx: 520 },
      { yearKey: '2026', slotKey: '2026-04', childHeight: 200, bandTopPx: 120, bandBottomPx: 520 },
    ],
    760
  );

  expect(columnCount).toBeGreaterThan(1);
});

test('resolveTemporalOrderCenturyViewColumnCount does not spread cards wider than needed', () => {
  const columnCount = resolveTemporalOrderCenturyViewColumnCount(
    [
      { yearKey: '2026', slotKey: '2026-02', childHeight: 180, bandTopPx: 120, bandBottomPx: 760 },
      { yearKey: '2026', slotKey: '2026-03', childHeight: 220, bandTopPx: 120, bandBottomPx: 760 },
      { yearKey: '2026', slotKey: '2026-04', childHeight: 200, bandTopPx: 120, bandBottomPx: 760 },
      { yearKey: '2026', slotKey: '2026-05', childHeight: 210, bandTopPx: 120, bandBottomPx: 760 },
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
    0.9,
    increments,
    monthTicks
  );

  expect(selection.precision).toBe('month');
  expect(selection.date.getFullYear()).toBe(2026);
  expect(selection.date.getMonth()).toBe(10);
  expect(selection.date.getDate()).toBe(1);
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
