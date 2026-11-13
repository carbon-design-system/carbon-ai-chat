/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * What a React host sees through `ChatContainer`'s own props: the two render
 * callbacks, the two view callbacks, and the render props, including what
 * changes when React renders the host again with a new value. The React
 * lifecycle cases (StrictMode, unmount, a new `key`) run through both React
 * hosts. Config props that React passes through are in
 * `config/configUpdates_spec.ts`; `ChatCustomElement`'s own props are in
 * `reactCustomElement_spec.tsx`.
 *
 * Most tests render their own tree rather than calling `contractChat`, to
 * wrap the host in StrictMode, a context provider, or an error boundary, or to
 * keep the callbacks the test passed as they are on a rerender.
 */

import React, { StrictMode, createContext, useContext, useState } from 'react';
import { RenderResult, act, render, waitFor } from '@testing-library/react';

import {
  BusEventType,
  BusEventViewChange,
  BusEventViewPreChange,
  ChatContainer,
  ChatContainerProps,
  ChatCustomElement,
  ChatInstance,
  HistoryItem,
  MessageInputType,
  MessageRequest,
  PageObjectId,
  ViewChangeReason,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  allByTestId,
  byRole,
  byTestId,
  changeView,
  click,
  contractChat,
  contractSetup,
  countChatReady,
  deferred,
  fakeBackend,
  finishSend,
  flatChildren,
  getByTestId,
  instanceSender,
  isHidden,
  isInFlatTree,
  isShownWithin,
  mainPanelText,
  pause,
  recordEvents,
  responseOf,
  slotted,
  startSend,
  textResponse,
  userDefinedItem,
} from '../../helpers';

type Props = Partial<ChatContainerProps>;

/** Renders one of the two React hosts with these props. */
type ReactHost = (props: Props) => React.ReactElement;

const REACT_HOSTS: [string, ReactHost][] = [
  ['ChatContainer', (props) => <ChatContainer {...props} />],
  [
    'ChatCustomElement',
    (props) => <ChatCustomElement className="contract-chat" {...props} />,
  ],
];

/** A chat that opens at mount and sends no welcome request. */
const OPEN: Props = {
  openChatByDefault: true,
  messaging: { skipWelcome: true },
};

/** A rendered tree, and ways to render it again or take it down. */
interface TreeMount {
  view: RenderResult;
  rerender: (tree: React.ReactElement) => Promise<void>;
  unmount: () => Promise<void>;
}

/** Renders a tree inside `act`, without waiting for the chat in it. */
async function renderTree(tree: React.ReactElement): Promise<TreeMount> {
  let view: RenderResult;
  await act(async () => {
    view = render(tree);
  });
  return {
    view,
    rerender: async (next) => {
      await act(async () => {
        view.rerender(next);
      });
    },
    unmount: async () => {
      await act(async () => {
        view.unmount();
      });
    },
  };
}

/** Waits until a mock has been called this many times. */
async function calledTimes(mock: jest.Mock, times = 1): Promise<void> {
  await waitFor(() => expect(mock).toHaveBeenCalledTimes(times), {
    timeout: 10000,
  });
}

/** The instance a callback mock got on its call at `index`. */
function instanceFrom(mock: jest.Mock, index = 0): ChatInstance {
  return mock.mock.calls[index][0] as ChatInstance;
}

/** Whether the chat's input shows anywhere on the page. */
function inputShown(): boolean {
  return allByTestId(PageObjectId.INPUT).length > 0;
}

/** The arguments `console.error` got, in order. */
function errorLogs(): unknown[][] {
  return (console.error as jest.Mock).mock.calls;
}

