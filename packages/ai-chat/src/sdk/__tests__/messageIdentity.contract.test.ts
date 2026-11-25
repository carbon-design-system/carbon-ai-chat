/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createChatSDK, type ChatSDKHandle, type ChatSDKState } from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import {
  MessageResponseTypes,
  type MessageResponse,
  type TextItem,
} from '../../types/messaging/Messages';

const FIXED_TIMESTAMP = 1700000000000;
const handles = new Set<ChatSDKHandle>();
let namespaceSequence = 0;

async function createSDK(): Promise<ChatSDKHandle> {
  const handle = await createChatSDK({
    namespace: `sdk-identity-${(++namespaceSequence).toString(36)}`,
    messaging: { skipWelcome: true },
  });
  handles.add(handle);
  return handle;
}

afterEach(() => {
  // destroy starts shutdown; its void return supplies no shutdown barrier.
  for (const handle of handles) {
    handle.destroy();
  }
  handles.clear();
});

function response(
  id: string,
  parts: readonly (readonly [string, string])[]
): MessageResponse {
  return {
    id,
    history: { timestamp: FIXED_TIMESTAMP },
    output: {
      generic: parts.map(([itemID, text]): TextItem => ({
        response_type: MessageResponseTypes.TEXT,
        text,
        streaming_metadata: { id: itemID },
      })),
    },
  };
}

function itemRows(state: ChatSDKState) {
  return state.messageItems!.map(({ id, messageID, item, status, origin }) => [
    id,
    messageID,
    (item as TextItem).text,
    status,
    origin,
  ]);
}

function messageRows(state: ChatSDKState) {
  return state.messages.map((message) => [
    message.id,
    'output' in message
      ? (message.output?.generic ?? []).map((item) => (item as TextItem).text)
      : [],
  ]);
}

describe('SDK public message identity', () => {
  it('keeps an unchanged public item when its sibling changes', async () => {
    const handle = await createSDK();
    await handle.messaging.upsertMessage('m1', MessageState.COMPLETE, () =>
      response('m1', [
        ['a', 'alpha'],
        ['b', 'beta'],
      ])
    );
    const before = handle.state.get();

    await handle.messaging.upsertMessage('m1', MessageState.COMPLETE, () =>
      response('m1', [
        ['a', 'alpha'],
        ['b', 'BETA-2'],
      ])
    );
    const after = handle.state.get();

    expect(messageRows(after)).toEqual([['m1', ['alpha', 'BETA-2']]]);
    expect(itemRows(after)).toEqual([
      ['m1:s:a', 'm1', 'alpha', 'complete', 'live'],
      ['m1:s:b', 'm1', 'BETA-2', 'complete', 'live'],
    ]);
    expect(after).not.toBe(before);
    expect(after.messages[0]).not.toBe(before.messages[0]);
    expect(after.messageItems![0]).toBe(before.messageItems![0]);
    expect(after.messageItems![0].item).toBe(before.messageItems![0].item);
    expect(after.messageItems![1]).not.toBe(before.messageItems![1]);
    expect(after.messageItems![1].item).not.toBe(before.messageItems![1].item);
    expect(itemRows(before)).toEqual([
      ['m1:s:a', 'm1', 'alpha', 'complete', 'live'],
      ['m1:s:b', 'm1', 'beta', 'complete', 'live'],
    ]);
  });

  it('keeps unrelated public messages and items when the middle message changes', async () => {
    const handle = await createSDK();
    for (const [id, itemPrefix] of [
      ['m1', '1'],
      ['m2', '2'],
      ['m3', '3'],
    ]) {
      await handle.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
        response(id, [
          [`${itemPrefix}a`, `${id}-a`],
          [`${itemPrefix}b`, `${id}-b`],
        ])
      );
    }
    const before = handle.state.get();

    await handle.messaging.upsertMessage('m2', MessageState.COMPLETE, () =>
      response('m2', [
        ['2a', 'm2-a'],
        ['2b', 'm2-B!'],
      ])
    );
    const after = handle.state.get();

    expect(messageRows(after)).toEqual([
      ['m1', ['m1-a', 'm1-b']],
      ['m2', ['m2-a', 'm2-B!']],
      ['m3', ['m3-a', 'm3-b']],
    ]);
    expect(itemRows(after)).toEqual([
      ['m1:s:1a', 'm1', 'm1-a', 'complete', 'live'],
      ['m1:s:1b', 'm1', 'm1-b', 'complete', 'live'],
      ['m2:s:2a', 'm2', 'm2-a', 'complete', 'live'],
      ['m2:s:2b', 'm2', 'm2-B!', 'complete', 'live'],
      ['m3:s:3a', 'm3', 'm3-a', 'complete', 'live'],
      ['m3:s:3b', 'm3', 'm3-b', 'complete', 'live'],
    ]);
    for (const index of [0, 1, 4, 5]) {
      expect(after.messageItems![index]).toBe(before.messageItems![index]);
    }
    for (const index of [0, 2]) {
      expect(after.messages[index]).toBe(before.messages[index]);
    }
    expect(after).not.toBe(before);
    expect(after.messages[1]).not.toBe(before.messages[1]);
    expect(after.messageItems![3]).not.toBe(before.messageItems![3]);
    expect(after.messageItems![3].item).not.toBe(before.messageItems![3].item);
    expect(messageRows(before)).toEqual([
      ['m1', ['m1-a', 'm1-b']],
      ['m2', ['m2-a', 'm2-b']],
      ['m3', ['m3-a', 'm3-b']],
    ]);
  });

  it('keeps the public snapshot for an identical complete upsert with fixed metadata', async () => {
    const handle = await createSDK();
    await handle.messaging.upsertMessage('m1', MessageState.COMPLETE, () =>
      response('m1', [['a', 'alpha']])
    );
    const before = handle.state.get();

    await handle.messaging.upsertMessage('m1', MessageState.COMPLETE, () =>
      response('m1', [['a', 'alpha']])
    );
    const after = handle.state.get();

    expect(before.messages[0].history?.timestamp).toBe(FIXED_TIMESTAMP);
    expect(messageRows(after)).toEqual([['m1', ['alpha']]]);
    expect(itemRows(after)).toEqual([
      ['m1:s:a', 'm1', 'alpha', 'complete', 'live'],
    ]);
    expect(after).toEqual(before);
    expect(after).toBe(before);
    expect(after.messages[0]).toBe(before.messages[0]);
    expect(after.messageItems).toBe(before.messageItems);
    expect(after.messageItems![0]).toBe(before.messageItems![0]);
  });
});
