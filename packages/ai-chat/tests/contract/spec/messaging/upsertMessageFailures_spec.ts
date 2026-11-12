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
  HumanAgentMessageType,
  MessageResponse,
  MessageResponseTypes,
  MessageState,
  OnErrorData,
  OnErrorType,
} from '../../../../src/aiChatEntry';
import {
  describeShared,
  finishSend,
  recordEvents,
  startSend,
  textResponse,
  textsOf,
  upsertText,
} from '../../helpers';

const RECEIVE_EVENTS = [BusEventType.PRE_RECEIVE, BusEventType.RECEIVE];

// @covers instance.messaging.upsertMessage config.onError state.messages
describeShared('upsertMessage when the updater fails', (makeDriver) => {
  it('rejects with what a sync updater threw, calls no onError, and keeps the message', async () => {
    const onError = jest.fn<void, [OnErrorData]>();
    const chat = await makeDriver({ onError });
    await upsertText(chat, 'm1', MessageState.STREAMING, 'kept');
    const events = recordEvents(chat, RECEIVE_EVENTS);
    const error = new Error('boom');
    await act(async () => {
      await expect(
        chat.messaging.upsertMessage('m1', MessageState.COMPLETE, () => {
          throw error;
        })
      ).rejects.toBe(error);
    });
    expect(onError).not.toHaveBeenCalled();
    expect(events.types()).toEqual([]);
    expect(textsOf(chat, 'm1')).toEqual(['kept']);
  });

  it('rejects with what an async updater rejected with, and stores nothing for a new ID', async () => {
    const onError = jest.fn<void, [OnErrorData]>();
    const chat = await makeDriver({ onError });
    const error = new Error('later boom');
    await act(async () => {
      await expect(
        chat.messaging.upsertMessage('m1', MessageState.COMPLETE, async () => {
          throw error;
        })
      ).rejects.toBe(error);
    });
    expect(onError).not.toHaveBeenCalled();
    expect(chat.messages()).toEqual([]);
  });

  it('rejects with a TypeError when the updater returns nothing', async () => {
    const chat = await makeDriver();
    await act(async () => {
      await expect(
        chat.messaging.upsertMessage(
          'm1',
          MessageState.COMPLETE,
          () => undefined as MessageResponse
        )
      ).rejects.toBeInstanceOf(TypeError);
    });
    expect(chat.messages()).toEqual([]);
  });

  it('rejects with an Error when the returned ID differs from the call ID', async () => {
    // The upsertMessage JSDoc says `TypeError`; `main` rejects with a plain
    // `Error`. Either passes, so a later fix to `TypeError` doesn't fail here.
    const chat = await makeDriver();
    let rejection: unknown;
    await act(async () => {
      await chat.messaging
        .upsertMessage('m1', MessageState.COMPLETE, () =>
          textResponse('wrong', 'other')
        )
        .catch((error) => {
          rejection = error;
        });
    });
    expect(rejection).toBeInstanceOf(Error);
    expect(chat.messages()).toEqual([]);
  });

  it('rejects with a TypeError for an empty ID, an unknown state, or a non-function updater', async () => {
    const chat = await makeDriver();
    const response = () => textResponse('x', 'm1');
    await act(async () => {
      await expect(
        chat.messaging.upsertMessage('', MessageState.COMPLETE, response)
      ).rejects.toBeInstanceOf(TypeError);
      await expect(
        chat.messaging.upsertMessage('m1', 'done' as MessageState, response)
      ).rejects.toBeInstanceOf(TypeError);
      await expect(
        chat.messaging.upsertMessage(
          'm1',
          MessageState.COMPLETE,
          'nope' as unknown as () => MessageResponse
        )
      ).rejects.toBeInstanceOf(TypeError);
    });
    expect(chat.messages()).toEqual([]);
  });

  it('rejects for the ID of a request the user sent, and leaves it alone', async () => {
    const chat = await makeDriver();
    await finishSend(
      await startSend(chat, { id: 'req-1', input: { text: 'hello' } })
    );
    let rejection: unknown;
    await act(async () => {
      await chat.messaging
        .upsertMessage('req-1', MessageState.COMPLETE, () =>
          textResponse('x', 'req-1')
        )
        .catch((error) => {
          rejection = error;
        });
    });
    // The upsertMessage JSDoc says `TypeError`; `main` rejects with a plain
    // `Error`. Either passes, so a later fix to `TypeError` doesn't fail here.
    expect(rejection).toBeInstanceOf(Error);
    expect(chat.messages().map((message) => message.id)).toEqual(['req-1']);
    expect(
      (chat.messages()[0] as { input?: { text?: string } }).input.text
    ).toBe('hello');
  });

  it('rejects for a returned request and stores nothing', async () => {
    // `main` has no check for a returned request: a later step fails reading
    // the message the store dropped. The JSDoc names a `TypeError`; this
    // records only that the call rejects.
    const chat = await makeDriver();
    await act(async () => {
      await expect(
        chat.messaging.upsertMessage(
          'm1',
          MessageState.COMPLETE,
          () =>
            ({ id: 'm1', input: { text: 'x' } }) as unknown as MessageResponse
        )
      ).rejects.toBeDefined();
    });
    expect(chat.messages()).toEqual([]);
  });

  it('stores a returned human-agent message', async () => {
    // `main` accepts it; the upsertMessage JSDoc says it rejects with a
    // `TypeError`.
    const chat = await makeDriver();
    await act(async () => {
      await expect(
        chat.messaging.upsertMessage('m1', MessageState.COMPLETE, () =>
          textResponse('from agent', 'm1', {
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'from agent',
                  agent_message_type: HumanAgentMessageType.FROM_HUMAN_AGENT,
                },
              ],
            },
          })
        )
      ).resolves.toBeUndefined();
    });
    expect(chat.messages().map((message) => message.id)).toEqual(['m1']);
    expect(textsOf(chat, 'm1')).toEqual(['from agent']);
  });
});

