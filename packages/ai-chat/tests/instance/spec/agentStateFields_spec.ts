/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Public state publishes the agent fields the prebuilt chat shows, and whether a restart is
 * running. Each case drives an SDK chat with no view through a mock service desk.
 */

import { createChatSDK } from '../../../src/sdk';
import { chatOf } from '../../../src/sdk/internal';
import type { ChatSDKHandle } from '../../../src/sdk/handle';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import type { ChatSDKConfig } from '../../../src/types/config/ChatSDKConfig';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import {
  FileStatusValue,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import {
  BusEventType,
  type BusEventPreReset,
} from '../../../src/types/events/eventBusTypes';
import type { PersistedHumanAgentState } from '../../../src/types/state/PersistedHumanAgentState';
import {
  MessageResponseTypes,
  UserType,
} from '../../../src/types/messaging/Messages';

const AGENT = { id: 'dana', nickname: 'Dana', user_type: UserType.HUMAN };

function mockDesk() {
  let callback: ServiceDeskCallback;
  const desk = {
    getName: () => 'Test desk',
    startChat: jest.fn(async () => {}),
    endChat: jest.fn(async () => {}),
    sendMessageToAgent: jest.fn(async () => {}),
    reconnect: jest.fn(async () => true),
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

describe('public agent and restart state', () => {
  const chats: ChatSDKHandle[] = [];
  afterEach(() => {
    chats.splice(0).forEach((chat) => chat.destroy());
  });

  async function sdkChat(
    config: ChatSDKConfig = {},
    mock = mockDesk()
  ): Promise<{ chat: ChatSDKHandle } & ReturnType<typeof mockDesk>> {
    const chat = await createChatSDK({
      messaging: { skipWelcome: true },
      serviceDeskFactory: mock.factory,
      ...config,
    });
    chats.push(chat);
    return { chat, ...mock };
  }

  async function connectedChat() {
    const created = await sdkChat();
    await created.chat.serviceDesk.startConversation();
    await created.callback().agentJoined(AGENT);
    return created;
  }

  it('starts every new agent field at its resting value', async () => {
    const { chat } = await sdkChat();
    const state = chat.state.get();
    expect(state.humanAgent).toMatchObject({
      isReconnecting: false,
      isTyping: false,
      isUploadingFile: false,
    });
    expect(state.humanAgent.availability).toBeNull();
    expect(state.isRestarting).toBe(false);
  });

  it('publishes the wait for an agent while the chat connects', async () => {
    const { chat, callback } = await sdkChat();
    await chat.serviceDesk.startConversation();
    await callback().updateAgentAvailability({ positionInQueue: 3 });
    expect(chat.state.get().humanAgent.availability).toEqual({
      positionInQueue: 3,
    });
  });

  it('publishes typing, and keeps the agent state reference when nothing in it changed', async () => {
    const { chat, callback } = await connectedChat();
    await callback().agentTyping(true);
    const typing = chat.state.get().humanAgent;
    expect(typing.isTyping).toBe(true);

    await chat.messaging.upsertMessage('reply', MessageState.COMPLETE, () => ({
      id: 'reply',
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Hi' }],
      },
    }));
    expect(chat.state.get().humanAgent).toBe(typing);

    await callback().agentTyping(false);
    expect(chat.state.get().humanAgent.isTyping).toBe(false);
  });

  it('publishes a file upload to the agent until the desk reports it done', async () => {
    const { chat, callback } = await connectedChat();
    const upload = {
      id: 'file-1',
      file: new File(['x'], 'notes.txt'),
      status: FileStatusValue.COMPLETE,
    };
    await chatOf(chat).humanAgentService.sendMessageToAgent('', [upload]);
    expect(chat.state.get().humanAgent.isUploadingFile).toBe(true);

    await callback().setFileUploadStatus('file-1');
    expect(chat.state.get().humanAgent.isUploadingFile).toBe(false);
  });

  it('publishes a reconnect to a saved agent chat until the desk answers', async () => {
    const mock = mockDesk();
    const releaseReconnect = resolvablePromise<boolean>();
    mock.desk.reconnect.mockImplementation(() => releaseReconnect);
    const initialState: PersistedHumanAgentState = {
      isConnected: true,
      isSuspended: false,
      responseUserProfile: AGENT,
      responseUserProfiles: {},
    };
    const { chat } = await sdkChat({ humanAgentState: { initialState } }, mock);
    expect(mock.desk.reconnect).toHaveBeenCalledTimes(1);
    expect(chat.state.get().humanAgent.isReconnecting).toBe(true);

    releaseReconnect.doResolve(true);
    await releaseReconnect;
    await new Promise((resolve) => setTimeout(resolve));
    expect(chat.state.get().humanAgent.isReconnecting).toBe(false);
    expect(chat.state.get().humanAgent.isConnected).toBe(true);
  });

  it('publishes isRestarting while a restart runs, and notifies select', async () => {
    const { chat, desk } = await connectedChat();
    const endEntered = resolvablePromise<void>();
    const releaseEnd = resolvablePromise<void>();
    desk.endChat.mockImplementation(async () => {
      endEntered.doResolve();
      await releaseEnd;
    });
    const seen: boolean[] = [];
    chat.state.select(
      (state) => state.isRestarting,
      (isRestarting) => {
        seen.push(isRestarting);
      }
    );

    const restarting = chat.messaging.restartConversation();
    await endEntered;
    expect(chat.state.get().isRestarting).toBe(true);
    releaseEnd.doResolve();
    await restarting;

    expect(chat.state.get().isRestarting).toBe(false);
    expect(seen).toEqual([true, false]);
  });

  it('keeps isRestarting false when a handler cancels the restart', async () => {
    const { chat } = await sdkChat();
    const seen: boolean[] = [];
    chat.state.select(
      (state) => state.isRestarting,
      (isRestarting) => {
        seen.push(isRestarting);
      }
    );
    chat.on({
      type: BusEventType.PRE_RESTART_CONVERSATION,
      handler: (event: BusEventPreReset) => {
        event.cancel = true;
      },
    });

    await chat.messaging.restartConversation();

    expect(chat.state.get().isRestarting).toBe(false);
    expect(seen).toEqual([]);
  });
});
