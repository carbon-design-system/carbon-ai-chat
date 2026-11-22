/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Streaming a reply into a mounted chat copies and freezes only the item a chunk changed. Every
 * other item and message in `messages` and `messageItems` keeps its reference, and the two fields
 * share the changed item's copy.
 */

import { act } from '@testing-library/react';
import * as objectUtils from '../lang/objectUtils';
import type { HistoryItem } from '../../../types/messaging/History';
import {
  type GenericItem,
  type MessageResponse,
  MessageResponseTypes,
} from '../../../types/messaging/Messages';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import type { PublicChatState } from '../../../types/instance/PublicChatState';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../chat/__tests__/helpers/chat';

const RESPONSE_ID = 'live';

function history(): HistoryItem[] {
  const time = (minute: number) =>
    new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString();
  return [
    { message: { id: 'request-1', input: { text: 'Hi' } }, time: time(0) },
    {
      message: {
        id: 'response-1',
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'Hello' },
            { response_type: MessageResponseTypes.TEXT, text: 'Again' },
          ],
        },
      },
      time: time(1),
    },
  ] as HistoryItem[];
}

async function mountedChat() {
  const config = createBaseConfig();
  config.messaging = { ...config.messaging, skipWelcome: true };
  const { instance } = await renderChatAndGetInstanceWithStore(config);
  await act(async () => {
    await instance.messaging.insertHistory(history());
  });
  return instance;
}

/** Sends one chunk of text into the streamed item `streamID`. */
function chunk(
  instance: ChatInstance,
  streamID: string,
  text: string,
  complete = false
) {
  const item = {
    response_type: MessageResponseTypes.TEXT,
    text,
    streaming_metadata: { id: streamID },
  };
  return act(async () => {
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: RESPONSE_ID },
      ...(complete ? { complete_item: item } : { partial_item: item }),
    });
  });
}

/** The streamed items of the live response, in `messages`, by stream ID. */
function liveItems(state: PublicChatState): Map<string, GenericItem> {
  const live = state.messages.find(
    ({ id }) => id === RESPONSE_ID
  ) as MessageResponse;
  return new Map(
    live.output.generic.map((item) => [item.streaming_metadata?.id, item])
  );
}

function entryOf(state: PublicChatState, streamID: string) {
  return state.messageItems.find(
    ({ id }) => id === `${RESPONSE_ID}:s:${streamID}`
  );
}

/** Streams three items, so each later chunk changes one of three. */
async function streamThreeItems(instance: ChatInstance) {
  await chunk(instance, 'a', 'A');
  await chunk(instance, 'b', 'B');
  await chunk(instance, 'c', 'C');
}

describe('streaming copies', () => {
  beforeEach(setupBeforeEach);
  afterEach(() => {
    vi.restoreAllMocks();
    setupAfterEach();
  });

  it('copies and freezes one item for one chunk, shared by messages and messageItems', async () => {
    const instance = await mountedChat();
    await streamThreeItems(instance);
    await chunk(instance, 'b', ' more');

    const freeze = vi.spyOn(objectUtils, 'deepFreezeCopy');
    const freezeAll = vi.spyOn(objectUtils, 'deepFreeze');
    await chunk(instance, 'b', ' and more');
    const state = instance.state.get();
    const changed = liveItems(state).get('b');

    // The mounted list read both fields during the chunk; reading them again copies nothing.
    expect(freeze).toHaveBeenCalledTimes(1);
    expect(freezeAll).not.toHaveBeenCalled();
    expect(freeze.mock.calls[0][0]).toBe(changed);
    expect(changed).toMatchObject({ text: 'B more and more' });
    expect(Object.isFrozen(changed)).toBe(true);
    expect(entryOf(state, 'b').item).toBe(changed);
  });
});
