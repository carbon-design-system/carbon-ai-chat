/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import {
  bootPrebuiltChat,
  mergePublicConfig,
} from '../../../src/chat/utils/chatBoot';
import { createChatSDK, type ChatSDKHandle } from '../../../src/sdk';
import { chatOf } from '../../../src/sdk/handle';
import { DEFAULT_RELEASE_GRACE_MS } from '../../../src/sdk/registry';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import actions from '../../../src/sdk/store/actions';
import { setIsConnecting } from '../../../src/sdk/store/humanAgentActions';
import { toPersistableState } from '../../../src/sdk/store/persistenceUtils';
import { DEFAULT_PERSISTED_TO_BROWSER } from '../../../src/sdk/store/reducerUtils';
import type { ChatSDKConfig } from '../../../src/types/config/ChatSDKConfig';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import {
  BusEventType,
  type BusEventHumanAgentPreEndChat,
} from '../../../src/types/events/eventBusTypes';
import type { ChatSDKInstance } from '../../../src/types/instance/ChatSDKInstance';
import {
  type MessageRequest,
  MessageResponseTypes,
  UserType,
} from '../../../src/types/messaging/Messages';

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
const managers: ServiceManager[] = [];

/** Creates a chat through the SDK entry, destroyed after the test. */
async function create(config: ChatSDKConfig = {}) {
  const handle = await createChatSDK({
    messaging: { skipWelcome: true, customSendMessage: echo },
    ...config,
  });
  handles.push(handle);
  return handle;
}

/** Boots a prebuilt chat with no view, shut down after the test. */
async function prebuilt(config: Partial<PublicConfig>) {
  const booted = await bootPrebuiltChat({
    publicConfig: mergePublicConfig({
      messaging: { skipWelcome: true, customSendMessage: echo },
      ...config,
    }),
  });
  managers.push(booted.serviceManager);
  return booted;
}

/** A desk that records its calls, and the callback the chat gave it. */
function fakeDesk() {
  const desk = {
    getName: () => 'desk',
    startChat: jest.fn(async () => {}),
    endChat: jest.fn(async () => {}),
    sendMessageToAgent: jest.fn(async () => {}),
  };
  const made: { callback?: ServiceDeskCallback } = {};
  const factory = async (parameters: { callback: ServiceDeskCallback }) => {
    made.callback = parameters.callback;
    return desk as unknown as ServiceDesk;
  };
  return { desk, factory, made };
}

/** Puts the chat in a live agent chat with an agent who has joined. */
async function joinAgent(
  manager: ServiceManager,
  made: { callback?: ServiceDeskCallback }
) {
  (manager.humanAgentService as any).chatStarted = true;
  await made.callback.agentJoined({
    id: 'dana',
    nickname: 'Dana',
    user_type: UserType.HUMAN,
  });
}

/** Lets a shutdown queued behind promise callbacks run, with timers fake. */
async function settle() {
  for (let i = 0; i < 20; i += 1) {
    await Promise.resolve();
  }
}

const cleared = () => cloneDeep(DEFAULT_PERSISTED_TO_BROWSER);

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(async () => {
  jest.useRealTimers();
  handles.splice(0).forEach((handle) => handle.destroy());
  await Promise.all(managers.splice(0).map((manager) => manager.shutdown()));
  jest.restoreAllMocks();
});

