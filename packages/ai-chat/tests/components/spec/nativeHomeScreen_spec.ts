/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import HomeScreenView from '../../../src/chat/components/homeScreen/home-screen';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { NamespaceService } from '../../../src/chat/services/NamespaceService';
import { createIntl } from '../../../src/chat/utils/i18n';
import actions from '../../../src/chat/store/actions';
import { ChatContainer } from '../../../src/react/ChatContainer';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  OnErrorType,
  type OnErrorData,
} from '../../../src/types/config/ErrorConfig';
import { MessageSendSource } from '../../../src/types/events/eventBusTypes';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import {
  applyConfigChange,
  createBaseConfig,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class HomeProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });

  render() {
    return nothing;
  }
}
customElements.define('test-native-home-provider', HomeProvider);

const homescreen = {
  isOn: true,
  greeting: 'Welcome',
  starters: {
    isOn: true,
    buttons: [{ label: 'First question' }, { label: 'Second question' }],
  },
};

const testStates = new Set<ChatViewState>();

async function createHome() {
  const store = makeConfigStore({ homescreen });
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
  const writable = document.createElement('div');
  writable.slot = WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT;
  const errorOccurred = jest.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    namespace: new NamespaceService('home-test'),
    writeableElements: {
      [WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT]: writable,
    },
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
  state.connect();
  testStates.add(state);
  const host = document.createElement(
    'test-native-home-provider'
  ) as HomeProvider;
  host.provider.setValue(state);
  host.appendChild(writable);
  document.body.appendChild(host);
  await host.updateComplete;
  const view = document.createElement(
    'cds-aichat-home-screen'
  ) as HomeScreenView;
  view.onSendInput = jest.fn().mockResolvedValue(undefined);
  view.onToggleHomeScreen = jest.fn();
  view.isHydrated = true;
  host.shadowRoot.appendChild(view);
  await view.updateComplete;
  return {
    host,
    view,
    state,
    store,
    manager,
    writable,
    errorOccurred,
    subscriptions,
  };
}

function showBack(store: ReturnType<typeof makeConfigStore>) {
  const persisted = store.getState().persistedToBrowserStorage;
  store.dispatch(
    actions.updatePersistedState({
      homeScreenState: {
        ...persisted.homeScreenState,
        showBackToAssistant: true,
      },
    })
  );
}

function body(view: HomeScreenView) {
  return view.querySelector('.cds-aichat--home-screen__body');
}

