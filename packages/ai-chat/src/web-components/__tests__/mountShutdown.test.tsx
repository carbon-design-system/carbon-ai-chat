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

import type { MockInstance } from 'vitest';
import { waitFor } from '@testing-library/react';

import '../cds-aichat-container';
import type ChatElement from '../cds-aichat-container/cds-aichat-container';
import { ServiceManager } from '../../sdk/services/ServiceManager';
import type { ChatRenderer } from '../shared/react-renderer';
import type { PublicConfig } from '../../types/config/PublicConfig';
import type { ChatInstance } from '../../types/instance/ChatInstance';
import { ViewType } from '../../types/instance/apiTypes';
import { BusEventType } from '../../types/events/eventBusTypes';
import {
  MessageResponseTypes,
  type MessageRequest,
} from '../../types/messaging/Messages';
import type { CustomSendMessageOptions } from '../../types/config/MessagingConfig';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';

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
  element.onAfterRender = vi.fn();
  document.body.appendChild(element);
  await waitFor(() => expect(element.onAfterRender).toHaveBeenCalled(), {
    timeout: 5000,
  });
  return { element, instance };
}

let shutdown: MockInstance;
const shutDownManagers = () =>
  shutdown.mock.contexts as unknown as ServiceManager[];

describe('shutdown through the mount path', () => {
  beforeEach(() => {
    setupBeforeEach();
    sessionStorage.clear();
    shutdown = vi.spyOn(ServiceManager.prototype, 'shutdown');
  });
  afterEach(() => {
    setupAfterEach();
    shutdown.mockRestore();
    vi.restoreAllMocks();
  });

  describe('removing any host shuts its chat down (O8)', () => {
    it('aborts a pending send when renderer cleanup throws on removal', async () => {
      const error = new Error('Renderer cleanup failed during removal');
      const mount = renderer.mount(document.createElement('div'));
      vi.spyOn(renderer, 'mount').mockReturnValueOnce({
        ...mount,
        unmount: () => {
          throw error;
        },
      });
      let requestSignal: AbortSignal;
      const { element, instance } = await mountElement({
        messaging: {
          skipWelcome: true,
          customSendMessage: (_request, options) => {
            requestSignal = options.signal;
            return new Promise<never>(() => {});
          },
        },
      });
      await instance.changeView(ViewType.MAIN_WINDOW);
      void instance.send('pending during removal').catch(() => {});
      await waitFor(() => expect(requestSignal).toBeDefined());
      expect(requestSignal.aborted).toBe(false);

      const errors: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        if (event.error === error) {
          errors.push(event.error);
          event.preventDefault();
        }
      };
      window.addEventListener('error', onError);
      try {
        element.remove();
        await flushMicrotasks();
        expect(errors).toEqual([error]);
        expect(requestSignal.aborted).toBe(true);
      } finally {
        window.removeEventListener('error', onError);
      }
    });

    it('retires reused mount listeners when renderer cleanup throws', async () => {
      const error = new Error('Reusable renderer cleanup failed');
      const mount = renderer.mount(document.createElement('div'));
      vi.spyOn(renderer, 'mount').mockReturnValueOnce({
        ...mount,
        unmount: () => {
          throw error;
        },
      });
      const config: Partial<PublicConfig> = {
        namespace: 'cleanup-error-release',
        lifecycle: { reuseInstance: true, releaseGraceMs: 2000 },
        messaging: { skipWelcome: true },
      };
      const first = await mountElement(config);
      await first.instance.messaging.addMessage({
        id: 'before-cleanup-error',
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'Retained' },
          ],
        },
      });
      const oldOn = vi.fn();
      const oldOnce = vi.fn();
      const oldState = vi.fn();
      first.instance.on({ type: BusEventType.VIEW_CHANGE, handler: oldOn });
      first.instance.once({ type: BusEventType.VIEW_CHANGE, handler: oldOnce });
      first.instance.state.subscribe(oldState);
      const errors: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        if (event.error === error) {
          errors.push(event.error);
          event.preventDefault();
        }
      };
      let second: { element: ChatElement; instance: ChatInstance };
      window.addEventListener('error', onError);
      try {
        first.element.remove();
        await flushMicrotasks();
        expect(errors).toEqual([error]);
        oldOn.mockClear();
        oldOnce.mockClear();
        oldState.mockClear();
        const lateOn = vi.fn();
        const lateOnce = vi.fn();
        const lateState = vi.fn();
        first.instance.on({ type: BusEventType.VIEW_CHANGE, handler: lateOn });
        first.instance.once({
          type: BusEventType.VIEW_CHANGE,
          handler: lateOnce,
        });
        first.instance.state.subscribe(lateState);
        lateState.mockClear();
        second = await mountElement({
          ...config,
          lifecycle: {
            reuseInstance: true,
            releaseGraceMs: 2000,
            onUnmount: 'destroy',
          },
        });
        expect(
          second.instance.state
            .get()
            .messages.some(({ id }) => id === 'before-cleanup-error')
        ).toBe(true);
        const liveOn = vi.fn();
        const liveState = vi.fn();
        second.instance.on({ type: BusEventType.VIEW_CHANGE, handler: liveOn });
        second.instance.state.subscribe(liveState);
        liveState.mockClear();
        await second.instance.changeView(ViewType.MAIN_WINDOW);
        await second.instance.messaging.addMessage({
          id: 'after-cleanup-error',
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: 'Still live' },
            ],
          },
        });
        expect(liveOn).toHaveBeenCalledTimes(1);
        expect(liveState).toHaveBeenCalled();
        expect({
          oldOn: oldOn.mock.calls.length,
          oldOnce: oldOnce.mock.calls.length,
          oldState: oldState.mock.calls.length,
          lateOn: lateOn.mock.calls.length,
          lateOnce: lateOnce.mock.calls.length,
          lateState: lateState.mock.calls.length,
        }).toEqual({
          oldOn: 0,
          oldOnce: 0,
          oldState: 0,
          lateOn: 0,
          lateOnce: 0,
          lateState: 0,
        });
      } finally {
        if (second) {
          second.element.remove();
          await flushMicrotasks();
        }
        window.removeEventListener('error', onError);
      }
    });

    it('destroys a reused chat when renderer cleanup throws', async () => {
      const error = new Error('Destroyed renderer cleanup failed');
      const mount = renderer.mount(document.createElement('div'));
      vi.spyOn(renderer, 'mount').mockReturnValueOnce({
        ...mount,
        unmount: () => {
          throw error;
        },
      });
      let requestSignal: AbortSignal;
      const config: Partial<PublicConfig> = {
        namespace: 'cleanup-error-destroy',
        lifecycle: {
          reuseInstance: true,
          releaseGraceMs: 2000,
          onUnmount: 'destroy',
        },
        messaging: {
          skipWelcome: true,
          customSendMessage: (_request, options) => {
            requestSignal = options.signal;
            return new Promise<never>(() => {});
          },
        },
      };
      const first = await mountElement(config);
      await first.instance.changeView(ViewType.MAIN_WINDOW);
      await first.instance.messaging.addMessage({
        id: 'before-error-destroy',
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'Will end' },
          ],
        },
      });
      void first.instance.send('pending during destroy').catch(() => {});
      await waitFor(() => expect(requestSignal).toBeDefined());
      expect(requestSignal.aborted).toBe(false);
      const errors: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        if (event.error === error) {
          errors.push(event.error);
          event.preventDefault();
        }
      };
      let second: { element: ChatElement; instance: ChatInstance };
      window.addEventListener('error', onError);
      try {
        first.element.remove();
        await flushMicrotasks();
        expect(errors).toEqual([error]);
        await waitFor(() => expect(requestSignal.aborted).toBe(true));
        second = await mountElement({
          ...config,
          messaging: { skipWelcome: true },
        });
        expect(second.instance).not.toBe(first.instance);
        expect(second.instance.state.get().messages).toEqual([]);
      } finally {
        if (second) {
          second.element.remove();
          await flushMicrotasks();
        }
        window.removeEventListener('error', onError);
      }
    });
  });

  describe('a later mount on a fresh instance (O11)', () => {
    it('restores the saved session and reloads history', async () => {
      const held: Array<{ signal: AbortSignal }> = [];
      const customLoadHistory = vi.fn(async (): Promise<never[]> => []);
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
  });

  it('leaves no live work after repeated mount cycles (O12)', async () => {
    const intervals = new Set<unknown>();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const resize = { added: 0, removed: 0 };
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
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
