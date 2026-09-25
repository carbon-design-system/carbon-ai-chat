/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { observeResize } from '../../../src/chat/utils/resizeObserver';
import {
  hasMeaningfulContent,
  observeWriteableElementPresence,
} from '../../../src/chat/utils/writeableElementPresence';
import {
  attachHosts,
  detachHosts,
} from '../../../src/chat/utils/removeHostsOnUnmount';
import { connectMobileViewportLayout } from '../../../src/chat/utils/mobileViewportLayout';
import {
  injectStyles,
  StyleInjectionOptions,
} from '../../../src/chat/utils/styleInjection';
import {
  adoptOnRoot,
  clearSelector,
  setVarsForSelector,
} from '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js';

jest.mock(
  '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js',
  () => ({
    adoptOnRoot: jest.fn(),
    clearSelector: jest.fn(),
    setVarsForSelector: jest.fn(),
  })
);

describe('browser lifecycle cores', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('measures immediately, coalesces observer callbacks, and cancels queued frames', () => {
    jest.useFakeTimers();
    let notify: ResizeObserverCallback;
    const disconnect = jest.fn();
    jest.spyOn(global, 'ResizeObserver').mockImplementation((callback) => {
      notify = callback;
      return { observe: jest.fn(), unobserve: jest.fn(), disconnect };
    });
    const onResize = jest.fn();
    const cleanup = observeResize(document.createElement('div'), onResize);
    expect(onResize).toHaveBeenCalledTimes(1);
    notify([], null);
    notify([], null);
    jest.runAllTimers();
    expect(onResize).toHaveBeenCalledTimes(2);
    notify([], null);
    cleanup();
    notify([], null);
    jest.runAllTimers();
    expect(onResize).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalled();
  });

  it('observes content changes and resets presence when the target disappears', async () => {
    const node = document.createElement('div');
    node.append(
      document.createComment('comment'),
      document.createTextNode(' ')
    );
    expect(hasMeaningfulContent(node)).toBe(false);
    const onChange = jest.fn();
    const cleanup = observeWriteableElementPresence(node, onChange);
    node.append(document.createElement('span'));
    await Promise.resolve();
    expect(onChange).toHaveBeenLastCalledWith(true);
    node.replaceChildren(document.createTextNode('text'));
    await Promise.resolve();
    node.firstChild.textContent = ' ';
    await Promise.resolve();
    expect(onChange).toHaveBeenLastCalledWith(false);
    node.append(document.createElement('span'));
    cleanup();
    onChange.mockClear();
    await Promise.resolve();
    expect(onChange).not.toHaveBeenCalled();
    observeWriteableElementPresence(undefined, onChange)();
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('attaches hosts again after cleanup without duplicating them', () => {
    const wrapper = document.createElement('div');
    const host = document.createElement('div');
    const hosts = new Map([['host', host]]);
    document.body.append(wrapper);
    attachHosts(hosts, wrapper);
    attachHosts(hosts, wrapper);
    expect(wrapper.children).toHaveLength(1);
    detachHosts(hosts);
    detachHosts(hosts);
    expect(wrapper.children).toHaveLength(0);
    attachHosts(hosts, wrapper);
    expect(wrapper.firstChild).toBe(host);
    wrapper.remove();
  });

  it('writes viewport dimensions immediately and releases listeners on cleanup', () => {
    const viewport = Object.assign(new EventTarget(), {
      width: 400,
      height: 600,
      offsetTop: 20,
    });
    const descriptor = Object.getOwnPropertyDescriptor(
      window,
      'visualViewport'
    );
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    });
    try {
      const cleanup = connectMobileViewportLayout(true, document.body, 4);
      expect(adoptOnRoot).toHaveBeenCalledWith(document);
      expect(setVarsForSelector).toHaveBeenLastCalledWith(
        '.cds-aichat--container--render',
        {
          '--cds-aichat-height': 'calc(600px - 4px)',
          '--cds-aichat-width': 'calc(400px - 4px)',
          '--cds-aichat-top-position': '20px',
        }
      );
      viewport.offsetTop = 0;
      viewport.dispatchEvent(new Event('scroll'));
      expect(setVarsForSelector).toHaveBeenLastCalledWith(
        '.cds-aichat--container--render',
        {
          '--cds-aichat-height': 'calc(600px - 4px)',
          '--cds-aichat-width': 'calc(400px - 4px)',
        }
      );
      cleanup();
      jest.mocked(setVarsForSelector).mockClear();
      viewport.dispatchEvent(new Event('resize'));
      expect(setVarsForSelector).not.toHaveBeenCalled();
      expect(clearSelector).toHaveBeenCalled();
      const reconnectCleanup = connectMobileViewportLayout(true, document.body);
      expect(setVarsForSelector).toHaveBeenCalledTimes(1);
      jest.mocked(clearSelector).mockClear();
      cleanup();
      expect(clearSelector).not.toHaveBeenCalled();
      reconnectCleanup();
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'visualViewport', descriptor);
      } else {
        delete window.visualViewport;
      }
    }
  });

  it('updates fallback styles on replay without duplicating root-owned nodes', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    root.append(container);
    const options: StyleInjectionOptions = {
      container,
      appStyles: 'div {}',
      cssVariableOverrideString: ':host {}',
      applicationStylesheet: null,
      cssVariableOverrideStylesheet: null,
    };
    injectStyles(options);
    injectStyles({
      ...options,
      appStyles: 'span {}',
      cssVariableOverrideString: ':host { color: red; }',
    });
    expect(root.querySelectorAll('style')).toHaveLength(2);
    expect(root.querySelector('style[data-app-styles]').textContent).toBe(
      'span {}'
    );
    expect(root.querySelector('style[data-override-styles]').textContent).toBe(
      ':host { color: red; }'
    );
  });

  it('preserves unrelated adopted stylesheets across repeated updates', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    root.append(container);
    const unrelated = {} as CSSStyleSheet;
    const applicationStylesheet = {
      replaceSync: jest.fn(),
    } as unknown as CSSStyleSheet;
    const cssVariableOverrideStylesheet = {
      replaceSync: jest.fn(),
    } as unknown as CSSStyleSheet;
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
