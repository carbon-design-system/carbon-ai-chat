/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { bootPrebuiltChat, mergePublicConfig } from '../../chat/utils/chatBoot';
import { createChatSDK, type ChatSDKHandle } from '..';
import { chatRegistry } from '../createChatSDK';
import type { ServiceManager } from '../services/ServiceManager';
import type { ChatSDKConfig } from '../../types/config/ChatSDKConfig';
import { MessageState } from '../../types/config/MessagingConfig';
import type { ChatSDKInstance } from '../../types/instance/ChatSDKInstance';
import {
  type MessageRequest,
  MessageResponseTypes,
} from '../../types/messaging/Messages';

/** Replies to every request through `upsertMessage`, as a host would. */
async function echo(
  request: MessageRequest,
  _options: unknown,
  instance: ChatSDKInstance
) {
  const id = `reply-${request.id}`;
  await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () => ({
    id,
    request_id: request.id,
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text: 'ok' }],
    },
  }));
}

const handles: ChatSDKHandle[] = [];

/** Creates a chat through the SDK entry, destroyed after the test. */
async function create(config: ChatSDKConfig = {}) {
  const handle = await createChatSDK({
    messaging: { skipWelcome: true, customSendMessage: echo },
    ...config,
  });
  handles.push(handle);
  return handle;
}

afterEach(() => {
  vi.useRealTimers();
  handles.splice(0).forEach((handle) => handle.destroy());
  vi.restoreAllMocks();
});

describe('reuse through the SDK entry (#2357)', () => {
  it('O5, O12: two chats with no namespace collide too', async () => {
    await create();
    await expect(create()).rejects.toThrow(
      'A chat with no namespace is already running'
    );
    // A namespace of its own starts.
    await expect(create({ namespace: 'other' })).resolves.toBeDefined();
  });
});

describe('which creates use the registry (#2357 constraint)', () => {
  it('the SDK entry claims; the prebuilt chat with reuse off doesn’t', async () => {
    const claim = vi.spyOn(chatRegistry, 'claim');
    const booted: ServiceManager[] = [];
    // Two on one namespace each run, as today.
    for (let i = 0; i < 2; i += 1) {
      const { serviceManager } = await bootPrebuiltChat({
        publicConfig: mergePublicConfig({ namespace: 'support' }),
      });
      booted.push(serviceManager);
    }
    expect(claim).not.toHaveBeenCalled();
    expect(booted[0]).not.toBe(booted[1]);

    await create({ namespace: 'support' });
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim.mock.calls[0][0]).toBe('support');
    await Promise.all(booted.map((manager) => manager.shutdown()));
  });
});