// @covers react.ChatContainer.onBeforeRender
describe.each(REACT_HOSTS)('onBeforeRender through %s', (_name, Host) => {
  contractSetup();

  it('runs once, before the chat renders, with the instance onAfterRender gets', async () => {
    let inputAtCall: boolean;
    const onBeforeRender = jest.fn(() => {
      inputAtCall = inputShown();
    });
    const onAfterRender = jest.fn();
    await renderTree(<Host {...OPEN} {...{ onBeforeRender, onAfterRender }} />);
    await calledTimes(onAfterRender);
    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(inputAtCall).toBe(false);
    expect(inputShown()).toBe(true);
    expect(instanceFrom(onAfterRender)).toBe(instanceFrom(onBeforeRender));
  });

  it('holds the first render until its promise resolves', async () => {
    const gate = deferred();
    const onBeforeRender = jest.fn(() => gate.promise);
    const onAfterRender = jest.fn();
    await renderTree(<Host {...OPEN} {...{ onBeforeRender, onAfterRender }} />);
    await calledTimes(onBeforeRender);
    // A short wait to show nothing renders while the promise is pending.
    await pause(100);
    expect(inputShown()).toBe(false);
    expect(onAfterRender).not.toHaveBeenCalled();

    await act(async () => gate.resolve());
    await calledTimes(onAfterRender);
    expect(inputShown()).toBe(true);
  });

  it.each([
    [
      'throws',
      (error: Error) => () => {
        throw error;
      },
    ],
    ['rejects', (error: Error) => () => Promise.reject(error)],
  ])(
    'logs the error and stays unrendered when it %s, and a rerender does not retry it',
    async (_label, failWith) => {
      const error = new Error('before-render failed');
      const onBeforeRender = jest.fn(failWith(error));
      const onAfterRender = jest.fn();
      (console.error as jest.Mock).mockClear();
      const tree = await renderTree(
        <Host {...OPEN} {...{ onBeforeRender, onAfterRender }} />
      );
      await waitFor(() =>
        expect(errorLogs().some((args) => args.includes(error))).toBe(true)
      );

      const retry = jest.fn();
      await tree.rerender(
        <Host
          {...OPEN}
          header={{ title: 'Changed' }}
          onBeforeRender={retry}
          onAfterRender={onAfterRender}
        />
      );
      // A short wait to show the chat neither renders nor calls back.
      await pause(100);
      expect(inputShown()).toBe(false);
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
      expect(retry).not.toHaveBeenCalled();
      expect(onAfterRender).not.toHaveBeenCalled();
    }
  );

  it('shows, at the first render, a user-defined response added while it runs', async () => {
    const onAfterRender = jest.fn();
    const renderUserDefinedResponse = jest.fn(() => (
      <button type="button">Early content</button>
    ));
    await renderTree(
      <Host
        {...OPEN}
        onBeforeRender={(instance) => {
          instance.messaging.addMessage(
            responseOf('early', [userDefinedItem('item', { kind: 'early' })])
          );
        }}
        onAfterRender={onAfterRender}
        renderUserDefinedResponse={renderUserDefinedResponse}
      />
    );
    await calledTimes(onAfterRender);
    await waitFor(() =>
      expect(allByRole('button', 'Early content')).toHaveLength(1)
    );
  });

  it('never renders the chat or calls onAfterRender when the host unmounts while its promise is pending', async () => {
    const gate = deferred();
    const onBeforeRender = jest.fn(() => gate.promise);
    const onAfterRender = jest.fn();
    const tree = await renderTree(
      <Host {...OPEN} {...{ onBeforeRender, onAfterRender }} />
    );
    await calledTimes(onBeforeRender);
    await tree.unmount();
    await act(async () => gate.resolve());
    // A short wait to show nothing renders after the promise resolves.
    await pause(100);
    expect(onAfterRender).not.toHaveBeenCalled();
    expect(inputShown()).toBe(false);
  });
});

// @covers react.ChatContainer.onAfterRender
describe.each(REACT_HOSTS)('onAfterRender through %s', (_name, Host) => {
  contractSetup();

  it('runs once, after onBeforeRender settles, with the chat already rendered', async () => {
    const order: string[] = [];
    const gate = deferred();
    const onBeforeRender = jest.fn(() => {
      order.push('before');
      return gate.promise;
    });
    const onAfterRender = jest.fn(() => {
      order.push(inputShown() ? 'after:rendered' : 'after:not rendered');
    });
    await renderTree(<Host {...OPEN} {...{ onBeforeRender, onAfterRender }} />);
    await calledTimes(onBeforeRender);
    await act(async () => gate.resolve());
    await calledTimes(onAfterRender);
    // A short wait to show it runs only once.
    await pause();
    expect(onAfterRender).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['before', 'after:rendered']);
  });

  it('runs without waiting for history to load', async () => {
    const history = deferred<HistoryItem[]>();
    const customLoadHistory = jest.fn(() => history.promise);
    const onAfterRender = jest.fn();
    await renderTree(
      <Host
        openChatByDefault
        messaging={{ skipWelcome: true, customLoadHistory }}
        onAfterRender={onAfterRender}
      />
    );
    await calledTimes(onAfterRender);
    expect(customLoadHistory).toHaveBeenCalledTimes(1);
    await act(async () => history.resolve([]));
  });

  it('leaves the chat working when its promise never settles', async () => {
    const onBeforeRender = jest.fn();
    const onAfterRender = jest.fn(() => new Promise<void>(() => undefined));
    await renderTree(<Host {...OPEN} {...{ onBeforeRender, onAfterRender }} />);
    await calledTimes(onAfterRender);
    const instance = instanceFrom(onBeforeRender);
    await act(() =>
      instance.messaging.addMessage(textResponse('Still working', 'r1'))
    );
    await waitFor(() => expect(mainPanelText()).toContain('Still working'));
  });

  it('calls the onAfterRender the host passed last before the first render finished', async () => {
    const gate = deferred();
    const onBeforeRender = jest.fn(() => gate.promise);
    const first = jest.fn();
    const second = jest.fn();
    const tree = await renderTree(
      <Host {...OPEN} onBeforeRender={onBeforeRender} onAfterRender={first} />
    );
    await calledTimes(onBeforeRender);
    await tree.rerender(
      <Host {...OPEN} onBeforeRender={onBeforeRender} onAfterRender={second} />
    );
    await act(async () => gate.resolve());
    await calledTimes(second);
    expect(first).not.toHaveBeenCalled();
    expect(instanceFrom(second)).toBe(instanceFrom(onBeforeRender));
  });
});

