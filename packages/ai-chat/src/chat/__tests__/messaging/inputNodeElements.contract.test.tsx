/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { StrictMode, useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { JSONContent } from '@tiptap/core';

import {
  ChatContainer,
  ChatCustomElement,
  PageObjectId,
  type ChatContainerProps,
  type ChatInstance,
  type MessageRequest,
  type RenderUserDefinedInputNodeState,
} from '../../../aiChatEntry';
import {
  ELEMENT_TAGS,
  allByRole,
  byRole,
  byTestId,
  contractSetup,
  deferred,
  fakeBackend,
  flatChildren,
  getByTestId,
  isInFlatTree,
  isShownWithin,
  openElement,
  type ContractElementTag,
} from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

/** Matches the mount wait `contractChat` uses for a first boot. */
const MOUNT_BOUND_MS = 10000;

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          MOUNT_BOUND_MS
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

const REQUEST_ID = 'input-node-request';

/** Where a custom node sits: top level, or inside a paragraph. */
type NodeKind = 'block' | 'inline';
const NODE_KINDS: NodeKind[] = ['block', 'inline'];

/** A sent request whose rich content holds these custom nodes. */
function requestWith(kind: NodeKind, nodes: JSONContent[]): MessageRequest {
  const content =
    kind === 'block'
      ? nodes
      : [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hi ' }, ...nodes],
          },
        ];
  return {
    id: REQUEST_ID,
    input: {
      text: 'custom',
      display_content: { type: 'doc', content },
    },
  } as MessageRequest;
}

/** The one custom node in a request `requestWith` built. */
function nodeOf(kind: NodeKind, request: MessageRequest): JSONContent {
  const [first] = request.input.display_content.content;
  return kind === 'block' ? first : first.content[1];
}

function customNode(attrs: Record<string, string>): JSONContent {
  return { type: 'custom', attrs };
}

/** A copy of the request as the chat's public state holds it now. */
function storedRequest(instance: ChatInstance): MessageRequest {
  const stored = instance.state
    .get()
    .messages.find((message) => message.id === REQUEST_ID);
  return JSON.parse(JSON.stringify(stored)) as MessageRequest;
}

function span(text: string): HTMLElement {
  const element = document.createElement('span');
  element.textContent = text;
  return element;
}

function mainPanel(): HTMLElement {
  return getByTestId(PageObjectId.MAIN_PANEL);
}

/**
 * The text a user sees under `node`: what the flat tree shows, leaving out
 * what is `hidden` or styled `display: none` inline.
 */
function visibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (
    node instanceof Element &&
    (node.tagName === 'STYLE' ||
      node.hasAttribute('hidden') ||
      (node as HTMLElement).style?.display === 'none')
  ) {
    return '';
  }
  return flatChildren(node).map(visibleText).join('');
}

function visibleMainPanelText(): string {
  return visibleText(mainPanel()).replace(/\s+/g, ' ');
}

/** Connects an open element with this callback, answering each send at once. */
async function mountElement(
  tag: ContractElementTag,
  renderUserDefinedInputNode: (
    state: RenderUserDefinedInputNodeState
  ) => HTMLElement | null
): Promise<ChatInstance> {
  const backend = fakeBackend({ autoResolve: true });
  const { instance } = await openElement(tag, {
    renderUserDefinedInputNode,
    messaging: { customSendMessage: backend.customSendMessage },
  });
  return instance;
}

