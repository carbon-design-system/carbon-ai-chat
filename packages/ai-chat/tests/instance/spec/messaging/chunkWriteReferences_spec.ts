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
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  MessageResponse,
  MessageResponseTypes,
  PartialItemChunk,
} from '../../../../src/types/messaging/Messages';

function textChunk(itemID: string, text: string): PartialItemChunk {
  return {
    streaming_metadata: { response_id: 'response' },
    partial_item: {
      response_type: MessageResponseTypes.TEXT,
      streaming_metadata: { id: itemID },
      text,
    },
  };
}

describe('chunk write references', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('keeps stored message references while consecutive chunks replace only their local item', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.addMessageChunk(textChunk('other', 'Other'));
      await instance.messaging.addMessageChunk(textChunk('text', 'Hello'));
    });

    for (const delta of [' ', 'world']) {
      const before = store.getState();
      const previousItem = before.allMessageItemsByID['response-text'];
      const previousChunks = previousItem.ui_state.streamingState.chunks;
      const previousChunkCount = previousChunks.length;

      await act(async () => {
        await instance.messaging.addMessageChunk(textChunk('text', delta));
      });

      const after = store.getState();
      const nextItem = after.allMessageItemsByID['response-text'];
      expect(after.allMessagesByID).toBe(before.allMessagesByID);
      expect(after.allMessagesByID.response).toBe(
        before.allMessagesByID.response
      );
      expect(after.allMessageItemsByID).not.toBe(before.allMessageItemsByID);
      expect(after.allMessageItemsByID['response-other']).toBe(
        before.allMessageItemsByID['response-other']
      );
      expect(nextItem).not.toBe(previousItem);
      expect(nextItem.item).toBe(previousItem.item);
      expect(nextItem.ui_state.streamingState.chunks).not.toBe(previousChunks);
      expect(nextItem.ui_state.streamingState.chunks).toHaveLength(
        previousChunkCount + 1
      );
      expect(previousChunks).toHaveLength(previousChunkCount);
      expect(
        nextItem.ui_state.streamingState.chunks[previousChunkCount]
      ).toMatchObject({ text: delta });
    }
  });

  it('keeps a public upsert snapshot unchanged when chunks add and extend another item', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await act(async () => {
      await instance.messaging.upsertMessage(
        'response',
        MessageState.STREAMING,
        () => ({
          id: 'response',
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                streaming_metadata: { id: 'snapshot' },
                text: 'Snapshot',
              },
            ],
          },
        })
      );
    });
    const before = store.getState();

    await act(async () => {
      await instance.messaging.addMessageChunk(textChunk('delta', 'Hello'));
      await instance.messaging.addMessageChunk(textChunk('delta', ' world'));
    });

    const after = store.getState();
    expect(after.allMessagesByID).toBe(before.allMessagesByID);
    expect(after.allMessagesByID.response).toBe(
      before.allMessagesByID.response
    );
    expect(after.allMessageItemsByID['response-snapshot']).toBe(
      before.allMessageItemsByID['response-snapshot']
    );
    expect(before.allMessageItemsByID['response-delta']).toBeUndefined();
    expect(
      after.allMessageItemsByID['response-delta'].ui_state.streamingState.chunks
    ).toMatchObject([{ text: 'Hello' }, { text: ' world' }]);
    expect(
      (after.allMessagesByID.response as MessageResponse).output.generic
    ).toHaveLength(1);
  });

  it('copies message options while preserving earlier metadata and unrelated message branches', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const firstChunk = textChunk('text', 'Hello');
    firstChunk.partial_response = {
      message_options: {
        reasoning: {
          content: 'Thinking',
          steps: [{ title: 'First' }, { title: 'Second' }],
        },
        response_user_profile: { nickname: 'Pat' },
      },
    };
    await act(async () => {
      await instance.messaging.addMessageChunk(firstChunk);
      await instance.messaging.addMessageChunk(textChunk('other', 'Other'));
    });
    const before = store.getState();
    const previousMessage = before.allMessagesByID.response as MessageResponse;
    const nextChunk = textChunk('text', ' world');
    nextChunk.partial_response = {
      message_options: {
        reasoning: { steps: [{ content: 'Found it' }] },
        response_user_profile: { nickname: undefined },
      },
    };

    await act(async () => {
      await instance.messaging.addMessageChunk(nextChunk);
    });

    const after = store.getState();
    const nextMessage = after.allMessagesByID.response as MessageResponse;
    expect(after.allMessagesByID).not.toBe(before.allMessagesByID);
    expect(nextMessage).not.toBe(previousMessage);
    expect(nextMessage.output).toBe(previousMessage.output);
    expect(nextMessage.history).toBe(previousMessage.history);
    expect(nextMessage.message_options).toEqual({
      reasoning: {
        content: 'Thinking',
        steps: [{ title: 'First', content: 'Found it' }, { title: 'Second' }],
      },
      response_user_profile: { nickname: 'Pat' },
    });
    expect(previousMessage.message_options.reasoning.steps).toEqual([
      { title: 'First' },
      { title: 'Second' },
    ]);
    expect(after.allMessageItemsByID['response-other']).toBe(
      before.allMessageItemsByID['response-other']
    );
  });
});
