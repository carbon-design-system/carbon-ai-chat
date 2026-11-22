/**
 * @vitest-environment node
 */

/* eslint jsdoc/check-tag-names: ["error", { "definedTags": ["vitest-environment"] }] */

/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig } from '../index';
import { MessageState } from '../../types/config/MessagingConfig';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../types/config/ServiceDeskConfig';
import { UserType } from '../../types/messaging/Messages';
import { textResponse, withSDK } from './helpers/publicContract';

type Connection = NonNullable<
  NonNullable<ChatSDKConfig['humanAgentState']>['initialState']
>;

function integration() {
  let callback: ServiceDeskCallback;
  let reconnects = 0;
  const restoredDeskState: unknown[] = [];
  const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    restoredDeskState.push(parameters.persistedState);
    const desk: ServiceDesk = {
      getName: () => 'Persistent desk',
      startChat: async () => undefined,
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
      reconnect: async () => {
        reconnects += 1;
        return true;
      },
    };
    return desk;
  };
  return {
    factory,
    restoredDeskState,
    get callback() {
      return callback;
    },
    get reconnects() {
      return reconnects;
    },
  };
}

describe('SDK human-agent persistence', () => {
  it('saves only connection changes and reconnects a fresh SDK from that public value', async () => {
    const first = integration();
    const values: Connection[] = [];
    await withSDK(
      async (sdk) => {
        try {
          await sdk.serviceDesk.startConversation();
          await first.callback.agentJoined({
            id: 'saved-agent',
            nickname: 'Ada',
            user_type: UserType.HUMAN,
          });
          first.callback.updatePersistedState({ ticket: 'T-42' });
          const saved = values[values.length - 1];
          expect(saved).toMatchObject({
            isConnected: true,
            responseUserProfile: { id: 'saved-agent' },
            serviceDeskState: { ticket: 'T-42' },
          });
          const savedChanges = values.length;
          await sdk.messaging.upsertMessage(
            'ordinary-reply',
            MessageState.COMPLETE,
            () => textResponse('ordinary-reply', 'Unrelated reply')
          );
          expect(values).toHaveLength(savedChanges);
          const restored = integration();
          await withSDK(
            async (next) => {
              try {
                expect(restored.reconnects).toBe(1);
                expect(restored.restoredDeskState).toEqual([
                  { ticket: 'T-42' },
                ]);
                expect(next.state.get().humanAgent).toMatchObject({
                  isConnected: true,
                  responseUserProfile: { id: 'saved-agent', nickname: 'Ada' },
                });
                expect(
                  next.state
                    .get()
                    .messages.some(({ id }) => id === 'ordinary-reply')
                ).toBe(false);
              } finally {
                await next.serviceDesk.endConversation();
              }
            },
            () => undefined,
            {
              serviceDeskFactory: restored.factory,
              humanAgentState: { initialState: saved },
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
            values.push(state);
          },
        },
      }
    );
  });
});
