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

import React, {
  StrictMode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type NativeChatHeader from '@carbon/ai-chat-components/es/components/chat-shell/src/chat-header.js';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

import '../../web-components/cds-aichat-container';
import { ChatContainer } from '../ChatContainer';
import { ChatContainerProps } from '../../types/component/ChatContainer';
import { ChatInstance } from '../../types/instance/ChatInstance';
import {
  MessageInputType,
  MessageRequest,
  MessageResponseTypes,
} from '../../types/messaging/Messages';
import {
  addUserDefinedResponse,
  createBaseConfig,
  getChatHost,
  getChatShadowRoot,
  setupAfterEach,
  setupBeforeEach,
} from '../../chat/__tests__/helpers/chat';
import { untilCalled, untilDom } from '../../chat/__tests__/helpers/waits';

const config = { ...createBaseConfig(), openChatByDefault: true };

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

function inputTarget(owner: HTMLElement, key: string) {
  return owner.querySelector(
    `[data-aichat-input-node-slot="${key}"]`
  ) as HTMLElement;
}

function inputHost(owner: HTMLElement, key: string) {
  const target = inputTarget(owner, key);
  return target?.children.length > 1
    ? (target.lastElementChild as HTMLElement)
    : null;
}

function inputFallback(owner: HTMLElement, key: string) {
  return inputTarget(owner, key)?.firstElementChild as HTMLElement;
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
    unmount: () => view.unmount(),
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

/** A stateful child, so a remount shows as a reset count. */
function Counter({ id }: { id: string }) {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      data-probe={id}
      onClick={() => setCount((value) => value + 1)}>
      {count}
    </button>
  );
}

function probe(id: string) {
  return document.querySelector<HTMLElement>(`[data-probe="${id}"]`);
}

function addFooterMessage(instance: ChatInstance, slotName: string) {
  return act(() =>
    instance.messaging.addMessage({
      id: `with-${slotName}`,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'reply',
            message_item_options: {
              custom_footer_slot: { slot_name: slotName, is_on: true },
            },
          },
        ],
      },
    } as never)
  );
}

