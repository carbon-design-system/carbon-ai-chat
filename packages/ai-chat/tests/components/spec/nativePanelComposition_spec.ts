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
import '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import type NativePanel from '@carbon/ai-chat-components/es/components/chat-shell/src/panel.js';
import type NativeShell from '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import '../../../src/chat/components/panels/NativePanels';
import type NativePanels from '../../../src/chat/components/panels/NativePanels';
import { ExtensionHosts } from '../../../src/chat/services/extensionHosts';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type {
  PanelViewInputs,
  PanelCompositionCallbacks,
  PanelName,
} from '../../../src/chat/utils/panelComposition';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { createIntl } from '../../../src/chat/utils/i18n';
import actions from '../../../src/chat/store/actions';
import { ChatWidthBreakpoint } from '../../../src/types/state/AppState';
import { EventBus } from '../../../src/chat/events/EventBus';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { ScreenShareState } from '../../../src/types/config/ServiceDeskConfig';
import {
  applyConfigChange,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class PanelProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-panels-provider', PanelProvider);
const states = new Set<ChatViewState>();

async function flush(view: NativePanels) {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
    await Promise.all(
      Array.from(view.querySelectorAll<NativePanel>('cds-aichat-panel')).map(
        (panel) => panel.updateComplete
      )
    );
  }
}

