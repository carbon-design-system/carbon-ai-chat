/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  BusEventHumanAgentAreAnyAgentsOnline,
  BusEventHumanAgentEndChat,
  BusEventHumanAgentPreEndChat,
  BusEventHumanAgentPreReceive,
  BusEventHumanAgentPreStartChat,
  BusEventHumanAgentReceive,
  BusEventType,
  ErrorType,
  GenericItem,
  HumanAgentMessageType,
  HumanAgentsOnlineStatus,
  MessageResponse,
  MessageResponseTypes,
  OnErrorType,
  PublicConfig,
  ServiceDesk,
} from '../../../../src/aiChatEntry';
import {
  CONNECT_ITEM,
  ContractDriver,
  DANA,
  DriverFactory,
  FakeDesk,
  HUMAN_AGENT_EVENTS,
  addConnect,
  advance,
  describeShared,
  fakeDesk,
  finishSend,
  pause,
  recordEvents,
  responseOf,
  startSend,
} from '../../helpers';

/** A driver whose config plugs in the desk, auto-connecting when agents are online. */
function deskDriver(
  makeDriver: DriverFactory,
  desk: FakeDesk,
  config: Partial<PublicConfig> = {}
): Promise<ContractDriver> {
  return makeDriver({
    serviceDeskFactory: desk.factory,
    ...config,
    serviceDesk: { skipConnectHumanAgentCard: true, ...config.serviceDesk },
  });
}

/** Sends one message and settles it, which hydrates the chat and builds the desk. */
async function hydrate(chat: ContractDriver): Promise<void> {
  await finishSend(await startSend(chat, 'hello'));
}

/** Hydrates, adds the connect response, and waits for the desk's startChat. */
async function connect(chat: ContractDriver, desk: FakeDesk): Promise<void> {
  await hydrate(chat);
  await addConnect(chat);
  await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
}

/** Connects, then has the agent join. */
async function join(chat: ContractDriver, desk: FakeDesk): Promise<void> {
  await connect(chat, desk);
  await act(() => desk.callback().agentJoined(DANA));
}

/** The items of the last message in the list. */
const lastItems = (chat: ContractDriver): GenericItem[] =>
  (chat.messages()[chat.messages().length - 1] as MessageResponse).output
    .generic;

/** The agent_message_type of each item of each response message, in order. */
const agentTypes = (chat: ContractDriver): string[] =>
  chat
    .messages()
    .flatMap((message) =>
      'output' in message
        ? (message as MessageResponse).output.generic.map(
            (item) => item.agent_message_type
          )
        : []
    )
    .filter(Boolean);

// @covers config.serviceDeskFactory
describeShared('serviceDeskFactory', (makeDriver) => {
  it('is not called at mount, then once when the first send hydrates the chat', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    expect(desk.factory).not.toHaveBeenCalled();
    await hydrate(chat);
    await hydrate(chat);
    expect(desk.factory).toHaveBeenCalledTimes(1);
  });

  it('gets no saved service desk state on a first load', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await hydrate(chat);
    const [parameters] = desk.factory.mock.calls[0];
    expect(parameters.persistedState).toBeUndefined();
  });

  it.each([
    ['has no name', fakeDesk({ getName: undefined })],
    ['rejects', null],
  ])(
    'reports a hydration error through onError when the desk %s, and the send still goes out',
    async (_case, given) => {
      const onError = jest.fn();
      const desk = given ?? fakeDesk();
      if (!given) {
        desk.factory.mockImplementation(() =>
          Promise.reject(new Error('no desk'))
        );
      }
      const chat = await deskDriver(makeDriver, desk, { onError });
      await hydrate(chat);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].errorType).toBe(OnErrorType.HYDRATION);
      expect(chat.backend.texts()).toEqual(['hello']);
    }
  );
});

