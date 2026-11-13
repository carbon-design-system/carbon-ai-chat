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
  BusEventHumanAgentPreEndChat,
  BusEventHumanAgentPreSend,
  BusEventType,
  ChatInstance,
  ErrorType,
  HumanAgentMessageType,
  MessageErrorState,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  PageObjectId,
  PublicConfig,
} from '../../../../src/aiChatEntry';
import {
  ContractMount,
  DANA,
  EVE,
  FakeBackend,
  FakeDesk,
  HUMAN_AGENT_EVENTS,
  addConnect,
  byRole,
  click,
  contractChat,
  contractSetup,
  fakeBackend,
  fakeDesk,
  getByTestId,
  openChat,
  pause,
  pickFiles,
  recordEvents,
  typeText,
} from '../../helpers';

const humanAgent = (instance: ChatInstance) => instance.getState().humanAgent;

/**
 * A closed chat with the desk plugged in and an answering backend. A first
 * send hydrates it, which builds the desk.
 */
async function deskChat(
  desk: FakeDesk,
  config: Partial<PublicConfig> = {},
  backend: FakeBackend = fakeBackend({ autoResolve: true })
): Promise<ContractMount> {
  const mount = await contractChat({
    serviceDeskFactory: desk.factory,
    ...config,
    serviceDesk: { skipConnectHumanAgentCard: true, ...config.serviceDesk },
    messaging: { customSendMessage: backend.customSendMessage },
  });
  await act(() => mount.instance.send('hello'));
  return mount;
}

/** Connects (auto, agents online) and has `profile` join. */
async function joined(
  instance: ChatInstance,
  desk: FakeDesk,
  profile = DANA
): Promise<void> {
  await addConnect(instance);
  await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
  await act(() => desk.callback().agentJoined(profile));
}

// @covers state.humanAgent
describe('state.humanAgent', () => {
  contractSetup();

  it('starts with no agent chat', async () => {
    const { instance } = await deskChat(fakeDesk());
    expect(humanAgent(instance)).toEqual({
      isConnected: false,
      isConnecting: false,
      isSuspended: false,
      responseUserProfiles: {},
      // Typed `responseUserProfile?: ResponseUserProfile`; `main` sets null.
      responseUserProfile: null,
    });
  });

  it('is connecting while the request waits, then connected with the agent profile', async () => {
    const desk = fakeDesk();
    const { instance } = await deskChat(desk);
    await addConnect(instance);
    await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
    expect(humanAgent(instance)).toEqual(
      expect.objectContaining({ isConnecting: true, isConnected: false })
    );
    await act(() => desk.callback().agentJoined(DANA));
    expect(humanAgent(instance)).toEqual(
      expect.objectContaining({
        isConnecting: false,
        isConnected: true,
        responseUserProfile: DANA,
        responseUserProfiles: { [DANA.id]: DANA },
      })
    );
  });

  it('tracks a transfer and an agent leaving, staying connected', async () => {
    const desk = fakeDesk();
    const { instance } = await deskChat(desk);
    await joined(instance, desk);
    await act(() => desk.callback().beginTransferToAnotherAgent(EVE));
    expect(humanAgent(instance)).toEqual(
      expect.objectContaining({
        isConnected: true,
        responseUserProfile: EVE,
        responseUserProfiles: { [DANA.id]: DANA, [EVE.id]: EVE },
      })
    );
    await act(() => desk.callback().agentLeftChat());
    expect(humanAgent(instance)).toEqual(
      expect.objectContaining({
        isConnected: true,
        responseUserProfile: null,
        responseUserProfiles: { [DANA.id]: DANA, [EVE.id]: EVE },
      })
    );
  });

  it('clears the connection and current profile at the end, keeping the known profiles', async () => {
    const desk = fakeDesk();
    const { instance } = await deskChat(desk);
    await joined(instance, desk);
    await act(() => instance.serviceDesk.endConversation());
    expect(humanAgent(instance)).toEqual({
      isConnected: false,
      isConnecting: false,
      isSuspended: false,
      responseUserProfiles: { [DANA.id]: DANA },
      responseUserProfile: null,
    });
  });

  it('clears isConnecting when the request is cancelled', async () => {
    const desk = fakeDesk();
    const { instance } = await deskChat(desk);
    await addConnect(instance);
    await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
    await act(() => instance.serviceDesk.endConversation());
    expect(humanAgent(instance)).toEqual(
      expect.objectContaining({ isConnecting: false, isConnected: false })
    );
  });

  // @covers instance.serviceDesk.updateIsSuspended
  it('follows updateIsSuspended while connected, and ignores it with no chat', async () => {
    const desk = fakeDesk();
    const { instance } = await deskChat(desk);
    await act(() => instance.serviceDesk.updateIsSuspended(true));
    expect(humanAgent(instance).isSuspended).toBe(false);
    await joined(instance, desk);
    await act(() => instance.serviceDesk.updateIsSuspended(true));
    expect(humanAgent(instance).isSuspended).toBe(true);
    await act(() => instance.serviceDesk.updateIsSuspended(false));
    expect(humanAgent(instance).isSuspended).toBe(false);
  });

  it('holds the desk state set through updatePersistedState, merged by default', async () => {
    const desk = fakeDesk();
    const { instance } = await deskChat(desk);
    await act(async () => {
      desk.callback().updatePersistedState({ token: 'a', nested: { x: 1 } });
      desk.callback().updatePersistedState({ nested: { y: 2 } });
    });
    const merged = { token: 'a', nested: { x: 1, y: 2 } };
    expect(humanAgent(instance).serviceDeskState).toEqual(merged);
    expect(desk.callback().persistedState()).toEqual(merged);
    await act(async () => {
      desk.callback().updatePersistedState({ token: 'b' }, false);
    });
    expect(humanAgent(instance).serviceDeskState).toEqual({ token: 'b' });
  });
});

