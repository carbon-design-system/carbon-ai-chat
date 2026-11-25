/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Mocked as VitestMocked } from 'vitest';
import { fireEvent, within } from '@testing-library/react';
import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import type NativePanel from '@carbon/ai-chat-components/es/components/chat-shell/src/panel.js';
import type NativeShell from '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import type CDSButton from '@carbon/web-components/es/components/button/button.js';
import type Toolbar from '@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js';
import NativePanels from '../NativePanels';
import { ExtensionHosts } from '../../../services/extensionHosts';
import { ChatMountState } from '../../../services/chatMountState';
import type { ServiceManager } from '../../../../sdk/services/ServiceManager';
import type {
  PanelViewInputs,
  PanelCompositionCallbacks,
} from '../../../utils/panelComposition';
import { ScreenShareState } from '../../../../types/config/ServiceDeskConfig';
import languagePack from '../../../../languages/en.json';
import { EventBus } from '../../../../sdk/events/EventBus';
import actions from '../../../../sdk/store/actions';
import { createIntl } from '../../../../sdk/utils/i18n';
import { chatMountStateContext } from '../../../../web-components/shared/chat-mount-state-context';
import {
  applyConfigChange,
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
  withPublicState,
  slotSourceOf,
} from '../../../__tests__/helpers/chat';
import { viewActions } from '../../../state';

const mockFocus = vi.fn();
vi.mock('../../../utils/domUtils', async () => ({
  ...(await vi.importActual<typeof import('../../../utils/domUtils')>(
    '../../../utils/domUtils'
  )),
  focusOnFirstFocusableElement: (element: HTMLElement) => mockFocus(element),
}));

class PromptProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatMountStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-prompt-provider', PromptProvider);
const states = new Set<ChatMountState>();

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
  prompt: PanelViewInputs['prompt'] = name === 'endChat'
    ? { id: 'end-chat', kind: 'endChat' }
    : null
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
  store.dispatch(
    viewActions.setViewState({ mainWindow: true, launcher: false })
  );
  const eventBus = new EventBus();
  const manager = withPublicState({
    store,
    eventBus,
    intl: createIntl({ locale: 'en', messages: languagePack }),
    actions: { errorOccurred: vi.fn() },
  } as unknown as ServiceManager);
  const state = new ChatMountState(manager, { width: 800, height: 600 });
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
    slotSourceOf(eventBus),
    provider,
    store,
    () => false
  );
  const callbacks: VitestMocked<PanelCompositionCallbacks> = {
    onPanelOpenStart: vi.fn(),
    onPanelOpenEnd: vi.fn(),
    onPanelCloseStart: vi.fn(),
    onPanelCloseEnd: vi.fn(),
    onClose: vi.fn(),
    onRestart: vi.fn(),
    onToggleHomeScreen: vi.fn(),
    onAcceptDisclaimer: vi.fn(),
    answerPrompt: vi.fn(),
    fireCustomPanelEvent: vi.fn(),
    resetCustomPanelOptions: vi.fn(),
    closeCustomPanel: vi.fn(),
    closeResponsePanel: vi.fn(),
    clearResponsePanelContent: vi.fn(),
    closeIFramePanel: vi.fn(),
    closeViewSourcePanel: vi.fn(),
    closeHistoryPanel: vi.fn(),
    updateScreenShareRequest: vi.fn(),
    announce: vi.fn(),
  };
  const current = store.getState();
  view.inputs = {
    prompt,
    showScreenShareRequest: name === 'screenShare',
    isHydratingComplete: true,
    shouldShowHydrationPanel: false,
    isHomeScreenActive: false,
    customPanelState: current.view.customPanelState,
    historyPanelState: current.view.historyPanelState,
    showDisclaimer: false,
    responsePanelState: current.view.responsePanelState,
    responseHasMessage: false,
    iFramePanelState: current.view.iFramePanelState,
    viewSourcePanelState: current.view.viewSourcePanelState,
    isInputReadonly: false,
    catastrophicErrorPanelState: current.view.catastrophicErrorPanelState,
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
  vi.clearAllMocks();
  vi.useFakeTimers({
    toFake: [
      'Date',
      'hrtime',
      'performance',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterEach(() => {
  setupAfterEach();
  states.forEach((state) => state.disconnect());
  states.clear();
  vi.useRealTimers();
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
      expect(f.callbacks.answerPrompt).toHaveBeenCalledTimes(1);
      expect(f.callbacks.answerPrompt).toHaveBeenLastCalledWith(
        'end-chat',
        'confirm'
      );
      f.buttons[0].click();
      expect(f.callbacks.answerPrompt).toHaveBeenCalledTimes(2);
      expect(f.callbacks.answerPrompt).toHaveBeenLastCalledWith(
        'end-chat',
        'cancel'
      );
    }
  );

  it('updates native prompt text without interpreting host text as markup', async () => {
    const confirmation = {
      id: 'card',
      kind: 'humanAgent' as const,
      title: '<strong>Finish support</strong>',
      message: '<img src=x onerror=alert(1)>',
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
      prompt: {
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
    const onKeyDown = vi.fn();
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
});
