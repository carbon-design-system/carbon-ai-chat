/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The thin driver shared scenarios run against (plan D6). A scenario calls
 * only these verbs, so the same body can run against every public entry that
 * has them. On `main` there is one driver: the `ChatInstance` a host hands
 * over. Assertions on state shape stay per driver, so the driver reads
 * state through `messages()` and `status()` rather than handing it out.
 */

import { act } from '@testing-library/react';

import {
  ChatInstance,
  ChatInstanceMessaging,
  ChatInstanceServiceDeskActions,
  ConversationStatus,
  EventHandlers,
  Message,
  MessageRequest,
  PublicConfig,
  SendOptions,
} from '../../../src/aiChatEntry';
import { FakeBackend, SentRequest, fakeBackend } from './backend';
import { contractChat, contractSetup } from './mount';

export interface ContractDriver extends EventHandlers {
  /** Names the driver in test titles. */
  readonly name: string;
  /** The host's `customSendMessage`. */
  readonly backend: FakeBackend;
  readonly messaging: ChatInstanceMessaging;
  readonly serviceDesk: ChatInstanceServiceDeskActions;
  /** Sends a message as the user, the way the entry's own send does. */
  send(message: MessageRequest | string, options?: SendOptions): Promise<void>;
  /** The conversation's messages, oldest first. */
  messages(): readonly Message[];
  /** The conversation's phase. */
  status(): ConversationStatus;
}

/** Makes a driver for one test, from the config the scenario needs. */
export type DriverFactory = (
  config?: Partial<PublicConfig>
) => Promise<ContractDriver>;

/**
 * The instance driver: a `ChatContainer` mount, with the fake backend as
 * `customSendMessage` unless the config brings its own.
 */
export const instanceDriver: DriverFactory = async (config = {}) => {
  const backend = fakeBackend();
  const { instance } = await contractChat({
    ...config,
    messaging: {
      customSendMessage: backend.customSendMessage,
      ...config.messaging,
    },
  });
  return {
    name: 'instance',
    backend,
    messaging: instance.messaging,
    serviceDesk: instance.serviceDesk,
    on: (handlers) => instance.on(handlers),
    off: (handlers) => instance.off(handlers),
    once: (handlers) => instance.once(handlers),
    send: (message, options) => instance.send(message, options),
    messages: () => instance.getState().messages,
    status: () => instance.getState().status,
  };
};

/** Every driver the shared scenarios run against. PR B adds the SDK handle. */
export const DRIVERS: ReadonlyArray<[string, DriverFactory]> = [
  ['instance', instanceDriver],
];

/**
 * Runs a block of shared scenarios once per driver. Inside, `makeDriver`
 * builds that driver for a test. Each block gets `contractSetup`.
 */
export function describeShared(
  title: string,
  body: (makeDriver: DriverFactory) => void
): void {
  describe.each(DRIVERS)(`${title} [%s]`, (_name, makeDriver) => {
    contractSetup();
    body(makeDriver);
  });
}

/** What `startSend` needs: a way to send, and the backend that gets it. */
export type Sender = Pick<ContractDriver, 'send' | 'backend'>;

/**
 * The `startSend` pair for a plain mount: the instance's own `send`, and the
 * fake backend the test passed in as `customSendMessage`.
 */
export function instanceSender(
  instance: ChatInstance,
  backend: FakeBackend
): Sender {
  return {
    send: (message, options) => instance.send(message, options),
    backend,
  };
}

/** A send in flight: the call the backend got, and the send's own promise. */
export interface StartedSend {
  sent: SentRequest;
  /** The driver's `send` promise. It settles once `customSendMessage` does. */
  done: Promise<void>;
}

/**
 * Starts a send and waits for the backend to get it, without waiting for the
 * send to settle: `send` resolves only after `customSendMessage` does.
 */
export async function startSend(
  chat: Sender,
  message: MessageRequest | string,
  options?: SendOptions
): Promise<StartedSend> {
  let done: Promise<void>;
  await act(async () => {
    done = chat.send(message, options);
  });
  const sent = await chat.backend.next();
  return { sent, done };
}

/** Settles a send's backend call and waits for the send to finish. */
export async function finishSend(started: StartedSend): Promise<void> {
  await act(async () => {
    started.sent.resolve();
    await started.done;
  });
}