// @covers config.serviceDesk config.serviceDesk.allowReconnect
// @covers config.serviceDeskFactory state.humanAgent
describe('reloading during an agent chat', () => {
  contractSetup();

  /** Joins an agent chat, saves desk state, and unmounts, keeping session storage. */
  async function joinThenUnmount(): Promise<void> {
    const desk = fakeDesk();
    const { instance, unmount } = await deskChat(desk);
    await joined(instance, desk);
    await act(async () => {
      desk.callback().updatePersistedState({ token: 'saved' });
    });
    unmount();
  }

  /** Mounts again, as a page reload would, and sends to hydrate. */
  async function remount(
    reconnect: () => Promise<boolean>,
    config: Partial<PublicConfig> = {}
  ) {
    const reconnectMock = jest.fn(reconnect);
    const desk = fakeDesk({ reconnect: reconnectMock });
    const backend = fakeBackend({ autoResolve: true });
    const { instance } = await contractChat({
      serviceDeskFactory: desk.factory,
      ...config,
      messaging: { customSendMessage: backend.customSendMessage },
    });
    return { desk, instance, reconnect: reconnectMock };
  }

  it('restores the agent state, and gives the factory the saved desk state', async () => {
    await joinThenUnmount();
    const { desk, instance } = await remount(() => Promise.resolve(true));
    expect(humanAgent(instance)).toEqual(
      expect.objectContaining({
        isConnected: true,
        responseUserProfile: DANA,
        serviceDeskState: { token: 'saved' },
      })
    );
    expect(desk.factory).not.toHaveBeenCalled();
    await act(() => instance.send('again'));
    expect(desk.factory).toHaveBeenCalledTimes(1);
    expect(desk.factory.mock.calls[0][0].persistedState).toEqual({
      token: 'saved',
    });
  });

  it('reconnects through the desk by default, staying connected', async () => {
    await joinThenUnmount();
    const { instance, reconnect } = await remount(() => Promise.resolve(true));
    await act(() => instance.send('again'));
    await waitFor(() => expect(reconnect).toHaveBeenCalledTimes(1));
    await pause();
    expect(humanAgent(instance).isConnected).toBe(true);
  });

  // @covers event.human_agent:pre:endChat event.human_agent:endChat
  it('fires no end events and makes no desk endChat call when the desk reconnects', async () => {
    await joinThenUnmount();
    const { desk, instance, reconnect } = await remount(() =>
      Promise.resolve(true)
    );
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    await act(() => instance.send('again'));
    await waitFor(() => expect(reconnect).toHaveBeenCalledTimes(1));
    // A short wait proves no end follows.
    await pause();
    expect(events.types()).toEqual([]);
    expect(desk.desk.endChat).not.toHaveBeenCalled();
  });

  /** The end events and desk call a reload that can't resume the chat makes. */
  function expectEnded(
    events: ReturnType<typeof recordEvents>,
    desk: FakeDesk,
    preEndChatPayload: unknown = null
  ): void {
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(events.of(BusEventType.HUMAN_AGENT_PRE_END_CHAT)[0]).toEqual(
      expect.objectContaining({ endedByHumanAgent: false })
    );
    expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)[0]).toEqual({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent: false,
      requestCancelled: false,
    });
    expect(desk.desk.endChat.mock.calls).toEqual([
      [{ endedByHumanAgent: false, preEndChatPayload }],
    ]);
  }

  // @covers event.human_agent:pre:endChat event.human_agent:endChat
  it('ends the chat with the end events and the desk endChat when the desk cannot reconnect', async () => {
    await joinThenUnmount();
    const { desk, instance, reconnect } = await remount(() =>
      Promise.resolve(false)
    );
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    await act(() => instance.send('again'));
    await waitFor(() => expect(reconnect).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)).toHaveLength(1)
    );
    expect(humanAgent(instance).isConnected).toBe(false);
    expectEnded(events, desk);
  });

  // @covers event.human_agent:pre:endChat event.human_agent:endChat
  it('does not try to reconnect when allowReconnect is false, and ends the chat with the end events', async () => {
    await joinThenUnmount();
    const { desk, instance, reconnect } = await remount(
      () => Promise.resolve(true),
      { serviceDesk: { allowReconnect: false } }
    );
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    await act(() => instance.send('again'));
    await waitFor(() =>
      expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)).toHaveLength(1)
    );
    expect(reconnect).not.toHaveBeenCalled();
    expect(humanAgent(instance).isConnected).toBe(false);
    expectEnded(events, desk);
  });

  // @covers event.human_agent:pre:endChat event.human_agent:endChat
  it('ends the chat even when a pre:endChat handler cancels, passing its payload to the desk', async () => {
    await joinThenUnmount();
    const { desk, instance } = await remount(() => Promise.resolve(false));
    instance.on({
      type: BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      handler: (event: BusEventHumanAgentPreEndChat) => {
        event.cancelEndChat = true;
        event.preEndChatPayload = { reason: 'reload' };
      },
    });
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    await act(() => instance.send('again'));
    await waitFor(() =>
      expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)).toHaveLength(1)
    );
    expect(humanAgent(instance).isConnected).toBe(false);
    expectEnded(events, desk, { reason: 'reload' });
  });
});

