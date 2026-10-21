/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import {
  act,
  render as renderWithTestingLibrary,
  waitFor,
} from '@testing-library/react';
import { createMarkdownPluginHostController } from '@carbon/ai-chat-components/es/components/markdown/src/utils/plugin-host-container.js';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import { InputNodePortalsContainer } from '../../../src/chat/components/portals/InputNodePortalsContainer';
import { ExtensionHosts } from '../../../src/chat/services/extensionHosts';
import type { WCRenderUserDefinedInputNode } from '../../../src/types/component/ChatContainer';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import type { MessageRequest } from '../../../src/types/messaging/Messages';

import {
  createBaseConfig,
  makeConfigStore,
  TestChatContext,
} from '../../test_helpers';
import actions from '../../../src/chat/store/actions';

let store: ReturnType<typeof makeConfigStore>;
function render(ui: React.ReactElement) {
  return renderWithTestingLibrary(ui, {
    wrapper: ({ children }) => (
      <TestChatContext store={store}>{children}</TestChatContext>
    ),
  });
}

const instance = { on: jest.fn(), off: jest.fn() } as unknown as ChatInstance;
const slotName = 'message::0';

const connectedHosts: ExtensionHosts[] = [];
afterEach(() => connectedHosts.splice(0).forEach((h) => h.disconnect()));

/** A connected host service for one mount, as `ChatAppEntry` creates it. */
function hostsFor(chatWrapper: HTMLElement) {
  const hosts = new ExtensionHosts(instance, chatWrapper, store, () => false);
  hosts.connect();
  connectedHosts.push(hosts);
  return hosts;
}

function message(): MessageRequest {
  return {
    id: 'message',
    input: {
      text: 'custom',
      display_content: {
        type: 'doc',
        content: [{ type: 'custom', attrs: { label: 'fallback' } }],
      },
    },
  } as MessageRequest;
}

/** The same node inside a paragraph, which the bubble renders inline. */
function inlineMessage(): MessageRequest {
  return {
    id: 'message',
    input: {
      text: 'custom',
      display_content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hi ' },
              { type: 'custom', attrs: { label: 'fallback' } },
            ],
          },
        ],
      },
    },
  } as MessageRequest;
}

beforeEach(() => {
  store = makeConfigStore({});
  store.dispatch(
    actions.setAppStateValue('allMessagesByID', { message: message() })
  );
});

test.each([0, 1, 2])(
  'projects a block host through %i shadow boundaries and clears every forwarder',
  (depth) => {
    const outer = document.createElement('div');
    document.body.appendChild(outer);
    const slotLists: string[][] = [];
    const controllers = [];
    let wrapper = outer;
    for (let index = 0; index <= depth; index++) {
      const current = wrapper;
      slotLists[index] = [];
      const controller = createMarkdownPluginHostController(current, {
        shouldDefer: () => index > 0,
        onSlotNamesChange: (names) => {
          slotLists[index] = names;
        },
      });
      controller.connect();
      controllers.push(controller);
      if (index < depth) {
        wrapper = document.createElement('div');
        current.attachShadow({ mode: 'open' }).appendChild(wrapper);
      }
    }
    const renderer = () => <span className="consumer-chip">custom</span>;
    const hosts = hostsFor(wrapper);
    const view = render(
      <InputNodePortalsContainer
        hosts={hosts}
        chatInstance={instance}
        renderUserDefinedInputNode={renderer}
      />
    );
    const chip = outer.querySelector('.consumer-chip');
    expect(chip).not.toBeNull();
    expect(chip?.getRootNode()).toBe(document);
    expect(chip?.parentElement?.getAttribute('slot')).toBe(slotName);
    expect(slotLists).toEqual(
      Array.from({ length: depth + 1 }, () => [slotName])
    );
    view.rerender(
      <InputNodePortalsContainer
        hosts={hosts}
        chatInstance={instance}
        renderUserDefinedInputNode={() => null}
      />
    );
    expect(outer.querySelector('.consumer-chip')).toBeNull();
    expect(slotLists).toEqual(
      Array.from({ length: depth + 1 }, (): string[] => [])
    );
    view.rerender(
      <InputNodePortalsContainer
        hosts={hosts}
        chatInstance={instance}
        renderUserDefinedInputNode={renderer}
      />
    );
    expect(outer.querySelector('.consumer-chip')).not.toBeNull();
    expect(slotLists).toEqual(
      Array.from({ length: depth + 1 }, () => [slotName])
    );
    view.unmount();
    expect(outer.querySelector('.consumer-chip')).toBeNull();
    expect(slotLists).toEqual(
      Array.from({ length: depth + 1 }, (): string[] => [])
    );
    controllers.forEach((controller) => controller.disconnect());
    outer.remove();
  }
);

