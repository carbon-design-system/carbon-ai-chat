/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `cds-aichat-container` owns startup. These cases drive it with a renderer
 * that is not React, so each gate is visible: the renderer says when its
 * listeners are ready and when it has committed the initial view, and the
 * host holds `onBeforeRender` and `onAfterRender` until it does.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ContextConsumer } from '@lit/context';
import { LitElement } from 'lit';
import * as richRuntimeLoader from '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line-rich-loader.js';
import frLocaleData from 'dayjs/locale/fr.js';

import '../../../src/web-components/cds-aichat-container';
import type ChatElement from '../../../src/web-components/cds-aichat-container/cds-aichat-container';
import { serviceManagerContext } from '../../../src/web-components/shared/service-manager-context';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import * as extensionsLoader from '../../../src/chat/components/input/buildExtensionsLoader';
import * as chatBoot from '../../../src/chat/utils/chatBoot';
import { localeLoaders } from '../../../src/chat/utils/languageUtils';
import type { ChatAppEntryProps } from '../../../src/chat/ChatAppEntry';
import type { ChatRenderer } from '../../../src/web-components/shared/react-renderer';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import {
  BusEventType,
  BusEventUserDefinedResponse,
} from '../../../src/types/events/eventBusTypes';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class StartupServicesProbe extends LitElement {
  services = new ContextConsumer(this, {
    context: serviceManagerContext,
    subscribe: true,
  });
}
customElements.define('test-startup-services-probe', StartupServicesProbe);

/**
 * A renderer that records what it is asked to render. It reports listeners
 * and commits only when the test tells it to, unless `autoSignal` is set.
 */
function createTestRenderer({
  autoSignal = true,
  onMount,
  onRender,
}: {
  autoSignal?: boolean;
  onMount?: () => void;
  onRender?: (inputs: ChatAppEntryProps) => void;
} = {}) {
  const renders: ChatAppEntryProps[] = [];
  const mount = jest.fn();
  const unmount = jest.fn();
  let signalling = autoSignal;
  const renderer: ChatRenderer = {
    mount(target) {
      mount(target);
      onMount?.();
      return {
        render(inputs) {
          renders.push(inputs);
          onRender?.(inputs);
          if (signalling) {
            queueMicrotask(inputs.onListenersReady);
            if (inputs.initialViewReady) {
              queueMicrotask(inputs.onInitialViewCommitted);
            }
          }
        },
        unmount,
      };
    },
  };
  const last = () => renders[renders.length - 1];
  const setAutoSignal = (value: boolean) => {
    signalling = value;
  };
  return { renderer, renders, mount, unmount, last, setAutoSignal };
}

function createChatElement(renderer: ChatRenderer, config: PublicConfig = {}) {
  const element = document.createElement('cds-aichat-container') as ChatElement;
  element.config = { ...createBaseConfig(), ...config };
  element.renderer = renderer;
  return element;
}

