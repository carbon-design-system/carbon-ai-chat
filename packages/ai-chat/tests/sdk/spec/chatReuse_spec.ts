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
  bootPrebuiltChat,
  mergePublicConfig,
} from '../../../src/chat/utils/chatBoot';
import { createChatSDK, type ChatSDKHandle } from '../../../src/sdk';
import { chatRegistry } from '../../../src/sdk/createChatSDK';
import { chatOf } from '../../../src/sdk/handle';
import { DEFAULT_RELEASE_GRACE_MS } from '../../../src/sdk/registry';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import type { ChatSDKConfig } from '../../../src/types/config/ChatSDKConfig';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import type { ChatSDKInstance } from '../../../src/types/instance/ChatSDKInstance';
import {
  type MessageRequest,
  MessageResponseTypes,
  UserType,
} from '../../../src/types/messaging/Messages';

const DEFAULT_TIMEOUT_MS = 150 * 1000;

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

/** Lets a shutdown queued behind promise callbacks start, with timers fake. */
async function settle() {
  for (let i = 0; i < 20; i += 1) {
    await Promise.resolve();
  }
}

/** Real timers while chats boot; fake ones once a test starts releasing. */
function fakeTimers() {
  jest.useFakeTimers();
}

afterEach(() => {
  jest.useRealTimers();
  handles.splice(0).forEach((handle) => handle.destroy());
  jest.restoreAllMocks();
});

describe('reuse through the SDK entry (#2357)', () => {
  it('O3: a create inside the window resumes the conversation with a fresh handle', async () => {
    const first = await create({ namespace: 'support' });
    await first.messaging.send('Hello');
    const manager = chatOf(first);
    const transcript = first.state.get().messages;
    expect(transcript).toHaveLength(2);

    fakeTimers();
    first.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS - 1);
    const second = await create({ namespace: 'support' });

    expect(second).not.toBe(first);
    expect(chatOf(second)).toBe(manager);
    expect(second.state.get().messages).toEqual(transcript);

    // O4: the adoption cancelled the shutdown.
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS * 2);
    await settle();
    expect(manager.isShutdown).toBe(false);
  });

  it('O8, O9: the last release shuts the chat down after 3000 ms, and the next create starts fresh', async () => {
    const first = await create({ namespace: 'support' });
    await first.messaging.send('Hello');
    const manager = chatOf(first);

    fakeTimers();
    first.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS - 1);
    await settle();
    expect(manager.isShutdown).toBe(false);
    jest.advanceTimersByTime(1);
    await settle();
    expect(manager.isShutdown).toBe(true);

    jest.useRealTimers();
    const next = await create({ namespace: 'support' });
    expect(chatOf(next)).not.toBe(manager);
    expect(next.state.get().messages).toEqual([]);
  });

  it('O6, O12: a create during another chat’s boot rejects, naming the namespace', async () => {
    const booting = createChatSDK({
      namespace: 'support',
      messaging: { skipWelcome: true },
    });
    const colliding = createChatSDK({
      namespace: 'support',
      messaging: { skipWelcome: true },
    });
    await expect(colliding).rejects.toThrow(
      'A chat with the namespace "support" is already running, so this one didn\'t start. Give each chat its own namespace.'
    );
    handles.push(await booting);
    expect(chatOf(handles[0]).isShutdown).toBe(false);
  });

  it('O5, O12: two chats with no namespace collide too', async () => {
    await create();
    await expect(create()).rejects.toThrow(
      'A chat with no namespace is already running'
    );
    // A namespace of its own starts.
    await expect(create({ namespace: 'other' })).resolves.toBeDefined();
  });

  it('O15: adoption replaces the config; omitted fields return to their defaults', async () => {
    const first = await create({
      namespace: 'support',
      isReadonly: true,
      messaging: { skipWelcome: true, messageTimeoutSecs: 5 },
    });
    const manager = chatOf(first);
    expect(manager.messageCoordinator.timeoutMS).toBe(5000);

    first.release();
    const config: ChatSDKConfig = {
      namespace: 'support',
      messaging: { skipWelcome: true },
    };
    const adopting = createChatSDK(config);
    // Copied at the call, though adoption runs later: an edit made while it
    // waits changes nothing (#1833).
    config.isReadonly = true;
    const second = await adopting;
    handles.push(second);

    expect(chatOf(second)).toBe(manager);
    expect(manager.store.getState().config.public).toEqual({
      namespace: 'support',
      messaging: { skipWelcome: true },
      serviceDesk: {},
    });
    expect(manager.messageCoordinator.timeoutMS).toBe(DEFAULT_TIMEOUT_MS);
  });

  it('O16: a new desk factory waits for the live agent chat', async () => {
    const desks: string[] = [];
    const factory = (name: string) => {
      const callbacks: ServiceDeskCallback[] = [];
      const make = async (parameters: { callback: ServiceDeskCallback }) => {
        desks.push(name);
        callbacks.push(parameters.callback);
        return {
          getName: () => name,
          startChat: jest.fn(async () => {}),
          endChat: jest.fn(async () => {}),
          sendMessageToAgent: jest.fn(async () => {}),
        } as unknown as ServiceDesk;
      };
      return { make, callbacks };
    };
    const first = factory('first');
    const second = factory('second');
    const handle = await create({
      namespace: 'support',
      serviceDeskFactory: first.make,
    });
    const manager = chatOf(handle);
    (manager.humanAgentService as any).chatStarted = true;
    await first.callbacks[0].agentJoined({
      id: 'dana',
      nickname: 'Dana',
      user_type: UserType.HUMAN,
    });

    handle.release();
    const adopted = await create({
      namespace: 'support',
      serviceDeskFactory: second.make,
    });
    expect(desks).toEqual(['first']);
    expect(adopted.state.get().humanAgent.isConnected).toBe(true);

    await adopted.serviceDesk.endConversation();
    await waitFor(() => expect(desks).toEqual(['first', 'second']));
  });

  it('a released handle no longer configures the chat', async () => {
    const first = await create({ namespace: 'support', isReadonly: true });
    first.release();
    const second = await create({ namespace: 'support', isReadonly: true });
    await first.updateConfig({ namespace: 'support' });
    expect(chatOf(second).store.getState().config.public.isReadonly).toBe(true);
  });
});

