/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { flushSync } from 'react-dom';

import type CDSLoading from '@carbon/web-components/es/components/loading/loading.js';
import { act, fireEvent, render } from '@testing-library/react';

import { ContextProvider } from '@lit/context';

import { LitElement, nothing } from 'lit';

import HydrationBody from '../native/HydrationBody';
import IFrameBody from '../native/IFrameBody';
import IFramePanel from '../IFramePanel';
import { IFrameComponent } from '../../../components-legacy/responseTypes/iframe/IFrameComponent';

import type { PanelBodyContentReadyEvent } from '../native/panelBodyContent';

import { chatMountStateContext } from '../../../../web-components/shared/chat-mount-state-context';

import { ChatContext } from '../../../contexts/ChatContext';

import { ChatMountState } from '../../../services/chatMountState';

import type { ServiceManager } from '../../../../sdk/services/ServiceManager';

import { NamespaceService } from '../../../../sdk/services/NamespaceService';

import { createIntl } from '../../../../sdk/utils/i18n';

import {
  applyConfigChange,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../__tests__/helpers/chat';

import { viewActions } from '../../../state';

class PanelBodyProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatMountStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-panel-body-provider', PanelBodyProvider);

const states = new Set<ChatMountState>();

async function createProvider() {
  const store = makeConfigStore({});
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
    namespace: new NamespaceService('panel-body-test'),
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatMountState(manager, { width: 800, height: 600 });
  state.connect();
  states.add(state);
  const announce = vi
    .spyOn(state.announcer, 'announce')
    .mockImplementation(() => {});
  const host = document.createElement(
    'test-native-panel-body-provider'
  ) as PanelBodyProvider;
  host.provider.setValue(state);
  document.body.appendChild(host);
  await host.updateComplete;
  return { host, store, state, announce, subscriptions, errorOccurred };
}

async function flush(view?: HydrationBody | IFrameBody) {
  for (let index = 0; index < 4; index++) {
    await Promise.resolve();
    if (view) {
      await view.updateComplete;
    }
  }
}

async function hydration(isHydrated = false) {
  const context = await createProvider();
  const view = document.createElement(
    'cds-aichat-hydration-body'
  ) as HydrationBody;
  view.isHydrated = isHydrated;
  context.host.shadowRoot.appendChild(view);
  await flush(view);
  return { ...context, view };
}

async function iframe() {
  const context = await createProvider();
  const view = document.createElement('cds-aichat-iframe-body') as IFrameBody;
  view.messageItem = { source: 'https://example.test/first' };
  context.host.shadowRoot.appendChild(view);
  await flush(view);
  return { ...context, view };
}

beforeEach(() => {
  setupBeforeEach();
  vi.useFakeTimers();
});
afterEach(() => {
  setupAfterEach();
  states.forEach((state) => state.disconnect());
  states.clear();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('native hydration body', () => {
  it('shows its spinner after 400 ms and announces after that commit only once', async () => {
    const { view, host, store, announce } = await hydration();
    expect(view.shadowRoot).toBeNull();
    expect(view.getRootNode()).toBe(host.shadowRoot);
    vi.advanceTimersByTime(399);
    await flush(view);
    expect(view.querySelector('cds-loading')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await flush(view);
    const spinner = view.querySelector<CDSLoading>('cds-loading');
    expect(spinner).not.toBeNull();
    expect(spinner.active).toBe(true);
    expect(spinner.overlay).toBe(false);
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(announce).toHaveBeenCalledWith(
      store.getState().languagePack.window_ariaWindowLoading
    );
    const renderView = vi.spyOn(view as any, 'renderView');
    store.dispatch(viewActions.setViewValue('isMessageLoadingCounter', 1));
    await flush(view);
    expect(renderView).not.toHaveBeenCalled();
    applyConfigChange(store, {
      strings: { window_ariaWindowLoading: 'Chargement' },
    });
    await flush(view);
    expect(spinner.assistiveText).toBe('Chargement');
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('preserves its deadline, spinner and single notice through same-task host moves', async () => {
    const { view, host, announce, subscriptions } = await hydration();
    const activeSubscriptions = subscriptions.size;
    const parent = host.parentNode;
    const move = () => {
      flushSync(() => {
        host.remove();
        expect(subscriptions.size).toBe(0);
        parent.appendChild(host);
      });
    };
    vi.advanceTimersByTime(200);
    move();
    await flush(view);
    expect(subscriptions.size).toBe(activeSubscriptions);
    vi.advanceTimersByTime(199);
    await flush(view);
    expect(view.querySelector('cds-loading')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await flush(view);
    const spinner = view.querySelector('cds-loading');
    expect(spinner).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(announce).toHaveBeenCalledTimes(1);
    move();
    await flush(view);
    expect(view.querySelector('cds-loading')).toBe(spinner);
    expect(subscriptions.size).toBe(activeSubscriptions);
    vi.advanceTimersByTime(401);
    await flush(view);
    expect(view.querySelector('cds-loading')).toBe(spinner);
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('releases hydration timers after a render failure without restarting them', async () => {
    const { view, announce, subscriptions, errorOccurred } = await hydration();
    vi.spyOn(view as any, 'renderView').mockImplementationOnce(() => {
      throw new Error('Native hydration failed');
    });
    view.requestUpdate();
    await flush(view);
    expect(errorOccurred).toHaveBeenCalledTimes(1);
    expect(subscriptions.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    view.requestUpdate();
    await flush(view);
    vi.advanceTimersByTime(401);
    expect(vi.getTimerCount()).toBe(0);
    expect(view.querySelector('cds-loading')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
    expect(errorOccurred).toHaveBeenCalledTimes(1);
  });

  it('keeps fast hydration silent, then repeats speech only for a new unhydrated cycle', async () => {
    const { view, announce } = await hydration();
    vi.advanceTimersByTime(100);
    view.isHydrated = true;
    await flush(view);
    vi.advanceTimersByTime(301);
    await flush(view);
    expect(view.querySelector('cds-loading')).not.toBeNull();
    expect(announce).not.toHaveBeenCalled();
    view.isHydrated = false;
    await flush(view);
    // The new cycle hides the spinner and waits its own delay.
    expect(view.querySelector('cds-loading')).toBeNull();
    vi.advanceTimersByTime(399);
    await flush(view);
    expect(view.querySelector('cds-loading')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    await flush(view);
    expect(view.querySelector('cds-loading')).not.toBeNull();
    expect(announce).toHaveBeenCalledTimes(1);
    view.isHydrated = true;
    await flush(view);
    view.isHydrated = false;
    await flush(view);
    vi.advanceTimersByTime(401);
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('releases pending content, subscriptions and speech across detach/reconnect', async () => {
    const { view, host, announce, subscriptions } = await hydration();
    const activeSubscriptions = subscriptions.size;
    vi.advanceTimersByTime(399);
    view.remove();
    expect(subscriptions.size).toBe(0);
    vi.runAllTicks();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(announce).not.toHaveBeenCalled();
    host.shadowRoot.appendChild(view);
    await flush(view);
    expect(subscriptions.size).toBe(activeSubscriptions);
    expect(view.querySelector('cds-loading')).toBeNull();
    vi.advanceTimersByTime(400);
    await flush(view);
    expect(view.querySelector('cds-loading')).not.toBeNull();
    view.remove();
    vi.runAllTicks();
    expect(vi.getTimerCount()).toBe(0);
    vi.runOnlyPendingTimers();
    expect(announce).not.toHaveBeenCalled();
    expect(subscriptions.size).toBe(0);
  });
});

describe('native iframe panel body', () => {
  it('preserves iframe policy, source identity, title updates and spinner deadline', async () => {
    const { view } = await iframe();
    const frame = view.querySelector('iframe');
    expect(frame.getAttribute('sandbox')).toBe(
      'allow-scripts allow-downloads allow-forms allow-popups allow-same-origin'
    );
    expect(frame.getAttribute('referrerpolicy')).toBe('origin');
    expect(frame.getAttribute('role')).toBe('application');
    expect(frame.tabIndex).toBe(0);
    expect(frame.title).toBe('https://example.test/first');
    vi.advanceTimersByTime(1000);
    view.messageItem = {
      source: 'https://example.test/first',
      title: 'Updated title',
    };
    await flush(view);
    expect(view.querySelector('iframe')).toBe(frame);
    expect(frame.title).toBe('Updated title');
    vi.advanceTimersByTime(499);
    await flush(view);
    expect(view.querySelector('cds-loading')).toBeNull();
    vi.advanceTimersByTime(1);
    await flush(view);
    expect(view.querySelector('cds-loading')).not.toBeNull();
  });

  it('clears both waits on load and uses the current loaded notice without unrelated updates', async () => {
    const { view, store, state, announce } = await iframe();
    applyConfigChange(store, {
      strings: { iframe_ariaSourceLoaded: 'Page ready' },
    });
    await flush(view);
    const renderView = vi.spyOn(view as any, 'renderView');
    store.dispatch(viewActions.setViewValue('isMessageLoadingCounter', 1));
    state.setWindowSize({ width: 400, height: 600 });
    await flush(view);
    expect(renderView).not.toHaveBeenCalled();
    view.querySelector('iframe').dispatchEvent(new Event('load'));
    await flush(view);
    expect(announce).toHaveBeenCalledWith('Page ready');
    vi.advanceTimersByTime(22000);
    await flush(view);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(view.querySelector('iframe')).not.toBeNull();
    expect(view.querySelector('cds-loading')).toBeNull();
  });

  it('keeps the loaded frame and notice when its host moves within one task', async () => {
    const { view, host, store, announce } = await iframe();
    const frame = view.querySelector('iframe');
    frame.dispatchEvent(new Event('load'));
    await flush(view);
    const loadedNotice = store.getState().languagePack.iframe_ariaSourceLoaded;
    expect(announce.mock.calls).toEqual([[loadedNotice]]);
    const parent = host.parentNode;
    flushSync(() => {
      host.remove();
      parent.appendChild(host);
    });
    await flush(view);
    expect(view.querySelector('iframe')).toBe(frame);
    vi.advanceTimersByTime(22000);
    await flush(view);
    expect(view.querySelector('iframe')).toBe(frame);
    expect(view.querySelector('cds-loading')).toBeNull();
    expect(announce.mock.calls).toEqual([[loadedNotice]]);
  });

  it('publishes one connected error target at 20 s, keeps it for locale changes, and retries only on source reset', async () => {
    const { view, store, announce } = await iframe();
    const ready = vi.fn((event: PanelBodyContentReadyEvent) => {
      if (event.detail) {
        expect(event.detail.target.isConnected).toBe(true);
      }
    });
    view.addEventListener('panel-content-ready', ready);
    const expiredFrame = view.querySelector('iframe');
    vi.advanceTimersByTime(19999);
    await flush(view);
    expect(view.querySelector('iframe')).not.toBeNull();
    vi.advanceTimersByTime(1);
    await flush(view);
    expect(view.querySelector('iframe')).toBeNull();
    expect(view.querySelector('cds-loading')).toBeNull();
    expect(ready).toHaveBeenCalledTimes(1);
    const first = ready.mock.calls[0][0].detail;
    expect(first.target.parentElement.className).toBe(
      'cds-aichat--i-frame-component__wrapper'
    );
    expect(announce).toHaveBeenCalledWith(
      store.getState().languagePack.errors_iframeSource
    );
    expiredFrame.dispatchEvent(new Event('load'));
    expect(announce).toHaveBeenCalledTimes(1);
    applyConfigChange(store, {
      strings: { errors_iframeSource: 'Nouvelle erreur' },
    });
    await flush(view);
    expect(ready.mock.calls[1][0].detail).toEqual({
      target: first.target,
      text: 'Nouvelle erreur',
    });
    view.messageItem = {
      source: 'https://example.test/first',
      title: 'Same source',
    };
    await flush(view);
    expect(view.querySelector('iframe')).toBeNull();
    expect(ready).toHaveBeenCalledTimes(2);
    view.messageItem = undefined;
    await flush(view);
    expect(ready.mock.calls[2][0].detail).toBeNull();
    view.messageItem = { source: 'https://example.test/first' };
    await flush(view);
    expect(view.querySelector('iframe')).not.toBeNull();
    expect(view.querySelector('cds-loading')).toBeNull();
    expect(first.target.isConnected).toBe(false);
  });

  it('retires old source events and timers and reconnects with one subscription set', async () => {
    const { view, host, announce, subscriptions } = await iframe();
    const activeSubscriptions = subscriptions.size;
    const oldFrame = view.querySelector('iframe');
    vi.advanceTimersByTime(1000);
    view.messageItem = { source: 'https://example.test/second' };
    await flush(view);
    const currentFrame = view.querySelector('iframe');
    expect(currentFrame).not.toBe(oldFrame);
    oldFrame.dispatchEvent(new Event('load'));
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(19000);
    await flush(view);
    expect(view.querySelector('iframe')).toBe(currentFrame);
    view.remove();
    expect(subscriptions.size).toBe(0);
    vi.runAllTicks();
    expect(vi.getTimerCount()).toBe(0);
    currentFrame.dispatchEvent(new Event('load'));
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20000);
    expect(announce).not.toHaveBeenCalled();
    host.shadowRoot.appendChild(view);
    await flush(view);
    expect(view.querySelector('iframe')).not.toBe(currentFrame);
    expect(view.querySelector('cds-loading')).toBeNull();
    expect(subscriptions.size).toBe(activeSubscriptions);
    currentFrame.dispatchEvent(new Event('load'));
    expect(announce).not.toHaveBeenCalled();
  });

  it('releases a pending source after a render failure without recreating its timers', async () => {
    const { view, errorOccurred, subscriptions } = await iframe();
    vi.spyOn(view as any, 'renderView').mockImplementationOnce(() => {
      throw new Error('Native iframe failed');
    });
    view.requestUpdate();
    await flush(view);
    expect(errorOccurred).toHaveBeenCalledTimes(1);
    expect(subscriptions.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    view.requestUpdate();
    await flush(view);
    expect(vi.getTimerCount()).toBe(0);
    expect(errorOccurred).toHaveBeenCalledTimes(1);
  });

  it('retains the legacy rule that a removed timed-out iframe no longer announces load', async () => {
    const { host, state, announce } = await createProvider();
    const root = document.createElement('div');
    host.shadowRoot.appendChild(root);
    const tree = render(
      React.createElement(
        ChatContext.Provider,
        { value: state },
        React.createElement(IFrameComponent, {
          source: 'https://example.test/legacy',
          title: 'Legacy iframe',
        })
      ),
      { container: root }
    );
    try {
      await act(async () => {
        await flush();
      });
      const expiredFrame = root.querySelector('iframe');
      await act(async () => {
        vi.advanceTimersByTime(20000);
        await flush();
      });
      expect(root.querySelector('iframe')).toBeNull();
      expect(announce).toHaveBeenCalledTimes(1);
      expiredFrame.dispatchEvent(new Event('load'));
      expect(announce).toHaveBeenCalledTimes(1);
    } finally {
      tree.unmount();
    }
  });

  it('retains the complete React InlineError and configured markdown in its parent tree', async () => {
    const { host, store, state } = await createProvider();
    const parent = React.createContext('missing');
    const mounts = vi.fn();
    function StatefulError() {
      const label = React.useContext(parent);
      const [count, setCount] = React.useState(0);
      React.useEffect(() => {
        mounts();
      }, []);
      return React.createElement(
        'button',
        {
          type: 'button',
          'data-retained-error': '',
          onClick: () => setCount(count + 1),
        },
        `${label}:${count}`
      );
    }
    const renderer = vi.fn(() => React.createElement(StatefulError));
    store.dispatch(
      viewActions.setViewValue('markdownConfig', {
        customRenderers: { codeBlock: renderer },
      })
    );
    applyConfigChange(store, {
      strings: { errors_iframeSource: '```text\nerror\n```' },
    });
    const root = document.createElement('div');
    host.shadowRoot.appendChild(root);
    const tree = render(
      React.createElement(
        parent.Provider,
        { value: 'host context' },
        React.createElement(
          ChatContext.Provider,
          { value: state },
          React.createElement(IFramePanel, {
            messageItem: { source: 'https://example.test/retained' },
          })
        )
      ),
      { container: root }
    );
    try {
      await act(async () => {
        await flush();
      });
      await act(async () => {
        vi.advanceTimersByTime(20000);
        await flush();
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
        await flush();
      });
      const content = host.shadowRoot.querySelector<HTMLElement>(
        '[data-retained-error]'
      );
      expect(content?.textContent).toBe('host context:0');
      expect(content.closest('.cds-aichat--inline-error')).not.toBeNull();
      fireEvent.click(content);
      expect(content.textContent).toBe('host context:1');
      const target = content.closest(
        '.cds-aichat--i-frame-component__status-container'
      );
      await act(async () => {
        store.dispatch(viewActions.setViewValue('isMessageLoadingCounter', 2));
        await flush();
      });
      expect(host.shadowRoot.querySelector('[data-retained-error]')).toBe(
        content
      );
      expect(
        content.closest('.cds-aichat--i-frame-component__status-container')
      ).toBe(target);
      expect(mounts).toHaveBeenCalledTimes(1);
      const hostParent = host.parentNode;
      await act(async () => {
        flushSync(() => {
          host.remove();
          hostParent.appendChild(host);
        });
        await flush();
      });
      expect(host.shadowRoot.querySelector('[data-retained-error]')).toBe(
        content
      );
      expect(content.textContent).toBe('host context:1');
      expect(
        host.shadowRoot.querySelector(
          '.cds-aichat--i-frame-component__status-container'
        )
      ).toBe(target);
      expect(mounts).toHaveBeenCalledTimes(1);
    } finally {
      tree.unmount();
    }
  });
});
