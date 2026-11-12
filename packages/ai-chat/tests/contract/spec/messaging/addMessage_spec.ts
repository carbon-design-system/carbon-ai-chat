/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';

import {
  BusEventCustomFooterSlot,
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
  BusEventUserDefinedResponse,
  GenericItem,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  ContractDriver,
  contractChat,
  contractCleanup,
  describeShared,
  finishSend,
  outputTexts,
  recordEvents,
  slotted,
  startSend,
  textResponse,
} from '../../helpers';

const text = (value: string): GenericItem => ({
  response_type: MessageResponseTypes.TEXT,
  text: value,
});

const userDefined = (
  fields: Record<string, unknown>,
  extra: Partial<GenericItem> = {}
): GenericItem =>
  ({
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: fields,
    ...extra,
  }) as GenericItem;

const pause = (time: number, typing = false): GenericItem => ({
  response_type: MessageResponseTypes.PAUSE,
  time,
  typing,
});

const responseOf = (id: string, generic: GenericItem[]): MessageResponse => ({
  id,
  output: { generic },
});

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

/** A promise a test settles by hand. */
function gate() {
  let open: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open: () => open() };
}

// The chat keeps its open view in sessionStorage, which outlives a mount. A
// left-open window from one test would send a welcome request in the next.
const clearSession = () => window.sessionStorage.clear();

