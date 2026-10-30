/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type CDSButton from '@carbon/web-components/es/components/button/button.js';
import type NativePanel from '@carbon/ai-chat-components/es/components/chat-shell/src/panel.js';
import DisclaimerBody from '../../../src/chat/components/panels/native/DisclaimerBody';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { createIntl } from '../../../src/chat/utils/i18n';
import actions from '../../../src/chat/store/actions';
import { ChatWidthBreakpoint } from '../../../src/types/state/AppState';
import { CarbonTheme } from '../../../src/types/config/CarbonTheme';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  applyConfigChange,
  createBaseConfig,
  getChatHost,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class DisclaimerProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-disclaimer-provider', DisclaimerProvider);
const testStates = new Set<ChatViewState>();

async function flush(view: DisclaimerBody) {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
  }
}

async function createBody() {
  const store = makeConfigStore({});
  store.dispatch(actions.setViewState({ mainWindow: true, launcher: false }));
  const subscriptions = new Set<() => void>();
  const subscribe = store.subscribe;
  store.subscribe = (listener) => {
    subscriptions.add(listener);
    const release = subscribe(listener);
    return () => {
      subscriptions.delete(listener);
      release();
    };
  };
  const errorOccurred = jest.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
  state.connect();
  testStates.add(state);
  const host = document.createElement(
    'test-native-disclaimer-provider'
  ) as DisclaimerProvider;
  host.provider.setValue(state);
  document.body.appendChild(host);
  await host.updateComplete;
  const panel = document.createElement('cds-aichat-panel') as NativePanel;
  const wrapper = document.createElement('div');
  wrapper.slot = 'body';
  const view = document.createElement(
    'cds-aichat-disclaimer-body'
  ) as DisclaimerBody;
  view.disclaimerHTML =
    '<p data-terms>Read these terms.</p><input data-stateful value="initial">';
  view.onReadChange = jest.fn();
  wrapper.appendChild(view);
  panel.appendChild(wrapper);
  panel.addEventListener('body-scroll', (event) =>
    view.observeScroll((event as CustomEvent).detail)
  );
  host.shadowRoot.appendChild(panel);
  await panel.updateComplete;
  await flush(view);
  const scrollBody = panel.shadowRoot.querySelector<HTMLElement>('.panel-body');
  return {
    host,
    panel,
    wrapper,
    view,
    store,
    state,
    scrollBody,
    subscriptions,
    errorOccurred,
  };
}

function setMetrics(
  element: HTMLElement,
  height: number,
  viewport: number,
  top = 0
) {
  Object.defineProperties(element, {
    scrollHeight: { configurable: true, value: height },
    clientHeight: { configurable: true, value: viewport },
    scrollTop: { configurable: true, writable: true, value: top },
  });
}

