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
  BusEventHistoryBegin,
  BusEventHistoryEnd,
  BusEventType,
  ChatInstance,
  HistoryItem,
  Message,
  MessageResponse,
  OnErrorData,
  OnErrorType,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  EventRecorder,
  contractChat,
  contractSetup,
  describeShared,
  fakeBackend,
  ids,
  outputTexts,
  recordEvents,
  textResponse,
} from '../../helpers';

const HISTORY_EVENTS = [BusEventType.HISTORY_BEGIN, BusEventType.HISTORY_END];

/** A user request as a history item. */
function historyRequest(id: string, text: string, time: string): HistoryItem {
  return { message: { id, input: { text } }, time };
}

/** A text response as a history item. */
function historyResponse(
  id: string,
  text: string,
  time: string,
  requestID?: string
): HistoryItem {
  return {
    message: textResponse(text, id, requestID ? { request_id: requestID } : {}),
    time,
  };
}

const T0 = '2024-01-01T00:00:00.000Z';
const T1 = '2024-01-01T00:00:01.000Z';
const T2 = '2024-01-01T00:00:02.000Z';

/** The texts of a response's text items. */
const texts = (message: Message) => outputTexts(message as MessageResponse);

const eventIDs = (event: BusEventHistoryBegin | BusEventHistoryEnd) =>
  event.messages.map(({ id }) => id);

/** Freezes the value and everything it holds, the way an immutable store does. */
function deepFrozen<T>(value: T): T {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') {
      deepFrozen(child);
    }
  });
  return Object.freeze(value);
}

