/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A host's service desk and the pieces a human agent scenario needs, built
 * from the public `ServiceDesk` types.
 */

import { act } from '@testing-library/react';

import {
  AdditionalDataToAgent,
  BusEventType,
  ChatInstanceMessaging,
  EndChatInfo,
  GenericItem,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
  ResponseUserProfile,
  ServiceDesk,
  ServiceDeskCallback,
  ServiceDeskFactoryParameters,
  StartChatOptions,
  UserType,
} from '../../../src/aiChatEntry';
import { responseOf } from './messages';

/**
 * A service desk a host would plug in through `serviceDeskFactory`. Each
 * default method is a mock that records its calls. `callback()` is the
 * `ServiceDeskCallback` the chat handed to the latest factory call.
 */
export function fakeDesk(overrides: Partial<ServiceDesk> = {}) {
  const made: ServiceDeskFactoryParameters[] = [];
  const mocks = {
    startChat: jest.fn(
      (_message: MessageResponse, _options: StartChatOptions) =>
        Promise.resolve()
    ),
    endChat: jest.fn((_info: EndChatInfo) => Promise.resolve()),
    sendMessageToAgent: jest.fn(
      (
        _message: MessageRequest,
        _messageID: string,
        _additionalData: AdditionalDataToAgent
      ) => Promise.resolve()
    ),
    areAnyAgentsOnline: jest.fn(
      (_message: MessageResponse): Promise<boolean | null> =>
        Promise.resolve(true)
    ),
    userTyping: jest.fn((_isTyping: boolean) => Promise.resolve()),
    filesSelectedForUpload: jest.fn((_uploads: unknown[]): void => undefined),
  };
  const serviceDesk: ServiceDesk = {
    getName: () => 'contract desk',
    ...mocks,
    ...overrides,
  };
  const factory = jest.fn((parameters: ServiceDeskFactoryParameters) => {
    made.push(parameters);
    return Promise.resolve(serviceDesk);
  });
  return {
    /** The default methods' mocks. A method in `overrides` replaces its mock. */
    desk: mocks,
    factory,
    callback: (): ServiceDeskCallback => made[made.length - 1].callback,
  };
}

export type FakeDesk = ReturnType<typeof fakeDesk>;

/** An assistant item that asks to connect the user to a human agent. */
export const CONNECT_ITEM = {
  response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
  message_to_human_agent: 'The user needs help',
} as GenericItem;

/** A human agent's profile. */
export const DANA: ResponseUserProfile = {
  id: 'agent-1',
  nickname: 'Dana',
  user_type: UserType.HUMAN,
};

/** A second human agent's profile, for transfers. */
export const EVE: ResponseUserProfile = {
  id: 'agent-2',
  nickname: 'Eve',
  user_type: UserType.HUMAN,
};

/** Every human agent event type. */
export const HUMAN_AGENT_EVENTS = [
  BusEventType.HUMAN_AGENT_PRE_RECEIVE,
  BusEventType.HUMAN_AGENT_RECEIVE,
  BusEventType.HUMAN_AGENT_PRE_SEND,
  BusEventType.HUMAN_AGENT_SEND,
  BusEventType.HUMAN_AGENT_PRE_START_CHAT,
  BusEventType.HUMAN_AGENT_PRE_END_CHAT,
  BusEventType.HUMAN_AGENT_END_CHAT,
  BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
];

/**
 * Adds an assistant response holding a connect_to_agent item, through
 * anything with the public `messaging` methods: a `ChatInstance` or a driver.
 */
export async function addConnect(
  chat: { messaging: Pick<ChatInstanceMessaging, 'addMessage'> },
  id = 'r-connect'
): Promise<void> {
  await act(() => chat.messaging.addMessage(responseOf(id, [CONNECT_ITEM])));
}
