/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig, ChatSDKErrorData } from '../index';
import { OnErrorType } from '../../types/config/ErrorConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../types/config/ServiceDeskConfig';
import { UserType } from '../../types/messaging/Messages';
import { MessageState } from '../../types/config/MessagingConfig';
import { textResponse, withSDK } from './helpers/publicContract';

type Connection = NonNullable<
  NonNullable<ChatSDKConfig['humanAgentState']>['initialState']
>;

function deskIntegration() {
  let callback: ServiceDeskCallback;
  let reconnects = 0;
  const sent: string[] = [];
  const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    const desk: ServiceDesk = {
      getName: () => 'Saved suspension desk',
      startChat: async () => undefined,
      endChat: async () => undefined,
      sendMessageToAgent: async (message) => {
        sent.push(message.input.text);
      },
      reconnect: async () => {
        reconnects += 1;
        return true;
      },
    };
    return desk;
  };
  return {
    factory,
    sent,
    get callback() {
      return callback;
    },
    get reconnects() {
      return reconnects;
    },
  };
}

describe('SDK callback and saved-connection recovery', () => {
  it('restores a suspended saved connection and keeps SDK sends on the assistant after resume', async () => {
    const first = deskIntegration();
    const saved: Connection[] = [];
    await withSDK(
      async (sdk) => {
        try {
          await sdk.serviceDesk.startConversation();
          await first.callback.agentJoined({
            id: 'saved-agent',
            nickname: 'Ada',
            user_type: UserType.HUMAN,
          });
          await sdk.serviceDesk.updateIsSuspended(true);
          const connection = saved[saved.length - 1];
          expect(connection).toMatchObject({
            isConnected: true,
            isSuspended: true,
          });
          const restored = deskIntegration();
          const assistant: string[] = [];
          await withSDK(
            async (next) => {
              try {
                expect(restored.reconnects).toBe(1);
                expect(next.state.get().humanAgent).toMatchObject({
                  isConnected: true,
                  isSuspended: true,
                });
                await next.messaging.send('Assistant after restore');
                expect(assistant).toEqual(['Assistant after restore']);
                expect(restored.sent).toEqual([]);
                await next.serviceDesk.updateIsSuspended(false);
                expect(next.state.get().humanAgent).toMatchObject({
                  isConnected: true,
                  isSuspended: false,
                });
                await next.messaging.send('Assistant after resume');
                expect(restored.sent).toEqual([]);
                expect(assistant).toEqual([
                  'Assistant after restore',
                  'Assistant after resume',
                ]);
              } finally {
                await next.serviceDesk.endConversation();
              }
            },
            async (request) => {
              assistant.push(request.input.text);
            },
            {
              serviceDeskFactory: restored.factory,
              humanAgentState: { initialState: connection },
            }
          );
        } finally {
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      {
        serviceDeskFactory: first.factory,
        humanAgentState: {
          onStateChange: (state) => {
            saved.push(state);
          },
        },
      }
    );
  });

  it('keeps the transport failure and later state delivery when the host onError callback throws', async () => {
    const transportFailure = new Error('Owned transport failure');
    const callbackFailure = new Error('Owned error callback failure');
    const errors: ChatSDKErrorData[] = [];
    const requests: string[] = [];
    await withSDK(
      async (sdk) => {
        const notifications: string[][] = [];
        const unsubscribe = sdk.state.subscribe(() => {
          notifications.push(sdk.state.get().messages.map(({ id }) => id));
        });
        try {
          await expect(sdk.messaging.send('Fail request')).rejects.toThrow(
            transportFailure.message
          );
          expect(errors.map(({ errorType }) => errorType)).toEqual([
            OnErrorType.MESSAGE_COMMUNICATION,
          ]);
          await sdk.messaging.send('Recover request');
          expect(requests).toEqual(['Fail request', 'Recover request']);
          expect(
            sdk.state.get().messages.some(({ id }) => id === 'recovery-reply')
          ).toBe(true);
          expect(
            notifications.some((ids) => ids.includes('recovery-reply'))
          ).toBe(true);
        } finally {
          unsubscribe();
        }
      },
      async (request, _options, instance) => {
        requests.push(request.input.text);
        if (request.input.text === 'Fail request') {
          throw transportFailure;
        }
        await instance.messaging.upsertMessage(
          'recovery-reply',
          MessageState.COMPLETE,
          () => textResponse('recovery-reply', 'Recovered reply')
        );
      },
      {
        onError: (error) => {
          errors.push(error);
          throw callbackFailure;
        },
      }
    );
  });
});
