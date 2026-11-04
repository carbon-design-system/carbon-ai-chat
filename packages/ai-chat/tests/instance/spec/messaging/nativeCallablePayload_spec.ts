/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageState } from '../../../../src/types/config/MessagingConfig';
import { MessageResponseTypes } from '../../../../src/types/messaging/Messages';
import type { MessageResponse } from '../../../../src/types/messaging/Messages';
import {
  BusEventType,
  type BusEventReceive,
  type BusEventUserDefinedResponse,
} from '../../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it('delivers a constructable class in a native response event without running it during preparation', async () => {
  const { instance } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  let constructions = 0;
  class Widget {
    constructor(public label: string) {
      constructions++;
    }
    render() {
      return this.label;
    }
  }
  const source = Object.assign(Widget, { settings: { value: 'before' } });
  let delivered: typeof source;
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      delivered = event.data.message.user_defined.Widget as typeof source;
    },
  });
  await instance.messaging.upsertMessage(
    'callable',
    MessageState.COMPLETE,
    () => ({
      id: 'callable',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { Widget: source },
          },
        ],
      },
    })
  );
  expect(constructions).toBe(0);
  expect(delivered).not.toBe(source);
  const item = new delivered('host view');
  expect(item.render()).toBe('host view');
  expect(item).toBeInstanceOf(source);
  expect(item).toBeInstanceOf(delivered);
  expect(delivered.settings).not.toBe(source.settings);
  expect(() => {
    delivered.settings.value = 'changed';
  }).toThrow(TypeError);
  expect(source.settings.value).toBe('before');
});

it('keeps accepted opaque APIs in native callbacks with the approved shared-reference limit', async () => {
  const { instance, serviceManager } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const key = {};
  const lookup = new WeakMap([[key, 'before']]);
  const members = new WeakSet([key]);
  const pending = Promise.resolve('ready');
  const failure = new Error('host value');
  const payload = { lookup, members, pending, failure };
  let delivered: typeof payload;
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      delivered = event.data.message.user_defined as typeof payload;
    },
  });
  await instance.messaging.upsertMessage(
    'opaque',
    MessageState.COMPLETE,
    () => ({
      id: 'opaque',
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: payload,
          },
        ],
      },
    })
  );
  expect(delivered.lookup).toBe(lookup);
  expect(delivered.members.has(key)).toBe(true);
  expect(delivered.pending).toBe(pending);
  await expect(delivered.pending).resolves.toBe('ready');
  expect(delivered.failure).toBe(failure);
  delivered.lookup.set(key, 'after');
  expect(lookup.get(key)).toBe('after');
  const stored = serviceManager.store.getState().allMessagesByID
    .opaque as import('../../../../src/types/messaging/Messages').MessageResponse;
  expect(
    (
      stored.output.generic[0].user_defined.lookup as WeakMap<object, string>
    ).get(key)
  ).toBe('after');
});

it('delivers accepted boxed strings to response and receive callbacks', async () => {
  const { instance } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const label = Object.assign(Object('host label'), {
    metadata: { value: 'before' },
  });
  const delivered: (typeof label)[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      delivered.push(event.data.message.user_defined.label);
    },
  });
  instance.on({
    type: BusEventType.RECEIVE,
    handler: (event: BusEventReceive) => {
      delivered.push(event.data.output.generic[0].user_defined.label);
    },
  });
  await instance.messaging.upsertMessage(
    'boxed',
    MessageState.COMPLETE,
    () => ({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { label },
          },
        ],
      },
    })
  );
  expect(delivered).toHaveLength(2);
  for (const copy of delivered) {
    expect(copy).not.toBe(label);
    expect(copy.valueOf()).toBe('host label');
    expect(copy[0]).toBe('h');
    expect(Object.isFrozen(copy.metadata)).toBe(true);
  }
  expect(Object.isFrozen(label.metadata)).toBe(false);
});

it('isolates shared-buffer bytes in response and receive snapshots', async () => {
  const { instance, store } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const buffer = new SharedArrayBuffer(4);
  const bytes = new Uint8Array(buffer);
  bytes.set([1, 2, 3, 4]);
  const source = { buffer, bytes, view: new DataView(buffer, 1, 2) };
  const delivered: (typeof source)[] = [];
  instance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: (event: BusEventUserDefinedResponse) => {
      delivered.push(event.data.message.user_defined as typeof source);
    },
  });
  instance.on({
    type: BusEventType.RECEIVE,
    handler: (event: BusEventReceive) => {
      delivered.push(
        event.data.output.generic[0].user_defined as typeof source
      );
    },
  });
  await instance.messaging.upsertMessage(
    'shared',
    MessageState.COMPLETE,
    () => ({
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: source,
          },
        ],
      },
    })
  );
  expect(delivered).toHaveLength(2);
  for (const copy of delivered) {
    expect(copy.buffer).not.toBe(buffer);
    expect(copy.bytes.buffer).toBe(copy.buffer);
    expect(copy.view.buffer).toBe(copy.buffer);
    copy.bytes[0] = 9;
    copy.view.setUint8(0, 8);
  }
  expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  const stored = store.getState().allMessagesByID.shared as MessageResponse;
  expect(
    Array.from(stored.output.generic[0].user_defined.bytes as Uint8Array)
  ).toEqual([1, 2, 3, 4]);
});