// @covers event.human_agent:areAnyAgentsOnline
describeShared('checking agent availability', (makeDriver) => {
  it('asks the desk with the connect response, then fires areAnyAgentsOnline', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await hydrate(chat);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await addConnect(chat);
    await waitFor(() =>
      expect(events.of(BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE)).toEqual(
        [
          {
            type: BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
            areAnyAgentsOnline: HumanAgentsOnlineStatus.ONLINE,
          },
        ]
      )
    );
    expect(desk.desk.areAnyAgentsOnline).toHaveBeenCalledTimes(1);
    const [asked] = desk.desk.areAnyAgentsOnline.mock.calls[0];
    expect(asked.id).toBe('r-connect');
    expect(asked.output.generic).toEqual([CONNECT_ITEM]);
  });

  it.each<[string, Partial<ServiceDesk>, HumanAgentsOnlineStatus]>([
    [
      'false',
      { areAnyAgentsOnline: () => Promise.resolve(false) },
      HumanAgentsOnlineStatus.OFFLINE,
    ],
    [
      'null',
      { areAnyAgentsOnline: () => Promise.resolve(null) },
      HumanAgentsOnlineStatus.UNKNOWN,
    ],
    [
      'a rejection',
      { areAnyAgentsOnline: () => Promise.reject(new Error('down')) },
      HumanAgentsOnlineStatus.OFFLINE,
    ],
    [
      'no areAnyAgentsOnline method',
      { areAnyAgentsOnline: undefined },
      HumanAgentsOnlineStatus.UNKNOWN,
    ],
  ])(
    'reports %s as %s and starts no chat',
    async (_case, overrides, status) => {
      const desk = fakeDesk(overrides);
      const chat = await deskDriver(makeDriver, desk);
      await hydrate(chat);
      const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
      await addConnect(chat);
      await waitFor(() =>
        expect(
          events.of<BusEventHumanAgentAreAnyAgentsOnline>(
            BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE
          )
        ).toHaveLength(1)
      );
      expect(
        events.of<BusEventHumanAgentAreAnyAgentsOnline>(
          BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE
        )[0].areAnyAgentsOnline
      ).toBe(status);
      // A short wait proves no chat start follows.
      await pause();
      expect(desk.desk.startChat).not.toHaveBeenCalled();
      expect(events.types()).toEqual([
        BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
      ]);
    }
  );
});

// @covers config.serviceDesk config.serviceDesk.availabilityTimeoutSeconds
// @covers event.human_agent:areAnyAgentsOnline
describeShared('availabilityTimeoutSeconds', (makeDriver) => {
  /** A desk whose availability check never answers, hydrated, with fake timers on. */
  async function silentDesk(config: Partial<PublicConfig>) {
    const desk = fakeDesk({ areAnyAgentsOnline: () => new Promise(() => {}) });
    const chat = await deskDriver(makeDriver, desk, config);
    await hydrate(chat);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    jest.useFakeTimers();
    await act(async () => {
      void chat.messaging.addMessage(responseOf('r-connect', [CONNECT_ITEM]));
    });
    return { desk, events };
  }

  const reported = (events: ReturnType<typeof recordEvents>) =>
    events
      .of<BusEventHumanAgentAreAnyAgentsOnline>(
        BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE
      )
      .map((event) => event.areAnyAgentsOnline);

  it('reports offline when the desk has not answered within the configured seconds', async () => {
    const { desk, events } = await silentDesk({
      serviceDesk: { availabilityTimeoutSeconds: 2 },
    });
    await advance(1999);
    expect(reported(events)).toEqual([]);
    await advance(1);
    expect(reported(events)).toEqual([HumanAgentsOnlineStatus.OFFLINE]);
    expect(desk.desk.startChat).not.toHaveBeenCalled();
  });

  // The JSDoc names no default; `main` waits 5 seconds
  // (`HumanAgentServiceImpl.ts:118`).
  it('waits 5 seconds by default', async () => {
    const { events } = await silentDesk({});
    await advance(4999);
    expect(reported(events)).toEqual([]);
    await advance(1);
    expect(reported(events)).toEqual([HumanAgentsOnlineStatus.OFFLINE]);
  });
});

