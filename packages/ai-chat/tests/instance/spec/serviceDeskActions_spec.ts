/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createChatSDK } from '../../../src/sdk';
import { chatOf } from '../../../src/sdk/internal';
import type { ChatSDKHandle } from '../../../src/sdk/handle';
import { selectHumanAgentDisplayState } from '../../../src/shared/store/selectors';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
  StartChatOptions,
} from '../../../src/types/config/ServiceDeskConfig';
import type { ChatSDKConfig } from '../../../src/types/config/ChatSDKConfig';
import {
  BusEventType,
  type BusEventHumanAgentPreStartChat,
} from '../../../src/types/events/eventBusTypes';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import {
  MessageResponseTypes,
  UserType,
  type ConnectToHumanAgentItem,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const CONNECT_ID = 'connect-response';

function mockDesk() {
  let callback: ServiceDeskCallback;
  const desk = {
    getName: () => 'Test desk',
    startChat: jest.fn(
      async (_message: MessageResponse, _options: StartChatOptions) => {}
    ),
    endChat: jest.fn(async () => {}),
    sendMessageToAgent: jest.fn(async () => {}),
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
  chat.on([
    {
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: () => events.push('pre:startChat'),
    },
    {
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      handler: () => events.push('endChat'),
    },
  ]);
  return { chat, events, ...mock };
}

function connectResponse(): MessageResponse {
  return {
    id: CONNECT_ID,
    // Pinned, so the two chats in the parity case get identical messages.
    history: { timestamp: 1 },
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'Let me find someone.',
        },
        {
          response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
          transfer_info: { additional_data: { queue: 'billing' } },
        },
      ],
    },
  };
}

async function addResponse(chat: ChatSDKHandle, response: MessageResponse) {
  await chat.messaging.upsertMessage(
    response.id,
    MessageState.COMPLETE,
    () => response
  );
}

/** The connect item the card for `messageID` draws, as the card receives it. */
function connectItem(chat: ChatSDKHandle, messageID = CONNECT_ID) {
  const state = chatOf(chat).store.getState();
  return state.assistantMessageState.localMessageIDs
    .map((id) => state.allMessageItemsByID[id])
    .find(
      (item) =>
        item.fullMessageID === messageID &&
        item.item.response_type === MessageResponseTypes.CONNECT_TO_HUMAN_AGENT
    ) as LocalMessageItem<ConnectToHumanAgentItem>;
}

