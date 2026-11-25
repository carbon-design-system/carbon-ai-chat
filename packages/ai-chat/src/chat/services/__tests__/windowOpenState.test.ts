/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { WindowOpenState, WindowOpenStateOptions } from '../windowOpenState';

function setup(overrides: Partial<WindowOpenStateOptions> = {}) {
  const container = document.createElement('div');
  const options = {
    viewStateMainWindow: true,
    isHydrated: false,
    useCustomHostElement: false,
    requestFocus: vi.fn(),
    ...overrides,
  };
  const controller = new WindowOpenState(options, () => container);
  return { controller, container, options };
}

describe('WindowOpenState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
        vi.advanceTimersByTime(500);
      }
      expect(controller.getSnapshot()).toMatchObject({
        open: false,
        closing: false,
      });
      expect(vi.getTimerCount()).toBe(0);
      controller.disconnect();
    }
  );

  it('cancels obsolete close completion when reopened', () => {
    const { controller, options, container } = setup();
    controller.connect();
    controller.update({ ...options, viewStateMainWindow: false });
    controller.update(options);
    container.dispatchEvent(new Event('animationend'));
    vi.runAllTimers();
    expect(controller.getSnapshot()).toMatchObject({
      open: true,
      closing: false,
    });
    controller.disconnect();
  });

  it.each([false, true])(
    'snaps closed for custom host %s with reduced motion',
    (useCustomHostElement) => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
      } as MediaQueryList);
      const { controller, options } = setup({ useCustomHostElement });
      controller.connect();
      controller.update({ ...options, viewStateMainWindow: false });
      expect(controller.getSnapshot()).toMatchObject({
        open: false,
        closing: false,
      });
      expect(vi.getTimerCount()).toBe(0);
      controller.disconnect();
    }
  );

  it('cancels pending focus and close work and resumes after reconnect', () => {
    const { controller, options, container } = setup({ isHydrated: true });
    controller.connect();
    controller.update({ ...options, viewStateMainWindow: false });
    controller.disconnect();
    vi.mocked(options.requestFocus).mockClear();
    container.dispatchEvent(new Event('animationend'));
    vi.runAllTimers();
    expect(options.requestFocus).not.toHaveBeenCalled();
    expect(controller.getSnapshot().open).toBe(true);
    controller.connect();
    vi.advanceTimersByTime(500);
    expect(controller.getSnapshot()).toMatchObject({
      open: false,
      closing: false,
    });
    controller.disconnect();
  });

  it('refocuses on remount after the hydration focus frame already fired', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const { controller, options } = setup({ isHydrated: true });
    controller.connect();
    frames.shift()(0);
    controller.disconnect();
    vi.mocked(options.requestFocus).mockClear();
    controller.connect();
    frames.shift()(0);
    expect(options.requestFocus).toHaveBeenCalledTimes(1);
    controller.disconnect();
  });
});
