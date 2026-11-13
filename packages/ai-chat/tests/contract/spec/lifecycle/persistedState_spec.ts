/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';

import {
  MessageSendSource,
  PersistableState,
  PublicConfig,
  ViewType,
  readCarbonChatSession,
} from '../../../../src/aiChatEntry';
import {
  changeView,
  contractChat,
  contractSetup,
  fakeBackend,
  openChat,
  pause,
  showUnread,
  textResponse,
  typeText,
} from '../../helpers';

const CLOSED = { launcher: true, mainWindow: false };
const OPEN = { launcher: false, mainWindow: true };

/** Every field of `PersistableState`, in a stable order. */
const PERSISTABLE_KEYS = [
  'disclaimersAccepted',
  'hasSentNonWelcomeMessage',
  'homeScreenState',
  'humanAgentState',
  'launcherIsExpanded',
  'launcherShouldStartCallToActionCounterIfEnabled',
  'showUnreadIndicator',
  'viewState',
];

/** A host's `onStateChange` that keeps every value it gets. */
function stateRecorder() {
  const values: PersistableState[] = [];
  return {
    onStateChange: (state: PersistableState) => {
      values.push(state);
    },
    values,
    last: () => values[values.length - 1],
  };
}

/** Mounts a chat whose welcome requests the backend answers at once. */
async function mountWith(config: Partial<PublicConfig>) {
  const backend = fakeBackend({ autoResolve: true });
  const chat = await contractChat({
    ...config,
    messaging: {
      customSendMessage: backend.customSendMessage,
      ...config.messaging,
    },
  });
  return { ...chat, backend };
}

/** Leaves a saved session with the main window open, from a default chat. */
async function saveOpenSession() {
  const first = await mountWith({ messaging: { skipWelcome: true } });
  await changeView(first.instance, ViewType.MAIN_WINDOW);
  first.unmount();
  expect(readCarbonChatSession().viewState).toEqual(OPEN);
}