// @covers instance.messaging.addMessage state.messages event.pre:receive event.receive
describeShared('addMessage', (makeDriver) => {
  beforeEach(clearSession);
  afterEach(contractCleanup);

  it('adds the response to messages with its id, its output, and defaults', async () => {
    const chat = await makeDriver();
    await add(chat, textResponse('Hello', 'r1'));
    const messages = chat.messages() as MessageResponse[];
    expect(messages.map((message) => message.id)).toEqual(['r1']);
    expect(messages[0].output.generic).toEqual([text('Hello')]);
    expect(messages[0].thread_id).toBe('main');
    expect(typeof messages[0].history.timestamp).toBe('number');
  });

  it('appends responses in call order', async () => {
    const chat = await makeDriver();
    await add(chat, textResponse('One', 'a'));
    await add(chat, textResponse('Two', 'b'));
    expect(chat.messages().map((message) => message.id)).toEqual(['a', 'b']);
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

  it('fires pre:receive synchronously, inside the addMessage call', async () => {
    const chat = await makeDriver();
    const preReceive = jest.fn();
    chat.on({ type: BusEventType.PRE_RECEIVE, handler: preReceive });
    let pending: Promise<void>;
    await act(async () => {
      pending = chat.messaging.addMessage(textResponse('Hello', 'r1'));
      expect(preReceive).toHaveBeenCalledTimes(1);
      await pending;
    });
  });

  it('waits for an async pre:receive handler before it stores the response or fires receive', async () => {
    const chat = await makeDriver();
    const handler = gate();
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
      handler.open();
      await pending;
    });
    expect(events.types()).toEqual(['receive']);
    expect(chat.messages().map((message) => message.id)).toEqual(['r1']);
  });

  it('resolves only after an async receive handler settles', async () => {
    const chat = await makeDriver();
    const handler = gate();
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
      handler.open();
      await pending;
    });
    expect(settled).toBe(true);
  });

  it("hands pre:receive and receive the host's own object, and stores a frozen copy", async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    const message = textResponse('Hello', 'r1');
    await add(chat, message);
    expect(
      events.of<BusEventPreReceive>(BusEventType.PRE_RECEIVE)[0].data
    ).toBe(message);
    expect(events.of<BusEventReceive>(BusEventType.RECEIVE)[0].data).toBe(
      message
    );
    const stored = chat.messages()[0];
    expect(stored).not.toBe(message);
    // `messages` leaves out the internal UI state the chat wrote on the
    // host's object.
    const { ui_state_internal: _internal, ...publicFields } = message;
    expect(stored).toEqual(publicFields);
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
    expect(message.ui_state_internal).toEqual({ from_history: false });
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
    expect(chat.messages().map((stored) => stored.id)).toEqual([message.id]);
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
    expect(messages.map((message) => message.id)).toEqual(['r1']);
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
    expect(messages.map((message) => message.id)).toEqual(['same', 'other']);
    expect(messages.map((message) => outputTexts(message))).toEqual([
      ['Three'],
      ['Two'],
    ]);
  });

  it('stores a generated inline_error response in place of one with no output', async () => {
    const chat = await makeDriver();
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
    expect(messages[0].output.generic).toEqual([
      {
        response_type: MessageResponseTypes.INLINE_ERROR,
        text: 'There is an error with the message you just sent, but feel free to ask me something else.',
      },
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

  it('rejects with a TypeError and fires nothing for a frozen response with no id', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    const error = await addAndCatch(
      chat,
      Object.freeze(textResponse('Frozen')) as MessageResponse
    );
    expect(error).toBeInstanceOf(TypeError);
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
      output: Object.freeze({ generic: Object.freeze([text('Frozen')]) }),
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
    expect(chat.messages().map((message) => message.id)).toEqual(['r1']);
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

// @covers instance.messaging.addMessage event.userDefinedResponse event.receive response-type.pause state.messages
describeShared(
  'addMessage with paused and user_defined items',
  (makeDriver) => {
    beforeEach(clearSession);
    afterEach(contractCleanup);

    it('fires receive, then userDefinedResponse, with the item, the message, a slot, and the complete state', async () => {
      const chat = await makeDriver();
      const events = recordEvents(chat, [
        BusEventType.RECEIVE,
        BusEventType.USER_DEFINED_RESPONSE,
      ]);
      const item = userDefined({ kind: 'widget' });
      await add(chat, responseOf('r1', [item]));
      await waitFor(() =>
        expect(events.types()).toEqual(['receive', 'userDefinedResponse'])
      );
      const [event] = events.of<BusEventUserDefinedResponse>(
        BusEventType.USER_DEFINED_RESPONSE
      );
      expect(event.data.message).toEqual(item);
      expect(event.data.fullMessage.id).toBe('r1');
      expect(event.data.state).toBe(MessageState.COMPLETE);
      expect(typeof event.data.slot).toBe('string');
      expect(event.data.slot.length).toBeGreaterThan(0);
    });

    it('gives each user_defined item its own slot', async () => {
      const chat = await makeDriver();
      const events = recordEvents(chat, [BusEventType.USER_DEFINED_RESPONSE]);
      await add(
        chat,
        responseOf('r1', [userDefined({ n: 1 }), userDefined({ n: 2 })])
      );
      await waitFor(() =>
        expect(events.of(BusEventType.USER_DEFINED_RESPONSE)).toHaveLength(2)
      );
      const slots = events
        .of<BusEventUserDefinedResponse>(BusEventType.USER_DEFINED_RESPONSE)
        .map((event) => event.data.slot);
      expect(new Set(slots).size).toBe(2);
    });

    it('fires userDefinedResponse with no slot for a silent user_defined item, and keeps the item in messages', async () => {
      const chat = await makeDriver();
      const events = recordEvents(chat, [BusEventType.USER_DEFINED_RESPONSE]);
      const silent = userDefined({ silent: true });
      await add(chat, responseOf('r1', [silent, text('Visible')]));
      await waitFor(() =>
        expect(events.of(BusEventType.USER_DEFINED_RESPONSE)).toHaveLength(1)
      );
      const [event] = events.of<BusEventUserDefinedResponse>(
        BusEventType.USER_DEFINED_RESPONSE
      );
      expect(event.data.slot).toBeUndefined();
      expect(event.data.message).toEqual(silent);
      expect((chat.messages()[0] as MessageResponse).output.generic).toEqual([
        silent,
        text('Visible'),
      ]);
    });

    it('resolves and fires receive while a pause is pending, with every item already in messages', async () => {
      const chat = await makeDriver();
      const events = recordEvents(chat, [
        BusEventType.RECEIVE,
        BusEventType.USER_DEFINED_RESPONSE,
      ]);
      const generic = [pause(200), userDefined({ kind: 'after the pause' })];
      await add(chat, responseOf('r1', generic));
      expect(events.types()).toEqual(['receive']);
      expect((chat.messages()[0] as MessageResponse).output.generic).toEqual(
        generic
      );
      await waitFor(() =>
        expect(events.types()).toEqual(['receive', 'userDefinedResponse'])
      );
    });
  }
);

// @covers event.customFooterSlot instance.messaging.addMessage
describeShared('addMessage with custom footer slots', (makeDriver) => {
  beforeEach(clearSession);
  afterEach(contractCleanup);

  it('fires customFooterSlot with the slot name, item, message, and additional data', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [BusEventType.CUSTOM_FOOTER_SLOT]);
    const item: GenericItem = {
      ...text('With a footer'),
      message_item_options: {
        custom_footer_slot: {
          slot_name: 'footer-a',
          additional_data: { key: 'value' },
        },
      },
    };
    await add(chat, responseOf('r1', [item]));
    await waitFor(() =>
      expect(events.of(BusEventType.CUSTOM_FOOTER_SLOT)).toHaveLength(1)
    );
    const [event] = events.of<BusEventCustomFooterSlot>(
      BusEventType.CUSTOM_FOOTER_SLOT
    );
    expect(event.data.slotName).toBe('footer-a');
    expect(event.data.messageItem).toEqual(item);
    expect(event.data.message.id).toBe('r1');
    expect(event.data.additionalData).toEqual({ key: 'value' });
  });

  it('fires nothing for a footer slot with is_on false', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.RECEIVE,
      BusEventType.USER_DEFINED_RESPONSE,
      BusEventType.CUSTOM_FOOTER_SLOT,
    ]);
    await add(
      chat,
      responseOf('r1', [
        {
          ...text('No footer'),
          message_item_options: {
            custom_footer_slot: { slot_name: 'footer-off', is_on: false },
          },
        },
        // The chat handles items in order, so this one's event shows the
        // footer item has been handled.
        userDefined({ kind: 'last' }),
      ])
    );
    await waitFor(() =>
      expect(events.types()).toEqual(['receive', 'userDefinedResponse'])
    );
  });

  it('fires userDefinedResponse before customFooterSlot for the same item, both after receive', async () => {
    const chat = await makeDriver();
    const events = recordEvents(chat, [
      BusEventType.RECEIVE,
      BusEventType.USER_DEFINED_RESPONSE,
      BusEventType.CUSTOM_FOOTER_SLOT,
    ]);
    await add(
      chat,
      responseOf('r1', [
        userDefined(
          { kind: 'widget' },
          {
            message_item_options: {
              custom_footer_slot: { slot_name: 'footer-ud' },
            },
          }
        ),
      ])
    );
    await waitFor(() =>
      expect(events.types()).toEqual([
        'receive',
        'userDefinedResponse',
        'customFooterSlot',
      ])
    );
  });
});