function sendTaskCard(instance: ChatInstance, id: string) {
  return sendRequest(instance, {
    id,
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

    const renderA = vi.fn((state) => (
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
    const streamingHost = Array.from(
      document.querySelectorAll('[data-probe="a"]')
    ).find((node) => node.textContent === 'partials:1').parentElement;
    await act(() =>
      instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'udr-stream' },
        complete_item: {
          streaming_metadata: { id: 'item-1' },
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { label: 'complete' },
        },
      } as never)
    );
    await waitFor(() => expect(streamingHost.textContent).toBe('complete'));
    expect(hostFor(streamingHost.getAttribute('slot'))).toBe(streamingHost);

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

  it('renders request footers for history inserted before the chat renders', async () => {
    let instance: ChatInstance | null = null;
    render(
      <ChatContainer
        {...config}
        onBeforeRender={async (chat) => {
          instance = chat;
          await chat.messaging.insertHistory([
            {
              time: '2026-01-01T00:00:00.000Z',
              message: {
                id: 'restored',
                input: { message_type: MessageInputType.TEXT, text: 'earlier' },
              },
            } as never,
          ]);
        }}
        renderCustomRequestFooter={(_slotName, message) => (
          <span data-probe="restored-footer">{message.id}</span>
        )}
      />
    );
    await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });
    await waitFor(() =>
      expect(probe('restored-footer')?.textContent).toBe('restored')
    );
  });

  it('adds, replaces, and removes a message footer renderer after boot', async () => {
    const renderUserDefinedResponse = () => <p data-probe="kept-response" />;
    const { instance, update } = await boot({ renderUserDefinedResponse });
    await addUserDefinedResponse(instance, 'kept-response');
    await addFooterMessage(instance, 'footer-1');
    expect(hostFor('footer-1')).toBeNull();
    const responseHost = (
      await waitFor(() => {
        const node = probe('kept-response');
        expect(node).not.toBeNull();
        return node;
      })
    ).parentElement;
    const callerNode = document.createElement('div');
    callerNode.setAttribute('slot', 'caller-owned');
    getChatHost().appendChild(callerNode);
    const writeable = Object.values(instance.writeableElements)[0];
    expect(writeable.parentNode).toBe(getChatHost());

    update({
      renderUserDefinedResponse,
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
      renderUserDefinedResponse,
      renderCustomMessageFooter: (slotName) => (
        <span data-probe="message-footer">Updated {slotName}</span>
      ),
    });
    await waitFor(() => expect(host.textContent).toBe('Updated footer-1'));
    expect(hostFor('footer-1')).toBe(host);

    // Removing the footer renderer releases only the footer hosts.
    update({ renderUserDefinedResponse });
    await waitFor(() => expect(hostFor('footer-1')).toBeNull());
    expect(responseHost.parentElement).toBe(getChatHost());
    expect(callerNode.parentElement).toBe(getChatHost());
    expect(writeable.parentNode).toBe(getChatHost());
  });

  it('normalizes configured React icons while retaining Carbon descriptors through the native header adapter', async () => {
    const ReactIcon = React.forwardRef<SVGSVGElement>((_props, ref) => (
      <svg ref={ref} viewBox="0 0 16 16">
        <path d="M2 2h12v12H2z" />
      </svg>
    ));
    ReactIcon.displayName = 'HeaderTestIcon';
    const descriptor = {
      elem: 'svg',
      name: 'test-descriptor',
      size: 16,
      attrs: { viewBox: '0 0 16 16', width: 16, height: 16 },
      content: [{ elem: 'path', attrs: { d: 'M1 1h14v14H1z' } }],
    };
    const after = vi.fn();
    render(
      <ChatContainer
        {...config}
        onAfterRender={after}
        header={{
          actions: [
            {
              text: 'React icon',
              icon: ReactIcon,
              onClick: vi.fn(),
              fixed: true,
            },
            {
              text: 'Carbon icon',
              icon: descriptor,
              onClick: vi.fn(),
              fixed: true,
            },
          ],
        }}
      />
    );
    await untilCalled(after);
    expect(after).toHaveBeenCalledTimes(1);
    const native = getChatHost().shadowRoot.querySelector(
      'cds-aichat-header-view'
    );
    const base = native.querySelector(
      'cds-aichat-chat-header'
    ) as NativeChatHeader;
    const reactAction = base.actions.find(
      (action) => action.text === 'React icon'
    );
    const carbonAction = base.actions.find(
      (action) => action.text === 'Carbon icon'
    );
    expect(reactAction.icon).toEqual(
      expect.objectContaining({
        elem: 'svg',
        content: expect.arrayContaining([
          expect.objectContaining({
            elem: 'path',
            attrs: expect.objectContaining({ d: 'M2 2h12v12H2z' }),
          }),
        ]),
      })
    );
    expect(carbonAction.icon).toEqual(descriptor);
    await untilDom(base.shadowRoot, () =>
      expect(
        deepQuerySelector(base.shadowRoot, 'path[d="M2 2h12v12H2z"]')
      ).not.toBeNull()
    );
    expect(
      deepQuerySelector(base.shadowRoot, 'path[d="M1 1h14v14H1z"]')
    ).not.toBeNull();
  });
});

