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
import HomeScreenView from '../components/homeScreen/home-screen';
import { chatMountStateContext } from '../../web-components/shared/chat-mount-state-context';
import { ChatMountState } from '../services/chatMountState';
import type { ServiceManager } from '../../sdk/services/ServiceManager';
import { NamespaceService } from '../../sdk/services/NamespaceService';
import { createIntl } from '../../sdk/utils/i18n';
import actions from '../../sdk/store/actions';
import { ChatContainer } from '../../react/ChatContainer';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import { OnErrorType, type OnErrorData } from '../../types/config/ErrorConfig';
import { WriteableElementName } from '../../types/instance/WriteableElements';
import {
  applyConfigChange,
  createBaseConfig,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from './helpers/chat';
import { chatStore } from '../services/attachChatView';

class HomeProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatMountStateContext,
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

const testStates = new Set<ChatMountState>();

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
  const errorOccurred = vi.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    namespace: new NamespaceService('home-test'),
    // The chat's instance holds its writeable elements.
    instance: {
      writeableElements: {
        [WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT]: writable,
      },
    },
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatMountState(manager, { width: 800, height: 600 });
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
  view.onSendInput = vi.fn().mockResolvedValue(undefined);
  view.onToggleHomeScreen = vi.fn();
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
  const persisted = store.getState().view.persistedToBrowserStorage;
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
    vi.restoreAllMocks();
  });

  it('samples writable content at render without replacing the slot, borrowed host, or descendants', async () => {
    const { view, host, store, writable } = await createHome();
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
    await Promise.resolve();
    await view.updateComplete;
    expect(
      body(view).classList.contains(
        'cds-aichat--home-screen__body--no-custom-content'
      )
    ).toBe(true);
    showBack(store);
    await view.updateComplete;
    expect(
      body(view).classList.contains(
        'cds-aichat--home-screen__body--custom-content'
      )
    ).toBe(true);
    counter.click();
    expect(counter.textContent).toBe('1');
    expect(view.querySelector('slot')).toBe(slot);
    expect(writable.assignedSlot).toBe(slot);
    expect(counter.parentNode).toBe(writable);
    counter.remove();
    await Promise.resolve();
    await view.updateComplete;
    expect(
      body(view).classList.contains(
        'cds-aichat--home-screen__body--custom-content'
      )
    ).toBe(true);
    applyConfigChange(store, {
      homescreen: { ...homescreen, greeting: 'Again' },
    });
    await view.updateComplete;
    expect(
      body(view).classList.contains(
        'cds-aichat--home-screen__body--no-custom-content'
      )
    ).toBe(true);
    writable.appendChild(counter);
    applyConfigChange(store, {
      homescreen: { ...homescreen, greeting: 'Last' },
    });
    await view.updateComplete;
    expect(
      body(view).classList.contains(
        'cds-aichat--home-screen__body--custom-content'
      )
    ).toBe(true);
    expect(counter.textContent).toBe('1');
    expect(view.querySelector('slot')).toBe(slot);
  });

  it('releases subscriptions on detach, then reads current values on reconnect', async () => {
    const { view, host, store, writable, subscriptions } = await createHome();
    const connectedSubscriptions = subscriptions.size;
    expect(connectedSubscriptions).toBeGreaterThan(0);
    const renderView = vi.spyOn(view as any, 'renderView');
    view.remove();
    expect(subscriptions.size).toBe(0);
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

  it('delivers native errors through the mounted chat callback and its configured error panel once', async () => {
    let instance: ChatInstance;
    const after = vi.fn();
    const onError = vi.fn((error: OnErrorData) => {
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
    await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    });
    const host = document.querySelector('cds-aichat-container');
    const target = host.shadowRoot.querySelector('.cds-aichat--react-app');
    const shell = host.shadowRoot.querySelector('.cds-aichat--widget');
    const native = host.shadowRoot.querySelector('cds-aichat-home-screen');
    expect(native.querySelector('h2')?.textContent).toBe('Welcome');
    const errorOccurred = vi.spyOn(
      instance.serviceManager.actions,
      'errorOccurred'
    );
    const failure = new Error('mounted native home update failed');
    vi.spyOn(native as any, 'renderView').mockImplementation(() => {
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
    expect(
      chatStore(instance.serviceManager).getState().view.catastrophicErrorType
    ).toBe(true);
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
    await waitFor(() => expect(after).toHaveBeenCalledTimes(2), {
      timeout: 5000,
    });
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
      chatStore(instance.serviceManager).getState().view.catastrophicErrorType
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
    vi.spyOn(retired.view as any, 'renderView').mockImplementation(() => {
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