// @covers config.serviceDesk config.serviceDesk.skipConnectHumanAgentCard
// @covers event.human_agent:pre:startChat
describeShared('skipConnectHumanAgentCard', (makeDriver) => {
  it('starts the chat with the connect response when agents are online, after pre:startChat', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await hydrate(chat);
    const order: string[] = [];
    let preStart: BusEventHumanAgentPreStartChat;
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: (event: BusEventHumanAgentPreStartChat) => {
        preStart = event;
        order.push(
          `pre:startChat after ${desk.desk.startChat.mock.calls.length}`
        );
      },
    });
    await addConnect(chat);
    await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
    expect(order).toEqual(['pre:startChat after 0']);
    expect(preStart.message.id).toBe('r-connect');
    expect(preStart.message.output.generic).toEqual([CONNECT_ITEM]);
    const [message, options] = desk.desk.startChat.mock.calls[0];
    expect(message.id).toBe('r-connect');
    expect(message.output.generic).toEqual([CONNECT_ITEM]);
    expect(options).toEqual({ preStartChatPayload: undefined });
  });

  it('leaves the chat to the card when not set', async () => {
    const desk = fakeDesk();
    const chat = await makeDriver({ serviceDeskFactory: desk.factory });
    await hydrate(chat);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await addConnect(chat);
    await waitFor(() =>
      expect(events.types()).toEqual([
        BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
      ])
    );
    // A short wait proves no chat start follows.
    await pause();
    expect(desk.desk.startChat).not.toHaveBeenCalled();
  });
});

// @covers event.human_agent:pre:startChat event.human_agent:endChat
describeShared('human_agent:pre:startChat', (makeDriver) => {
  it('passes the payload a handler sets to startChat', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: (event: BusEventHumanAgentPreStartChat) => {
        event.preStartChatPayload = { topic: 'billing' };
      },
    });
    await connect(chat, desk);
    expect(desk.desk.startChat.mock.calls[0][1]).toEqual({
      preStartChatPayload: { topic: 'billing' },
    });
  });

  it('cancels the start when a handler sets cancelStartChat, firing endChat as a cancelled request', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: (event: BusEventHumanAgentPreStartChat) => {
        event.cancelStartChat = true;
      },
    });
    await hydrate(chat);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await addConnect(chat);
    await waitFor(() =>
      expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)).toHaveLength(1)
    );
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
      BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)[0]).toEqual({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent: false,
      requestCancelled: true,
    });
    expect(desk.desk.startChat).not.toHaveBeenCalled();
  });
});