/** One call to a view callback, reduced to what a test compares. */
function viewCall(
  [event, instance]: [BusEventViewPreChange | BusEventViewChange, unknown],
  expected: ChatInstance
) {
  return {
    type: event.type,
    reason: event.reason,
    mainWindow: event.newViewState.mainWindow,
    instance: instance === expected ? 'the instance' : instance,
  };
}

// @covers react.ChatContainer.onViewPreChange react.ChatContainer.onViewChange
describe.each(REACT_HOSTS)(
  'onViewPreChange and onViewChange through %s',
  (_name, Host) => {
    contractSetup();

    /** Mounts closed, recording both view callbacks into one list. */
    async function mountRecording(extra: Props = {}) {
      const calls: [BusEventViewPreChange | BusEventViewChange, unknown][] = [];
      const onViewPreChange = jest.fn(
        (event: BusEventViewPreChange, instance: ChatInstance) => {
          calls.push([event, instance]);
        }
      );
      const onViewChange = jest.fn(
        (event: BusEventViewChange, instance: ChatInstance) => {
          calls.push([event, instance]);
        }
      );
      const onBeforeRender = jest.fn();
      const onAfterRender = jest.fn();
      const props: Props = {
        messaging: { skipWelcome: true },
        onBeforeRender,
        onAfterRender,
        onViewPreChange,
        onViewChange,
        ...extra,
      };
      const tree = await renderTree(<Host {...props} />);
      await calledTimes(onAfterRender);
      return {
        tree,
        props,
        calls,
        onViewPreChange,
        onViewChange,
        instance: instanceFrom(onBeforeRender),
      };
    }

    it('calls onViewPreChange, then onViewChange, with the event and the instance, from the load on', async () => {
      const { calls, instance } = await mountRecording();
      await changeView(instance, ViewType.MAIN_WINDOW);
      await waitFor(() => expect(calls).toHaveLength(4));
      expect(calls.map((call) => viewCall(call, instance))).toEqual([
        {
          type: BusEventType.VIEW_PRE_CHANGE,
          reason: ViewChangeReason.WEB_CHAT_LOADED,
          mainWindow: false,
          instance: 'the instance',
        },
        {
          type: BusEventType.VIEW_CHANGE,
          reason: ViewChangeReason.WEB_CHAT_LOADED,
          mainWindow: false,
          instance: 'the instance',
        },
        {
          type: BusEventType.VIEW_PRE_CHANGE,
          reason: ViewChangeReason.CALLED_CHANGE_VIEW,
          mainWindow: true,
          instance: 'the instance',
        },
        {
          type: BusEventType.VIEW_CHANGE,
          reason: ViewChangeReason.CALLED_CHANGE_VIEW,
          mainWindow: true,
          instance: 'the instance',
        },
      ]);
    });

    it('holds a view change until the promise onViewPreChange returns resolves', async () => {
      const gate = deferred();
      const { instance, onViewPreChange, onViewChange } =
        await mountRecording();
      onViewPreChange.mockImplementation(() => gate.promise);
      onViewChange.mockClear();
      let changed: Promise<void>;
      await act(async () => {
        changed = instance.changeView(ViewType.MAIN_WINDOW);
      });
      // A short wait to show the view stays as it was.
      await pause();
      expect(instance.getState().viewState.mainWindow).toBe(false);
      expect(onViewChange).not.toHaveBeenCalled();

      await act(async () => {
        gate.resolve();
        await changed;
      });
      expect(instance.getState().viewState.mainWindow).toBe(true);
      expect(onViewChange).toHaveBeenCalledTimes(1);
    });

    it('keeps calling the callbacks it mounted with after a rerender passes new ones or none', async () => {
      const { tree, props, instance, onViewPreChange, onViewChange } =
        await mountRecording();
      const newPreChange = jest.fn();
      const newChange = jest.fn();
      await tree.rerender(
        <Host
          {...props}
          onViewPreChange={newPreChange}
          onViewChange={newChange}
        />
      );
      onViewPreChange.mockClear();
      onViewChange.mockClear();
      await changeView(instance, ViewType.MAIN_WINDOW);
      // On `main` both callbacks are read once, when the chat starts. Only
      // ChatCustomElementProps documents that; ChatContainerProps does not.
      expect(onViewPreChange).toHaveBeenCalledTimes(1);
      expect(onViewChange).toHaveBeenCalledTimes(1);
      expect(newPreChange).not.toHaveBeenCalled();
      expect(newChange).not.toHaveBeenCalled();

      const { onViewPreChange: _pre, onViewChange: _change, ...rest } = props;
      await tree.rerender(<Host {...rest} />);
      await changeView(instance, ViewType.LAUNCHER);
      expect(onViewPreChange).toHaveBeenCalledTimes(2);
      expect(onViewChange).toHaveBeenCalledTimes(2);
    });
  }
);