// @covers config.serviceDeskFactory event.human_agent:pre:endChat
// @covers event.human_agent:endChat
describe('a new serviceDeskFactory during an agent chat', () => {
  contractSetup();

  it('ends the chat with the old desk and builds the new one', async () => {
    const first = fakeDesk();
    const backend = fakeBackend({ autoResolve: true });
    const props = (desk: FakeDesk) => ({
      serviceDeskFactory: desk.factory,
      serviceDesk: { skipConnectHumanAgentCard: true },
      messaging: { customSendMessage: backend.customSendMessage },
    });
    const { instance, rerender } = await contractChat(props(first));
    await act(() => instance.send('hello'));
    await joined(instance, first);
    const events = recordEvents(instance, [
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    const second = fakeDesk();
    await rerender(props(second));
    await waitFor(() => expect(second.factory).toHaveBeenCalledTimes(1));
    expect(first.desk.endChat).toHaveBeenCalledTimes(1);
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_PRE_END_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(humanAgent(instance).isConnected).toBe(false);
  });
});

const STRINGS = {
  agent_startChat: 'Contract connect',
  input_uploadButtonLabel: 'Contract attach',
  errors_connectingToHumanAgent: 'Contract cannot connect',
};

/** Opens the chat with the desk plugged in, and connects through the card's button. */
async function openAndConnectByCard(desk: FakeDesk) {
  const opened = await openChat({
    serviceDeskFactory: desk.factory,
    strings: STRINGS,
  });
  await addConnect(opened.instance);
  await waitFor(() => byRole('button', STRINGS.agent_startChat));
  return opened;
}

/** Types into the input and clicks send. */
async function typeAndSend(text: string): Promise<void> {
  await typeText(text);
  await act(async () => {
    getByTestId(PageObjectId.INPUT_SEND).click();
  });
}

// @covers response-type.connect_to_agent event.human_agent:pre:startChat
// @covers config.serviceDesk.skipConnectHumanAgentCard
describe('the connect-to-agent card', () => {
  contractSetup();

  it('starts the chat when the user clicks its button', async () => {
    const desk = fakeDesk();
    const { instance } = await openAndConnectByCard(desk);
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    expect(desk.desk.startChat).not.toHaveBeenCalled();
    await click(byRole('button', STRINGS.agent_startChat));
    await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
    expect(events.types()).toEqual([BusEventType.HUMAN_AGENT_PRE_START_CHAT]);
    expect(desk.desk.startChat.mock.calls[0][0].id).toBe('r-connect');
    expect(humanAgent(instance).isConnecting).toBe(true);
  });

  it('shows the connecting error and ends the request when the desk startChat rejects', async () => {
    const desk = fakeDesk();
    desk.desk.startChat.mockImplementation(() =>
      Promise.reject(new Error('desk down'))
    );
    const { instance } = await openAndConnectByCard(desk);
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    await click(byRole('button', STRINGS.agent_startChat));
    await waitFor(() =>
      expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)).toHaveLength(1)
    );
    // A short wait lets a rejection nothing caught surface and fail the test.
    await pause();
    expect(events.types()).toEqual([
      BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      BusEventType.HUMAN_AGENT_END_CHAT,
    ]);
    expect(events.of(BusEventType.HUMAN_AGENT_END_CHAT)[0]).toEqual({
      type: BusEventType.HUMAN_AGENT_END_CHAT,
      endedByHumanAgent: false,
      requestCancelled: true,
    });
    const { messages } = instance.getState();
    const last = messages[messages.length - 1] as MessageResponse;
    expect(last.output.generic).toEqual([
      expect.objectContaining({
        response_type: MessageResponseTypes.INLINE_ERROR,
        text: STRINGS.errors_connectingToHumanAgent,
      }),
    ]);
    expect(humanAgent(instance)).toEqual(
      expect.objectContaining({ isConnecting: false, isConnected: false })
    );
  });
});

