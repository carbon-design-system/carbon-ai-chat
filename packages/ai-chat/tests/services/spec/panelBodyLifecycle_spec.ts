/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  HydrationBodyLifecycle,
  IFrameBodyLifecycle,
  DisclaimerReadState,
} from '../../../src/chat/utils/panelBodyLifecycle';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('hydration body lifetime', () => {
  it('delays content 400 ms and announces once per mounted unhydrated cycle', () => {
    const announce = jest.fn();
    const owner = new HydrationBodyLifecycle(
      { isHydrated: false, announcement: 'Loading' },
      announce
    );
    expect(jest.getTimerCount()).toBe(0);
    owner.connect();
    owner.connect();
    jest.advanceTimersByTime(399);
    expect(owner.getSnapshot()).toBe(false);
    expect(announce).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(owner.getSnapshot()).toBe(true);
    expect(announce).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(announce.mock.calls).toEqual([['Loading']]);

    owner.update({ isHydrated: false, announcement: 'Chargement' });
    jest.runOnlyPendingTimers();
    expect(announce).toHaveBeenCalledTimes(1);
    owner.update({ isHydrated: true, announcement: 'Chargement' });
    owner.update({ isHydrated: false, announcement: 'Chargement' });
    jest.runOnlyPendingTimers();
    expect(announce.mock.calls).toEqual([['Loading'], ['Chargement']]);
    owner.disconnect();
  });

  it('keeps delayed content when hydrated and waits for a later unhydrated notice', () => {
    const announce = jest.fn();
    const owner = new HydrationBodyLifecycle(
      { isHydrated: false, announcement: 'Loading' },
      announce
    );
    owner.connect();
    jest.advanceTimersByTime(100);
    owner.update({ isHydrated: true, announcement: 'Loading' });
    jest.advanceTimersByTime(301);
    expect(owner.getSnapshot()).toBe(true);
    expect(announce).not.toHaveBeenCalled();
    owner.update({ isHydrated: false, announcement: '' });
    expect(jest.getTimerCount()).toBe(0);
    owner.update({ isHydrated: false, announcement: 'Late label' });
    jest.runOnlyPendingTimers();
    expect(announce).toHaveBeenCalledWith('Late label');
    owner.disconnect();
  });

  it('cancels both content and already queued speech when retired', () => {
    const announce = jest.fn();
    const owner = new HydrationBodyLifecycle(
      { isHydrated: false, announcement: 'Loading' },
      announce
    );
    owner.connect();
    jest.advanceTimersByTime(399);
    owner.disconnect();
    owner.disconnect();
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(1000);
    expect(owner.getSnapshot()).toBe(false);
    owner.connect();
    jest.advanceTimersByTime(400);
    expect(owner.getSnapshot()).toBe(true);
    owner.disconnect();
    expect(jest.getTimerCount()).toBe(0);
    jest.runOnlyPendingTimers();
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('iframe body lifetime', () => {
  function createOwner() {
    const callbacks = { loaded: jest.fn(), timedOut: jest.fn() };
    const owner = new IFrameBodyLifecycle('Load failed', callbacks);
    return { owner, callbacks };
  }

  it('delays its spinner 1500 ms and clears both waits on load', () => {
    const { owner, callbacks } = createOwner();
    expect(jest.getTimerCount()).toBe(0);
    owner.connect();
    owner.connect();
    expect(jest.getTimerCount()).toBe(2);
    jest.advanceTimersByTime(1499);
    expect(owner.getSnapshot().showSpinner).toBe(false);
    jest.advanceTimersByTime(1);
    expect(owner.getSnapshot().showSpinner).toBe(true);
    owner.loaded();
    expect(owner.getSnapshot()).toEqual({
      loading: false,
      showSpinner: false,
      error: false,
    });
    expect(callbacks.loaded).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(20000);
    expect(callbacks.timedOut).not.toHaveBeenCalled();
    owner.disconnect();
  });

  it('times out at 20 s and retains error through a late load event', () => {
    const { owner, callbacks } = createOwner();
    owner.connect();
    jest.advanceTimersByTime(19999);
    expect(owner.getSnapshot().error).toBe(false);
    jest.advanceTimersByTime(1);
    expect(owner.getSnapshot()).toEqual({
      loading: false,
      showSpinner: false,
      error: true,
    });
    expect(callbacks.timedOut).toHaveBeenCalledTimes(1);
    owner.loaded();
    expect(owner.getSnapshot().error).toBe(true);
    expect(callbacks.loaded).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    owner.disconnect();
  });

  it('restarts only the pending timeout when its error label changes', () => {
    const { owner, callbacks } = createOwner();
    owner.connect();
    jest.advanceTimersByTime(10000);
    owner.update('New error label');
    expect(owner.getSnapshot().showSpinner).toBe(true);
    jest.advanceTimersByTime(10000);
    owner.update('New error label');
    expect(callbacks.timedOut).not.toHaveBeenCalled();
    jest.advanceTimersByTime(9999);
    expect(callbacks.timedOut).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(callbacks.timedOut).toHaveBeenCalledTimes(1);
    owner.disconnect();
  });

  it('invalidates captured callbacks and restores fresh waits after reconnect', () => {
    const { owner, callbacks } = createOwner();
    const setTimer = jest.spyOn(globalThis, 'setTimeout');
    owner.connect();
    const retiredCallbacks = setTimer.mock.calls.map(
      ([callback]) => callback as () => void
    );
    owner.disconnect();
    owner.connect();
    retiredCallbacks.forEach((callback) => callback());
    expect(owner.getSnapshot()).toEqual({
      loading: true,
      showSpinner: false,
      error: false,
    });
    expect(callbacks.loaded).not.toHaveBeenCalled();
    expect(callbacks.timedOut).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(2);
    owner.disconnect();
    owner.loaded();
    expect(callbacks.loaded).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('disclaimer read state', () => {
  it('keeps acceptance sticky for short or fully read text', () => {
    const owner = new DisclaimerReadState();
    const listener = jest.fn();
    const release = owner.subscribe(listener);
    owner.observeScroll({ isScrollable: true, isAtBottom: false });
    expect(owner.getSnapshot()).toBe(false);
    owner.observeScroll({ isScrollable: false, isAtBottom: false });
    expect(owner.getSnapshot()).toBe(true);
    owner.observeScroll({ isScrollable: true, isAtBottom: false });
    owner.observeScroll({ isScrollable: true, isAtBottom: true });
    expect(owner.getSnapshot()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    release();
    const longText = new DisclaimerReadState();
    longText.observeScroll({ isScrollable: true, isAtBottom: true });
    expect(longText.getSnapshot()).toBe(true);
  });

  it('probes the panel at 100/300/500 ms once per connection and cancels stale work', () => {
    const owner = new DisclaimerReadState();
    const panel = document.createElement('div');
    panel.attachShadow({ mode: 'open' });
    const body = document.createElement('div');
    body.className = 'panel-body';
    panel.shadowRoot.appendChild(body);
    const scroll = jest.fn();
    body.addEventListener('scroll', scroll);
    const timer = jest.spyOn(globalThis, 'setTimeout');
    expect(jest.getTimerCount()).toBe(0);
    owner.connect(panel);
    owner.connect(panel);
    const retired = timer.mock.calls.map(
      ([callback]) => callback as () => void
    );
    jest.advanceTimersByTime(99);
    expect(scroll).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(scroll).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(200);
    expect(scroll).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(200);
    expect(scroll).toHaveBeenCalledTimes(3);
    owner.observeScroll({ isScrollable: false, isAtBottom: false });
    owner.disconnect();
    owner.connect(panel);
    retired.forEach((callback) => callback());
    expect(scroll).toHaveBeenCalledTimes(3);
    expect(owner.getSnapshot()).toBe(true);
    owner.disconnect();
    expect(jest.getTimerCount()).toBe(0);
  });
});
