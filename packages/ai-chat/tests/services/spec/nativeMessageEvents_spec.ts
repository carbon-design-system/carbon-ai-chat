/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  prepareReasoningMessageEvent,
  retainNativeMessageOrigin,
  snapshotNativeMessageEvent,
} from '../../../src/chat/services/messaging/nativeMessageEvents';
import { synthesizeReasoningLocalMessageItem } from '../../../src/chat/utils/reasoningContent';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

function fixture() {
  const item = {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { value: 'before' },
  };
  const message: MessageResponse = {
    id: 'reasoning',
    output: { generic: [] },
    message_options: { reasoning: { content: [item] } },
  };
  return {
    message,
    localItem: synthesizeReasoningLocalMessageItem(
      item,
      message.id,
      'reasoning-intro-0'
    ),
  };
}

it('copies and freezes one graph while preserving cycles and aliases', () => {
  const source = fixture();
  source.localItem.item.user_defined.self = source.localItem.item;
  const event = snapshotNativeMessageEvent(source);
  expect(event.localItem.item).toBe(
    event.message.message_options.reasoning.content[0]
  );
  expect(event.localItem.item.user_defined.self).toBe(event.localItem.item);
  expect(event.localItem.item).not.toBe(source.localItem.item);
  expect(() => {
    event.localItem.item.user_defined.value = 'after';
  }).toThrow(TypeError);
  expect(Object.isFrozen(source.localItem.item)).toBe(false);
});

it('owns function properties without freezing or replacing the caller function', () => {
  const shared = { value: 'before' };
  const callback = Object.assign(
    function (this: { offset: number }, value: number) {
      return this.offset + value;
    },
    { shared }
  );
  const event = snapshotNativeMessageEvent({ callback, shared });
  expect(event.callback).not.toBe(callback);
  expect(event.callback.shared).toBe(event.shared);
  expect(event.callback.call({ offset: 2 }, 3)).toBe(5);
  expect(() => {
    event.callback.shared.value = 'after';
  }).toThrow(TypeError);
  expect(Object.isFrozen(callback)).toBe(false);
  expect(Object.isFrozen(shared)).toBe(false);
});

it('owns collection keys and values while retaining collection methods', () => {
  const key = { value: 'before' };
  const map = new Map([[key, key]]);
  const set = new Set([key]);
  const event = snapshotNativeMessageEvent({ key, map, set });
  expect(event.map.get(event.key)).toBe(event.key);
  expect(event.set.has(event.key)).toBe(true);
  expect(event.map.has(key)).toBe(false);
  event.map.clear();
  event.set.clear();
  expect(map.get(key)).toBe(key);
  expect(set.has(key)).toBe(true);
  expect(Object.isFrozen(key)).toBe(false);
});

it('recognizes the content pair on a retained message rather than its ID', () => {
  const native = fixture();
  retainNativeMessageOrigin(native.message);
  const retained = { ...native.message, history: { timestamp: 1 } };
  expect(
    Object.isFrozen(
      prepareReasoningMessageEvent(retained, native.localItem).message
    )
  ).toBe(true);
  const legacy: MessageResponse = {
    ...native.message,
    message_options: { reasoning: { content: [] } },
  };
  expect(prepareReasoningMessageEvent(legacy, native.localItem).message).toBe(
    legacy
  );
  const replacement = fixture();
  expect(
    prepareReasoningMessageEvent(replacement.message, replacement.localItem)
      .message
  ).toBe(replacement.message);
  expect(
    Object.isFrozen(
      prepareReasoningMessageEvent(native.message, native.localItem).message
    )
  ).toBe(true);
});

it('tracks native messages without options without claiming a later options merge', () => {
  const native = fixture();
  delete native.message.message_options;
  retainNativeMessageOrigin(native.message);
  expect(
    Object.isFrozen(
      prepareReasoningMessageEvent(native.message, native.localItem).message
    )
  ).toBe(true);
  const legacy = { ...native.message, message_options: {} };
  expect(prepareReasoningMessageEvent(legacy, native.localItem).message).toBe(
    legacy
  );
});

it('copies special values and shared buffers without freezing the caller', () => {
  const date = new Date(1000);
  const bytes = new Uint8Array([1, 2, 3]);
  const view = new DataView(bytes.buffer);
  const event = snapshotNativeMessageEvent({
    date,
    bytes,
    view,
    buffer: bytes.buffer,
  });
  expect(event.bytes.buffer).toBe(event.buffer);
  expect(event.view.buffer).toBe(event.buffer);
  event.date.setTime(2000);
  event.bytes[0] = 9;
  event.view.setUint8(1, 8);
  expect(date.getTime()).toBe(1000);
  expect(Array.from(bytes)).toEqual([1, 2, 3]);
  expect(Array.from(event.bytes)).toEqual([9, 8, 3]);
  expect(Object.isFrozen(event)).toBe(true);
  expect(Object.isFrozen(date)).toBe(false);
});

it('preserves sparse arrays and freezes their owned entries', () => {
  const sparse = new Array(4);
  sparse[1] = { value: 'before' };
  const event = snapshotNativeMessageEvent(sparse);
  expect(event).toHaveLength(4);
  expect(0 in event).toBe(false);
  expect(3 in event).toBe(false);
  expect(event[1]).not.toBe(sparse[1]);
  expect(Object.isFrozen(event[1])).toBe(true);
  expect(Object.isFrozen(event)).toBe(true);
});

it('preserves an alias from a shared buffer back to its view', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const buffer = bytes.buffer as ArrayBuffer & { owner?: Uint8Array };
  buffer.owner = bytes;
  const event = snapshotNativeMessageEvent({ bytes, buffer });
  expect(event.bytes.buffer).toBe(event.buffer);
  expect(event.buffer.owner).toBe(event.bytes);
  expect(event.buffer).not.toBe(buffer);
  event.bytes[0] = 9;
  expect(bytes[0]).toBe(1);
});