/** Whether a user can see this node: it shows in the flat tree, unhidden. */
function visible(node: Element | null): boolean {
  return node !== null && isInFlatTree(node) && !isHidden(node);
}

/**
 * The text a user sees under `node`: like `shownText`, but leaving out what
 * is `hidden` or styled `display: none` inline.
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

/** What the main panel shows a user, with whitespace collapsed. */
function mainPanelVisibleText(): string {
  return visibleText(getByTestId(PageObjectId.MAIN_PANEL)).replace(/\s+/g, ' ');
}

/** Footer content a test renders, findable by a test ID it owns. */
const FOOTER_ID = 'contract-request-footer';

// @covers react.ChatContainer.renderCustomRequestFooter
describe('renderCustomRequestFooter', () => {
  contractSetup();

  type Footer = NonNullable<ChatContainerProps['renderCustomRequestFooter']>;

  /** A footer function that shows `prefix` and the message's text. */
  function footer(prefix: string): Footer {
    return function renderFooter(_slotName, message) {
      return (
        <span data-testid={FOOTER_ID}>
          {prefix} {message.input.text}
        </span>
      );
    };
  }

  /** Mounts open with this footer function, sending to a fake backend. */
  async function mount(render?: Footer) {
    const backend = fakeBackend();
    const props = (next?: Footer): Props => ({
      ...OPEN,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      renderCustomRequestFooter: next,
    });
    const chat = await contractChat(props(render));
    const sender = instanceSender(chat.instance, backend);
    return {
      ...chat,
      send: async (text: string) => {
        await finishSend(await startSend(sender, text));
      },
      setFooter: (next?: Footer) => chat.rerender(props(next)),
    };
  }

  const footerTexts = () =>
    allByTestId(FOOTER_ID)
      .filter(visible)
      .map((element) => element.textContent);

  it('shows its content under a sent message, called with the slot name, the message, and the instance', async () => {
    const render = jest.fn(footer('Footer for'));
    const { instance, host, send } = await mount(render);
    const events = recordEvents(instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
    ]);
    await send('hello');
    await waitFor(() => expect(footerTexts()).toEqual(['Footer for hello']));

    const [{ data }] = events.events as unknown as [
      { data: { slotName: string; message: MessageRequest } },
    ];
    const [slotName, message, handed] =
      render.mock.calls[render.mock.calls.length - 1];
    expect(slotName).toBe(data.slotName);
    expect(message.id).toBe(data.message.id);
    expect(message.input.text).toBe('hello');
    expect(handed).toBe(instance);
    const content = getByTestId(FOOTER_ID);
    expect(slotted(host, slotName).some((slot) => slot.contains(content))).toBe(
      true
    );
    expect(isShownWithin(content, getByTestId(PageObjectId.MAIN_PANEL))).toBe(
      true
    );
  });

  it('adds no slot for a message it returns null for', async () => {
    const { host, instance, send } = await mount((slotName, message) =>
      message.input.text === 'skip'
        ? null
        : footer('Footer for')(slotName, message, instance)
    );
    const events = recordEvents(instance, [
      BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
    ]);
    await send('skip');
    await send('keep');
    await waitFor(() => expect(footerTexts()).toEqual(['Footer for keep']));
    const [skipped] = events.events as unknown as [
      { data: { slotName: string } },
    ];
    expect(slotted(host, skipped.data.slotName)).toEqual([]);
  });

  it('shows the new content when the host rerenders with a new function', async () => {
    const { send, setFooter } = await mount(footer('First'));
    await send('hello');
    await waitFor(() => expect(footerTexts()).toEqual(['First hello']));
    await setFooter(footer('Second'));
    await waitFor(() => expect(footerTexts()).toEqual(['Second hello']));
  });

  it('removes footers when the prop goes away, and gives none to a message sent without it', async () => {
    const { send, setFooter } = await mount(footer('Footer for'));
    await send('one');
    await waitFor(() => expect(footerTexts()).toEqual(['Footer for one']));
    await setFooter(undefined);
    await waitFor(() => expect(footerTexts()).toEqual([]));
    await send('two');
    await setFooter(footer('Footer for'));
    await send('three');
    // On `main` a footer is collected only for a message sent while a
    // renderer was set.
    await waitFor(() =>
      expect(footerTexts()).toEqual(['Footer for one', 'Footer for three'])
    );
  });
});

