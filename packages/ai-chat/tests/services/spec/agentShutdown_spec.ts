/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import { outputItemToLocalItem } from '../../../src/shared/schema/outputItemToLocalItem';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import type {
  ServiceDesk,
  ServiceDeskCallback,
  ServiceDeskFactoryParameters,
} from '../../../src/types/config/ServiceDeskConfig';
import { ScreenShareState } from '../../../src/types/config/ServiceDeskConfig';
import { ViewType } from '../../../src/types/instance/apiTypes';
import {
  MessageResponseTypes,
  UserType,
  type ConnectToHumanAgentItem,
  type MessageResponse,
} from '../../../src/types/messaging/Messages';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import createHumanAgentService from '../../../src/shared/services/haa/HumanAgentServiceImpl';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

const profile = { id: 'dana', nickname: 'Dana', user_type: UserType.HUMAN };

const connectMessage: MessageResponse = {
  id: 'connect-response',
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
        message_to_human_agent: 'The user needs help',
      } as ConnectToHumanAgentItem,
    ],
  },
};

function mockDesk(overrides: Partial<ServiceDesk> = {}) {
  return {
    getName: () => 'Test desk',
    startChat: jest.fn(async () => {}),
    endChat: jest.fn(async () => {}),
    sendMessageToAgent: jest.fn(async () => {}),
    reconnect: jest.fn(async () => true),
    ...overrides,
  };
}

/** A chat whose service desk the test controls. */
async function agentChat(
  factory: (
    parameters: ServiceDeskFactoryParameters
  ) => Promise<ServiceDesk> | ServiceDesk,
  config: Partial<PublicConfig> = {}
) {
  let callback: ServiceDeskCallback;
  const serviceDeskFactory = jest.fn(
    async (parameters: ServiceDeskFactoryParameters) => {
      callback = parameters.callback;
      return factory(parameters);
    }
  );
  const chat = await renderChatAndGetInstanceWithStore({
    ...createBaseConfig(),
    messaging: { ...createBaseConfig().messaging, skipWelcome: true },
    serviceDeskFactory,
    ...config,
  });
  const serviceManager = (
    chat.serviceManager.messageCoordinator as unknown as {
      serviceManager: ServiceManager;
    }
  ).serviceManager;
  void chat.instance.changeView(ViewType.MAIN_WINDOW);
  return {
    ...chat,
    serviceManager,
    serviceDeskFactory,
    callback: () => callback,
  };
}

/** Puts the chat in a conversation with an agent, through the desk's callback. */
async function connect(chat: Awaited<ReturnType<typeof agentChat>>) {
  await waitFor(() => expect(chat.callback()).toBeDefined());
  await waitFor(() => expect(chat.store.getState().isHydrated).toBe(true));
  (
    chat.serviceManager.humanAgentService as unknown as {
      chatStarted: boolean;
    }
  ).chatStarted = true;
  await chat.callback().agentJoined(profile);
  expect(
    chat.store.getState().persistedToBrowserStorage.humanAgentState.isConnected
  ).toBe(true);
}

