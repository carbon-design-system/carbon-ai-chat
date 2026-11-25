/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `state.error`: every failure that sets `status: 'error'` sets it, with the same fields
 * `onError` gets, and it clears with `status`.
 */

import { OnErrorType } from '../../../types/config/ErrorConfig';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import {
  createBaseConfig,
  bootChat,
  shutdownBootedChats,
  setupAfterEach,
  setupBeforeEach,
} from '../helpers/chat';

function requestIDs(instance: ChatInstance) {
  return instance.state
    .get()
    .messages.filter((message) => 'input' in message)
    .map((message) => message.id);
}

describe('state.error', () => {
  beforeEach(setupBeforeEach);
  afterEach(async () => {
    await shutdownBootedChats();
    setupAfterEach();
  });

  it('holds a failed send with its request ID, and the next send clears it', async () => {
    const onError = vi.fn();
    const customSendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(undefined);
    const { instance } = await bootChat({
      ...createBaseConfig(),
      onError,
      messaging: { skipWelcome: true, customSendMessage },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toBeDefined();
    const [requestID] = requestIDs(instance);
    expect(instance.state.get().error).toEqual({
      errorType: OnErrorType.MESSAGE_COMMUNICATION,
      message: 'An error occurred sending a message',
      otherData: expect.any(String),
      messageID: requestID,
    });
    expect(instance.state.get().error).toEqual(onError.mock.calls[0][0]);

    const statuses: string[] = [];
    const errors: unknown[] = [];
    const stop = instance.state.subscribe(() => {
      statuses.push(instance.state.get().status);
      errors.push(instance.state.get().error);
    });
    await instance.send('second');
    stop();
    // The error clears in the same publication that leaves 'error'.
    expect(errors[statuses.findIndex((status) => status !== 'error')]).toBe(
      null
    );
    expect(instance.state.get().error).toBeNull();
  });

  it('clears on restart', async () => {
    const { instance } = await bootChat({
      ...createBaseConfig(),
      messaging: {
        skipWelcome: true,
        customSendMessage: vi.fn().mockRejectedValue(new Error('down')),
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(instance.send('first')).rejects.toBeDefined();
    expect(instance.state.get().error).not.toBeNull();

    await instance.messaging.restartConversation();

    expect(instance.state.get().status).toBe('ready');
    expect(instance.state.get().error).toBeNull();
  });
});
