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
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';
import {
  BusEventPreSend,
  BusEventType,
} from '../../../src/types/events/eventBusTypes';
import type { MessageInput } from '../../../src/types/messaging/Messages';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it('freezes owned nested local input at admission and after accepted pre-send edits', async () => {
  const { instance, store } = await renderChatAndGetInstanceWithStore({
    ...createBaseConfig(),
    messaging: { skipWelcome: true, customSendMessage: async () => undefined },
  });
  const request = {
    id: 'owned-input',
    input: {
      text: 'original',
      structured_data: { user_defined: { nested: { value: 1 } } },
    },
  };
  const localInput = () =>
    Object.values(store.getState().allMessageItemsByID).find(
      (item) => item.fullMessageID === request.id
    ).item as MessageInput;
  let admitted: MessageInput;
  let accepted: MessageInput;
  let preSendInput: MessageInput;
  const preSend = jest.fn((event: BusEventPreSend) => {
    admitted = localInput();
    preSendInput = event.data.input;
    event.data.input.structured_data.user_defined.nested.value = 2;
  });
  const send = jest.fn(() => {
    accepted = localInput();
  });
  instance.on([
    { type: BusEventType.PRE_SEND, handler: preSend },
    { type: BusEventType.SEND, handler: send },
  ]);

  await instance.send(request);

  expect(preSend).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledTimes(1);
  for (const item of [admitted, accepted]) {
    expect(Object.isFrozen(item)).toBe(false);
    expect(Object.isFrozen(item.structured_data)).toBe(true);
    expect(Object.isFrozen(item.structured_data.user_defined.nested)).toBe(
      true
    );
    expect(item.structured_data).not.toBe(request.input.structured_data);
    item.text = 'local top level stays writable';
    expect(item.text).toBe('local top level stays writable');
  }
  expect(accepted.structured_data).not.toBe(preSendInput.structured_data);
  expect(admitted.structured_data.user_defined.nested.value).toBe(1);
  expect(accepted.structured_data.user_defined.nested.value).toBe(2);
  expect(request.input.structured_data.user_defined.nested.value).toBe(1);
  expect(Object.isFrozen(request.input.structured_data)).toBe(true);
});
