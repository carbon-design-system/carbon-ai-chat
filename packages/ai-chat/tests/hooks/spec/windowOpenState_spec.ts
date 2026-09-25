/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  WindowOpenState,
  WindowOpenStateOptions,
} from '../../../src/chat/services/windowOpenState';

function setup(overrides: Partial<WindowOpenStateOptions> = {}) {
  const container = document.createElement('div');
  const options = {
    viewStateMainWindow: true,
    isHydrated: false,
    useCustomHostElement: false,
    requestFocus: jest.fn(),
    ...overrides,
  };
  const controller = new WindowOpenState(options, () => container);
  return { controller, container, options };
}

describe('WindowOpenState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest
      .spyOn(window, 'matchMedia')
      .mockReturnValue({ matches: false } as MediaQueryList);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('starts open without side effects and preserves unchanged snapshots', () => {
    const { controller, options } = setup();
    const snapshot = controller.getSnapshot();
    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);
    expect(snapshot.open).toBe(true);
    expect(options.requestFocus).not.toHaveBeenCalled();
    controller.connect();
    controller.update(options);
    expect(controller.getSnapshot()).toBe(snapshot);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
    controller.disconnect();
  });

  it.each(['animation', 'timeout'])(
    'closes after %s completion',
    (completion) => {
      const { controller, options, container } = setup();
      controller.connect();
      controller.update({ ...options, viewStateMainWindow: false });
      expect(controller.getSnapshot()).toMatchObject({
        open: true,
        closing: true,
      });
      if (completion === 'animation') {
        container.dispatchEvent(new Event('animationend'));
      } else {
        jest.advanceTimersByTime(500);
      }
      expect(controller.getSnapshot()).toMatchObject({
        open: false,
        closing: false,
      });
      expect(jest.getTimerCount()).toBe(0);
      controller.disconnect();
    }
  );

  it('cancels obsolete close completion when reopened', () => {
    const { controller, options, container } = setup();
    controller.connect();
    controller.update({ ...options, viewStateMainWindow: false });
    controller.update(options);
    container.dispatchEvent(new Event('animationend'));
    jest.runAllTimers();
    expect(controller.getSnapshot()).toMatchObject({
      open: true,
      closing: false,
    });
    controller.disconnect();
  });

  it.each([false, true])(
    'snaps closed for custom host %s with reduced motion',
    (useCustomHostElement) => {
      jest
        .spyOn(window, 'matchMedia')
        .mockReturnValue({ matches: true } as MediaQueryList);
      const { controller, options } = setup({ useCustomHostElement });
      controller.connect();
      controller.update({ ...options, viewStateMainWindow: false });
      expect(controller.getSnapshot()).toMatchObject({
        open: false,
        closing: false,
      });
      expect(jest.getTimerCount()).toBe(0);
      controller.disconnect();
    }
  );

  it('cancels pending focus and close work and resumes after reconnect', () => {
    const { controller, options, container } = setup({ isHydrated: true });
    controller.connect();
    controller.update({ ...options, viewStateMainWindow: false });
    controller.disconnect();
    jest.mocked(options.requestFocus).mockClear();
    container.dispatchEvent(new Event('animationend'));
    jest.runAllTimers();
    expect(options.requestFocus).not.toHaveBeenCalled();
    expect(controller.getSnapshot().open).toBe(true);
    controller.connect();
    jest.advanceTimersByTime(500);
    expect(controller.getSnapshot()).toMatchObject({
      open: false,
      closing: false,
    });
    controller.disconnect();
  });

  it('opens an initially closed window and announces hydration completion', () => {
    const { controller, options } = setup({ viewStateMainWindow: false });
    controller.connect();
    controller.update({
      ...options,
      viewStateMainWindow: true,
      isHydrated: true,
    });
    expect(controller.getSnapshot()).toMatchObject({
      open: true,
      isHydrationAnimationComplete: true,
    });
    expect(options.requestFocus).toHaveBeenCalledTimes(1);
    jest.runAllTimers();
    expect(options.requestFocus).toHaveBeenCalledTimes(2);
    controller.disconnect();
  });
});