// @covers config.persistedState config.persistedState.initialState
// @covers state.hasSentNonWelcomeMessage state.disclaimersAccepted
// @covers state.homeScreenState state.homeScreenState.isHomeScreenOpen
// @covers state.homeScreenState.showBackToAssistant state.showUnreadIndicator
// @covers state.wasLoadedFromBrowser state.launcherIsExpanded
// @covers state.launcherShouldStartCallToActionCounterIfEnabled state.viewState
describe('persistedState.initialState', () => {
  contractSetup();

  it('boots the saved fields from it, marked as loaded from the browser', async () => {
    const hostname = window.location.hostname;
    const { instance } = await mountWith({
      persistedState: {
        initialState: {
          viewState: CLOSED,
          showUnreadIndicator: true,
          hasSentNonWelcomeMessage: true,
          disclaimersAccepted: { [hostname]: true },
          homeScreenState: {
            isHomeScreenOpen: true,
            showBackToAssistant: true,
          },
        } as PersistableState,
      },
    });
    const state = instance.getState();
    expect(state.viewState).toEqual(CLOSED);
    expect(state.showUnreadIndicator).toBe(true);
    expect(state.hasSentNonWelcomeMessage).toBe(true);
    expect(state.disclaimersAccepted).toEqual({ [hostname]: true });
    expect(state.homeScreenState).toEqual({
      isHomeScreenOpen: true,
      showBackToAssistant: true,
    });
    expect(state.wasLoadedFromBrowser).toBe(true);
  });

  it('never restores an expanded launcher or a pending call to action', async () => {
    const { instance } = await mountWith({
      persistedState: {
        initialState: {
          viewState: CLOSED,
          launcherIsExpanded: true,
          launcherShouldStartCallToActionCounterIfEnabled: true,
        } as PersistableState,
      },
    });
    expect(instance.getState().launcherIsExpanded).toBe(false);
    expect(
      instance.getState().launcherShouldStartCallToActionCounterIfEnabled
    ).toBe(false);
  });

  it('opens the main window at load when its view has it open, and sends the welcome', async () => {
    const { instance, backend } = await mountWith({
      persistedState: {
        initialState: { viewState: OPEN } as PersistableState,
      },
    });
    expect(instance.getState().viewState).toEqual(OPEN);
    const welcome = await backend.next();
    expect(welcome.options.busEventSend.source).toBe(
      MessageSendSource.WELCOME_REQUEST
    );
  });

  it('wins over openChatByDefault: a closed view stays closed and sends nothing', async () => {
    const { instance, backend } = await mountWith({
      openChatByDefault: true,
      persistedState: {
        initialState: { viewState: CLOSED } as PersistableState,
      },
    });
    await pause();
    expect(instance.getState().viewState).toEqual(CLOSED);
    expect(backend.requests).toHaveLength(0);
  });

  it('sends the welcome on open even when it says a message was sent', async () => {
    // The PersistedStateConfig JSDoc says dropping hasSentNonWelcomeMessage
    // re-sends the welcome on reload. On `main` the flag doesn't gate the
    // welcome: a new mount with no history sends it either way.
    const { instance, backend } = await mountWith({
      persistedState: {
        initialState: {
          viewState: CLOSED,
          hasSentNonWelcomeMessage: true,
        } as PersistableState,
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    const welcome = await backend.next();
    expect(welcome.options.busEventSend.source).toBe(
      MessageSendSource.WELCOME_REQUEST
    );
  });

  it('ignores a session saved in sessionStorage, and leaves it as it was', async () => {
    await saveOpenSession();
    const saved = readCarbonChatSession();
    const { instance } = await mountWith({
      messaging: { skipWelcome: true },
      persistedState: {
        initialState: { viewState: CLOSED } as PersistableState,
      },
    });
    expect(instance.getState().viewState).toEqual(CLOSED);
    await changeView(instance, ViewType.MAIN_WINDOW);
    await changeView(instance, ViewType.LAUNCHER);
    await showUnread(instance);
    expect(readCarbonChatSession()).toEqual(saved);
  });
});

// @covers config.persistedState config.persistedState.onStateChange
// @covers state.viewState state.showUnreadIndicator state.hasSentNonWelcomeMessage
// @covers state.wasLoadedFromBrowser state.input.rawValue
describe('persistedState.onStateChange', () => {
  contractSetup();

  it('reports a saved-field change with the whole PersistableState and no bookkeeping', async () => {
    const recorder = stateRecorder();
    const { instance } = await mountWith({
      messaging: { skipWelcome: true },
      persistedState: { onStateChange: recorder.onStateChange },
    });
    recorder.values.length = 0;
    await changeView(instance, ViewType.MAIN_WINDOW);
    // On `main` one view change can report the same value more than once, so
    // this reads the last report rather than counting them.
    expect(recorder.values.length).toBeGreaterThan(0);
    const reported = recorder.last();
    expect(Object.keys(reported).sort()).toEqual(PERSISTABLE_KEYS);
    expect(reported.viewState).toEqual(OPEN);
    expect(reported.hasSentNonWelcomeMessage).toBe(false);
    expect(reported.disclaimersAccepted).toEqual({});
  });

  it('reports the latest value after each change', async () => {
    const recorder = stateRecorder();
    const { instance } = await mountWith({
      messaging: { skipWelcome: true },
      persistedState: { onStateChange: recorder.onStateChange },
    });
    await showUnread(instance);
    expect(recorder.last().showUnreadIndicator).toBe(true);
    expect(recorder.last().viewState).toEqual(CLOSED);
    await showUnread(instance, false);
    expect(recorder.last().showUnreadIndicator).toBe(false);
  });

  it('is not called for a change outside the saved fields, such as typing', async () => {
    const recorder = stateRecorder();
    const { instance } = await openChat({
      persistedState: { onStateChange: recorder.onStateChange },
    });
    await pause();
    recorder.values.length = 0;
    await typeText('a draft');
    await act(async () => {
      instance.updateIsMessageLoadingCounter('increase');
    });
    await pause();
    expect(instance.getState().input.rawValue).toBe('a draft');
    expect(recorder.values).toEqual([]);
  });

  it('alone, starts a fresh session: a saved session is neither read nor written', async () => {
    await saveOpenSession();
    const saved = readCarbonChatSession();
    const recorder = stateRecorder();
    const { instance } = await mountWith({
      messaging: { skipWelcome: true },
      persistedState: { onStateChange: recorder.onStateChange },
    });
    expect(instance.getState().viewState).toEqual(CLOSED);
    expect(instance.getState().wasLoadedFromBrowser).toBe(false);
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(recorder.last().viewState).toEqual(OPEN);
    expect(readCarbonChatSession()).toEqual(saved);
  });

  it('writes nothing to sessionStorage', async () => {
    const recorder = stateRecorder();
    const { instance } = await mountWith({
      messaging: { skipWelcome: true },
      persistedState: { onStateChange: recorder.onStateChange },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    expect(readCarbonChatSession()).toBeNull();
  });

  it('gives a value that restores the session as the next mount’s initialState', async () => {
    const recorder = stateRecorder();
    const first = await mountWith({
      persistedState: { onStateChange: recorder.onStateChange },
    });
    await changeView(first.instance, ViewType.MAIN_WINDOW);
    await act(() =>
      first.instance.messaging.addMessage(textResponse('Hi', 'r1'))
    );
    expect(recorder.last().hasSentNonWelcomeMessage).toBe(true);
    first.unmount();

    const { instance } = await mountWith({
      messaging: { skipWelcome: true },
      persistedState: { initialState: recorder.last() },
    });
    expect(instance.getState().viewState).toEqual(OPEN);
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(true);
    expect(instance.getState().wasLoadedFromBrowser).toBe(true);
  });
});
