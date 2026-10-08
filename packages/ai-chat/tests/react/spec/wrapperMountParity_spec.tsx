/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * How each host mounts the chat. Every surface mounts through the same
 * `cds-aichat-container`. React wrappers render inside the host's own React
 * root and add none; a plain web component owns exactly one. A fresh mount gets
 * a fresh instance, two chats stay apart, and React moving a wrapper among its
 * siblings keeps the running chat, as does moving a plain element. Removing an
 * element retires its mount: adding it back starts fresh, and the retired
 * instance can no longer reach the host.
 */

import React, { StrictMode, useState } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { ViewType } from '../../../src/types/instance/apiTypes';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import {
  BusEventType,
  ViewChangeReason,
} from '../../../src/types/events/eventBusTypes';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import {
  addUserDefinedResponse,
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

jest.mock('react-dom/client', () => {
  const actual = jest.requireActual('react-dom/client');
  return {
    ...actual,
    createRoot: jest.fn((...args: Parameters<typeof actual.createRoot>) => {
      const root = actual.createRoot(...args);
      root.unmount = jest.fn(root.unmount.bind(root));
      return root;
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRoot } = require('react-dom/client') as {
  createRoot: jest.Mock;
};

type ChatElement = HTMLElement & {
  config: PublicConfig;
  onBeforeRender: (instance: ChatInstance) => unknown;
  onAfterRender: (instance: ChatInstance) => unknown;
  renderUserDefinedResponse?: () => HTMLElement | null;
  updateComplete: Promise<boolean>;
};

/** The render target inside the chat's shadow root. */
function renderTargetIn(root: ParentNode = document) {
  return (
    getChatShadowRoot(root)?.querySelector('.cds-aichat--react-app') ?? null
  );
}

/** The render target inside a container's shadow root. */
function renderTargetOf(container: Element) {
  return container.shadowRoot?.querySelector('.cds-aichat--react-app') ?? null;
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

function createElementChat(tag: string, config: PublicConfig = {}) {
  const instances: ChatInstance[] = [];
  const onAfterRender = jest.fn();
  const element = document.createElement(tag) as ChatElement;
  element.config = { ...createBaseConfig(), ...config };
  element.onBeforeRender = (instance) => {
    instances.push(instance);
  };
  element.onAfterRender = onAfterRender;
  return { element, instances, onAfterRender };
}

function userDefinedEvent(slot: string) {
  return {
    type: BusEventType.USER_DEFINED_RESPONSE,
    data: {
      slot,
      message: {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: {},
      },
      fullMessage: { id: slot, output: { generic: [] } },
    },
  } as never;
}

function closedViewEvent() {
  return {
    type: BusEventType.VIEW_CHANGE,
    reason: ViewChangeReason.CALLED_CHANGE_VIEW,
    oldViewState: { mainWindow: true, launcher: false },
    newViewState: { mainWindow: false, launcher: true },
  } as never;
}

/** Fires a bus event straight from an instance, as its services would. */
function fireFrom(instance: ChatInstance, event: never) {
  return instance.serviceManager.eventBus.fire(event, instance);
}

/**
 * Removes a node and, once the removal has settled, adds it back at the same
 * position. A move within one task keeps the mount; this retires it.
 */
async function removeAndReadd(node: Node) {
  const parent = node.parentNode;
  const next = node.nextSibling;
  parent.removeChild(node);
  await settle();
  parent.insertBefore(node, next);
}

const inlinePluginConfig: PublicConfig = {
  openChatByDefault: true,
  markdown: {
    markdownItPlugins: [
      (md) => {
        md.renderer.rules.code_inline = () =>
          '<span data-inline-plugin>Projected plugin</span>';
      },
    ],
  },
};

async function sendInlinePlugin(instance: ChatInstance, host: HTMLElement) {
  await act(() =>
    instance.send({
      id: 'inline-plugin-move',
      input: {
        text: 'Ada `plugin`',
        display_content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'mention', attrs: { id: 'ada', label: 'Ada' } },
                { type: 'text', text: ' `plugin`' },
              ],
            },
          ],
        },
      },
    })
  );
  await waitFor(() =>
    expect(host.querySelector('[data-inline-plugin]')?.textContent).toBe(
      'Projected plugin'
    )
  );
  return host.querySelector('[data-inline-plugin]');
}

describe('how each host mounts the chat', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('does not register the removed private React host', () => {
    expect(customElements.get('cds-aichat-react')).toBeUndefined();
  });

  it.each([
    [
      'React ChatContainer',
      (onAfterRender: () => void) => {
        render(
          <ChatContainer
            {...createBaseConfig()}
            onAfterRender={onAfterRender}
          />
        );
        return document.querySelector('cds-aichat-container');
      },
    ],
    [
      'React ChatCustomElement',
      (onAfterRender: () => void) => {
        render(
          <ChatCustomElement
            {...createBaseConfig()}
            className="chat-host"
            onAfterRender={onAfterRender}
          />
        );
        const host = document.querySelector('div.chat-host');
        expect(host.firstElementChild?.localName).toBe('cds-aichat-container');
        return host.firstElementChild;
      },
    ],
    [
      'cds-aichat-container',
      (onAfterRender: () => void) => {
        const { element } = createElementChat('cds-aichat-container');
        element.onAfterRender = onAfterRender;
        document.body.appendChild(element);
        return element;
      },
    ],
    [
      'cds-aichat-custom-element',
      (onAfterRender: () => void) => {
        const { element } = createElementChat('cds-aichat-custom-element');
        element.onAfterRender = onAfterRender;
        document.body.appendChild(element);
        return () => element.shadowRoot.querySelector('cds-aichat-container');
      },
    ],
  ])('%s renders through the container element', async (_name, mount) => {
    const onAfterRender = jest.fn();
    const mounted = mount(onAfterRender);
    await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
      timeout: 5000,
    });
    const container =
      typeof mounted === 'function' ? mounted() : (mounted as Element);

    expect(container).not.toBeNull();
    expect(renderTargetOf(container)?.childElementCount).toBeGreaterThan(0);
    expect(document.querySelectorAll('cds-aichat-container')).toHaveLength(
      container.getRootNode() === document ? 1 : 0
    );
  });

  describe('React roots', () => {
    it('adds no root for a React wrapper, across config and renderer updates', async () => {
      const before = createRoot.mock.calls.length;
      let instance: ChatInstance | null = null;
      const onBeforeRender = (chat: ChatInstance) => {
        instance = chat;
      };
      const view = render(
        <ChatContainer
          {...createBaseConfig()}
          onBeforeRender={onBeforeRender}
        />
      );
      // Testing Library creates the host's own root.
      expect(createRoot.mock.calls.length).toBe(before + 1);
      await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });

      view.rerender(
        <ChatContainer
          {...createBaseConfig()}
          assistantName="Updated"
          onBeforeRender={onBeforeRender}
          renderUserDefinedResponse={() => <p>content</p>}
        />
      );
      await waitFor(() =>
        expect(
          instance.serviceManager.store.getState().config.public.assistantName
        ).toBe('Updated')
      );

      expect(createRoot.mock.calls.length).toBe(before + 1);
    });

    it('gives a plain web component one root, reused across updates and unmounted on removal', async () => {
      const before = createRoot.mock.calls.length;
      const { element, instances, onAfterRender } = createElementChat(
        'cds-aichat-container'
      );
      document.body.appendChild(element);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });
      expect(createRoot.mock.calls.length).toBe(before + 1);

      element.config = { ...element.config, assistantName: 'Updated' };
      element.renderUserDefinedResponse = () => document.createElement('p');
      await element.updateComplete;
      await waitFor(() =>
        expect(
          instances[0].serviceManager.store.getState().config.public
            .assistantName
        ).toBe('Updated')
      );
      expect(createRoot.mock.calls.length).toBe(before + 1);

      const root = createRoot.mock.results[before].value;
      element.remove();
      await settle();
      expect(root.unmount).toHaveBeenCalledTimes(1);
    });
  });

  describe('fresh mounts', () => {
    it('renders one shell and announcer under StrictMode', async () => {
      const onAfterRender = jest.fn();
      render(
        <StrictMode>
          <ChatContainer
            {...createBaseConfig()}
            onAfterRender={onAfterRender}
          />
        </StrictMode>
      );
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });

      expect(document.querySelectorAll(getChatHost().localName)).toHaveLength(
        1
      );
      const target = renderTargetIn();
      expect(target.querySelectorAll('.cds-aichat--widget')).toHaveLength(1);
      expect(
        target.querySelectorAll('.cds-aichat--aria-announcer')
      ).toHaveLength(1);
    });

    it('keeps two chats independent', async () => {
      const instances: ChatInstance[] = [];
      const capture = (chat: ChatInstance) => {
        instances.push(chat);
      };
      render(
        <>
          <div data-chat="first">
            <ChatContainer {...createBaseConfig()} onBeforeRender={capture} />
          </div>
          <div data-chat="second">
            <ChatContainer {...createBaseConfig()} onBeforeRender={capture} />
          </div>
        </>
      );
      await waitFor(() => expect(instances).toHaveLength(2), {
        timeout: 5000,
      });

      const [first, second] = ['first', 'second'].map((name) =>
        renderTargetIn(document.querySelector(`[data-chat="${name}"]`))
      );
      expect(first).not.toBeNull();
      expect(first).not.toBe(second);
      expect(instances[0]).not.toBe(instances[1]);
      const targets = instances.map((chat) => chat.serviceManager.container);
      expect(targets).toEqual(expect.arrayContaining([first, second]));
    });

    it('gives a remounted React wrapper a fresh instance', async () => {
      const instances: ChatInstance[] = [];
      const capture = (chat: ChatInstance) => {
        instances.push(chat);
      };
      const first = render(
        <ChatCustomElement
          {...createBaseConfig()}
          className="chat-host"
          onBeforeRender={capture}
        />
      );
      await waitFor(() => expect(instances).toHaveLength(1), { timeout: 5000 });
      first.unmount();

      render(
        <ChatCustomElement
          {...createBaseConfig()}
          className="chat-host"
          onBeforeRender={capture}
        />
      );
      await waitFor(() => expect(instances).toHaveLength(2), { timeout: 5000 });
      expect(instances[1]).not.toBe(instances[0]);
    });

    it('stops a React wrapper removed while before-render is pending', async () => {
      const gate = resolvablePromise();
      const onBeforeRender = jest.fn(() => gate);
      const onAfterRender = jest.fn();
      const view = render(
        <ChatContainer
          {...createBaseConfig()}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
        />
      );
      await waitFor(() => expect(onBeforeRender).toHaveBeenCalled(), {
        timeout: 5000,
      });

      view.unmount();
      gate.doResolve();
      await settle();

      expect(onAfterRender).not.toHaveBeenCalled();
      expect(document.querySelector('cds-aichat-container')).toBeNull();
    });
  });

  describe('moves', () => {
    it('keeps one instance when React moves the wrapper among keyed siblings', async () => {
      const onBeforeRender = jest.fn();
      const onAfterRender = jest.fn();
      const chat = (
        <ChatContainer
          key="chat"
          {...createBaseConfig()}
          {...inlinePluginConfig}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
        />
      );
      const sibling = (
        <p key="sibling" data-probe="sibling">
          Sibling
        </p>
      );
      const view = render(<div>{[chat, sibling]}</div>);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });

      const host = getChatHost();
      const plugin = await sendInlinePlugin(
        onBeforeRender.mock.calls[0][0],
        host
      );
      expect(host.previousSibling).toBeNull();
      const removed: Node[] = [];
      const observer = new MutationObserver((records) => {
        records.forEach((record) => removed.push(...record.removedNodes));
      });
      observer.observe(host.parentNode, { childList: true });

      view.rerender(<div>{[sibling, chat]}</div>);
      await settle();
      observer.disconnect();

      // React took the host out of the DOM and put it back after the sibling.
      expect(removed).toContain(host);
      expect(host.previousSibling).toBe(
        document.querySelector('[data-probe="sibling"]')
      );
      expect(getChatHost()).toBe(host);
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
      expect(onAfterRender).toHaveBeenCalledTimes(1);
      expect(renderTargetIn()?.childElementCount).toBeGreaterThan(0);
      expect(host.querySelector('[data-inline-plugin]')).toBe(plugin);
      expect(plugin.isConnected).toBe(true);

      view.unmount();
      await settle();
      expect(host.querySelector('[data-inline-plugin]')).toBeNull();
    });

    it.each(['cds-aichat-container', 'cds-aichat-custom-element'])(
      'keeps one instance when a plain %s moves in one task',
      async (tag) => {
        const { element, instances, onAfterRender } = createElementChat(
          tag,
          inlinePluginConfig
        );
        const sibling = document.createElement('p');
        document.body.append(element, sibling);
        await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
          timeout: 5000,
        });
        const plugin = await sendInlinePlugin(instances[0], element);

        sibling.after(element);
        await settle();

        expect(instances).toHaveLength(1);
        expect(onAfterRender).toHaveBeenCalledTimes(1);
        const container =
          tag === 'cds-aichat-container'
            ? element
            : element.shadowRoot.querySelector('cds-aichat-container');
        expect(renderTargetOf(container)?.childElementCount).toBeGreaterThan(0);
        expect(element.querySelector('[data-inline-plugin]')).toBe(plugin);
        expect(plugin.isConnected).toBe(true);

        element.remove();
        await settle();
        expect(element.querySelector('[data-inline-plugin]')).toBeNull();
      }
    );
  });

  describe('removing and re-adding the same element', () => {
    it('cds-aichat-container starts fresh and ignores the retired instance', async () => {
      const { element, instances, onAfterRender } = createElementChat(
        'cds-aichat-container',
        { openChatByDefault: true }
      );
      element.renderUserDefinedResponse = () => {
        const node = document.createElement('p');
        node.dataset.probe = 'wc-udr';
        return node;
      };
      const callerOwned = document.createElement('div');
      callerOwned.setAttribute('slot', 'caller-owned');
      element.appendChild(callerOwned);
      document.body.appendChild(element);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });

      const [retired] = instances;
      await addUserDefinedResponse(retired, 'retired-udr');
      await waitFor(() =>
        expect(element.querySelector('[data-probe="wc-udr"]')).not.toBeNull()
      );
      const retiredWriteable = Object.values(retired.writeableElements);
      expect(retiredWriteable[0].parentNode).toBe(element);

      await removeAndReadd(element);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(2), {
        timeout: 5000,
      });
      const [, current] = instances;

      expect(current).not.toBe(retired);
      expect(element.querySelector('[data-probe="wc-udr"]')).toBeNull();
      expect(retiredWriteable.some((node) => node.parentNode)).toBe(false);
      expect(Object.values(current.writeableElements)[0].parentNode).toBe(
        element
      );
      expect(callerOwned.parentNode).toBe(element);

      await fireFrom(retired, userDefinedEvent('retired-slot'));
      await element.updateComplete;
      expect(element.querySelector('[slot="retired-slot"]')).toBeNull();
    });

    it('cds-aichat-custom-element ignores view changes from the retired instance', async () => {
      const { element, instances, onAfterRender } = createElementChat(
        'cds-aichat-custom-element',
        { openChatByDefault: true }
      );
      document.body.appendChild(element);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });

      await removeAndReadd(element);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(2), {
        timeout: 5000,
      });
      const [retired, current] = instances;
      expect(current).not.toBe(retired);
      // Both instances share session storage, so open the current one
      // explicitly rather than rely on its restored view.
      await act(() => current.changeView(ViewType.MAIN_WINDOW));
      expect(element.classList.contains('cds-aichat--hidden')).toBe(false);

      await fireFrom(retired, closedViewEvent());
      expect(element.classList.contains('cds-aichat--hidden')).toBe(false);
    });

    it.each([
      ['ChatContainer', ChatContainer],
      ['ChatCustomElement', ChatCustomElement],
    ])(
      '%s resets app state when its chat element is removed and re-added',
      async (_name, Wrapper) => {
        const instances: ChatInstance[] = [];
        const onAfterRender = jest.fn();

        function Counter() {
          const [count, setCount] = useState(0);
          return (
            <button type="button" onClick={() => setCount(count + 1)}>
              {count}
            </button>
          );
        }

        render(
          React.createElement(Wrapper as typeof ChatCustomElement, {
            ...createBaseConfig(),
            openChatByDefault: true,
            className: 'chat-host',
            onBeforeRender: (chat: ChatInstance) => {
              instances.push(chat);
            },
            onAfterRender,
            renderUserDefinedResponse: () => <Counter />,
          })
        );
        await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
          timeout: 5000,
        });
        await addUserDefinedResponse(instances[0], 'counter-1');
        await waitFor(() =>
          expect(document.querySelector('button')?.textContent).toBe('0')
        );
        fireEvent.click(document.querySelector('button'));
        expect(document.querySelector('button').textContent).toBe('1');

        const container = document.querySelector('cds-aichat-container');
        await removeAndReadd(container);
        await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(2), {
          timeout: 5000,
        });
        const [retired, current] = instances;
        expect(current).not.toBe(retired);
        expect(document.querySelector('button')).toBeNull();

        await act(() => current.changeView(ViewType.MAIN_WINDOW));
        await fireFrom(retired, userDefinedEvent('retired-slot'));
        await fireFrom(retired, closedViewEvent());
        await settle();
        expect(document.querySelector('[slot="retired-slot"]')).toBeNull();
        expect(
          document
            .querySelector('.chat-host')
            ?.classList.contains('cds-aichat--hidden') ?? false
        ).toBe(false);

        await addUserDefinedResponse(current, 'counter-2');
        await waitFor(() =>
          expect(document.querySelector('button')?.textContent).toBe('0')
        );
      }
    );
  });
});