// @covers event.human_agent:pre:receive event.human_agent:receive state.messages
describeShared('messages from the desk', (makeDriver) => {
  it('adds an agent-joined status message through pre:receive and receive, then a reload warning', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await connect(chat, desk);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await act(() => desk.callback().agentJoined(DANA));
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_PRE_RECEIVE,
      BusEventType.HUMAN_AGENT_RECEIVE,
    ]);
    const received = events.of<BusEventHumanAgentReceive>(
      BusEventType.HUMAN_AGENT_RECEIVE
    )[0];
    expect(received.data.output.generic).toEqual([
      expect.objectContaining({
        response_type: MessageResponseTypes.SYSTEM,
        agent_message_type: HumanAgentMessageType.HUMAN_AGENT_JOINED,
      }),
    ]);
    expect(received.data.message_options.response_user_profile).toEqual(DANA);
    // The reload warning is added without events, because the desk has no
    // `reconnect`.
    expect(agentTypes(chat)).toEqual([
      HumanAgentMessageType.HUMAN_AGENT_JOINED,
      HumanAgentMessageType.RELOAD_WARNING,
    ]);
  });

  it('adds no reload warning when the desk can reconnect', async () => {
    const desk = fakeDesk({ reconnect: () => Promise.resolve(true) });
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    expect(agentTypes(chat)).toEqual([
      HumanAgentMessageType.HUMAN_AGENT_JOINED,
    ]);
  });

  it('fires pre:receive, then receive, for a text the agent sends, with the agent profile', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    const order: string[] = [];
    const seen = () => chat.messages().length;
    const before = seen();
    let received: BusEventHumanAgentReceive;
    chat.on([
      {
        type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
        handler: (event: BusEventHumanAgentPreReceive) => {
          order.push(`pre:receive, ${seen() - before} added`);
          expect(event.responseUserProfile).toEqual(DANA);
        },
      },
      {
        type: BusEventType.HUMAN_AGENT_RECEIVE,
        handler: (event: BusEventHumanAgentReceive) => {
          order.push(`receive, ${seen() - before} added`);
          received = event;
        },
      },
    ]);
    await act(() => desk.callback().sendMessageToUser('Hi, I am Dana'));
    expect(order).toEqual(['pre:receive, 0 added', 'receive, 1 added']);
    expect(received.responseUserProfile).toEqual(DANA);
    expect(received.data.output.generic).toEqual([
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'Hi, I am Dana',
        agent_message_type: HumanAgentMessageType.FROM_HUMAN_AGENT,
      },
    ]);
    expect(lastItems(chat)).toEqual(received.data.output.generic);
    const stored = chat.messages()[
      chat.messages().length - 1
    ] as MessageResponse;
    expect(stored.id).toBe(received.data.id);
    expect(stored.message_options.response_user_profile).toEqual(DANA);
  });

  it('stores a message object as given, marking its items as from the agent', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    await act(() =>
      desk.callback().sendMessageToUser({
        id: 'agent-message',
        output: {
          generic: [{ response_type: MessageResponseTypes.TEXT, text: 'obj' }],
        },
      })
    );
    const stored = chat.messages()[chat.messages().length - 1];
    expect(stored.id).toBe('agent-message');
    expect(lastItems(chat)).toEqual([
      {
        response_type: MessageResponseTypes.TEXT,
        text: 'obj',
        agent_message_type: HumanAgentMessageType.FROM_HUMAN_AGENT,
      },
    ]);
  });

  it('stores the edits a pre:receive handler makes', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
      handler: (event: BusEventHumanAgentPreReceive) => {
        (event.data.output.generic[0] as { text: string }).text = 'edited';
      },
    });
    await act(() => desk.callback().sendMessageToUser('original'));
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({ text: 'edited' }),
    ]);
  });

  it('uses the current agent profile for an agent ID that never joined', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    const events = recordEvents(chat, [BusEventType.HUMAN_AGENT_RECEIVE]);
    await act(() => desk.callback().sendMessageToUser('who', 'agent-unknown'));
    expect(
      events.of<BusEventHumanAgentReceive>(BusEventType.HUMAN_AGENT_RECEIVE)[0]
        .responseUserProfile
    ).toEqual(DANA);
  });

  it('ignores the callback before a chat has started', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await hydrate(chat);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    const before = chat.messages().length;
    await act(() => desk.callback().agentJoined(DANA));
    await act(() => desk.callback().sendMessageToUser('too early'));
    expect(events.types()).toEqual([]);
    expect(chat.messages()).toHaveLength(before);
  });
});

// @covers instance.send event.human_agent:pre:send
describeShared('send during an agent chat', (makeDriver) => {
  it('goes to customSendMessage, not to the desk', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    const started = await startSend(chat, 'to the assistant');
    await finishSend(started);
    expect(chat.backend.texts()).toEqual(['hello', 'to the assistant']);
    expect(desk.desk.sendMessageToAgent).not.toHaveBeenCalled();
    expect(events.types()).toEqual([]);
  });
});

