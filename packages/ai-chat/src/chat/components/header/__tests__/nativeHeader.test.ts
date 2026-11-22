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
import HeaderView from '../chat-header';
import { chatMountStateContext } from '../../../../web-components/shared/chat-mount-state-context';
import { ChatMountState } from '../../../services/chatMountState';
import type { ServiceManager } from '../../../../sdk/services/ServiceManager';
import { NamespaceService } from '../../../../sdk/services/NamespaceService';
import { createIntl } from '../../../../sdk/utils/i18n';
import type { HeaderConfig } from '../../../../types/config/HeaderConfig';
import { WriteableElementName } from '../../../../types/instance/WriteableElements';
import {
  applyConfigChange,
  makeConfigStore,
  withPublicState,
  setupAfterEach,
  setupBeforeEach,
} from '../../../__tests__/helpers/chat';

class HeaderProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatMountStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-header-provider', HeaderProvider);
const testStates = new Set<ChatMountState>();
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
  const fire = vi.fn((event) => {
    order.push(`event:${event.clickType}`);
  });
  // The header reads agent and restart state from public state, as a host does.
  const manager = withPublicState({
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    namespace: new NamespaceService('header-test'),
    // The chat's instance holds its writeable elements.
    instance: { writeableElements },
    fire,
    actions: { errorOccurred: vi.fn() },
  } as unknown as ServiceManager);
  // Count the header's subscriptions to the store and to public state. Public
  // state's own store listener comes first, so it isn't counted.
  const subscriptions = new Set<() => void>();
  let subscriptionPeak = 0;
  const counted =
    (subscribe: (listener: () => void) => () => void) =>
    (listener: () => void) => {
      subscriptions.add(listener);
      subscriptionPeak = Math.max(subscriptionPeak, subscriptions.size);
      const release = subscribe(listener);
      return () => {
        subscriptions.delete(listener);
        release();
      };
    };
  store.subscribe = counted(store.subscribe);
  const publicState = manager.instance.state as {
    subscribe: typeof store.subscribe;
  };
  publicState.subscribe = counted(publicState.subscribe);
  const state = new ChatMountState(manager, { width: 800, height: 600 });
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
  view.onClose = vi.fn(() => {
    order.push('close');
  });
  view.onRestart = vi.fn(() => {
    order.push('restart');
  });
  view.onToggleHomeScreen = vi.fn(() => {
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
    vi.restoreAllMocks();
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

  it('delegates focus and releases selected subscriptions and writable observers on detach', async () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const {
      config,
      view,
      host,
      base,
      store,
      subscriptions,
      writeableElements,
    } = await createHeader();
    const focus = vi.spyOn(base(), 'requestFocus').mockReturnValue(true);
    expect(view.requestFocus()).toBe(true);
    expect(focus).toHaveBeenCalledTimes(1);
    const count = subscriptions.size;
    expect(count).toBeGreaterThan(0);
    const observerIndex = observe.mock.calls.findIndex(
      ([target]) => target === host
    );
    expect(observerIndex).toBeGreaterThanOrEqual(0);
    const observer = observe.mock.contexts[observerIndex];
    const renderView = vi.spyOn(view as any, 'renderView');
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
