/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * React render props stay live through the shared container. Their hosts land
 * in `cds-aichat-container`'s light DOM, where page CSS reaches them, and the
 * app's own slots project them from the same shadow root. Removing a render
 * prop removes its hosts, so a slot with nothing to show has no host and its
 * fallback content shows.
 */

import React, { StrictMode } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import '../../../src/web-components/cds-aichat-container';
import { ChatContainer } from '../../../src/react/ChatContainer';
import type CdsAiChatContainerElement from '../../../src/web-components/cds-aichat-container/cds-aichat-container';
import { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  MessageInputType,
  MessageRequest,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';
import {
  addUserDefinedResponse,
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const config = { ...createBaseConfig(), openChatByDefault: true };

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? (
      <span data-probe="host-error-boundary" />
    ) : (
      this.props.children
    );
  }
}

/**
 * The app slot a host node is projected into, or null when nothing picked it
 * up. A host in the container's light DOM is assigned straight to the slot the
 * app renders, with no forwarding in between.
 */
function assignedSlotFor(slot: string) {
  return (hostFor(slot) as HTMLElement | null)?.assignedSlot ?? null;
}

function hostFor(slot: string) {
  return getChatHost().querySelector(`:scope > [slot="${slot}"]`);
}

function hostsFor(slot: string) {
  return getChatHost().querySelectorAll(`:scope > [slot="${slot}"]`);
}

/**
 * Boots a React chat and returns its instance plus a props updater. With
 * `strict`, the chat renders under `StrictMode`, which replays effects.
 */
async function boot(props: Partial<ChatContainerProps> = {}, strict = false) {
  let instance: ChatInstance | null = null;
  const onBeforeRender = (chat: ChatInstance) => {
    instance = chat;
  };
  const Wrapper = strict ? StrictMode : React.Fragment;
  const view = render(
    <Wrapper>
      <ChatContainer {...config} {...props} onBeforeRender={onBeforeRender} />
    </Wrapper>
  );
  await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });
  await waitFor(() =>
    expect(
      deepQuerySelector(getChatShadowRoot(), '[data-testid="input_field"]')
    ).not.toBeNull()
  );
  return {
    instance,
    update: (next: Partial<ChatContainerProps>) =>
      view.rerender(
        <Wrapper>
          <ChatContainer
            {...config}
            {...next}
            onBeforeRender={onBeforeRender}
          />
        </Wrapper>
      ),
  };
}

/** Drains the microtask queue and a short timer, enough for Lit updates. */
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

/**
 * Boots a plain cds-aichat-container and returns its instance plus a
 * property-setter update function, mirroring `boot()` above.
 */
async function bootWC(props: Partial<Record<string, unknown>> = {}): Promise<{
  element: CdsAiChatContainerElement;
  instance: ChatInstance;
  update: (next: Record<string, unknown>) => Promise<void>;
}> {
  const element = document.createElement(
    'cds-aichat-container'
  ) as CdsAiChatContainerElement;
  let instance: ChatInstance | null = null;
  Object.assign(element, {
    config,
    ...props,
    onBeforeRender: (chat: ChatInstance) => {
      instance = chat;
    },
  });
  document.body.appendChild(element);
  await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });
  await waitFor(() =>
    expect(
      element.shadowRoot?.querySelector('.cds-aichat--react-app')
    ).not.toBeNull()
  );
  return {
    element,
    instance: instance as ChatInstance,
    update: async (next: Record<string, unknown>) => {
      Object.assign(element, next);
      await element.updateComplete;
    },
  };
}

function sendRequest(instance: ChatInstance, request: Partial<MessageRequest>) {
  return act(() =>
    instance.send({
      input: { message_type: MessageInputType.TEXT, text: 'hello' },
      ...request,
    } as MessageRequest)
  );
}

