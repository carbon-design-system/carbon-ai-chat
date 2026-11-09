/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  bootPrebuiltChat,
  mergePublicConfig,
} from '../../../src/chat/utils/chatBoot';
import { createChatSDK } from '../../../src/sdk';
import { chatOf } from '../../../src/sdk/internal';
import * as applyConfigModule from '../../../src/shared/services/applyConfig';
import { createServiceManager } from '../../../src/shared/services/loadServices';
import { DEFAULT_THEME_STATE } from '../../../src/shared/store/reducerUtils';
import type { ChatSDKConfig } from '../../../src/types/config/ChatSDKConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import { UserType } from '../../../src/types/messaging/Messages';
import { waitFor } from '@testing-library/react';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { ConversationConfig } from '../../../src/types/state/ConversationState';

const DEFAULT_TIMEOUT_MS = 150 * 1000;

const chats: Array<{ destroy(): void }> = [];
async function chat(config: ChatSDKConfig) {
  const handle = await createChatSDK(config);
  chats.push(handle);
  return handle;
}
afterEach(() => {
  chats.splice(0).forEach((handle) => handle.destroy());
});

describe('updateConfig (#1833 O1–O3)', () => {
  it('replaces the config; omitted fields return to their defaults', async () => {
    const handle = await chat({
      namespace: 'support',
      isReadonly: true,
      messaging: { skipWelcome: true, messageTimeoutSecs: 5 },
    });
    const manager = chatOf(handle);
    expect(manager.messageCoordinator.timeoutMS).toBe(5000);

    const applied = handle.updateConfig({ messaging: { skipWelcome: true } });
    expect(applied).toBeInstanceOf(Promise);
    await expect(applied).resolves.toBeUndefined();

    expect(manager.store.getState().config.public).toEqual({
      messaging: { skipWelcome: true },
      serviceDesk: {},
    });
    expect(manager.store.getState().config.public.isReadonly).toBeUndefined();
    expect(manager.namespace.originalName).toBeUndefined();
    expect(manager.messageCoordinator.timeoutMS).toBe(DEFAULT_TIMEOUT_MS);
  });

  it('goes through the shared update path, and is applied when it resolves', async () => {
    const handle = await chat({ messaging: { skipWelcome: true } });
    const apply = jest.spyOn(applyConfigModule, 'applyConversationConfig');
    try {
      await handle.updateConfig({
        messaging: { skipWelcome: true, messageTimeoutSecs: 0 },
      });
      expect(apply).toHaveBeenCalledTimes(1);
      expect(apply.mock.calls[0][0]).toBe(chatOf(handle));
      // `0` turns the timeout off, as it does at boot.
      expect(chatOf(handle).messageCoordinator.timeoutMS).toBe(0);
    } finally {
      apply.mockRestore();
    }
  });

  it('keeps unchanged sub-objects by reference (O9)', async () => {
    const handle = await chat({
      messaging: { skipWelcome: true },
      serviceDesk: { allowReconnect: false },
    });
    const { store } = chatOf(handle);
    const before = store.getState().config.public;
    await handle.updateConfig({
      messaging: { skipWelcome: true },
      serviceDesk: { allowReconnect: true },
    });
    const after = store.getState().config.public;
    expect(after.messaging).toBe(before.messaging);
    expect(after.serviceDesk).not.toBe(before.serviceDesk);

    const unchanged = store.getState().config;
    await handle.updateConfig({
      messaging: { skipWelcome: true },
      serviceDesk: { allowReconnect: true },
    });
    expect(store.getState().config).toBe(unchanged);
  });
});

describe('copies of the caller config (#1833 O6–O8)', () => {
  it('copies at boot and on update, keeping functions by reference', async () => {
    const customSendMessage = jest.fn();
    const config = {
      messaging: { skipWelcome: true, customSendMessage },
      serviceDesk: { allowReconnect: false },
    };
    const handle = await chat(config);
    const { store } = chatOf(handle);
    config.serviceDesk.allowReconnect = true;
    config.messaging.skipWelcome = false;
    expect(store.getState().config.public.serviceDesk.allowReconnect).toBe(
      false
    );
    expect(store.getState().config.public.messaging.skipWelcome).toBe(true);
    expect(store.getState().config.public.messaging.customSendMessage).toBe(
      customSendMessage
    );

    const next = { messaging: { skipWelcome: true, messageTimeoutSecs: 9 } };
    await handle.updateConfig(next);
    next.messaging.messageTimeoutSecs = 1;
    expect(store.getState().config.public.messaging.messageTimeoutSecs).toBe(9);
  });

  it('copies when a store is created directly', () => {
    const publicConfig: ConversationConfig = {
      messaging: { skipWelcome: true },
      serviceDesk: {},
      namespace: 'direct',
    };
    const manager = createServiceManager(
      {
        public: publicConfig,
        derived: { themeWithDefaults: DEFAULT_THEME_STATE },
      },
      { sessionStorage: false }
    );
    publicConfig.messaging.skipWelcome = false;
    publicConfig.namespace = 'changed';
    expect(manager.store.getState().config.public.messaging.skipWelcome).toBe(
      true
    );
    expect(manager.store.getState().config.public.namespace).toBe('direct');
    void manager.shutdown();
  });

  it('copies the prebuilt chat config at boot', async () => {
    const onError = jest.fn();
    const config: PublicConfig = {
      onError,
      header: { title: 'Before' },
      messaging: { skipWelcome: true },
    };
    const { serviceManager } = await bootPrebuiltChat({
      publicConfig: mergePublicConfig(config),
    });
    config.header.title = 'After';
    const stored = serviceManager.store.getState().config
      .public as PublicConfig;
    expect(stored.header.title).toBe('Before');
    expect(stored.onError).toBe(onError);
    await serviceManager.shutdown();
  });
});

describe('a new desk factory waits for the agent chat (#2353 O3, O6)', () => {
  function mockFactory(name: string, desks: string[]) {
    const created: Array<{
      endChat: jest.Mock;
      callback: ServiceDeskCallback;
    }> = [];
    const factory = async (parameters: { callback: ServiceDeskCallback }) => {
      desks.push(name);
      const desk = {
        getName: () => name,
        startChat: jest.fn(async () => {}),
        endChat: jest.fn(async () => {}),
        sendMessageToAgent: jest.fn(async () => {}),
      };
      created.push({ endChat: desk.endChat, callback: parameters.callback });
      return desk as unknown as ServiceDesk;
    };
    return { factory, created };
  }

  it('keeps the live chat on its desk until endConversation, then switches', async () => {
    const desks: string[] = [];
    const first = mockFactory('first', desks);
    const second = mockFactory('second', desks);
    const handle = await chat({
      messaging: { skipWelcome: true },
      serviceDeskFactory: first.factory,
    });
    expect(desks).toEqual(['first']);
    const manager = chatOf(handle);
    (manager.humanAgentService as any).chatStarted = true;
    await first.created[0].callback.agentJoined({
      id: 'dana',
      nickname: 'Dana',
      user_type: UserType.HUMAN,
    });
    expect(handle.state.get().humanAgent.isConnected).toBe(true);

    await handle.updateConfig({
      messaging: { skipWelcome: true },
      serviceDeskFactory: second.factory,
    });
    expect(desks).toEqual(['first']);
    expect(first.created[0].endChat).not.toHaveBeenCalled();
    expect(handle.state.get().humanAgent.isConnected).toBe(true);

    await handle.serviceDesk.endConversation();
    expect(first.created[0].endChat).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(desks).toEqual(['first', 'second']));
  });
});
