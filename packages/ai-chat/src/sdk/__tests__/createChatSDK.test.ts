/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createChatSDK } from '..';
import { MessageState } from '../../types/config/MessagingConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../types/config/ServiceDeskConfig';
import type { PersistedHumanAgentState } from '../../types/state/PersistedHumanAgentState';
import { BusEventType } from '../../types/events/eventBusTypes';
import type { ChatSDKInstance } from '../../types/instance/ChatSDKInstance';
import type { HistoryItem } from '../../types/messaging/History';
import {
  MessageResponseTypes,
  UserType,
  type MessageRequest,
  type MessageResponse,
} from '../../types/messaging/Messages';
import { resolvablePromise } from '../utils/resolvablePromise';

function textResponse(id: string, text: string): MessageResponse {
  return {
    id,
    output: { generic: [{ response_type: MessageResponseTypes.TEXT, text }] },
  };
}

/** Replies to every request through `upsertMessage`, as a host would. */
async function echo(
  request: MessageRequest,
  _options: unknown,
  instance: ChatSDKInstance
) {
  const response = {
    ...textResponse(`reply-${request.id}`, 'ok'),
    request_id: request.id,
  };
  await instance.messaging.upsertMessage(
    response.id,
    MessageState.COMPLETE,
    () => response
  );
}

function history(id: string, text: string): HistoryItem {
  return { message: textResponse(id, text), time: new Date().toISOString() };
}

describe('boot (#1732 O2, O3)', () => {
  it('resolves only once history has loaded', async () => {
    const loaded = resolvablePromise<HistoryItem[]>();
    let resolved = false;
    const booting = createChatSDK({
      messaging: { customLoadHistory: () => loaded },
    }).then((chat) => {
      resolved = true;
      return chat;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(resolved).toBe(false);

    loaded.doResolve([history('h1', 'Earlier')]);
    const chat = await booting;
    expect(chat.state.get().messages.map((message) => message.id)).toEqual([
      'h1',
    ]);
    expect(chat.state.get().status).toBe('ready');
    chat.destroy();
  });
});

describe('storage (#1732 O4, O7)', () => {
  it('reads and writes no storage or cookies while it boots, sends, and restarts', async () => {
    const storageCalls = (
      ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const
    ).map((method) => vi.spyOn(Storage.prototype, method));
    const storageGetters = (['sessionStorage', 'localStorage'] as const).map(
      (name) => vi.spyOn(window, name, 'get')
    );
    const cookieGet = vi.spyOn(Document.prototype, 'cookie', 'get');
    const cookieSet = vi.spyOn(Document.prototype, 'cookie', 'set');
    const spies = [...storageCalls, ...storageGetters, cookieGet, cookieSet];
    try {
      const chat = await createChatSDK({
        messaging: { customSendMessage: echo },
      });
      await chat.messaging.send('hello');
      await chat.messaging.restartConversation();
      expect(chat.state.get().messages.length).toBeGreaterThan(0);
      chat.destroy();
      spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it('touches no storage when its modules load', async () => {
    vi.resetModules();
    const spies = (['getItem', 'setItem', 'removeItem'] as const).map(
      (method) => vi.spyOn(Storage.prototype, method)
    );
    try {
      const sdk = await import('..');
      const chat = await sdk.createChatSDK({
        messaging: { skipWelcome: true },
      });
      chat.destroy();
      spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});

describe('human agent state (#1732 O5, O6)', () => {
  function mockDesk() {
    let callback: ServiceDeskCallback;
    const desk = {
      getName: () => 'Test desk',
      startChat: vi.fn(async () => {}),
      endChat: vi.fn(async () => {}),
      sendMessageToAgent: vi.fn(async () => {}),
      reconnect: vi.fn(async () => true),
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

  it('restores the agent connection from initialState', async () => {
    const { desk, factory } = mockDesk();
    const initialState: PersistedHumanAgentState = {
      isConnected: true,
      isSuspended: false,
      responseUserProfile: {
        id: 'dana',
        nickname: 'Dana',
        user_type: UserType.HUMAN,
      },
      responseUserProfiles: {},
      serviceDeskState: { ticket: 7 },
    };
    const chat = await createChatSDK({
      messaging: { skipWelcome: true },
      serviceDeskFactory: factory,
      humanAgentState: { initialState },
    });
    expect(desk.reconnect).toHaveBeenCalledTimes(1);
    expect(chat.state.get().humanAgent.isConnected).toBe(true);
    expect(chat.state.get().humanAgent.responseUserProfile?.id).toBe('dana');
    chat.destroy();
  });
});

describe('the handle (#1732 O9–O11)', () => {
  it('has the conversation members plus release and destroy; callbacks get neither', async () => {
    let callbackInstance: ChatSDKInstance;
    const chat = await createChatSDK({
      messaging: {
        customSendMessage: async (request, options, instance) => {
          callbackInstance = instance;
          await echo(request, options, instance);
        },
      },
    });
    expect(Object.keys(chat).sort()).toEqual(
      [
        'destroy',
        'messaging',
        'off',
        'on',
        'once',
        'release',
        'serviceDesk',
        'state',
        'updateConfig',
      ].sort()
    );
    expect(Object.keys(chat.messaging).sort()).toEqual(
      [
        'clearConversation',
        'insertHistory',
        'addFile',
        'clearError',
        'failTurn',
        'removeFile',
        'removeMessages',
        'restartConversation',
        'send',
        'stop',
        'upsertMessage',
      ].sort()
    );
    expect(callbackInstance).toBeDefined();
    expect(callbackInstance).not.toBe(chat);
    expect('release' in callbackInstance).toBe(false);
    expect('destroy' in callbackInstance).toBe(false);
    expect('updateConfig' in callbackInstance).toBe(false);
    const handler = {
      type: BusEventType.SEND as const,
      handler: (): void => undefined,
    };
    expect(chat.on(handler)).toBe(chat);
    expect(chat.off(handler)).toBe(chat);
    expect(callbackInstance.on(handler)).toBe(callbackInstance);
    callbackInstance.off(handler);
    chat.destroy();
  });
});
