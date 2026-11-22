// @vitest-environment jsdom
// Under happy-dom 21 a sent message's inline plugin output never reaches the host's light DOM, so the move cases fail before they move.
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

import '../cds-aichat-container';
import '../cds-aichat-custom-element';
import { ChatContainer } from '../../react/ChatContainer';
import { ChatCustomElement } from '../../react/ChatCustomElement';
import * as sdkBoot from '../../sdk/createChatSDK';
import { ChatInstance } from '../../types/instance/ChatInstance';
import { ViewType } from '../../types/instance/apiTypes';
import { PublicConfig } from '../../types/config/PublicConfig';
import {
  BusEventType,
  ViewChangeReason,
} from '../../types/events/eventBusTypes';
import { MessageResponseTypes } from '../../types/messaging/Messages';
import {
  addUserDefinedResponse,
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';

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
  const onAfterRender = vi.fn();
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

  describe('fresh mounts', () => {
    it('renders one shell and announcer under StrictMode', async () => {
      const onAfterRender = vi.fn();
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
      const shadowRoot = getChatHost().shadowRoot;
      expect(
        shadowRoot.querySelectorAll('.cds-aichat--aria-announcer')
      ).toHaveLength(1);
      // The effect replay must leave one connected set of live regions.
      const announcer = '.cds-aichat--aria-announcer';
      expect(
        shadowRoot.querySelectorAll(`${announcer} [aria-live="polite"]`)
      ).toHaveLength(3);
      expect(
        shadowRoot.querySelectorAll(`${announcer} [aria-live="assertive"]`)
      ).toHaveLength(2);
    });

    it('starts one chat under StrictMode with reuse on', async () => {
      const claim = vi.spyOn(sdkBoot.chatRegistry, 'claim');
      const onBeforeRender = vi.fn();
      const onAfterRender = vi.fn();
      const onError = vi.fn();
      const mounted = render(
        <StrictMode>
          <ChatContainer
            {...createBaseConfig()}
            namespace="strict-reuse"
            lifecycle={{ reuseInstance: true }}
            onBeforeRender={onBeforeRender}
            onAfterRender={onAfterRender}
            onError={onError}
          />
        </StrictMode>
      );
      await waitFor(() => expect(onAfterRender).toHaveBeenCalled(), {
        timeout: 5000,
      });

      expect(claim).toHaveBeenCalledTimes(1);
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      expect(document.querySelectorAll(getChatHost().localName)).toHaveLength(
        1
      );
      mounted.unmount();
      claim.mockRestore();
    });
  });

  describe('moves', () => {
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
    it('leaves a writeable element the host moved elsewhere when it releases', async () => {
      const { element, instances, onAfterRender } = createElementChat(
        'cds-aichat-container'
      );
      document.body.appendChild(element);
      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      const [borrowed, kept] = Object.values(instances[0].writeableElements);
      const elsewhere = document.createElement('section');
      document.body.appendChild(elsewhere);
      elsewhere.appendChild(borrowed);

      element.remove();
      await settle();

      expect(borrowed.parentNode).toBe(elsewhere);
      expect(kept.parentNode).toBeNull();
    });

    it.each([['ChatContainer', ChatContainer]])(
      '%s resets app state when its chat element is removed and re-added',
      async (_name, Wrapper) => {
        const instances: ChatInstance[] = [];
        const onAfterRender = vi.fn();

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
