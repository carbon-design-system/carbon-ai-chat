/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstance,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';
import {
  BusEventPreSend,
  BusEventType,
} from '../../../src/types/events/eventBusTypes';
import {
  MessageInputType,
  MessageRequest,
} from '../../../src/types/messaging/Messages';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it('sends an event with typed arrays inside already-frozen structured data', async () => {
  const customSendMessage = jest.fn(
    async (_message: MessageRequest): Promise<void> => undefined
  );
  const instance = await renderChatAndGetInstance({
    ...createBaseConfig(),
    messaging: { skipWelcome: true, customSendMessage },
  });
  const bytes = new Uint8Array([1, 2]);
  const structuredData = Object.freeze({ user_defined: { bytes } });
  const request = {
    input: {
      message_type: MessageInputType.EVENT,
      event: { name: 'control' },
      structured_data: structuredData,
    },
  };
  const preSend = jest.fn();
  instance.on({ type: BusEventType.PRE_SEND, handler: preSend });

  await expect(instance.send(request)).resolves.toBeUndefined();

  expect(preSend).not.toHaveBeenCalled();
  expect(customSendMessage).toHaveBeenCalledTimes(1);
  const transported = customSendMessage.mock.calls[0][0];
  expect(transported.input).toMatchObject({
    message_type: MessageInputType.EVENT,
    event: { name: 'control' },
  });
  const transportedBytes = transported.input.structured_data.user_defined.bytes;
  expect(transportedBytes).toBeInstanceOf(Uint8Array);
  expect(Array.from(transportedBytes)).toEqual([1, 2]);
  expect(transportedBytes).not.toBe(bytes);
  transportedBytes[0] = 9;
  expect(Array.from(bytes)).toEqual([1, 2]);
  expect(request.input.structured_data).toBe(structuredData);
  expect(Object.isFrozen(request.input)).toBe(true);
  expect(Object.isFrozen(bytes)).toBe(false);
});

it('allows pre-send to normalize typed arrays from already-frozen structured data', async () => {
  const customSendMessage = jest.fn(
    async (_message: MessageRequest): Promise<void> => undefined
  );
  const instance = await renderChatAndGetInstance({
    ...createBaseConfig(),
    messaging: { skipWelcome: true, customSendMessage },
  });
  const bytes = new Uint8Array([3, 4]);
  const structuredData = Object.freeze({ user_defined: { bytes } });
  const request = {
    input: { text: 'normalize', structured_data: structuredData },
  };
  const preSend = jest.fn((event: BusEventPreSend) => {
    const data = event.data.input.structured_data;
    expect(Array.from(data.user_defined.bytes)).toEqual([3, 4]);
    data.user_defined = { values: Array.from(data.user_defined.bytes) };
  });
  instance.on({ type: BusEventType.PRE_SEND, handler: preSend });

  await expect(instance.send(request)).resolves.toBeUndefined();

  expect(preSend).toHaveBeenCalledTimes(1);
  expect(customSendMessage).toHaveBeenCalledTimes(1);
  const transported = customSendMessage.mock.calls[0][0];
  expect(transported.input.structured_data).toEqual({
    user_defined: { values: [3, 4] },
  });
  expect(request.input.structured_data).toBe(structuredData);
  expect(structuredData.user_defined.bytes).toBe(bytes);
  expect(Array.from(bytes)).toEqual([3, 4]);
  expect(Object.isFrozen(request.input)).toBe(true);
  expect(Object.isFrozen(bytes)).toBe(false);
});
