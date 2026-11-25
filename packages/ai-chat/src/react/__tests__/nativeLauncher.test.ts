/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MockInstance } from 'vitest';
import React from 'react';
import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import LauncherView from '../../chat/components/launcher/launcher';
import { ChatContainer } from '../ChatContainer';
import { ChatCustomElement } from '../ChatCustomElement';
import { chatMountStateContext } from '../../web-components/shared/chat-mount-state-context';
import { ChatMountState } from '../../chat/services/chatMountState';
import type { ServiceManager } from '../../sdk/services/ServiceManager';
import { createIntl } from '../../sdk/utils/i18n';
import { setIntl } from '../../sdk/utils/intlUtils';
import * as reducedMotion from '../../chat/utils/prefersReducedMotion';
import actions from '../../sdk/store/actions';
import { ViewType } from '../../types/state/AppState';
import type { LauncherConfig } from '../../types/config/LauncherConfig';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import {
  MainWindowOpenReason,
  ViewChangeReason,
} from '../../types/events/eventBusTypes';
import {
  applyConfigChange,
  createBaseConfig,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { viewActions } from '../../chat/state';

// A spec can set whether the chat thinks it runs on a phone; afterEach resets it.
const device = vi.hoisted(() => ({ isPhone: false }));

vi.mock('../../sdk/utils/browserUtils', async () => ({
  ...(await vi.importActual<typeof import('../../sdk/utils/browserUtils')>(
    '../../sdk/utils/browserUtils'
  )),
  __esModule: true,
  get IS_PHONE() {
    return device.isPhone;
  },
}));

class LauncherProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatMountStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-launcher-provider', LauncherProvider);
const testStates = new Set<ChatMountState>();

async function flush(view: LauncherView) {
  for (let index = 0; index < 4; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
  }
}

async function createLauncher({
  launcher = {},
  expanded = false,
  beforeConnect,
}: {
  launcher?: LauncherConfig;
  expanded?: boolean;
  beforeConnect?: (view: LauncherView) => void;
} = {}) {
  const config = { launcher };
  const store = makeConfigStore(config);
  store.dispatch(
    viewActions.setViewState({ mainWindow: false, launcher: true })
  );
  store.dispatch(viewActions.setInitialViewChangeComplete(true));
  store.dispatch(
    viewActions.setLauncherProperty('launcherIsExpanded', expanded)
  );
  store.dispatch(
    viewActions.setLauncherProperty(
      'showUnreadIndicator',
      Boolean(launcher.showUnreadIndicator)
    )
  );
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
  const changeView = vi.fn().mockResolvedValue(undefined);
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { changeView, errorOccurred: vi.fn() },
  } as unknown as ServiceManager;
  const state = new ChatMountState(manager, { width: 800, height: 600 });
  state.connect();
  testStates.add(state);
  const host = document.createElement(
    'test-native-launcher-provider'
  ) as LauncherProvider;
  host.provider.setValue(state);
  document.body.appendChild(host);
  await host.updateComplete;
  const view = document.createElement(
    'cds-aichat-launcher-view'
  ) as LauncherView;
  beforeConnect?.(view);
  host.shadowRoot.appendChild(view);
  await flush(view);
  return {
    config,
    host,
    view,
    state,
    store,
    manager,
    changeView,
    subscriptions,
  };
}

function hasState(view: LauncherView, state: string) {
  return view
    .containerElement()
    .classList.contains(`cds-aichat-launcher--${state}`);
}