// @covers instance.messaging.insertHistory event.history:begin
// @covers event.history:end state.messages
describeShared('insertHistory', (makeDriver) => {
  it('adds the items to an empty chat in order, stamped with their time', async () => {
    const chat = await makeDriver();
    await act(() =>
      chat.messaging.insertHistory([
        historyRequest('q1', 'hello', T0),
        historyResponse('a1', 'hi', T1, 'q1'),
      ])
    );
    const messages = chat.messages();
    expect(messages.map(({ id }) => id)).toEqual(['q1', 'a1']);
    expect(messages.map(({ history }) => history?.timestamp)).toEqual([
      Date.parse(T0),
      Date.parse(T1),
    ]);
    expect(messages[1]).toMatchObject({ request_id: 'q1' });
    expect(texts(messages[1])).toEqual(['hi']);
  });

  it('puts history before the messages already in the chat', async () => {
    const chat = await makeDriver();
    await act(() => chat.messaging.addMessage(textResponse('live', 'live')));
    await act(() =>
      chat.messaging.insertHistory([
        historyRequest('q1', 'hello', T0),
        historyResponse('a1', 'hi', T1, 'q1'),
      ])
    );
    expect(ids(chat)).toEqual(['q1', 'a1', 'live']);
  });

  it('puts a second batch before the first', async () => {
    const chat = await makeDriver();
    await act(() =>
      chat.messaging.insertHistory([historyResponse('a1', 'one', T1)])
    );
    await act(() =>
      chat.messaging.insertHistory([historyResponse('a0', 'zero', T0)])
    );
    expect(ids(chat)).toEqual(['a0', 'a1']);
  });

  it('adds frozen items as it adds unfrozen ones', async () => {
    const chat = await makeDriver();
    await act(() =>
      chat.messaging.insertHistory(
        deepFrozen([
          historyRequest('q1', 'hello', T0),
          historyResponse('a1', 'hi', T1, 'q1'),
        ])
      )
    );
    const messages = chat.messages();
    expect(messages.map(({ id }) => id)).toEqual(['q1', 'a1']);
    expect(messages.map(({ history }) => history?.timestamp)).toEqual([
      Date.parse(T0),
      Date.parse(T1),
    ]);
    expect(texts(messages[1])).toEqual(['hi']);
  });

  it('accepts items it was given in an earlier call', async () => {
    const chat = await makeDriver();
    const items = [historyResponse('a1', 'hi', T0)];
    await act(() => chat.messaging.insertHistory(items));
    const events = recordEvents(chat, HISTORY_EVENTS);
    await act(async () => {
      await expect(
        chat.messaging.insertHistory(items)
      ).resolves.toBeUndefined();
    });
    expect(events.types()).toEqual(['history:begin', 'history:end']);
    const [end] = events.of<BusEventHistoryEnd>(BusEventType.HISTORY_END);
    expect(eventIDs(end)).toEqual(['a1']);
    expect(ids(chat)).toEqual(['a1']);
  });

  it('lists an ID inserted again once, at its first position, with the later content', async () => {
    const chat = await makeDriver();
    await act(() =>
      chat.messaging.insertHistory([
        historyRequest('q1', 'hello', T0),
        historyResponse('a1', 'hi', T1, 'q1'),
        historyRequest('q2', 'again', T2),
      ])
    );
    await act(() =>
      chat.messaging.insertHistory([
        historyRequest('q0', 'first', T0),
        historyRequest('q1', 'hello', T0),
        historyResponse('a1', 'hi there', T1, 'q1'),
      ])
    );
    expect(ids(chat)).toEqual(['q0', 'q1', 'a1', 'q2']);
    expect(texts(chat.messages()[2])).toEqual(['hi there']);
  });

  it('fires history:begin, then history:end, each with the items', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, HISTORY_EVENTS);
    await act(() =>
      chat.messaging.insertHistory([
        historyRequest('q1', 'hello', T0),
        historyResponse('a1', 'hi', T1, 'q1'),
      ])
    );
    expect(events.types()).toEqual(['history:begin', 'history:end']);
    const [begin] = events.of<BusEventHistoryBegin>(BusEventType.HISTORY_BEGIN);
    const [end] = events.of<BusEventHistoryEnd>(BusEventType.HISTORY_END);
    expect(eventIDs(begin)).toEqual(['q1', 'a1']);
    expect(eventIDs(end)).toEqual(['q1', 'a1']);
  });

  it('keeps edits a history:begin handler makes, in history:end and in messages', async () => {
    const chat = await makeDriver();
    chat.on({
      type: BusEventType.HISTORY_BEGIN,
      handler: (event: BusEventHistoryBegin) => {
        const message = event.messages[0] as {
          output: { generic: { text: string }[] };
        };
        message.output.generic[0].text = 'edited';
      },
    });
    const events = recordEvents(chat, [BusEventType.HISTORY_END]);
    await act(() =>
      chat.messaging.insertHistory([historyResponse('a1', 'original', T0)])
    );
    const [end] = events.of<BusEventHistoryEnd>(BusEventType.HISTORY_END);
    expect(texts(end.messages[0])).toEqual(['edited']);
    expect(texts(chat.messages()[0])).toEqual(['edited']);
  });

  it('fires no pre:receive or receive for history items', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
      ...HISTORY_EVENTS,
    ]);
    await act(() =>
      chat.messaging.insertHistory([historyResponse('a1', 'hi', T0)])
    );
    // The history:begin and history:end JSDoc say they bracket "pre:receive"
    // and "receive" events, but on `main` history items fire neither.
    expect(events.types()).toEqual(['history:begin', 'history:end']);
  });

  it('leaves out a response marked history.silent', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [BusEventType.HISTORY_BEGIN]);
    await act(() =>
      chat.messaging.insertHistory([
        historyResponse('a1', 'shown', T0),
        {
          message: textResponse('hidden', 'a2', { history: { silent: true } }),
          time: T1,
        },
        historyResponse('a3', 'shown too', T2),
      ])
    );
    expect(ids(chat)).toEqual(['a1', 'a3']);
    const [begin] = events.of<BusEventHistoryBegin>(BusEventType.HISTORY_BEGIN);
    expect(eventIDs(begin)).toEqual(['a1', 'a3']);
  });

  it('does nothing for an empty list: no events, no change', async () => {
    const chat = await makeDriver();
    await act(() => chat.messaging.addMessage(textResponse('live', 'live')));
    const events = recordEvents(chat);
    await act(() => chat.messaging.insertHistory([]));
    expect(events.types()).toEqual([]);
    expect(ids(chat)).toEqual(['live']);
  });

  it('does not call customSendMessage', async () => {
    const chat = await makeDriver();
    await act(() =>
      chat.messaging.insertHistory([historyRequest('q1', 'hello', T0)])
    );
    expect(chat.backend.requests).toHaveLength(0);
    expect(chat.status()).toBe('ready');
  });
});

/** Mounts with a history loader and records history events from the start. */
async function mountWithHistory(
  customLoadHistory: (instance: ChatInstance) => Promise<HistoryItem[]>,
  {
    open = true,
    onError,
  }: { open?: boolean; onError?: (data: OnErrorData) => void } = {}
) {
  const backend = fakeBackend({ autoResolve: true });
  let events: EventRecorder;
  const { instance } = await contractChat({
    openChatByDefault: open,
    onError,
    onBeforeRender: (handed) => {
      events = recordEvents(handed, HISTORY_EVENTS);
    },
    messaging: {
      customSendMessage: backend.customSendMessage,
      customLoadHistory,
    },
  });
  return { instance, backend, events };
}

