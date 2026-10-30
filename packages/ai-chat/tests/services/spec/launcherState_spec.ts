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
} from '../../../src/chat/services/launcherState';
import { prefersReducedMotion } from '../../../src/chat/utils/prefersReducedMotion';

jest.mock('../../../src/chat/utils/prefersReducedMotion');

function createLauncher(overrides: Partial<LauncherStateOptions> = {}) {
  const options = {
    extended: false,
    autoExtendEnabled: false,
    timeToExpand: 1000,
    ...overrides,
  };
  const callbacks = {
    setExpanded: jest.fn(),
    setShouldStartCounter: jest.fn(),
  };
  const state = new LauncherState(options, callbacks);
  const greeting = document.createElement('div');
  const textHolder = document.createElement('div');
  const targets = { greeting, textHolder };
  return { state, options, callbacks, targets };
}

describe('LauncherState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(prefersReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([false, true])(
    'initializes extended=%s without effects or an entrance transition',
    (extended) => {
      const { state, callbacks } = createLauncher({
        extended,
        autoExtendEnabled: true,
      });
      const listener = jest.fn();
      state.subscribe(listener);
      expect(state.getSnapshot()).toBe(
        extended ? LauncherOpenState.Open : LauncherOpenState.Closed
      );
      expect(jest.getTimerCount()).toBe(0);
      expect(callbacks.setExpanded).not.toHaveBeenCalled();
      state.connect();
      state.connect();
      expect(jest.getTimerCount()).toBe(1);
      expect(listener).not.toHaveBeenCalled();
      state.disconnect();
    }
  );

  it('preserves an auto-extension deadline across unchanged inputs and writes the counter before expansion', () => {
    const { state, options, callbacks } = createLauncher({
      autoExtendEnabled: true,
    });
    state.connect();
    jest.advanceTimersByTime(400);
    state.update({ ...options });
    jest.advanceTimersByTime(599);
    expect(callbacks.setExpanded).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(callbacks.setShouldStartCounter.mock.calls).toEqual([[false]]);
    expect(callbacks.setExpanded.mock.calls).toEqual([[true]]);
    expect(
      callbacks.setShouldStartCounter.mock.invocationCallOrder[0]
    ).toBeLessThan(callbacks.setExpanded.mock.invocationCallOrder[0]);
    state.update({ ...options });
    jest.advanceTimersByTime(2000);
    expect(callbacks.setExpanded).toHaveBeenCalledTimes(1);
    state.disconnect();
  });

  it.each([{ extended: true }, { timeToExpand: 2000 }])(
    'cancels a pending auto-extension for %o without rescheduling in the same enabled cycle',
    (change) => {
      const { state, options, callbacks } = createLauncher({
        autoExtendEnabled: true,
      });
      state.connect();
      jest.advanceTimersByTime(400);
      const changed = { ...options, ...change };
      state.update(changed);
      jest.advanceTimersByTime(3000);
      expect(callbacks.setExpanded).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
      state.update({ ...changed, autoExtendEnabled: false });
      state.update(changed);
      jest.advanceTimersByTime(changed.timeToExpand);
      expect(callbacks.setExpanded.mock.calls).toEqual([[true]]);
      state.disconnect();
    }
  );

  it('cancels auto-extension when disabled and schedules once when enabled again', () => {
    const { state, options, callbacks } = createLauncher({
      autoExtendEnabled: true,
    });
    state.connect();
    jest.advanceTimersByTime(900);
    state.update({ ...options, autoExtendEnabled: false });
    jest.advanceTimersByTime(1000);
    expect(callbacks.setExpanded).not.toHaveBeenCalled();
    state.update(options);
    jest.advanceTimersByTime(999);
    expect(callbacks.setExpanded).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(callbacks.setExpanded.mock.calls).toEqual([[true]]);
    state.disconnect();
  });

  it('closes by canceling auto-extension before expansion and counter writes', () => {
    const { state, callbacks } = createLauncher({
      extended: true,
      autoExtendEnabled: true,
    });
    state.connect();
    state.close();
    expect(jest.getTimerCount()).toBe(0);
    expect(callbacks.setExpanded.mock.calls).toEqual([[false]]);
    expect(callbacks.setShouldStartCounter.mock.calls).toEqual([[false]]);
    expect(callbacks.setExpanded.mock.invocationCallOrder[0]).toBeLessThan(
      callbacks.setShouldStartCounter.mock.invocationCallOrder[0]
    );
    jest.advanceTimersByTime(1000);
    expect(callbacks.setExpanded).toHaveBeenCalledTimes(1);
    state.disconnect();
    state.close();
    expect(callbacks.setExpanded).toHaveBeenCalledTimes(1);
  });

  it('invalidates a retained auto-extension callback across disconnect and reconnect', () => {
    const timeout = jest.spyOn(global, 'setTimeout');
    const { state, callbacks } = createLauncher({ autoExtendEnabled: true });
    state.connect();
    const stale = timeout.mock.calls[0][0] as () => void;
    state.disconnect();
    state.disconnect();
    expect(jest.getTimerCount()).toBe(0);
    state.connect();
    stale();
    expect(callbacks.setExpanded).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(1000);
    expect(callbacks.setExpanded.mock.calls).toEqual([[true]]);
    state.disconnect();
  });

  it('stops auto-extension writes when its first callback disconnects the owner', () => {
    const { state, callbacks } = createLauncher({ autoExtendEnabled: true });
    callbacks.setShouldStartCounter.mockImplementation(() =>
      state.disconnect()
    );
    state.connect();
    jest.advanceTimersByTime(1000);
    expect(callbacks.setShouldStartCounter.mock.calls).toEqual([[false]]);
    expect(callbacks.setExpanded).not.toHaveBeenCalled();
  });

  it('stops close writes when its first callback disconnects the owner', () => {
    const { state, callbacks } = createLauncher({ extended: true });
    callbacks.setExpanded.mockImplementation(() => state.disconnect());
    state.connect();
    state.close();
    expect(callbacks.setExpanded.mock.calls).toEqual([[false]]);
    expect(callbacks.setShouldStartCounter).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'settles extended=%s at exactly 600 ms when animation events never arrive',
    (extended) => {
      const { state, options, targets } = createLauncher({
        extended: !extended,
      });
      state.connect();
      state.update({ ...options, extended });
      const transitional = extended
        ? LauncherOpenState.Opening
        : LauncherOpenState.Closing;
      const settled = extended
        ? LauncherOpenState.Open
        : LauncherOpenState.Closed;
      expect(state.getSnapshot()).toBe(transitional);
      state.bindTransitionTargets(targets);
      jest.advanceTimersByTime(300);
      state.bindTransitionTargets(targets);
      jest.advanceTimersByTime(299);
      expect(state.getSnapshot()).toBe(transitional);
      jest.advanceTimersByTime(1);
      expect(state.getSnapshot()).toBe(settled);
      expect(jest.getTimerCount()).toBe(0);
      state.disconnect();
    }
  );

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
      const remove = jest.spyOn(target, 'removeEventListener');
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
      expect(jest.getTimerCount()).toBe(0);
      state.disconnect();
    }
  );

  it.each([
    [true, 'missing target'],
    [false, 'missing target'],
    [true, 'reduced motion'],
    [false, 'reduced motion'],
  ] as const)('settles extended=%s immediately for %s', (extended, reason) => {
    const { state, options, targets } = createLauncher({ extended: !extended });
    jest
      .mocked(prefersReducedMotion)
      .mockReturnValue(reason === 'reduced motion');
    state.connect();
    state.update({ ...options, extended });
    state.bindTransitionTargets(
      reason === 'missing target'
        ? { greeting: null, textHolder: null }
        : targets
    );
    expect(state.getSnapshot()).toBe(
      extended ? LauncherOpenState.Open : LauncherOpenState.Closed
    );
    expect(jest.getTimerCount()).toBe(0);
    state.disconnect();
  });

  it('releases an old transition target before binding its replacement', () => {
    const { state, options, targets } = createLauncher();
    const replacement = document.createElement('div');
    const add = jest.spyOn(targets.greeting, 'addEventListener');
    const remove = jest.spyOn(targets.greeting, 'removeEventListener');
    const addReplacement = jest.spyOn(replacement, 'addEventListener');
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

  it('invalidates an opening timeout when closing replaces the transition', () => {
    const timeout = jest.spyOn(global, 'setTimeout');
    const { state, options, targets } = createLauncher();
    state.connect();
    state.update({ ...options, extended: true });
    state.bindTransitionTargets(targets);
    const stale = timeout.mock.calls[0][0] as () => void;
    state.update(options);
    state.bindTransitionTargets(targets);
    stale();
    targets.greeting.dispatchEvent(new Event('animationend'));
    expect(state.getSnapshot()).toBe(LauncherOpenState.Closing);
    expect(jest.getTimerCount()).toBe(1);
    targets.textHolder.dispatchEvent(new Event('animationend'));
    expect(state.getSnapshot()).toBe(LauncherOpenState.Closed);
    state.disconnect();
  });

  it('cleans transition listeners and invalidates retained completion callbacks across reconnect', () => {
    const timeout = jest.spyOn(global, 'setTimeout');
    const { state, options, targets } = createLauncher();
    const listener = jest.fn();
    const release = state.subscribe(listener);
    const remove = jest.spyOn(targets.greeting, 'removeEventListener');
    state.connect();
    state.update({ ...options, extended: true });
    state.bindTransitionTargets(targets);
    const stale = timeout.mock.calls[0][0] as () => void;
    state.disconnect();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
    listener.mockClear();
    stale();
    targets.greeting.dispatchEvent(new Event('animationcancel'));
    expect(listener).not.toHaveBeenCalled();
    state.update(options);
    state.connect();
    state.update({ ...options, extended: true });
    state.bindTransitionTargets(targets);
    listener.mockClear();
    stale();
    expect(state.getSnapshot()).toBe(LauncherOpenState.Opening);
    expect(listener).not.toHaveBeenCalled();
    targets.greeting.dispatchEvent(new Event('animationend'));
    expect(listener).toHaveBeenCalledTimes(1);
    release();
    release();
    state.update(options);
    expect(listener).toHaveBeenCalledTimes(1);
    state.disconnect();
  });

  it('does not schedule after a synchronous state listener detaches the owner', () => {
    const { state, options } = createLauncher();
    state.connect();
    state.subscribe(() => state.disconnect());
    state.update({ ...options, extended: true, autoExtendEnabled: true });
    expect(jest.getTimerCount()).toBe(0);
  });
});
