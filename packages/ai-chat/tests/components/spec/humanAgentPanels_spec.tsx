/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fireEvent, within } from '@testing-library/react';
import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import type NativePanel from '@carbon/ai-chat-components/es/components/chat-shell/src/panel.js';
import type NativeShell from '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import type CDSButton from '@carbon/web-components/es/components/button/button.js';
import type Toolbar from '@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js';
import NativePanels from '../../../src/chat/components/panels/NativePanels';
import { ExtensionHosts } from '../../../src/chat/services/extensionHosts';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type {
  PanelViewInputs,
  PanelCompositionCallbacks,
} from '../../../src/chat/utils/panelComposition';
import { ScreenShareState } from '../../../src/types/config/ServiceDeskConfig';
import { ChatWidthBreakpoint } from '../../../src/types/state/AppState';
import languagePack from '../../../src/chat/languages/en.json';
import { EventBus } from '../../../src/chat/events/EventBus';
import actions from '../../../src/chat/store/actions';
import { createIntl } from '../../../src/chat/utils/i18n';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import {
  applyConfigChange,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const mockFocus = jest.fn();
jest.mock('../../../src/chat/utils/domUtils', () => ({
  ...jest.requireActual('../../../src/chat/utils/domUtils'),
  focusOnFirstFocusableElement: (element: HTMLElement) => mockFocus(element),
}));

class PromptProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-prompt-provider', PromptProvider);
const states = new Set<ChatViewState>();

async function flush(view: NativePanels) {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
    await Promise.all(
      Array.from(
        view.querySelectorAll<LitElement>(
          'cds-aichat-panel, cds-aichat-confirmation-body, cds-button, cds-aichat-toolbar'
        )
      ).map((child) => child.updateComplete)
    );
  }
}

async function fixture(
  name: 'endChat' | 'screenShare',
  connected = true,
  suspended = false,
  confirmation: PanelViewInputs['endChatConfirmation'] = null
) {
  const store = makeConfigStore({});
  const persisted = store.getState().persistedToBrowserStorage;
  store.dispatch(
    actions.setAppStateValue('persistedToBrowserStorage', {
      ...persisted,
      humanAgentState: {
        ...persisted.humanAgentState,
        isConnected: connected,
        isSuspended: suspended,
      },
    })
  );
  store.dispatch(actions.setViewState({ mainWindow: true, launcher: false }));
  const eventBus = new EventBus();
  const manager = {
    store,
    eventBus,
    intl: createIntl({ locale: 'en', messages: languagePack }),
    actions: { errorOccurred: jest.fn() },
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
  state.connect();
  states.add(state);
  const provider = document.createElement(
    'test-native-prompt-provider'
  ) as PromptProvider;
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
    endChatConfirmation: confirmation,
    showEndChatConfirmation: name === 'endChat',
    showScreenShareRequest: name === 'screenShare',
    isHydratingComplete: true,
    shouldShowHydrationPanel: false,
    isHomeScreenActive: false,
    customPanelState: current.customPanelState,
    historyPanelState: current.historyPanelState,
    showDisclaimer: false,
    responsePanelState: current.responsePanelState,
    responseHasMessage: false,
    iFramePanelState: current.iFramePanelState,
    viewSourcePanelState: current.viewSourcePanelState,
    isInputReadonly: false,
    catastrophicErrorPanelState: current.catastrophicErrorPanelState,
    contentRevision: {},
  };
  view.hosts = hosts;
  view.callbacks = callbacks;
  shell.append(view);
  await shell.updateComplete;
  await flush(view);
  for (const request of hosts.getPanelContentSnapshot()) {
    expect(hosts.commitPanelContent(request)).toBe(true);
  }
  await flush(view);
  const frame = view.querySelector<NativePanel>(`[data-panel-name="${name}"]`);
  const footer = frame.querySelector<HTMLElement>('[slot="footer"]');
  const buttons = Array.from(footer.querySelectorAll<CDSButton>('cds-button'));
  const openEnd = (isReactivation = false) =>
    frame.dispatchEvent(
      new CustomEvent('openend', { detail: { isReactivation } })
    );
  return { view, store, frame, footer, buttons, callbacks, openEnd };
}

beforeEach(() => {
  setupBeforeEach();
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
});
afterEach(() => {
  setupAfterEach();
  states.forEach((state) => state.disconnect());
  states.clear();
  jest.useRealTimers();
});

