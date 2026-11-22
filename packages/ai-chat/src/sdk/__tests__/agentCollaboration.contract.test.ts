/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type {
  ChatSDKConfig,
  ChatSDKErrorData,
  ChatSDKInstance,
} from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import { OnErrorType } from '../../types/config/ErrorConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
  StartChatOptions,
} from '../../types/config/ServiceDeskConfig';
import { BusEventType } from '../../types/events/eventBusTypes';
import {
  MessageResponseTypes,
  UserType,
  type GenericItem,
  type MessageResponse,
} from '../../types/messaging/Messages';
import {
  FIXED_TIMESTAMP,
  storedResponse,
  withSDK,
} from './helpers/publicContract';

function integration(
  availability: (
    message: MessageResponse
  ) => Promise<boolean | null> = async () => true
) {
  const checks: MessageResponse[] = [];
  const starts: { message: MessageResponse; options: StartChatOptions }[] = [];
  let callback: ServiceDeskCallback;
  let instance: ChatSDKInstance;
  let ends = 0;
  const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    instance = parameters.instance;
    const desk: ServiceDesk = {
      getName: () => 'SDK contract desk',
      areAnyAgentsOnline: async (message) => {
        checks.push(message);
        return availability(message);
      },
      startChat: async (message, options) => {
        starts.push({ message, options });
      },
      endChat: async () => {
        ends += 1;
      },
      sendMessageToAgent: async () => undefined,
    };
    return desk;
  };
  return {
    factory,
    starts,
    checksFor: (id: string) =>
      checks.filter((message) => message.id === id).length,
    get callback() {
      return callback;
    },
    get instance() {
      return instance;
    },
    get ends() {
      return ends;
    },
  };
}

