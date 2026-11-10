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
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import type { ChatSDKServiceDeskConfig } from '../../../src/types/config/ChatSDKServiceDeskConfig';
import {
  ScreenShareState,
  type ServiceDesk,
  type ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import type { ChatSDKState } from '../../../src/types/instance/ChatSDKState';
import {
  HumanAgentMessageType,
  UserType,
} from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

type Hook = NonNullable<ChatSDKServiceDeskConfig['onScreenShareRequest']>;

const { SHARING_REQUESTED, SHARING_ACCEPTED, SHARING_DECLINED, SHARING_ENDED } =
  HumanAgentMessageType;
const SHARING_CANCELLED = HumanAgentMessageType.SHARING_CANCELLED;

function mockDesk() {
  let callback: ServiceDeskCallback;
  const desk = {
    getName: () => 'Test desk',
    startChat: jest.fn(async () => {}),
    endChat: jest.fn(async () => {}),
    sendMessageToAgent: jest.fn(async () => {}),
    screenShareStop: jest.fn(async () => {}),
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

const AGENT = { id: 'dana', nickname: 'Dana', user_type: UserType.HUMAN };

/** The agent status notes in the conversation, oldest first. */
function agentNotes(state: ChatSDKState) {
  return state.messages.flatMap((message) =>
    'output' in message
      ? message.output.generic
          .map((item) => item.agent_message_type)
          .filter(Boolean)
      : []
  );
}

/** Lets the chat finish the awaits behind a request or an answer. */
async function settle() {
  for (let i = 0; i < 5; i += 1) {
    await new Promise((resolve) => setTimeout(resolve));
  }
}

describe('screen-share consent', () => {
  const chats: ChatSDKHandle[] = [];
  afterEach(() => {
    chats.splice(0).forEach((chat) => chat.destroy());
    jest.restoreAllMocks();
  });

  /** An SDK chat, with no view, connected to an agent. */
  async function connectedChat(onScreenShareRequest?: Hook) {
    const mock = mockDesk();
    const chat = await createChatSDK({
      messaging: { skipWelcome: true },
      serviceDeskFactory: mock.factory,
      serviceDesk: { onScreenShareRequest },
    });
    chats.push(chat);
    await chat.serviceDesk.startConversation();
    await mock.callback().agentJoined(AGENT);
    return { chat, ...mock };
  }

  function hookAnswering() {
    const answer = resolvablePromise<ScreenShareState>();
    const signals: AbortSignal[] = [];
    const hook = jest.fn<Promise<ScreenShareState>, [{ signal: AbortSignal }]>(
      ({ signal }) => {
        signals.push(signal);
        return answer;
      }
    );
    return { hook, answer, signals };
  }

  it('answers DECLINED when a chat with no view has no hook', async () => {
    const { chat, callback } = await connectedChat();

    await expect(callback().screenShareRequest()).resolves.toBe(
      ScreenShareState.DECLINED
    );
    const state = chat.state.get();
    expect(state.humanAgent.isScreenSharing).toBe(false);
    expect(agentNotes(state)).toEqual(
      expect.arrayContaining([SHARING_REQUESTED, SHARING_DECLINED])
    );
    expect(
      chatOf(chat).store.getState().humanAgentState.showScreenShareRequest
    ).toBe(false);
  });

  it.each([
    [ScreenShareState.ACCEPTED, SHARING_ACCEPTED, true],
    [ScreenShareState.DECLINED, SHARING_DECLINED, false],
    [ScreenShareState.CANCELLED, SHARING_CANCELLED, false],
  ])(
    'passes the hook answer %s to the desk',
    async (response, note, isSharing) => {
      const { hook, answer, signals } = hookAnswering();
      const { chat, callback } = await connectedChat(hook);

      const request = callback().screenShareRequest();
      await settle();
      expect(hook).toHaveBeenCalledTimes(1);
      expect(signals[0].aborted).toBe(false);
      answer.doResolve(response);

      await expect(request).resolves.toBe(response);
      await settle();
      const state = chat.state.get();
      expect(state.humanAgent.isScreenSharing).toBe(isSharing);
      expect(agentNotes(state).slice(-2)).toEqual([SHARING_REQUESTED, note]);
      // An answer is not an abort.
      expect(signals[0].aborted).toBe(false);
    }
  );

  it('calls the hook once for a second request while one waits', async () => {
    const { hook, answer } = hookAnswering();
    const { callback } = await connectedChat(hook);

    const first = callback().screenShareRequest();
    const second = callback().screenShareRequest();
    await settle();
    answer.doResolve(ScreenShareState.ACCEPTED);

    await expect(Promise.all([first, second])).resolves.toEqual([
      ScreenShareState.ACCEPTED,
      ScreenShareState.ACCEPTED,
    ]);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  describe('aborts the signal and ignores a late answer', () => {
    it('when the desk ends the request', async () => {
      const { hook, answer, signals } = hookAnswering();
      const { chat, callback } = await connectedChat(hook);
      const request = callback().screenShareRequest();
      await settle();

      await callback().screenShareEnded();

      expect(signals[0].aborted).toBe(true);
      await expect(request).resolves.toBe(ScreenShareState.CANCELLED);
      answer.doResolve(ScreenShareState.ACCEPTED);
      await settle();
      const state = chat.state.get();
      expect(state.humanAgent.isScreenSharing).toBe(false);
      expect(agentNotes(state)).not.toContain(SHARING_ACCEPTED);
      expect(agentNotes(state).slice(-1)[0]).toBe(SHARING_CANCELLED);
    });

    it('when the agent conversation ends', async () => {
      const { hook, answer, signals } = hookAnswering();
      const { chat, callback } = await connectedChat(hook);
      const request = callback().screenShareRequest();
      await settle();

      await chat.serviceDesk.endConversation();

      expect(signals[0].aborted).toBe(true);
      await expect(request).resolves.toBe(ScreenShareState.CANCELLED);
      answer.doResolve(ScreenShareState.ACCEPTED);
      await settle();
      expect(chat.state.get().humanAgent.isScreenSharing).toBe(false);
      expect(agentNotes(chat.state.get())).not.toContain(SHARING_ACCEPTED);
    });

    it('when the chat is removed, without logging the rejection that follows', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      error.mockClear();
      const signals: AbortSignal[] = [];
      const hook: Hook = ({ signal }) => {
        signals.push(signal);
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        });
      };
      const { chat, callback } = await connectedChat(hook);
      const request = callback().screenShareRequest();
      await settle();

      chat.destroy();

      expect(signals[0].aborted).toBe(true);
      await expect(request).resolves.toBe(ScreenShareState.CANCELLED);
      await settle();
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe('answers DECLINED with one console error', () => {
    it.each<[string, Hook]>([
      [
        'a hook that throws',
        () => {
          throw new Error('no dialog');
        },
      ],
      ['a hook that rejects', async () => Promise.reject(new Error('no'))],
      ['a hook that resolves ENDED', async () => ScreenShareState.ENDED],
      [
        'a hook that resolves another value',
        async () => 'yes' as unknown as ScreenShareState,
      ],
    ])('for %s', async (_case, hook) => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      error.mockClear();
      const { chat, callback } = await connectedChat(hook);

      await expect(callback().screenShareRequest()).resolves.toBe(
        ScreenShareState.DECLINED
      );
      await settle();
      expect(error).toHaveBeenCalledTimes(1);
      expect(String(error.mock.calls[0][0])).toContain(
        'serviceDesk.onScreenShareRequest'
      );
      expect(chat.state.get().humanAgent.isScreenSharing).toBe(false);
      expect(agentNotes(chat.state.get()).slice(-1)[0]).toBe(SHARING_DECLINED);
    });
  });
});

describe('isScreenSharing and stopScreenShare', () => {
  const chats: ChatSDKHandle[] = [];
  afterEach(() => {
    chats.splice(0).forEach((chat) => chat.destroy());
  });

  async function sharingChat() {
    const mock = mockDesk();
    const chat = await createChatSDK({
      messaging: { skipWelcome: true },
      serviceDeskFactory: mock.factory,
      serviceDesk: {
        onScreenShareRequest: async () => ScreenShareState.ACCEPTED,
      },
    });
    chats.push(chat);
    await chat.serviceDesk.startConversation();
    await mock.callback().agentJoined(AGENT);
    expect(chat.state.get().humanAgent.isScreenSharing).toBe(false);
    await mock.callback().screenShareRequest();
    await settle();
    expect(chat.state.get().humanAgent.isScreenSharing).toBe(true);
    return { chat, ...mock };
  }

  it('stays true from an accepted request until stopScreenShare ends the share', async () => {
    const { chat, desk } = await sharingChat();
    const changes: boolean[] = [];
    chat.state.select(
      (state) => state.humanAgent.isScreenSharing,
      (value) => changes.push(value)
    );

    await chat.serviceDesk.stopScreenShare();

    expect(desk.screenShareStop).toHaveBeenCalledTimes(1);
    expect(chat.state.get().humanAgent.isScreenSharing).toBe(false);
    expect(changes).toEqual([false]);
    expect(agentNotes(chat.state.get()).slice(-1)[0]).toBe(SHARING_ENDED);
  });

  it('clears when the desk ends the share', async () => {
    const { chat, callback } = await sharingChat();

    await callback().screenShareEnded();

    expect(chat.state.get().humanAgent.isScreenSharing).toBe(false);
    expect(agentNotes(chat.state.get()).slice(-1)[0]).toBe(SHARING_ENDED);
  });

  it('clears when the agent conversation ends', async () => {
    const { chat } = await sharingChat();

    await chat.serviceDesk.endConversation();

    expect(chat.state.get().humanAgent.isScreenSharing).toBe(false);
  });

  it('does nothing when no share is running', async () => {
    const { chat, desk } = await sharingChat();
    await chat.serviceDesk.stopScreenShare();
    const before = chat.state.get();

    await chat.serviceDesk.stopScreenShare();

    expect(desk.screenShareStop).toHaveBeenCalledTimes(1);
    expect(chat.state.get()).toBe(before);
  });

  it('does nothing on a removed chat', async () => {
    const { chat, desk } = await sharingChat();
    chat.destroy();

    await expect(chat.serviceDesk.stopScreenShare()).resolves.toBeUndefined();
    expect(desk.screenShareStop).not.toHaveBeenCalled();
  });

  it('keeps the humanAgent object while nothing in it changes', async () => {
    const { chat } = await sharingChat();
    const before = chat.state.get().humanAgent;

    await chat.messaging.insertHistory([]);

    expect(chat.state.get().humanAgent).toBe(before);
  });
});

describe('screen-share consent in the prebuilt chat', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  async function connectedPrebuilt(onScreenShareRequest?: Hook) {
    const mock = mockDesk();
    const rendered = await renderChatAndGetInstanceWithStore({
      ...createBaseConfig(),
      serviceDeskFactory: mock.factory,
      serviceDesk: { onScreenShareRequest },
    });
    await rendered.instance.serviceDesk.startConversation();
    await mock.callback().agentJoined(AGENT);
    return { ...rendered, ...mock };
  }

  it('shows its consent modal when no hook is set', async () => {
    const { store, callback, serviceManager } = await connectedPrebuilt();

    const request = callback().screenShareRequest();
    await settle();

    expect(store.getState().humanAgentState.showScreenShareRequest).toBe(true);
    // The modal's buttons answer through this.
    await serviceManager.humanAgentService.screenShareUpdateRequestState(
      ScreenShareState.ACCEPTED
    );
    await expect(request).resolves.toBe(ScreenShareState.ACCEPTED);
  });

  it('calls the hook instead of showing the modal', async () => {
    const hook = jest.fn<Promise<ScreenShareState>, [{ signal: AbortSignal }]>(
      async () => ScreenShareState.ACCEPTED
    );
    const { store, instance, callback } = await connectedPrebuilt(hook);

    await expect(callback().screenShareRequest()).resolves.toBe(
      ScreenShareState.ACCEPTED
    );

    expect(hook).toHaveBeenCalledTimes(1);
    expect(store.getState().humanAgentState.showScreenShareRequest).toBe(false);
    expect(instance.state.get().humanAgent.isScreenSharing).toBe(true);
  });
});
