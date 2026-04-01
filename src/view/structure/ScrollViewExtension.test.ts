import { expect, test } from 'vitest';
import { JSDOM } from 'jsdom';

import { ScrollViewExtension } from './ScrollViewExtension';

test('ScrollViewExtension parseHTML only matches explicit scrollview elements', () => {
  const rules = ScrollViewExtension.config.parseHTML?.();
  const rule = rules?.[0];

  expect(rule?.tag).toBe('div[data-scrollview="true"]');

  const dom = new JSDOM('<div></div>');
  const plainDiv = dom.window.document.createElement('div');
  const scrollViewDiv = dom.window.document.createElement('div');
  scrollViewDiv.setAttribute('data-scrollview', 'true');

  expect(rule?.getAttrs?.(plainDiv)).toBe(false);
  expect(rule?.getAttrs?.(scrollViewDiv)).toEqual({});
});
