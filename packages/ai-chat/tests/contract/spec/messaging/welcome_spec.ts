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
  BusEventPreSend,
  BusEventSend,
  BusEventType,
  ChatInstance,
  MessageRequest,
  MessageSendSource,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  contractChat,
  contractCleanup,
  fakeBackend,
  recordEvents,
  textResponse,
} from '../../helpers';

/**
 * The chat keeps the open main window in browser storage, and a mount that
 * finds it open hydrates at once. Each test starts from a closed chat.
 */
function clearBrowserStorage(): void {
  sessionStorage.clear();
  localStorage.clear();
}

/** Opens the main window, the way a host's own button would. */
async function openMainWindow(instance: ChatInstance): Promise<void> {
  await act(async () => {
    await instance.changeView(ViewType.MAIN_WINDOW);
  });
}

// @covers config.messaging.skipWelcome export.aiChatEntry.MessageSendSource
// @covers instance.changeView config.openChatByDefault event.pre:send event.send
// @covers config.messaging.customSendMessage state.messages event.chat:ready
describe('welcome request', () => {
  beforeEach(clearBrowserStorage);
  afterEach(contractCleanup);

  it('sends nothing at mount while the main window is closed', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    expect(backend.requests).toHaveLength(0);
    expect(instance.getState().messages).toEqual([]);
  });

  it('sends one welcome request when the main window opens', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    await openMainWindow(instance);
    const sent = await backend.next();
    expect(sent.options.busEventSend.source).toBe(
      MessageSendSource.WELCOME_REQUEST
    );
    expect(backend.requests).toHaveLength(1);
  });

  it('sends the welcome request during mount when the chat opens by default', async () => {
    const backend = fakeBackend();
    await contractChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    expect(backend.requests).toHaveLength(1);
    expect(backend.requests[0].options.busEventSend.source).toBe(
      MessageSendSource.WELCOME_REQUEST
    );
  });

  it('sends an empty text request marked silent and welcome in its history', async () => {
    const backend = fakeBackend();
    await contractChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const sent = await backend.next();
    expect(sent.request.input).toEqual({ text: '', message_type: 'text' });
    expect(sent.request.history.silent).toBe(true);
    expect(sent.request.history.is_welcome_request).toBe(true);
    // On `main` the welcome is silent only in its history; the
    // `CustomSendMessageOptions.silent` flag is left unset.
    expect(sent.options.silent).toBeUndefined();
    expect(sent.options.signal.aborted).toBe(false);
  });

  it('fires pre:send and send with the WELCOME_REQUEST source', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const events = recordEvents(instance, [
      BusEventType.PRE_SEND,
      BusEventType.SEND,
    ]);
    await openMainWindow(instance);
    const sent = await backend.next();
    expect(events.types()).toEqual([BusEventType.PRE_SEND, BusEventType.SEND]);
    const [preSend] = events.of<BusEventPreSend>(BusEventType.PRE_SEND);
    const [send] = events.of<BusEventSend>(BusEventType.SEND);
    expect(preSend.source).toBe(MessageSendSource.WELCOME_REQUEST);
    expect(send.source).toBe(MessageSendSource.WELCOME_REQUEST);
    expect(send.data.id).toBe(sent.request.id);
  });

  it('keeps the welcome request in messages, marked silent', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const sent = await backend.next();
    const { messages } = instance.getState();
    expect(messages.map((message) => message.id)).toEqual([sent.request.id]);
    const welcome = messages[0] as MessageRequest;
    expect(welcome.history?.silent).toBe(true);
    expect(welcome.history?.is_welcome_request).toBe(true);
  });

  it('sends no welcome request with skipWelcome, and fires chat:ready', async () => {
    const backend = fakeBackend();
    let ready = 0;
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      onBeforeRender: (handed) => {
        handed.on({
          type: BusEventType.CHAT_READY,
          handler: () => {
            ready += 1;
          },
        });
      },
    });
    await waitFor(() => expect(ready).toBe(1));
    expect(backend.requests).toHaveLength(0);
    expect(instance.getState().messages).toEqual([]);
    expect(instance.getState().status).toBe('ready');
  });
});

// @covers state.status state.isHydratingCounter event.chat:ready
// @covers instance.messaging.addMessage
describe('status while the welcome loads', () => {
  beforeEach(clearBrowserStorage);
  afterEach(contractCleanup);

  it('reads loading until the welcome sender settles, then ready', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const sent = await backend.next();
    expect(instance.getState().status).toBe('loading');
    expect(instance.getState().isHydratingCounter).toBe(1);

    await act(() =>
      instance.messaging.addMessage(
        textResponse('Welcome', 'welcome-1', {
          request_id: sent.request.id,
        })
      )
    );
    // The welcome reply alone doesn't end loading; the sender settling does.
    expect(instance.getState().status).toBe('loading');

    await act(async () => {
      sent.resolve();
    });
    await waitFor(() => expect(instance.getState().status).toBe('ready'));
    expect(instance.getState().isHydratingCounter).toBe(0);
  });

  it('fires chat:ready once, after the welcome sender settles', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const events = recordEvents(instance, [BusEventType.CHAT_READY]);
    await openMainWindow(instance);
    const sent = await backend.next();
    expect(events.types()).toEqual([]);
    await act(async () => {
      sent.resolve();
    });
    await waitFor(() =>
      expect(events.types()).toEqual([BusEventType.CHAT_READY])
    );
  });
});

// @covers state.hasSentNonWelcomeMessage instance.messaging.addMessage
// @covers instance.send
describe('hasSentNonWelcomeMessage', () => {
  beforeEach(clearBrowserStorage);
  afterEach(contractCleanup);

  it('starts false', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true, customSendMessage: () => undefined },
    });
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(false);
  });

  it('stays false while a user send waits, and turns true when its reply arrives', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
    });
    let done: Promise<void>;
    await act(async () => {
      done = instance.send('hello');
    });
    const sent = await backend.next();
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(false);
    await act(() =>
      instance.messaging.addMessage(
        textResponse('hi', 'r1', { request_id: sent.request.id })
      )
    );
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(true);
    await act(async () => {
      sent.resolve();
      await done;
    });
  });

  it('turns true when the host adds the reply to the welcome request', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const sent = await backend.next();
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(false);
    // On `main` the typed `addMessage` has no way to mark a welcome reply
    // (INTENDED.md 08b3: only the untyped `isLatestWelcomeNode` option or
    // history does), so the welcome reply counts as a non-welcome message.
    await act(() =>
      instance.messaging.addMessage(
        textResponse('Welcome', 'welcome-1', {
          request_id: sent.request.id,
        })
      )
    );
    expect(instance.getState().hasSentNonWelcomeMessage).toBe(true);
  });
});
