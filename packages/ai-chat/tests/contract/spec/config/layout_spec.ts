/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LayoutConfig } from '../../../../src/aiChatEntry';
import { contractChat, contractSetup } from '../../helpers';

/** The console warnings that name this custom property key. */
function warningsNaming(warn: jest.SpyInstance, key: string): unknown[][] {
  return warn.mock.calls.filter((args) =>
    args.some(
      (arg: unknown) => typeof arg === 'string' && arg.includes(`"${key}"`)
    )
  );
}

// What a host can see of `layout.customProperties` in jsdom is its check on
// Carbon token values. The values themselves land in an injected stylesheet,
// which jsdom's getComputedStyle doesn't apply to the host.
// @covers config.layout config.layout.customProperties
describe('layout.customProperties', () => {
  contractSetup();

  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
  });

  async function mount(customProperties: LayoutConfig['customProperties']) {
    await contractChat({
      messaging: { skipWelcome: true },
      layout: { customProperties },
    });
  }

  it('warns, naming the key, for a Carbon token whose value is not a hex color', async () => {
    await mount({ '$button-primary': 'red' });
    // `main` warns twice for one mount; only "at least once" is pinned.
    expect(warningsNaming(warn, '$button-primary').length).toBeGreaterThan(0);
  });

  it('does not warn for a Carbon token with a hex color', async () => {
    await mount({ '$button-primary': '#1a1a2e' });
    expect(warningsNaming(warn, '$button-primary')).toEqual([]);
  });

  it('does not check the value of a chat shell token', async () => {
    await mount({ width: 'not-a-length' });
    expect(warningsNaming(warn, 'width')).toEqual([]);
  });

  it('warns only for the bad key when good and bad keys are mixed', async () => {
    await mount({
      '$button-primary': 'red',
      $background: '#ffffff',
      width: '420px',
    });
    expect(warningsNaming(warn, '$button-primary').length).toBeGreaterThan(0);
    expect(warningsNaming(warn, '$background')).toEqual([]);
    expect(warningsNaming(warn, 'width')).toEqual([]);
  });
});