/** A sent message whose `display_content` holds these inline nodes. */
function richRequest(nodes: Record<string, unknown>[]): MessageRequest {
  return {
    input: {
      message_type: MessageInputType.TEXT,
      text: 'rich message',
      display_content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: nodes }],
      },
    },
  } as MessageRequest;
}

const MENTION = { type: 'mention', attrs: { id: 'u1', label: 'Alice' } };
const COMMAND = { type: 'command', attrs: { id: 'c1', label: 'deploy' } };
const TASK_CARD = { type: 'taskCard', attrs: { label: 'Ship it' } };
const SPACE = { type: 'text', text: ' ' };

// @covers react.ChatContainer.renderUserDefinedInputNode
describe('renderUserDefinedInputNode', () => {
  contractSetup();

  type NodeRenderer = NonNullable<
    ChatContainerProps['renderUserDefinedInputNode']
  >;

  const custom: NodeRenderer = ({ node }) => (
    <b data-testid={`node-${node.type}`}>Custom {node.type}</b>
  );

  async function mount(render?: NodeRenderer) {
    const backend = fakeBackend();
    const props = (next?: NodeRenderer): Props => ({
      ...OPEN,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      renderUserDefinedInputNode: next,
    });
    const chat = await contractChat(props(render));
    const sender = instanceSender(chat.instance, backend);
    const started = await startSend(
      sender,
      richRequest([MENTION, SPACE, COMMAND, SPACE, TASK_CARD])
    );
    await finishSend(started);
    return {
      ...chat,
      sent: started.sent.request,
      setRenderer: (next?: NodeRenderer) => chat.rerender(props(next)),
    };
  }

  it('is called for each mention, command, and custom node, with the node, the message, and the instance', async () => {
    const render = jest.fn(custom);
    const { instance, sent } = await mount(render);
    await waitFor(() =>
      expect(mainPanelVisibleText()).toContain('Custom taskCard')
    );
    const calls = render.mock.calls as unknown as [
      { node: { type: string; attrs: unknown }; message: MessageRequest },
      ChatInstance,
    ][];
    // On `main` each node's call repeats each time the sent message changes
    // during the send, though the prop's JSDoc says it is invoked once per
    // node. Only which nodes it is called for is held here.
    expect(
      [...new Set(calls.map(([state]) => state.node.type))].sort()
    ).toEqual(['command', 'mention', 'taskCard']);
    for (const [state, handed] of calls) {
      expect(state.message.id).toBe(sent.id);
      expect(handed).toBe(instance);
    }
    expect(
      calls.find(([state]) => state.node.type === 'mention')[0].node
    ).toEqual(MENTION);
  });

  it('shows its content in the message in place of the default chips and labels', async () => {
    await mount(custom);
    await waitFor(() => expect(visible(byTestId('node-taskCard'))).toBe(true));
    const panel = getByTestId(PageObjectId.MAIN_PANEL);
    for (const type of ['mention', 'command', 'taskCard']) {
      expect(isShownWithin(getByTestId(`node-${type}`), panel)).toBe(true);
    }
    const text = mainPanelVisibleText();
    expect(text).toContain('Custom mention Custom command Custom taskCard');
    expect(text).not.toContain('Alice');
    expect(text).not.toContain('deploy');
    expect(text).not.toContain('Ship it');
  });

  it('keeps the default chip, or a custom node’s label, for a node it returns null for', async () => {
    await mount(({ node }) =>
      node.type === 'command' ? (
        <b data-testid="node-command">Custom command</b>
      ) : null
    );
    await waitFor(() => expect(visible(byTestId('node-command'))).toBe(true));
    const text = mainPanelVisibleText();
    expect(text).toContain('Alice');
    expect(text).toContain('Ship it');
    expect(text).not.toContain('deploy');
  });

  it('updates on a rerender with a new function, and restores the defaults when the prop goes away', async () => {
    const { setRenderer } = await mount(custom);
    await waitFor(() =>
      expect(mainPanelVisibleText()).toContain('Custom mention')
    );
    await setRenderer(({ node }) => <b>Renamed {node.type}</b>);
    await waitFor(() =>
      expect(mainPanelVisibleText()).toContain('Renamed mention')
    );
    expect(mainPanelVisibleText()).not.toContain('Custom mention');

    await setRenderer(undefined);
    await waitFor(() => expect(mainPanelVisibleText()).toContain('Alice'));
    const text = mainPanelVisibleText();
    expect(text).toContain('deploy');
    expect(text).toContain('Ship it');
    expect(text).not.toContain('Renamed');
  });
});

