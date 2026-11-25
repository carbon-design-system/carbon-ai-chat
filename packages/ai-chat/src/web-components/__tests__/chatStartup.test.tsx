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
 * that is not React. Native listeners precede `onBeforeRender`; only the
 * initial-view commit waits for the renderer.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ContextConsumer } from '@lit/context';
import { LitElement } from 'lit';
import * as richRuntimeLoader from '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line-rich-loader.js';
import frLocaleData from 'dayjs/locale/fr.js';

import '../cds-aichat-container';
import * as containerModule from '../cds-aichat-container/cds-aichat-container';
import '../cds-aichat-custom-element';
import type ChatElement from '../cds-aichat-container/cds-aichat-container';
import { ChatCustomElement } from '../../react/ChatCustomElement';
import { chatMountStateContext } from '../shared/chat-mount-state-context';
import { ChatContainer } from '../../react/ChatContainer';
import { resolvablePromise } from '../../sdk/utils/resolvablePromise';
import * as extensionsLoader from '../../chat/components/input/buildExtensionsLoader';
import * as chatBoot from '../../chat/utils/chatBoot';
import { localeLoaders } from '../../sdk/utils/languageUtils';
import type { ChatAppEntryProps } from '../../chat/ChatAppEntry';
import type { ChatRenderer } from '../shared/react-renderer';
import { ChatInstance } from '../../types/instance/ChatInstance';
import { PublicConfig } from '../../types/config/PublicConfig';
import {
  BusEventType,
  BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import { MessageResponseTypes } from '../../types/messaging/Messages';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { chatStore } from '../../chat/services/attachChatView';

class StartupServicesProbe extends LitElement {
  services = new ContextConsumer(this, {
    context: chatMountStateContext,
    subscribe: true,
  });
}
customElements.define('test-startup-services-probe', StartupServicesProbe);

/**
 * A renderer that reports initial-view commits only when the test tells it
 * to, unless `autoSignal` is set.
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
  const mount = vi.fn();
  const unmount = vi.fn();
  let signalling = autoSignal;
  const renderer: ChatRenderer = {
    mount(target) {
      mount(target);
      onMount?.();
      return {
        render(_App, inputs) {
          renders.push(inputs);
          onRender?.(inputs);
          if (signalling) {
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

/** Also lets a removed element release its mount, which it defers a microtask. */
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

  it('connects native resources before before-render and waits separately for the initial React commit', async () => {
    const test = createTestRenderer({ autoSignal: false });
    const beforeGate = resolvablePromise();
    const order: string[] = [];
    const element = createChatElement(test.renderer);
    element.onBeforeRender = vi.fn(() => {
      order.push('before');
      return beforeGate;
    });
    element.onAfterRender = vi.fn(() => {
      order.push('after');
    });
    document.body.appendChild(element);

    await waitFor(
      () => expect(element.onBeforeRender).toHaveBeenCalledTimes(1),
      {
        timeout: 5000,
      }
    );
    const first = test.last();
    expect(first.renderReady).toBe(false);
    expect(
      element.shadowRoot.querySelector('.cds-aichat--aria-announcer')
    ).toBeNull();
    await first.instance.serviceManager.eventBus.fire(
      {
        type: BusEventType.USER_DEFINED_RESPONSE,
        data: {
          slot: 'native-before-render',
          message: {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: {},
          },
          fullMessage: { id: 'native-before-render', output: { generic: [] } },
        },
      },
      first.instance
    );
    expect(
      first.hosts.getSnapshot().userDefinedResponse['native-before-render']
    ).toBeDefined();
    await settle();
    expect(test.renders.every((inputs) => !inputs.renderReady)).toBe(true);
    expect(element.onAfterRender).not.toHaveBeenCalled();

    const connectAnnouncer = vi.spyOn(first.viewState.announcer, 'connect');
    const disconnectAnnouncer = vi.spyOn(
      first.viewState.announcer,
      'disconnect'
    );
    const disconnectHosts = vi.spyOn(first.hosts, 'disconnect');
    beforeGate.doResolve();
    await waitFor(() => expect(test.last().initialViewReady).toBe(true));
    expect(test.last().renderReady).toBe(true);
    expect(element.onBeforeRender).toHaveBeenCalledWith(first.instance);
    const region = element.shadowRoot.querySelector(
      '.cds-aichat--aria-announcer'
    );
    expect(region?.parentNode).toBe(element.shadowRoot);
    expect(region?.previousSibling).toBe(
      element.shadowRoot.querySelector('.cds-aichat--react-app')
    );
    expect(connectAnnouncer).toHaveBeenCalledTimes(1);
    expect(connectAnnouncer).toHaveBeenCalledWith(region);

    await settle();
    expect(element.onAfterRender).not.toHaveBeenCalled();
    order.push('commit');
    test.last().onInitialViewCommitted();
    await waitFor(() => expect(element.onAfterRender).toHaveBeenCalledTimes(1));
    element.assistantName = 'Updated';
    await element.updateComplete;
    expect(
      element.shadowRoot.querySelectorAll('.cds-aichat--aria-announcer')
    ).toHaveLength(1);
    expect(
      element.shadowRoot.querySelector('.cds-aichat--aria-announcer')
    ).toBe(region);
    expect(connectAnnouncer).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['before', 'commit', 'after']);
    expect(test.mount).toHaveBeenCalledTimes(1);
    expect(
      new Set(test.renders.map((inputs) => inputs.serviceManager)).size
    ).toBe(1);
    expect(new Set(test.renders.map((inputs) => inputs.hosts)).size).toBe(1);
    expect(
      first.instance.serviceManager.store === first.serviceManager.store
    ).toBe(true);

    element.remove();
    await flushMicrotasks();
    expect(disconnectHosts).toHaveBeenCalledTimes(1);
    expect(disconnectAnnouncer).toHaveBeenCalledTimes(1);
    expect(region?.isConnected).toBe(false);
    expect(
      element.shadowRoot.querySelector('.cds-aichat--aria-announcer')
    ).toBeNull();
    connectAnnouncer.mockRestore();
    disconnectAnnouncer.mockRestore();
    disconnectHosts.mockRestore();
  });

  it('ignores modules loaded after detach and starts a fresh mount', async () => {
    const loadModules = containerModule.bootModuleLoader.loadBootModules;
    const modules = await loadModules();
    const gate = resolvablePromise<typeof modules>();
    const load = vi
      .spyOn(containerModule.bootModuleLoader, 'loadBootModules')
      .mockReturnValueOnce(gate);
    const test = createTestRenderer();
    const element = createChatElement(test.renderer);
    element.onBeforeRender = vi.fn();
    element.onAfterRender = vi.fn();
    document.body.appendChild(element);

    try {
      await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
      element.remove();
      await flushMicrotasks();
      gate.doResolve(modules);
      await settle();
      expect(test.renders).toHaveLength(0);
      expect(test.unmount).toHaveBeenCalledTimes(1);
      expect(element.onBeforeRender).not.toHaveBeenCalled();
      expect(element.onAfterRender).not.toHaveBeenCalled();

      document.body.appendChild(element);
      await waitFor(() =>
        expect(element.onAfterRender).toHaveBeenCalledTimes(1)
      );
      expect(element.onBeforeRender).toHaveBeenCalledTimes(1);
      expect(test.mount).toHaveBeenCalledTimes(2);
    } finally {
      element.remove();
      gate.doResolve(modules);
      load.mockRestore();
    }
  });

  it('stays unrendered when onBeforeRender rejects, and a fresh mount retries', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const test = createTestRenderer();
    const element = createChatElement(test.renderer);
    const failure = new Error('host failed');
    element.onBeforeRender = vi.fn().mockRejectedValueOnce(failure);
    element.onAfterRender = vi.fn();
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
    await flushMicrotasks();
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
    const preloadRuntime = vi
      .spyOn(richRuntimeLoader, 'preloadPromptLineRich')
      .mockReturnValue(runtimeGate);
    const preloadExtensions = vi
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
    element.onBeforeRender = vi.fn(() => beforeGate);
    element.onAfterRender = vi.fn();
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

  it.each(['locale loading', 'before-render', 'rich preload'])(
    'ignores a retired %s continuation after the same host mounts again',
    async (phase) => {
      const localeGate = resolvablePromise<ILocale>();
      const beforeGate = resolvablePromise();
      const richGate = resolvablePromise();
      const preloadRich = vi
        .spyOn(richRuntimeLoader, 'preloadPromptLineRich')
        .mockResolvedValue(undefined);
      const preloadExtensions = vi
        .spyOn(extensionsLoader, 'preloadBuildCarbonExtensions')
        .mockResolvedValue(undefined);
      if (phase === 'rich preload') {
        preloadRich.mockReturnValueOnce(richGate);
      }
      const loadLocale = vi
        .spyOn(localeLoaders, 'fr')
        .mockReturnValueOnce(localeGate);
      const initialize = vi.spyOn(chatBoot, 'bootPrebuiltChat');
      const test = createTestRenderer();
      const element = createChatElement(test.renderer, {
        locale: phase === 'locale loading' ? 'fr' : 'en',
        ...(phase === 'rich preload'
          ? { input: { mention: { trigger: '@', items: [] } } }
          : {}),
      });
      const probe = document.createElement(
        'test-startup-services-probe'
      ) as StartupServicesProbe;
      probe.slot = 'caller-owned';
      element.appendChild(probe);
      element.renderUserDefinedResponse = () => document.createElement('p');
      element.onBeforeRender = vi.fn(() =>
        phase === 'before-render' && initialize.mock.calls.length === 1
          ? beforeGate
          : undefined
      );
      element.onAfterRender = vi.fn();
      document.body.appendChild(element);

      try {
        await waitFor(() => {
          if (phase === 'locale loading') {
            expect(loadLocale).toHaveBeenCalledTimes(1);
          } else if (phase === 'rich preload') {
            expect(preloadRich).toHaveBeenCalledTimes(1);
          } else {
            expect(element.onBeforeRender).toHaveBeenCalledTimes(1);
          }
        });
        const retiredBoot: ReturnType<typeof chatBoot.bootPrebuiltChat> =
          initialize.mock.results[0].value;
        element.remove();
        await flushMicrotasks();
        document.body.appendChild(element);
        expect(probe.services.value).toBeUndefined();
        await waitFor(() =>
          expect(element.onAfterRender).toHaveBeenCalledTimes(1)
        );

        const current = test.last();
        const currentNodes = [...element.childNodes];
        const renderCount = test.renders.length;
        expect(
          current.serviceManager === probe.services.value.serviceManager
        ).toBe(true);

        localeGate.doResolve(frLocaleData);
        beforeGate.doResolve();
        richGate.doResolve();
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
        expect(
          probe.services.value.serviceManager === current.serviceManager
        ).toBe(true);
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
        richGate.doResolve();
        loadLocale.mockRestore();
        initialize.mockRestore();
        preloadRich.mockRestore();
        preloadExtensions.mockRestore();
      }
    }
  );

  it.each([
    ['while the renderer mounts', 'mount'],
    ['while the after-render timer is pending', 'timer'],
    ['after initialViewReady but before onInitialViewCommitted', 'initialView'],
  ])(
    'stops a mount removed %s, and mounts fresh afterward',
    async (_label, phase) => {
      let removeWhileMounting = phase === 'mount';
      const test = createTestRenderer({
        autoSignal: phase !== 'timer' && phase !== 'initialView',
        onMount: () => {
          if (removeWhileMounting) {
            removeWhileMounting = false;
            element.remove();
          }
        },
      });
      const instances: ChatInstance[] = [];
      const element = createChatElement(test.renderer);
      const onBeforeRender = vi.fn((instance: ChatInstance) => {
        instances.push(instance);
      });
      element.onBeforeRender = onBeforeRender;
      element.onAfterRender = vi.fn();
      document.body.appendChild(element);

      if (phase === 'mount') {
        // The hook above already removed it inside `mount`, before services
        // started; wait for that to have happened.
        await waitFor(() => expect(test.mount).toHaveBeenCalled(), {
          timeout: 5000,
        });
      } else if (phase === 'initialView') {
        await waitFor(() => expect(test.renders.length).toBeGreaterThan(0), {
          timeout: 5000,
        });
        await waitFor(() => expect(test.last().initialViewReady).toBe(true));
        // Do NOT call onInitialViewCommitted; remove the element here.
      } else {
        await waitFor(() => expect(test.renders.length).toBeGreaterThan(0), {
          timeout: 5000,
        });
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

  it('stops startup while the initial view change waits for the host', async () => {
    const viewGate = resolvablePromise();
    const test = createTestRenderer();
    const element = createChatElement(test.renderer, {
      openChatByDefault: true,
    });
    element.onViewPreChange = vi.fn().mockReturnValueOnce(viewGate);
    element.onBeforeRender = vi.fn();
    element.onAfterRender = vi.fn();
    document.body.appendChild(element);

    try {
      await waitFor(() =>
        expect(element.onViewPreChange).toHaveBeenCalledTimes(1)
      );
      const retired = test.last();
      expect(retired.renderReady).toBe(true);
      expect(retired.initialViewReady).toBe(false);
      expect(element.onAfterRender).not.toHaveBeenCalled();
      element.remove();
      await flushMicrotasks();
      const renderCount = test.renders.length;
      viewGate.doResolve();
      await settle();
      expect(test.renders).toHaveLength(renderCount);
      expect(test.renders.every((inputs) => !inputs.initialViewReady)).toBe(
        true
      );
      expect(
        chatStore(retired.serviceManager).getState().view
          .initialViewChangeComplete
      ).toBe(false);
      expect(element.onAfterRender).not.toHaveBeenCalled();
      expect(test.unmount).toHaveBeenCalledTimes(1);

      document.body.appendChild(element);
      await waitFor(() =>
        expect(element.onAfterRender).toHaveBeenCalledTimes(1)
      );
      expect(test.last().instance).not.toBe(retired.instance);
      expect(test.last().initialViewReady).toBe(true);
      expect(element.onAfterRender).toHaveBeenCalledWith(test.last().instance);
      expect(element.onBeforeRender).toHaveBeenCalledTimes(2);
    } finally {
      element.remove();
      viewGate.doResolve();
      await flushMicrotasks();
    }
  });

  it.each([
    'React ChatContainer',
    'React ChatCustomElement',
    'cds-aichat-container',
    'cds-aichat-custom-element',
  ])(
    'has a usable public input and focus target inside %s after-render',
    async (host) => {
      const onAfterRender = vi.fn(async (instance: ChatInstance) => {
        const editor = await instance.input.getEditor();
        editor.commands.insertContent('input ready');
        editor.view.focus();
        expect(editor.view.hasFocus()).toBe(true);
        expect(editor.getText()).toBe('input ready');
      });
      const config = { ...createBaseConfig(), openChatByDefault: true };
      let remove: () => void;
      if (host.startsWith('React ')) {
        const Wrapper =
          host === 'React ChatContainer' ? ChatContainer : ChatCustomElement;
        const view = render(
          <Wrapper {...config} className="" onAfterRender={onAfterRender} />
        );
        remove = () => view.unmount();
      } else {
        const element = document.createElement(host) as ChatElement;
        element.config = config;
        element.onAfterRender = onAfterRender;
        document.body.appendChild(element);
        remove = () => element.remove();
      }
      try {
        await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
          timeout: 5000,
        });
        await onAfterRender.mock.results[0].value;
      } finally {
        remove();
        await flushMicrotasks();
      }
    }
  );

  it('logs and stays unrendered when the app chunk fails to load', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const loadFailure = new Error('chunk load failed');
    vi.spyOn(
      containerModule.bootModuleLoader,
      'loadBootModules'
    ).mockRejectedValueOnce(loadFailure);
    const onAfterRender = vi.fn();
    const element = createChatElement(createTestRenderer().renderer);
    element.onAfterRender = onAfterRender;
    document.body.appendChild(element);

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Error initializing chat:',
        loadFailure
      )
    );
    expect(
      element.shadowRoot?.querySelector('.cds-aichat--react-app')
    ).toBeEmptyDOMElement();
    await flushMicrotasks();
    expect(onAfterRender).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