// @covers instance.messaging.addMessage state.homeScreenState state.homeScreenState.isHomeScreenOpen
describe('addMessage and the home screen', () => {
  beforeEach(clearSession);
  afterEach(contractCleanup);

  it('closes an open home screen', async () => {
    const { instance } = await contractChat({ homescreen: { isOn: true } });
    await act(() => instance.changeView(ViewType.MAIN_WINDOW));
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(true)
    );
    await act(() => instance.messaging.addMessage(textResponse('Hi', 'r1')));
    await waitFor(() =>
      expect(instance.getState().homeScreenState.isHomeScreenOpen).toBe(false)
    );
  });
});

// @covers instance.messaging.addMessage state.activeResponseId state.status
describe('addMessage and other state', () => {
  beforeEach(clearSession);
  afterEach(contractCleanup);

  it('makes the added response the active response', async () => {
    const { instance } = await contractChat();
    expect(instance.getState().activeResponseId).toBeNull();
    await act(() => instance.messaging.addMessage(textResponse('One', 'r1')));
    expect(instance.getState().activeResponseId).toBe('r1');
    await act(() => instance.messaging.addMessage(textResponse('Two', 'r2')));
    expect(instance.getState().activeResponseId).toBe('r2');
  });

  it('leaves status ready when no send is pending', async () => {
    const { instance } = await contractChat();
    const statuses: string[] = [];
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: () => {
        statuses.push(instance.getState().status);
      },
    });
    await act(() => instance.messaging.addMessage(textResponse('Hi', 'r1')));
    expect(statuses.length).toBeGreaterThan(0);
    expect(new Set(statuses)).toEqual(new Set(['ready']));
    expect(instance.getState().status).toBe('ready');
  });
});

// @covers react.ChatContainer.renderCustomMessageFooter event.customFooterSlot
describe('addMessage and renderCustomMessageFooter', () => {
  beforeEach(clearSession);
  afterEach(contractCleanup);

  it('calls renderCustomMessageFooter with the slot, message, item, instance, and data, and slots its content', async () => {
    const renderFooter = jest.fn((slotName: string): React.ReactNode =>
      React.createElement('span', null, `footer ${slotName}`)
    );
    const { instance, host } = await contractChat({
      renderCustomMessageFooter: renderFooter,
    });
    const item: GenericItem = {
      ...text('With a footer'),
      message_item_options: {
        custom_footer_slot: {
          slot_name: 'footer-a',
          additional_data: { key: 'value' },
        },
      },
    };
    await act(() => instance.messaging.addMessage(responseOf('r1', [item])));
    await waitFor(() =>
      expect(
        slotted(host, 'footer-a').map((element) => element.textContent)
      ).toEqual(['footer footer-a'])
    );
    const [slotName, message, messageItem, handed, data] = renderFooter.mock
      .calls[0] as unknown as [
      string,
      MessageResponse,
      GenericItem,
      unknown,
      unknown,
    ];
    expect(slotName).toBe('footer-a');
    expect(message.id).toBe('r1');
    expect(messageItem).toEqual(item);
    expect(handed).toBe(instance);
    expect(data).toEqual({ key: 'value' });
  });
});

// @covers react.ChatContainer.renderUserDefinedResponse event.userDefinedResponse
describe('addMessage and renderUserDefinedResponse for a silent item', () => {
  beforeEach(clearSession);
  afterEach(contractCleanup);

  // Suspected bug: a silent item gets no slot, yet the React host still calls
  // renderUserDefinedResponse for it, keyed under the slot name "undefined"
  // (src/chat/utils/chatBoot.ts:579). Its content has nowhere to show.
  it('still calls renderUserDefinedResponse once for a silent item', async () => {
    const render = jest.fn((): React.ReactNode => null);
    const { instance } = await contractChat({
      renderUserDefinedResponse: render,
    });
    const silent = userDefined({ silent: true });
    await act(() =>
      instance.messaging.addMessage(responseOf('r1', [silent, text('After')]))
    );
    await waitFor(() => expect(render).toHaveBeenCalledTimes(1));
    const [state] = render.mock.calls[0] as unknown as [
      { messageItem: GenericItem },
    ];
    expect(state.messageItem).toEqual(silent);
  });
});
