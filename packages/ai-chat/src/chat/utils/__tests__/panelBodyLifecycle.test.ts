/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HydrationBodyLifecycle } from '../panelBodyLifecycle';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('hydration body lifetime', () => {
  it('restarts the delay for a load that starts long after connect', () => {
    const announce = vi.fn();
    const owner = new HydrationBodyLifecycle(
      { isHydrated: true, announcement: 'Loading' },
      announce
    );
    owner.connect();
    vi.advanceTimersByTime(1000);
    owner.update({ isHydrated: false, announcement: 'Loading' });
    expect(owner.getSnapshot()).toBe(false);
    vi.advanceTimersByTime(100);
    owner.update({ isHydrated: true, announcement: 'Loading' });
    vi.runOnlyPendingTimers();
    vi.runOnlyPendingTimers();
    expect(announce).not.toHaveBeenCalled();
    owner.disconnect();
  });

  it('cancels both content and already queued speech when retired', () => {
    const announce = vi.fn();
    const owner = new HydrationBodyLifecycle(
      { isHydrated: false, announcement: 'Loading' },
      announce
    );
    owner.connect();
    vi.advanceTimersByTime(399);
    owner.disconnect();
    owner.disconnect();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(owner.getSnapshot()).toBe(false);
    owner.connect();
    vi.advanceTimersByTime(400);
    expect(owner.getSnapshot()).toBe(true);
    owner.disconnect();
    expect(vi.getTimerCount()).toBe(0);
    vi.runOnlyPendingTimers();
    expect(announce).not.toHaveBeenCalled();
  });
});