/** A button that counts its own clicks in React state. */
function Counter({ label }: { label: string }) {
  const [clicks, setClicks] = useState(0);
  return (
    <button type="button" onClick={() => setClicks((count) => count + 1)}>
      {`${label} ${clicks}`}
    </button>
  );
}

// @covers react.ChatContainer.renderWriteableElements
describe('renderWriteableElements', () => {
  contractSetup();

  type Nodes = ChatContainerProps['renderWriteableElements'];

  const props = (renderWriteableElements: Nodes): Props => ({
    ...OPEN,
    renderWriteableElements,
  });

  it('shows each node in its writeable element', async () => {
    const { instance } = await contractChat(
      props({
        footerElement: <p data-testid="footer-node">Footer node</p>,
        headerBottomElement: <p data-testid="header-node">Header node</p>,
      })
    );
    const footer = getByTestId('footer-node');
    const header = getByTestId('header-node');
    expect(instance.writeableElements.footerElement.contains(footer)).toBe(
      true
    );
    expect(
      instance.writeableElements.headerBottomElement.contains(header)
    ).toBe(true);
    expect(visible(footer)).toBe(true);
    expect(visible(header)).toBe(true);
  });

  it('updates a node in place on a rerender, keeping its React state', async () => {
    const chat = await contractChat(
      props({ footerElement: <Counter label="Before" /> })
    );
    await click(byRole('button', 'Before 0'));
    await chat.rerender(props({ footerElement: <Counter label="After" /> }));
    await waitFor(() => expect(byRole('button', 'After 1')).not.toBeNull());
  });

  it('hides each writeable element the map leaves out, with what the host wrote there, until the map goes away', async () => {
    const chat = await contractChat(
      props({ footerElement: <p data-testid="footer-node">Footer node</p> })
    );
    const written = document.createElement('span');
    await act(async () => {
      chat.instance.writeableElements.afterInputElement.append(written);
    });
    // A short wait to show the element stays hidden.
    await pause();
    expect(isInFlatTree(written)).toBe(false);
    expect(visible(getByTestId('footer-node'))).toBe(true);

    await chat.rerender(props({}));
    await waitFor(() => expect(byTestId('footer-node')).toBeNull());
    expect(isInFlatTree(written)).toBe(false);

    await chat.rerender(props(undefined));
    await waitFor(() => expect(isInFlatTree(written)).toBe(true));
  });

  it('replaces the built-in input with a customPromptLine node, and restores it when the node goes away', async () => {
    const line = <textarea aria-label="Host prompt line" />;
    const chat = await contractChat(props({ customPromptLine: line }));
    expect(visible(byRole('textbox', 'Host prompt line'))).toBe(true);
    expect(byTestId(PageObjectId.INPUT)).toBeNull();

    await chat.rerender(props(undefined));
    await waitFor(() => expect(byTestId(PageObjectId.INPUT)).not.toBeNull());
    expect(allByRole('textbox', 'Host prompt line')).toHaveLength(0);
  });
});

const Theme = createContext('none');

/** Shows the host's theme from context, and counts its clicks. */
function ThemeProbe({ name }: { name: string }) {
  const theme = useContext(Theme);
  const [clicks, setClicks] = useState(0);
  return (
    <button type="button" onClick={() => setClicks((count) => count + 1)}>
      {`${name} ${theme} ${clicks}`}
    </button>
  );
}

