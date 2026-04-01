import { expect, test } from 'vitest';
import { JSDOM } from 'jsdom';

import { PortalExtension } from './PortalExtension';

test('PortalExtension parseHTML only matches explicit portal elements', () => {
  const rules = PortalExtension.config.parseHTML?.();
  const rule = rules?.[0];

  expect(rule?.tag).toBe('div[data-portal="true"]');

  const dom = new JSDOM('<div></div>');
  const plainDiv = dom.window.document.createElement('div');
  const portalDiv = dom.window.document.createElement('div');
  portalDiv.setAttribute('data-portal', 'true');

  expect(rule?.getAttrs?.(plainDiv)).toBe(false);
  expect(rule?.getAttrs?.(portalDiv)).toEqual({});
});