/** Opens the chat and joins an agent through the card. */
async function openAndJoin(desk: FakeDesk) {
  const opened = await openAndConnectByCard(desk);
  await click(byRole('button', STRINGS.agent_startChat));
  await waitFor(() => expect(desk.desk.startChat).toHaveBeenCalledTimes(1));
  await act(() => desk.callback().agentJoined(DANA));
  return opened;
}

// @covers event.human_agent:pre:send event.human_agent:send
describe('typing to an agent', () => {
  contractSetup();

  it('sends typed text to the desk, not to customSendMessage, between pre:send and send', async () => {
    const desk = fakeDesk();
    const { instance, backend } = await openAndJoin(desk);
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    const order: string[] = [];
    const deskCalls = () => desk.desk.sendMessageToAgent.mock.calls.length;
    instance.on([
      {
        type: BusEventType.HUMAN_AGENT_PRE_SEND,
        handler: () => order.push(`pre:send after ${deskCalls()} desk calls`),
      },
      {
        type: BusEventType.HUMAN_AGENT_SEND,
        handler: () => order.push(`send after ${deskCalls()} desk calls`),
      },
    ]);
    await typeAndSend('Hello agent');
    await waitFor(() =>
      expect(events.of(BusEventType.HUMAN_AGENT_SEND)).toHaveLength(1)
    );
    expect(order).toEqual([
      'pre:send after 0 desk calls',
      'send after 1 desk calls',
    ]);
    expect(backend.requests).toHaveLength(0);
    const [message, , additionalData] =
      desk.desk.sendMessageToAgent.mock.calls[0];
    expect(message.input).toEqual(
      expect.objectContaining({
        text: 'Hello agent',
        agent_message_type: HumanAgentMessageType.FROM_USER,
      })
    );
    expect(additionalData).toEqual({ filesToUpload: [] });
    const sent = events.of<BusEventHumanAgentPreSend>(
      BusEventType.HUMAN_AGENT_SEND
    )[0];
    expect(sent.data.id).toBe(message.id);
    expect(sent.files).toEqual([]);
    const stored = instance
      .getState()
      .messages.find((stored) => stored.id === message.id) as MessageRequest;
    expect(stored.input.text).toBe('Hello agent');
    expect(stored.history.error_state).toBe(MessageErrorState.NONE);
  });

  it('sends the edits a pre:send handler makes', async () => {
    const desk = fakeDesk();
    const { instance } = await openAndJoin(desk);
    instance.on({
      type: BusEventType.HUMAN_AGENT_PRE_SEND,
      handler: (event: BusEventHumanAgentPreSend) => {
        event.data.input.text = 'edited';
      },
    });
    await typeAndSend('original');
    await waitFor(() =>
      expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(1)
    );
    expect(desk.desk.sendMessageToAgent.mock.calls[0][0].input.text).toBe(
      'edited'
    );
  });

  it('fires no send and marks the message failed when the desk rejects it', async () => {
    const desk = fakeDesk();
    desk.desk.sendMessageToAgent.mockImplementation(() =>
      Promise.reject(new Error('desk refused'))
    );
    const { instance } = await openAndJoin(desk);
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    await typeAndSend('refused');
    await waitFor(() => expect(instance.getState().status).toBe('error'));
    expect(events.types()).toEqual([BusEventType.HUMAN_AGENT_PRE_SEND]);
    const [message] = desk.desk.sendMessageToAgent.mock.calls[0];
    const stored = instance
      .getState()
      .messages.find((stored) => stored.id === message.id);
    expect(stored.history.error_state).toBe(MessageErrorState.FAILED);
  });

  it.each([
    ['the messageID the desk was given', 'given'],
    ["the message's own id", 'own'],
  ])(
    'marks a sent message failed for a USER_MESSAGE error naming %s',
    async (_case, named) => {
      const desk = fakeDesk();
      const { instance } = await openAndJoin(desk);
      await typeAndSend('later failed');
      await waitFor(() =>
        expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(1)
      );
      const [message, messageID] = desk.desk.sendMessageToAgent.mock.calls[0];
      const errorState = () =>
        instance.getState().messages.find((stored) => stored.id === message.id)
          .history.error_state;
      await waitFor(() => expect(errorState()).toBe(MessageErrorState.NONE));
      expect(messageID).not.toBe(message.id);
      await act(() =>
        desk.callback().setErrorStatus({
          type: ErrorType.USER_MESSAGE,
          messageID: named === 'given' ? messageID : message.id,
        })
      );
      expect(errorState()).toBe(MessageErrorState.FAILED);
    }
  );

  it('tells the desk the user is typing', async () => {
    const desk = fakeDesk();
    await openAndJoin(desk);
    await typeText('typing');
    await waitFor(() =>
      expect(desk.desk.userTyping.mock.calls[0]).toEqual([true])
    );
  });

  // @covers instance.serviceDesk.updateIsSuspended
  it('sends typed text to the assistant while the agent chat is suspended', async () => {
    const desk = fakeDesk();
    const { instance, backend } = await openAndJoin(desk);
    await act(() => instance.serviceDesk.updateIsSuspended(true));
    const events = recordEvents(instance, HUMAN_AGENT_EVENTS);
    await typeAndSend('to the assistant');
    await waitFor(() => expect(backend.texts()).toEqual(['to the assistant']));
    expect(desk.desk.sendMessageToAgent).not.toHaveBeenCalled();
    expect(events.types()).toEqual([]);
  });

  // Records the known `main` bug in INTENDED.md "Known `main` bugs":
  // a file picked during an agent chat reaches `filesSelectedForUpload` but is
  // never added to the agent input, so the desk's send gets no files.
  it('passes a picked file to filesSelectedForUpload but not to sendMessageToAgent', async () => {
    const desk = fakeDesk();
    await openAndJoin(desk);
    await act(async () => {
      desk.callback().updateCapabilities({ allowFileUploads: true });
    });
    const file = new File(['x'], 'report.pdf', { type: 'application/pdf' });
    await pickFiles(STRINGS.input_uploadButtonLabel, [file]);
    await waitFor(() =>
      expect(desk.desk.filesSelectedForUpload).toHaveBeenCalledTimes(1)
    );
    await typeAndSend('with a file');
    await waitFor(() =>
      expect(desk.desk.sendMessageToAgent).toHaveBeenCalledTimes(1)
    );
    expect(desk.desk.sendMessageToAgent.mock.calls[0][2]).toEqual({
      filesToUpload: [],
    });
  });
});
