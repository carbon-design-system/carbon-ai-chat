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
import { waitFor } from '@testing-library/react';
import type NativeChatHeader from '@carbon/ai-chat-components/es/components/chat-shell/src/chat-header.js';
import HeaderView from '../../../src/chat/components/header/chat-header';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { NamespaceService } from '../../../src/chat/services/NamespaceService';
import { createIntl } from '../../../src/chat/utils/i18n';
import actions from '../../../src/chat/store/actions';
import {
  BusEventType,
  HeaderMenuClickType,
} from '../../../src/types/events/eventBusTypes';
import type { HeaderConfig } from '../../../src/types/config/HeaderConfig';
import { WriteableElementName } from '../../../src/types/instance/WriteableElements';
import {
  applyConfigChange,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class HeaderProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-header-provider', HeaderProvider);
const testStates = new Set<ChatViewState>();
const descriptor = {
  elem: 'svg',
  name: 'test-descriptor',
  size: 16,
  attrs: { viewBox: '0 0 16 16', width: 16, height: 16 },
  content: [{ elem: 'path', attrs: { d: 'M1 1h14v14H1z' } }],
};

async function createHeader(
  header: HeaderConfig = {},
  beforeConnect?: (view: HeaderView) => void
) {
  const config = {
    assistantName: 'Assistant',
    homescreen: { isOn: true },
    header: {
      title: 'Chat title',
      name: 'Chat name',
      showRestartButton: true,
      ...header,
    },
  };
  const store = makeConfigStore(config);
  const subscriptions = new Set<() => void>();
  let subscriptionPeak = 0;
  const subscribe = store.subscribe;
  store.subscribe = (listener) => {
    subscriptions.add(listener);
    subscriptionPeak = Math.max(subscriptionPeak, subscriptions.size);
    const release = subscribe(listener);
    return () => {
      subscriptions.delete(listener);
      release();
    };
  };
  const writeableElements = Object.fromEntries(
    [
      WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT,
      WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS,
      WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT,
      WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT,
    ].map((name) => {
      const element = document.createElement('div');
      element.slot = name;
      return [name, element];
    })
  );
  const order: string[] = [];
  const fire = jest.fn((event) => {
    order.push(`event:${event.clickType}`);
  });
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    namespace: new NamespaceService('header-test'),
    writeableElements,
    fire,
    actions: { errorOccurred: jest.fn() },
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
  state.connect();
  testStates.add(state);
  const host = document.createElement(
    'test-native-header-provider'
  ) as HeaderProvider;
  host.provider.setValue(state);
  host.append(...Object.values(writeableElements));
  document.body.appendChild(host);
  await host.updateComplete;
  const view = document.createElement('cds-aichat-header-view') as HeaderView;
  view.onClose = jest.fn(() => {
    order.push('close');
  });
  view.onRestart = jest.fn(() => {
    order.push('restart');
  });
  view.onToggleHomeScreen = jest.fn(() => {
    order.push('home');
  });
  beforeConnect?.(view);
  host.shadowRoot.appendChild(view);
  await view.updateComplete;
  const base = () =>
    view.querySelector('cds-aichat-chat-header') as NativeChatHeader;
  return {
    config,
    host,
    view,
    base,
    state,
    store,
    manager,
    writeableElements,
    subscriptions,
    order,
    fire,
    get subscriptionPeak() {
      return subscriptionPeak;
    },
  };
}

describe('native header', () => {
  beforeEach(setupBeforeEach);
  afterEach(() => {
    setupAfterEach();
    testStates.forEach((state) => state.disconnect());
    testStates.clear();
    jest.restoreAllMocks();
  });

  it('wires configured actions and navigation to the existing native header and callbacks', async () => {
    const customClick = jest.fn();
    const { view, base, fire, order } = await createHeader({
      actions: [
        {
          text: 'Custom action',
          icon: descriptor,
          onClick: customClick,
          disabled: true,
        },
      ],
    });
    expect(view.shadowRoot).toBeNull();
    expect(base().headerTitle).toBe('Chat title');
    expect(base().headerName).toBe('Chat name');
    expect(base().navigationType).toBe('back');
    expect(base().actions.map((action) => action.text)).toEqual([
      'Custom action',
      'Restart conversation',
      'Close the chat window',
    ]);
    expect(base().actions[0]).toEqual(
      expect.objectContaining({ onClick: customClick, disabled: true })
    );
    base().actions[1].onClick();
    base().actions[2].onClick();
    base().navigationBackOnClick();
    expect(view.onRestart).toHaveBeenCalledTimes(1);
    expect(view.onClose).toHaveBeenCalledTimes(1);
    expect(view.onToggleHomeScreen).toHaveBeenCalledTimes(1);
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({
        type: BusEventType.HEADER_MENU_CLICK,
        clickType: HeaderMenuClickType.HOMESCREEN_BUTTON,
        menuItemText: base().navigationBackLabel,
      })
    );
    expect(order).toEqual([
      'restart',
      'close',
      `event:${HeaderMenuClickType.HOMESCREEN_BUTTON}`,
      'home',
    ]);
  });

  it('keeps overflow events, inserted home indices, links, and callbacks wired in order', async () => {
    const custom = jest.fn();
    const { base, view, fire, order } = await createHeader({
      menuOptions: [
        { text: 'Custom entry', handler: custom },
        {
          text: 'Documentation',
          href: 'https://example.com/docs',
          target: '_blank',
          disabled: true,
        },
      ],
    });
    expect(base().navigationType).toBe('overflow');
    const items = base().navigationOverflowItems;
    expect(items.map((item) => item.text)).toEqual([
      'Home screen',
      'Custom entry',
      'Documentation',
    ]);
    expect(items[2]).toEqual(
      expect.objectContaining({
        href: 'https://example.com/docs',
        target: '_blank',
        disabled: true,
      })
    );
    expect(items[2].onClick).toBeUndefined();
    base().navigationOverflowOnClick();
    items[0].onClick();
    items[1].onClick();
    expect(view.onToggleHomeScreen).toHaveBeenCalledTimes(1);
    expect(custom).toHaveBeenCalledTimes(1);
    expect(fire.mock.calls.map(([event]) => event.clickType)).toEqual([
      HeaderMenuClickType.OVERFLOW_MENU_OPENED,
      HeaderMenuClickType.OVERFLOW_MENU_ITEM,
      HeaderMenuClickType.OVERFLOW_MENU_ITEM,
    ]);
    expect(fire.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        menuItemIndex: 1,
        menuItemText: 'Custom entry',
      })
    );
    expect(
      order.indexOf(`event:${HeaderMenuClickType.OVERFLOW_MENU_ITEM}`)
    ).toBeLessThan(order.indexOf('home'));
  });

  it('updates current view controls, overrides, and localized labels', async () => {
    const { config, base, view, store } = await createHeader();
    view.isHomeScreenActive = true;
    await view.updateComplete;
    expect(base().navigationType).toBe('none');
    view.isHomeScreenActive = false;
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        isConnecting: true,
      })
    );
    await view.updateComplete;
    expect(base().navigationType).toBe('none');
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        isConnecting: false,
      })
    );
    view.headerConfigOverride = {
      title: 'Mobile history',
      hideMinimizeButton: true,
    };
    await view.updateComplete;
    expect(base().headerTitle).toBe('Mobile history');
    expect(base().actions).toHaveLength(1);
    view.headerConfigOverride = undefined;
    applyConfigChange(store, {
      ...config,
      header: {
        ...config.header,
        title: 'Updated title',
        hasContentMaxWidth: true,
      },
      strings: {
        homeScreen_returnToHome: 'Accueil',
        buttons_restart: 'Recommencer',
        launcher_isOpen: 'Réduire',
      },
    });
    await view.updateComplete;
    expect(base().headerTitle).toBe('Updated title');
    expect(base().navigationBackLabel).toBe('Accueil');
    expect(base().actions.map((action) => action.text)).toEqual([
      'Recommencer',
      'Réduire',
    ]);
    expect(
      view.querySelector('.cds-aichat--header-constrain-width')
    ).not.toBeNull();
  });

  it('does not update for unrelated assistant or agent typing and window changes', async () => {
    const { view, state, store } = await createHeader();
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
    state.setWindowSize({ width: 420, height: 600 });
    await Promise.resolve();
    await view.updateComplete;
    expect(renderView).not.toHaveBeenCalled();
  });

  it('keeps AI label and fixed-action slots direct and preserves custom nodes when content changes', async () => {
    const { host, view, base, writeableElements } = await createHeader();
    const label = view.querySelector('cds-ai-label');
    expect(label.parentElement).toBe(base());
    expect(label.slot).toBe('decorator');
    expect(
      view.querySelector('.cds-aichat--header__slug-label')
    ).not.toBeNull();
    const content =
      writeableElements[WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT];
    const slot = view.querySelector<HTMLSlotElement>(
      `slot[name="${content.slot}"]`
    );
    expect(slot.getRootNode()).toBe(host.shadowRoot);
    expect(content.assignedSlot).toBe(slot);
    expect(slot.parentElement.slot).toBe('body-text');
    expect(slot.parentElement.parentElement).toBe(label);
    const button = document.createElement('button');
    button.textContent = 'Custom explanation';
    content.appendChild(button);
    await waitFor(() =>
      expect(view.querySelector('.cds-aichat--header__slug-label')).toBeNull()
    );
    expect(content.assignedSlot).toBe(slot);
    expect(button.parentElement).toBe(content);
    expect(view.querySelector('cds-ai-label')).toBe(label);
    const fixed =
      writeableElements[WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT];
    expect(fixed.assignedSlot.parentElement.slot).toBe('fixed-actions');
    expect(fixed.assignedSlot.parentElement.parentElement).toBe(base());
    button.remove();
    await waitFor(() =>
      expect(
        view.querySelector('.cds-aichat--header__slug-label')
      ).not.toBeNull()
    );
    expect(view.querySelector('cds-ai-label')).toBe(label);
    expect(content.assignedSlot).toBe(slot);
  });

  it.each(['initial', 'later'])(
    'restores actions when the same element reconnects after an %s icon-normalizer failure',
    async (phase) => {
      const failure = new Error('header icon normalization failed');
      let shouldFail = phase === 'initial';
      const normalize = jest.fn(() => {
        if (shouldFail) {
          throw failure;
        }
        return descriptor;
      });
      const fixture = await createHeader(
        {
          actions: [
            { text: 'Custom action', icon: descriptor, onClick: jest.fn() },
          ],
        },
        (view) => {
          view.transformIcon = normalize;
        }
      );
      const { view, host, base, store, manager, subscriptions } = fixture;
      const errors = manager.actions.errorOccurred as jest.Mock;
      if (phase === 'later') {
        expect(base().actions).toHaveLength(3);
        shouldFail = true;
        store.dispatch(actions.setAppStateValue('isRestarting', true));
        await view.updateComplete;
      }
      await view.updateComplete;
      expect(errors).toHaveBeenCalledTimes(1);
      expect(errors).toHaveBeenCalledWith(
        expect.objectContaining({
          otherData: expect.objectContaining({ error: failure }),
        })
      );
      expect(subscriptions.size).toBe(0);
      expect(view.querySelector('cds-aichat-chat-header')).toBeNull();
      const close = view.onClose;
      const expectedSubscriptions = fixture.subscriptionPeak;
      view.remove();
      shouldFail = false;
      host.shadowRoot.appendChild(view);
      await view.updateComplete;
      expect(view.transformIcon).toBe(normalize);
      expect(view.onClose).toBe(close);
      expect(base().actions).toHaveLength(3);
      expect(base().actions.map((action) => action.icon)).toEqual([
        descriptor,
        descriptor,
        descriptor,
      ]);
      base().actions[2].onClick();
      expect(close).toHaveBeenCalledTimes(1);
      expect(errors).toHaveBeenCalledTimes(1);
      expect(subscriptions.size).toBe(expectedSubscriptions);
      const renderView = jest.spyOn(view as any, 'renderView');
      store.dispatch(
        actions.setAppStateValue('isRestarting', phase === 'initial')
      );
      await view.updateComplete;
      expect(renderView).toHaveBeenCalledTimes(1);
      expect(subscriptions.size).toBe(expectedSubscriptions);
      expect(errors).toHaveBeenCalledTimes(1);
    }
  );

  it('delegates focus and releases selected subscriptions and writable observers on detach', async () => {
    const observe = jest.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = jest.spyOn(MutationObserver.prototype, 'disconnect');
    const {
      config,
      view,
      host,
      base,
      store,
      subscriptions,
      writeableElements,
    } = await createHeader();
    const focus = jest.spyOn(base(), 'requestFocus').mockReturnValue(true);
    expect(view.requestFocus()).toBe(true);
    expect(focus).toHaveBeenCalledTimes(1);
    const count = subscriptions.size;
    expect(count).toBeGreaterThan(0);
    const observerIndex = observe.mock.calls.findIndex(
      ([target]) => target === host
    );
    expect(observerIndex).toBeGreaterThanOrEqual(0);
    const observer = observe.mock.contexts[observerIndex];
    const renderView = jest.spyOn(view as any, 'renderView');
    view.remove();
    expect(view.requestFocus()).toBe(false);
    expect(subscriptions.size).toBe(0);
    expect(
      disconnect.mock.contexts.filter((value) => value === observer)
    ).toHaveLength(1);
    applyConfigChange(store, {
      ...config,
      header: { title: 'Changed while detached' },
    });
    writeableElements[
      WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT
    ].appendChild(document.createElement('p'));
    await Promise.resolve();
    expect(renderView).not.toHaveBeenCalled();
    host.shadowRoot.appendChild(view);
    await view.updateComplete;
    expect(subscriptions.size).toBe(count);
    expect(base().headerTitle).toBe('Changed while detached');
    expect(view.querySelector('.cds-aichat--header__slug-label')).toBeNull();
    renderView.mockClear();
    applyConfigChange(store, {
      ...config,
      header: { title: 'Connected again' },
    });
    await view.updateComplete;
    expect(renderView).toHaveBeenCalledTimes(1);
  });
});
