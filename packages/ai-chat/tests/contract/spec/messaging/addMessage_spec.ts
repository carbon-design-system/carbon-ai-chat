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
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  deferred,
  describeShared,
  finishSend,
  ids,
  outputTexts,
  recordEvents,
  startSend,
  textItem,
  textResponse,
} from '../../helpers';

/** Calls `addMessage` inside `act` and waits for it to settle. */
const add = (chat: ContractDriver, message: MessageResponse) =>
  act(() => chat.messaging.addMessage(message));

/** The outcome of an `addMessage` the test expects to reject. */
async function addAndCatch(
  chat: ContractDriver,
  message: MessageResponse
): Promise<unknown> {
  let caught: unknown;
  await act(async () => {
    await chat.messaging.addMessage(message).catch((error) => {
      caught = error;
    });
  });
  return caught;
}

// @covers instance.messaging.addMessage state.messages event.pre:receive event.receive
describeShared('addMessage', (makeDriver) => {
  it('adds the response to messages with its id, its output, and defaults', async () => {
    const chat = await makeDriver();
    await add(chat, textResponse('Hello', 'r1'));
    const messages = chat.messages() as MessageResponse[];
    expect(ids(chat)).toEqual(['r1']);
    expect(messages[0].output.generic).toEqual([textItem('Hello')]);
    expect(messages[0].thread_id).toBe('main');
    expect(typeof messages[0].history.timestamp).toBe('number');
  });

  it('appends responses in call order', async () => {
    const chat = await makeDriver();
    await add(chat, textResponse('One', 'a'));
    await add(chat, textResponse('Two', 'b'));
    expect(ids(chat)).toEqual(['a', 'b']);
  });

  it('fires pre:receive, then receive, once each per call', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    await add(chat, textResponse('One', 'a'));
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    await add(chat, textResponse('Two', 'b'));
    expect(events.types()).toEqual([
      'pre:receive',
      'receive',
      'pre:receive',
      'receive',
    ]);
    expect(
      events
        .of<BusEventReceive>(BusEventType.RECEIVE)
        .map((event) => event.data.id)
    ).toEqual(['a', 'b']);
  });

  it('fires pre:receive before addMessage resolves', async () => {
    const chat = await makeDriver();
    const seen: string[] = [];
    chat.on({
      type: BusEventType.PRE_RECEIVE,
      handler: () => {
        seen.push('pre:receive');
      },
    });
    await act(async () => {
      await chat.messaging.addMessage(textResponse('Hello', 'r1'));
      seen.push('resolved');
    });
    expect(seen).toEqual(['pre:receive', 'resolved']);
  });

  it('waits for an async pre:receive handler before it stores the response or fires receive', async () => {
    const chat = await makeDriver();
    const handler = deferred();
    chat.on({ type: BusEventType.PRE_RECEIVE, handler: () => handler.promise });
    const events = recordEvents(chat, [BusEventType.RECEIVE]);
    let settled = false;
    let pending: Promise<void>;
    await act(async () => {
      pending = chat.messaging.addMessage(textResponse('Hello', 'r1'));
      pending.then(() => {
        settled = true;
      });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(events.types()).toEqual([]);
    expect(chat.messages()).toEqual([]);
    expect(settled).toBe(false);
    await act(async () => {
      handler.resolve();
      await pending;
    });
    expect(events.types()).toEqual(['receive']);
    expect(ids(chat)).toEqual(['r1']);
  });

  it('resolves only after an async receive handler settles', async () => {
    const chat = await makeDriver();
    const handler = deferred();
    chat.on({ type: BusEventType.RECEIVE, handler: () => handler.promise });
    let settled = false;
    let pending: Promise<void>;
    await act(async () => {
      pending = chat.messaging.addMessage(textResponse('Hello', 'r1'));
      pending.then(() => {
        settled = true;
      });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(settled).toBe(false);
    await act(async () => {
      handler.resolve();
      await pending;
    });
    expect(settled).toBe(true);
  });

  it("stores a frozen message with the host's id, output, and thread_id", async () => {
    const chat = await makeDriver();
    const message = textResponse('Hello', 'r1');
    await add(chat, message);
    const [stored] = chat.messages();
    expect(stored).toMatchObject({
      id: message.id,
      output: message.output,
      thread_id: message.thread_id,
    });
    expect(Object.isFrozen(stored)).toBe(true);
  });

  // JSDoc doesn't say so, but `main` writes its defaults onto the object the
  // host passed (src/chat/services/MessageUpsertCoordinator.ts:744-745) and
  // then deep-freezes it (same file, line 714).
  it("writes defaults onto the host's message object, then freezes it", async () => {
    const chat = await makeDriver();
    const message = textResponse('Hello', 'r1');
    await add(chat, message);
    expect(message.thread_id).toBe('main');
    expect(typeof message.history.timestamp).toBe('number');
    expect(Object.isFrozen(message)).toBe(true);
    expect(Object.isFrozen(message.output.generic[0])).toBe(true);
  });

  it("stores and fires receive with a pre:receive handler's edits", async () => {
    const chat = await makeDriver();
    chat.on({
      type: BusEventType.PRE_RECEIVE,
      handler: (event: BusEventPreReceive) => {
        (event.data.output.generic[0] as { text: string }).text = 'edited';
      },
    });
    const events = recordEvents(chat, [BusEventType.RECEIVE]);
    await add(chat, textResponse('original', 'r1'));
    expect(outputTexts(chat.messages()[0] as MessageResponse)).toEqual([
      'edited',
    ]);
    expect(
      outputTexts(events.of<BusEventReceive>(BusEventType.RECEIVE)[0].data)
    ).toEqual(['edited']);
  });

  it('gives a response with no id one, the same in both events, in messages, and on the host object', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    const message = textResponse('No id');
    await add(chat, message);
    expect(typeof message.id).toBe('string');
    expect(message.id.length).toBeGreaterThan(0);
    expect(
      events.events.map((event) => (event as BusEventReceive).data.id)
    ).toEqual([message.id, message.id]);
    expect(ids(chat)).toEqual([message.id]);
  });

  it('keeps a history.silent response in messages and fires both events for it', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    await add(
      chat,
      textResponse('Hidden', 'r1', { history: { silent: true } })
    );
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    const messages = chat.messages() as MessageResponse[];
    expect(ids(chat)).toEqual(['r1']);
    expect(messages[0].history.silent).toBe(true);
    expect(outputTexts(messages[0])).toEqual(['Hidden']);
  });

  it('replaces a response added again with the same id, in place, and fires both events again', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    await add(chat, textResponse('One', 'same'));
    await add(chat, textResponse('Two', 'other'));
    await add(chat, textResponse('Three', 'same'));
    expect(events.types()).toEqual([
      'pre:receive',
      'receive',
      'pre:receive',
      'receive',
      'pre:receive',
      'receive',
    ]);
    const messages = chat.messages() as MessageResponse[];
    expect(ids(chat)).toEqual(['same', 'other']);
    expect(messages.map((message) => outputTexts(message))).toEqual([
      ['Three'],
      ['Two'],
    ]);
  });

  // @covers config.strings
  it('stores a generated inline_error response in place of one with no output', async () => {
    const errorText = 'Custom single-message error';
    const chat = await makeDriver({
      strings: { errors_singleMessage: errorText },
    });
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    await add(chat, { id: 'no-output' } as MessageResponse);
    await waitFor(() =>
      expect(events.of(BusEventType.RECEIVE)).toHaveLength(2)
    );
    const messages = chat.messages() as MessageResponse[];
    expect(messages).toHaveLength(1);
    const generatedID = messages[0].id;
    expect(generatedID).not.toBe('no-output');
    // The text is the host's `errors_singleMessage` string.
    expect(messages[0].output.generic).toEqual([
      { response_type: MessageResponseTypes.INLINE_ERROR, text: errorText },
    ]);
    // Both go through pre:receive and receive; the original's receive fires
    // without it ever being stored.
    expect(
      events
        .of<BusEventPreReceive>(BusEventType.PRE_RECEIVE)
        .map((event) => event.data.id)
    ).toEqual(['no-output', generatedID]);
    expect(
      events
        .of<BusEventReceive>(BusEventType.RECEIVE)
        .map((event) => event.data.id)
    ).toEqual(['no-output', generatedID]);
  });

  // `main` has no check for this: the call fails writing an ID onto the
  // frozen object. Only the rejection is recorded, not its error class.
  it('rejects and fires nothing for a frozen response with no id', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    await act(async () => {
      await expect(
        chat.messaging.addMessage(
          Object.freeze(textResponse('Frozen')) as MessageResponse
        )
      ).rejects.toBeDefined();
    });
    expect(events.types()).toEqual([]);
    expect(chat.messages()).toEqual([]);
  });

  // Suspected bug: a frozen response with an id fires pre:receive and receive
  // but is never stored. Writing defaults onto the frozen object throws, and
  // the error is only logged (src/chat/services/MessageUpsertCoordinator.ts:699,
  // 744–745).
  it('fires both events for a frozen response with an id, but leaves it out of messages', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    const message = Object.freeze({
      id: 'frozen',
      output: Object.freeze({ generic: Object.freeze([textItem('Frozen')]) }),
    }) as MessageResponse;
    await add(chat, message);
    expect(events.types()).toEqual(['pre:receive', 'receive']);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(chat.messages()).toEqual([]);
  });

  it("rejects with a pre:receive handler's error, stores nothing, and skips receive", async () => {
    const chat = await makeDriver();
    const thrown = new Error('pre:receive failed');
    chat.on({
      type: BusEventType.PRE_RECEIVE,
      handler: () => {
        throw thrown;
      },
    });
    const events = recordEvents(chat, [BusEventType.RECEIVE]);
    expect(await addAndCatch(chat, textResponse('Hello', 'r1'))).toBe(thrown);
    expect(events.types()).toEqual([]);
    expect(chat.messages()).toEqual([]);
  });

  it("rejects with a receive handler's error, after it stored the response", async () => {
    const chat = await makeDriver();
    const thrown = new Error('receive failed');
    chat.on({
      type: BusEventType.RECEIVE,
      handler: () => {
        throw thrown;
      },
    });
    expect(await addAndCatch(chat, textResponse('Hello', 'r1'))).toBe(thrown);
    expect(ids(chat)).toEqual(['r1']);
  });

  it('drops a response to a request sent before a restart, with no events', async () => {
    const chat = await makeDriver();
    const started = await startSend(chat, 'hello');
    await act(() => chat.messaging.restartConversation());
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    await add(
      chat,
      textResponse('Late', 'late', { request_id: started.sent.request.id })
    );
    expect(events.types()).toEqual([]);
    expect(chat.messages()).toEqual([]);
    await finishSend(started);
  });
});

// @covers instance.messaging.addMessage state.status
describeShared('addMessage and status', (makeDriver) => {
  it('leaves status ready when no send is pending', async () => {
    const chat = await makeDriver();
    const statuses: string[] = [];
    chat.on({
      type: BusEventType.STATE_CHANGE,
      handler: () => {
        statuses.push(chat.status());
      },
    });
    await act(() => chat.messaging.addMessage(textResponse('Hi', 'r1')));
    expect(statuses.length).toBeGreaterThan(0);
    expect(new Set(statuses)).toEqual(new Set(['ready']));
    expect(chat.status()).toBe('ready');
  });
});