// @covers instance.serviceDesk instance.serviceDesk.endConversation
// @covers event.human_agent:pre:endChat event.human_agent:endChat
describeShared('serviceDesk.endConversation', (makeDriver) => {
  it('resolves with no events and no desk call when no agent chat runs', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await hydrate(chat);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await act(() => chat.serviceDesk.endConversation());
    expect(events.types()).toEqual([]);
    expect(desk.desk.endChat).not.toHaveBeenCalled();
  });

  it('cancels a request no agent has joined: no pre:endChat, and endChat as a cancelled request', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await connect(chat, desk);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    const before = chat.messages().length;
    await act(() => chat.serviceDesk.endConversation());
    expect(events.events).toEqual([
      {
        type: BusEventType.HUMAN_AGENT_END_CHAT,
        endedByHumanAgent: false,
        requestCancelled: true,
      },
    ]);
    expect(desk.desk.endChat).toHaveBeenCalledTimes(1);
    expect(desk.desk.endChat.mock.calls[0][0]).toEqual(
      expect.objectContaining({ endedByHumanAgent: false })
    );
    expect(chat.messages()).toHaveLength(before);
  });

  it('ends a joined chat: pre:endChat, the desk, an ended status message, then endChat, before it resolves', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    const order: string[] = [];
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      handler: () => {
        order.push(
          `pre:endChat, desk called ${desk.desk.endChat.mock.calls.length}`
        );
      },
    });
    let resolved = false;
    await act(async () => {
      await chat.serviceDesk.endConversation();
      resolved = events.of(BusEventType.HUMAN_AGENT_END_CHAT).length === 1;
    });
    expect(resolved).toBe(true);
    expect(order).toEqual(['pre:endChat, desk called 0']);
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_PRE_RECEIVE,
      BusEventType.HUMAN_AGENT_RECEIVE,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(events.of(BusEventType.HUMAN_AGENT_PRE_END_CHAT)[0]).toEqual(
      expect.objectContaining({
        endedByHumanAgent: false,
        preEndChatPayload: null,
        cancelEndChat: false,
      })
    );
    expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)[0]).toEqual({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent: false,
      requestCancelled: false,
    });
    expect(desk.desk.endChat.mock.calls).toEqual([
      [{ endedByHumanAgent: false, preEndChatPayload: null }],
    ]);
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({
        agent_message_type: HumanAgentMessageType.CHAT_WAS_ENDED,
      }),
    ]);
  });

  it('passes the payload a pre:endChat handler sets to the desk', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      handler: (event: BusEventHumanAgentPreEndChat) => {
        event.preEndChatPayload = { survey: true };
      },
    });
    await act(() => chat.serviceDesk.endConversation());
    expect(desk.desk.endChat.mock.calls).toEqual([
      [{ endedByHumanAgent: false, preEndChatPayload: { survey: true } }],
    ]);
  });

  it('keeps the chat when a pre:endChat handler sets cancelEndChat', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      handler: (event: BusEventHumanAgentPreEndChat) => {
        event.cancelEndChat = true;
      },
    });
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await act(() => chat.serviceDesk.endConversation());
    expect(events.types()).toEqual([BusEventType.HUMAN_AGENT_PRE_END_CHAT]);
    expect(desk.desk.endChat).not.toHaveBeenCalled();
    // The chat still runs: the agent's next message is added.
    await act(() => desk.callback().sendMessageToUser('still here'));
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({ text: 'still here' }),
    ]);
  });

  it('adds the assistant-returned message after the end', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk, {
      strings: { agent_assistantReturned: 'Contract assistant is back' },
    });
    await join(chat, desk);
    await act(() => chat.serviceDesk.endConversation());
    await waitFor(
      () =>
        expect(lastItems(chat)).toEqual([
          expect.objectContaining({
            response_type: MessageResponseTypes.TEXT,
            text: 'Contract assistant is back',
          }),
        ]),
      { timeout: 3000 }
    );
  });
});

// @covers event.human_agent:pre:endChat event.human_agent:endChat
describeShared('the agent ending the chat', (makeDriver) => {
  it('fires pre:endChat and endChat as ended by the agent, and tells the desk', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      handler: (event: BusEventHumanAgentPreEndChat) => {
        event.preEndChatPayload = 'from handler';
      },
    });
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await act(() => desk.callback().agentEndedChat());
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_PRE_RECEIVE,
      BusEventType.HUMAN_AGENT_RECEIVE,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(
      events.of<BusEventHumanAgentPreEndChat>(
        BusEventType.HUMAN_AGENT_PRE_END_CHAT
      )[0].endedByHumanAgent
    ).toBe(true);
    expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)[0]).toEqual({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent: true,
      requestCancelled: false,
    });
    expect(desk.desk.endChat.mock.calls).toEqual([
      [{ endedByHumanAgent: true, preEndChatPayload: 'from handler' }],
    ]);
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({
        agent_message_type: HumanAgentMessageType.HUMAN_AGENT_ENDED_CHAT,
      }),
    ]);
  });

  it('keeps the chat when a pre:endChat handler cancels', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    chat.on({
      type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      handler: (event: BusEventHumanAgentPreEndChat) => {
        event.cancelEndChat = true;
      },
    });
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await act(() => desk.callback().agentEndedChat());
    expect(events.types()).toEqual([BusEventType.HUMAN_AGENT_PRE_END_CHAT]);
    expect(desk.desk.endChat).not.toHaveBeenCalled();
  });
});

