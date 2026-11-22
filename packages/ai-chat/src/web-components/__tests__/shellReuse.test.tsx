/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A shell with `lifecycle.reuseInstance` on keeps its conversation through a
 * remount, unless `lifecycle.onUnmount` destroys it, and one with it off works
 * as before.
 */

import type { Mock as VitestMock, MockInstance } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';

import '../cds-aichat-container';
import type ChatElement from '../cds-aichat-container/cds-aichat-container';
import { ChatContainer } from '../../react/ChatContainer';
import { createChatSDK } from '../../sdk';
import { chatRegistry } from '../../sdk/createChatSDK';
import { ServiceManager } from '../../sdk/services/ServiceManager';
import type { ExtensionHosts } from '../../chat/services/extensionHosts';
import type { ChatRenderer } from '../shared/react-renderer';
import { OnErrorType } from '../../types/config/ErrorConfig';
import type { PublicConfig } from '../../types/config/PublicConfig';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../types/config/ServiceDeskConfig';
import { BusEventType } from '../../types/events/eventBusTypes';
import { MessageResponseTypes, UserType } from '../../types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';

/** Each mount the stub renderer was asked to draw into, by element. */
const rendered = new Set<HTMLElement>();

/** The extension hosts each element's latest render got. */
const hostsOf = new Map<HTMLElement, ExtensionHosts>();

/** A renderer that renders nothing and reports the first commit at once. */
function rendererFor(element: HTMLElement): ChatRenderer {
  return {
    mount: () => ({
      render(_App, inputs) {
        rendered.add(element);
        hostsOf.set(element, inputs.hosts);
        if (inputs.initialViewReady) {
          queueMicrotask(inputs.onInitialViewCommitted);
        }
      },
      unmount: () => {},
    }),
  };
}

let namespaceCount = 0;
/** A namespace no other test uses, so no chat in its window crosses over. */
function freshNamespace() {
  namespaceCount += 1;
  return `reuse-${namespaceCount}`;
}

/** A reuse-on config for a namespace, with a short window. */
function reuseConfig(
  namespace: string,
  config: Partial<PublicConfig> = {}
): Partial<PublicConfig> {
  return {
    namespace,
    messaging: { skipWelcome: true },
    lifecycle: { reuseInstance: true, releaseGraceMs: 2000 },
    ...config,
  };
}

function chatElement(config: Partial<PublicConfig> = {}) {
  const element = document.createElement('cds-aichat-container') as ChatElement;
  element.config = { ...createBaseConfig(), ...config };
  element.renderer = rendererFor(element);
  return element;
}

/** Lets a removed element release its mount, which it defers a microtask. */
async function flushMicrotasks(count = 10) {
  for (let i = 0; i < count; i++) {
    await Promise.resolve();
  }
}

interface Mounted {
  element: ChatElement;
  instance: ChatInstance;
}

/** Mounts a chat element and resolves once it rendered. */
async function mountElement(
  config: Partial<PublicConfig> = {},
  beforeRender?: (instance: ChatInstance) => void
): Promise<Mounted> {
  const element = chatElement(config);
  const mounted = { element } as Mounted;
  element.onBeforeRender = (value) => {
    mounted.instance = value;
    beforeRender?.(value);
  };
  element.onAfterRender = vi.fn();
  document.body.appendChild(element);
  await waitFor(() => expect(element.onAfterRender).toHaveBeenCalled(), {
    timeout: 5000,
  });
  return mounted;
}

/** Removes a mounted element and lets it release. */
async function unmount({ element }: Mounted) {
  element.remove();
  await flushMicrotasks();
}

/** The chat's own service manager, which the instance's test copy points to. */
function managerOf(instance: ChatInstance): ServiceManager {
  return (instance.serviceManager.messageCoordinator as any).serviceManager;
}

async function addMessage(instance: ChatInstance, id: string) {
  await instance.messaging.addMessage({
    id,
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text: id }],
    },
  });
}

/** A desk that records itself, for agent-chat cases. */
function deskFactory() {
  const desks: Array<{
    startChat: VitestMock;
    endChat: VitestMock;
    callback: ServiceDeskCallback;
  }> = [];
  const factory = async (parameters: { callback: ServiceDeskCallback }) => {
    const desk = {
      getName: () => 'Test desk',
      startChat: vi.fn(async () => {}),
      endChat: vi.fn(async () => {}),
      sendMessageToAgent: vi.fn(async () => {}),
      reconnect: vi.fn(async () => true),
    };
    desks.push({
      startChat: desk.startChat,
      endChat: desk.endChat,
      callback: parameters.callback,
    });
    return desk as unknown as ServiceDesk;
  };
  return { desks, factory };
}

