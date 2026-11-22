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

import type { ChatSDKConfig, ChatSDKHandlers } from '../index';
import type {
  ServiceDesk,
  ServiceDeskCallback,
} from '../../types/config/ServiceDeskConfig';
import { BusEventType } from '../../types/events/eventBusTypes';
import { UserType } from '../../types/messaging/Messages';
import { withSDK } from './helpers/publicContract';

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

function integration() {
  let callback: ServiceDeskCallback;
  let starts = 0;
  let ends = 0;
  const factory: NonNullable<ChatSDKConfig['serviceDeskFactory']> = async (
    parameters
  ) => {
    callback = parameters.callback;
    const desk: ServiceDesk = {
      getName: () => 'Public action recovery desk',
      startChat: async () => {
        starts += 1;
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
    get callback() {
      return callback;
    },
    get starts() {
      return starts;
    },
    get ends() {
      return ends;
    },
  };
}

describe('SDK service-desk action recovery', () => {
  it('returns a pre-start consumer failure without starting the desk and can retry after that handler is removed', async () => {
    const desk = integration();
    const failure = new Error('Consumer could not authorize this agent chat');
    const handler: ChatSDKHandlers = {
      type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
      handler: async () => {
        throw failure;
      },
    };
    await withSDK(
      async (sdk) => {
        sdk.on(handler);
        try {
          await expect(sdk.serviceDesk.startConversation()).rejects.toBe(
            failure
          );
          expect(desk.starts).toBe(0);
          expect(sdk.state.get().humanAgent.isConnecting).toBe(false);
          sdk.off(handler);
          await sdk.serviceDesk.startConversation();
          expect(desk.starts).toBe(1);
          expect(sdk.state.get().humanAgent.isConnecting).toBe(true);
        } finally {
          sdk.off(handler);
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('rejects another start while the same real agent conversation connects, joins and is suspended', async () => {
    const desk = integration();
    await withSDK(
      async (sdk) => {
        try {
          await sdk.serviceDesk.startConversation();
          expect(sdk.state.get().humanAgent.isConnecting).toBe(true);
          await expect(sdk.serviceDesk.startConversation()).rejects.toThrow(
            'already connecting, connected, or suspended'
          );
          await desk.callback.agentJoined({
            id: 'owned-agent',
            nickname: 'Owned agent',
            user_type: UserType.HUMAN,
          });
          expect(sdk.state.get().humanAgent.isConnected).toBe(true);
          await expect(sdk.serviceDesk.startConversation()).rejects.toThrow(
            'already connecting, connected, or suspended'
          );
          await sdk.serviceDesk.updateIsSuspended(true);
          await expect(sdk.serviceDesk.startConversation()).rejects.toThrow(
            'Call serviceDesk.endConversation() first'
          );
          expect(sdk.state.get().humanAgent).toMatchObject({
            isConnected: true,
            isSuspended: true,
            responseUserProfile: { id: 'owned-agent' },
          });
          expect(desk.starts).toBe(1);
          expect(desk.ends).toBe(0);
        } finally {
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });

  it('rejects a held pre-start when its SDK is removed and never starts the old desk again', async () => {
    const desk = integration();
    const entered = gate();
    const release = gate();
    await withSDK(
      async (sdk) => {
        // A completed start/end controls this exact desk call recorder.
        await sdk.serviceDesk.startConversation();
        await sdk.serviceDesk.endConversation();
        expect(desk.starts).toBe(1);
        expect(desk.ends).toBe(1);
        const hold: ChatSDKHandlers = {
          type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
          handler: async () => {
            entered.resolve();
            await release.promise;
          },
        };
        sdk.on(hold);
        const starting = sdk.serviceDesk.startConversation();
        void starting.catch((): void => undefined);
        try {
          await bounded(entered.promise, 'Removable agent pre-start');
          sdk.destroy();
          release.resolve();
          await expect(
            bounded(starting, 'Removed pending start')
          ).rejects.toThrow('The chat was removed');
          await expect(sdk.serviceDesk.startConversation()).rejects.toThrow(
            'The chat was removed'
          );
          expect(desk.starts).toBe(1);
        } finally {
          release.resolve();
          await bounded(Promise.allSettled([starting]), 'Owned start cleanup');
          sdk.off(hold);
        }
      },
      () => undefined,
      { serviceDeskFactory: desk.factory }
    );
  });
});
