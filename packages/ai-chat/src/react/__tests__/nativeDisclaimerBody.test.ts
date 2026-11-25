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
import type NativePanel from '@carbon/ai-chat-components/es/components/chat-shell/src/panel.js';
import DisclaimerBody from '../../chat/components/panels/native/DisclaimerBody';
import { ChatMountState } from '../../chat/services/chatMountState';
import type { ServiceManager } from '../../sdk/services/ServiceManager';
import { chatMountStateContext } from '../../web-components/shared/chat-mount-state-context';
import { createIntl } from '../../sdk/utils/i18n';
import actions from '../../sdk/store/actions';
import { CarbonTheme } from '../../types/config/CarbonTheme';
import {
  applyConfigChange,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { viewActions } from '../../chat/state';

class DisclaimerProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatMountStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-disclaimer-provider', DisclaimerProvider);
const testStates = new Set<ChatMountState>();

async function flush(view: DisclaimerBody) {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
  }
}

async function createBody() {
  const store = makeConfigStore({});
  store.dispatch(
    viewActions.setViewState({ mainWindow: true, launcher: false })
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
  const errorOccurred = vi.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatMountState(manager, { width: 800, height: 600 });
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
  view.onReadChange = vi.fn();
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
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it('updates theme and locale without replacing HTML descendants or reacting to unrelated typing', async () => {
    const { view, state, store } = await createBody();
    const input = view.querySelector<HTMLInputElement>('[data-stateful]');
    input.value = 'Kept';
    const gradientID = view.querySelector('linearGradient').id;
    const renderView = vi.spyOn(view as any, 'renderView');
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

  it('does not restore measurement timers while rendering a failed native view fallback', async () => {
    vi.useFakeTimers();
    const { view, scrollBody, subscriptions, errorOccurred } =
      await createBody();
    const scroll = vi.fn();
    scrollBody.addEventListener('scroll', scroll);
    vi.spyOn(view as any, 'renderView').mockImplementation(() => {
      throw new Error('disclaimer render failed');
    });
    view.requestUpdate();
    await flush(view);
    expect(errorOccurred).toHaveBeenCalledTimes(1);
    expect(subscriptions.size).toBe(0);
    vi.advanceTimersByTime(500);
    expect(scroll).not.toHaveBeenCalled();
    expect(view.querySelector('h1')).toBeNull();
  });
});
