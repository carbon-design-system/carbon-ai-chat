/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig, ChatSDKHandlers } from '../index';
import type { ServiceDesk } from '../../types/config/ServiceDeskConfig';
import {
  BusEventType,
  type BusEventHumanAgentEndChat,
  type BusEventHumanAgentPreStartChat,
} from '../../types/events/eventBusTypes';
import { withSDK } from './helpers/publicContract';

function gate() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

function integration(name: string) {
  const loaded = gate();
  let factories = 0;
  const starts: string[] = [];
  const factory: NonNullable<
    ChatSDKConfig['serviceDeskFactory']
  > = async () => {
    factories += 1;
    const desk: ServiceDesk = {
      getName: () => name,
      startChat: async () => {
        starts.push(name);
      },
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
    };
    loaded.resolve();
    return desk;
  };
  return {
    factory,
    loaded: loaded.promise,
    starts,
    get factories() {
      return factories;
    },
  };
}

describe('SDK runtime service-desk config', () => {
  it('defers a factory swap until a held pre-start is cancelled, then uses the new desk', async () => {
    const first = integration('First desk');
    const second = integration('Second desk');
    const entered = gate();
    const release = gate();
    await withSDK(
      async (sdk) => {
        const preStart: ChatSDKHandlers = {
          type: BusEventType.HUMAN_AGENT_PRE_START_CHAT,
          handler: async (event: BusEventHumanAgentPreStartChat) => {
            entered.resolve();
            await release.promise;
            event.cancel = true;
          },
        };
        sdk.on(preStart);
        let starting = Promise.resolve();
        try {
          starting = sdk.serviceDesk.startConversation();
          void starting.catch((): void => undefined);
          await bounded(entered.promise, 'Pre-start entry');
          expect(sdk.state.get().humanAgent.isConnecting).toBe(false);
          await sdk.updateConfig({ serviceDeskFactory: second.factory });
          expect(second.factories).toBe(0);
          const factoriesAtEnd: number[] = [];
          sdk.on({
            type: BusEventType.HUMAN_AGENT_END_CHAT,
            handler: (event: BusEventHumanAgentEndChat) => {
              if (event.requestCancelled) {
                factoriesAtEnd.push(second.factories);
              }
            },
          });
          release.resolve();
          await bounded(starting, 'Cancelled start');
          await bounded(second.loaded, 'Replacement factory');
          expect(factoriesAtEnd).toEqual([1]);
          expect(first.starts).toEqual([]);
          sdk.off(preStart);
          await sdk.serviceDesk.startConversation();
          expect(second.starts).toEqual(['Second desk']);
        } finally {
          release.resolve();
          await bounded(Promise.allSettled([starting]), 'Owned start cleanup');
          sdk.off(preStart);
          await sdk.serviceDesk.endConversation();
        }
      },
      () => undefined,
      { serviceDeskFactory: first.factory }
    );
  });
});
