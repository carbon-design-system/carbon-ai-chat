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
  BusEventType,
  CancellationReason,
  MessageSendSource,
  PublicConfigMessaging,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  FakeBackend,
  contractChat,
  contractSetup,
  deferred,
  describeShared,
  fakeBackend,
  finishSend,
  ids,
  instanceSender,
  recordEvents,
  startSend,
  textResponse,
} from '../../helpers';

/** Adds complete responses with these IDs, in order. */
async function addResponses(chat: ContractDriver, ...ids: string[]) {
  for (const id of ids) {
    await act(() => chat.messaging.addMessage(textResponse(id, id)));
  }
}

// @covers instance.messaging.removeMessages state.messages
describeShared('removeMessages', (makeDriver) => {
  it('drops exactly the named messages and keeps the rest in order', async () => {
    const chat = await makeDriver();
    await addResponses(chat, 'r1', 'r2', 'r3', 'r4');
    await act(() => chat.messaging.removeMessages(['r4', 'r2']));
    expect(ids(chat)).toEqual(['r1', 'r3']);
  });

  it('ignores unknown IDs and still removes the known ones', async () => {
    const chat = await makeDriver();
    await addResponses(chat, 'r1', 'r2');
    await act(() => chat.messaging.removeMessages(['missing', 'r1']));
    expect(ids(chat)).toEqual(['r2']);
  });

  it('changes nothing for an empty list', async () => {
    const chat = await makeDriver();
    await addResponses(chat, 'r1', 'r2');
    await act(() => chat.messaging.removeMessages([]));
    expect(ids(chat)).toEqual(['r1', 'r2']);
  });

  it('removes a request as well as a response', async () => {
    const chat = await makeDriver();
    const started = await startSend(chat, 'hello');
    await finishSend(started);
    await addResponses(chat, 'r1');
    await act(() => chat.messaging.removeMessages([started.sent.request.id]));
    expect(ids(chat)).toEqual(['r1']);
  });

  it('fires no events other than state:change', async () => {
    const chat = await makeDriver();
    await addResponses(chat, 'r1', 'r2');
    const events = recordEvents(chat);
    await act(() => chat.messaging.removeMessages(['r1']));
    expect(events.typesExcept(BusEventType.STATE_CHANGE)).toEqual([]);
  });
});