let shutdown: MockInstance;

beforeEach(() => {
  setupBeforeEach();
  sessionStorage.clear();
  rendered.clear();
  hostsOf.clear();
  shutdown = vi.spyOn(ServiceManager.prototype, 'shutdown');
});

afterEach(() => {
  setupAfterEach();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('a remount inside the window keeps the conversation', () => {
  it('O1: keeps the transcript, in the same chat, with a new instance', async () => {
    const namespace = freshNamespace();
    const first = await mountElement(reuseConfig(namespace));
    await addMessage(first.instance, 'kept');
    const chat = managerOf(first.instance);

    await unmount(first);
    const second = await mountElement(reuseConfig(namespace));

    expect(managerOf(second.instance)).toBe(chat);
    expect(chat.isShutdown).toBe(false);
    expect(second.instance).not.toBe(first.instance);
    expect(second.instance.state.get().messages.map(({ id }) => id)).toEqual(
      first.instance.state.get().messages.map(({ id }) => id)
    );
    expect(
      second.instance.state.get().messages.some(({ id }) => id === 'kept')
    ).toBe(true);
    expect(shutdown).not.toHaveBeenCalled();
  });

  it("drops the released mount's state listeners while the adopted mount keeps its listeners", async () => {
    const namespace = freshNamespace();
    const config = reuseConfig(namespace);
    const first = await mountElement(config);
    const oldSubscriber = vi.fn();
    const oldSelector = vi.fn();
    const stopOldSubscriber = first.instance.state.subscribe(oldSubscriber);
    const stopOldSelector = first.instance.state.select(
      (state) => state.messages.length,
      oldSelector
    );
    await unmount(first);
    oldSubscriber.mockClear();
    oldSelector.mockClear();

    const second = await mountElement(config);
    const newSubscriber = vi.fn();
    const newSelector = vi.fn();
    second.instance.state.subscribe(newSubscriber);
    second.instance.state.select((state) => state.messages.length, newSelector);
    await addMessage(second.instance, 'adopted');

    expect(oldSubscriber).not.toHaveBeenCalled();
    expect(oldSelector).not.toHaveBeenCalled();
    expect(newSubscriber).toHaveBeenCalled();
    expect(newSelector).toHaveBeenLastCalledWith(
      second.instance.state.get().messages.length
    );
    stopOldSubscriber();
    stopOldSelector();
    newSubscriber.mockClear();
    await addMessage(second.instance, 'still-mounted');
    expect(newSubscriber).toHaveBeenCalled();
  });

  it('O2: keeps a live agent chat, on the same desk', async () => {
    const namespace = freshNamespace();
    const { desks, factory } = deskFactory();
    const config = reuseConfig(namespace, { serviceDeskFactory: factory });
    const first = await mountElement(config);
    await first.instance.serviceDesk.startConversation();
    await waitFor(() => expect(desks).toHaveLength(1));
    await desks[0].callback.agentJoined({
      id: 'dana',
      nickname: 'Dana',
      user_type: UserType.HUMAN,
    });
    expect(first.instance.state.get().humanAgent.isConnected).toBe(true);

    await unmount(first);
    const second = await mountElement(config);

    expect(second.instance.state.get().humanAgent.isConnected).toBe(true);
    expect(desks).toHaveLength(1);
    expect(desks[0].endChat).not.toHaveBeenCalled();
  });

  it('O17: a web component moved across tasks keeps its chat', async () => {
    const namespace = freshNamespace();
    const mounted = await mountElement(reuseConfig(namespace));
    await addMessage(mounted.instance, 'moved');
    const chat = managerOf(mounted.instance);
    const firstInstance = mounted.instance;
    const other = document.createElement('div');
    document.body.appendChild(other);

    mounted.element.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    (mounted.element.onAfterRender as VitestMock).mockClear();
    other.appendChild(mounted.element);
    await waitFor(() =>
      expect(mounted.element.onAfterRender).toHaveBeenCalled()
    );

    expect(mounted.instance).not.toBe(firstInstance);
    expect(managerOf(mounted.instance)).toBe(chat);
    expect(
      mounted.instance.state.get().messages.some(({ id }) => id === 'moved')
    ).toBe(true);
  });
});

describe('two shells on one namespace (O12–O14)', () => {
  it('the second renders nothing and reports through onError and the console', async () => {
    const namespace = freshNamespace();
    await mountElement(reuseConfig(namespace));
    const onError = vi.fn();
    const element = chatElement(reuseConfig(namespace, { onError }));
    element.onBeforeRender = vi.fn();
    document.body.appendChild(element);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith({
      errorType: OnErrorType.INTEGRATION_ERROR,
      message: expect.stringContaining(`"${namespace}"`),
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`"${namespace}"`)
    );
    await flushMicrotasks();
    expect(element.onBeforeRender).not.toHaveBeenCalled();
    expect(rendered.has(element)).toBe(false);
  });

  it('O5: two reuse-on shells with no namespace collide too', async () => {
    const config = {
      messaging: { skipWelcome: true },
      lifecycle: { reuseInstance: true },
    };
    await mountElement(config);
    const onError = vi.fn();
    const element = chatElement({ ...config, onError });
    element.onBeforeRender = vi.fn();
    document.body.appendChild(element);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0].message).toContain('with no namespace');
    expect(element.onBeforeRender).not.toHaveBeenCalled();
  });

  it('two reuse-off shells on one namespace each run their own chat', async () => {
    const config = { namespace: 'shared', messaging: { skipWelcome: true } };
    const claim = vi.spyOn(chatRegistry, 'claim');
    const first = await mountElement(config);
    const second = await mountElement(config);

    await addMessage(first.instance, 'one');
    await addMessage(second.instance, 'two');

    expect(managerOf(first.instance)).not.toBe(managerOf(second.instance));
    const ids = (mounted: Mounted) =>
      mounted.instance.state.get().messages.map(({ id }) => id);
    expect(ids(first)).toEqual(['one']);
    expect(ids(second)).toEqual(['two']);
    expect(claim).not.toHaveBeenCalled();
  });
});

