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
 * remount, and one with it off works as before.
 */

import { waitFor } from '@testing-library/react';

import '../../../src/web-components/cds-aichat-container';
import type ChatElement from '../../../src/web-components/cds-aichat-container/cds-aichat-container';
import * as chatBoot from '../../../src/chat/utils/chatBoot';
import { createChatSDK } from '../../../src/sdk';
import { chatRegistry } from '../../../src/sdk/createChatSDK';
import { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import { resolvablePromise } from '../../../src/sdk/utils/resolvablePromise';
import type { ChatRenderer } from '../../../src/web-components/shared/react-renderer';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { PanelType, ViewType } from '../../../src/types/instance/apiTypes';
import {
  MessageResponseTypes,
  UserType,
} from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

/** Each mount the stub renderer was asked to draw into, by element. */
const rendered = new Set<HTMLElement>();

/** A renderer that renders nothing and reports the first commit at once. */
function rendererFor(element: HTMLElement): ChatRenderer {
  return {
    mount: () => ({
      render(_App, inputs) {
        rendered.add(element);
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
  element.onAfterRender = jest.fn();
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
  const desks: Array<{ endChat: jest.Mock; callback: ServiceDeskCallback }> =
    [];
  const factory = async (parameters: { callback: ServiceDeskCallback }) => {
    const desk = {
      getName: () => 'Test desk',
      startChat: jest.fn(async () => {}),
      endChat: jest.fn(async () => {}),
      sendMessageToAgent: jest.fn(async () => {}),
      reconnect: jest.fn(async () => true),
    };
    desks.push({ endChat: desk.endChat, callback: parameters.callback });
    return desk as unknown as ServiceDesk;
  };
  return { desks, factory };
}

let shutdown: jest.SpyInstance;

beforeEach(() => {
  setupBeforeEach();
  sessionStorage.clear();
  rendered.clear();
  shutdown = jest.spyOn(ServiceManager.prototype, 'shutdown');
});

afterEach(() => {
  setupAfterEach();
  jest.useRealTimers();
  jest.restoreAllMocks();
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
    (mounted.element.onAfterRender as jest.Mock).mockClear();
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

describe('the window (O8, O9)', () => {
  it('lifecycle.releaseGraceMs sets how long a released chat waits', async () => {
    const namespace = freshNamespace();
    const mounted = await mountElement(
      reuseConfig(namespace, {
        lifecycle: { reuseInstance: true, releaseGraceMs: 300 },
      })
    );
    const chat = managerOf(mounted.instance);

    await unmount(mounted);
    expect(chat.isShutdown).toBe(false);
    await waitFor(() => expect(chat.isShutdown).toBe(true), { timeout: 2000 });

    // Past the window, a mount starts a new chat.
    const next = await mountElement(reuseConfig(namespace));
    expect(managerOf(next.instance)).not.toBe(chat);
  });

  it('a mount released while its claimed chat boots lets the remount adopt it', async () => {
    const namespace = freshNamespace();
    const claim = chatRegistry.claim.bind(chatRegistry);
    const gate = resolvablePromise<void>();
    const claimed = jest
      .spyOn(chatRegistry, 'claim')
      .mockImplementationOnce((key, options) =>
        claim(key, {
          ...options,
          boot: async () => {
            await gate;
            return options.boot();
          },
        })
      );
    const element = chatElement(reuseConfig(namespace));
    element.onBeforeRender = jest.fn();
    document.body.appendChild(element);
    await waitFor(() => expect(claimed).toHaveBeenCalled());
    element.remove();
    await flushMicrotasks();

    const onError = jest.fn();
    const pending = mountElement(reuseConfig(namespace, { onError }));
    await waitFor(() => expect(claimed).toHaveBeenCalledTimes(2));
    gate.doResolve();
    const second = await pending;

    expect(onError).not.toHaveBeenCalled();
    expect(element.onBeforeRender).not.toHaveBeenCalled();
    expect(shutdown).not.toHaveBeenCalled();
    // The first mount drew nothing, so the chat opens as a new one would.
    expect(second.instance.getState().viewState).toEqual({
      launcher: true,
      mainWindow: false,
    });
  });

  it('a mount released before it claims leaves nothing behind', async () => {
    const namespace = freshNamespace();
    const original = chatBoot.bootPrebuiltChat;
    const gate = resolvablePromise<void>();
    const boot = jest
      .spyOn(chatBoot, 'bootPrebuiltChat')
      .mockImplementationOnce(async (options) => {
        await gate;
        return original(options);
      });
    const claimed = jest.spyOn(chatRegistry, 'claim');
    const element = chatElement(reuseConfig(namespace));
    element.onBeforeRender = jest.fn();
    document.body.appendChild(element);
    await waitFor(() => expect(boot).toHaveBeenCalled());
    element.remove();
    await flushMicrotasks();
    gate.doResolve();
    await flushMicrotasks(30);

    expect(claimed).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(element.onBeforeRender).not.toHaveBeenCalled();
  });
});

describe('two shells on one namespace (O12–O14)', () => {
  it('the second renders nothing and reports through onError and the console', async () => {
    const namespace = freshNamespace();
    await mountElement(reuseConfig(namespace));
    const onError = jest.fn();
    const element = chatElement(reuseConfig(namespace, { onError }));
    element.onBeforeRender = jest.fn();
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
    const onError = jest.fn();
    const element = chatElement({ ...config, onError });
    element.onBeforeRender = jest.fn();
    document.body.appendChild(element);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0].message).toContain('with no namespace');
    expect(element.onBeforeRender).not.toHaveBeenCalled();
  });

  it('two reuse-off shells on one namespace each run their own chat', async () => {
    const config = { namespace: 'shared', messaging: { skipWelcome: true } };
    const claim = jest.spyOn(chatRegistry, 'claim');
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

  it('only a reuse-on shell claims its namespace', async () => {
    const claim = jest.spyOn(chatRegistry, 'claim');
    await mountElement({ messaging: { skipWelcome: true } });
    expect(claim).not.toHaveBeenCalled();

    const namespace = freshNamespace();
    await mountElement(reuseConfig(namespace));
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim.mock.calls[0][0]).toBe(namespace);
  });
});

describe('a new mount starts its own view', () => {
  it('reopens what was showing, with the old mount’s panels closed', async () => {
    const namespace = freshNamespace();
    const first = await mountElement(reuseConfig(namespace));
    await first.instance.changeView(ViewType.MAIN_WINDOW);
    first.instance.customPanels.getPanel(PanelType.DEFAULT).open();
    const view = () => (managerOf(first.instance).store.getState() as any).view;
    expect(view().customPanelState.isOpen).toBe(true);

    await unmount(first);
    const second = await mountElement(reuseConfig(namespace));

    expect(second.instance.getState().viewState.mainWindow).toBe(true);
    expect(view().customPanelState.isOpen).toBe(false);
  });
});

describe('adoption replaces the config (O15)', () => {
  it('a field the new mount leaves out returns to its default', async () => {
    const namespace = freshNamespace();
    const first = await mountElement(
      reuseConfig(namespace, {
        assistantName: 'Ada',
        header: { title: 'First' },
      })
    );
    await unmount(first);
    const second = await mountElement(reuseConfig(namespace));

    const state = managerOf(second.instance).store.getState() as any;
    expect(state.config.public.assistantName).toBe('watsonx');
    expect(state.config.public.header).toBeUndefined();
    expect(state.view.derivedConfig.header.title).toBeUndefined();
  });
});

describe('lifecycle on a web component (O18)', () => {
  it('as a JSON attribute', async () => {
    const namespace = freshNamespace();
    const element = document.createElement(
      'cds-aichat-container'
    ) as ChatElement;
    element.config = {
      ...createBaseConfig(),
      messaging: { skipWelcome: true },
    };
    element.renderer = rendererFor(element);
    element.setAttribute('namespace', namespace);
    element.setAttribute('lifecycle', '{"reuseInstance":true}');
    const claim = jest.spyOn(chatRegistry, 'claim');
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalled());

    expect(element.lifecycle).toEqual({ reuseInstance: true });
    expect(claim).toHaveBeenCalledWith(namespace, expect.anything());
  });

  it('as a property', async () => {
    const namespace = freshNamespace();
    const element = chatElement({ messaging: { skipWelcome: true } });
    element.namespace = namespace;
    element.lifecycle = { reuseInstance: true };
    const claim = jest.spyOn(chatRegistry, 'claim');
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalled());

    expect(claim).toHaveBeenCalledWith(namespace, expect.anything());
  });
});

describe('what a host sees (O19)', () => {
  /** The event types a mount sees, from onBeforeRender to its first render. */
  async function observe(config: Partial<PublicConfig>) {
    const seen: string[] = [];
    const mounted = await mountElement(config, (instance) =>
      instance.on(
        Object.values(BusEventType).map((type) => ({
          type,
          handler: () => {
            seen.push(type);
          },
        }))
      )
    );
    await flushMicrotasks();
    return { mounted, seen };
  }

  it('a reused chat fires the same events and publishes the same state as a fresh one', async () => {
    // Today's remount: a new chat on a namespace with a saved session.
    const freshConfig = {
      namespace: freshNamespace(),
      messaging: { skipWelcome: true },
    };
    await unmount(await mountElement(freshConfig));
    const fresh = await observe(freshConfig);

    const namespace = freshNamespace();
    const first = await mountElement(reuseConfig(namespace));
    await unmount(first);
    const reused = await observe(reuseConfig(namespace));

    expect(managerOf(reused.mounted.instance)).toBe(managerOf(first.instance));
    expect(reused.seen).toEqual(fresh.seen);
    expect(reused.mounted.instance.state.get()).toEqual(
      fresh.mounted.instance.state.get()
    );
  });

  it('a handler added twice and removed once still stops at release', async () => {
    const namespace = freshNamespace();
    const handler = jest.fn();
    const first = await mountElement(reuseConfig(namespace), (instance) => {
      instance.on({ type: BusEventType.RECEIVE, handler });
      instance.on({ type: BusEventType.RECEIVE, handler });
      instance.off({ type: BusEventType.RECEIVE, handler });
    });
    await unmount(first);
    const second = await mountElement(reuseConfig(namespace));
    // A late subscription through the released instance adds nothing.
    const late = jest.fn();
    first.instance.on({ type: BusEventType.RECEIVE, handler: late });

    await addMessage(second.instance, 'after');

    expect(handler).not.toHaveBeenCalled();
    expect(late).not.toHaveBeenCalled();
  });

  it('handlers from the released mount stop; the new mount’s run once', async () => {
    const namespace = freshNamespace();
    const oldHandler = jest.fn();
    const oldOnce = jest.fn();
    const first = await mountElement(reuseConfig(namespace), (instance) => {
      instance.on({ type: BusEventType.RECEIVE, handler: oldHandler });
      instance.once({ type: BusEventType.RECEIVE, handler: oldOnce });
    });
    await unmount(first);

    const newHandler = jest.fn();
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
  it('moves the chat, so a mount on the old namespace starts a new one', async () => {
    const from = freshNamespace();
    const to = freshNamespace();
    const mounted = await mountElement(reuseConfig(from));
    const chat = managerOf(mounted.instance);

    mounted.element.namespace = to;
    await waitFor(() =>
      expect(chat.store.getState().config.public.namespace).toBe(to)
    );
    const other = await mountElement(reuseConfig(from));

    expect(managerOf(other.instance)).not.toBe(chat);
  });

  it('onto a held namespace reports and changes nothing', async () => {
    const held = freshNamespace();
    const own = freshNamespace();
    await mountElement(reuseConfig(held));
    const onError = jest.fn();
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
  it('an SDK create in a released prebuilt chat’s window starts its own', async () => {
    const namespace = freshNamespace();
    const mounted = await mountElement(reuseConfig(namespace));
    const prebuilt = managerOf(mounted.instance);
    await unmount(mounted);

    const handle = await createChatSDK({
      namespace,
      messaging: { skipWelcome: true },
    });

    expect(prebuilt.isShutdown).toBe(true);
    expect(handle.state.get().messages).toEqual([]);
    handle.destroy();
  });

  it('an SDK create on a mounted reuse-on shell’s namespace rejects', async () => {
    const namespace = freshNamespace();
    await mountElement(reuseConfig(namespace));

    await expect(createChatSDK({ namespace })).rejects.toThrow(
      `"${namespace}"`
    );
  });
});
