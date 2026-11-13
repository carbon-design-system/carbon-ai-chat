/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, ViewType } from '../../../../src/aiChatEntry';
import { changeView, contractChat, contractSetup } from '../../helpers';

/** How many `console.log` calls a host call to `changeView` makes. */
async function logsDuringChangeView(
  log: jest.SpyInstance,
  instance: ChatInstance,
  view = ViewType.MAIN_WINDOW
): Promise<number> {
  log.mockClear();
  await changeView(instance, view);
  return log.mock.calls.length;
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

  // MAIN-NOTES M54 (2.0.0): debug logging is shared and stays enabled.
  it('keeps page-wide logs after a normal chat mounts beside a debug chat, and after remount', async () => {
    const normal = await contractChat({ messaging: { skipWelcome: true } });
    expect(await logsDuringChangeView(log, normal.instance)).toBe(0);
    normal.unmount();

    const debug = await contractChat({
      namespace: 'debug-a',
      debug: true,
      messaging: { skipWelcome: true },
    });
    // The log lines are diagnostics, not copy; only that some appear is pinned.
    expect(await logsDuringChangeView(log, debug.instance)).toBeGreaterThan(0);
    const concurrent = await contractChat({
      namespace: 'normal-b',
      debug: false,
      messaging: { skipWelcome: true },
    });
    expect(
      await logsDuringChangeView(log, debug.instance, ViewType.LAUNCHER)
    ).toBeGreaterThan(0);
    expect(
      await logsDuringChangeView(log, concurrent.instance)
    ).toBeGreaterThan(0);
    debug.unmount();
    concurrent.unmount();

    const remount = await contractChat({ messaging: { skipWelcome: true } });
    expect(await logsDuringChangeView(log, remount.instance)).toBeGreaterThan(
      0
    );
  });
});