// @covers react.ChatContainer.renderWriteableElements react.ChatContainer.renderUserDefinedResponse
describe.each(REACT_HOSTS)(
  'render-prop content through %s is part of the host’s React tree',
  (_name, Host) => {
    contractSetup();

    /** The page: a theme provider and a click handler around the host. */
    function Page({
      theme,
      onClick,
      onBeforeRender,
      onAfterRender,
    }: {
      theme: string;
      onClick: () => void;
      onBeforeRender: (instance: ChatInstance) => void;
      onAfterRender: () => void;
    }) {
      return (
        <Theme.Provider value={theme}>
          {/* A host handler a click inside the chat bubbles up to. */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div onClick={onClick}>
            <Host
              {...OPEN}
              onBeforeRender={onBeforeRender}
              onAfterRender={onAfterRender}
              renderUserDefinedResponse={() => <ThemeProbe name="Response" />}
              renderWriteableElements={{
                footerElement: <ThemeProbe name="Footer" />,
              }}
            />
          </div>
        </Theme.Provider>
      );
    }

    it('reads the host’s context, bubbles clicks to host handlers, and keeps its state when the host rerenders', async () => {
      const onClick = jest.fn();
      const onBeforeRender = jest.fn();
      const onAfterRender = jest.fn();
      const page = (theme: string) => (
        <Page {...{ theme, onClick, onBeforeRender, onAfterRender }} />
      );
      const tree = await renderTree(page('light'));
      await calledTimes(onAfterRender);
      await act(() =>
        instanceFrom(onBeforeRender).messaging.addMessage(
          responseOf('r1', [userDefinedItem('item', { kind: 'probe' })])
        )
      );
      await waitFor(() =>
        expect(byRole('button', 'Response light 0')).not.toBeNull()
      );

      await click(byRole('button', 'Response light 0'));
      await click(byRole('button', 'Footer light 0'));
      expect(onClick).toHaveBeenCalledTimes(2);

      await tree.rerender(page('dark'));
      await waitFor(() =>
        expect(byRole('button', 'Response dark 1')).not.toBeNull()
      );
      expect(byRole('button', 'Footer dark 1')).not.toBeNull();
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
    });

    it('lets a host error boundary catch an error its content throws', async () => {
      function Thrower(): React.ReactElement {
        throw new Error('custom content failed');
      }
      class Boundary extends React.Component<
        { children: React.ReactNode },
        { caught: string | null }
      > {
        state = { caught: null as string | null };

        static getDerivedStateFromError(error: Error) {
          return { caught: error.message };
        }

        render() {
          return this.state.caught ? (
            <p role="alert" aria-label={`Caught: ${this.state.caught}`} />
          ) : (
            this.props.children
          );
        }
      }
      const onBeforeRender = jest.fn();
      const onAfterRender = jest.fn();
      await renderTree(
        <Boundary>
          <Host
            {...OPEN}
            onBeforeRender={onBeforeRender}
            onAfterRender={onAfterRender}
            renderUserDefinedResponse={() => <Thrower />}
          />
        </Boundary>
      );
      await calledTimes(onAfterRender);
      await act(() =>
        instanceFrom(onBeforeRender).messaging.addMessage(
          responseOf('r1', [userDefinedItem('item', { kind: 'throws' })])
        )
      );
      await waitFor(() =>
        expect(byRole('alert', 'Caught: custom content failed')).not.toBeNull()
      );
    });
  }
);

// @covers react.ChatContainer.onBeforeRender react.ChatContainer.onAfterRender
// @covers react.ChatContainer.renderUserDefinedResponse event.chat:ready event.receive
describe.each(REACT_HOSTS)('%s inside React.StrictMode', (_name, Host) => {
  contractSetup();

  it('starts one chat: each render callback once, chat:ready once, one welcome request', async () => {
    const ready = countChatReady();
    const onBeforeRender = jest.fn(ready.onBeforeRender);
    const onAfterRender = jest.fn();
    const backend = fakeBackend({ autoResolve: true });
    await renderTree(
      <StrictMode>
        <Host
          openChatByDefault
          messaging={{ customSendMessage: backend.customSendMessage }}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
        />
      </StrictMode>
    );
    await calledTimes(onAfterRender);
    await waitFor(() => expect(ready.count()).toBe(1));
    // A short wait to show nothing runs a second time.
    await pause(100);
    expect(onBeforeRender).toHaveBeenCalledTimes(1);
    expect(onAfterRender).toHaveBeenCalledTimes(1);
    expect(ready.count()).toBe(1);
    expect(backend.requests).toHaveLength(1);
    expect(allByTestId(PageObjectId.INPUT)).toHaveLength(1);
  });

  it('delivers each event once and shows render-prop content once', async () => {
    const onBeforeRender = jest.fn();
    const onAfterRender = jest.fn();
    await renderTree(
      <StrictMode>
        <Host
          {...OPEN}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
          renderUserDefinedResponse={() => (
            <button type="button">Strict content</button>
          )}
        />
      </StrictMode>
    );
    await calledTimes(onAfterRender);
    const instance = instanceFrom(onBeforeRender);
    const events = recordEvents(instance, [BusEventType.RECEIVE]);
    await act(() =>
      instance.messaging.addMessage(
        responseOf('r1', [userDefinedItem('item', { kind: 'strict' })])
      )
    );
    await act(() =>
      instance.messaging.addMessage(textResponse('Strict reply', 'r2'))
    );
    await waitFor(() => expect(mainPanelText()).toContain('Strict reply'));
    expect(events.types()).toEqual(['receive', 'receive']);
    expect(allByRole('button', 'Strict content')).toHaveLength(1);
    expect(mainPanelText().split('Strict reply')).toHaveLength(2);
  });
});

// @covers react.ChatContainer.onBeforeRender react.ChatContainer.onAfterRender
// @covers react.ChatContainer.renderWriteableElements event.chat:ready state.messages
describe.each(REACT_HOSTS)(
  'React rerenders, moves, keys, and unmounts of %s',
  (_name, Host) => {
    contractSetup();

    /** Callbacks and a chat:ready count shared by every render in a test. */
    function kit() {
      const ready = countChatReady();
      return {
        ready,
        onBeforeRender: jest.fn(ready.onBeforeRender),
        onAfterRender: jest.fn(),
      };
    }

    it('runs nothing again on a rerender with the same props, and keeps render-prop content state', async () => {
      const { ready, onBeforeRender, onAfterRender } = kit();
      const nodes = { footerElement: <Counter label="Kept" /> };
      const element = (
        <Host
          {...OPEN}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
          renderWriteableElements={nodes}
        />
      );
      const tree = await renderTree(element);
      await calledTimes(onAfterRender);
      await waitFor(() => expect(ready.count()).toBe(1));
      const events = recordEvents(instanceFrom(onBeforeRender));
      await click(byRole('button', 'Kept 0'));
      await tree.rerender(element);
      await tree.rerender(element);
      // A short wait to show nothing runs again.
      await pause();
      expect(events.types()).toEqual([]);
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
      expect(onAfterRender).toHaveBeenCalledTimes(1);
      expect(ready.count()).toBe(1);
      expect(byRole('button', 'Kept 1')).not.toBeNull();
    });

    it('keeps one chat when React moves it among keyed siblings', async () => {
      const { onBeforeRender, onAfterRender } = kit();
      const chat = (
        <Host
          key="chat"
          {...OPEN}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
          renderWriteableElements={{ footerElement: <Counter label="Moved" /> }}
        />
      );
      const sibling = <p key="sibling">Sibling</p>;
      const tree = await renderTree(<div>{[chat, sibling]}</div>);
      await calledTimes(onAfterRender);
      const instance = instanceFrom(onBeforeRender);
      await act(() =>
        instance.messaging.addMessage(textResponse('Kept', 'r1'))
      );
      await click(byRole('button', 'Moved 0'));

      await tree.rerender(<div>{[sibling, chat]}</div>);
      // A short wait to show the chat doesn't start again.
      await pause(100);
      expect(onBeforeRender).toHaveBeenCalledTimes(1);
      expect(onAfterRender).toHaveBeenCalledTimes(1);
      expect(instance.getState().messages.map(({ id }) => id)).toEqual(['r1']);
      expect(mainPanelText()).toContain('Kept');
      expect(byRole('button', 'Moved 1')).not.toBeNull();
    });

    it('starts a new chat for a new key: a new instance, both callbacks and chat:ready again, without the old messages', async () => {
      const { ready, onBeforeRender, onAfterRender } = kit();
      const chat = (key: string) => (
        <Host
          key={key}
          {...OPEN}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
        />
      );
      const tree = await renderTree(chat('one'));
      await calledTimes(onAfterRender);
      await waitFor(() => expect(ready.count()).toBe(1));
      const first = instanceFrom(onBeforeRender);
      await act(() => first.messaging.addMessage(textResponse('Old', 'r1')));

      await tree.rerender(chat('two'));
      await calledTimes(onAfterRender, 2);
      await waitFor(() => expect(ready.count()).toBe(2));
      const second = instanceFrom(onBeforeRender, 1);
      expect(onBeforeRender).toHaveBeenCalledTimes(2);
      expect(second).not.toBe(first);
      expect(instanceFrom(onAfterRender, 1)).toBe(second);
      expect(second.getState().messages).toEqual([]);
      expect(allByTestId(PageObjectId.INPUT)).toHaveLength(1);
      expect(mainPanelText()).not.toContain('Old');
    });

    it('takes the chat off the page on unmount, and unmounts render-prop content', async () => {
      const { onBeforeRender, onAfterRender } = kit();
      const cleanedUp = jest.fn();
      function Content() {
        React.useEffect(() => cleanedUp, []);
        return <p>Content</p>;
      }
      const tree = await renderTree(
        <Host
          {...OPEN}
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
          renderWriteableElements={{ footerElement: <Content /> }}
        />
      );
      await calledTimes(onAfterRender);
      expect(inputShown()).toBe(true);
      await tree.unmount();
      expect(cleanedUp).toHaveBeenCalledTimes(1);
      expect(inputShown()).toBe(false);
      expect(byTestId(PageObjectId.MAIN_PANEL)).toBeNull();
    });
  }
);