describe('native home screen', () => {
  beforeEach(setupBeforeEach);
  afterEach(() => {
    setupAfterEach();
    testStates.forEach((state) => state.disconnect());
    testStates.clear();
    jest.restoreAllMocks();
  });

  it('renders greeting and controls in the existing shadow root and preserves starter send arguments', async () => {
    const { view, host } = await createHome();
    expect(view.shadowRoot).toBeNull();
    expect(view.querySelector('h2')?.textContent).toBe('Welcome');
    expect(
      view.querySelector('[role="dialog"]')?.getAttribute('aria-label')
    ).toBeTruthy();
    expect(view.getRootNode()).toBe(host.shadowRoot);
    const starters = view.querySelectorAll<HTMLElement>(
      '.cds-aichat--home-screen__starter'
    );
    expect([...starters].map((button) => button.textContent.trim())).toEqual([
      'First question',
      'Second question',
    ]);
    starters[1].click();
    expect(view.onSendInput).toHaveBeenCalledTimes(1);
    expect(view.onSendInput).toHaveBeenCalledWith(
      'Second question',
      MessageSendSource.HOME_SCREEN_STARTER
    );
    expect(
      view.querySelector('.cds-aichat--home-screen--hydration-complete')
    ).not.toBeNull();
  });

  it('calls the existing back callback and refreshes selected config and labels', async () => {
    const { view, store } = await createHome();
    showBack(store);
    await view.updateComplete;
    const back = view.querySelector<HTMLElement>(
      '.cds-aichat--home-screen__back-button'
    );
    back.click();
    expect(view.onToggleHomeScreen).toHaveBeenCalledTimes(1);
    const renderView = jest.spyOn(view as any, 'renderView');
    applyConfigChange(store, {
      homescreen: {
        ...homescreen,
        greeting: 'Bonjour',
        starters: { isOn: false },
      },
      strings: {
        homeScreen_ariaHomeScreenContent: 'Accueil',
        homeScreen_returnToAssistant: 'Retour',
      },
    });
    await view.updateComplete;
    expect(renderView).toHaveBeenCalled();
    expect(view.querySelector('h2')?.textContent).toBe('Bonjour');
    expect(
      view.querySelectorAll('.cds-aichat--home-screen__starter')
    ).toHaveLength(0);
    expect(
      view.querySelector('[role="dialog"]')?.getAttribute('aria-label')
    ).toBe('Accueil');
    expect(
      view.querySelector('.cds-aichat--home-screen__back-button')?.textContent
    ).toContain('Retour');
    applyConfigChange(store, {
      homescreen: { ...homescreen, customContentOnly: true },
    });
    await view.updateComplete;
    expect(view.querySelector('h2')).toBeNull();
    expect(
      body(view).classList.contains(
        'cds-aichat--home-screen__body--custom-content-only'
      )
    ).toBe(true);
  });

  it('does not render for unrelated assistant or agent typing, visibility, or window-size changes', async () => {
    const { view, state, store } = await createHome();
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
    store.dispatch(actions.setAppStateValue('isBrowserPageVisible', false));
    state.setWindowSize({ width: 420, height: 700 });
    await Promise.resolve();
    await view.updateComplete;
    expect(renderView).not.toHaveBeenCalled();
    expect(view.querySelector('h2')?.textContent).toBe('Welcome');
  });

  it('observes writable content without replacing the slot, borrowed host, or descendants', async () => {
    const { view, host, writable } = await createHome();
    const slot = view.querySelector<HTMLSlotElement>('slot');
    expect(slot.name).toBe(
      WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT
    );
    expect(slot.getRootNode()).toBe(host.shadowRoot);
    expect(writable.assignedSlot).toBe(slot);
    expect(
      body(view).classList.contains(
        'cds-aichat--home-screen__body--no-custom-content'
      )
    ).toBe(true);
    const counter = document.createElement('button');
    counter.textContent = '0';
    counter.onclick = () => {
      counter.textContent = String(Number(counter.textContent) + 1);
    };
    writable.appendChild(counter);
    await waitFor(() =>
      expect(
        body(view).classList.contains(
          'cds-aichat--home-screen__body--custom-content'
        )
      ).toBe(true)
    );
    counter.click();
    expect(counter.textContent).toBe('1');
    expect(view.querySelector('slot')).toBe(slot);
    expect(writable.assignedSlot).toBe(slot);
    expect(counter.parentNode).toBe(writable);
    counter.remove();
    await waitFor(() =>
      expect(
        body(view).classList.contains(
          'cds-aichat--home-screen__body--no-custom-content'
        )
      ).toBe(true)
    );
    writable.appendChild(counter);
    await waitFor(() =>
      expect(
        body(view).classList.contains(
          'cds-aichat--home-screen__body--custom-content'
        )
      ).toBe(true)
    );
    expect(counter.textContent).toBe('1');
    expect(view.querySelector('slot')).toBe(slot);
  });

  it('releases subscriptions and observers on detach, then reads current values on reconnect', async () => {
    const observe = jest.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = jest.spyOn(MutationObserver.prototype, 'disconnect');
    const { view, host, store, writable, subscriptions } = await createHome();
    const connectedSubscriptions = subscriptions.size;
    expect(connectedSubscriptions).toBeGreaterThan(0);
    const observerIndex = observe.mock.calls.findIndex(
      ([target]) => target === host
    );
    expect(observerIndex).toBeGreaterThanOrEqual(0);
    const observer = observe.mock.contexts[observerIndex];
    const renderView = jest.spyOn(view as any, 'renderView');
    view.remove();
    expect(subscriptions.size).toBe(0);
    expect(
      disconnect.mock.contexts.filter((value) => value === observer)
    ).toHaveLength(1);
    applyConfigChange(store, {
      homescreen: { ...homescreen, greeting: 'While detached' },
    });
    writable.appendChild(document.createElement('input'));
    await Promise.resolve();
    expect(renderView).not.toHaveBeenCalled();
    host.shadowRoot.appendChild(view);
    await view.updateComplete;
    expect(subscriptions.size).toBe(connectedSubscriptions);
    expect(view.querySelector('h2')?.textContent).toBe('While detached');
    expect(
      body(view).classList.contains(
        'cds-aichat--home-screen__body--custom-content'
      )
    ).toBe(true);
    renderView.mockClear();
    applyConfigChange(store, {
      homescreen: { ...homescreen, greeting: 'Connected again' },
    });
    await view.updateComplete;
    expect(renderView).toHaveBeenCalledTimes(1);
    expect(view.querySelector('h2')?.textContent).toBe('Connected again');
  });

  it.each(['renderView', 'updated'])(
    'reports a native %s failure once and keeps its fallback safe on later updates',
    async (method) => {
      const { view, errorOccurred } = await createHome();
      const failure = new Error('native home render failed');
      jest.spyOn(view as any, method).mockImplementation(() => {
        throw failure;
      });
      view.requestUpdate();
      await view.updateComplete;
      await view.updateComplete;
      expect(errorOccurred).toHaveBeenCalledTimes(1);
      expect(errorOccurred).toHaveBeenCalledWith(
        expect.objectContaining({
          otherData: expect.objectContaining({ error: failure }),
          catastrophicErrorType: true,
        })
      );
      expect(view.querySelector('h2')).toBeNull();
      view.requestUpdate();
      await view.updateComplete;
      expect(errorOccurred).toHaveBeenCalledTimes(1);
    }
  );

  it('delivers native errors through the mounted chat callback and its configured error panel once', async () => {
    let instance: ChatInstance;
    const after = jest.fn();
    const onError = jest.fn((error: OnErrorData) => {
      if (error.errorType === OnErrorType.RENDER) {
        instance.updateCatastrophicErrorPanel({
          isOpen: true,
          title: 'Home screen unavailable',
          bodyText: 'The host handled this native render error.',
        });
      }
    });
    const mount = (key: string, greeting = 'Welcome') =>
      React.createElement(ChatContainer, {
        ...createBaseConfig(),
        key,
        homescreen: { ...homescreen, greeting },
        openChatByDefault: true,
        onBeforeRender: (chat) => {
          instance = chat;
        },
        onAfterRender: after,
        onError,
      });
    const mounted = render(mount('first'));
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
    const host = document.querySelector('cds-aichat-container');
    const target = host.shadowRoot.querySelector('.cds-aichat--react-app');
    const shell = host.shadowRoot.querySelector('.cds-aichat--widget');
    const native = host.shadowRoot.querySelector('cds-aichat-home-screen');
    expect(native.querySelector('h2')?.textContent).toBe('Welcome');
    const errorOccurred = jest.spyOn(
      instance.serviceManager.actions,
      'errorOccurred'
    );
    const failure = new Error('mounted native home update failed');
    jest.spyOn(native as any, 'renderView').mockImplementation(() => {
      throw failure;
    });
    act(() => {
      native.requestUpdate();
    });
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(errorOccurred).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: OnErrorType.RENDER,
        catastrophicErrorType: true,
        otherData: expect.objectContaining({ error: failure }),
      })
    );
    await waitFor(() =>
      expect(
        host.shadowRoot.querySelector(
          '.cds-aichat--catastrophic-error__error-heading'
        )?.textContent
      ).toBe('Home screen unavailable')
    );
    const panel = host.shadowRoot
      .querySelector('.cds-aichat--catastrophic-error')
      .closest('cds-aichat-panel') as HTMLElement & { open: boolean };
    expect(panel.open).toBe(true);
    expect(instance.serviceManager.store.getState().catastrophicErrorType).toBe(
      true
    );
    expect(
      host.shadowRoot.querySelectorAll('.cds-aichat--catastrophic-error')
    ).toHaveLength(1);
    expect(host.shadowRoot.querySelector('.cds-aichat--react-app')).toBe(
      target
    );
    expect(host.shadowRoot.querySelector('.cds-aichat--widget')).toBe(shell);

    mounted.rerender(mount('first', 'A later config update'));
    act(() => {
      native.requestUpdate();
    });
    await native.updateComplete;
    expect(onError).toHaveBeenCalledTimes(1);
    expect(errorOccurred).toHaveBeenCalledTimes(1);
    expect(panel.open).toBe(true);

    const retired = instance;
    mounted.rerender(mount('replacement'));
    await waitFor(() => expect(after).toHaveBeenCalledTimes(2));
    expect(instance).not.toBe(retired);
    const currentHost = document.querySelector('cds-aichat-container');
    const currentPanel = currentHost.shadowRoot
      .querySelector('.cds-aichat--catastrophic-error')
      .closest('cds-aichat-panel') as HTMLElement & { open: boolean };
    act(() => {
      native.requestUpdate();
    });
    await native.updateComplete;
    expect(native.isConnected).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(errorOccurred).toHaveBeenCalledTimes(1);
    expect(
      instance.serviceManager.store.getState().catastrophicErrorType
    ).toBeUndefined();
    expect(currentPanel.open).toBe(false);
    expect(
      currentHost.shadowRoot.querySelector('cds-aichat-home-screen h2')
        ?.textContent
    ).toBe('Welcome');
  });

  it('does not report a retired view failure into its replacement chat context', async () => {
    const retired = await createHome();
    const current = await createHome();
    const failure = new Error('retired home update failed');
    jest.spyOn(retired.view as any, 'renderView').mockImplementation(() => {
      throw failure;
    });
    retired.view.requestUpdate();
    retired.view.remove();
    retired.host.provider.setValue(current.state);
    await Promise.resolve();
    await retired.view.updateComplete;
    expect(retired.errorOccurred).not.toHaveBeenCalled();
    expect(current.errorOccurred).not.toHaveBeenCalled();
    expect(current.view.querySelector('h2')?.textContent).toBe('Welcome');
  });
});