function internalAgentState(chat: ChatSDKHandle) {
  return chatOf(chat).store.getState().humanAgentState;
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

  it('starts the same chat as the matching connect card', async () => {
    const card = await track(sdkChat());
    const code = await track(sdkChat());
    await addResponse(card.chat, connectResponse());
    await addResponse(code.chat, connectResponse());

    // The card's button calls exactly this (RealConnectToHumanAgent).
    const cardItem = connectItem(card.chat);
    await chatOf(card.chat).humanAgentService.startChat(
      cardItem,
      chatOf(card.chat).store.getState().allMessagesByID[CONNECT_ID]
    );
    await code.chat.serviceDesk.startConversation({ messageID: CONNECT_ID });

    expect(code.desk.startChat).toHaveBeenCalledTimes(1);
    expect(code.desk.startChat.mock.calls).toEqual(
      card.desk.startChat.mock.calls
    );
    expect(code.desk.startChat.mock.calls[0][0]).toMatchObject({
      id: CONNECT_ID,
    });
    expect(code.events).toEqual(card.events);
    expect(code.events).toEqual(['pre:startChat']);
    expect(code.chat.state.get().humanAgent).toEqual(
      card.chat.state.get().humanAgent
    );
    expect(code.chat.state.get().humanAgent.isConnecting).toBe(true);
    expect(internalAgentState(card.chat).activeLocalMessageID).toBe(
      cardItem.ui_state.id
    );
    expect(internalAgentState(code.chat).activeLocalMessageID).toBe(
      connectItem(code.chat).ui_state.id
    );
  });

  it('with no options, starts from a response that never joins the conversation', async () => {
    const { chat, desk, events } = await track(sdkChat());
    const before = chat.state.get().messages;

    await chat.serviceDesk.startConversation();

    expect(desk.startChat).toHaveBeenCalledTimes(1);
    const [message, options] = desk.startChat.mock.calls[0];
    expect(message.output.generic).toEqual([
      { response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT },
    ]);
    expect(typeof message.id).toBe('string');
    expect(options).toEqual({ preStartChatPayload: undefined });
    expect(events).toEqual(['pre:startChat']);
    expect(chat.state.get().messages).toBe(before);
    expect(chatOf(chat).store.getState().allMessagesByID[message.id]).toBe(
      undefined
    );
    expect(chat.state.get().humanAgent.isConnecting).toBe(true);
    expect(internalAgentState(chat).activeLocalMessageID).toBe(null);
  });

  it('hands the payload to the service desk through the pre-start event', async () => {
    const { chat, desk } = await track(sdkChat());
    const seen: unknown[] = [];
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: (event: BusEventHumanAgentPreStartChat) => {
        seen.push(event.preStartChatPayload);
      },
    });

    await chat.serviceDesk.startConversation({ payload: { topic: 'billing' } });

    expect(seen).toEqual([{ topic: 'billing' }]);
    expect(desk.startChat).toHaveBeenCalledWith(expect.anything(), {
      preStartChatPayload: { topic: 'billing' },
    });
  });

  it('lets a pre-start handler replace the payload', async () => {
    const { chat, desk } = await track(sdkChat());
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: (event: BusEventHumanAgentPreStartChat) => {
        event.preStartChatPayload = { topic: 'replaced' };
      },
    });

    await chat.serviceDesk.startConversation({ payload: { topic: 'billing' } });

    expect(desk.startChat).toHaveBeenCalledWith(expect.anything(), {
      preStartChatPayload: { topic: 'replaced' },
    });
  });

  it('resolves without starting when a pre-start handler cancels', async () => {
    const { chat, desk, events } = await track(sdkChat());
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: async (event: BusEventHumanAgentPreStartChat) => {
        await Promise.resolve();
        event.cancelStartChat = true;
      },
    });

    await expect(chat.serviceDesk.startConversation()).resolves.toBeUndefined();

    expect(desk.startChat).not.toHaveBeenCalled();
    expect(events).toEqual(['pre:startChat', 'endChat']);
    expect(chat.state.get().humanAgent.isConnecting).toBe(false);
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

    it.each([
      ['an unknown ID', 'no-such-message', false],
      ['a response with no connect_to_agent item', 'text-response', true],
    ])('for %s', async (_case, messageID, addText) => {
      const { chat, desk, events } = await track(sdkChat());
      if (addText) {
        await addResponse(chat, {
          id: 'text-response',
          output: {
            generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Hi' }],
          },
        });
      }

      await expect(
        chat.serviceDesk.startConversation({ messageID })
      ).rejects.toThrow(
        `No response with a connect_to_agent item has the ID "${messageID}"`
      );
      expect(desk.startChat).not.toHaveBeenCalled();
      expect(events).toEqual([]);
    });

    it('for a request ID', async () => {
      const { chat, desk } = await track(
        sdkChat({
          messaging: { skipWelcome: true, customSendMessage: async () => {} },
        })
      );
      await chat.messaging.send({ id: 'request-1', input: { text: 'Hi' } });

      await expect(
        chat.serviceDesk.startConversation({ messageID: 'request-1' })
      ).rejects.toThrow('No response with a connect_to_agent item');
      expect(desk.startChat).not.toHaveBeenCalled();
    });

    it('while an agent chat is connecting or connected', async () => {
      const { chat, desk, callback } = await track(sdkChat());
      await chat.serviceDesk.startConversation();

      await expect(chat.serviceDesk.startConversation()).rejects.toThrow(
        'A chat is already running'
      );

      await callback().agentJoined({
        id: 'dana',
        nickname: 'Dana',
        user_type: UserType.HUMAN,
      });
      expect(chat.state.get().humanAgent.isConnected).toBe(true);
      await expect(chat.serviceDesk.startConversation()).rejects.toThrow(
        'A chat is already running'
      );
      expect(desk.startChat).toHaveBeenCalledTimes(1);
    });

    it('when the service desk fails to start the chat', async () => {
      const { chat, desk } = await track(sdkChat());
      desk.startChat.mockRejectedValueOnce(new Error('desk is down'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(chat.serviceDesk.startConversation()).rejects.toThrow(
        'desk is down'
      );
      expect(chat.state.get().humanAgent.isConnecting).toBe(false);
    });

    it('after the chat was removed', async () => {
      const { chat, desk } = await track(sdkChat());
      chat.destroy();

      await expect(chat.serviceDesk.startConversation()).rejects.toThrow(
        'The chat was removed from the page'
      );
      expect(desk.startChat).not.toHaveBeenCalled();
    });
  });

  it('ends a suspended conversation first, as the card does after its confirmation', async () => {
    const { chat, desk, callback } = await track(sdkChat());
    await chat.serviceDesk.startConversation();
    await callback().agentJoined({
      id: 'dana',
      nickname: 'Dana',
      user_type: UserType.HUMAN,
    });
    await chat.serviceDesk.updateIsSuspended(true);

    await chat.serviceDesk.startConversation();

    expect(desk.endChat).toHaveBeenCalledTimes(1);
    expect(desk.startChat).toHaveBeenCalledTimes(2);
    expect(chat.state.get().humanAgent).toMatchObject({
      isConnected: false,
      isSuspended: false,
      isConnecting: true,
    });
  });

  it('keeps the automatic start for skipConnectHumanAgentCard', async () => {
    const mock = mockDesk();
    const desk = {
      ...mock.desk,
      areAnyAgentsOnline: jest.fn(async () => true),
    };
    const chat = await createChatSDK({
      messaging: { skipWelcome: true },
      serviceDesk: { skipConnectHumanAgentCard: true },
      serviceDeskFactory: async () => desk as unknown as ServiceDesk,
    } as ChatSDKConfig);
    chats.push(chat);

    await addResponse(chat, connectResponse());
    await new Promise((resolve) => setTimeout(resolve));

    expect(desk.startChat).toHaveBeenCalledTimes(1);
    expect(desk.startChat.mock.calls[0]).toEqual([
      expect.objectContaining({ id: CONNECT_ID }),
      { preStartChatPayload: undefined },
    ]);
    expect(internalAgentState(chat).activeLocalMessageID).toBe(
      connectItem(chat).ui_state.id
    );
  });
});

describe('serviceDesk.startConversation in the prebuilt chat', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('loads the chat first, then shows the connecting state with no card', async () => {
    const { desk, factory } = mockDesk();
    const { instance, store } = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      serviceDeskFactory: factory,
    });
    expect(store.getState().isHydrated).toBe(false);

    await instance.serviceDesk.startConversation();

    expect(store.getState().isHydrated).toBe(true);
    expect(desk.startChat).toHaveBeenCalledTimes(1);
    const state = store.getState();
    expect(state.humanAgentState.activeLocalMessageID).toBe(null);
    // The banner draws its connecting state from this, with no card in the list.
    expect(selectHumanAgentDisplayState(state).isConnectingOrConnected).toBe(
      true
    );
    expect(instance.state.get().humanAgent.isConnecting).toBe(true);
  });
});
