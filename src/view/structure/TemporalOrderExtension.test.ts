import { expect, test } from 'vitest';

import { buildTemporalOrderMonthTicks, buildTemporalOrderYearIncrements } from './TemporalOrderExtension';

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