// @covers instance.messaging.clearConversation state.messages
// @covers export.aiChatEntry.CancellationReason
describeShared('clearConversation', (makeDriver) => {
  it('empties messages', async () => {
    const chat = await makeDriver();
    await finishSend(await startSend(chat, 'hello'));
    await addResponses(chat, 'r1', 'r2');
    await act(() => chat.messaging.clearConversation());
    expect(chat.messages()).toEqual([]);
  });

  it('fires neither restart event', async () => {
    const chat = await makeDriver();
    await addResponses(chat, 'r1');
    const events = recordEvents(chat, [
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    await act(() => chat.messaging.clearConversation());
    expect(events.types()).toEqual([]);
  });

  it('aborts an in-flight send with CONVERSATION_RESTARTED and settles the send', async () => {
    const chat = await makeDriver();
    const started = await startSend(chat, 'hello');
    await act(() => chat.messaging.clearConversation());
    const { signal } = started.sent.options;
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.CONVERSATION_RESTARTED);
    // On `main` the send resolves, not rejects, once its request is canceled.
    await expect(started.done).resolves.toBeUndefined();
    expect(chat.messages()).toEqual([]);
    expect(chat.status()).toBe('ready');
  });

  it('accepts a new send afterward as the only message', async () => {
    const chat = await makeDriver();
    await addResponses(chat, 'r1');
    await act(() => chat.messaging.clearConversation());
    const started = await startSend(chat, 'again');
    expect(started.sent.request.input.text).toBe('again');
    expect(ids(chat)).toEqual([started.sent.request.id]);
  });
});

// @covers instance.messaging.restartConversation event.pre:restartConversation
// @covers event.restartConversation export.aiChatEntry.CancellationReason
// @covers state.messages state.status
describeShared('restartConversation', (makeDriver) => {
  it('fires pre:restartConversation, then restartConversation', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    await act(() => chat.messaging.restartConversation());
    expect(events.types()).toEqual([
      'pre:restartConversation',
      'restartConversation',
    ]);
  });

  it('clears messages after pre:restartConversation and before restartConversation', async () => {
    const chat = await makeDriver();
    await addResponses(chat, 'r1', 'r2');
    const seen: Record<string, string[]> = {};
    chat.on([
      {
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: () => {
          seen.pre = ids(chat);
        },
      },
      {
        type: BusEventType.RESTART_CONVERSATION,
        handler: () => {
          seen.restart = ids(chat);
        },
      },
    ]);
    await act(() => chat.messaging.restartConversation());
    expect(seen).toEqual({ pre: ['r1', 'r2'], restart: [] });
    expect(chat.messages()).toEqual([]);
  });

  it('waits for a pre:restartConversation handler’s promise before clearing', async () => {
    const chat = await makeDriver();
    await addResponses(chat, 'r1');
    const gate = deferred();
    chat.on({
      type: BusEventType.PRE_RESTART_CONVERSATION,
      handler: () => gate.promise,
    });
    let restarted = false;
    let restart: Promise<void>;
    await act(async () => {
      restart = chat.messaging.restartConversation().then(() => {
        restarted = true;
      });
    });
    expect(restarted).toBe(false);
    expect(ids(chat)).toEqual(['r1']);
    await act(async () => {
      gate.resolve();
      await restart;
    });
    expect(chat.messages()).toEqual([]);
  });

  it('ignores a second call while the first is still pending', async () => {
    const chat = await makeDriver();
    const gate = deferred();
    const events = recordEvents(chat, [
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    chat.on({
      type: BusEventType.PRE_RESTART_CONVERSATION,
      handler: () => gate.promise,
    });
    let first: Promise<void>;
    await act(async () => {
      first = chat.messaging.restartConversation();
    });
    // The second call returns at once (with a console warning) and fires nothing.
    await act(() => chat.messaging.restartConversation());
    expect(events.types()).toEqual(['pre:restartConversation']);
    await act(async () => {
      gate.resolve();
      await first;
    });
    expect(events.types()).toEqual([
      'pre:restartConversation',
      'restartConversation',
    ]);
  });

  it('aborts an in-flight send with CONVERSATION_RESTARTED and settles the send', async () => {
    const chat = await makeDriver();
    const started = await startSend(chat, 'hello');
    await act(() => chat.messaging.restartConversation());
    const { signal } = started.sent.options;
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(CancellationReason.CONVERSATION_RESTARTED);
    // On `main` the send resolves, not rejects, once its request is canceled.
    await expect(started.done).resolves.toBeUndefined();
    expect(chat.messages()).toEqual([]);
    expect(chat.status()).toBe('ready');
  });

  it('drops a queued send before it reaches customSendMessage', async () => {
    const chat = await makeDriver();
    await startSend(chat, 'first');
    let queued: Promise<void>;
    await act(async () => {
      queued = chat.send('second');
    });
    await act(() => chat.messaging.restartConversation());
    await expect(queued).resolves.toBeUndefined();
    expect(chat.backend.texts()).toEqual(['first']);
    expect(chat.messages()).toEqual([]);
  });

  it('adds nothing when the canceled request’s backend settles late', async () => {
    const chat = await makeDriver();
    const started = await startSend(chat, 'hello');
    await act(() => chat.messaging.restartConversation());
    await finishSend(started);
    expect(chat.messages()).toEqual([]);
    expect(chat.backend.requests).toHaveLength(1);
    expect(chat.status()).toBe('ready');
  });
});

/** Mounts with the fake backend, and an open main window when `open` is set. */
async function mountChat(
  open: boolean,
  messaging: Partial<PublicConfigMessaging> = {}
) {
  const backend = fakeBackend();
  const { instance } = await contractChat({
    openChatByDefault: open,
    messaging: { customSendMessage: backend.customSendMessage, ...messaging },
  });
  return { instance, backend, messages: () => instance.getState().messages };
}

/** Answers the welcome request a chat opened by default sends on mount. */
async function answerWelcome(backend: FakeBackend) {
  const welcome = await backend.next();
  await act(async () => welcome.resolve());
  return welcome;
}

// @covers instance.messaging.clearConversation config.openChatByDefault state.messages
describe('clearConversation with the main window', () => {
  contractSetup();

  it('does not send a new welcome request, even with the main window open', async () => {
    const chat = await mountChat(true);
    await answerWelcome(chat.backend);
    await act(() => chat.instance.messaging.clearConversation());
    expect(chat.backend.requests).toHaveLength(1);
    expect(chat.messages()).toEqual([]);
  });
});

// @covers instance.messaging.restartConversation config.openChatByDefault
// @covers config.messaging.skipWelcome export.aiChatEntry.MessageSendSource
// @covers state.messages state.status
describe('restartConversation with the main window', () => {
  contractSetup();

  it('sends no welcome request while the main window is closed', async () => {
    const chat = await mountChat(false);
    await act(() =>
      chat.instance.messaging.addMessage(textResponse('r1', 'r1'))
    );
    await act(() => chat.instance.messaging.restartConversation());
    expect(chat.backend.requests).toHaveLength(0);
    expect(chat.instance.getState().status).toBe('ready');
  });

  it('sends a new welcome request with the main window open, and resolves after it settles', async () => {
    const chat = await mountChat(true);
    const first = await answerWelcome(chat.backend);
    let restarted = false;
    let restart: Promise<void>;
    await act(async () => {
      restart = chat.instance.messaging.restartConversation().then(() => {
        restarted = true;
      });
    });
    const welcome = await chat.backend.next();
    expect(welcome.request.id).not.toBe(first.request.id);
    expect(welcome.request.input.text).toBe('');
    expect(welcome.request.history).toMatchObject({
      is_welcome_request: true,
      silent: true,
    });
    expect(welcome.options.busEventSend?.source).toBe(
      MessageSendSource.WELCOME_REQUEST
    );
    expect(restarted).toBe(false);
    await act(async () => {
      welcome.resolve();
      await restart;
    });
    expect(ids(chat)).toEqual([welcome.request.id]);
    expect(chat.instance.getState().status).toBe('ready');
  });

  it('sends no welcome request with skipWelcome, even with the main window open', async () => {
    const chat = await mountChat(true, { skipWelcome: true });
    await act(() => chat.instance.messaging.restartConversation());
    expect(chat.backend.requests).toHaveLength(0);
    expect(chat.messages()).toEqual([]);
  });
});

// @covers instance.restartConversation event.pre:restartConversation
// @covers event.restartConversation export.aiChatEntry.CancellationReason
describe('instance.restartConversation (deprecated)', () => {
  contractSetup();

  it('fires both restart events, empties messages, and aborts an in-flight send', async () => {
    const backend = fakeBackend();
    const { instance } = await contractChat({
      messaging: { customSendMessage: backend.customSendMessage },
    });
    await act(() => instance.messaging.addMessage(textResponse('r1', 'r1')));
    const { sent, done } = await startSend(
      instanceSender(instance, backend),
      'hello'
    );
    const events = recordEvents(instance, [
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    await act(() => instance.restartConversation());
    expect(events.types()).toEqual([
      'pre:restartConversation',
      'restartConversation',
    ]);
    expect(instance.getState().messages).toEqual([]);
    expect(sent.options.signal.reason).toBe(
      CancellationReason.CONVERSATION_RESTARTED
    );
    await expect(done).resolves.toBeUndefined();
  });

  it('sends a new welcome request with the main window open', async () => {
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const first = await backend.next();
    await act(() => instance.restartConversation());
    const welcome = await backend.next();
    expect(welcome.request.id).not.toBe(first.request.id);
    expect(welcome.request.history?.is_welcome_request).toBe(true);
    expect(instance.getState().messages.map(({ id }) => id)).toEqual([
      welcome.request.id,
    ]);
  });
});
