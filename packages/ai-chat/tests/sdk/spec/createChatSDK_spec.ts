/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createChatSDK } from '../../../src/sdk';
import { DEFAULT_SDK_CONFIG } from '../../../src/sdk/sdkAppConfig';
import { chatOf } from '../../../src/sdk/internal';
import { ServiceManager } from '../../../src/shared/services/ServiceManager';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import type { PersistedHumanAgentState } from '../../../src/types/state/PersistedHumanAgentState';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import type { ChatSDKInstance } from '../../../src/types/instance/ChatSDKInstance';
import type { HistoryItem } from '../../../src/types/messaging/History';
import {
  MessageResponseTypes,
  UserType,
  type MessageRequest,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';

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

  it('rejects when history fails, after reporting it and shutting down', async () => {
    const failure = new Error('history is down');
    const onError = jest.fn();
    const shutdown = jest.spyOn(ServiceManager.prototype, 'shutdown');
    try {
      await expect(
        createChatSDK({
          onError,
          messaging: {
            customLoadHistory: async () => {
              throw failure;
            },
          },
        })
      ).rejects.toBe(failure);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ otherData: failure })
      );
      expect(shutdown).toHaveBeenCalledTimes(1);
      await shutdown.mock.results[0].value;
      expect((shutdown.mock.contexts[0] as ServiceManager).isShutdown).toBe(
        true
      );
    } finally {
      shutdown.mockRestore();
    }
  });
});

describe('storage (#1732 O4, O7)', () => {
  it('reads and writes no storage or cookies while it boots, sends, and restarts', async () => {
    const storageCalls = (
      ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const
    ).map((method) => jest.spyOn(Storage.prototype, method));
    const storageGetters = (['sessionStorage', 'localStorage'] as const).map(
      (name) => jest.spyOn(window, name, 'get')
    );
    const cookieGet = jest.spyOn(Document.prototype, 'cookie', 'get');
    const cookieSet = jest.spyOn(Document.prototype, 'cookie', 'set');
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
    jest.resetModules();
    const spies = (['getItem', 'setItem', 'removeItem'] as const).map(
      (method) => jest.spyOn(Storage.prototype, method)
    );
    try {
      const sdk = await import('../../../src/sdk');
      const chat = await sdk.createChatSDK({
        messaging: { skipWelcome: true },
      });
      chat.destroy();
      spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it('starts fresh with no saved state, no session store, and no page elements', async () => {
    const chat = await createChatSDK({ messaging: { skipWelcome: true } });
    const manager = chatOf(chat);
    expect(manager.userSessionStorageService).toBeUndefined();
    expect('writeableElements' in manager).toBe(false);
    expect(chat.state.get().messages).toEqual([]);
    expect(chat.state.get().humanAgent.isConnected).toBe(false);
    chat.destroy();
  });
});

describe('human agent state (#1732 O5, O6)', () => {
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

  it('reports agent changes to onStateChange', async () => {
    const { callback, factory } = mockDesk();
    const onStateChange = jest.fn();
    const chat = await createChatSDK({
      messaging: { skipWelcome: true },
      serviceDeskFactory: factory,
      humanAgentState: { onStateChange },
    });
    (chatOf(chat).humanAgentService as any).chatStarted = true;
    await callback().agentJoined({
      id: 'dana',
      nickname: 'Dana',
      user_type: UserType.HUMAN,
    });
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isConnected: true })
    );
    await chat.serviceDesk.endConversation();
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isConnected: false })
    );
    chat.destroy();
  });
});

describe('config defaults (#1732 O8)', () => {
  it('inherits defaults field by field', async () => {
    const empty = await createChatSDK({ messaging: { skipWelcome: true } });
    expect(chatOf(empty).store.getState().config.public).toEqual({
      ...DEFAULT_SDK_CONFIG,
      messaging: { skipWelcome: true },
    });
    // A field left out gets the service's own default.
    expect(chatOf(empty).messageCoordinator.timeoutMS).toBe(150 * 1000);
    empty.destroy();

    const partial = await createChatSDK({
      messaging: { skipWelcome: true, messageTimeoutSecs: 5 },
      serviceDesk: { allowReconnect: false },
      namespace: 'support',
    });
    const manager = chatOf(partial);
    expect(manager.store.getState().config.public).toEqual({
      messaging: { skipWelcome: true, messageTimeoutSecs: 5 },
      serviceDesk: { allowReconnect: false },
      namespace: 'support',
    });
    expect(manager.messageCoordinator.timeoutMS).toBe(5000);
    expect(manager.namespace.originalName).toBe('support');
    partial.destroy();
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
        'clearError',
        'failTurn',
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

  it.each(['release', 'destroy'] as const)(
    '%s shuts the chat down once, and repeats do nothing',
    async (verb) => {
      const chat = await createChatSDK({ messaging: { skipWelcome: true } });
      const manager = chatOf(chat);
      const stop = jest.spyOn(manager as any, 'stopServices');
      chat[verb]();
      // Shutdown starts synchronously, so this is the verb's doing.
      expect(manager.isShutdown).toBe(true);
      expect(stop).toHaveBeenCalledTimes(1);
      chat[verb]();
      chat.release();
      chat.destroy();
      expect(stop).toHaveBeenCalledTimes(1);
    }
  );
});