describe('agent connection at shutdown', () => {
  beforeEach(() => {
    setupBeforeEach();
    // Each case connects an agent, which the next chat would restore.
    sessionStorage.clear();
  });
  afterEach(setupAfterEach);

  it('disconnects without ending the conversation on the desk (O5)', async () => {
    const desk = mockDesk();
    const chat = await agentChat(() => desk);
    await connect(chat);
    const saved = { ...sessionStorage };
    const before = chat.store.getState();

    await chat.serviceManager.shutdown();

    expect(desk.endChat).not.toHaveBeenCalled();
    expect({ ...sessionStorage }).toEqual(saved);

    // Nothing that runs later reaches the desk or the chat.
    await chat.serviceManager.humanAgentService.endChat(true);
    await chat.serviceManager.humanAgentService.sendMessageToAgent('late', []);
    await chat.callback().sendMessageToUser('late reply');
    await chat.callback().agentEndedChat();
    await expect(chat.callback().screenShareRequest()).resolves.toBe(
      ScreenShareState.CANCELLED
    );

    expect(desk.endChat).not.toHaveBeenCalled();
    expect(desk.sendMessageToAgent).not.toHaveBeenCalled();
    expect(chat.store.getState()).toBe(before);
    expect({ ...sessionStorage }).toEqual(saved);
  });

  it('answers a screen-share request still waiting with CANCELLED', async () => {
    const desk = mockDesk();
    const chat = await agentChat(() => desk);
    await connect(chat);
    const answer = chat.callback().screenShareRequest();

    await chat.serviceManager.shutdown();

    await expect(answer).resolves.toBe(ScreenShareState.CANCELLED);
  });

  it('stops the agent join timer', async () => {
    const desk = mockDesk({ startChat: jest.fn(() => new Promise(() => {})) });
    const chat = await agentChat(() => desk);
    await waitFor(() => expect(chat.callback()).toBeDefined());
    const service = chat.serviceManager.humanAgentService as unknown as {
      waitingForHumanAgentJoinedTimer: unknown;
    };
    service.waitingForHumanAgentJoinedTimer = setTimeout(() => {}, 60_000);

    await chat.serviceManager.shutdown();

    expect(service.waitingForHumanAgentJoinedTimer).toBeNull();
  });

  it('starts no join timer when shutdown lands during the pre-start handlers (O3)', async () => {
    const desk = mockDesk();
    const chat = await agentChat(() => desk, {
      serviceDesk: { agentJoinTimeoutSeconds: 30 },
    });
    await waitFor(() => expect(chat.callback()).toBeDefined());
    await waitFor(() => expect(chat.store.getState().isHydrated).toBe(true));
    const handlerRelease = resolvablePromise<void>();
    const handler = jest.fn(() => handlerRelease);
    chat.instance.on({
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler,
    });
    const local = outputItemToLocalItem(
      connectMessage.output.generic[0],
      connectMessage
    );
    const service = chat.serviceManager.humanAgentService as unknown as {
      waitingForHumanAgentJoinedTimer: unknown;
    };
    const connecting = chat.serviceManager.humanAgentService
      .startChat(local as never, connectMessage)
      .catch(() => {});
    await waitFor(() => expect(handler).toHaveBeenCalled());

    await chat.serviceManager.shutdown();
    handlerRelease.doResolve();
    await connecting;

    expect(service.waitingForHumanAgentJoinedTimer).toBeFalsy();
    expect(desk.startChat).not.toHaveBeenCalled();
  });

  it('stops the send warning and failure timers (O3)', async () => {
    const desk = mockDesk({
      sendMessageToAgent: jest.fn(() => new Promise<void>(() => {})),
    });
    const chat = await agentChat(() => desk);
    await connect(chat);
    const service = chat.serviceManager.humanAgentService as unknown as {
      sendTimers: Set<unknown>;
    };
    void chat.serviceManager.humanAgentService
      .sendMessageToAgent('hello', [])
      .catch(() => {});
    await waitFor(() => expect(desk.sendMessageToAgent).toHaveBeenCalled());
    expect(service.sendTimers.size).toBe(2);

    await chat.serviceManager.shutdown();

    expect(service.sendTimers.size).toBe(0);
  });

  it('calls no desk factory once shut down, as a factory swap would (O10)', async () => {
    const chat = await agentChat(() => mockDesk());
    await waitFor(() => expect(chat.callback()).toBeDefined());
    const calls = chat.serviceDeskFactory.mock.calls.length;

    await chat.serviceManager.shutdown();
    const replacement = createHumanAgentService(chat.serviceManager);
    await replacement.initialize();
    await replacement.handleHydration(true, true);

    expect(chat.serviceDeskFactory).toHaveBeenCalledTimes(calls);
  });

  it('keeps a held desk connect from reaching the chat after shutdown (O10)', async () => {
    const started = resolvablePromise<void>();
    const desk = mockDesk({ startChat: jest.fn(() => started) });
    const chat = await agentChat(() => desk);
    await waitFor(() => expect(chat.callback()).toBeDefined());
    await waitFor(() => expect(chat.store.getState().isHydrated).toBe(true));
    const local = outputItemToLocalItem(
      connectMessage.output.generic[0],
      connectMessage
    );
    const connecting = chat.serviceManager.humanAgentService
      .startChat(local as never, connectMessage)
      .catch(() => {});
    await waitFor(() => expect(desk.startChat).toHaveBeenCalled());
    const before = chat.store.getState();

    await chat.serviceManager.shutdown();
    started.doResolve();
    await connecting;
    await chat.callback().agentJoined(profile);
    await chat.callback().sendMessageToUser('hello');

    expect(chat.store.getState()).toBe(before);
    expect(desk.endChat).not.toHaveBeenCalled();
  });

  it('never uses or reconnects a desk its factory returns after shutdown (O10)', async () => {
    const created = resolvablePromise<ServiceDesk>();
    const desk = mockDesk();
    const chat = await agentChat(() => created);
    await waitFor(() => expect(chat.callback()).toBeDefined());

    await chat.serviceManager.shutdown();
    created.doResolve(desk);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await chat.serviceManager.humanAgentService.handleHydration(true, true);
    await chat.serviceManager.humanAgentService.endChat(true);

    expect(desk.reconnect).not.toHaveBeenCalled();
    expect(desk.endChat).not.toHaveBeenCalled();
    expect(desk.startChat).not.toHaveBeenCalled();
  });
});
