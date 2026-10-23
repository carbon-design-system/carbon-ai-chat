/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import {
  Message,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  TextItem,
} from '../../../src/types/messaging/Messages';
import { PublicMessagesProjection } from '../../../src/chat/utils/publicMessages';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';

function localItem(
  fullMessageID: string,
  id: string,
  item: LocalMessageItem['item'],
  chunks?: LocalMessageItem['ui_state']['streamingState']['chunks']
): LocalMessageItem {
  return {
    fullMessageID,
    item,
    ui_state: {
      id: `${fullMessageID}-${id}`,
      streamingState: chunks ? { chunks, isDone: false } : undefined,
    },
  };
}

describe('public message state', () => {
  it.each([
    MessageResponseTypes.TEXT,
    MessageResponseTypes.CONVERSATIONAL_SEARCH,
  ])(
    'keeps full snapshot text for unfinished %s items without chunks',
    (response_type) => {
      const projection = new PublicMessagesProjection();
      const item = localItem(
        'response',
        'item',
        { response_type, text: 'Live snapshot' },
        []
      );
      const [result] = projection.project(
        ['response'],
        { response: { id: 'response', output: { generic: [] } } },
        { [item.ui_state.id]: item },
        [item.ui_state.id]
      );
      expect((result as MessageResponse).output.generic[0]).toMatchObject({
        text: 'Live snapshot',
      });
    }
  );

  it('joins conversational search chunks and keeps the fields rendered by the UI', () => {
    const projection = new PublicMessagesProjection();
    const item = localItem(
      'response',
      'search',
      {
        response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
        text: 'Final answer',
        citations: [{ title: 'Current source' }],
      },
      [
        { text: 'Alpha ', citations: [{ title: 'Old source', url: 'old' }] },
        { text: 'beta ' },
        { text: 'gamma' },
      ]
    );
    const [result] = projection.project(
      ['response'],
      { response: { id: 'response', output: { generic: [] } } },
      { [item.ui_state.id]: item },
      [item.ui_state.id]
    );
    expect((result as MessageResponse).output.generic[0]).toEqual({
      response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
      text: 'Alpha beta gamma',
      citations: [{ title: 'Current source' }],
    });
  });

  it('projects stored messages in canonical order, including silent and human-agent messages', () => {
    const projection = new PublicMessagesProjection();
    const messages: Record<string, Message> = {
      assistant: {
        id: 'assistant',
        output: { generic: [] },
      },
      silent: {
        id: 'silent',
        input: { text: 'hidden' },
        history: { silent: true },
      },
      agent: {
        id: 'agent',
        input: { text: 'human', agent_message_type: 'from_agent' },
      } as Message,
    };

    expect(projection.project([], {}, {}, [])).toEqual([]);
    expect(
      projection
        .project(['silent', 'assistant', 'agent'], messages, {}, [])
        .map((message) => message.id)
    ).toEqual(['silent', 'assistant', 'agent']);
  });

  it('overlays partial text and non-text items in response order', () => {
    const projection = new PublicMessagesProjection();
    const message: Message = {
      id: 'response',
      output: { generic: [] },
      context: { retained: true },
    };
    const text = localItem(
      'response',
      'text',
      {
        response_type: MessageResponseTypes.TEXT,
        text: '',
        streaming_metadata: { id: 'text' },
      },
      [{ text: 'Hello ' }, { text: 'world' }]
    );
    const userDefined = localItem(
      'response',
      'custom',
      {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { initial: true },
        streaming_metadata: { id: 'custom' },
      },
      [{ user_defined: { current: true } }]
    );

    const [result] = projection.project(
      ['response'],
      { response: message },
      {
        [text.ui_state.id]: text,
        [userDefined.ui_state.id]: userDefined,
      },
      [text.ui_state.id, userDefined.ui_state.id]
    );

    expect(result).toMatchObject({
      context: { retained: true },
      output: {
        generic: [
          { response_type: 'text', text: 'Hello world' },
          {
            response_type: 'user_defined',
            user_defined: { initial: true, current: true },
          },
        ],
      },
    });
  });

  it('retains silent and pause payloads through streaming completion and delayed snapshot reads', () => {
    const projection = new PublicMessagesProjection();
    const hidden = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { silent: true, value: 'before' },
    };
    const pause = { response_type: MessageResponseTypes.PAUSE, time: 100 };
    const message: MessageResponse = {
      id: 'response',
      output: {
        generic: [
          hidden,
          { response_type: MessageResponseTypes.TEXT, text: 'Hello' },
          pause,
        ],
      },
    };
    const streaming = localItem(
      'response',
      'text',
      message.output.generic[1],
      []
    );
    const first = projection.prepare(
      ['response'],
      { response: message },
      { [streaming.ui_state.id]: streaming },
      [streaming.ui_state.id]
    );
    const completeMessage: MessageResponse = {
      ...message,
      output: {
        generic: [
          {
            ...hidden,
            user_defined: { ...hidden.user_defined, value: 'after' },
          },
          { response_type: MessageResponseTypes.TEXT, text: 'Hello world' },
          pause,
        ],
      },
    };
    const complete: LocalMessageItem = {
      ...streaming,
      item: completeMessage.output.generic[1],
      ui_state: {
        ...streaming.ui_state,
        streamingState: { chunks: [], isDone: true },
      },
    };
    const second = projection.project(
      ['response'],
      { response: completeMessage },
      { [complete.ui_state.id]: complete },
      [complete.ui_state.id]
    );

    expect((second[0] as MessageResponse).output.generic).toEqual(
      completeMessage.output.generic
    );
    expect((first.get()[0] as MessageResponse).output.generic).toEqual(
      message.output.generic
    );
    expect(
      Object.isFrozen(
        (first.get()[0] as MessageResponse).output.generic[0].user_defined
      )
    ).toBe(true);
    expect(
      projection.project(
        ['response'],
        { response: completeMessage },
        {
          [complete.ui_state.id]: {
            ...complete,
            ui_state: { ...complete.ui_state, needsAnnouncement: true },
          },
        },
        [complete.ui_state.id]
      )
    ).toBe(second);
  });

  it('retains new visible items before retained streamed items', () => {
    const projection = new PublicMessagesProjection();
    const retained = {
      response_type: MessageResponseTypes.TEXT,
      text: 'B',
      streaming_metadata: { id: 'retained' },
    };
    const message: MessageResponse = {
      id: 'response',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'A' },
          retained,
        ],
      },
    };
    const streamed = localItem('response', 'retained', retained, []);
    const [result] = projection.project(
      ['response'],
      { response: message },
      { [streamed.ui_state.id]: streamed },
      [streamed.ui_state.id]
    );
    expect((result as MessageResponse).output.generic).toEqual(
      message.output.generic
    );
  });

  it('keeps ID-less local items in order around reserved streamed items', () => {
    const projection = new PublicMessagesProjection();
    const hidden = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { silent: true },
    };
    const first = { response_type: MessageResponseTypes.TEXT, text: 'A' };
    const retained = {
      response_type: MessageResponseTypes.TEXT,
      text: 'B',
      streaming_metadata: { id: 'retained' },
    };
    const last = { response_type: MessageResponseTypes.TEXT, text: 'C' };
    const message: MessageResponse = {
      id: 'response',
      output: { generic: [hidden, first, retained, last] },
    };
    const locals = [
      localItem('response', 'hidden', hidden, []),
      localItem('response', 'first', first, [{ text: 'A live' }]),
      localItem('response', 'retained', retained, [{ text: 'B live' }]),
      localItem('response', 'last', last, [{ text: 'C live' }]),
    ];
    const [result] = projection.project(
      ['response'],
      { response: message },
      Object.fromEntries(locals.map((local) => [local.ui_state.id, local])),
      locals.map((local) => local.ui_state.id)
    );
    expect((result as MessageResponse).output.generic).toEqual([
      hidden,
      { ...first, text: 'A live' },
      { ...retained, text: 'B live' },
      { ...last, text: 'C live' },
    ]);
  });

  it('does not duplicate a streamed silent item or flatten nested payloads', () => {
    const projection = new PublicMessagesProjection();
    const hidden = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { silent: true, value: 'initial' },
      streaming_metadata: { id: 'hidden' },
    };
    const card = {
      response_type: MessageResponseTypes.CARD,
      body: [{ response_type: MessageResponseTypes.TEXT, text: 'Nested' }],
    };
    const message: MessageResponse = {
      id: 'response',
      output: { generic: [hidden, card] },
    };
    const hiddenLocal = localItem('response', 'hidden', hidden, [
      { user_defined: { value: 'streamed' } },
    ]);
    const cardLocal = localItem('response', 'card', card, []);
    const [result] = projection.project(
      ['response'],
      { response: message },
      {
        [hiddenLocal.ui_state.id]: hiddenLocal,
        [cardLocal.ui_state.id]: cardLocal,
      },
      [hiddenLocal.ui_state.id, cardLocal.ui_state.id]
    );

    expect((result as MessageResponse).output.generic).toEqual([
      { ...hidden, user_defined: { silent: true, value: 'streamed' } },
      card,
    ]);
  });

  it('keeps stable references for unchanged content and fixed old snapshots', () => {
    const projection = new PublicMessagesProjection();
    const message: Message = {
      id: 'response',
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'First' }],
      },
    };
    const item = localItem('response', 'text', message.output.generic[0]);
    const first = projection.project(
      ['response'],
      { response: message },
      { [item.ui_state.id]: item },
      [item.ui_state.id]
    );
    const statusOnlyItem = {
      ...item,
      ui_state: { ...item.ui_state, needsAnnouncement: true },
    };
    const statusOnly = projection.project(
      ['response'],
      { response: message },
      { [item.ui_state.id]: statusOnlyItem },
      [item.ui_state.id]
    );

    expect(statusOnly).toBe(first);
    expect(statusOnly[0]).toBe(first[0]);

    (message.output.generic[0] as TextItem).text = 'mutated source';
    expect(
      ((first[0] as Readonly<MessageResponse>).output.generic[0] as TextItem)
        .text
    ).toBe('First');

    const changedMessage: Message = {
      ...message,
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Second' }],
      },
    };
    const changed = projection.project(
      ['response'],
      { response: changedMessage },
      {},
      []
    );
    expect(changed).not.toBe(first);
    expect(changed[0]).not.toBe(first[0]);
    expect(
      ((first[0] as Readonly<MessageResponse>).output.generic[0] as TextItem)
        .text
    ).toBe('First');
  });

  it('reuses newer message and array versions after an older version is read', () => {
    const projection = new PublicMessagesProjection();
    const firstMessage: Message = {
      id: 'response',
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'First' }],
      },
    };
    const secondMessage: Message = {
      ...firstMessage,
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Second' }],
      },
    };
    const preparedFirst = projection.prepare(
      ['response'],
      { response: firstMessage },
      {},
      []
    );
    const preparedSecond = projection.prepare(
      ['response'],
      { response: secondMessage },
      {},
      []
    );
    const second = preparedSecond.get();

    expect(preparedFirst.get()[0]).toMatchObject({ id: 'response' });
    const secondAgain = projection.project(
      ['response'],
      { response: secondMessage },
      {},
      []
    );
    expect(secondAgain).toBe(second);
    expect(secondAgain[0]).toBe(second[0]);
  });

  it('freezes public clones and removes only private message fields', () => {
    const projection = new PublicMessagesProjection();
    const source = {
      id: 'request',
      input: { text: 'hello', metadata: { ui_state: 'keep' } },
      context: { ui_state_internal: 'keep' },
      history: { timestamp: 1, file_upload_status: 'complete' },
      ui_state_internal: { from_history: true },
      ui_state: { local: true },
    } as unknown as Message;

    const messages = projection.project(
      ['request'],
      { request: source },
      {},
      []
    );
    const result = messages[0] as Readonly<MessageRequest> & {
      ui_state?: unknown;
    };

    expect(Object.isFrozen(messages)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.input)).toBe(true);
    expect(result).not.toHaveProperty('ui_state_internal');
    expect(result).not.toHaveProperty('ui_state');
    expect(result.history).not.toHaveProperty('file_upload_status');
    expect(result.context).toEqual({ ui_state_internal: 'keep' });
    expect((result.input as { metadata: unknown }).metadata).toEqual({
      ui_state: 'keep',
    });
    expect(Object.isFrozen(source)).toBe(false);
    expect(source.history).toHaveProperty('file_upload_status');
  });

  it('drops removed cache entries and replaces reused IDs with new history data', () => {
    const projection = new PublicMessagesProjection();
    const oldMessage: Message = { id: 'same', input: { text: 'old' } };
    const oldMessages = projection.project(
      ['same'],
      { same: oldMessage },
      {},
      []
    );

    expect(projection.project([], {}, {}, [])).toEqual([]);
    const cache = projection as unknown as {
      messages: Map<string, unknown>;
    };
    expect(cache.messages.size).toBe(0);

    const replacement: Message = { id: 'same', input: { text: 'new' } };
    const newMessages = projection.project(
      ['same'],
      { same: replacement },
      {},
      []
    );
    expect(newMessages[0]).not.toBe(oldMessages[0]);
    expect((newMessages[0] as Readonly<MessageRequest>).input.text).toBe('new');
  });
});