describe('end human agent chat panel', () => {
  it.each([
    [
      true,
      false,
      'agent_endChat',
      'agent_confirmEndChat',
      'agent_confirmEndChatYes',
    ],
    [
      true,
      true,
      'agent_endChat',
      'agent_confirmEndChat',
      'agent_confirmEndSuspendedYes',
    ],
    [
      false,
      false,
      'agent_confirmCancelRequestTitle',
      'agent_confirmCancelRequestMessage',
      'agent_confirmCancelRequestYes',
    ],
  ] as const)(
    'uses the connected=%s and suspended=%s language variant',
    async (connected, suspended, title, message, confirmLabel) => {
      const f = await fixture('endChat', connected, suspended);
      expect(
        within(f.frame).getByRole('heading', { name: languagePack[title] })
      ).toBeTruthy();
      expect(within(f.frame).getByText(languagePack[message])).toBeTruthy();
      expect(f.frame.panelAriaLabel).toBe(languagePack[title]);
      expect(f.buttons[1].textContent).toBe(languagePack[confirmLabel]);
      expect(f.buttons[0].textContent).toBe(
        languagePack.agent_confirmEndChatNo
      );
      f.buttons[1].click();
      expect(f.callbacks.confirmHumanAgentEndChat).toHaveBeenCalledTimes(1);
      f.buttons[0].click();
      expect(f.callbacks.hideConfirmEndChat).toHaveBeenCalledTimes(1);
    }
  );

  it('uses card title, message, and handlers instead of the global end-chat handlers', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const f = await fixture('endChat', true, false, {
      title: 'Finish support',
      message: 'Leave this conversation?',
      onConfirm,
      onCancel,
    });
    expect(
      within(f.frame).getByRole('heading', { name: 'Finish support' })
    ).toBeTruthy();
    expect(within(f.frame).getByText('Leave this conversation?')).toBeTruthy();
    f.openEnd();
    expect(f.callbacks.announce).toHaveBeenCalledWith(
      'Leave this conversation?'
    );
    f.buttons[1].click();
    f.buttons[0].click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(f.callbacks.confirmHumanAgentEndChat).not.toHaveBeenCalled();
    expect(f.callbacks.hideConfirmEndChat).not.toHaveBeenCalled();
  });

  it('updates native prompt text without interpreting host text as markup', async () => {
    const confirmation = {
      title: '<strong>Finish support</strong>',
      message: '<img src=x onerror=alert(1)>',
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    };
    const f = await fixture('endChat', true, false, confirmation);
    const heading = within(f.frame).getByRole('heading', {
      name: confirmation.title,
    });
    const body = heading.closest('cds-aichat-confirmation-body');
    expect(body.shadowRoot).toBeNull();
    expect(body.getAttribute('slot')).toBe('body');
    expect(body.querySelector('strong, img')).toBeNull();
    expect(within(f.frame).getByText(confirmation.message)).toBeTruthy();
    f.view.inputs = {
      ...f.view.inputs,
      endChatConfirmation: {
        ...confirmation,
        title: 'Leave support',
        message: 'You can start another conversation.',
      },
    };
    await flush(f.view);
    expect(
      within(f.frame).getByRole('heading', { name: 'Leave support' })
    ).toBe(heading);
    expect(
      within(f.frame).getByText('You can start another conversation.')
    ).toBeTruthy();
  });

  it('reacts to human-agent state and translated labels without replacing the footer', async () => {
    const f = await fixture('endChat');
    const persisted = f.store.getState().persistedToBrowserStorage;
    f.store.dispatch(
      actions.setAppStateValue('persistedToBrowserStorage', {
        ...persisted,
        humanAgentState: {
          ...persisted.humanAgentState,
          isConnected: false,
          isSuspended: true,
        },
      })
    );
    applyConfigChange(f.store, {
      ...f.store.getState().config.public,
      strings: {
        agent_confirmCancelRequestTitle: 'Cancel support',
        agent_confirmCancelRequestMessage: 'Stop waiting?',
        agent_confirmEndSuspendedYes: 'Leave queue',
        agent_confirmEndChatNo: 'Stay here',
      },
    });
    await flush(f.view);
    expect(
      within(f.frame).getByRole('heading', { name: 'Cancel support' })
    ).toBeTruthy();
    expect(within(f.frame).getByText('Stop waiting?')).toBeTruthy();
    expect(f.frame.querySelector('[slot="footer"]')).toBe(f.footer);
    expect(f.buttons[1].textContent).toBe('Leave queue');
    expect(f.buttons[0].textContent).toBe('Stay here');
    f.openEnd();
    expect(f.callbacks.announce).toHaveBeenLastCalledWith('Stop waiting?');
  });
});