describe('destroy (#2358 O1–O6)', () => {
  it('O1, O4: shuts down at once though a newer handle holds the chat, and nothing adopts it', async () => {
    const first = await create({ namespace: 'support' });
    first.release();
    const second = await create({ namespace: 'support' });
    const manager = chatOf(second);
    expect(chatOf(first)).toBe(manager);

    first.destroy();
    expect(manager.isShutdown).toBe(true);
    expect(manager.isDestroyed).toBe(true);
    const next = await create({ namespace: 'support' });
    expect(chatOf(next)).not.toBe(manager);
  });

  it('O2, O5, O6: ends a live agent chat; handlers see both events and can’t cancel', async () => {
    const { desk, factory, made } = fakeDesk();
    const handle = await create({ serviceDeskFactory: factory });
    const manager = chatOf(handle);
    await joinAgent(manager, made);

    const seen: string[] = [];
    handle.on([
      {
        type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
        handler: (event: BusEventHumanAgentPreEndChat) => {
          seen.push(event.type);
          event.cancel = true;
          event.cancelEndChat = true;
          event.preEndChatPayload = 'bye';
        },
      },
      {
        type: BusEventType.HUMAN_AGENT_END_CHAT,
        handler: (event: any) => {
          seen.push(event.type);
          expect(event.endedByHumanAgent).toBe(false);
          expect(event.requestCancelled).toBe(false);
        },
      },
    ]);

    handle.destroy();
    await manager.shutdown();
    expect(seen).toEqual([
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(desk.endChat).toHaveBeenCalledTimes(1);
    expect(desk.endChat).toHaveBeenCalledWith({
      endedByHumanAgent: false,
      preEndChatPayload: 'bye',
    });
    // Ended, so a later call can't reach the desk.
    expect(manager.humanAgentService.chatStarted).toBe(false);
  });

  it('O2: ends an agent chat still connecting, as a restart does', async () => {
    const { desk, factory } = fakeDesk();
    const handle = await create({ serviceDeskFactory: factory });
    const manager = chatOf(handle);
    (manager.humanAgentService as any).chatStarted = true;
    manager.store.dispatch(setIsConnecting(true, null));
    const ended = jest.fn();
    const preEnd = jest.fn();
    handle.on([
      { type: BusEventType.HUMAN_AGENT_PRE_END_CHAT, handler: preEnd },
      { type: BusEventType.HUMAN_AGENT_END_CHAT, handler: ended },
    ]);

    handle.destroy();
    await manager.shutdown();
    // No agent joined, so there is no pre-end event, and the request was cancelled.
    expect(preEnd).not.toHaveBeenCalled();
    expect(ended).toHaveBeenCalledWith(
      expect.objectContaining({ requestCancelled: true }),
      expect.anything()
    );
    expect(desk.endChat).toHaveBeenCalledTimes(1);
  });

  it('O3: clears the namespace’s saved session on the prebuilt path; a plain shutdown keeps it', async () => {
    const kept = await prebuilt({ namespace: 'kept' });
    const gone = await prebuilt({ namespace: 'gone' });
    [kept, gone].forEach(({ serviceManager }) =>
      serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(true)
      )
    );
    const keptKey =
      kept.serviceManager.userSessionStorageService.getSessionKey();
    const goneKey =
      gone.serviceManager.userSessionStorageService.getSessionKey();
    expect(sessionStorage.getItem(keptKey)).toContain(
      '"hasSentNonWelcomeMessage":true'
    );
    expect(sessionStorage.getItem(goneKey)).toContain(
      '"hasSentNonWelcomeMessage":true'
    );

    kept.handle.release();
    gone.handle.destroy();
    await Promise.all([
      kept.serviceManager.shutdown(),
      gone.serviceManager.shutdown(),
    ]);
    expect(sessionStorage.getItem(goneKey)).toBeNull();
    expect(sessionStorage.getItem(keptKey)).toContain(
      '"hasSentNonWelcomeMessage":true'
    );
  });
});

describe('other handles after destroy (#2358 O7–O9)', () => {
  it('reject promise methods, ignore the rest, and keep their last state silently', async () => {
    const first = await create({ namespace: 'support' });
    first.release();
    const second = await create({ namespace: 'support' });
    await second.messaging.send('Hello');
    const before = second.state.get();
    const listener = jest.fn();
    second.state.subscribe(listener);
    const handler = jest.fn();

    first.destroy();
    const destroyed =
      'Another handle destroyed this chat, so the call did nothing. Start a new chat.';
    await expect(second.messaging.send('Again')).rejects.toThrow(destroyed);
    await expect(second.messaging.restartConversation()).rejects.toThrow(
      destroyed
    );
    await expect(second.serviceDesk.endConversation()).rejects.toThrow(
      destroyed
    );
    await expect(second.updateConfig({ namespace: 'other' })).rejects.toThrow(
      destroyed
    );
    expect(second.messaging.clearError()).toBeUndefined();
    expect(second.messaging.removeFile('file')).toBeUndefined();
    expect(second.on({ type: BusEventType.SEND, handler })).toBe(second);
    expect(chatOf(second).eventBus.hasListeners(BusEventType.SEND)).toBe(false);
    expect(second.state.get()).toBe(before);
    expect(second.state.get().messages.length).toBeGreaterThan(0);
    await chatOf(second).shutdown();
    expect(listener).not.toHaveBeenCalled();
  });

  it('a released handle stops reaching the chat its successor adopted', async () => {
    const first = await create({ namespace: 'support' });
    const listener = jest.fn();
    const selected = jest.fn();
    first.state.subscribe(listener);
    first.state.select((state) => state.messages.length, selected);
    first.release();
    const before = first.state.get();
    const second = await create({ namespace: 'support' });

    await second.messaging.send('Hello');
    const messages = second.state.get().messages.length;
    expect(messages).toBeGreaterThan(0);
    expect(first.state.get()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(selected).not.toHaveBeenCalled();
    // It let go, so its calls do nothing, and its promises resolve.
    await expect(first.messaging.send('Hi')).resolves.toBeUndefined();
    expect(second.state.get().messages).toHaveLength(messages);
    expect(first.state.subscribe(listener)).toEqual(expect.any(Function));
    await second.messaging.send('Again');
    expect(listener).not.toHaveBeenCalled();
    await expect(first.updateConfig({ namespace: 'x' })).resolves.toBe(
      undefined
    );
    expect(chatOf(second).namespace.originalName).toBe('support');
  });
});

describe('host-owned storage on destroy (#2358 O10, O11)', () => {
  it('reports the cleared session once, after state stops notifying', async () => {
    const order: string[] = [];
    const onStateChange = jest.fn(() => order.push('saved'));
    const { handle, serviceManager, instance } = await prebuilt({
      persistedState: { onStateChange },
    });
    instance.state.subscribe(() => order.push('state'));
    serviceManager.store.dispatch(actions.updateHasSentNonWelcomeMessage(true));
    expect(order.sort()).toEqual(['saved', 'state']);
    order.length = 0;
    onStateChange.mockClear();

    handle.destroy();
    await serviceManager.shutdown();
    expect(order).toEqual(['saved']);
    expect(onStateChange).toHaveBeenCalledWith(toPersistableState(cleared()));
  });

  it('reports the cleared agent connection once on the SDK path, even while an agent chat ends', async () => {
    const order: string[] = [];
    const onStateChange = jest.fn(() => order.push('saved'));
    const { factory, made } = fakeDesk();
    const handle = await create({
      serviceDeskFactory: factory,
      humanAgentState: { onStateChange },
    });
    const manager = chatOf(handle);
    await joinAgent(manager, made);
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isConnected: true })
    );
    handle.state.subscribe(() => order.push('state'));
    order.length = 0;
    onStateChange.mockClear();

    handle.destroy();
    await manager.shutdown();
    expect(order).toEqual(['saved']);
    expect(onStateChange).toHaveBeenCalledWith(cleared().humanAgentState);
    // The store keeps its last value.
    expect(handle.state.get().humanAgent.isConnected).toBe(true);
  });
});

