/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Mocked as VitestMocked } from 'vitest';
import { ContextProvider } from '@lit/context';

import { LitElement, nothing } from 'lit';

import '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import type NativePanel from '@carbon/ai-chat-components/es/components/chat-shell/src/panel.js';
import type NativeShell from '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import '../NativePanels';
import type NativePanels from '../NativePanels';
import { ExtensionHosts } from '../../../services/extensionHosts';

import { ChatMountState } from '../../../services/chatMountState';

import type { ServiceManager } from '../../../../sdk/services/ServiceManager';

import type {
  PanelViewInputs,
  PanelCompositionCallbacks,
  PanelName,
} from '../../../utils/panelComposition';

import { chatMountStateContext } from '../../../../web-components/shared/chat-mount-state-context';

import { createIntl } from '../../../../sdk/utils/i18n';

import { EventBus } from '../../../../sdk/events/EventBus';

import {
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
  slotSourceOf,
} from '../../../__tests__/helpers/chat';

import { viewActions } from '../../../state';

class PanelProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatMountStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-panels-provider', PanelProvider);
const states = new Set<ChatMountState>();

export async function flush(view: NativePanels) {
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

export async function fixture(
  overrides: Partial<PanelViewInputs> = {},
  beforeAppend?: (hosts: ExtensionHosts) => void
) {
  const store = makeConfigStore({
    disclaimer: { isOn: true, disclaimerHTML: '<p>Terms</p>' },
    history: { isOn: true },
  });
  store.dispatch(
    viewActions.setViewState({ mainWindow: true, launcher: false })
  );
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
  const errorOccurred = vi.fn();
  const eventBus = new EventBus();
  const manager = {
    store,
    eventBus,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatMountState(manager, { width: 800, height: 600 });
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
    prompt: null,
    showScreenShareRequest: false,
    isHydratingComplete: true,
    shouldShowHydrationPanel: false,
    isHomeScreenActive: false,
    customPanelState: current.view.customPanelState,
    historyPanelState: { ...current.view.historyPanelState, isMobile: true },
    showDisclaimer: false,
    responsePanelState: current.view.responsePanelState,
    responseHasMessage: false,
    iFramePanelState: current.view.iFramePanelState,
    viewSourcePanelState: current.view.viewSourcePanelState,
    isInputReadonly: false,
    catastrophicErrorPanelState: current.view.catastrophicErrorPanelState,
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

/**
 * Registers the fixture's per-test setup: fake timers, and disconnecting
 * each mount state the fixture created.
 */
export function setupNativePanelFixture() {
  beforeEach(() => {
    setupBeforeEach();
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
    vi.restoreAllMocks();
  });
}
