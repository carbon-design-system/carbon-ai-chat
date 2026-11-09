/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Removing a chat's host shuts its services down through the one mount path
 * every host shares (#1681 O8, O9, O11, O12).
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import '../../../src/web-components/cds-aichat-container';
import type ChatElement from '../../../src/web-components/cds-aichat-container/cds-aichat-container';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import * as chatBoot from '../../../src/chat/utils/chatBoot';
import { ServiceManager } from '../../../src/shared/services/ServiceManager';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import type { ChatRenderer } from '../../../src/web-components/shared/react-renderer';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../../src/types/config/ServiceDeskConfig';
import { ViewType } from '../../../src/types/instance/apiTypes';
import {
  MessageResponseTypes,
  UserType,
  type MessageRequest,
} from '../../../src/types/messaging/Messages';
import type { CustomSendMessageOptions } from '../../../src/types/config/MessagingConfig';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

/** A renderer that renders nothing and reports the first commit at once. */
const renderer: ChatRenderer = {
  mount: () => ({
    render(_App, inputs) {
      if (inputs.initialViewReady) {
        queueMicrotask(inputs.onInitialViewCommitted);
      }
    },
    unmount: () => {},
  }),
};

function chatElement(config: Partial<PublicConfig> = {}) {
  const element = document.createElement('cds-aichat-container') as ChatElement;
  element.config = { ...createBaseConfig(), ...config };
  element.renderer = renderer;
  return element;
}

/** Lets a removed element release its mount, which it defers a microtask. */
async function flushMicrotasks(count = 10) {
  for (let i = 0; i < count; i++) {
    await Promise.resolve();
  }
}

/** Mounts a chat element and resolves with its instance once it rendered. */
async function mountElement(config: Partial<PublicConfig> = {}) {
  const element = chatElement(config);
  let instance: ChatInstance;
  element.onBeforeRender = (value) => {
    instance = value;
  };
  element.onAfterRender = jest.fn();
  document.body.appendChild(element);
  await waitFor(() => expect(element.onAfterRender).toHaveBeenCalled(), {
    timeout: 5000,
  });
  return { element, instance };
}

let shutdown: jest.SpyInstance;
const shutDownManagers = () =>
  shutdown.mock.contexts as unknown as ServiceManager[];

describe('shutdown through the mount path', () => {
  beforeEach(() => {
    setupBeforeEach();
    sessionStorage.clear();
    shutdown = jest.spyOn(ServiceManager.prototype, 'shutdown');
  });
  afterEach(() => {
    setupAfterEach();
    shutdown.mockRestore();
    jest.restoreAllMocks();
  });

  describe('removing any host shuts its chat down (O8)', () => {
    it('a web component', async () => {
      const { element } = await mountElement();
      expect(shutdown).not.toHaveBeenCalled();

      element.remove();
      await flushMicrotasks();

      expect(shutdown).toHaveBeenCalledTimes(1);
      expect(shutDownManagers()[0].isShutdown).toBe(true);
    });

    it('a web component moved within one task keeps running', async () => {
      const { element } = await mountElement();
      const other = document.createElement('div');
      document.body.appendChild(other);

      other.appendChild(element);
      await flushMicrotasks();

      expect(shutdown).not.toHaveBeenCalled();
    });

    it.each([
      ['ChatContainer', ChatContainer],
      ['ChatCustomElement', ChatCustomElement],
    ])('a React %s', async (_name, Host) => {
      let instance: ChatInstance;
      const onAfterRender = jest.fn();
      const props = {
        ...createBaseConfig(),
        onBeforeRender: (value: ChatInstance) => {
          instance = value;
        },
        onAfterRender,
        ...(Host === ChatCustomElement
          ? { className: 'custom', style: { height: '400px' } }
          : {}),
      };
      const { unmount } = render(<Host {...(props as any)} />);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      expect(instance).toBeDefined();

      unmount();
      await flushMicrotasks();

      expect(shutdown).toHaveBeenCalledTimes(1);
    });
  });

  describe('removal during startup (O9)', () => {
    it('shuts down services created after the host left', async () => {
      const original = chatBoot.bootPrebuiltChat;
      const gate = resolvablePromise<void>();
      jest
        .spyOn(chatBoot, 'bootPrebuiltChat')
        .mockImplementationOnce(async (options) => {
          await gate;
          return original(options);
        });
      const element = chatElement();
      element.onBeforeRender = jest.fn();
      document.body.appendChild(element);
      await waitFor(() => expect(chatBoot.bootPrebuiltChat).toHaveBeenCalled());

      element.remove();
      await flushMicrotasks();
      gate.doResolve();
      await waitFor(() => expect(shutdown).toHaveBeenCalledTimes(1));

      expect(shutDownManagers()[0].isShutdown).toBe(true);
      expect(element.onBeforeRender).not.toHaveBeenCalled();
    });

    it('shuts down a chat whose host left during onBeforeRender', async () => {
      const gate = resolvablePromise<void>();
      const element = chatElement();
      element.onBeforeRender = jest.fn(() => gate);
      element.onAfterRender = jest.fn();
      document.body.appendChild(element);
      await waitFor(() => expect(element.onBeforeRender).toHaveBeenCalled());
      expect(shutdown).not.toHaveBeenCalled();

      element.remove();
      await flushMicrotasks();
      gate.doResolve();
      await flushMicrotasks();

      expect(shutdown).toHaveBeenCalledTimes(1);
      expect(element.onAfterRender).not.toHaveBeenCalled();
    });
  });

  describe('a later mount on a fresh instance (O11)', () => {
    it('restores the saved session and reloads history', async () => {
      const held: Array<{ signal: AbortSignal }> = [];
      const customLoadHistory = jest.fn(async (): Promise<never[]> => []);
      const config: Partial<PublicConfig> = {
        messaging: {
          skipWelcome: true,
          customLoadHistory,
          customSendMessage: (
            _request: MessageRequest,
            options: CustomSendMessageOptions
          ) => {
            held.push({ signal: options.signal });
            return new Promise(() => {});
          },
        },
      };
      const first = await mountElement(config);
      await first.instance.changeView(ViewType.MAIN_WINDOW);
      void first.instance.send('hello').catch(() => {});
      await waitFor(() => expect(held).toHaveLength(1));
      const saved = { ...sessionStorage };

      first.element.remove();
      await flushMicrotasks();
      await shutdown.mock.results[0].value;
      expect(held[0].signal.aborted).toBe(true);
      expect({ ...sessionStorage }).toEqual(saved);

      const second = await mountElement(config);
      expect(second.instance).not.toBe(first.instance);
      // The open window was saved, so the new chat opens and loads history.
      await waitFor(() => expect(customLoadHistory).toHaveBeenCalledTimes(2));
      expect(second.instance.getState().viewState.mainWindow).toBe(true);
      second.element.remove();
    });

    it('reconnects to the agent the removed chat left connected', async () => {
      let callback: ServiceDeskCallback;
      const desks: Array<{ endChat: jest.Mock; reconnect: jest.Mock }> = [];
      const config: Partial<PublicConfig> = {
        messaging: { skipWelcome: true },
        serviceDeskFactory: async (parameters) => {
          callback = parameters.callback;
          const desk = {
            getName: () => 'Test desk',
            startChat: jest.fn(async () => {}),
            endChat: jest.fn(async () => {}),
            sendMessageToAgent: jest.fn(async () => {}),
            reconnect: jest.fn(async () => true),
          };
          desks.push(desk);
          return desk as unknown as ServiceDesk;
        },
      };
      const first = await mountElement(config);
      await first.instance.changeView(ViewType.MAIN_WINDOW);
      await waitFor(() => expect(desks).toHaveLength(1));
      const service = (first.instance.serviceManager.messageCoordinator as any)
        .serviceManager.humanAgentService;
      service.chatStarted = true;
      await callback.agentJoined({
        id: 'dana',
        nickname: 'Dana',
        user_type: UserType.HUMAN,
      });
      expect(first.instance.getState().humanAgent.isConnected).toBe(true);

      first.element.remove();
      await flushMicrotasks();
      await shutdown.mock.results[0].value;
      expect(desks[0].endChat).not.toHaveBeenCalled();

      const second = await mountElement(config);
      await waitFor(() => expect(desks).toHaveLength(2));
      await waitFor(() => expect(desks[1].reconnect).toHaveBeenCalledTimes(1));
      expect(desks[0].endChat).not.toHaveBeenCalled();
      expect(second.instance.getState().humanAgent.isConnected).toBe(true);
      second.element.remove();
    });
  });

  it('leaves no live work after repeated mount cycles (O12)', async () => {
    const intervals = new Set<unknown>();
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const resize = { added: 0, removed: 0 };
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const cycles = 4;

    for (let i = 0; i < cycles; i++) {
      const { element, instance } = await mountElement({
        messaging: { skipWelcome: true },
      });
      void instance.messaging
        .addMessage({
          id: `m-${i}`,
          output: {
            generic: [{ response_type: MessageResponseTypes.TEXT, text: 'hi' }],
          },
        })
        .catch(() => {});
      element.remove();
      await flushMicrotasks();
    }
    await Promise.all(shutdown.mock.results.map(({ value }) => value));

    setIntervalSpy.mock.results.forEach(({ value }) => intervals.add(value));
    clearIntervalSpy.mock.calls.forEach(([id]) => intervals.delete(id));
    add.mock.calls.forEach(([type]) => type === 'resize' && resize.added++);
    remove.mock.calls.forEach(
      ([type]) => type === 'resize' && resize.removed++
    );

    expect(shutdown).toHaveBeenCalledTimes(cycles);
    expect(shutDownManagers().every((manager) => manager.isShutdown)).toBe(
      true
    );
    // The theme watcher polls on an interval in inherit mode; none survive.
    expect(setIntervalSpy).toHaveBeenCalled();
    expect([...intervals]).toEqual([]);
    expect(resize.added).toBe(cycles);
    expect(resize.removed).toBe(cycles);
  });
});