function connectResponse(
  id: string,
  {
    historyHidden = false,
    itemHidden = false,
    streamID,
    leading,
    note = 'The user needs help',
  }: {
    historyHidden?: boolean;
    itemHidden?: boolean;
    streamID?: string;
    leading?: 'pause' | 'text';
    note?: string;
  } = {}
): MessageResponse {
  const generic: GenericItem[] = [];
  if (leading === 'pause') {
    generic.push({ response_type: MessageResponseTypes.PAUSE, time: 0 });
  } else if (leading === 'text') {
    generic.push({ response_type: MessageResponseTypes.TEXT, text: 'Help' });
  }
  generic.push({
    response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
    message_to_human_agent: note,
    ...(streamID ? { streaming_metadata: { id: streamID } } : {}),
    ...(itemHidden ? { user_defined: { silent: true } } : {}),
  });
  return {
    id,
    history: { timestamp: FIXED_TIMESTAMP, silent: historyHidden },
    output: { generic },
  };
}

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(operation: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          2000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

describe('SDK agent collaboration', () => {
  it('probes real availability, public start and agent state with no DOM', async () => {
    const desk = integration();
    await withSDK(
      async (sdk) => {
        try {
          expect(typeof window).toBe('undefined');
          expect(typeof document).toBe('undefined');
          await sdk.messaging.upsertMessage(
            'probe',
            MessageState.STREAMING,
            () => connectResponse('probe')
          );
          expect(desk.checksFor('probe')).toBe(0);
          await sdk.messaging.upsertMessage(
            'probe',
            MessageState.COMPLETE,
            () => connectResponse('probe')
          );
          expect(desk.checksFor('probe')).toBe(1);
          expect(
            sdk.state
              .get()
              .messageItems?.find((item) => item.messageID === 'probe')
              ?.humanAgent
          ).toMatchObject({ onlineStatus: 'online' });
          await sdk.serviceDesk.startConversation({
            messageID: 'probe',
            payload: { topic: 'billing' },
          });
          expect(desk.starts).toHaveLength(1);
          expect(desk.starts[0].message.id).toBe('probe');
          expect(desk.starts[0].options.preStartChatPayload).toEqual({
            topic: 'billing',
          });
          await desk.callback.agentJoined({
            id: 'agent',
            nickname: 'Ada',
            user_type: UserType.HUMAN,
          });
          expect(sdk.state.get().humanAgent).toMatchObject({
            isConnected: true,
            responseUserProfile: { id: 'agent', nickname: 'Ada' },
          });
          expect(desk.instance.state.get().humanAgent.isConnected).toBe(true);
          await sdk.serviceDesk.endConversation();
          expect(sdk.state.get().humanAgent.isConnected).toBe(false);
          expect(desk.ends).toBe(1);
        } finally {
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it.each([
    { hiddenBy: 'history', initiallyHidden: true },
    { hiddenBy: 'history', initiallyHidden: false },
    { hiddenBy: 'item', initiallyHidden: true },
    { hiddenBy: 'item', initiallyHidden: false },
  ] as const)(
    'checks once across $hiddenBy visibility changes starting hidden=$initiallyHidden',
    async ({ hiddenBy, initiallyHidden }) => {
      const desk = integration();
      await withSDK(
        async (sdk) => {
          const id = 'visibility';
          const message = (
            hidden: boolean,
            withPause = false,
            note = 'The user needs help'
          ) =>
            connectResponse(id, {
              historyHidden: hiddenBy === 'history' && hidden,
              itemHidden: hiddenBy === 'item' && hidden,
              leading: withPause ? 'pause' : undefined,
              note,
            });
          const write = (hidden: boolean, withPause = false) =>
            sdk.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
              message(hidden, withPause)
            );
          await sdk.messaging.upsertMessage(id, MessageState.STREAMING, () =>
            message(initiallyHidden)
          );
          expect(desk.checksFor(id)).toBe(0);
          await write(initiallyHidden);
          await write(initiallyHidden);
          await sdk.messaging.upsertMessage(id, MessageState.COMPLETE, () => ({
            ...message(initiallyHidden, false, 'The user needs help now'),
            thread_id: 'updated-thread',
          }));
          await write(initiallyHidden, true);
          expect(desk.checksFor(id)).toBe(1);
          expect(
            sdk.state
              .get()
              .messageItems?.filter((item) => item.messageID === id)
          ).toHaveLength(initiallyHidden ? 0 : 1);
          await write(!initiallyHidden, true);
          expect(
            sdk.state
              .get()
              .messageItems?.filter((item) => item.messageID === id)
          ).toHaveLength(initiallyHidden ? 1 : 0);
          await write(initiallyHidden, true);
          expect(desk.checksFor(id)).toBe(1);
          expect(
            sdk.state
              .get()
              .messageItems?.filter((item) => item.messageID === id)
          ).toHaveLength(initiallyHidden ? 0 : 1);
          expect(storedResponse(sdk.state.get(), id).id).toBe(id);
          await sdk.messaging.removeMessages([id]);
          expect(sdk.state.get().messages).toEqual([]);
          await write(initiallyHidden);
          expect(desk.checksFor(id)).toBe(2);
          await sdk.messaging.restartConversation();
          expect(sdk.state.get().messages).toEqual([]);
          await write(initiallyHidden);
          expect(desk.checksFor(id)).toBe(3);
        },
        () => undefined,
        { serviceDeskFactory: desk.factory }
      );
    }
  );

  it.each([
    { identity: 'explicit', explicitID: true },
    { identity: 'positional', explicitID: false },
  ])(
    'checks named empty-state reintroductions by $identity identity',
    async ({ explicitID }) => {
      const desk = integration();
      await withSDK(
        async (sdk) => {
          const phases = [
            { state: MessageState.COMPLETE, hidden: false },
            { state: MessageState.COMPLETE, hidden: true },
            { state: MessageState.STREAMING, hidden: false },
            { state: MessageState.STREAMING, hidden: true },
            { state: MessageState.ERROR, hidden: false },
            { state: MessageState.ERROR, hidden: true },
          ];
          for (const { state, hidden } of phases) {
            const id = `reintroduced-${state}-${hidden}`;
            const message = () =>
              connectResponse(id, {
                historyHidden: hidden,
                streamID: explicitID ? 'agent' : undefined,
              });
            await sdk.messaging.upsertMessage(
              id,
              MessageState.COMPLETE,
              message
            );
            expect(desk.checksFor(id)).toBe(1);
            await sdk.messaging.upsertMessage(id, state, () => ({
              id,
              history: { timestamp: FIXED_TIMESTAMP },
              output: { generic: [] },
            }));
            await sdk.messaging.upsertMessage(
              id,
              MessageState.COMPLETE,
              message
            );
            expect(desk.checksFor(id)).toBe(explicitID ? 1 : 2);
            expect(
              storedResponse(sdk.state.get(), id).output.generic[0]
                .response_type
            ).toBe(MessageResponseTypes.CONNECT_TO_HUMAN_AGENT);
            await sdk.messaging.removeMessages([id]);
            expect(sdk.state.get().messages).toEqual([]);
          }
        },
        () => undefined,
        { serviceDeskFactory: desk.factory }
      );
    }
  );

  it('checks a new explicit identity after content, position and visibility edits', async () => {
    const desk = integration();
    await withSDK(
      async (sdk) => {
        const write = (
          streamID: string,
          hidden: boolean,
          withText = false,
          note = 'Help'
        ) =>
          sdk.messaging.upsertMessage('identity', MessageState.COMPLETE, () =>
            connectResponse('identity', {
              streamID,
              historyHidden: hidden,
              leading: withText ? 'text' : undefined,
              note,
            })
          );
        await write('first', true);
        await write('first', false, true, 'Help now');
        await write('first', true);
        expect(desk.checksFor('identity')).toBe(1);
        await write('second', true);
        expect(desk.checksFor('identity')).toBe(2);
        expect(
          storedResponse(sdk.state.get(), 'identity').output.generic[0]
            .streaming_metadata.id
        ).toBe('second');
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('drops a native response when restart wins a pending availability check', async () => {
    let enter: () => void;
    let answer: (online: boolean) => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const availability = new Promise<boolean>((resolve) => {
      answer = resolve;
    });
    const desk = integration(async () => {
      enter();
      return availability;
    });
    await withSDK(
      async (sdk) => {
        const received: string[] = [];
        sdk.on({
          type: BusEventType.RECEIVE,
          handler: () => {
            received.push('receive');
          },
        });
        const outcome = sdk.messaging
          .upsertMessage('pending', MessageState.COMPLETE, () =>
            connectResponse('pending')
          )
          .then(
            () => ({ ok: true as const }),
            (error: unknown) => ({ ok: false as const, error })
          );
        let failure: { error: unknown } | undefined;
        try {
          await bounded(
            Promise.race([
              entered,
              outcome.then((result) => {
                if (result.ok === false) {
                  throw result.error;
                }
                throw new Error(
                  'The write finished before checking availability'
                );
              }),
            ]),
            'Availability entry'
          );
          await bounded(sdk.messaging.restartConversation(), 'Restart');
          answer(true);
          const result = await bounded(outcome, 'Owned upsert');
          if (result.ok === false) {
            throw result.error;
          }
          expect(received).toEqual([]);
          expect(sdk.state.get().messages).toEqual([]);
        } catch (error) {
          failure = { error };
        } finally {
          answer(false);
          try {
            const result = await bounded(outcome, 'Owned upsert cleanup');
            if (result.ok === false) {
              failure ??= { error: result.error };
            }
          } catch (error) {
            failure ??= { error };
          }
        }
        if (failure) {
          throw failure.error;
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('retains an offline result without repeating the real availability call', async () => {
    const desk = integration(async () => false);
    await withSDK(
      async (sdk) => {
        await sdk.messaging.upsertMessage(
          'offline',
          MessageState.COMPLETE,
          () => connectResponse('offline')
        );
        await sdk.messaging.upsertMessage(
          'offline',
          MessageState.COMPLETE,
          () => connectResponse('offline', { note: 'Edited' })
        );
        expect(desk.checksFor('offline')).toBe(1);
        expect(
          sdk.state
            .get()
            .messageItems?.find((item) => item.messageID === 'offline')
            ?.humanAgent
        ).toMatchObject({ onlineStatus: 'offline' });
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('reports a missing service desk once through onError and public item state', async () => {
    const errors: ChatSDKErrorData[] = [];
    await withSDK(
      async (sdk) => {
        await sdk.messaging.upsertMessage(
          'missing',
          MessageState.COMPLETE,
          () => connectResponse('missing')
        );
        await sdk.messaging.upsertMessage(
          'missing',
          MessageState.COMPLETE,
          () => connectResponse('missing', { note: 'Edited' })
        );
        expect(errors).toHaveLength(1);
        expect(errors[0].errorType).toBe(OnErrorType.INTEGRATION_ERROR);
        expect(
          sdk.state
            .get()
            .messageItems?.find((item) => item.messageID === 'missing')
            ?.humanAgent
        ).toMatchObject({ noServiceDesk: true });
      },
      () => undefined,
      {
        onError: (error) => {
          errors.push(error);
        },
      }
    );
  });
});
