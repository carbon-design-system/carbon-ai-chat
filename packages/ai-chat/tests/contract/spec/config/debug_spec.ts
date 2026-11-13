/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ViewType } from '../../../../src/aiChatEntry';
import { changeView, contractChat, contractSetup } from '../../helpers';

/** How many `console.log` calls a host call to `changeView` makes. */
async function logsDuringChangeView(
  log: jest.SpyInstance,
  config: { debug?: boolean }
): Promise<number> {
  const { instance, unmount } = await contractChat({
    ...config,
    messaging: { skipWelcome: true },
  });
  log.mockClear();
  await changeView(instance, ViewType.MAIN_WINDOW);
  const count = log.mock.calls.length;
  unmount();
  return count;
}

// @covers config.debug
describe('debug', () => {
  contractSetup();

  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    log.mockRestore();
  });

  it('logs to the console on a host call only when debug is true', async () => {
    expect(await logsDuringChangeView(log, {})).toBe(0);
    // The log lines are diagnostics, not copy; only that some appear is pinned.
    expect(await logsDuringChangeView(log, { debug: true })).toBeGreaterThan(0);
  });

  it('stops logging for a chat mounted with debug false after a debug chat', async () => {
    expect(await logsDuringChangeView(log, { debug: true })).toBeGreaterThan(0);
    expect(await logsDuringChangeView(log, { debug: false })).toBe(0);
    expect(await logsDuringChangeView(log, {})).toBe(0);
  });
});