describe('native launcher', () => {
  // Each wrapper case must boot from a fresh session, not the previous one's.
  beforeEach(() => {
    setupBeforeEach();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  afterEach(() => {
    setupAfterEach();
    testStates.forEach((state) => state.disconnect());
    testStates.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    device.isPhone = false;
  });

  it('keeps initial focus and restores launcher focus only after a later close commits', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    let focus: MockInstance;
    const committedVisibility: boolean[] = [];
    const { host, view, store } = await createLauncher({
      beforeConnect: (native) => {
        focus = vi.spyOn(native, 'requestFocus').mockImplementation(() => {
          committedVisibility.push(
            !hasState(native, 'hidden') &&
              native.buttonElement().getAttribute('tabindex') !== '-1'
          );
        });
      },
    });
    expect(document.activeElement).toBe(outside);
    expect(focus).not.toHaveBeenCalled();
    expect(view.shadowRoot).toBeNull();
    expect(view.getRootNode()).toBe(host.shadowRoot);
    expect(view.buttonElement().getAttribute('role')).toBe('complementary');
    expect(view.launcherContainerElement()).toBe(view.containerElement());
    store.dispatch(
      viewActions.setViewState({ mainWindow: true, launcher: false })
    );
    await flush(view);
    expect(hasState(view, 'hidden')).toBe(true);
    expect(view.buttonElement().getAttribute('tabindex')).toBe('-1');
    expect(focus).not.toHaveBeenCalled();
    store.dispatch(
      viewActions.setViewState({ mainWindow: false, launcher: true })
    );
    expect(focus).not.toHaveBeenCalled();
    await flush(view);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(committedVisibility).toEqual([true]);
  });

  it('uses the existing launcher-click reason and collapses the greeting before opening', async () => {
    vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(true);
    const { view, store, changeView } = await createLauncher({
      expanded: true,
    });
    view.buttonElement().click();
    expect(changeView).toHaveBeenCalledTimes(1);
    expect(changeView).toHaveBeenCalledWith(ViewType.MAIN_WINDOW, {
      viewChangeReason: ViewChangeReason.LAUNCHER_CLICKED,
      mainWindowOpenReason: MainWindowOpenReason.DEFAULT_LAUNCHER,
    });
    await flush(view);
    expect(
      store.getState().view.persistedToBrowserStorage.launcherIsExpanded
    ).toBe(false);
    expect(
      store.getState().view.persistedToBrowserStorage
        .launcherShouldStartCallToActionCounterIfEnabled
    ).toBe(false);
    expect(hasState(view, 'closed')).toBe(true);
  });

  it('keeps the original auto-extension deadline across unrelated typing and settles missing animation events', async () => {
    vi.useFakeTimers();
    const { view, state, store } = await createLauncher({
      launcher: { desktop: { isOn: true, timeToExpand: 1000, title: 'Hello' } },
    });
    const renderView = vi.spyOn(view as any, 'renderView');
    vi.advanceTimersByTime(500);
    store.dispatch(viewActions.setViewValue('isMessageLoadingCounter', 1));
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        isHumanAgentTyping: true,
      })
    );
    state.setWindowSize({ width: 420, height: 700 });
    await flush(view);
    expect(renderView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    await flush(view);
    expect(
      store.getState().view.persistedToBrowserStorage.launcherIsExpanded
    ).toBe(true);
    expect(hasState(view, 'opening')).toBe(true);
    vi.advanceTimersByTime(600);
    await flush(view);
    expect(hasState(view, 'open')).toBe(true);
    expect(
      view.querySelector('.cds-aichat--launcher-extended__greeting-text')
        ?.textContent
    ).toBe('Hello');
    view
      .querySelector<HTMLElement>(
        '.cds-aichat--launcher-extended__close-button'
      )
      .click();
    await flush(view);
    expect(hasState(view, 'closing')).toBe(true);
    vi.advanceTimersByTime(600);
    await flush(view);
    expect(hasState(view, 'closed')).toBe(true);
    expect(view.buttonElement().getAttribute('aria-label')).toBe(
      'Open the chat window'
    );
  });

  it('uses current Intl after a delayed formatter update and preserves unread-label rules', async () => {
    const { view, manager, store } = await createLauncher({
      launcher: { showUnreadIndicator: true },
    });
    expect(
      view.querySelector('.cds-aichat--count-indicator')?.textContent
    ).toBe('1');
    store.dispatch(viewActions.setViewValue('numUnreadMessages', 1234));
    await flush(view);
    expect(view.buttonElement().getAttribute('aria-label')).toContain('1,234');
    const renderView = vi.spyOn(view as any, 'renderView');
    const pack = {
      ...store.getState().languagePack,
      icon_ariaUnreadMessages: '{count, number} messages non lus',
    };
    store.dispatch(actions.setAppStateValue('languagePack', pack));
    await flush(view);
    expect(renderView).not.toHaveBeenCalled();
    setIntl(manager, 'fr', pack);
    await flush(view);
    expect(view.buttonElement().getAttribute('aria-label')).toContain(
      `${new Intl.NumberFormat('fr').format(1234)} messages non lus`
    );
    store.dispatch(viewActions.setViewValue('numUnreadMessages', 0));
    await flush(view);
    expect(
      view.querySelector('.cds-aichat--count-indicator')?.textContent
    ).toBe('1');
    store.dispatch(viewActions.setLauncherProperty('launcherIsExpanded', true));
    await flush(view);
    expect(view.querySelector('.cds-aichat--count-indicator')).toBeNull();
  });

  it.each([false, true])(
    'follows current desktop/mobile config (phone: %s) without replacing the button',
    async (phone) => {
      device.isPhone = phone;
      const launcher = {
        desktop: {
          title: 'Desktop hello',
          avatarUrlOverride: '/desktop-avatar.svg',
        },
        mobile: {
          title: 'Mobile hello',
          avatarUrlOverride: '/mobile-avatar.svg',
        },
      };
      const { config, view, store } = await createLauncher({
        launcher,
        expanded: true,
      });
      const button = view.buttonElement();
      expect(
        view.querySelector('.cds-aichat--launcher-extended__greeting-text')
          ?.textContent
      ).toBe(phone ? 'Mobile hello' : 'Desktop hello');
      expect(view.querySelector('img')?.getAttribute('src')).toBe(
        phone ? '/mobile-avatar.svg' : '/desktop-avatar.svg'
      );
      expect(view.querySelector('img')?.getAttribute('alt')).toBe('');
      applyConfigChange(store, {
        ...config,
        launcher: {
          desktop: { title: 'Updated desktop' },
          mobile: { title: 'Updated mobile' },
        },
      });
      await flush(view);
      expect(
        view.querySelector('.cds-aichat--launcher-extended__greeting-text')
          ?.textContent
      ).toBe(phone ? 'Updated mobile' : 'Updated desktop');
      expect(view.querySelector('img')).toBeNull();
      expect(view.buttonElement()).toBe(button);
    }
  );

  it('settles reduced-motion open and close immediately with the current labels', async () => {
    vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(true);
    const { view, store } = await createLauncher();
    store.dispatch(viewActions.setLauncherProperty('launcherIsExpanded', true));
    await flush(view);
    expect(hasState(view, 'open')).toBe(true);
    expect(hasState(view, 'opening')).toBe(false);
    view
      .querySelector<HTMLElement>(
        '.cds-aichat--launcher-extended__close-button'
      )
      .click();
    await flush(view);
    expect(hasState(view, 'closed')).toBe(true);
    expect(hasState(view, 'closing')).toBe(false);
    expect(
      view
        .querySelector('.cds-aichat--launcher-extended__close-button')
        ?.getAttribute('aria-label')
    ).toBe('Dismiss launcher notification');
  });

  it.each([
    ['ChatContainer', ChatContainer],
    ['ChatCustomElement', ChatCustomElement],
  ] as const)(
    'keeps default launcher markup and click behavior mounted through %s',
    async (_name, Wrapper) => {
      let instance: ChatInstance;
      const after = vi.fn();
      render(
        React.createElement(Wrapper, {
          ...createBaseConfig(),
          className: '',
          openChatByDefault: false,
          onBeforeRender: (chat) => {
            instance = chat;
          },
          onAfterRender: after,
        })
      );
      // The first boot in a file loads the boot modules on demand.
      await waitFor(() => expect(after).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      const host = document.querySelector('cds-aichat-container');
      const native = host.shadowRoot.querySelector('cds-aichat-launcher-view');
      expect(native.shadowRoot).toBeNull();
      expect(
        native
          .containerElement()
          .classList.contains('cds-aichat-launcher--closed')
      ).toBe(true);
      expect(native.buttonElement().getAttribute('aria-label')).toBe(
        'Open the chat window'
      );
      fireEvent.click(native.buttonElement());
      await waitFor(() =>
        expect(instance.getState().viewState.mainWindow).toBe(true)
      );
      await act(() => instance.changeView(ViewType.LAUNCHER));
      await waitFor(() =>
        expect(
          host.shadowRoot.querySelector('cds-aichat-launcher-view')
        ).not.toBeNull()
      );
      const reopened = host.shadowRoot.querySelector(
        'cds-aichat-launcher-view'
      );
      await flush(reopened);
      expect(native.isConnected).toBe(false);
      expect(reopened).not.toBe(native);
      expect(reopened.isConnected).toBe(true);
      expect(instance.getState().viewState.launcher).toBe(true);
      expect(reopened.buttonElement().getAttribute('tabindex')).not.toBe('-1');
      expect(after).toHaveBeenCalledTimes(1);
    }
  );
});
