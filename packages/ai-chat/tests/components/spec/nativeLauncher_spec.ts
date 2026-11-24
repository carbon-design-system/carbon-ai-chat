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
import LauncherView from '../../../src/chat/components/launcher/launcher';
// Registers the element; the default import above is only used as a type.
import '../../../src/chat/components/launcher/launcher';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { createIntl } from '../../../src/chat/utils/i18n';
import { setIntl } from '../../../src/chat/utils/intlUtils';
import * as browserUtils from '../../../src/chat/utils/browserUtils';
import * as reducedMotion from '../../../src/chat/utils/prefersReducedMotion';
import actions from '../../../src/chat/store/actions';
import { ViewType } from '../../../src/types/state/AppState';
import type { LauncherConfig } from '../../../src/types/config/LauncherConfig';
import {
  MainWindowOpenReason,
  ViewChangeReason,
} from '../../../src/types/events/eventBusTypes';
import {
  applyConfigChange,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

jest.mock('../../../src/chat/utils/browserUtils', () => ({
  ...jest.requireActual('../../../src/chat/utils/browserUtils'),
  __esModule: true,
  IS_PHONE: false,
}));

class LauncherProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-launcher-provider', LauncherProvider);
const testStates = new Set<ChatViewState>();

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
  store.dispatch(actions.setViewState({ mainWindow: false, launcher: true }));
  store.dispatch(actions.setInitialViewChangeComplete(true));
  store.dispatch(actions.setLauncherProperty('launcherIsExpanded', expanded));
  store.dispatch(
    actions.setLauncherProperty(
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
  const changeView = jest.fn().mockResolvedValue(undefined);
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { changeView, errorOccurred: jest.fn() },
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
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
  beforeEach(setupBeforeEach);
  afterEach(() => {
    setupAfterEach();
    testStates.forEach((state) => state.disconnect());
    testStates.clear();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps initial focus and restores launcher focus only after a later close commits', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    let focus: jest.SpyInstance;
    const committedVisibility: boolean[] = [];
    const { host, view, store } = await createLauncher({
      beforeConnect: (native) => {
        focus = jest.spyOn(native, 'requestFocus').mockImplementation(() => {
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
    store.dispatch(actions.setViewState({ mainWindow: true, launcher: false }));
    await flush(view);
    expect(hasState(view, 'hidden')).toBe(true);
    expect(view.buttonElement().getAttribute('tabindex')).toBe('-1');
    expect(focus).not.toHaveBeenCalled();
    store.dispatch(actions.setViewState({ mainWindow: false, launcher: true }));
    expect(focus).not.toHaveBeenCalled();
    await flush(view);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(committedVisibility).toEqual([true]);
  });

  it('uses the existing launcher-click reason and collapses the greeting before opening', async () => {
    jest.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(true);
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
    expect(store.getState().persistedToBrowserStorage.launcherIsExpanded).toBe(
      false
    );
    expect(
      store.getState().persistedToBrowserStorage
        .launcherShouldStartCallToActionCounterIfEnabled
    ).toBe(false);
    expect(hasState(view, 'closed')).toBe(true);
  });

  it('keeps the original auto-extension deadline across unrelated typing and settles missing animation events', async () => {
    jest.useFakeTimers();
    const { view, state, store } = await createLauncher({
      launcher: { desktop: { isOn: true, timeToExpand: 1000, title: 'Hello' } },
    });
    const renderView = jest.spyOn(view as any, 'renderView');
    jest.advanceTimersByTime(500);
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
    jest.advanceTimersByTime(500);
    await flush(view);
    expect(store.getState().persistedToBrowserStorage.launcherIsExpanded).toBe(
      true
    );
    expect(hasState(view, 'opening')).toBe(true);
    jest.advanceTimersByTime(600);
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
    jest.advanceTimersByTime(600);
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
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        numUnreadMessages: 1234,
      })
    );
    await flush(view);
    expect(view.buttonElement().getAttribute('aria-label')).toContain('1,234');
    const renderView = jest.spyOn(view as any, 'renderView');
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
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        numUnreadMessages: 0,
      })
    );
    await flush(view);
    expect(
      view.querySelector('.cds-aichat--count-indicator')?.textContent
    ).toBe('1');
    store.dispatch(actions.setLauncherProperty('launcherIsExpanded', true));
    await flush(view);
    expect(view.querySelector('.cds-aichat--count-indicator')).toBeNull();
  });

  it.each([false, true])(
    'follows current desktop/mobile config (phone: %s) without replacing the button',
    async (phone) => {
      jest.replaceProperty(browserUtils, 'IS_PHONE', phone);
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
    jest.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(true);
    const { view, store } = await createLauncher();
    store.dispatch(actions.setLauncherProperty('launcherIsExpanded', true));
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

  it('releases timers and subscriptions, then reconnects once with current values', async () => {
    jest.useFakeTimers();
    const { host, view, store, subscriptions } = await createLauncher({
      launcher: { desktop: { isOn: true, timeToExpand: 1000 } },
    });
    const count = subscriptions.size;
    expect(count).toBeGreaterThan(0);
    const renderView = jest.spyOn(view as any, 'renderView');
    jest.advanceTimersByTime(500);
    view.remove();
    expect(subscriptions.size).toBe(0);
    jest.advanceTimersByTime(2000);
    expect(store.getState().persistedToBrowserStorage.launcherIsExpanded).toBe(
      false
    );
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        numUnreadMessages: 7,
      })
    );
    await Promise.resolve();
    expect(renderView).not.toHaveBeenCalled();
    host.shadowRoot.appendChild(view);
    await flush(view);
    expect(subscriptions.size).toBe(count);
    expect(
      view.querySelector('.cds-aichat--count-indicator')?.textContent
    ).toBe('7');
    jest.advanceTimersByTime(1000);
    await flush(view);
    expect(store.getState().persistedToBrowserStorage.launcherIsExpanded).toBe(
      true
    );
    renderView.mockClear();
    store.dispatch(
      actions.setAppStateValue('humanAgentState', {
        ...store.getState().humanAgentState,
        numUnreadMessages: 8,
      })
    );
    await flush(view);
    expect(renderView).toHaveBeenCalledTimes(1);
    view.remove();
    const retired = store.getState().persistedToBrowserStorage;
    jest.advanceTimersByTime(2000);
    expect(store.getState().persistedToBrowserStorage).toBe(retired);
  });
});
