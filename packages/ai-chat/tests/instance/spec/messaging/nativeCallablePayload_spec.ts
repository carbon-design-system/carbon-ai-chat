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
import {
  BusEventType,
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