// @covers instance.messaging.restartConversation event.human_agent:pre:endChat
// @covers event.human_agent:endChat
describeShared('restartConversation during an agent chat', (makeDriver) => {
  it('ends the chat between the restart events, with no ended status message', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    const events = recordEvents(chat, [
      ...HUMAN_AGENT_EVENTS,
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    await act(() => chat.messaging.restartConversation());
    expect(events.types()).toEqual([
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
      BusEventType.RESTART_CONVERSATION,
    ]);
    expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)[0]).toEqual({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent: false,
      requestCancelled: false,
    });
    expect(desk.desk.endChat).toHaveBeenCalledTimes(1);
  });
});

// @covers event.human_agent:endChat
describeShared('desk errors', (makeDriver) => {
  it('shows the desk message and ends the request on a connecting error', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await connect(chat, desk);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await act(() =>
      desk.callback().setErrorStatus({
        type: ErrorType.CONNECTING,
        messageToUser: 'Contract desk is down',
      })
    );
    expect(events.events).toEqual([
      {
        type: BusEventType.HUMAN_AGENT_END_CHAT,
        endedByHumanAgent: false,
        requestCancelled: true,
      },
    ]);
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({
        response_type: MessageResponseTypes.INLINE_ERROR,
        text: 'Contract desk is down',
      }),
    ]);
  });

  it('shows the connecting-error string when the desk gives no message', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk, {
      strings: { errors_connectingToHumanAgent: 'Contract cannot connect' },
    });
    await connect(chat, desk);
    await act(() =>
      desk.callback().setErrorStatus({ type: ErrorType.CONNECTING })
    );
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({
        response_type: MessageResponseTypes.INLINE_ERROR,
        text: 'Contract cannot connect',
      }),
    ]);
  });

  // @covers config.serviceDeskFactory event.human_agent:pre:startChat
  it('shows the connecting error and ends the request when the desk startChat rejects', async () => {
    const desk = fakeDesk();
    desk.desk.startChat.mockImplementation(() =>
      Promise.reject(new Error('desk down'))
    );
    const chat = await deskDriver(makeDriver, desk, {
      strings: { errors_connectingToHumanAgent: 'Contract cannot connect' },
    });
    await hydrate(chat);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await addConnect(chat);
    await waitFor(() =>
      expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)).toHaveLength(1)
    );
    // A short wait lets a rejection nothing caught surface and fail the test.
    await pause();
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
      BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)[0]).toEqual({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent: false,
      requestCancelled: true,
    });
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({
        response_type: MessageResponseTypes.INLINE_ERROR,
        text: 'Contract cannot connect',
      }),
    ]);
  });

  it('makes send reject while the desk reports itself disconnected, until it reconnects', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await act(() =>
      desk.callback().setErrorStatus({
        type: ErrorType.DISCONNECTED,
        isDisconnected: true,
      })
    );
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_PRE_RECEIVE,
      BusEventType.HUMAN_AGENT_RECEIVE,
    ]);
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({
        agent_message_type: HumanAgentMessageType.DISCONNECTED,
      }),
    ]);
    await act(async () => {
      await expect(chat.send('while down')).rejects.toThrow();
    });
    expect(chat.backend.texts()).toEqual(['hello']);
    await act(() =>
      desk.callback().setErrorStatus({
        type: ErrorType.DISCONNECTED,
        isDisconnected: false,
      })
    );
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({
        agent_message_type: HumanAgentMessageType.RECONNECTED,
      }),
    ]);
    await finishSend(await startSend(chat, 'back up'));
    expect(chat.backend.texts()).toEqual(['hello', 'back up']);
  });
});

