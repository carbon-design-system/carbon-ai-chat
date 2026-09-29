/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * React render props stay live after boot. Their hosts land in the chat host's
 * light DOM, where page CSS reaches them, and slots in its shadow root project
 * them. Removing a render prop removes its hosts, so a slot with nothing to
 * show has no host and its fallback content shows.
 */

import React, { StrictMode } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import { ChatContainer } from '../../../src/react/ChatContainer';
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

/**
 * The slot a host node is projected into, or null when nothing picked it up.
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

function sendRequest(instance: ChatInstance, request: Partial<MessageRequest>) {
  return act(() =>
    instance.send({
      input: { message_type: MessageInputType.TEXT, text: 'hello' },
      ...request,
    } as MessageRequest)
  );
}

describe('React render props after boot', () => {
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
});