describe('destroy through the SDK entry (#2358 O1, O4)', () => {
  it('frees the namespace: the next create starts a new chat', async () => {
    const first = await create({ namespace: 'support' });
    await first.messaging.send('Hello');
    const manager = chatOf(first);
    first.destroy();
    expect(manager.isShutdown).toBe(true);

    const next = await create({ namespace: 'support' });
    expect(chatOf(next)).not.toBe(manager);
    expect(next.state.get().messages).toEqual([]);
  });

  it('shuts the chat down even when a newer handle holds it', async () => {
    const first = await create({ namespace: 'support' });
    first.release();
    const second = await create({ namespace: 'support' });
    first.destroy();
    expect(chatOf(second).isShutdown).toBe(true);
    // Nothing adopts it: the next create starts a new chat.
    second.release();
    const next = await create({ namespace: 'support' });
    expect(chatOf(next)).not.toBe(chatOf(second));
  });
});

describe('a namespace change through updateConfig', () => {
  it('moves the chat to the new namespace', async () => {
    const handle = await create({ namespace: 'old' });
    await handle.updateConfig({
      namespace: 'new',
      messaging: { skipWelcome: true },
    });
    expect(chatOf(handle).namespace.originalName).toBe('new');

    await expect(create({ namespace: 'new' })).rejects.toThrow(
      'A chat with the namespace "new" is already running'
    );
    const other = await create({ namespace: 'old' });
    expect(chatOf(other)).not.toBe(chatOf(handle));
  });

  it('rejects, changing nothing, onto a namespace that has a chat', async () => {
    await create({ namespace: 'taken' });
    const handle = await create({ namespace: 'mine', isReadonly: true });
    const manager = chatOf(handle);
    await expect(
      handle.updateConfig({ namespace: 'taken', isReadonly: false })
    ).rejects.toThrow('A chat with the namespace "taken" is already running');
    expect(manager.store.getState().config.public.isReadonly).toBe(true);
    expect(manager.namespace.originalName).toBe('mine');
    await expect(create({ namespace: 'mine' })).rejects.toThrow(
      /already running/
    );
  });
});

describe('which creates use the registry (#2357 constraint)', () => {
  it('the SDK entry claims; the prebuilt chat with reuse off doesn’t', async () => {
    const claim = jest.spyOn(chatRegistry, 'claim');
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