describe('a store listener that ends the chat (DEFERRED review)', () => {
  it.each([
    ['destroy()', 'destroy'],
    ['release() with no reuse', 'release'],
  ] as const)(
    '%s inside the first listener still runs the later ones once, and none after',
    async (_name, verb) => {
      const { handle, serviceManager, instance } = await prebuilt({});
      const second = jest.fn();
      const raw = jest.fn();
      let ended = false;
      instance.state.subscribe(() => {
        if (!ended) {
          ended = true;
          handle[verb]();
        }
      });
      instance.state.subscribe(second);
      // The store's own listeners, after the public state's.
      serviceManager.store.subscribe(raw);

      serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(true)
      );
      expect(ended).toBe(true);
      expect(second).toHaveBeenCalledTimes(1);
      expect(raw).toHaveBeenCalledTimes(1);

      await serviceManager.shutdown();
      serviceManager.store.dispatch(
        actions.updateHasSentNonWelcomeMessage(false)
      );
      await settle();
      expect(second).toHaveBeenCalledTimes(1);
      expect(raw).toHaveBeenCalledTimes(1);
    }
  );
});

describe('grace-window expiry (#2358 O12–O14)', () => {
  it('disconnects the agent chat without ending it, and calls no persistence callback', async () => {
    const onStateChange = jest.fn();
    const { desk, factory, made } = fakeDesk();
    const handle = await create({
      namespace: 'support',
      serviceDeskFactory: factory,
      humanAgentState: { onStateChange },
    });
    const manager = chatOf(handle);
    await joinAgent(manager, made);
    const ended = jest.fn();
    handle.on([
      { type: BusEventType.HUMAN_AGENT_PRE_END_CHAT, handler: ended },
      { type: BusEventType.HUMAN_AGENT_END_CHAT, handler: ended },
    ]);
    onStateChange.mockClear();

    jest.useFakeTimers();
    handle.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    await settle();
    expect(manager.isShutdown).toBe(true);
    expect(manager.isDestroyed).toBe(false);
    expect(desk.endChat).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled();
    expect(onStateChange).not.toHaveBeenCalled();
    expect(
      manager.store.getState().persistedToBrowserStorage.humanAgentState
        .isConnected
    ).toBe(true);
  });

  it('keeps the prebuilt chat’s saved session for the next mount’s reconnect, and reports nothing', async () => {
    const onStateChange = jest.fn();
    const withHost = await prebuilt({
      namespace: 'host',
      lifecycle: { reuseInstance: true },
      persistedState: { onStateChange },
    });
    const withStorage = await prebuilt({
      namespace: 'storage',
      lifecycle: { reuseInstance: true },
    });
    [withHost, withStorage].forEach(({ serviceManager }) =>
      serviceManager.store.dispatch(
        actions.updatePersistedState({
          humanAgentState: {
            ...cleared().humanAgentState,
            isConnected: true,
          },
        })
      )
    );
    const key =
      withStorage.serviceManager.userSessionStorageService.getSessionKey();
    const saved = sessionStorage.getItem(key);
    expect(saved).toContain('"isConnected":true');
    onStateChange.mockClear();

    jest.useFakeTimers();
    withHost.handle.release();
    withStorage.handle.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    await settle();
    expect(withHost.serviceManager.isShutdown).toBe(true);
    expect(withStorage.serviceManager.isShutdown).toBe(true);
    expect(sessionStorage.getItem(key)).toBe(saved);
    expect(onStateChange).not.toHaveBeenCalled();
  });
});
