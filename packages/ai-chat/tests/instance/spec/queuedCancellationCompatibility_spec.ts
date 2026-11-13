/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstance,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it('preserves rejection when a waiting ID getter removes a request during cancellation', async () => {
  let releaseFirst: () => void;
  const firstTransport = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const transport = jest
    .fn()
    .mockImplementationOnce(() => firstTransport)
    .mockResolvedValue(undefined);
  const instance = await renderChatAndGetInstance({
    ...createBaseConfig(),
    messaging: { skipWelcome: true, customSendMessage: transport },
  });
  let armed = false;
  let armedReads = 0;
  let nestedDestroy: Promise<void>;
  class WaitingRequest {
    input = { text: 'waiting' };

    get id() {
      if (armed && ++armedReads === 2) {
        armed = false;
        nestedDestroy = instance.destroySession(false);
        return 'changed-during-cancellation';
      }
      return 'waiting';
    }
  }
  const firstSend = instance.send({ id: 'first', input: { text: 'first' } });
  await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
  const waitingSend = instance.send(new WaitingRequest());
  const lastSend = instance.send({ id: 'last', input: { text: 'last' } });
  let settlements: PromiseSettledResult<void>[];
  try {
    await waitFor(() => {
      expect(
        instance.state.get().messages.map((message) => message.id)
      ).toEqual(expect.arrayContaining(['first', 'waiting', 'last']));
    });
    expect(transport).toHaveBeenCalledTimes(1);
    armed = true;
    const error = await instance.messaging.clearConversation().then(
      (): undefined => undefined,
      (rejection: unknown) => rejection
    );
    await nestedDestroy;
    expect(armedReads).toBe(2);
    expect(error).toBeInstanceOf(TypeError);
    expect(error).toHaveProperty(
      'message',
      "Cannot read properties of undefined (reading 'message')"
    );
  } finally {
    armed = false;
    releaseFirst();
    settlements = await Promise.allSettled([firstSend, waitingSend, lastSend]);
  }
  expect(settlements).toEqual([
    { status: 'fulfilled', value: undefined },
    { status: 'fulfilled', value: undefined },
    { status: 'fulfilled', value: undefined },
  ]);
});