describe('what a host sees (O19)', () => {
  it('handlers from the released mount stop; the new mount’s run once', async () => {
    const namespace = freshNamespace();
    const oldHandler = vi.fn();
    const oldOnce = vi.fn();
    const first = await mountElement(reuseConfig(namespace), (instance) => {
      instance.on({ type: BusEventType.RECEIVE, handler: oldHandler });
      instance.once({ type: BusEventType.RECEIVE, handler: oldOnce });
    });
    await unmount(first);

    const newHandler = vi.fn();
    const second = await mountElement(reuseConfig(namespace), (instance) =>
      instance.on({ type: BusEventType.RECEIVE, handler: newHandler })
    );
    await addMessage(second.instance, 'after');

    expect(oldHandler).not.toHaveBeenCalled();
    expect(oldOnce).not.toHaveBeenCalled();
    expect(newHandler).toHaveBeenCalledTimes(1);
    expect(newHandler.mock.calls[0][1]).toBe(second.instance);
  });
});

describe('a namespace change on a reuse-on shell', () => {
  it('onto a held namespace reports and changes nothing', async () => {
    const held = freshNamespace();
    const own = freshNamespace();
    await mountElement(reuseConfig(held));
    const onError = vi.fn();
    const mounted = await mountElement(reuseConfig(own, { onError }));
    const chat = managerOf(mounted.instance);

    mounted.element.namespace = held;
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));

    expect(onError.mock.calls[0][0].errorType).toBe(
      OnErrorType.INTEGRATION_ERROR
    );
    expect(chat.store.getState().config.public.namespace).toBe(own);
  });
});

describe('a prebuilt chat and an SDK chat never adopt each other', () => {
  it('an SDK create on a mounted reuse-on shell’s namespace rejects', async () => {
    const namespace = freshNamespace();
    await mountElement(reuseConfig(namespace));

    await expect(createChatSDK({ namespace })).rejects.toThrow(
      `"${namespace}"`
    );
  });
});

/** A response with one user-defined item, under a custom footer. */