describe('silent response snapshots through public writes', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('publishes the full received payload before new visible items are revealed', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const retained = {
      response_type: MessageResponseTypes.TEXT,
      text: 'Streamed B',
      streaming_metadata: { id: 'retained' },
    };
    const response: MessageResponse = {
      id: 'retained-visible',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'New A' },
          retained,
        ],
      },
    };
    await act(async () => {
      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: response.id },
        complete_item: retained,
      });
    });
    const payloads: MessageResponse['output']['generic'][] = [];
    const unsubscribe = instance.state.subscribe(() => {
      const canonical = store.getState().allMessagesByID[
        response.id
      ] as MessageResponse;
      if (canonical.output.generic.length === 2) {
        payloads.push(
          (
            instance.state
              .get()
              .messages.find(
                (message) => message.id === response.id
              ) as MessageResponse
          ).output.generic
        );
      }
    });
    try {
      await act(async () => {
        await instance.messaging.addMessage(response);
      });
      expect(payloads.length).toBeGreaterThan(0);
      payloads.forEach((payload) =>
        expect(payload).toEqual(response.output.generic)
      );
    } finally {
      unsubscribe();
    }
  });

  it.each(['addMessage', 'final_response'] as const)(
    'matches retained streamed items by identity during a %s pause',
    async (method) => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const entered = resolvablePromise<void>();
      const release = resolvablePromise<void>();
      const pause = jest
        .spyOn(serviceManager.chunkProcessingService, 'waitForPause')
        .mockImplementation(async () => {
          entered.doResolve();
          await release;
        });
      const retained = {
        response_type: MessageResponseTypes.TEXT,
        text: 'Streamed B',
        streaming_metadata: { id: 'retained' },
      };
      const response: MessageResponse = {
        id: 'retained-after-pause',
        output: {
          generic: [
            { response_type: MessageResponseTypes.PAUSE, time: 100 },
            { response_type: MessageResponseTypes.TEXT, text: 'New A' },
            retained,
          ],
        },
      };
      try {
        await act(async () => {
          await instance.messaging.addMessageChunk({
            streaming_metadata: { response_id: response.id },
            complete_item: retained,
          });
          if (method === 'addMessage') {
            await instance.messaging.addMessage(response);
          } else {
            await instance.messaging.addMessageChunk({
              final_response: response,
            });
          }
          await entered;
        });
        const state = store.getState();
        expect(
          state.assistantMessageState.localMessageIDs
            .map((id) => state.allMessageItemsByID[id])
            .filter((item) => item.fullMessageID === response.id)
            .map((item) => item.item)
        ).toEqual([retained]);
        const during = instance.state.get();
        expect(
          (
            during.messages.find(
              (message) => message.id === response.id
            ) as MessageResponse
          ).output.generic
        ).toEqual(response.output.generic);
      } finally {
        await act(async () => {
          release.doResolve();
          await release;
        });
        pause.mockRestore();
      }
    }
  );

  it('retains the full COMPLETE payload while a pause delays visible items', async () => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const entered = resolvablePromise<void>();
    const release = resolvablePromise<void>();
    const pause = jest
      .spyOn(serviceManager.chunkProcessingService, 'waitForPause')
      .mockImplementation(async () => {
        entered.doResolve();
        await release;
      });
    const response: MessageResponse = {
      id: 'paused-complete',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'Before pause' },
          { response_type: MessageResponseTypes.PAUSE, time: 100 },
          { response_type: MessageResponseTypes.TEXT, text: 'After pause' },
        ],
      },
    };
    let pending: Promise<void>;
    try {
      await act(async () => {
        pending = instance.messaging.upsertMessage(
          response.id,
          MessageState.COMPLETE,
          () => response
        );
        await entered;
      });
      const during = instance.state.get();
      const state = store.getState();
      expect(
        state.assistantMessageState.localMessageIDs
          .map((id) => state.allMessageItemsByID[id])
          .filter((item) => item.fullMessageID === response.id)
          .map((item) => item.item)
      ).toEqual([response.output.generic[0]]);
      expect(
        (
          during.messages.find(
            (message) => message.id === response.id
          ) as MessageResponse
        ).output.generic
      ).toEqual(response.output.generic);
      await act(async () => {
        release.doResolve();
        await pending;
      });
      expect(
        (
          instance.state
            .get()
            .messages.find(
              (message) => message.id === response.id
            ) as MessageResponse
        ).output.generic
      ).toEqual(response.output.generic);
      expect(
        (
          during.messages.find(
            (message) => message.id === response.id
          ) as MessageResponse
        ).output.generic
      ).toEqual(response.output.generic);
    } finally {
      release.doResolve();
      await pending;
      pause.mockRestore();
    }
  });

  it.each(['addMessage', 'upsertMessage'] as const)(
    'retains silent generic content after COMPLETE through %s',
    async (method) => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const response: MessageResponse = {
        id: 'silent-complete',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { silent: true, value: 'retained' },
            },
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Visible after silent',
            },
          ],
        },
      };
      const slot = jest.fn();
      instance.on({ type: BusEventType.USER_DEFINED_RESPONSE, handler: slot });
      await act(async () => {
        if (method === 'addMessage') {
          await instance.messaging.addMessage(response);
        } else {
          await instance.messaging.upsertMessage(
            response.id,
            MessageState.COMPLETE,
            () => response
          );
        }
      });
      const snapshot = instance.state
        .get()
        .messages.find(
          (message) => message.id === response.id
        ) as MessageResponse;
      expect(snapshot.output.generic).toEqual(response.output.generic);
      expect(Object.isFrozen(snapshot.output.generic[0].user_defined)).toBe(
        true
      );
      expect(slot).toHaveBeenCalledTimes(1);
      const state = store.getState();
      expect(
        state.assistantMessageState.localMessageIDs
          .map((id) => state.allMessageItemsByID[id])
          .filter((item) => item.fullMessageID === response.id)
          .map((item) => item.item)
      ).toEqual([response.output.generic[1]]);
    }
  );
});