async function flushMicrotasks(count = 10) {
  for (let i = 0; i < count; i++) {
    await Promise.resolve();
  }
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

describe('cds-aichat-container startup', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('starts one service manager and gates both callbacks on the renderer', async () => {
    const test = createTestRenderer({ autoSignal: false });
    const order: string[] = [];
    const element = createChatElement(test.renderer);
    element.onBeforeRender = jest.fn(() => {
      order.push('before');
    });
    element.onAfterRender = jest.fn(() => {
      order.push('after');
    });
    document.body.appendChild(element);

    await waitFor(() => expect(test.renders.length).toBeGreaterThan(0), {
      timeout: 5000,
    });
    const first = test.last();
    expect(first.renderReady).toBe(false);
    await settle();
    expect(element.onBeforeRender).not.toHaveBeenCalled();

    order.push('listeners');
    first.onListenersReady();
    await waitFor(() => expect(test.last().initialViewReady).toBe(true));
    expect(test.last().renderReady).toBe(true);
    expect(element.onBeforeRender).toHaveBeenCalledWith(first.instance);

    await settle();
    expect(element.onAfterRender).not.toHaveBeenCalled();
    order.push('commit');
    test.last().onInitialViewCommitted();
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalledTimes(1));

    expect(order).toEqual(['listeners', 'before', 'commit', 'after']);
    expect(test.mount).toHaveBeenCalledTimes(1);
    expect(
      new Set(test.renders.map((inputs) => inputs.serviceManager)).size
    ).toBe(1);
    // `instance.serviceManager` is a copy without the instance, so compare a
    // field both hold.
    expect(
      first.instance.serviceManager.store === first.serviceManager.store
    ).toBe(true);
  });

  it('stays unrendered when onBeforeRender rejects, and a fresh mount retries', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const test = createTestRenderer();
    const element = createChatElement(test.renderer);
    const failure = new Error('host failed');
    element.onBeforeRender = jest.fn().mockRejectedValueOnce(failure);
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Error initializing chat:',
        failure
      )
    );
    element.config = { ...element.config, assistantName: 'Changed' };
    await settle();
    expect(test.renders.every((inputs) => !inputs.renderReady)).toBe(true);
    expect(element.onAfterRender).not.toHaveBeenCalled();
    expect(element.onBeforeRender).toHaveBeenCalledTimes(1);

    element.remove();
    document.body.appendChild(element);
    await waitFor(
      () => expect(element.onAfterRender).toHaveBeenCalledTimes(1),
      {
        timeout: 5000,
      }
    );
    consoleError.mockRestore();
  });

  it('waits for rich input added during before-render and applies later config before rendering', async () => {
    const beforeGate = resolvablePromise();
    const runtimeGate = resolvablePromise();
    const extensionsGate = resolvablePromise();
    const preloadRuntime = jest
      .spyOn(richRuntimeLoader, 'preloadPromptLineRich')
      .mockReturnValue(runtimeGate);
    const preloadExtensions = jest
      .spyOn(extensionsLoader, 'preloadBuildCarbonExtensions')
      .mockReturnValue(extensionsGate);
    const renderedConfigs: PublicConfig[] = [];
    const test = createTestRenderer({
      onRender: (inputs) => {
        if (inputs.renderReady) {
          renderedConfigs.push(
            inputs.serviceManager.store.getState().config.public
          );
        }
      },
    });
    const element = createChatElement(test.renderer);
    element.onBeforeRender = jest.fn(() => beforeGate);
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);

    try {
      await waitFor(() => expect(element.onBeforeRender).toHaveBeenCalled());
      const instance = test.last().instance;
      element.input = { mention: { trigger: '@', items: [] } };
      await element.updateComplete;
      beforeGate.doResolve();
      await waitFor(() => {
        expect(preloadRuntime).toHaveBeenCalledTimes(1);
        expect(preloadExtensions).toHaveBeenCalledTimes(1);
      });

      element.assistantName = 'Latest';
      element.input = { command: { trigger: '/', items: [] } };
      await element.updateComplete;
      expect(renderedConfigs).toHaveLength(0);
      expect(element.onAfterRender).not.toHaveBeenCalled();

      runtimeGate.doResolve();
      await settle();
      expect(renderedConfigs).toHaveLength(0);
      expect(element.onAfterRender).not.toHaveBeenCalled();

      extensionsGate.doResolve();
      await waitFor(() =>
        expect(element.onAfterRender).toHaveBeenCalledTimes(1)
      );
      expect(renderedConfigs[0].assistantName).toBe('Latest');
      expect(renderedConfigs[0].input).toEqual(element.input);
      expect(test.last().instance).toBe(instance);
      expect(element.onBeforeRender).toHaveBeenCalledTimes(1);
    } finally {
      element.remove();
      beforeGate.doResolve();
      runtimeGate.doResolve();
      extensionsGate.doResolve();
      preloadRuntime.mockRestore();
      preloadExtensions.mockRestore();
    }
  });

  it.each(['locale loading', 'before-render'])(
    'ignores a retired %s continuation after the same host mounts again',
    async (phase) => {
      const localeGate = resolvablePromise<ILocale>();
      const beforeGate = resolvablePromise();
      const loadLocale = jest
        .spyOn(localeLoaders, 'fr')
        .mockReturnValueOnce(localeGate);
      const initialize = jest.spyOn(chatBoot, 'initServiceManagerAndInstance');
      const test = createTestRenderer();
      const element = createChatElement(test.renderer, {
        locale: phase === 'locale loading' ? 'fr' : 'en',
      });
      const probe = document.createElement(
        'test-startup-services-probe'
      ) as StartupServicesProbe;
      probe.slot = 'caller-owned';
      element.appendChild(probe);
      element.renderUserDefinedResponse = () => document.createElement('p');
      element.onBeforeRender = jest.fn(() =>
        phase === 'before-render' && initialize.mock.calls.length === 1
          ? beforeGate
          : undefined
      );
      element.onAfterRender = jest.fn();
      document.body.appendChild(element);

      try {
        await waitFor(() => {
          if (phase === 'locale loading') {
            expect(loadLocale).toHaveBeenCalledTimes(1);
          } else {
            expect(element.onBeforeRender).toHaveBeenCalledTimes(1);
          }
        });
        const retiredBoot: ReturnType<
          typeof chatBoot.initServiceManagerAndInstance
        > = initialize.mock.results[0].value;
        element.remove();
        expect(probe.services.value).toBeUndefined();
        document.body.appendChild(element);
        await waitFor(() =>
          expect(element.onAfterRender).toHaveBeenCalledTimes(1)
        );

        const current = test.last();
        const currentNodes = [...element.childNodes];
        const renderCount = test.renders.length;
        expect(current.serviceManager === probe.services.value).toBe(true);

        localeGate.doResolve(frLocaleData);
        beforeGate.doResolve();
        const retired = await retiredBoot;
        const event: BusEventUserDefinedResponse = {
          type: BusEventType.USER_DEFINED_RESPONSE,
          data: {
            slot: 'retired-response',
            message: {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: {},
            },
            fullMessage: { id: 'retired', output: { generic: [] } },
          },
        };
        await retired.serviceManager.eventBus.fire(event, retired.instance);
        await settle();

        expect(test.renders).toHaveLength(renderCount);
        expect(element.onBeforeRender).toHaveBeenCalledTimes(
          phase === 'locale loading' ? 1 : 2
        );
        expect(element.onAfterRender).toHaveBeenCalledTimes(1);
        expect(element.onAfterRender).toHaveBeenCalledWith(current.instance);
        expect(current.instance).not.toBe(retired.instance);
        expect(probe.services.value === current.serviceManager).toBe(true);
        expect([...element.childNodes]).toEqual(currentNodes);
        expect(element.querySelector('[slot="retired-response"]')).toBeNull();
        expect(
          Object.values(retired.instance.writeableElements).every(
            (node) => !node.parentNode
          )
        ).toBe(true);
        expect(
          Object.values(current.instance.writeableElements).every(
            (node) => node.parentNode === element
          )
        ).toBe(true);
        expect(probe.parentNode).toBe(element);
      } finally {
        element.remove();
        localeGate.doResolve(frLocaleData);
        beforeGate.doResolve();
        loadLocale.mockRestore();
        initialize.mockRestore();
      }
    }
  );

  it.each([
    ['while the renderer mounts', 'mount'],
    ['while the after-render timer is pending', 'timer'],
  ])(
    'stops a mount removed %s, and mounts fresh afterward',
    async (_label, phase) => {
      let removeWhileMounting = phase === 'mount';
      const test = createTestRenderer({
        autoSignal: phase !== 'timer',
        onMount: () => {
          if (removeWhileMounting) {
            removeWhileMounting = false;
            element.remove();
          }
        },
      });
      const instances: ChatInstance[] = [];
      const element = createChatElement(test.renderer);
      element.onBeforeRender = (instance) => {
        instances.push(instance);
      };
      element.onAfterRender = jest.fn();
      document.body.appendChild(element);

      if (phase === 'mount') {
        // The hook above already removed it inside `mount`, before services
        // started; wait for that to have happened.
        await waitFor(() => expect(test.mount).toHaveBeenCalled(), {
          timeout: 5000,
        });
      } else {
        await waitFor(() => expect(test.renders.length).toBeGreaterThan(0), {
          timeout: 5000,
        });
        test.last().onListenersReady();
        await waitFor(() => expect(test.last().initialViewReady).toBe(true));
        test.last().onInitialViewCommitted();
        await flushMicrotasks();
      }
      const rendersBefore = test.renders.length;

      element.remove();
      await settle();

      expect(test.renders.length).toBe(rendersBefore);
      expect(element.onAfterRender).not.toHaveBeenCalled();
      expect(test.unmount).toHaveBeenCalledTimes(1);
      expect(instances.length).toBe(phase === 'mount' ? 0 : 1);

      test.setAutoSignal(true);
      document.body.appendChild(element);
      await waitFor(
        () => expect(element.onAfterRender).toHaveBeenCalledTimes(1),
        {
          timeout: 5000,
        }
      );
      // Only the phases that reached the host's callback have a retired
      // instance to differ from.
      expect(instances).toHaveLength(phase === 'mount' ? 1 : 2);
      if (instances.length === 2) {
        expect(instances[1] === instances[0]).toBe(false);
      }
    }
  );

  it('feeds page visibility and window size to the current mount only', async () => {
    const test = createTestRenderer();
    const element = createChatElement(test.renderer);
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalled(), {
      timeout: 5000,
    });
    const { serviceManager } = test.last();

    const setVisibility = (state: DocumentVisibilityState) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    };

    setVisibility('hidden');
    expect(serviceManager.store.getState().isBrowserPageVisible).toBe(false);

    const rendersBefore = test.renders.length;
    window.dispatchEvent(new Event('resize'));
    expect(test.renders.length).toBe(rendersBefore + 1);

    element.remove();
    setVisibility('visible');
    window.dispatchEvent(new Event('resize'));
    expect(serviceManager.store.getState().isBrowserPageVisible).toBe(false);
    expect(test.renders.length).toBe(rendersBefore + 1);
  });

  it('stops the theme watcher when the mount goes', async () => {
    const test = createTestRenderer();
    const element = createChatElement(test.renderer);
    element.onAfterRender = jest.fn();
    document.body.appendChild(element);
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalled(), {
      timeout: 5000,
    });

    // The watcher polls on an interval and observes the document, so a mount
    // that never stops it keeps both running for the life of the page.
    const { themeWatcherService } = test.last().serviceManager;
    const stopWatching = jest.spyOn(themeWatcherService, 'stopWatching');

    element.remove();

    expect(stopWatching).toHaveBeenCalled();
  });

  it('keeps extension content the host emits from onBeforeRender', async () => {
    const onAfterRender = jest.fn();
    render(
      <ChatContainer
        {...createBaseConfig()}
        openChatByDefault
        onBeforeRender={async (instance) => {
          const event: BusEventUserDefinedResponse = {
            type: BusEventType.USER_DEFINED_RESPONSE,
            data: {
              slot: 'emitted-early',
              message: {
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: {},
              },
              fullMessage: { id: 'early', output: { generic: [] } },
            },
          };
          await instance.serviceManager.eventBus.fire(event, instance);
        }}
        onAfterRender={onAfterRender}
        renderUserDefinedResponse={() => <p data-probe="early">early</p>}
      />
    );

    await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
      timeout: 5000,
    });
    expect(document.querySelector('[data-probe="early"]')).not.toBeNull();
  });
});