// @covers element.cds-aichat-container.renderUserDefinedInputNode element.cds-aichat-custom-element.renderUserDefinedInputNode
// @covers instance.messaging.insertHistory
describe.each(ELEMENT_TAGS)('public input-node elements on %s', (tag) => {
  contractSetup();

  it('shows a top-level node’s label when the callback returns null for it', async () => {
    const renderNode = vi.fn(
      (state: RenderUserDefinedInputNodeState): HTMLElement | null =>
        state.node.attrs?.label === 'Replaced label'
          ? span('Rendered chip')
          : null
    );
    const instance = await mountElement(tag, renderNode);
    await act(() =>
      instance.send(
        requestWith('block', [
          customNode({ label: 'Fallback label' }),
          customNode({ label: 'Replaced label' }),
        ])
      )
    );
    // The node the callback renders hides its label, so this text is what
    // the user sees.
    await waitFor(() => {
      const text = visibleMainPanelText();
      expect(text).toContain('Rendered chip');
      expect(text).not.toContain('Replaced label');
    });
    expect(
      renderNode.mock.calls.map(([state]) => state.node.attrs?.label)
    ).toEqual(expect.arrayContaining(['Fallback label', 'Replaced label']));
    expect(visibleMainPanelText()).toContain('Fallback label');
  });

  it.each(NODE_KINDS)(
    'shows the element it returns for the %s node in the main panel, from page DOM',
    async (kind) => {
      const chip = span('Rendered chip');
      const instance = await mountElement(tag, () => chip);
      await act(() =>
        instance.send(requestWith(kind, [customNode({ label: 'fallback' })]))
      );
      await waitFor(() => expect(isShownWithin(chip, mainPanel())).toBe(true));
      expect(isInFlatTree(chip)).toBe(true);
      expect(chip.getRootNode()).toBe(document);
    }
  );

  it.each(NODE_KINDS)(
    'first connects a custom element it returns for the %s node already shown in the main panel',
    async (kind) => {
      // What the element saw each time it connected: shown in the main panel
      // and reachable through the flat tree, or not.
      const connects: boolean[] = [];
      const name = `${tag}-${kind}-first-connect-probe`;
      customElements.define(
        name,
        class extends HTMLElement {
          connectedCallback() {
            const panel = byTestId(PageObjectId.MAIN_PANEL);
            connects.push(
              panel !== null && isShownWithin(this, panel) && isInFlatTree(this)
            );
          }
        }
      );
      const probe = document.createElement(name);
      const instance = await mountElement(tag, () => probe);
      await act(() =>
        instance.send(requestWith(kind, [customNode({ label: 'fallback' })]))
      );
      await waitFor(() => expect(connects.length).toBeGreaterThan(0));
      expect(connects[0]).toBe(true);
      expect(isShownWithin(probe, mainPanel())).toBe(true);
    }
  );

  it.each(NODE_KINDS)(
    'keeps the element it returned for the %s node, and its typed value, through message updates that leave the node unchanged',
    async (kind) => {
      const renderNode = vi.fn(() => document.createElement('input'));
      const instance = await mountElement(tag, renderNode);
      await act(() =>
        instance.send(
          requestWith(kind, [customNode({ id: 'ada', label: 'Ada' })])
        )
      );
      await waitFor(() => expect(renderNode).toHaveBeenCalledTimes(1));
      const field = renderNode.mock.results[0].value;
      await waitFor(() => expect(isShownWithin(field, mainPanel())).toBe(true));
      await act(async () => {
        field.value = 'consumer state';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await act(() => instance.send('unrelated'));
      expect(
        instance.state
          .get()
          .messages.some(
            (message) => (message as MessageRequest).input?.text === 'unrelated'
          )
      ).toBe(true);
      expect(renderNode).toHaveBeenCalledTimes(1);
      expect(isShownWithin(field, mainPanel())).toBe(true);
      expect(field.value).toBe('consumer state');

      // The same node from history, with its attributes in another order.
      const restored = storedRequest(instance);
      nodeOf(kind, restored).attrs = { label: 'Ada', id: 'ada' };
      await act(() =>
        instance.messaging.insertHistory([
          { message: restored, time: '2026-01-01T12:00:00.000Z' },
        ])
      );
      expect(Object.keys(nodeOf(kind, storedRequest(instance)).attrs)).toEqual([
        'label',
        'id',
      ]);
      expect(renderNode).toHaveBeenCalledTimes(1);
      expect(isShownWithin(field, mainPanel())).toBe(true);
      expect(field.value).toBe('consumer state');
    }
  );
});

type Props = Partial<ChatContainerProps>;

const REACT_HOSTS: [string, (props: Props) => React.ReactElement][] = [
  ['ChatContainer', (props) => <ChatContainer {...props} />],
  [
    'ChatCustomElement',
    (props) => <ChatCustomElement className="contract-chat" {...props} />,
  ],
];

const NODE_BUTTON = 'Strict input node';

/** Node content that reports each mount and unmount of its effects. */
function NodeButton({ onMount }: { onMount: () => () => void }) {
  useEffect(onMount, [onMount]);
  return <button type="button">{NODE_BUTTON}</button>;
}

// @covers react.ChatContainer.renderUserDefinedInputNode instance.messaging.restartConversation
describe.each(REACT_HOSTS)(
  'public input-node content in React.StrictMode through %s',
  (_name, Host) => {
    contractSetup();

    it.each(NODE_KINDS)(
      'shows the %s node’s content once and unmounts it when the conversation restarts',
      async (kind) => {
        let mounted = 0;
        const onMount = () => {
          mounted += 1;
          return () => {
            mounted -= 1;
          };
        };
        const backend = fakeBackend({ autoResolve: true });
        const rendered = deferred<ChatInstance>();
        await act(async () => {
          render(
            <StrictMode>
              <Host
                openChatByDefault
                messaging={{
                  skipWelcome: true,
                  customSendMessage: backend.customSendMessage,
                }}
                renderUserDefinedInputNode={({ node }) =>
                  node.type === 'custom' ? (
                    <NodeButton onMount={onMount} />
                  ) : null
                }
                onAfterRender={(handed) => rendered.resolve(handed)}
              />
            </StrictMode>
          );
        });
        const instance = await bounded(rendered.promise, 'the first render');

        await act(() =>
          instance.send(requestWith(kind, [customNode({ label: 'fallback' })]))
        );
        await waitFor(() =>
          expect(allByRole('button', NODE_BUTTON)).toHaveLength(1)
        );
        expect(isShownWithin(byRole('button', NODE_BUTTON), mainPanel())).toBe(
          true
        );
        expect(mounted).toBe(1);

        await act(() => instance.messaging.restartConversation());
        await waitFor(() => expect(mounted).toBe(0));
        expect(allByRole('button', NODE_BUTTON)).toEqual([]);
      }
    );
  }
);
