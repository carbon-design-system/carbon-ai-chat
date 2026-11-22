/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `serverEntry` is the SSR-safe entry: importing it must not register
 * elements or reach into the page. Importing it with no DOM at all is in
 * `serverEntryNode.contract.test.ts`; a node environment has no page to spy on, so
 * this file spies on the page in jsdom and imports the entry fresh.
 *
 * It imports no contract helper and calls no `contractSetup()`: the helpers
 * import both element entries, which would register elements before the spies
 * are in place.
 */

import type { MockInstance } from 'vitest';
type Spied = Record<string, MockInstance>;

let spies: Spied;

beforeEach(() => {
  spies = {
    'customElements.define': vi.spyOn(customElements, 'define'),
    'document.createElement': vi.spyOn(document, 'createElement'),
    'document.addEventListener': vi.spyOn(document, 'addEventListener'),
    'window.addEventListener': vi.spyOn(window, 'addEventListener'),
    'Storage.getItem': vi.spyOn(Storage.prototype, 'getItem'),
    'Storage.setItem': vi.spyOn(Storage.prototype, 'setItem'),
  };
});

afterEach(() => {
  Object.values(spies).forEach((spy) => spy.mockRestore());
});

/** The spied calls, by name, leaving out the ones never called. */
function calledSpies(): string[] {
  return Object.entries(spies)
    .filter(([, spy]) => spy.mock.calls.length > 0)
    .map(([name]) => name);
}

describe('importing serverEntry', () => {
  it('registers no element and touches neither the page nor storage', async () => {
    const before = document.documentElement.outerHTML;
    let entry: Record<string, unknown> = {};
    vi.resetModules();
    await (async () => {
      entry = await import('../../serverEntry');
    })();
    expect(Object.keys(entry)).toContain('BusEventType');
    expect(calledSpies()).toEqual([]);
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it('sees an element entry register its element, so the spies can fail', async () => {
    vi.resetModules();
    await (async () => {
      await import('../../web-components/cds-aichat-container/index');
    })();
    expect(calledSpies()).toContain('customElements.define');
  });
});
