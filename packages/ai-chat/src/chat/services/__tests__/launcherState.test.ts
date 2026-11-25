/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  LauncherOpenState,
  LauncherState,
  type LauncherStateOptions,
} from '../launcherState';
import { prefersReducedMotion } from '../../utils/prefersReducedMotion';

vi.mock('../../utils/prefersReducedMotion');

function createLauncher(overrides: Partial<LauncherStateOptions> = {}) {
  const options = {
    extended: false,
    autoExtendEnabled: false,
    timeToExpand: 1000,
    ...overrides,
  };
  const callbacks = {
    setExpanded: vi.fn(),
    setShouldStartCounter: vi.fn(),
  };
  const state = new LauncherState(options, callbacks);
  const greeting = document.createElement('div');
  const textHolder = document.createElement('div');
  const targets = { greeting, textHolder };
  return { state, options, callbacks, targets };
}

describe('LauncherState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(prefersReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([
    [true, 'animationend'],
    [true, 'animationcancel'],
    [false, 'animationend'],
    [false, 'animationcancel'],
  ] as const)(
    'settles extended=%s on the target %s event, ignoring descendant events',
    (extended, eventName) => {
      const { state, options, targets } = createLauncher({
        extended: !extended,
      });
      const target = extended ? targets.greeting : targets.textHolder;
      const child = document.createElement('span');
      target.appendChild(child);
      const remove = vi.spyOn(target, 'removeEventListener');
      state.connect();
      state.update({ ...options, extended });
      state.bindTransitionTargets(targets);
      child.dispatchEvent(new Event(eventName, { bubbles: true }));
      expect(state.getSnapshot()).toBe(
        extended ? LauncherOpenState.Opening : LauncherOpenState.Closing
      );
      target.dispatchEvent(new Event(eventName));
      expect(state.getSnapshot()).toBe(
        extended ? LauncherOpenState.Open : LauncherOpenState.Closed
      );
      expect(remove.mock.calls.map(([type]) => type)).toEqual([
        'animationend',
        'animationcancel',
      ]);
      expect(vi.getTimerCount()).toBe(0);
      state.disconnect();
    }
  );

  it('releases an old transition target before binding its replacement', () => {
    const { state, options, targets } = createLauncher();
    const replacement = document.createElement('div');
    const add = vi.spyOn(targets.greeting, 'addEventListener');
    const remove = vi.spyOn(targets.greeting, 'removeEventListener');
    const addReplacement = vi.spyOn(replacement, 'addEventListener');
    state.connect();
    state.update({ ...options, extended: true });
    state.bindTransitionTargets(targets);
    const stale = add.mock.calls[0][1] as EventListener;
    state.bindTransitionTargets({ ...targets, greeting: replacement });
    expect(remove.mock.invocationCallOrder[1]).toBeLessThan(
      addReplacement.mock.invocationCallOrder[0]
    );
    const oldEvent = new Event('animationend');
    Object.defineProperty(oldEvent, 'target', { value: targets.greeting });
    stale(oldEvent);
    targets.greeting.dispatchEvent(new Event('animationend'));
    expect(state.getSnapshot()).toBe(LauncherOpenState.Opening);
    replacement.dispatchEvent(new Event('animationend'));
    expect(state.getSnapshot()).toBe(LauncherOpenState.Open);
    state.disconnect();
  });
});