/**
 * Whether `node` reaches the document through the flat tree: every light-DOM
 * child of a shadow host on the way up has to be assigned to a slot.
 */
function isInFlatTree(node: Node) {
  let current: Node | null = node;
  while (current) {
    const parent: Node | null = current.parentNode;
    if (parent === document) {
      return true;
    }
    if (parent instanceof Element && parent.shadowRoot) {
      current = (current as Element).assignedSlot;
    } else if (parent instanceof ShadowRoot) {
      current = parent.host;
    } else {
      current = parent;
    }
  }
  return false;
}

describe.each(['cds-aichat-container', 'cds-aichat-custom-element'])(
  '%s input nodes',
  (tagName) => {
    async function boot(
      renderUserDefinedInputNode: WCRenderUserDefinedInputNode,
      sent: MessageRequest = message()
    ) {
      let chat!: ChatInstance;
      const element = document.createElement(tagName) as HTMLElement &
        Record<string, unknown>;
      element.config = { ...createBaseConfig(), openChatByDefault: true };
      element.onBeforeRender = (next: ChatInstance) => {
        chat = next;
      };
      element.renderUserDefinedInputNode = renderUserDefinedInputNode;
      document.body.appendChild(element);
      await waitFor(() => expect(chat).toBeDefined(), { timeout: 8000 });
      await act(() => chat.send(sent));
      const bubbleSlot = () =>
        deepQuerySelector(
          element.shadowRoot,
          `slot[name="${slotName}"]`
        ) as HTMLSlotElement | null;
      if (sent.input.display_content.content[0].type !== 'paragraph') {
        await waitFor(() => expect(bubbleSlot()).not.toBeNull(), {
          timeout: 8000,
        });
      }
      return { element, bubbleSlot, chat };
    }

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('shows the fallback when the callback returns null', async () => {
      const callback = jest.fn((): HTMLElement | null => null);
      const { element, bubbleSlot } = await boot(callback);
      await waitFor(() => expect(callback).toHaveBeenCalled());
      expect(element.querySelector(`[slot="${slotName}"]`)).toBeNull();
      expect(bubbleSlot().assignedNodes()).toHaveLength(0);
      expect(bubbleSlot().nextElementSibling.textContent).toBe('fallback');
      expect(bubbleSlot().nextElementSibling).not.toHaveAttribute('hidden');
    }, 20000);

    it('hosts the returned element in page light DOM and projects it into the bubble', async () => {
      const chip = document.createElement('span');
      chip.textContent = 'custom';
      const { element, bubbleSlot } = await boot(() => chip);
      await waitFor(() =>
        expect(
          bubbleSlot()
            .assignedNodes({ flatten: true })
            .map((node) => node.textContent)
        ).toEqual(['custom'])
      );
      const host = element.querySelector(`:scope > [slot="${slotName}"]`);
      expect(host?.contains(chip)).toBe(true);
      expect(chip.getRootNode()).toBe(document);
    }, 20000);

    it.each([
      ['block', () => message()],
      ['inline', () => inlineMessage()],
    ])(
      'slots a returned %s element into its bubble before it connects',
      async (kind, sent) => {
        const rendered: boolean[] = [];
        const chip = document.createElement(`${tagName}-${kind}-probe-chip`);
        customElements.define(
          chip.localName,
          class extends HTMLElement {
            connectedCallback() {
              rendered.push(isInFlatTree(this));
            }
          }
        );
        customElements.upgrade(chip);
        await boot(() => chip, sent());
        await waitFor(() => expect(rendered.length).toBeGreaterThan(0), {
          timeout: 8000,
        });
        expect(rendered[0]).toBe(true);
      },
      20000
    );

    it.each([
      ['block', () => message()],
      ['inline', () => inlineMessage()],
    ])(
      'calls back once per %s node while its message updates',
      async (_kind, sent) => {
        const callback = jest.fn(() => document.createElement('span'));
        const { chat } = await boot(callback, sent());
        const connected = () =>
          callback.mock.results
            .map((result) => result.value as HTMLElement)
            .filter((chip) => chip.isConnected);
        await waitFor(() => expect(connected()).toHaveLength(1), {
          timeout: 8000,
        });
        await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
        const [chip] = connected();

        // A later update, such as a status change, replaces the message object
        // with an equal copy whose node is a new object.
        const { store } = chat.serviceManager;
        const messages = store.getState().allMessagesByID;
        act(() =>
          store.dispatch(
            actions.setAppStateValue('allMessagesByID', {
              ...messages,
              message: JSON.parse(JSON.stringify(messages.message)),
            })
          )
        );
        await act(async () => {});

        expect(callback).toHaveBeenCalledTimes(1);
        expect(chip.isConnected).toBe(true);
      },
      20000
    );

    it('calls back again when the node itself changes', async () => {
      const callback = jest.fn(() => document.createElement('span'));
      const { chat } = await boot(callback);
      await waitFor(() => expect(callback).toHaveBeenCalled(), {
        timeout: 8000,
      });
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
      const calls = callback.mock.calls.length;

      const { store } = chat.serviceManager;
      const messages = store.getState().allMessagesByID;
      const edited = JSON.parse(JSON.stringify(messages.message));
      edited.input.display_content.content[0].attrs = { label: 'edited' };
      act(() =>
        store.dispatch(
          actions.setAppStateValue('allMessagesByID', {
            ...messages,
            message: edited,
          })
        )
      );
      await act(async () => {});

      expect(callback).toHaveBeenCalledTimes(calls + 1);
      const latest = callback.mock.results[calls].value as HTMLElement;
      await waitFor(() => expect(latest.isConnected).toBe(true));
    }, 20000);

    it('keeps the returned element through unrelated message updates', async () => {
      const chip = document.createElement('span');
      const callback = jest.fn(() => chip);
      const { element, chat } = await boot(callback);
      await waitFor(() => expect(chip.isConnected).toBe(true));
      const host = element.querySelector(`[slot="${slotName}"]`);
      const calls = callback.mock.calls.length;
      await act(() => chat.send('unrelated'));
      await act(async () => {});
      expect(callback).toHaveBeenCalledTimes(calls);
      expect(chip.isConnected).toBe(true);
      expect(element.querySelector(`[slot="${slotName}"]`)).toBe(host);
    }, 20000);
  }
);

test('Strict Mode keeps one host, gives a new mount its own host, and removes deleted messages', () => {
  const wrapper = document.createElement('div');
  const replacement = document.createElement('div');
  const renderer = () => <span>custom</span>;
  const tree = (hosts: ExtensionHosts) => (
    <React.StrictMode>
      <InputNodePortalsContainer
        hosts={hosts}
        chatInstance={instance}
        renderUserDefinedInputNode={renderer}
      />
    </React.StrictMode>
  );
  const view = render(tree(hostsFor(wrapper)));
  expect(wrapper.children).toHaveLength(1);
  const firstHost = wrapper.firstElementChild;
  // A chat wrapper is fixed per mount; a new wrapper is a new mount.
  view.unmount();
  connectedHosts.pop().disconnect();
  expect(wrapper.children).toHaveLength(0);
  const remount = render(tree(hostsFor(replacement)));
  expect(replacement.children).toHaveLength(1);
  expect(replacement.firstElementChild).not.toBe(firstHost);
  act(() => store.dispatch(actions.setAppStateValue('allMessagesByID', {})));
  expect(replacement.children).toHaveLength(0);
  remount.unmount();
});