/** A message whose one item is a grid with no `rows`, which the chat can't draw. */
function rowlessGrid(id: string): MessageResponse {
  return {
    id,
    output: { generic: [{ response_type: MessageResponseTypes.GRID }] },
  } as unknown as MessageResponse;
}

// @covers instance.messaging.upsertMessage config.onError export.aiChatEntry.MessageState
// @covers export.aiChatEntry.OnErrorType
describeShared('upsertMessage reports an item it cannot draw', (makeDriver) => {
  it.each([MessageState.COMPLETE, MessageState.ERROR])(
    'calls onError once with RENDER and the item for a %s write, and still resolves',
    async (state) => {
      const onError = jest.fn<void, [OnErrorData]>();
      const chat = await makeDriver({ onError });
      await act(async () => {
        await expect(
          chat.messaging.upsertMessage('g1', state, () => rowlessGrid('g1'))
        ).resolves.toBeUndefined();
      });
      expect(onError).toHaveBeenCalledTimes(1);
      const [report] = onError.mock.calls[0];
      expect(report.errorType).toBe(OnErrorType.RENDER);
      expect(report.otherData).toEqual({
        messageID: 'g1',
        responseType: MessageResponseTypes.GRID,
        missing: ['rows'],
        item: { response_type: MessageResponseTypes.GRID },
      });
      expect(chat.messages().map((message) => message.id)).toEqual(['g1']);
    }
  );

  it('reports nothing while STREAMING, then once at COMPLETE, and not again for repeats', async () => {
    const onError = jest.fn<void, [OnErrorData]>();
    const chat = await makeDriver({ onError });
    const write = (state: MessageState) =>
      act(() =>
        chat.messaging.upsertMessage('g1', state, () => rowlessGrid('g1'))
      );
    await write(MessageState.STREAMING);
    expect(onError).not.toHaveBeenCalled();
    await write(MessageState.COMPLETE);
    expect(onError).toHaveBeenCalledTimes(1);
    await write(MessageState.COMPLETE);
    await write(MessageState.ERROR);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
