/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createChatSDK } from '..';
import type { ChatSDKHandle } from '../handle';
import type {
  ServiceDesk,
  ServiceDeskCallback,
  StartChatOptions,
} from '../../types/config/ServiceDeskConfig';
import type { ChatSDKConfig } from '../../types/config/ChatSDKConfig';
import {
  BusEventType,
  type BusEventHumanAgentPreStartChat,
} from '../../types/events/eventBusTypes';
import { type MessageResponse } from '../../types/messaging/Messages';

function mockDesk() {
  let callback: ServiceDeskCallback;
  const desk = {
    getName: () => 'Test desk',
    startChat: vi.fn(
      async (_message: MessageResponse, _options: StartChatOptions) => {}
    ),
    endChat: vi.fn(async () => {}),
    sendMessageToAgent: vi.fn(async () => {}),
  };
  return {
    desk,
    callback: () => callback,
    factory: async (parameters: { callback: ServiceDeskCallback }) => {
      callback = parameters.callback;
      return desk as unknown as ServiceDesk;
    },
  };
}

async function sdkChat(config: ChatSDKConfig = {}) {
  const mock = mockDesk();
  const chat = await createChatSDK({
    messaging: { skipWelcome: true },
    serviceDeskFactory: mock.factory,
    ...config,
  });
  const events: string[] = [];
  const preStartKeys: string[][] = [];
  chat.on([
    {
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: (event: BusEventHumanAgentPreStartChat) => {
        events.push('pre:startChat');
        preStartKeys.push(Object.keys(event).sort());
      },
    },
    {
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      handler: () => events.push('endChat'),
    },
  ]);
  return { chat, events, preStartKeys, ...mock };
}

describe('serviceDesk.startConversation', () => {
  const chats: ChatSDKHandle[] = [];
  async function track<T extends { chat: ChatSDKHandle }>(created: Promise<T>) {
    const result = await created;
    chats.push(result.chat);
    return result;
  }
  afterEach(() => {
    chats.splice(0).forEach((chat) => chat.destroy());
  });

  describe('rejects', () => {
    it('when no service desk is configured, before any event', async () => {
      const chat = await createChatSDK({ messaging: { skipWelcome: true } });
      chats.push(chat);
      const events: string[] = [];
      chat.on({
        type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
        handler: () => events.push('pre:startChat'),
      });

      await expect(chat.serviceDesk.startConversation()).rejects.toThrow(
        "There's no serviceDeskFactory in the config"
      );
      expect(events).toEqual([]);
    });

    it('when the service desk fails to start the chat', async () => {
      const { chat, desk } = await track(sdkChat());
      desk.startChat.mockRejectedValueOnce(new Error('desk is down'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(chat.serviceDesk.startConversation()).rejects.toThrow(
        'desk is down'
      );
      expect(chat.state.get().humanAgent.isConnecting).toBe(false);
    });
  });
});
