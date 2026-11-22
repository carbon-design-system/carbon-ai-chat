/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { observeResize } from '../resizeObserver';

import { injectStyles, StyleInjectionOptions } from '../styleInjection';

vi.mock(
  '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js',
  () => ({
    adoptOnRoot: vi.fn(),
    clearSelector: vi.fn(),
    setVarsForSelector: vi.fn(),
  })
);

describe('browser lifecycle cores', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('measures immediately, coalesces observer callbacks, and cancels queued frames', () => {
    vi.useFakeTimers();
    let notify: ResizeObserverCallback;
    const disconnect = vi.fn();
    vi.spyOn(global, 'ResizeObserver').mockImplementation(function (
      callback: ResizeObserverCallback
    ) {
      notify = callback;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect };
    });
    const onResize = vi.fn();
    const cleanup = observeResize(document.createElement('div'), onResize);
    expect(onResize).toHaveBeenCalledTimes(1);
    notify([], null);
    notify([], null);
    vi.runAllTimers();
    expect(onResize).toHaveBeenCalledTimes(2);
    notify([], null);
    cleanup();
    notify([], null);
    vi.runAllTimers();
    expect(onResize).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalled();
  });

  it('preserves unrelated adopted stylesheets across repeated updates', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    root.append(container);
    // The DOM accepts only real style sheets here; their replaceSync stays a stub.
    const unrelated = new CSSStyleSheet();
    const applicationStylesheet = Object.assign(new CSSStyleSheet(), {
      replaceSync: vi.fn(),
    });
    const cssVariableOverrideStylesheet = Object.assign(new CSSStyleSheet(), {
      replaceSync: vi.fn(),
    });
    root.adoptedStyleSheets = [unrelated];
    const options: StyleInjectionOptions = {
      container,
      appStyles: 'div {}',
      cssVariableOverrideString: '',
      applicationStylesheet,
      cssVariableOverrideStylesheet,
    };
    injectStyles(options);
    injectStyles(options);
    expect(root.adoptedStyleSheets).toEqual([
      unrelated,
      applicationStylesheet,
      cssVariableOverrideStylesheet,
    ]);
  });
});
