/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `state.messageItems`: one entry per item the message list draws, with stable IDs, a kind, a
 * status, an origin, and, on connect-to-agent items, what the chat knew about agents.
 */

import { createChatSDK } from '../../../src/sdk';
import { chatOf, type ChatSDKHandle } from '../../../src/sdk/handle';
import actions from '../../../src/sdk/store/actions';
import { resolvablePromise } from '../../../src/sdk/utils/resolvablePromise';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type { ChatSDKConfig } from '../../../src/types/config/ChatSDKConfig';
import {
  HumanAgentsOnlineStatus,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import type {
  ChatSDKMessageItem,
  ChatSDKState,
} from '../../../src/types/instance/ChatSDKState';
import type { HistoryItem } from '../../../src/types/messaging/History';
import {
  type GenericItem,
  type MessageRequest,
  type MessageResponse,
  MessageResponseTypes,
  UserType,
} from '../../../src/types/messaging/Messages';
import {
  type LocalMessageItem,
  MessageErrorState,
} from '../../../src/types/messaging/LocalMessageItem';
import {
  PublicMessageItemsProjection,
  planMessageItems,
} from '../../../src/sdk/utils/publicMessageItems';

const text = (value: string, streamID?: string): GenericItem => ({
  response_type: MessageResponseTypes.TEXT,
  text: value,
  ...(streamID && { streaming_metadata: { id: streamID } }),
});

const button = (label: string): GenericItem =>
  ({
    response_type: MessageResponseTypes.BUTTON,
    kind: 'default',
    button_type: 'post_back',
    label,
    value: { input: { text: label } },
  }) as GenericItem;

const card = (title: string): GenericItem =>
  ({
    response_type: MessageResponseTypes.CARD,
    body: [text(`${title} body 1`), text(`${title} body 2`)],
    footer: [button(`${title} footer`)],
  }) as GenericItem;

function request(id: string, value: string): MessageRequest {
  return { id, input: { text: value } } as MessageRequest;
}

function response(id: string, generic: GenericItem[]): MessageResponse {
  return { id, output: { generic } } as MessageResponse;
}

function history(...messages: (MessageRequest | MessageResponse)[]) {
  return messages.map((message, index): HistoryItem => ({
    message,
    time: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  }));
}

/** A transcript with every item shape the list nests, plus items it leaves out. */
function richHistory() {
  return history(
    request('request-1', 'Show me everything'),
    response('response-1', [
      text('first'),
      { response_type: MessageResponseTypes.PAUSE, time: 0 } as GenericItem,
      text('named', '0'),
      { ...text('hidden'), user_defined: { silent: true } } as GenericItem,
      text('after'),
      card('Card'),
      {
        response_type: MessageResponseTypes.CAROUSEL,
        items: [card('Slide A'), card('Slide B')],
      } as GenericItem,
      {
        response_type: MessageResponseTypes.GRID,
        columns: [{ width: '1' }, { width: '1' }],
        rows: [
          {
            cells: [{ items: [text('a'), text('b')] }, { items: [text('c')] }],
          },
        ],
      } as GenericItem,
    ])
  );
}

const last = <T>(values: readonly T[]): T => values[values.length - 1];

/** Plans a store with one response and the given local items, in order. */
function planOne(message: MessageResponse, items: GenericItem[]) {
  const locals: LocalMessageItem[] = items.map((item, index) => ({
    fullMessageID: message.id,
    item,
    ui_state: { id: `local-${index}` },
  }));
  return planMessageItems(
    [message.id],
    { [message.id]: message },
    Object.fromEntries(locals.map((local) => [local.ui_state.id, local])),
    locals.map((local) => local.ui_state.id)
  );
}

const ids = (state: ChatSDKState) => state.messageItems.map(({ id }) => id);

function mockDesk() {
  let callback: ServiceDeskCallback;
  const desk = {
    getName: () => 'Test desk',
    startChat: jest.fn(async () => {}),
    endChat: jest.fn(async () => {}),
    sendMessageToAgent: jest.fn(async () => {}),
  };
  return {
    callback: () => callback,
    factory: async (parameters: { callback: ServiceDeskCallback }) => {
      callback = parameters.callback;
      return desk as unknown as ServiceDesk;
    },
  };
}

describe('state.messageItems', () => {
  const chats: ChatSDKHandle[] = [];
  afterEach(async () => {
    await Promise.all(chats.splice(0).map((chat) => chat.destroy()));
  });

  let namespace = 0;
  async function sdkChat(config: ChatSDKConfig = {}) {
    const chat = await createChatSDK({
      namespace: `message-items-${namespace++}`,
      ...config,
      messaging: { skipWelcome: true, ...config.messaging },
    });
    chats.push(chat);
    return chat;
  }

  async function chatWithHistory(items = richHistory()) {
    const chat = await sdkChat();
    await chat.messaging.insertHistory(items);
    return chat;
  }

  it('starts empty, frozen, beside the empty messages', async () => {
    const chat = await sdkChat();
    const { messageItems, messages } = chat.state.get();
    expect(messages).toEqual([]);
    expect(messageItems).toEqual([]);
    expect(Object.isFrozen(messageItems)).toBe(true);
  });

  describe('IDs', () => {
    it('follows the stream ID, else the position, with nested, footer, and grid forms', async () => {
      const chat = await chatWithHistory();
      expect(ids(chat.state.get())).toEqual([
        'request-1:i:0',
        'response-1:i:0',
        // A stream ID of "0" and position 0 stay apart.
        'response-1:s:0',
        // Pauses keep their positions in output.generic. History draws a hidden item, so it's listed.
        'response-1:i:3',
        'response-1:i:4',
        'response-1:i:5',
        'response-1:i:5:i:0',
        'response-1:i:5:i:1',
        'response-1:i:5:f:0',
        'response-1:i:6',
        'response-1:i:6:i:0',
        'response-1:i:6:i:0:i:0',
        'response-1:i:6:i:0:i:1',
        'response-1:i:6:i:0:f:0',
        'response-1:i:6:i:1',
        'response-1:i:6:i:1:i:0',
        'response-1:i:6:i:1:i:1',
        'response-1:i:6:i:1:f:0',
        'response-1:i:7',
        'response-1:i:7:i:0.0.0',
        'response-1:i:7:i:0.0.1',
        'response-1:i:7:i:0.1.0',
      ]);
      expect(new Set(ids(chat.state.get())).size).toBe(22);
    });

    it('gives nested items their parent and the content they draw', async () => {
      const chat = await chatWithHistory();
      const byID = new Map(
        chat.state.get().messageItems.map((entry) => [entry.id, entry])
      );
      expect(byID.get('response-1:i:5:f:0')).toMatchObject({
        parentID: 'response-1:i:5',
        item: { label: 'Card footer' },
      });
      expect(byID.get('response-1:i:7:i:0.1.0')).toMatchObject({
        parentID: 'response-1:i:7',
        item: { text: 'c' },
      });
      expect(byID.get('response-1:i:0')).not.toHaveProperty('parentID');
    });

    it('gives the same IDs when the same history loads again, as on a reload', async () => {
      const first = await chatWithHistory();
      const second = await chatWithHistory();
      expect(ids(second.state.get())).toEqual(ids(first.state.get()));
      expect(second.state.get().messageItems).toEqual(
        first.state.get().messageItems
      );
    });

    it('keeps the IDs of a message with no ID while the conversation goes on', async () => {
      const chat = await chatWithHistory(
        history(
          { input: { text: 'no id' } } as MessageRequest,
          { output: { generic: [text('unnamed'), text('second')] } } as any
        )
      );
      const before = ids(chat.state.get());
      expect(before).toHaveLength(3);
      before.forEach((id) => expect(id).toMatch(/:i:\d$/));
      await chat.messaging.upsertMessage('later', MessageState.COMPLETE, () =>
        response('later', [text('later')])
      );
      expect(ids(chat.state.get()).slice(0, 3)).toEqual(before);
    });
  });

  describe("what's in the list", () => {
    it('leaves out silent requests, pauses, and hidden items, and every messageID is in messages', async () => {
      const chat = await chatWithHistory(
        history(
          {
            ...request('silent', 'quietly'),
            history: { silent: true },
          } as MessageRequest,
          {
            ...response('silent-response', [text('silent')]),
            history: { silent: true },
          } as MessageResponse
        )
      );
      await chat.messaging.upsertMessage('reply', MessageState.COMPLETE, () =>
        response('reply', [
          { response_type: MessageResponseTypes.PAUSE, time: 0 } as any,
          { ...text('hidden'), user_defined: { silent: true } } as any,
          text('shown'),
        ])
      );
      const { messageItems, messages } = chat.state.get();
      expect(messageItems.map(({ id, item }) => [id, item])).toEqual([
        ['reply:i:2', text('shown')],
      ]);
      const messageIDs = new Set(messages.map(({ id }) => id));
      messageItems.forEach((entry) =>
        expect(messageIDs.has(entry.messageID)).toBe(true)
      );
      expect(messageIDs.has('silent')).toBe(true);
    });

    it('lists a request with the text its bubble shows', async () => {
      const chat = await chatWithHistory(
        history({
          ...request('labeled', 'sent text'),
          history: { label: 'Shown label' },
        } as MessageRequest)
      );
      expect(chat.state.get().messageItems).toEqual([
        expect.objectContaining({
          id: 'labeled:i:0',
          kind: 'request',
          item: expect.objectContaining({
            response_type: MessageResponseTypes.TEXT,
            text: 'Shown label',
          }),
        }),
      ]);
    });
  });

  describe('kind', () => {
    it("marks the chat's own notes as system: a cancelled request, and an agent joining", async () => {
      const desk = mockDesk();
      const aborted = resolvablePromise<void>();
      const chat = await sdkChat({
        serviceDeskFactory: desk.factory,
        messaging: {
          messageTimeoutSecs: 0,
          customSendMessage: async (_request, { signal }) => {
            signal.addEventListener('abort', () => aborted.doResolve());
            await aborted;
          },
        },
      });
      const sending = chat.messaging.send('Hello');
      await new Promise((resolve) => setTimeout(resolve));
      await chat.messaging.stop();
      await sending;

      await chat.serviceDesk.startConversation();
      await desk.callback().agentJoined({
        id: 'dana',
        nickname: 'Dana',
        user_type: UserType.HUMAN,
      });
      await desk.callback().sendMessageToUser('Hi, I am Dana', 'dana');

      const kinds = chat.state
        .get()
        .messageItems.map(({ kind, item }) => [
          kind,
          item.response_type,
          'title' in item ? item.title : (item as { text?: string }).text,
        ]);
      expect(kinds).toEqual([
        ['request', MessageResponseTypes.TEXT, 'Hello'],
        ['system', MessageResponseTypes.SYSTEM, 'Request cancelled'],
        [
          'system',
          MessageResponseTypes.SYSTEM,
          expect.stringContaining('Dana'),
        ],
        [
          'system',
          MessageResponseTypes.TEXT,
          expect.stringContaining('request a new agent'),
        ],
        ['response', MessageResponseTypes.TEXT, 'Hi, I am Dana'],
      ]);
    });

    it('keeps a response with a system item among others a response', async () => {
      const chat = await chatWithHistory(
        history(
          response('mixed', [
            text('answer'),
            {
              response_type: MessageResponseTypes.SYSTEM,
              title: 'note',
            } as any,
          ]),
          response('note', [
            {
              response_type: MessageResponseTypes.SYSTEM,
              title: 'note',
            } as any,
          ])
        )
      );
      expect(
        chat.state.get().messageItems.map(({ id, kind }) => [id, kind])
      ).toEqual([
        ['mixed:i:0', 'response'],
        ['mixed:i:1', 'response'],
        ['note:i:0', 'system'],
      ]);
    });
  });

  describe('status, origin, and humanAgent', () => {
    it('marks history and live items, and streaming, complete, and errored ones', async () => {
      const chat = await chatWithHistory(
        history(response('old', [text('from history')]), {
          ...request('failed', 'did not send'),
          history: { error_state: MessageErrorState.FAILED },
        } as MessageRequest)
      );
      await chat.messaging.upsertMessage('live', MessageState.STREAMING, () =>
        response('live', [text('so far', 'part')])
      );
      const statusOf = () =>
        chat.state
          .get()
          .messageItems.map(({ id, status, origin }) => [id, status, origin]);
      expect(statusOf()).toEqual([
        ['old:i:0', 'complete', 'history'],
        ['failed:i:0', 'error', 'history'],
        ['live:s:part', 'streaming', 'live'],
      ]);
      expect(chat.state.get().messageItems[2].item).toMatchObject({
        text: 'so far',
      });

      await chat.messaging.upsertMessage('live', MessageState.COMPLETE, () =>
        response('live', [text('so far, and done', 'part')])
      );
      expect(statusOf()[2]).toEqual(['live:s:part', 'complete', 'live']);
      expect(chat.state.get().messageItems[2].item).toMatchObject({
        text: 'so far, and done',
      });
    });

    it('marks a turn failed while streaming as an error', async () => {
      const hold = resolvablePromise<void>();
      const chat = await sdkChat({
        messaging: {
          messageTimeoutSecs: 0,
          customSendMessage: async (sent, _options, instance) => {
            await instance.messaging.upsertMessage(
              'streamed',
              MessageState.STREAMING,
              () => ({
                ...response('streamed', [text('partial', 'only')]),
                request_id: sent.id,
              })
            );
            await hold;
          },
        },
      });
      const sending = chat.messaging.send('Go').catch((): void => undefined);
      await new Promise((resolve) => setTimeout(resolve));
      expect(last(chat.state.get().messageItems).status).toBe('streaming');
      await chat.messaging.failTurn();
      await sending;
      hold.doResolve();
      expect(last(chat.state.get().messageItems)).toMatchObject({
        id: 'streamed:s:only',
        status: 'error',
      });
    });

    it('gives only connect-to-agent items what the chat knew about agents', async () => {
      const chat = await sdkChat();
      await chat.messaging.upsertMessage('connect', MessageState.COMPLETE, () =>
        response('connect', [
          text('Let me connect you'),
          {
            response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
            transfer_info: {},
          } as any,
        ])
      );
      await new Promise((resolve) => setTimeout(resolve));
      const [plain, connect] = chat.state.get().messageItems;
      expect(plain).not.toHaveProperty('humanAgent');
      expect(connect.humanAgent).toEqual({
        onlineStatus: HumanAgentsOnlineStatus.UNKNOWN,
        noServiceDesk: true,
      });
      expect(Object.isFrozen(connect.humanAgent)).toBe(true);

      const desk = mockDesk();
      const withDesk = await sdkChat({
        serviceDeskFactory: async (parameters) => {
          const created = await desk.factory(parameters);
          return { ...created, areAnyAgentsOnline: async () => true };
        },
      });
      await withDesk.messaging.upsertMessage(
        'connect',
        MessageState.COMPLETE,
        () =>
          response('connect', [
            {
              response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
              transfer_info: {},
            } as any,
          ])
      );
      await new Promise((resolve) => setTimeout(resolve));
      expect(withDesk.state.get().messageItems[0].humanAgent).toMatchObject({
        onlineStatus: HumanAgentsOnlineStatus.ONLINE,
      });
      expect(
        withDesk.state.get().messageItems[0].humanAgent.noServiceDesk
      ).not.toBe(true);
    });
  });

  describe('IDs from the store', () => {
    it('gives a repeated stream ID the positional form, so no two IDs match', () => {
      const first = text('one', 'same');
      const second = text('two', 'same');
      const plans = planOne(response('r', [first, second]), [first, second]);
      expect(plans.map(({ id }) => id)).toEqual(['r:s:same', 'r:i:1']);
    });

    it('skips a hidden item when a streamed copy no longer matches the response', () => {
      const hidden = { ...text('hidden'), user_defined: { silent: true } };
      // The local copy has streamed on past the response's, so nothing is equal to it.
      const plans = planOne(
        response('r', [hidden as GenericItem, text('final')]),
        [text('partial')]
      );
      expect(plans.map(({ id }) => id)).toEqual(['r:i:1']);
    });
  });

  describe('references', () => {
    it('keeps the array when a new plan has the same values', () => {
      const projection = new PublicMessageItemsProjection();
      const item = text('same');
      const first = projection.project(planOne(response('r', [item]), [item]));
      const again = projection.project(planOne(response('r', [item]), [item]));
      expect(again).toBe(first);
      expect(again[0]).toBe(first[0]);
    });

    it('freezes each entry and its item', async () => {
      const chat = await chatWithHistory();
      chat.state.get().messageItems.forEach((entry) => {
        expect(Object.isFrozen(entry)).toBe(true);
        expect(Object.isFrozen(entry.item)).toBe(true);
      });
    });

    it('keeps unchanged entries, and the array when nothing it lists changed', async () => {
      const chat = await chatWithHistory();
      const before = chat.state.get().messageItems;

      await chat.messaging.upsertMessage('live', MessageState.STREAMING, () =>
        response('live', [text('one', 'part')])
      );
      const streaming = chat.state.get().messageItems;
      expect(streaming).not.toBe(before);
      streaming
        .slice(0, before.length)
        .forEach((entry, index) => expect(entry).toBe(before[index]));

      await chat.messaging.upsertMessage('live', MessageState.STREAMING, () =>
        response('live', [text('one two', 'part')])
      );
      const next = chat.state.get().messageItems;
      next
        .slice(0, before.length)
        .forEach((entry, index) => expect(entry).toBe(before[index]));
      expect(last(next)).not.toBe(last(streaming));
      expect(last(next).item).toMatchObject({ text: 'one two' });

      // A change outside the conversation's messages keeps the array.
      const snapshot = chat.state.get();
      chatOf(chat).store.dispatch(actions.setIsRestarting(true));
      expect(chat.state.get()).not.toBe(snapshot);
      expect(chat.state.get().messageItems).toBe(next);
    });
  });

  it('changes in the same notification as messages', async () => {
    const chat = await chatWithHistory(history(request('request-1', 'Hi')));
    const seen: [string[], string[]][] = [];
    const stop = chat.state.subscribe(() => {
      const { messages, messageItems } = chat.state.get();
      const itemText = messageItems
        .filter(({ messageID }) => messageID === 'live')
        .map(({ item }) => (item as { text: string }).text);
      const messageText = (
        messages.find(({ id }) => id === 'live') as MessageResponse
      )?.output.generic.map((item) => (item as { text: string }).text);
      seen.push([itemText, messageText ?? []]);
    });
    for (const value of ['a', 'a b', 'a b c']) {
      await chat.messaging.upsertMessage('live', MessageState.STREAMING, () =>
        response('live', [text(value, 'part')])
      );
    }
    stop();
    expect(seen.length).toBeGreaterThanOrEqual(3);
    seen.forEach(([itemText, messageText]) =>
      expect(itemText).toEqual(messageText)
    );
    expect(last(seen)).toEqual([['a b c'], ['a b c']]);
  });

  it('types each entry as a ChatSDKMessageItem', async () => {
    const chat = await chatWithHistory();
    const entry: Readonly<ChatSDKMessageItem> =
      chat.state.get().messageItems[0];
    expect(Object.keys(entry).sort()).toEqual(
      ['id', 'item', 'kind', 'messageID', 'origin', 'status'].sort()
    );
  });
});