describe('lifecycle.onUnmount', () => {
  /** A reuse-on mount whose host saw the agent chat's end events. */
  async function mountWithAgent(config: Partial<PublicConfig>) {
    const { desks, factory } = deskFactory();
    const seen: string[] = [];
    const record = (event: { type: string }) => {
      seen.push(event.type);
    };
    const mounted = await mountElement(
      { ...config, serviceDeskFactory: factory },
      (instance) =>
        instance.on([
          { type: BusEventType.HUMAN_AGENT_PRE_END_CHAT, handler: record },
          { type: BusEventType.HUMAN_AGENT_END_CHAT, handler: record },
        ])
    );
    await mounted.instance.serviceDesk.startConversation();
    await waitFor(() => expect(desks).toHaveLength(1));
    await desks[0].callback.agentJoined({
      id: 'dana',
      nickname: 'Dana',
      user_type: UserType.HUMAN,
    });
    const chat = managerOf(mounted.instance);
    const sessionKey = chat.userSessionStorageService.getSessionKey();
    expect(sessionStorage.getItem(sessionKey)).toContain('"isConnected":true');
    return { mounted, chat, desk: desks[0], seen, sessionKey };
  }

  it("O15: 'destroy' ends the agent chat, which the host's handlers see, and clears the saved session", async () => {
    const namespace = freshNamespace();
    const config = reuseConfig(namespace, {
      lifecycle: { reuseInstance: true, onUnmount: 'destroy' },
    });
    const { mounted, chat, desk, seen, sessionKey } =
      await mountWithAgent(config);

    await unmount(mounted);
    await chat.shutdown();

    expect(chat.isDestroyed).toBe(true);
    expect(desk.endChat).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(sessionStorage.getItem(sessionKey)).toBeNull();
    // Inside what would be the window, a remount starts a new chat.
    const next = await mountElement(reuseConfig(namespace));
    expect(managerOf(next.instance)).not.toBe(chat);
    expect(next.instance.state.get().humanAgent.isConnected).toBe(false);
  });

  it.each([
    ['the default', undefined],
    ["'release'", 'release' as const],
  ])(
    'O16: %s keeps the chat and its agent chat for a remount',
    async (_name, onUnmount) => {
      const namespace = freshNamespace();
      const config = reuseConfig(namespace, {
        lifecycle: { reuseInstance: true, onUnmount },
      });
      const { mounted, chat, desk, seen, sessionKey } =
        await mountWithAgent(config);

      await unmount(mounted);
      const next = await mountElement(config);

      expect(managerOf(next.instance)).toBe(chat);
      expect(chat.isShutdown).toBe(false);
      expect(next.instance.state.get().humanAgent.isConnected).toBe(true);
      expect(desk.endChat).not.toHaveBeenCalled();
      expect(seen).toEqual([]);
      expect(sessionStorage.getItem(sessionKey)).toContain(
        '"isConnected":true'
      );
    }
  );

  it("with reuse off, 'destroy' does nothing: the chat shuts down and keeps its saved session", async () => {
    const destroy = vi.spyOn(ServiceManager.prototype, 'destroy');
    const { mounted, chat, desk, seen, sessionKey } = await mountWithAgent({
      namespace: freshNamespace(),
      messaging: { skipWelcome: true },
      lifecycle: { onUnmount: 'destroy' },
    });

    await unmount(mounted);
    await chat.shutdown();

    expect(destroy).not.toHaveBeenCalled();
    expect(chat.isDestroyed).toBe(false);
    expect(desk.endChat).not.toHaveBeenCalled();
    expect(seen).toEqual([]);
    expect(sessionStorage.getItem(sessionKey)).toContain('"isConnected":true');
  });

  it("a ChatContainer key change with 'destroy' starts a new chat", async () => {
    const namespace = freshNamespace();
    const onAfterRender = vi.fn();
    const instances: ChatInstance[] = [];
    const chatFor = (user: string) => (
      <ChatContainer
        key={user}
        {...createBaseConfig()}
        namespace={namespace}
        messaging={{ skipWelcome: true }}
        lifecycle={{ reuseInstance: true, onUnmount: 'destroy' }}
        onBeforeRender={(instance) => {
          instances.push(instance);
        }}
        onAfterRender={onAfterRender}
      />
    );
    const view = render(chatFor('ada'));
    await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
      timeout: 8000,
    });
    await addMessage(instances[0], 'ada-only');
    const firstChat = managerOf(instances[0]);

    view.rerender(chatFor('grace'));
    await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(2), {
      timeout: 8000,
    });

    expect(firstChat.isDestroyed).toBe(true);
    expect(managerOf(instances[1])).not.toBe(firstChat);
    expect(
      instances[1].state.get().messages.some(({ id }) => id === 'ada-only')
    ).toBe(false);
    view.unmount();
  }, 30000);
});