async function fixture(
  overrides: Partial<PanelViewInputs> = {},
  beforeAppend?: (hosts: ExtensionHosts) => void
) {
  const store = makeConfigStore({
    disclaimer: { isOn: true, disclaimerHTML: '<p>Terms</p>' },
    history: { isOn: true },
  });
  store.dispatch(actions.setViewState({ mainWindow: true, launcher: false }));
  const subscriptions = new Set<() => void>();
  const originalSubscribe = store.subscribe;
  store.subscribe = (listener) => {
    subscriptions.add(listener);
    const release = originalSubscribe(listener);
    return () => {
      subscriptions.delete(listener);
      release();
    };
  };
  const errorOccurred = jest.fn();
  const eventBus = new EventBus();
  const manager = {
    store,
    eventBus,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
  state.connect();
  states.add(state);
  const provider = document.createElement(
    'test-native-panels-provider'
  ) as PanelProvider;
  provider.provider.setValue(state);
  document.body.append(provider);
  await provider.updateComplete;
  const shell = document.createElement('cds-aichat-shell') as NativeShell;
  provider.shadowRoot.append(shell);
  const view = document.createElement(
    'cds-aichat-native-panels'
  ) as NativePanels;
  view.slot = 'panels';
  const hosts = new ExtensionHosts(
    eventBus as unknown as ChatInstance,
    provider,
    store,
    () => false
  );
  const callbacks: jest.Mocked<PanelCompositionCallbacks> = {
    onPanelOpenStart: jest.fn(),
    onPanelOpenEnd: jest.fn(),
    onPanelCloseStart: jest.fn(),
    onPanelCloseEnd: jest.fn(),
    onClose: jest.fn(),
    onRestart: jest.fn(),
    onToggleHomeScreen: jest.fn(),
    onAcceptDisclaimer: jest.fn(),
    confirmHumanAgentEndChat: jest.fn(),
    hideConfirmEndChat: jest.fn(),
    fireCustomPanelEvent: jest.fn(),
    resetCustomPanelOptions: jest.fn(),
    closeCustomPanel: jest.fn(),
    closeResponsePanel: jest.fn(),
    clearResponsePanelContent: jest.fn(),
    closeIFramePanel: jest.fn(),
    closeViewSourcePanel: jest.fn(),
    closeHistoryPanel: jest.fn(),
    updateScreenShareRequest: jest.fn(),
    announce: jest.fn(),
  };
  const current = store.getState();
  view.inputs = {
    endChatConfirmation: null,
    showEndChatConfirmation: false,
    showScreenShareRequest: false,
    isHydratingComplete: true,
    shouldShowHydrationPanel: false,
    isHomeScreenActive: false,
    customPanelState: current.customPanelState,
    historyPanelState: { ...current.historyPanelState, isMobile: true },
    showDisclaimer: false,
    responsePanelState: current.responsePanelState,
    responseHasMessage: false,
    iFramePanelState: current.iFramePanelState,
    viewSourcePanelState: current.viewSourcePanelState,
    isInputReadonly: false,
    catastrophicErrorPanelState: current.catastrophicErrorPanelState,
    contentRevision: {},
    ...overrides,
  };
  view.hosts = hosts;
  view.callbacks = callbacks;
  beforeAppend?.(hosts);
  shell.append(view);
  await shell.updateComplete;
  await flush(view);
  const panel = (name: PanelName) =>
    view.querySelector<NativePanel>(`[data-panel-name="${name}"]`);
  const commit = async () => {
    for (const request of hosts.getPanelContentSnapshot()) {
      expect(hosts.commitPanelContent(request)).toBe(true);
    }
    await flush(view);
  };
  return {
    view,
    provider,
    shell,
    hosts,
    callbacks,
    store,
    subscriptions,
    errorOccurred,
    panel,
    commit,
  };
}

function openInputs(inputs: PanelViewInputs): PanelViewInputs {
  return {
    ...inputs,
    contentRevision: {},
    showEndChatConfirmation: true,
    showScreenShareRequest: true,
    shouldShowHydrationPanel: true,
    showDisclaimer: true,
    catastrophicErrorPanelState: {
      ...inputs.catastrophicErrorPanelState,
      isOpen: true,
    },
    customPanelState: { ...inputs.customPanelState, isOpen: true },
    responsePanelState: { ...inputs.responsePanelState, isOpen: true },
    iFramePanelState: { ...inputs.iFramePanelState, isOpen: true },
    viewSourcePanelState: { ...inputs.viewSourcePanelState, isOpen: true },
    historyPanelState: { ...inputs.historyPanelState, isOpen: true },
  };
}

beforeEach(() => {
  setupBeforeEach();
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
});
afterEach(() => {
  setupAfterEach();
  states.forEach((state) => state.disconnect());
  states.clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('native panel composition', () => {
  it('keeps the direct shell slot chain and all ten current ranks when panels open together', async () => {
    const f = await fixture();
    f.view.inputs = openInputs(f.view.inputs);
    await flush(f.view);
    await f.commit();
    expect(f.view.shadowRoot).toBeNull();
    expect(f.view.parentElement).toBe(f.shell);
    expect(f.view.assignedSlot).toBe(
      f.shell.shadowRoot.querySelector('slot[name="panels"]')
    );
    const ranks: Record<PanelName, number> = {
      error: 100,
      hydration: 90,
      disclaimer: 80,
      screenShare: 75,
      endChat: 70,
      custom: 60,
      response: 50,
      iframe: 40,
      citation: 30,
      history: 3,
    };
    for (const [name, priority] of Object.entries(ranks)) {
      const frame = f.panel(name as PanelName);
      expect(frame.parentElement).toBe(f.view);
      expect(frame.priority).toBe(priority);
      expect(frame.open).toBe(true);
      expect(frame.getRootNode()).toBe(f.provider.shadowRoot);
      expect(frame.inert).toBe(name !== 'error');
    }
    const body = f.hosts.panelTargetFor('custom-body');
    expect(body.parentElement).toBe(f.panel('custom'));
    expect(body.assignedSlot).toBe(
      f.panel('custom').shadowRoot.querySelector('slot[name="body"]')
    );
    expect(
      f.hosts.panelTargetFor('custom-title').parentElement.tagName.toLowerCase()
    ).toBe('cds-aichat-toolbar');
    expect(f.errorOccurred).not.toHaveBeenCalled();
  });

  it('reports placement only after body and title targets project into their actual child slots', async () => {
    const placed: string[] = [];
    const f = await fixture({}, (hosts) => {
      const mark = hosts.markPanelContentPlaced.bind(hosts);
      jest
        .spyOn(hosts, 'markPanelContentPlaced')
        .mockImplementation((request) => {
          for (const name of request.names) {
            const target = request.targets[name];
            expect(target.assignedSlot).not.toBeNull();
            expect(target.assignedSlot.getRootNode()).toBe(
              target.parentElement.shadowRoot
            );
            placed.push(name);
          }
          return mark(request);
        });
    });
    expect(placed).toContain('custom-title');
    expect(placed).toContain('custom-body');
    expect(f.errorOccurred).not.toHaveBeenCalled();
  });

  it('keeps committed targets and tokens through a same-task physical move', async () => {
    const f = await fixture();
    await f.commit();
    const initialSubscriptions = f.subscriptions.size;
    const request = f.hosts
      .getPanelContentSnapshot()
      .find((item) => item.panel === 'custom');
    const body = f.hosts.panelTargetFor('custom-body');
    const retained = document.createElement('input');
    retained.value = 'retained';
    body.append(retained);
    f.view.remove();
    f.shell.append(f.view);
    await flush(f.view);
    expect(
      f.hosts.getPanelContentSnapshot().find((item) => item.panel === 'custom')
    ).toBe(request);
    expect(
      f.hosts.isPanelContentCommitted('custom', f.view.inputs.contentRevision)
    ).toBe(true);
    expect(f.hosts.panelTargetFor('custom-body')).toBe(body);
    expect(body.querySelector('input')).toBe(retained);
    expect(retained.value).toBe('retained');
    expect(f.subscriptions.size).toBe(initialSubscriptions);
  });

  it('preserves initial desired opens without inventing initial transition callbacks', async () => {
    const seed = makeConfigStore({}).getState();
    const f = await fixture({
      customPanelState: { ...seed.customPanelState, isOpen: true },
    });
    expect(f.panel('custom').open).toBe(true);
    expect(
      f.hosts.isPanelContentCommitted('custom', f.view.inputs.contentRevision)
    ).toBe(false);
    expect(f.callbacks.fireCustomPanelEvent).not.toHaveBeenCalled();
    expect(f.callbacks.onPanelOpenStart).not.toHaveBeenCalled();
    expect(f.callbacks.onPanelOpenEnd).not.toHaveBeenCalled();
  });

  it('preserves the first desired open value for a later-created conditional history frame', async () => {
    const seed = makeConfigStore({}).getState();
    const f = await fixture({
      historyPanelState: { ...seed.historyPanelState, isMobile: false },
    });
    await f.commit();
    expect(f.panel('history')).toBeNull();
    f.view.inputs = {
      ...f.view.inputs,
      historyPanelState: {
        ...f.view.inputs.historyPanelState,
        isMobile: true,
        isOpen: true,
      },
      contentRevision: {},
    };
    await flush(f.view);
    expect(f.panel('history').open).toBe(true);
    expect(
      f.hosts.isPanelContentCommitted('history', f.view.inputs.contentRevision)
    ).toBe(false);
    expect(f.callbacks.onPanelOpenStart).not.toHaveBeenCalled();
    expect(f.callbacks.onPanelOpenEnd).not.toHaveBeenCalled();
  });

  it('waits for the matching retained layout commit on later opens and rejects retired revisions', async () => {
    const f = await fixture();
    await f.commit();
    const first = f.hosts.panelTargetFor('custom-body');
    const input = document.createElement('input');
    input.value = 'kept';
    first.append(input);
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: true },
      contentRevision: {},
    };
    await flush(f.view);
    const stale = f.hosts
      .getPanelContentSnapshot()
      .find((request) => request.panel === 'custom');
    expect(f.panel('custom').open).toBe(false);
    expect(f.callbacks.fireCustomPanelEvent).not.toHaveBeenCalled();
    f.view.inputs = { ...f.view.inputs, contentRevision: {} };
    await flush(f.view);
    expect(f.hosts.commitPanelContent(stale)).toBe(false);
    expect(f.panel('custom').open).toBe(false);
    await f.commit();
    expect(f.panel('custom').open).toBe(true);
    expect(f.callbacks.fireCustomPanelEvent).toHaveBeenCalledWith(
      BusEventType.CUSTOM_PANEL_PRE_OPEN
    );
    expect(f.hosts.panelTargetFor('custom-body')).toBe(first);
    expect(first.querySelector('input')).toBe(input);
    expect(input.value).toBe('kept');
  });

  it('keeps a higher frame open and lower frame inert until the whole retained commit is ready', async () => {
    const f = await fixture();
    await f.commit();
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: true },
    };
    await flush(f.view);
    const custom = f.panel('custom');
    f.view.inputs = {
      ...f.view.inputs,
      catastrophicErrorPanelState: {
        ...f.view.inputs.catastrophicErrorPanelState,
        isOpen: true,
      },
      contentRevision: {},
    };
    await flush(f.view);
    await f.commit();
    expect(custom.open).toBe(true);
    expect(custom.inert).toBe(true);
    f.view.inputs = {
      ...f.view.inputs,
      catastrophicErrorPanelState: {
        ...f.view.inputs.catastrophicErrorPanelState,
        isOpen: false,
      },
      contentRevision: {},
    };
    await flush(f.view);
    expect(f.panel('error').open).toBe(true);
    expect(custom.open).toBe(true);
    expect(custom.inert).toBe(true);
    const requests = f.hosts.getPanelContentSnapshot();
    const remaining = requests.find((request) => request.panel === 'iframe');
    for (const request of requests) {
      if (request !== remaining) {
        expect(f.hosts.commitPanelContent(request)).toBe(true);
      }
    }
    await flush(f.view);
    expect(f.panel('error').open).toBe(true);
    expect(custom.open).toBe(true);
    expect(custom.inert).toBe(true);
    expect(f.hosts.commitPanelContent(remaining)).toBe(true);
    await flush(f.view);
    expect(f.panel('error').open).toBe(false);
    expect(custom.open).toBe(true);
    expect(custom.inert).toBe(false);
  });

  it('delivers actual reactivation transitions only after the replacement content commits', async () => {
    const seed = makeConfigStore({}).getState();
    const f = await fixture({
      customPanelState: {
        ...seed.customPanelState,
        options: { ...seed.customPanelState.options, disableAnimation: true },
      },
    });
    await f.commit();
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: true },
    };
    await flush(f.view);
    f.view.inputs = {
      ...f.view.inputs,
      catastrophicErrorPanelState: {
        ...f.view.inputs.catastrophicErrorPanelState,
        isOpen: true,
      },
      contentRevision: {},
    };
    await flush(f.view);
    await f.commit();
    expect(f.panel('custom').open).toBe(true);
    expect(f.panel('custom').inert).toBe(true);
    jest.advanceTimersByTime(600);
    await flush(f.view);
    f.callbacks.fireCustomPanelEvent.mockClear();
    f.callbacks.onPanelOpenEnd.mockClear();
    const observed: {
      target: EventTarget;
      lowerOpen: boolean;
      lowerInert: boolean;
      higherOpen: boolean;
      committed: boolean;
    }[] = [];
    f.callbacks.onPanelOpenEnd.mockImplementation((event) => {
      observed.push({
        target: event.currentTarget,
        lowerOpen: f.panel('custom').open,
        lowerInert: f.panel('custom').inert,
        higherOpen: f.panel('error').open,
        committed: f.hosts.isPanelContentCommitted(
          'custom',
          f.view.inputs.contentRevision
        ),
      });
    });
    f.view.inputs = {
      ...f.view.inputs,
      catastrophicErrorPanelState: {
        ...f.view.inputs.catastrophicErrorPanelState,
        isOpen: false,
      },
      contentRevision: {},
    };
    await flush(f.view);
    expect(f.panel('custom').open).toBe(true);
    expect(f.panel('custom').inert).toBe(true);
    expect(f.panel('error').open).toBe(true);
    jest.advanceTimersByTime(600);
    await flush(f.view);
    expect(
      f.hosts.isPanelContentCommitted('custom', f.view.inputs.contentRevision)
    ).toBe(false);
    expect(f.callbacks.fireCustomPanelEvent).not.toHaveBeenCalled();
    expect(f.callbacks.onPanelOpenEnd).not.toHaveBeenCalled();
    await f.commit();
    jest.advanceTimersByTime(600);
    await flush(f.view);
    expect(observed).toEqual([
      {
        target: f.panel('custom'),
        lowerOpen: true,
        lowerInert: false,
        higherOpen: false,
        committed: true,
      },
    ]);
    expect(
      f.callbacks.fireCustomPanelEvent.mock.calls.map(([type]) => type)
    ).toEqual([
      BusEventType.CUSTOM_PANEL_PRE_OPEN,
      BusEventType.CUSTOM_PANEL_OPEN,
    ]);
    expect(f.callbacks.onPanelOpenEnd).toHaveBeenCalledTimes(1);
    expect(
      f.callbacks.onPanelOpenEnd.mock.calls[0][0].detail.isReactivation
    ).toBe(true);
  });

  it('keeps currentTarget and physical close state available inside each transition callback', async () => {
    const seed = makeConfigStore({}).getState();
    const f = await fixture({
      customPanelState: {
        ...seed.customPanelState,
        isOpen: true,
        options: { ...seed.customPanelState.options, disableAnimation: true },
      },
    });
    await f.commit();
    const custom = f.panel('custom');
    const observations: {
      target: EventTarget;
      open: boolean;
      committed: boolean;
    }[] = [];
    f.callbacks.onPanelCloseStart.mockImplementation((event) => {
      observations.push({
        target: event.currentTarget,
        open: custom.open,
        committed: f.hosts.isPanelContentCommitted(
          'custom',
          f.view.inputs.contentRevision
        ),
      });
    });
    f.view.inputs = {
      ...f.view.inputs,
      customPanelState: { ...f.view.inputs.customPanelState, isOpen: false },
      contentRevision: {},
    };
    await flush(f.view);
    expect(custom.open).toBe(true);
    expect(observations).toEqual([]);
    jest.advanceTimersByTime(600);
    await flush(f.view);
    expect(custom.open).toBe(true);
    await f.commit();
    expect(observations).toEqual([
      { target: custom, open: false, committed: true },
    ]);
  });

  it('uses native prompt buttons, focuses and announces once, and cancels Escape without bubbling', async () => {
    const f = await fixture();
    await f.commit();
    f.view.inputs = { ...f.view.inputs, showScreenShareRequest: true };
    await flush(f.view);
    const frame = f.panel('screenShare');
    const footer = frame.querySelector('[slot="footer"]');
    const buttons = footer.querySelectorAll('cds-button');
    (buttons[0] as HTMLElement).click();
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenLastCalledWith(
      ScreenShareState.DECLINED
    );
    (buttons[1] as HTMLElement).click();
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenLastCalledWith(
      ScreenShareState.ACCEPTED
    );
    expect(f.callbacks.announce).toHaveBeenCalledTimes(1);
    frame.dispatchEvent(
      new CustomEvent('openend', { detail: { isReactivation: true } })
    );
    expect(f.callbacks.announce).toHaveBeenCalledTimes(1);
    const bubbled = jest.fn();
    f.view.addEventListener('keydown', bubbled);
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    frame.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(bubbled).not.toHaveBeenCalled();
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenLastCalledWith(
      ScreenShareState.DECLINED
    );
  });

  it('keeps the native disclaimer footer disabled until read and preserves it across narrow updates', async () => {
    const f = await fixture();
    const button = f.view.disclaimerButton();
    expect(button.disabled).toBe(true);
    f.view
      .querySelector('cds-aichat-disclaimer-body')
      .observeScroll({ isScrollable: true, isAtBottom: false });
    await flush(f.view);
    expect(button.disabled).toBe(true);
    f.view
      .querySelector('cds-aichat-disclaimer-body')
      .observeScroll({ isScrollable: true, isAtBottom: true });
    await flush(f.view);
    expect(button.disabled).toBe(false);
    applyConfigChange(f.store, {
      ...f.store.getState().config.public,
      strings: {
        disclaimer_accept: 'Agree',
        disclaimer_acceptance_label: 'Accept terms',
      },
    });
    f.store.dispatch(
      actions.setAppStateValue('chatWidthBreakpoint', ChatWidthBreakpoint.WIDE)
    );
    await flush(f.view);
    expect(f.view.disclaimerButton()).toBe(button);
    expect(button.textContent).toBe('Agree');
    expect(button.getAttribute('aria-label')).toBe('Accept terms');
    expect(button.size).toBe('2xl');
    expect(button.disabled).toBe(false);
    button.click();
    expect(f.callbacks.onAcceptDisclaimer).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated typing, releases targets and subscriptions on detach, then reconnects current state once', async () => {
    const f = await fixture();
    const peak = f.subscriptions.size;
    const render = jest.spyOn(
      f.view as unknown as { renderView(): unknown },
      'renderView'
    );
    f.store.dispatch(
      actions.setChatMessagesStateProperty('isMessageLoadingCounter', 1)
    );
    await flush(f.view);
    expect(render).not.toHaveBeenCalled();
    const target = f.hosts.panelTargetFor('custom-body');
    const request = f.hosts
      .getPanelContentSnapshot()
      .find((item) => item.panel === 'custom');
    f.view.remove();
    await Promise.resolve();
    expect(f.subscriptions.size).toBe(0);
    expect(f.hosts.getPanelContentSnapshot()).toEqual([]);
    expect(f.hosts.commitPanelContent(request)).toBe(false);
    expect(f.view.requestPanelFocus('custom')).toBe(false);
    applyConfigChange(f.store, {
      ...f.store.getState().config.public,
      strings: { aria_customPanel: 'Updated custom' },
    });
    f.shell.append(f.view);
    await flush(f.view);
    expect(f.subscriptions.size).toBe(peak);
    expect(f.panel('custom').panelAriaLabel).toBe('Updated custom');
    expect(f.hosts.panelTargetFor('custom-body')).toBe(target);
    expect(f.errorOccurred).not.toHaveBeenCalled();
  });
});