// @covers config.serviceDesk config.serviceDesk.agentJoinTimeoutSeconds
// @covers event.human_agent:endChat
describeShared('agentJoinTimeoutSeconds', (makeDriver) => {
  /** Connects with fake timers on, so the join wait can be advanced. */
  async function waitingForAgent() {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk, {
      serviceDesk: { agentJoinTimeoutSeconds: 3 },
      strings: { errors_noHumanAgentsJoined: 'Contract nobody joined' },
    });
    await hydrate(chat);
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    jest.useFakeTimers();
    await act(async () => {
      void chat.messaging.addMessage(responseOf('r-connect', [CONNECT_ITEM]));
    });
    await advance(0);
    expect(desk.desk.startChat).toHaveBeenCalledTimes(1);
    events.clear();
    return { desk, chat, events };
  }

  it('ends the request with an error message when no agent joins in time', async () => {
    const { desk, chat, events } = await waitingForAgent();
    await advance(2999);
    expect(events.types()).toEqual([]);
    expect(desk.desk.endChat).not.toHaveBeenCalled();
    await advance(1);
    expect(events.events).toEqual([
      {
        type: BusEventType.HUMAN_AGENT_END_CHAT,
        endedByHumanAgent: false,
        requestCancelled: true,
      },
    ]);
    expect(desk.desk.endChat).toHaveBeenCalledTimes(1);
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({
        response_type: MessageResponseTypes.INLINE_ERROR,
        text: 'Contract nobody joined',
      }),
    ]);
  });

  it('stops waiting once an agent joins', async () => {
    const { desk, events } = await waitingForAgent();
    await act(() => desk.callback().agentJoined(DANA));
    events.clear();
    await advance(10_000);
    expect(events.types()).toEqual([]);
    expect(desk.desk.endChat).not.toHaveBeenCalled();
  });
});

// @covers instance.serviceDesk.updateIsSuspended event.human_agent:receive
describeShared('serviceDesk.updateIsSuspended', (makeDriver) => {
  it('keeps agent messages out of the list while suspended, though their events still fire', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    await act(() => chat.serviceDesk.updateIsSuspended(true));
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    const before = chat.messages().length;
    await act(() => desk.callback().sendMessageToUser('unseen'));
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_PRE_RECEIVE,
      BusEventType.HUMAN_AGENT_RECEIVE,
    ]);
    expect(chat.messages()).toHaveLength(before);
    await act(() => chat.serviceDesk.updateIsSuspended(false));
    await act(() => desk.callback().sendMessageToUser('seen'));
    expect(chat.messages()).toHaveLength(before + 1);
    expect(lastItems(chat)).toEqual([
      expect.objectContaining({ text: 'seen' }),
    ]);
  });

  it('ends a suspended chat before a new connect starts another', async () => {
    const desk = fakeDesk();
    const chat = await deskDriver(makeDriver, desk);
    await join(chat, desk);
    await act(() => chat.serviceDesk.updateIsSuspended(true));
    const events = recordEvents(chat, HUMAN_AGENT_EVENTS);
    await addConnect(chat, 'r-connect-2');
    await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(2));
    expect(
      events.typesExcept(
        BusEventType.HUMAN_AGENT_PRE_RECEIVE,
        BusEventType.HUMAN_AGENT_RECEIVE
      )
    ).toEqual([
      BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
      BusEventType.HUMAN_AGENT_PRE_START_CHAT,
    ]);
    expect(
      events.of<BusEventHumanAgentEndChat>(BusEventType.HUMAN_AGENT_END_CHAT)[0]
    ).toEqual({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent: false,
      requestCancelled: false,
    });
    expect(desk.desk.endChat).toHaveBeenCalledTimes(1);
    expect(desk.desk.startChat.mock.calls[1][0].id).toBe('r-connect-2');
  });
});