describe('extension hosts outside React', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('connects each host before its content runs layout effects', async () => {
    const seen: Record<string, boolean> = {};
    function Measured({ id }: { id: string }) {
      const ref = useRef<HTMLSpanElement>(null);
      useLayoutEffect(() => {
        seen[id] = ref.current.isConnected;
      }, [id]);
      return <span ref={ref} />;
    }
    const { instance } = await boot({
      renderUserDefinedResponse: () => <Measured id="response" />,
      renderCustomMessageFooter: () => <Measured id="footer" />,
      renderCustomRequestFooter: () => <Measured id="request" />,
      renderUserDefinedInputNode: () => <Measured id="node" />,
    });
    await addUserDefinedResponse(instance, 'measured');
    await addFooterMessage(instance, 'measured-footer');
    // A block node. The inline case is the next test.
    await sendRequest(instance, {
      id: 'measured-block',
      input: {
        message_type: MessageInputType.TEXT,
        text: 'Ship it',
        display_content: {
          type: 'doc',
          content: [{ type: 'taskCard', attrs: { label: 'Ship it' } }],
        },
      },
    });

    await waitFor(() =>
      expect(Object.keys(seen).sort()).toEqual([
        'footer',
        'node',
        'request',
        'response',
      ])
    );
    expect(seen).toEqual({
      response: true,
      footer: true,
      request: true,
      node: true,
    });
  });

  it('puts inline input-node content on the page before its mount effects run', async () => {
    const seen: Record<string, boolean> = {};
    function Inline() {
      const ref = useRef<HTMLElement>(null);
      useLayoutEffect(() => {
        const target = ref.current.closest('[data-aichat-input-node-slot]');
        seen.layout = ref.current.isConnected;
        seen.fallbackHidden =
          (target?.firstElementChild as HTMLElement)?.hidden === true;
      }, []);
      useEffect(() => {
        seen.passive = ref.current.isConnected;
      }, []);
      return <b ref={ref}>custom</b>;
    }
    const { instance } = await boot({
      renderUserDefinedInputNode: () => <Inline />,
    });

    await sendTaskCard(instance, 'inline-measured');

    await waitFor(() => expect(seen.passive).toBeDefined());
    expect(seen).toEqual({ layout: true, fallbackHidden: true, passive: true });
    const slotName = 'inline-measured::0.0';
    expect(inputHost(getChatHost(), slotName).textContent).toBe('custom');
  });

  it('keeps the inline fallback until content renders when the renderer arrives late', async () => {
    type InputNodeRenderer = ChatContainerProps['renderUserDefinedInputNode'];
    let setRenderer: (next: InputNodeRenderer) => void;
    let instance: ChatInstance | null = null;
    function LateRenderer() {
      const [renderer, setState] = useState<InputNodeRenderer>();
      setRenderer = (next) => setState(() => next);
      return (
        <ChatContainer
          {...config}
          onBeforeRender={(chat) => {
            instance = chat;
          }}
          renderUserDefinedInputNode={renderer}
        />
      );
    }
    render(<LateRenderer />);
    await waitFor(() => expect(instance).not.toBeNull(), { timeout: 5000 });
    await sendTaskCard(instance, 'late-inline');
    const slotName = 'late-inline::0.0';
    await waitFor(() =>
      expect(inputFallback(getChatHost(), slotName)).toBeTruthy()
    );
    const target = inputTarget(getChatHost(), slotName);
    const fallback = inputFallback(getChatHost(), slotName);
    const blank: boolean[] = [];
    const observer = new MutationObserver(() => {
      blank.push(fallback.hidden && !probe('late-inline'));
    });
    observer.observe(target, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    // Outside act, as on a page: React runs passive effects in a later task.
    const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const wasActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      setTimeout(() => setRenderer(() => <b data-probe="late-inline">late</b>));
      await waitFor(() => expect(probe('late-inline')).not.toBeNull());
    } finally {
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
      observer.disconnect();
    }

    expect(fallback.hidden).toBe(true);
    expect(blank).not.toContain(true);
  });

  it('keeps hosts and React state across new render-prop identities and unrelated updates', async () => {
    const renderers = () => ({
      renderCustomMessageFooter: () => <Counter id="footer-count" />,
      renderCustomRequestFooter: (_slot: string, message: MessageRequest) =>
        message.id === 'counted' ? <Counter id="request-count" /> : null,
      renderUserDefinedInputNode: () => <Counter id="node-count" />,
    });
    const { instance, update } = await boot(renderers());
    await addFooterMessage(instance, 'counted-footer');
    await sendTaskCard(instance, 'counted');

    const ids = ['footer-count', 'request-count', 'node-count'];
    await waitFor(() => ids.forEach((id) => expect(probe(id)).not.toBeNull()));
    const buttons = ids.map(probe);
    const hosts = buttons.map((button) => button.parentElement);
    buttons.forEach((button) => fireEvent.click(button));
    buttons.forEach((button) => expect(button.textContent).toBe('1'));

    // New inline callbacks on every host render.
    update(renderers());
    await settle();
    // An unrelated config change and an unrelated message.
    update({ ...renderers(), assistantName: 'Unrelated' });
    await sendRequest(instance, { id: 'unrelated' });
    await settle();

    ids.forEach((id, index) => {
      expect(probe(id)).toBe(buttons[index]);
      expect(buttons[index].textContent).toBe('1');
      expect(buttons[index].parentElement).toBe(hosts[index]);
      expect(hosts[index].isConnected).toBe(true);
    });
  });
});