describe('React render props through the shared container', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('adds, streams into, replaces, and removes user-defined content after boot', async () => {
    const { instance, update } = await boot();

    await addUserDefinedResponse(instance, 'udr-late', { label: 'first' });
    await act(() =>
      instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'udr-stream' },
        partial_item: {
          streaming_metadata: { id: 'item-1' },
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { label: 'chunk' },
        },
      } as never)
    );

    const renderA = jest.fn((state) => (
      <p data-probe="a">
        {state.messageItem?.user_defined?.label ??
          `partials:${state.partialItems?.length ?? 0}`}
      </p>
    ));
    update({ renderUserDefinedResponse: renderA });

    await waitFor(() =>
      expect(
        Array.from(document.querySelectorAll('[data-probe="a"]')).map(
          (node) => node.textContent
        )
      ).toEqual(expect.arrayContaining(['first', 'partials:1']))
    );
    const firstHost = document.querySelector('[data-probe="a"]').parentElement;
    const slot = firstHost.getAttribute('slot');
    expect(firstHost.parentElement).toBe(getChatHost());
    await waitFor(() => expect(assignedSlotFor(slot)).not.toBeNull());

    update({
      renderUserDefinedResponse: () => <p data-probe="b">replaced</p>,
    });
    await waitFor(() =>
      expect(document.querySelector('[data-probe="b"]')).not.toBeNull()
    );
    expect(hostFor(slot)).toBe(firstHost);

    update({ renderUserDefinedResponse: () => null });
    await waitFor(() => expect(firstHost).toBeEmptyDOMElement());
    expect(hostFor(slot)).toBe(firstHost);

    update({});
    await waitFor(() => expect(hostFor(slot)).toBeNull());
  });

  it('keeps hosts attached through StrictMode and does not duplicate them when a renderer is re-added', async () => {
    const { instance, update } = await boot({}, true);
    await addUserDefinedResponse(instance, 'udr-strict', { label: 'strict' });

    const renderResponse = (state: {
      messageItem?: { user_defined?: { label?: string } };
    }) => <p data-probe="strict">{state.messageItem?.user_defined?.label}</p>;
    update({ renderUserDefinedResponse: renderResponse });

    await waitFor(() =>
      expect(document.querySelector('[data-probe="strict"]')?.textContent).toBe(
        'strict'
      )
    );
    const host = document.querySelector('[data-probe="strict"]').parentElement;
    const slot = host.getAttribute('slot');
    expect(host.parentElement).toBe(getChatHost());
    expect(hostsFor(slot)).toHaveLength(1);

    update({});
    await waitFor(() => expect(hostsFor(slot)).toHaveLength(0));

    update({ renderUserDefinedResponse: renderResponse });
    await waitFor(() => expect(hostFor(slot)?.textContent).toBe('strict'));
    expect(hostsFor(slot)).toHaveLength(1);
  });

  it('updates request footers while collecting only messages sent with a renderer', async () => {
    const { instance, update } = await boot();
    await sendRequest(instance, { id: 'before' });

    update({
      renderCustomRequestFooter: (slotName, message) => (
        <span data-probe="footer">{message.id}</span>
      ),
    });
    await sendRequest(instance, { id: 'after' });

    await waitFor(() =>
      expect(
        Array.from(document.querySelectorAll('[data-probe="footer"]')).map(
          (node) => node.textContent
        )
      ).toEqual(['after'])
    );
    const host = document.querySelector('[data-probe="footer"]').parentElement;
    const slotName = host.getAttribute('slot');
    await waitFor(() => expect(assignedSlotFor(slotName)).not.toBeNull());

    update({
      renderCustomRequestFooter: (_slotName, message) => (
        <span data-probe="footer">Updated {message.id}</span>
      ),
    });
    await waitFor(() => expect(host.textContent).toBe('Updated after'));
    expect(hostFor(slotName)).toBe(host);

    update({});
    await waitFor(() => expect(hostFor(slotName)).toBeNull());
    await sendRequest(instance, { id: 'disabled' });

    update({
      renderCustomRequestFooter: (_slotName, message) => (
        <span data-probe="footer">{message.id}</span>
      ),
    });
    await sendRequest(instance, { id: 'reenabled' });
    await waitFor(() =>
      expect(
        Array.from(document.querySelectorAll('[data-probe="footer"]')).map(
          (node) => node.textContent
        )
      ).toEqual(['after', 'reenabled'])
    );
  });

  it('adds and removes user-defined content via cds-aichat-container callback', async () => {
    const { instance, update } = await bootWC();

    await addUserDefinedResponse(instance, 'wc-udr', { label: 'hello' });
    await settle();

    expect(document.querySelectorAll('[slot^="wc-udr"]')).toHaveLength(0);

    const cache = new Map<string, HTMLElement>();
    await update({
      renderUserDefinedResponse: (state: {
        messageItem?: { user_defined?: { label?: string } };
      }) => {
        const el =
          cache.get(String(state.messageItem?.user_defined?.label)) ??
          document.createElement('p');
        el.setAttribute('data-probe', 'wc-udr');
        el.textContent = state.messageItem?.user_defined?.label ?? '';
        cache.set(el.textContent, el);
        return el;
      },
    });
    await waitFor(() =>
      expect(document.querySelector('[data-probe="wc-udr"]')).not.toBeNull()
    );

    // Identity is stable across an unrelated update.
    const before = document.querySelector('[data-probe="wc-udr"]');
    await update({ assistantName: 'Updated' });
    await settle();
    expect(document.querySelector('[data-probe="wc-udr"]')).toBe(before);

    // Removing the callback removes the host.
    await update({ renderUserDefinedResponse: undefined });
    await settle();
    expect(document.querySelector('[data-probe="wc-udr"]')).toBeNull();
  });

  it('removes the slot host when a cds-aichat-container callback returns null', async () => {
    const { element, instance, update } = await bootWC({
      renderUserDefinedResponse: () => {
        const content = document.createElement('span');
        content.dataset.probe = 'wc-null';
        return content;
      },
    });
    await addUserDefinedResponse(instance, 'wc-null', {});
    const content = await waitFor(() => {
      const match = element.querySelector<HTMLElement>(
        '[data-probe="wc-null"]'
      );
      expect(match).not.toBeNull();
      return match as HTMLElement;
    });
    const host = content.parentElement;
    const slotName = host?.getAttribute('slot');
    expect(slotName).toMatch(/^slot-user-defined-/);

    await update({
      renderUserDefinedResponse: (): HTMLElement | null => null,
    });
    await waitFor(() => expect(host?.isConnected).toBe(false));
    expect(element.querySelector(`[slot="${slotName}"]`)).toBeNull();
  });

  it('adds, replaces, and removes a message footer renderer after boot', async () => {
    const { instance, update } = await boot();
    await act(() =>
      instance.messaging.addMessage({
        id: 'with-footer',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'reply',
              message_item_options: {
                custom_footer_slot: { slot_name: 'footer-1', is_on: true },
              },
            },
          ],
        },
      } as never)
    );
    expect(hostFor('footer-1')).toBeNull();

    update({
      renderCustomMessageFooter: (slotName) => (
        <span data-probe="message-footer">{slotName}</span>
      ),
    });

    await waitFor(() =>
      expect(
        document.querySelector('[data-probe="message-footer"]')?.textContent
      ).toBe('footer-1')
    );
    await waitFor(() => expect(assignedSlotFor('footer-1')).not.toBeNull());
    const host = hostFor('footer-1');

    update({
      renderCustomMessageFooter: (slotName) => (
        <span data-probe="message-footer">Updated {slotName}</span>
      ),
    });
    await waitFor(() => expect(host.textContent).toBe('Updated footer-1'));
    expect(hostFor('footer-1')).toBe(host);

    update({});
    await waitFor(() => expect(hostFor('footer-1')).toBeNull());
  });

  it('restores the inline fallback when an input-node renderer returns null or is removed', async () => {
    const { instance, update } = await boot();
    await sendRequest(instance, {
      id: 'rich',
      input: {
        message_type: MessageInputType.TEXT,
        text: 'Ship it',
        display_content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'taskCard', attrs: { label: 'Ship it' } }],
            },
          ],
        },
      },
    });

    const slotName = 'rich::0.0';
    const bubbleSlot = () =>
      deepQuerySelector(
        getChatShadowRoot(),
        `slot[name="${slotName}"]`
      ) as HTMLSlotElement;
    await waitFor(() => expect(bubbleSlot()).not.toBeNull());
    expect(bubbleSlot().assignedNodes()).toHaveLength(0);
    expect(bubbleSlot().textContent).toBe('Ship it');

    update({ renderUserDefinedInputNode: () => <b>custom</b> });
    await waitFor(() => expect(assignedSlotFor(slotName)).not.toBeNull());
    expect(
      bubbleSlot()
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent)
    ).toEqual(['custom']);

    const host = hostFor(slotName);
    expect(host.tagName).toBe('DIV');
    update({ renderUserDefinedInputNode: () => <b>Updated custom</b> });
    await waitFor(() => expect(host.textContent).toBe('Updated custom'));
    expect(hostFor(slotName)).toBe(host);

    update({ renderUserDefinedInputNode: () => null });
    await waitFor(() => expect(hostFor(slotName)).toBeNull());
    expect(bubbleSlot().assignedNodes()).toHaveLength(0);
    expect(bubbleSlot().textContent).toBe('Ship it');

    update({ renderUserDefinedInputNode: () => <b>Restored custom</b> });
    await waitFor(() =>
      expect(hostFor(slotName)?.textContent).toBe('Restored custom')
    );
    expect(assignedSlotFor(slotName)).not.toBeNull();

    update({});
    await waitFor(() => expect(hostFor(slotName)).toBeNull());
    expect(bubbleSlot().assignedNodes()).toHaveLength(0);
    expect(bubbleSlot().textContent).toBe('Ship it');
  });

  it('projects custom renderUserDefinedInputNode content for a mention and keeps the default command chip', async () => {
    const { instance, update } = await boot();
    await sendRequest(instance, {
      id: 'token-rich',
      input: {
        message_type: MessageInputType.TEXT,
        text: '@Alice /deploy',
        display_content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
                { type: 'text', text: ' ' },
                { type: 'command', attrs: { id: 'c1', label: 'deploy' } },
              ],
            },
          ],
        },
      },
    });

    const mentionSlot = 'token-rich::0.0';
    const commandSlot = 'token-rich::0.2';
    const bubbleSlot = (name: string) =>
      deepQuerySelector(
        getChatShadowRoot(),
        `slot[name="${name}"]`
      ) as HTMLSlotElement;

    await waitFor(() => expect(bubbleSlot(mentionSlot)).not.toBeNull());
    await waitFor(() => expect(bubbleSlot(commandSlot)).not.toBeNull());

    expect(bubbleSlot(mentionSlot).assignedNodes()).toHaveLength(0);
    expect(bubbleSlot(commandSlot).assignedNodes()).toHaveLength(0);
    const defaultChip = (name: string, type: string) =>
      bubbleSlot(name).querySelector(`[data-token-type="${type}"]`);
    await waitFor(() =>
      expect(defaultChip(mentionSlot, 'mention')?.textContent).toBe('Alice')
    );
    expect(defaultChip(commandSlot, 'command')?.textContent).toBe('deploy');

    update({
      renderUserDefinedInputNode: ({ node }) =>
        node.type === 'mention' ? (
          <b data-probe="mention-chip">@{String(node.attrs?.label ?? '')}</b>
        ) : null,
    });

    await waitFor(() => expect(assignedSlotFor(mentionSlot)).not.toBeNull());
    expect(hostFor(mentionSlot)?.tagName).toBe('SPAN');
    expect(
      bubbleSlot(mentionSlot)
        .assignedNodes({ flatten: true })
        .map((n) => n.textContent)
    ).toEqual(['@Alice']);

    await waitFor(() => expect(hostFor(commandSlot)).toBeNull());
    expect(bubbleSlot(commandSlot).assignedNodes()).toHaveLength(0);
  });

  it('keeps the default chip when renderUserDefinedInputNode returns false for a mention', async () => {
    const { instance, update } = await boot();
    await sendRequest(instance, {
      id: 'token-false',
      input: {
        message_type: MessageInputType.TEXT,
        text: '@Alice',
        display_content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
              ],
            },
          ],
        },
      },
    });

    const mentionSlot = 'token-false::0.0';
    const bubbleSlot = (name: string) =>
      deepQuerySelector(
        getChatShadowRoot(),
        `slot[name="${name}"]`
      ) as HTMLSlotElement;

    update({
      renderUserDefinedInputNode: () => false as unknown as React.ReactNode,
    });

    await waitFor(() => expect(bubbleSlot(mentionSlot)).not.toBeNull());
    expect(hostFor(mentionSlot)).toBeNull();
    await waitFor(() =>
      expect(
        bubbleSlot(mentionSlot).querySelector('[data-token-type="mention"]')
          ?.textContent
      ).toBe('Alice')
    );
  });

  it('keeps the default chip when a cds-aichat-container callback returns null', async () => {
    const renderUserDefinedInputNode: CdsAiChatContainerElement['renderUserDefinedInputNode'] =
      ({ node }) => {
        if (node.type !== 'mention') {
          return null;
        }
        const chip = document.createElement('b');
        chip.textContent = `@${node.attrs?.label}`;
        return chip;
      };
    const { element, instance } = await bootWC({ renderUserDefinedInputNode });
    await sendRequest(instance, {
      id: 'wc-token',
      input: {
        message_type: MessageInputType.TEXT,
        text: '@Alice /deploy',
        display_content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
                { type: 'text', text: ' ' },
                { type: 'command', attrs: { id: 'c1', label: 'deploy' } },
              ],
            },
          ],
        },
      },
    });

    const hostIn = (slot: string) =>
      element.querySelector(`:scope > [slot="${slot}"]`);
    await waitFor(() =>
      expect(hostIn('wc-token::0.0')?.textContent).toBe('@Alice')
    );
    expect(hostIn('wc-token::0.2')).toBeNull();
    const commandSlot = element.shadowRoot?.querySelector(
      'slot[name="wc-token::0.2"]'
    ) as HTMLSlotElement;
    expect(commandSlot.assignedNodes()).toHaveLength(0);
    expect(
      commandSlot.querySelector('[data-token-type="command"]')?.textContent
    ).toBe('deploy');
  });

  it('keeps a cds-aichat-container callback element across later messages', async () => {
    const renderUserDefinedInputNode = jest.fn(() =>
      document.createElement('b')
    );
    const { element, instance } = await bootWC({ renderUserDefinedInputNode });
    await sendRequest(instance, {
      id: 'wc-kept',
      input: {
        message_type: MessageInputType.TEXT,
        text: 'Ship it',
        display_content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'taskCard', attrs: { label: 'Ship it' } }],
            },
          ],
        },
      },
    });

    const mounted = () =>
      element.querySelector(':scope > [slot="wc-kept::0.0"] > b');
    await waitFor(() => expect(mounted()).not.toBeNull());
    const first = mounted();
    const calls = renderUserDefinedInputNode.mock.calls.length;

    await addUserDefinedResponse(instance, 'wc-later');
    expect(mounted()).toBe(first);
    expect(renderUserDefinedInputNode).toHaveBeenCalledTimes(calls);
  });

  it('renders a chip in each slot when one node object appears twice', async () => {
    const renderUserDefinedInputNode = () => {
      const chip = document.createElement('b');
      chip.textContent = 'chip';
      return chip;
    };
    const { element, instance } = await bootWC({ renderUserDefinedInputNode });
    const alice = { type: 'mention', attrs: { id: 'u1', label: 'Alice' } };
    await sendRequest(instance, {
      id: 'wc-alias',
      input: {
        message_type: MessageInputType.TEXT,
        text: '@Alice and @Alice',
        display_content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [alice, { type: 'text', text: ' and ' }, alice],
            },
          ],
        },
      },
    });

    const hostIn = (slot: string) =>
      element.querySelector(`:scope > [slot="${slot}"]`);
    await waitFor(() =>
      expect(
        ['wc-alias::0.0', 'wc-alias::0.2'].map(
          (slot) => hostIn(slot)?.textContent
        )
      ).toEqual(['chip', 'chip'])
    );
  });

  it('renders input nodes through a cds-aichat-container callback', async () => {
    const { instance, update } = await bootWC();
    await update({
      renderUserDefinedInputNode: () => {
        const element = document.createElement('b');
        element.dataset.probe = 'wc-input-node';
        element.textContent = 'custom';
        return element;
      },
    });

    await sendRequest(instance, {
      id: 'wc-rich',
      input: {
        message_type: MessageInputType.TEXT,
        text: 'Ship it',
        display_content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'taskCard', attrs: { label: 'Ship it' } }],
            },
          ],
        },
      },
    });

    await waitFor(() =>
      expect(
        document.querySelector('[data-probe="wc-input-node"]')?.textContent
      ).toBe('custom')
    );
  });

  it('updates writeable keys without replacing nodes or clearing imperative content', async () => {
    const { instance, update } = await boot();
    const nodes = Object.entries(instance.writeableElements);
    const footerNode = instance.writeableElements.footerElement;
    const afterInputNode = instance.writeableElements.afterInputElement;
    const imperative = document.createElement('span');
    imperative.textContent = 'Imperative footer';
    footerNode.appendChild(imperative);

    const expectNodesUnchanged = () => {
      for (const [name, node] of nodes) {
        expect(hostFor(name)).toBe(node);
      }
      expect(imperative.parentElement).toBe(footerNode);
      expect(imperative.textContent).toBe('Imperative footer');
    };
    const expectLayout = (footer: boolean, afterInput: boolean) => {
      expect(
        Boolean(
          deepQuerySelector(getChatShadowRoot(), '.cds-aichat--footer-element')
        )
      ).toBe(footer);
      expect(
        Boolean(
          deepQuerySelector(
            getChatShadowRoot(),
            '.cds-aichat--after-input-element'
          )
        )
      ).toBe(afterInput);
    };

    expect(footerNode.parentElement).toBe(getChatHost());
    expectLayout(true, true);
    expect(assignedSlotFor('footerElement')).not.toBeNull();
    expect(assignedSlotFor('afterInputElement')).not.toBeNull();

    update({ renderWriteableElements: {} });
    await waitFor(() => {
      expectLayout(false, false);
      expect(assignedSlotFor('footerElement')).toBeNull();
      expect(assignedSlotFor('afterInputElement')).toBeNull();
    });
    expectNodesUnchanged();

    update({
      renderWriteableElements: {
        footerElement: <p data-probe="writeable-footer">First footer</p>,
        afterInputElement: <p>After input</p>,
      },
    });
    await waitFor(() => {
      expect(assignedSlotFor('footerElement')).not.toBeNull();
      expect(assignedSlotFor('afterInputElement')).not.toBeNull();
      expect(footerNode.querySelector('p')?.textContent).toBe('First footer');
      expect(afterInputNode.textContent).toBe('After input');
    });
    expectNodesUnchanged();

    update({
      renderWriteableElements: {
        footerElement: <p data-probe="writeable-footer">Updated footer</p>,
      },
    });
    await waitFor(() => {
      expect(footerNode.querySelector('p')?.textContent).toBe('Updated footer');
      expect(assignedSlotFor('footerElement')).not.toBeNull();
      expect(assignedSlotFor('afterInputElement')).toBeNull();
      expect(afterInputNode.childNodes).toHaveLength(0);
      expectLayout(true, false);
    });
    expectNodesUnchanged();

    update({ renderWriteableElements: {} });
    await waitFor(() => {
      expect(assignedSlotFor('footerElement')).toBeNull();
      expect(footerNode.querySelector('p')).toBeNull();
    });
    expectNodesUnchanged();

    update({});
    await waitFor(() => {
      expect(assignedSlotFor('footerElement')).not.toBeNull();
      expect(assignedSlotFor('afterInputElement')).not.toBeNull();
    });
    expectNodesUnchanged();
  });
  describe('throwing slot callbacks', () => {
    it('logs a web-component callback error and keeps the chat mounted', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const boom = new Error('renderer boom');
      const { element, instance, update } = await bootWC({
        renderUserDefinedResponse: () => {
          const content = document.createElement('span');
          content.dataset.probe = 'wc-throw';
          return content;
        },
      });

      await addUserDefinedResponse(instance, 'throw-udr', {});
      const content = await waitFor(() => {
        const match = element.querySelector<HTMLElement>(
          '[data-probe="wc-throw"]'
        );
        expect(match).not.toBeNull();
        return match as HTMLElement;
      });
      const host = content.parentElement;

      await update({
        renderUserDefinedResponse: () => {
          throw boom;
        },
      });
      await waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('Error in renderUserDefinedResponse:'),
          boom
        )
      );
      await waitFor(() => expect(host?.isConnected).toBe(false));
      expect(
        element.shadowRoot?.querySelector('[data-testid="input_field"]')
      ).not.toBeNull();
      consoleError.mockRestore();
    });

    it('lets a React render-prop error reach the host error boundary', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const boom = new Error('react renderer boom');
      const onError = jest.fn();
      let instance: ChatInstance | null = null;
      render(
        <TestErrorBoundary onError={onError}>
          <ChatContainer
            {...config}
            onBeforeRender={(chat) => {
              instance = chat;
            }}
            renderUserDefinedResponse={() => {
              throw boom;
            }}
          />
        </TestErrorBoundary>
      );
      await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });

      await addUserDefinedResponse(instance as ChatInstance, 'throw-react', {});
      await waitFor(() => expect(onError).toHaveBeenCalledWith(boom));
      expect(
        document.querySelector('[data-probe="host-error-boundary"]')
      ).not.toBeNull();
      consoleError.mockRestore();
    });
  });
});
