/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import {
  BusEventType,
  ChatContainer,
  type ChatInstance,
  MessageState,
  type OnErrorData,
  OnErrorType,
  type PersistableState,
  PageObjectId,
  type PublicConfig,
  type ServiceDesk,
  type ServiceDeskCallback,
  UserType,
  readCarbonChatSession,
} from '../../../aiChatEntry';
import { createChatSDK, type ChatSDKHandle } from '../../../sdk/index';
import {
  allByRole,
  contractChat,
  contractSetup,
  deferred,
  mainPanelText,
  getByTestId,
  shownText,
  pause,
  textResponse,
} from '../helpers/contract';

type Factory = NonNullable<PublicConfig['serviceDeskFactory']>;
const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(operation: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

function plainDesk(): ServiceDesk {
  return {
    getName: () => 'Lifecycle contract desk',
    startChat: async () => undefined,
    endChat: async () => undefined,
    sendMessageToAgent: async () => undefined,
  };
}

function controlTimeouts() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

type ContainerElement = HTMLElement & Record<string, unknown>;

/** What connecting a `cds-aichat-container` led to first. */
interface ConnectedContainer {
  element: ContainerElement;
  outcome: 'rendered' | 'reported';
  errors: OnErrorData[];
  instance: ChatInstance | null;
}

/**
 * Connects a `cds-aichat-container` with these properties, and resolves once
 * it has rendered or has reported an error, whichever comes first.
 */
async function connectContainer(
  properties: Partial<PublicConfig>
): Promise<ConnectedContainer> {
  const element = document.createElement(
    'cds-aichat-container'
  ) as unknown as ContainerElement;
  const errors: OnErrorData[] = [];
  let instance: ChatInstance | null = null;
  let settle: (outcome: ConnectedContainer['outcome']) => void;
  const settled = new Promise<ConnectedContainer['outcome']>((resolve) => {
    settle = resolve;
  });
  Object.assign(element, properties, {
    onError: (data: OnErrorData) => {
      errors.push(data);
      settle('reported');
    },
    onBeforeRender: (handed: ChatInstance) => {
      instance = handed;
    },
    onAfterRender: () => settle('rendered'),
  });
  await act(async () => {
    document.body.appendChild(element);
  });
  const outcome = await bounded(settled, 'Container mount');
  return { element, outcome, errors, instance };
}

describe('public host lifecycle', () => {
  contractSetup();

  it('keeps the saved agent connection through expiry and reconnects on the next mount', async () => {
    let callback: ServiceDeskCallback;
    const persisted: unknown[] = [];
    let starts = 0;
    let ends = 0;
    let reconnects = 0;
    const factory: Factory = async (parameters) => {
      callback = parameters.callback;
      persisted.push(parameters.persistedState);
      return {
        ...plainDesk(),
        startChat: async () => {
          starts += 1;
        },
        endChat: async () => {
          ends += 1;
        },
        reconnect: async () => {
          reconnects += 1;
          return true;
        },
      };
    };
    const config: PublicConfig = {
      namespace: 'host-expiry-agent',
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, releaseGraceMs: 0 },
      serviceDeskFactory: factory,
    };
    const first = await contractChat(config);
    let second: Awaited<ReturnType<typeof contractChat>>;
    let timeoutsControlled = false;
    const events: string[] = [];
    first.instance.on([
      {
        type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
        handler: () => {
          events.push('pre-end');
        },
      },
      {
        type: BusEventType.HUMAN_AGENT_END_CHAT,
        handler: () => {
          events.push('end');
        },
      },
    ]);
    try {
      await act(() => first.instance.serviceDesk.startConversation());
      await act(() =>
        callback.agentJoined({
          id: 'ada',
          nickname: 'Ada',
          user_type: UserType.HUMAN,
        })
      );
      expect(starts).toBe(1);
      expect(first.instance.state.get().humanAgent.isConnected).toBe(true);
      const saved = readCarbonChatSession(config.namespace);
      expect(saved.humanAgentState.isConnected).toBe(true);
      controlTimeouts();
      timeoutsControlled = true;
      await act(async () => {
        first.unmount();
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.useRealTimers();
      timeoutsControlled = false;
      expect(readCarbonChatSession(config.namespace)).toEqual(saved);
      expect(ends).toBe(0);
      expect(events).toEqual([]);
      second = await contractChat(config);
      await waitFor(() => expect(reconnects).toBe(1));
      expect(persisted).toHaveLength(2);
      expect(second.instance.state.get().humanAgent).toMatchObject({
        isConnected: true,
        responseUserProfile: { id: 'ada' },
      });
    } finally {
      if (!timeoutsControlled) {
        controlTimeouts();
      }
      await act(async () => {
        first.unmount();
        second?.unmount();
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.useRealTimers();
    }
  });

  it('clears the built-in saved session when unmount destroys the conversation', async () => {
    const namespace = 'host-destroy-storage';
    const first = await contractChat({
      namespace,
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
    });
    let next: Awaited<ReturnType<typeof contractChat>>;
    try {
      await act(() =>
        first.instance.messaging.addMessage(textResponse('Saved', 'saved'))
      );
      expect(readCarbonChatSession(namespace).hasSentNonWelcomeMessage).toBe(
        true
      );
      await act(async () => first.unmount());
      await waitFor(() => expect(readCarbonChatSession(namespace)).toBeNull());
      next = await contractChat({
        namespace,
        openChatByDefault: true,
        messaging: { skipWelcome: true },
        lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
      });
      expect(next.instance.state.get().messages).toEqual([]);
      expect(next.instance.state.get().hasSentNonWelcomeMessage).toBe(false);
    } finally {
      await act(async () => {
        first.unmount();
        next?.unmount();
      });
    }
  });

  it('keeps host-owned state silent on release and reports one clear after destroy stops notifications', async () => {
    const values: PersistableState[] = [];
    const order: string[] = [];
    const onStateChange = (state: PersistableState) => {
      values.push(state);
      order.push('saved');
    };
    const config: PublicConfig = {
      namespace: 'host-owned-lifecycle',
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, releaseGraceMs: 0 },
      persistedState: { onStateChange },
    };
    const first = await contractChat(config);
    let second: Awaited<ReturnType<typeof contractChat>>;
    let unsubscribe: () => void = () => undefined;
    let timeoutsControlled = false;
    try {
      await act(() =>
        first.instance.messaging.addMessage(textResponse('Saved', 'saved'))
      );
      const saved = values[values.length - 1];
      expect(saved.hasSentNonWelcomeMessage).toBe(true);
      values.length = 0;
      order.length = 0;
      controlTimeouts();
      timeoutsControlled = true;
      await act(async () => {
        first.unmount();
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.useRealTimers();
      timeoutsControlled = false;
      expect(values).toEqual([]);
      second = await contractChat({
        ...config,
        lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
        persistedState: { initialState: saved, onStateChange },
      });
      expect(second.instance.state.get().hasSentNonWelcomeMessage).toBe(true);
      unsubscribe = second.instance.state.subscribe(() => {
        order.push('state');
      });
      values.length = 0;
      order.length = 0;
      await act(async () => second.unmount());
      await waitFor(() => expect(values).toHaveLength(1));
      expect(order).toEqual(['saved']);
      expect(values[0]).toMatchObject({
        hasSentNonWelcomeMessage: false,
        showUnreadIndicator: false,
        humanAgentState: { isConnected: false },
      });
      await pause();
      expect(order).toEqual(['saved']);
    } finally {
      unsubscribe();
      if (!timeoutsControlled) {
        controlTimeouts();
      }
      await act(async () => {
        first.unmount();
        second?.unmount();
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.useRealTimers();
    }
  });

  it('abandons a pending public host adoption and applies the next mount after its factory settles', async () => {
    const namespace = 'host-pending-adoption';
    const first = await contractChat({
      namespace,
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true },
      serviceDeskFactory: async () => plainDesk(),
    });
    let enter: () => void;
    let finish: () => void;
    let rendered: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const work = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      rendered = resolve;
    });
    const log: string[] = [];
    let ownedFactory: Promise<ServiceDesk>;
    const heldFactory: Factory = () => {
      log.push('second start');
      enter();
      ownedFactory = work.then(() => {
        log.push('second end');
        return plainDesk();
      });
      return ownedFactory;
    };
    const abandoned: ChatInstance[] = [];
    let second: ReturnType<typeof render>;
    let third: ReturnType<typeof render>;
    let current: ChatInstance;
    try {
      await act(() =>
        first.instance.messaging.addMessage(
          textResponse('Kept transcript', 'kept')
        )
      );
      await act(async () => first.unmount());
      await act(async () => {
        second = render(
          <ChatContainer
            namespace={namespace}
            openChatByDefault
            messaging={{ skipWelcome: true }}
            lifecycle={{ reuseInstance: true }}
            serviceDeskFactory={heldFactory}
            onBeforeRender={(instance) => {
              abandoned.push(instance);
            }}
          />
        );
      });
      await bounded(entered, 'Adopting factory entry');
      await act(async () => second.unmount());
      await act(async () => {
        third = render(
          <ChatContainer
            namespace={namespace}
            openChatByDefault
            messaging={{ skipWelcome: true }}
            lifecycle={{ reuseInstance: true, onUnmount: 'destroy' }}
            serviceDeskFactory={async () => {
              log.push('third');
              return plainDesk();
            }}
            onBeforeRender={(instance) => {
              current = instance;
            }}
            onAfterRender={() => rendered()}
          />
        );
      });
      await pause();
      expect(log).toEqual(['second start']);
      finish();
      await bounded(ready, 'Current mount');
      expect(log).toEqual(['second start', 'second end', 'third']);
      expect(abandoned).toEqual([]);
      expect(current.state.get().messages.map(({ id }) => id)).toEqual([
        'kept',
      ]);
      await waitFor(() => expect(mainPanelText()).toContain('Kept transcript'));
      await act(() =>
        current.messaging.addMessage(textResponse('Current mount', 'current'))
      );
      await waitFor(() => expect(mainPanelText()).toContain('Current mount'));
    } finally {
      finish();
      await act(async () => {
        second?.unmount();
        third?.unmount();
        first.unmount();
      });
      if (ownedFactory) {
        await bounded(ownedFactory, 'Owned factory cleanup');
      }
    }
  });

  it('copies caller-owned header config and applies an explicit later host update', async () => {
    const config: PublicConfig = {
      namespace: 'host-header-copy',
      header: { title: 'Original lifecycle header' },
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
    };
    const mount = await contractChat(config);
    try {
      config.header.title = 'Caller mutation';
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Still running', 'copy')
        )
      );
      expect(shownText(getByTestId(PageObjectId.HEADER_TITLE)).trim()).toBe(
        'Original lifecycle header'
      );
      await mount.rerender({
        ...config,
        header: { title: 'Explicit lifecycle update' },
      });
      await waitFor(() =>
        expect(shownText(getByTestId(PageObjectId.HEADER_TITLE)).trim()).toBe(
          'Explicit lifecycle update'
        )
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('moves a reused chat to the namespace its cds-aichat-container is given, so a mount on the old one starts a new chat and the new one is held', async () => {
    const from = 'host-move-from';
    const to = 'host-move-to';
    const properties = (namespace: string): Partial<PublicConfig> => ({
      namespace,
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
      strings: { window_ariaChatRegionNamespace: 'Moved region {namespace}' },
    });
    const connected: ConnectedContainer[] = [];
    try {
      const moved = await connectContainer(properties(from));
      connected.push(moved);
      expect(moved.outcome).toBe('rendered');
      await act(() =>
        moved.instance.messaging.addMessage(
          textResponse('Moved transcript', 'moved')
        )
      );
      await act(async () => {
        moved.element.namespace = to;
      });
      await waitFor(() =>
        expect(allByRole('region', `Moved region ${to}`)).toHaveLength(1)
      );
      const fresh = await connectContainer(properties(from));
      connected.push(fresh);
      expect(fresh.outcome).toBe('rendered');
      expect(fresh.errors).toEqual([]);
      expect(fresh.instance.state.get().messages).toEqual([]);
      const blocked = await connectContainer(properties(to));
      connected.push(blocked);
      expect(blocked.outcome).toBe('reported');
      expect(blocked.errors).toHaveLength(1);
      expect(blocked.errors[0].errorType).toBe(OnErrorType.INTEGRATION_ERROR);
      expect(blocked.errors[0].message).toContain(`"${to}"`);
      expect(moved.instance.state.get().messages.map(({ id }) => id)).toEqual([
        'moved',
      ]);
    } finally {
      await act(async () => {
        for (const { element } of connected) {
          element.remove();
        }
      });
    }
  });

  it('starts its own conversation for an SDK create in a released prebuilt chat’s window', async () => {
    const namespace = 'host-prebuilt-then-sdk';
    const mount = await contractChat({
      namespace,
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true },
    });
    let handle: ChatSDKHandle | undefined;
    let next: ChatSDKHandle | undefined;
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Prebuilt transcript', 'prebuilt')
        )
      );
      expect(mount.instance.state.get().messages.map(({ id }) => id)).toEqual([
        'prebuilt',
      ]);
      await act(async () => mount.unmount());
      handle = await bounded(
        createChatSDK({ namespace, messaging: { skipWelcome: true } }),
        'SDK create'
      );
      expect(handle.state.get().messages).toEqual([]);
      await handle.messaging.upsertMessage(
        'sdk-own',
        MessageState.COMPLETE,
        () => textResponse('SDK transcript', 'sdk-own')
      );
      expect(handle.state.get().messages.map(({ id }) => id)).toEqual([
        'sdk-own',
      ]);
      // An SDK create in the SDK chat's own window adopts it, so the window
      // is open and the empty transcript above is the prebuilt chat's refusal.
      handle.release();
      next = await bounded(
        createChatSDK({ namespace, messaging: { skipWelcome: true } }),
        'SDK adoption'
      );
      expect(next.state.get().messages.map(({ id }) => id)).toEqual([
        'sdk-own',
      ]);
    } finally {
      (next ?? handle)?.destroy();
      await act(async () => mount.unmount());
    }
  });

  it('reconnects a saved agent chat on the desk it was loading when an adopting mount brings a new factory, and moves to that factory once the chat ends', async () => {
    const namespace = 'host-adopted-desk-swap';
    let savedCallback: ServiceDeskCallback;
    const seed = await contractChat({
      namespace,
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true, releaseGraceMs: 0 },
      serviceDeskFactory: async (parameters) => {
        savedCallback = parameters.callback;
        return { ...plainDesk(), reconnect: async () => true };
      },
    });
    const loadingDesk = deferred();
    const calls = {
      loadingFactory: 0,
      loadingReconnects: 0,
      loadingStarts: 0,
      loadingEnds: 0,
      nextFactory: 0,
      nextStarts: 0,
    };
    const loadingFactory: Factory = async () => {
      calls.loadingFactory += 1;
      await loadingDesk.promise;
      return {
        ...plainDesk(),
        startChat: async () => {
          calls.loadingStarts += 1;
        },
        endChat: async () => {
          calls.loadingEnds += 1;
        },
        reconnect: async () => {
          calls.loadingReconnects += 1;
          return true;
        },
      };
    };
    const nextFactory: Factory = async () => {
      calls.nextFactory += 1;
      return {
        ...plainDesk(),
        startChat: async () => {
          calls.nextStarts += 1;
        },
      };
    };
    let loading: Awaited<ReturnType<typeof contractChat>>;
    let adopted: Awaited<ReturnType<typeof contractChat>>;
    let timeoutsControlled = false;
    try {
      await act(() => seed.instance.serviceDesk.startConversation());
      await act(() =>
        savedCallback.agentJoined({
          id: 'ada',
          nickname: 'Ada',
          user_type: UserType.HUMAN,
        })
      );
      controlTimeouts();
      timeoutsControlled = true;
      await act(async () => {
        seed.unmount();
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.useRealTimers();
      timeoutsControlled = false;
      // The expired chat left its agent chat connected in the saved session.
      expect(readCarbonChatSession(namespace).humanAgentState.isConnected).toBe(
        true
      );
      loading = await contractChat({
        namespace,
        openChatByDefault: true,
        messaging: { skipWelcome: true },
        lifecycle: { reuseInstance: true },
        serviceDeskFactory: loadingFactory,
      });
      await waitFor(() => expect(calls.loadingFactory).toBe(1));
      await act(async () => loading.unmount());
      adopted = await contractChat({
        namespace,
        openChatByDefault: true,
        messaging: { skipWelcome: true },
        lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
        serviceDeskFactory: nextFactory,
      });
      loadingDesk.resolve();
      await waitFor(() => expect(calls.loadingReconnects).toBe(1));
      await waitFor(() =>
        expect(adopted.instance.state.get().humanAgent.isReconnecting).toBe(
          false
        )
      );
      expect(adopted.instance.state.get().humanAgent.isConnected).toBe(true);
      // The live agent chat keeps the desk it reconnected on.
      expect(calls.nextFactory).toBe(0);
      await act(() => adopted.instance.serviceDesk.endConversation());
      expect(calls.loadingEnds).toBe(1);
      await waitFor(() => expect(calls.nextFactory).toBe(1));
      await act(() => adopted.instance.serviceDesk.startConversation());
      await waitFor(() => expect(calls.nextStarts).toBe(1));
      expect(calls.loadingStarts).toBe(0);
    } finally {
      loadingDesk.resolve();
      if (!timeoutsControlled) {
        controlTimeouts();
      }
      await act(async () => {
        seed.unmount();
        loading?.unmount();
        adopted?.unmount();
        await vi.advanceTimersByTimeAsync(0);
      });
      vi.useRealTimers();
    }
  });

  it('destroys the conversation when onBeforeRender sets onUnmount to destroy and removes the cds-aichat-container before the chat has applied that config', async () => {
    const namespace = 'host-destroy-before-render';
    const removed = deferred();
    const saved: unknown[] = [];
    const element = document.createElement(
      'cds-aichat-container'
    ) as unknown as ContainerElement;
    Object.assign(element, {
      namespace,
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true },
      onBeforeRender: async (instance: ChatInstance) => {
        await instance.messaging.addMessage(
          textResponse('Destroyed before render', 'destroyed')
        );
        saved.push(readCarbonChatSession(namespace));
        // A host that logs out during the first load: the chat has not
        // applied this config yet.
        element.lifecycle = { reuseInstance: true, onUnmount: 'destroy' };
        element.remove();
        removed.resolve();
      },
    });
    let next: Awaited<ReturnType<typeof contractChat>>;
    try {
      await act(async () => {
        document.body.appendChild(element);
      });
      await bounded(removed.promise, 'Removal during onBeforeRender');
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ hasSentNonWelcomeMessage: true });
      await waitFor(() => expect(readCarbonChatSession(namespace)).toBeNull());
      next = await contractChat({
        namespace,
        openChatByDefault: true,
        messaging: { skipWelcome: true },
        lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
      });
      expect(next.instance.state.get().messages).toEqual([]);
      expect(next.instance.state.get().hasSentNonWelcomeMessage).toBe(false);
    } finally {
      await act(async () => {
        element.remove();
        next?.unmount();
      });
    }
  });
});