describe('screen share request panel', () => {
  it.each([
    ['agent_sharingAcceptButton', ScreenShareState.ACCEPTED, 1],
    ['agent_sharingDeclineButton', ScreenShareState.DECLINED, 0],
  ] as const)('maps %s to %s', async (label, state, index) => {
    const f = await fixture('screenShare');
    expect(f.buttons[index].textContent).toBe(languagePack[label]);
    f.buttons[index].click();
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenCalledTimes(1);
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenCalledWith(state);
  });

  it('declines from the actual header close button', async () => {
    const f = await fixture('screenShare');
    const toolbar = f.frame.querySelector<Toolbar>('cds-aichat-toolbar');
    expect(toolbar.actions[0].text).toBe(
      languagePack.agent_sharingDeclineButton
    );
    const close =
      toolbar.shadowRoot.querySelector<HTMLElement>('cds-icon-button');
    expect(close).not.toBeNull();
    close.click();
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenCalledTimes(1);
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenCalledWith(
      ScreenShareState.DECLINED
    );
  });

  it('declines on Escape and stops Escape from reaching the chat shell', async () => {
    const f = await fixture('screenShare');
    const onKeyDown = jest.fn();
    f.view.addEventListener('keydown', onKeyDown);
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    f.buttons[0].dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenCalledWith(
      ScreenShareState.DECLINED
    );
    expect(onKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(f.buttons[0], { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(f.callbacks.updateScreenShareRequest).toHaveBeenCalledTimes(1);
  });

  it('preserves focus on reactivation and resets after a close and reopen', async () => {
    const f = await fixture('screenShare');
    f.openEnd();
    f.openEnd(true);
    expect(mockFocus).toHaveBeenCalledTimes(1);
    expect(f.callbacks.announce).toHaveBeenCalledTimes(1);
    f.view.inputs = { ...f.view.inputs, showScreenShareRequest: false };
    await flush(f.view);
    jest.advanceTimersByTime(600);
    await flush(f.view);
    f.view.inputs = { ...f.view.inputs, showScreenShareRequest: true };
    await flush(f.view);
    jest.advanceTimersByTime(600);
    await flush(f.view);
    expect(mockFocus).toHaveBeenCalledTimes(2);
    expect(f.callbacks.announce).toHaveBeenCalledTimes(2);
    expect(mockFocus).toHaveBeenLastCalledWith(f.footer);
  });

  it('requests footer focus before announcing and only after the panel opens', async () => {
    const f = await fixture('screenShare');
    expect(mockFocus).not.toHaveBeenCalled();
    expect(f.callbacks.announce).not.toHaveBeenCalled();
    f.openEnd();
    expect(mockFocus).toHaveBeenCalledWith(f.footer);
    expect(f.callbacks.announce).toHaveBeenCalledWith(
      languagePack.agent_sharingRequestMessage
    );
    expect(mockFocus.mock.invocationCallOrder[0]).toBeLessThan(
      f.callbacks.announce.mock.invocationCallOrder[0]
    );
  });

  it('keeps frame defaults, footer classes, secondary cancel kind and responsive button sizes', async () => {
    const f = await fixture('screenShare');
    expect(f.frame.priority).toBe(75);
    expect(f.frame.fullWidth).toBe(true);
    expect(f.frame.showChatHeader).toBe(false);
    expect(f.frame.panelAriaLabel).toBe(languagePack.agent_sharingRequestTitle);
    expect(
      f.footer.classList.contains('cds-aichat--confirm-panel__footer')
    ).toBe(true);
    expect(
      f.buttons.every((button) =>
        button.classList.contains('cds-aichat--confirm-panel__button')
      )
    ).toBe(true);
    expect(f.buttons[0].kind).toBe('secondary');
    expect(f.buttons[1].kind).toBe('primary');
    f.store.dispatch(
      actions.setAppStateValue(
        'chatWidthBreakpoint',
        ChatWidthBreakpoint.NARROW
      )
    );
    await flush(f.view);
    expect(f.buttons.map((button) => button.size)).toEqual(['lg', 'lg']);
    f.store.dispatch(
      actions.setAppStateValue('chatWidthBreakpoint', ChatWidthBreakpoint.WIDE)
    );
    await flush(f.view);
    expect(f.buttons.map((button) => button.size)).toEqual(['2xl', '2xl']);
    expect(Array.from(f.footer.querySelectorAll('cds-button'))).toEqual(
      f.buttons
    );
  });
});
