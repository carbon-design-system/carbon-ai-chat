/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig, ChatSDKHandle, ChatSDKHandlers } from '../index';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../types/config/ServiceDeskConfig';
import {
  BusEventType,
  type BusEventHumanAgentPreReceive,
  type BusEventHumanAgentReceive,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import {
  HumanAgentMessageType,
  MessageResponseTypes,
  UserType,
  type MessageResponse,
  type TextItem,
  type UserDefinedItem,
} from '../../types/messaging/Messages';
import { storedResponse, texts, withSDK } from './helpers/publicContract';

function gate() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** A desk whose callback the test drives, with an agent the test joins. */
function joinedDesk() {
  let callback: ServiceDeskCallback;
  const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    const desk: ServiceDesk = {
      getName: () => 'Public agent writeback desk',
      startChat: async () => undefined,
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
    };
    return desk;
  };
  return {
    factory,
    callback: () => callback,
    join: async (sdk: ChatSDKHandle) => {
      await sdk.serviceDesk.startConversation();
      await callback.agentJoined({
        id: 'writeback-agent',
        nickname: 'Writeback agent',
        user_type: UserType.HUMAN,
      });
    },
  };
}

describe('SDK agent receive policy', () => {
  it('can hide the joined note and cancel an awaited agent reply without disconnecting or blocking a later allowed reply', async () => {
    let callback: ServiceDeskCallback;
    const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
      parameters
    ) => {
      callback = parameters.callback;
      const desk: ServiceDesk = {
        getName: () => 'Public agent receive desk',
        startChat: async () => undefined,
        endChat: async () => undefined,
        sendMessageToAgent: async () => undefined,
      };
      return desk;
    };
    const entered = gate();
    const release = gate();
    const received: string[] = [];
    await withSDK(
      async (sdk) => {
        const policy: ChatSDKHandlers = {
          type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
          handler: async (event: BusEventHumanAgentPreReceive) => {
            if (
              event.data.output.generic.some(
                (item) =>
                  item.agent_message_type ===
                  HumanAgentMessageType.HUMAN_AGENT_JOINED
              )
            ) {
              event.cancel = true;
            } else if (texts(event.data).includes('Cancel this agent reply')) {
              entered.resolve();
              await release.promise;
              event.cancel = true;
            }
          },
        };
        const delivery: ChatSDKHandlers = {
          type: BusEventType.HUMAN_AGENT_RECEIVE,
          handler: (event: BusEventHumanAgentReceive): void => {
            received.push(...texts(event.data));
          },
        };
        sdk.on([policy, delivery]);
        let cancelled: Promise<void>;
        try {
          await sdk.serviceDesk.startConversation();
          await callback.agentJoined({
            id: 'visible-agent',
            nickname: 'Visible agent',
            user_type: UserType.HUMAN,
          });
          expect(sdk.state.get().humanAgent.isConnected).toBe(true);
          expect(
            sdk.state
              .get()
              .messages.flatMap((message) =>
                'output' in message ? message.output.generic : []
              )
              .some(
                (item) =>
                  item.agent_message_type ===
                  HumanAgentMessageType.HUMAN_AGENT_JOINED
              )
          ).toBe(false);
          cancelled = callback.sendMessageToUser('Cancel this agent reply');
          void cancelled.catch((): void => undefined);
          await bounded(entered.promise, 'Real agent pre-receive entry');
          release.resolve();
          await bounded(cancelled, 'Cancelled real agent reply');
          await callback.sendMessageToUser('Current agent reply');
          expect(received).toEqual(['Current agent reply']);
          expect(
            sdk.state
              .get()
              .messages.flatMap((message) =>
                'output' in message ? texts(message) : []
              )
          ).toContain('Current agent reply');
          expect(
            sdk.state
              .get()
              .messages.flatMap((message) =>
                'output' in message ? texts(message) : []
              )
          ).not.toContain('Cancel this agent reply');
          expect(sdk.state.get().humanAgent.isConnected).toBe(true);
        } finally {
          release.resolve();
          await bounded(
            Promise.allSettled([cancelled]),
            'Owned receive cleanup'
          );
          sdk.off([policy, delivery]);
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: factory }
    );
  });

  it('stores the edits pre:receive and receive handlers make to an agent message, under the ID the chat gave it', async () => {
    const desk = joinedDesk();
    await withSDK(
      async (sdk) => {
        let preData: MessageResponse | undefined;
        let preID: string | undefined;
        let preType: HumanAgentMessageType | undefined;
        let receivedData: MessageResponse | undefined;
        let receivedID: string | undefined;
        let receivedTexts: string[] = [];
        const before: ChatSDKHandlers = {
          type: BusEventType.HUMAN_AGENT_PRE_RECEIVE,
          handler: (event: BusEventHumanAgentPreReceive): void => {
            preData = event.data;
            preID = event.data.id;
            preType = event.data.output.generic[0].agent_message_type;
            (event.data.output.generic[0] as TextItem).text =
              'Edited before storing';
          },
        };
        const after: ChatSDKHandlers = {
          type: BusEventType.HUMAN_AGENT_RECEIVE,
          handler: (event: BusEventHumanAgentReceive): void => {
            receivedData = event.data;
            receivedID = event.data.id;
            receivedTexts = texts(event.data);
            (event.data.output.generic[0] as TextItem).text =
              'Edited after storing';
          },
        };
        try {
          await desk.join(sdk);
          expect(sdk.state.get().humanAgent.isConnected).toBe(true);
          sdk.on([before, after]);
          const message: MessageResponse = {
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: 'Original agent text',
                },
              ],
            },
          };
          await bounded(
            desk.callback().sendMessageToUser(message),
            'Agent message'
          );
          expect(typeof preID).toBe('string');
          expect(preID).not.toBe('');
          expect(preType).toBe(HumanAgentMessageType.FROM_HUMAN_AGENT);
          expect(receivedID).toBe(preID);
          expect(receivedTexts).toEqual(['Edited before storing']);
          // Both events carry the desk's own object, which takes the ID.
          expect(preData).toBe(message);
          expect(receivedData).toBe(message);
          expect(message.id).toBe(preID);
          expect(typeof message.history?.timestamp).toBe('number');
          expect(texts(storedResponse(sdk.state.get(), preID))).toEqual([
            'Edited after storing',
          ]);
          expect(sdk.state.get().humanAgent.isConnected).toBe(true);
        } finally {
          sdk.off([before, after]);
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('keeps a snapshot taken in a later user-defined callback of an agent message at the earlier item value', async () => {
    const desk = joinedDesk();
    await withSDK(
      async (sdk) => {
        const seen: string[] = [];
        let held: ReturnType<typeof sdk.state.get> | undefined;
        const callback: ChatSDKHandlers = {
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: (event: BusEventUserDefinedResponse): void => {
            const value = String(
              (event.data.message as UserDefinedItem).user_defined?.value
            );
            seen.push(value);
            if (value === 'second') {
              // Taken, and not read, before a handler edits the earlier item.
              held = sdk.state.get();
              (
                (event.data.fullMessage as MessageResponse).output
                  .generic[0] as UserDefinedItem
              ).user_defined.value = 'edited later';
            }
          },
        };
        try {
          await desk.join(sdk);
          sdk.on(callback);
          await bounded(
            desk.callback().sendMessageToUser({
              id: 'agent-user-defined',
              output: {
                generic: [
                  {
                    response_type: MessageResponseTypes.USER_DEFINED,
                    user_defined: { value: 'first' },
                  },
                  {
                    response_type: MessageResponseTypes.USER_DEFINED,
                    user_defined: { value: 'second' },
                  },
                ],
              },
            }),
            'Agent user-defined message'
          );
          expect(seen).toEqual(['first', 'second']);
          expect(held).toBeDefined();
          const kept = storedResponse(held, 'agent-user-defined');
          expect(Object.isFrozen(kept)).toBe(true);
          expect(kept.output.generic[0]).toMatchObject({
            user_defined: { value: 'first' },
          });
          expect(
            storedResponse(sdk.state.get(), 'agent-user-defined').output
              .generic[0]
          ).toMatchObject({ user_defined: { value: 'edited later' } });
        } finally {
          sdk.off(callback);
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });
});
