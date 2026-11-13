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
 * elements or reach into the page. A `@jest-environment node` file can't show
 * that here, because `tests/setup.ts` writes to `window` before any test runs,
 * so this file spies on the page in jsdom and imports the entry fresh.
 *
 * It imports no contract helper and calls no `contractSetup()`: the helpers
 * import both element entries, which would register elements before the spies
 * are in place.
 */

type Spied = Record<string, jest.SpyInstance>;

let spies: Spied;

beforeEach(() => {
  spies = {
    'customElements.define': jest.spyOn(customElements, 'define'),
    'document.createElement': jest.spyOn(document, 'createElement'),
    'document.addEventListener': jest.spyOn(document, 'addEventListener'),
    'window.addEventListener': jest.spyOn(window, 'addEventListener'),
    'Storage.getItem': jest.spyOn(Storage.prototype, 'getItem'),
    'Storage.setItem': jest.spyOn(Storage.prototype, 'setItem'),
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
    await jest.isolateModulesAsync(async () => {
      entry = await import('../../../../src/serverEntry');
    });
    expect(Object.keys(entry)).toContain('BusEventType');
    expect(calledSpies()).toEqual([]);
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it('sees an element entry register its element, so the spies can fail', async () => {
    await jest.isolateModulesAsync(async () => {
      await import('../../../../src/web-components/cds-aichat-container/index');
    });
    expect(calledSpies()).toContain('customElements.define');
  });
});
