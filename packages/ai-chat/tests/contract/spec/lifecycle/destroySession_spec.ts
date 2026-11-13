/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  CancellationReason,
  ChatInstance,
  MessageResponse,
  MessageResponseTypes,
  PersistableState,
  PublicConfig,
  ViewType,
  readCarbonChatSession,
} from '../../../../src/aiChatEntry';
import {
  acceptDisclaimer,
  changeView,
  contractChat,
  contractSetup,
  countChatReady,
  fakeBackend,
  instanceSender,
  pause,
  recordEvents,
  showUnread,
  startSend,
  textResponse,
} from '../../helpers';

const CLOSED = { launcher: true, mainWindow: false };
const OPEN = { launcher: false, mainWindow: true };

/**
 * Mounts a chat with the main window open, then adds a reply and shows the
 * unread indicator, so the saved fields differ from their defaults.
 */
async function usedChat(config: Partial<PublicConfig> = {}) {
  const backend = fakeBackend({ autoResolve: true });
  const ready = countChatReady();
  const chat = await contractChat({
    ...config,
    onBeforeRender: ready.onBeforeRender,
    messaging: {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
      ...config.messaging,
    },
  });
  await changeView(chat.instance, ViewType.MAIN_WINDOW);
  await act(() => chat.instance.messaging.addMessage(textResponse('Hi', 'r1')));
  await showUnread(chat.instance);
  const state = chat.instance.getState();
  expect(state.hasSentNonWelcomeMessage).toBe(true);
  expect(state.showUnreadIndicator).toBe(true);
  return { ...chat, backend, ready };
}

const destroy = (instance: ChatInstance, keepOpenState?: boolean) =>
  act(() => instance.destroySession(keepOpenState));

// @covers instance.destroySession state.hasSentNonWelcomeMessage
// @covers state.showUnreadIndicator state.viewState state.messages
// @covers state.disclaimersAccepted export.aiChatEntry.CancellationReason
describe('destroySession', () => {
  contractSetup();

  it('resets the saved fields to their defaults', async () => {
    const { instance } = await usedChat();
    await destroy(instance);
    const state = instance.getState();
    expect(state.hasSentNonWelcomeMessage).toBe(false);
    expect(state.showUnreadIndicator).toBe(false);
  });

  it('forgets an accepted disclaimer', async () => {
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      disclaimer: { isOn: true, disclaimerHTML: '<p>Contract terms</p>' },
    });
    await acceptDisclaimer(instance);
    expect(instance.getState().disclaimersAccepted).toEqual({
      [window.location.hostname]: true,
    });
    await destroy(instance);
    expect(instance.getState().disclaimersAccepted).toEqual({});
  });

  it('closes the main window to the launcher, firing only state:change', async () => {
    const { instance } = await usedChat();
    const events = recordEvents(instance);
    await destroy(instance);
    expect(instance.getState().viewState).toEqual(CLOSED);
    expect(events.types().length).toBeGreaterThan(0);
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual([]);
  });

  it('keeps the open main window with keepOpenState true', async () => {
    const { instance } = await usedChat();
    await destroy(instance, true);
    expect(instance.getState().viewState).toEqual(OPEN);
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(false);
  });

  it('leaves the messages in place', async () => {
    const { instance } = await usedChat();
    await act(() => instance.messaging.addMessage(textResponse('Hey', 'r2')));
    const before = instance.getState().messages.map(({ id }) => id);
    await destroy(instance);
    expect(instance.getState().messages.map(({ id }) => id)).toEqual(before);
  });

  it('cancels an in-flight send with CONVERSATION_RESTARTED, and the send settles', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    await changeView(instance, ViewType.MAIN_WINDOW);
    const started = await startSend(instanceSender(instance, backend), 'hello');
    await destroy(instance);
    const { signal } = started.sent.options;
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.CONVERSATION_RESTARTED);
    await expect(started.done).resolves.toBeUndefined();
    const { messages, status } = instance.getState();
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe(started.sent.request.id);
    const [item] = (messages[1] as MessageResponse).output.generic;
    expect(item.response_type).toBe(MessageResponseTypes.SYSTEM);
    expect(status).toBe('ready');
  });

  it('leaves no session in sessionStorage until the next change saves one', async () => {
    const { instance } = await usedChat();
    expect(readCarbonChatSession()).not.toBeNull();
    await destroy(instance);
    expect(readCarbonChatSession()).toBeNull();
    await changeView(instance, ViewType.MAIN_WINDOW);
    const session = readCarbonChatSession();
    expect(session.viewState).toEqual(OPEN);
    expect(session.hasSentNonWelcomeMessage).toBe(false);
    expect(session.showUnreadIndicator).toBe(false);
  });

  it('starts the next mount in the same session from the reset session', async () => {
    const first = await usedChat();
    await destroy(first.instance);
    first.unmount();
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    expect(instance.getState().viewState).toEqual(CLOSED);
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(false);
    expect(instance.getState().wasLoadedFromBrowser).toBe(false);
  });

  it('doesn’t hydrate again: reopening sends no welcome and fires no chat:ready', async () => {
    const { instance, backend, ready } = await usedChat({
      messaging: { skipWelcome: false },
    });
    await waitFor(() => expect(ready.count()).toBe(1));
    const sent = backend.requests.length;
    await destroy(instance);
    await changeView(instance, ViewType.MAIN_WINDOW);
    await pause();
    expect(backend.requests).toHaveLength(sent);
    expect(ready.count()).toBe(1);
  });
});

// @covers instance.destroySession config.persistedState
// @covers config.persistedState.onStateChange
describe('destroySession with host-owned persistence', () => {
  contractSetup();

  it('reports the reset to onStateChange and writes nothing to sessionStorage', async () => {
    const values: PersistableState[] = [];
    const { instance } = await usedChat({
      persistedState: { onStateChange: (state) => values.push(state) },
    });
    values.length = 0;
    await destroy(instance);
    const last = values[values.length - 1];
    expect(last.viewState).toEqual(CLOSED);
    expect(last.hasSentNonWelcomeMessage).toBe(false);
    expect(last.showUnreadIndicator).toBe(false);
    expect(readCarbonChatSession()).toBeNull();
  });
});