describe('native disclaimer body', () => {
  // Acceptance persists to session storage; each case starts unaccepted.
  beforeEach(() => {
    setupBeforeEach();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  afterEach(() => {
    setupAfterEach();
    testStates.forEach((state) => state.disconnect());
    testStates.clear();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders the original HTML and direct illustration in the existing panel body slot', async () => {
    const { host, view, panel, wrapper } = await createBody();
    expect(view.shadowRoot).toBeNull();
    expect(view.getRootNode()).toBe(host.shadowRoot);
    expect(wrapper.parentElement).toBe(panel);
    expect(wrapper.slot).toBe('body');
    expect(view.querySelector('h1')?.textContent).toBe('Disclaimer');
    expect(view.querySelector('[data-terms]')?.textContent).toBe(
      'Read these terms.'
    );
    const svg = view.querySelector('.cds-aichat--disclaimer__icon > svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-label')).toBe('Disclaimer icon');
  });

  it('runs the three open probes and marks short content read only once', async () => {
    jest.useFakeTimers();
    const { view, scrollBody } = await createBody();
    setMetrics(scrollBody, 100, 100);
    const scroll = jest.fn();
    scrollBody.addEventListener('scroll', scroll);
    jest.advanceTimersByTime(99);
    expect(scroll).not.toHaveBeenCalled();
    expect(view.onReadChange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(view.onReadChange).toHaveBeenCalledWith(true);
    jest.advanceTimersByTime(200);
    expect(scroll).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(200);
    expect(scroll).toHaveBeenCalledTimes(3);
    expect(view.onReadChange).toHaveBeenCalledTimes(1);
  });

  it('keeps long content unread until the bottom and retains the read flag through later updates', async () => {
    jest.useFakeTimers();
    const { view, scrollBody, store } = await createBody();
    setMetrics(scrollBody, 1000, 100);
    jest.advanceTimersByTime(500);
    expect(view.onReadChange).not.toHaveBeenCalled();
    scrollBody.scrollTop = 900;
    scrollBody.dispatchEvent(new Event('scroll'));
    expect(view.onReadChange).toHaveBeenCalledTimes(1);
    expect(view.onReadChange).toHaveBeenCalledWith(true);
    applyConfigChange(store, {
      strings: { disclaimer_title: 'Conditions' },
      injectCarbonTheme: CarbonTheme.G100,
    });
    await flush(view);
    scrollBody.scrollTop = 0;
    scrollBody.dispatchEvent(new Event('scroll'));
    view.disclaimerHTML = '<p>Updated terms</p>';
    await flush(view);
    expect(view.querySelector('h1')?.textContent).toBe('Conditions');
    expect(view.onReadChange).toHaveBeenCalledTimes(1);
  });

  it('updates theme and locale without replacing HTML descendants or reacting to unrelated typing', async () => {
    const { view, state, store } = await createBody();
    const input = view.querySelector<HTMLInputElement>('[data-stateful]');
    input.value = 'Kept';
    const gradientID = view.querySelector('linearGradient').id;
    const renderView = jest.spyOn(view as any, 'renderView');
    store.dispatch(
      actions.setChatMessagesStateProperty('isMessageLoadingCounter', 1)
    );
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        isHumanAgentTyping: true,
      })
    );
    state.setWindowSize({ width: 420, height: 700 });
    await flush(view);
    expect(renderView).not.toHaveBeenCalled();
    applyConfigChange(store, {
      strings: {
        disclaimer_title: 'Conditions',
        disclaimer_icon_label: 'Conditions icon',
      },
      injectCarbonTheme: CarbonTheme.G100,
    });
    await flush(view);
    expect(view.querySelector('h1')?.textContent).toBe('Conditions');
    expect(view.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Conditions icon'
    );
    expect(view.querySelector('linearGradient').id).toBe(gradientID);
    expect(view.querySelector('[data-stateful]')).toBe(input);
    expect(input.value).toBe('Kept');
  });

  it('cancels closed or detached probes and restores one current subscription set on reconnect', async () => {
    jest.useFakeTimers();
    const { wrapper, view, scrollBody, store, subscriptions } =
      await createBody();
    const count = subscriptions.size;
    expect(count).toBeGreaterThan(0);
    const scroll = jest.fn();
    scrollBody.addEventListener('scroll', scroll);
    store.dispatch(actions.setViewState({ mainWindow: false, launcher: true }));
    await flush(view);
    jest.advanceTimersByTime(500);
    expect(scroll).not.toHaveBeenCalled();
    store.dispatch(actions.setViewState({ mainWindow: true, launcher: false }));
    await flush(view);
    jest.advanceTimersByTime(50);
    view.remove();
    expect(subscriptions.size).toBe(0);
    jest.advanceTimersByTime(500);
    expect(scroll).not.toHaveBeenCalled();
    view.observeScroll({ isScrollable: false, isAtBottom: false });
    expect(view.onReadChange).not.toHaveBeenCalled();
    wrapper.appendChild(view);
    await flush(view);
    expect(subscriptions.size).toBe(count);
    jest.advanceTimersByTime(100);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(view.onReadChange).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(400);
    expect(scroll).toHaveBeenCalledTimes(3);
    expect(view.onReadChange).toHaveBeenCalledTimes(1);
  });

  it('does not restore measurement timers while rendering a failed native view fallback', async () => {
    jest.useFakeTimers();
    const { view, scrollBody, subscriptions, errorOccurred } =
      await createBody();
    const scroll = jest.fn();
    scrollBody.addEventListener('scroll', scroll);
    jest.spyOn(view as any, 'renderView').mockImplementation(() => {
      throw new Error('disclaimer render failed');
    });
    view.requestUpdate();
    await flush(view);
    expect(errorOccurred).toHaveBeenCalledTimes(1);
    expect(subscriptions.size).toBe(0);
    jest.advanceTimersByTime(500);
    expect(scroll).not.toHaveBeenCalled();
    expect(view.querySelector('h1')).toBeNull();
  });

  it.each([
    ['ChatContainer', ChatContainer],
    ['ChatCustomElement', ChatCustomElement],
  ] as const)(
    'keeps the React Accept footer and native body directly slotted through %s',
    async (_name, Wrapper) => {
      const scrollHeight = Object.getOwnPropertyDescriptor(
        Element.prototype,
        'scrollHeight'
      ).get;
      const clientHeight = Object.getOwnPropertyDescriptor(
        Element.prototype,
        'clientHeight'
      ).get;
      jest
        .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
        .mockImplementation(function (this: HTMLElement) {
          return this.classList.contains('panel-body')
            ? 1000
            : scrollHeight.call(this);
        });
      jest
        .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
        .mockImplementation(function (this: HTMLElement) {
          return this.classList.contains('panel-body')
            ? 100
            : clientHeight.call(this);
        });
      let instance: ChatInstance;
      const after = jest.fn();
      const disclaimer = {
        isOn: true,
        disclaimerHTML:
          '<p>Long terms</p><input data-stateful value="initial">',
      };
      const host = (translated = false) =>
        React.createElement(Wrapper, {
          ...createBaseConfig(),
          className: '',
          openChatByDefault: true,
          disclaimer,
          ...(translated
            ? {
                strings: {
                  disclaimer_title: 'Conditions',
                  disclaimer_accept: 'Agree',
                  disclaimer_acceptance_label: 'Accept conditions',
                },
              }
            : {}),
          onBeforeRender: (chat) => {
            instance = chat;
          },
          onAfterRender: after,
        });
      const mounted = render(host());
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
      // Each wrapper case starts with the disclaimer not yet accepted.
      expect(
        Object.values(
          instance.serviceManager.store.getState().persistedToBrowserStorage
            .disclaimersAccepted
        )
      ).not.toContain(true);
      const chat = getChatHost();
      const native = chat.shadowRoot.querySelector(
        'cds-aichat-disclaimer-body'
      );
      const panel = native.closest<NativePanel>('cds-aichat-panel');
      const accept = panel.querySelector<CDSButton>(
        'cds-button.cds-aichat--disclaimer__accept-button'
      );
      expect(native.parentElement.slot).toBe('body');
      expect(native.parentElement.parentElement).toBe(panel);
      expect(accept.parentElement.slot).toBe('footer');
      expect(accept.parentElement.parentElement).toBe(panel);
      expect(accept.disabled).toBe(true);
      expect(panel.open).toBe(true);
      const scrollBody =
        panel.shadowRoot.querySelector<HTMLElement>('.panel-body');
      fireEvent.scroll(scrollBody);
      expect(accept.disabled).toBe(true);
      await act(async () => {
        scrollBody.scrollTop = 900;
        fireEvent.scroll(scrollBody);
      });
      await waitFor(() => expect(accept.disabled).toBe(false));
      const input = native.querySelector<HTMLInputElement>('[data-stateful]');
      input.value = 'Kept';
      mounted.rerender(host(true));
      act(() => {
        instance.serviceManager.store.dispatch(
          actions.setAppStateValue(
            'chatWidthBreakpoint',
            ChatWidthBreakpoint.WIDE
          )
        );
      });
      await waitFor(() => expect(accept.textContent).toBe('Agree'));
      expect(accept.size).toBe('2xl');
      expect(accept.getAttribute('aria-label')).toBe('Accept conditions');
      expect(
        panel.querySelector('cds-button.cds-aichat--disclaimer__accept-button')
      ).toBe(accept);
      expect(native.querySelector('[data-stateful]')).toBe(input);
      expect(input.value).toBe('Kept');
      expect(accept.disabled).toBe(false);
      fireEvent.click(accept);
      await waitFor(() => expect(panel.open).toBe(false));
      expect(
        Object.values(
          instance.serviceManager.store.getState().persistedToBrowserStorage
            .disclaimersAccepted
        )
      ).toContain(true);
      expect(after).toHaveBeenCalledTimes(1);
    }
  );
});