const stateIDs = (instance: ChatInstance) =>
  instance.getState().messages.map(({ id }) => id);

// @covers config.messaging.customLoadHistory event.history:begin
// @covers event.history:end state.messages state.status state.activeResponseId
describe('customLoadHistory at startup', () => {
  contractSetup();

  it('is not called while the main window is closed, then once with the instance when it opens', async () => {
    const calls: ChatInstance[] = [];
    const { instance, events } = await mountWithHistory(
      async (handed) => {
        calls.push(handed);
        return [historyResponse('a1', 'hi', T0)];
      },
      { open: false }
    );
    // A short wait to show the load hasn't started.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(calls).toHaveLength(0);
    expect(events.types()).toEqual([]);
    await act(() => instance.changeView(ViewType.MAIN_WINDOW));
    await waitFor(() => expect(stateIDs(instance)).toEqual(['a1']));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(instance);
  });

  it('makes its items the messages, fires the history events, and skips the welcome', async () => {
    const { instance, backend, events } = await mountWithHistory(async () => [
      historyRequest('q1', 'hello', T0),
      historyResponse('a1', 'hi', T1, 'q1'),
    ]);
    await waitFor(() =>
      expect(events.types()).toEqual(['history:begin', 'history:end'])
    );
    await waitFor(() => expect(stateIDs(instance)).toEqual(['q1', 'a1']));
    const [begin] = events.of<BusEventHistoryBegin>(BusEventType.HISTORY_BEGIN);
    const [end] = events.of<BusEventHistoryEnd>(BusEventType.HISTORY_END);
    expect(eventIDs(begin)).toEqual(['q1', 'a1']);
    expect(eventIDs(end)).toEqual(['q1', 'a1']);
    const state = instance.getState();
    expect(state.messages[1]).toMatchObject({ request_id: 'q1' });
    expect(state.activeResponseId).toBe('a1');
    expect(state.status).toBe('ready');
    expect(backend.requests).toHaveLength(0);
  });

  it('sends the welcome and fires no history events when it returns no items', async () => {
    const { instance, backend, events } = await mountWithHistory(
      async () => []
    );
    const welcome = await backend.next();
    expect(welcome.request.history?.is_welcome_request).toBe(true);
    await waitFor(() =>
      expect(stateIDs(instance)).toEqual([welcome.request.id])
    );
    expect(events.types()).toEqual([]);
  });

  it('reports a rejection to onError as HYDRATION, sets status error, and sends no welcome', async () => {
    const failure = new Error('history unavailable');
    const errors: OnErrorData[] = [];
    const { instance, backend, events } = await mountWithHistory(
      () => Promise.reject(failure),
      { onError: (data) => errors.push(data) }
    );
    await waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0]).toMatchObject({
      errorType: OnErrorType.HYDRATION,
      otherData: failure,
    });
    await waitFor(() => expect(instance.getState().status).toBe('error'));
    expect(instance.getState().messages).toEqual([]);
    expect(events.types()).toEqual([]);
    expect(backend.requests).toHaveLength(0);
  });

  it('is not called again on restart; the restart drops its items and sends the welcome', async () => {
    let calls = 0;
    const { instance, backend } = await mountWithHistory(async () => {
      calls += 1;
      return [historyResponse('a1', 'hi', T0)];
    });
    await waitFor(() => expect(stateIDs(instance)).toEqual(['a1']));
    await act(() => instance.messaging.restartConversation());
    expect(calls).toBe(1);
    expect(backend.requests).toHaveLength(1);
    const [welcome] = backend.requests;
    expect(welcome.request.history?.is_welcome_request).toBe(true);
    expect(stateIDs(instance)).toEqual([welcome.request.id]);
  });
});

// @covers state.wasLoadedFromBrowser
describe('state.wasLoadedFromBrowser', () => {
  contractSetup();

  it('is false on a fresh session and true when a remount restores it', async () => {
    const config = {
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    };
    const first = await contractChat(config);
    expect(first.instance.getState().wasLoadedFromBrowser).toBe(false);
    first.unmount();
    const second = await contractChat(config);
    expect(second.instance.getState().wasLoadedFromBrowser).toBe(true);
  });
});
