/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import {
  MessageResponseTypes,
  MessageState,
  type MessageResponse,
  type ServiceDesk,
} from '../../../aiChatEntry';
import { contractChat, contractSetup, deferred } from '../helpers/contract';

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

function response(note: string): MessageResponse {
  return {
    id: 'availability-race',
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
          streaming_metadata: { id: 'agent' },
          message_to_human_agent: note,
        },
      ],
    },
  };
}

describe('public retained availability', () => {
  contractSetup();

  it('retains a newly answered offline result when a pending updater replaces a legacy response', async () => {
    const availability = deferred<boolean>();
    const availabilityEntered = deferred();
    const updaterGate = deferred();
    const updaterEntered = deferred();
    const offlineObserved = deferred();
    let checks = 0;
    const desk: ServiceDesk = {
      getName: () => 'Availability race desk',
      startChat: async () => undefined,
      endChat: async () => undefined,
      sendMessageToAgent: async () => undefined,
      areAnyAgentsOnline: async () => {
        checks += 1;
        availabilityEntered.resolve();
        return availability.promise;
      },
    };
    const mount = await contractChat({
      namespace: 'public-availability-race',
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      serviceDeskFactory: async () => desk,
    });
    const entry = () =>
      mount.instance.state
        .get()
        .messageItems?.find((item) => item.messageID === 'availability-race');
    const unsubscribe = mount.instance.state.subscribe(() => {
      if (entry()?.humanAgent?.onlineStatus === 'offline') {
        offlineObserved.resolve();
      }
    });
    let legacyReceipt = Promise.resolve();
    let nativeWrite = Promise.resolve();
    try {
      await act(async () => {
        legacyReceipt = mount.instance.messaging.addMessage(
          response('Initial snapshot')
        );
        void legacyReceipt.catch((): void => undefined);
      });
      await bounded(availabilityEntered.promise, 'Legacy availability entry');
      await bounded(
        legacyReceipt,
        'Legacy receipt before availability answers'
      );
      await act(async () => {
        nativeWrite = mount.instance.messaging.upsertMessage(
          'availability-race',
          MessageState.STREAMING,
          async () => {
            updaterEntered.resolve();
            await updaterGate.promise;
            return response('Later snapshot');
          }
        );
        void nativeWrite.catch((): void => undefined);
      });
      await bounded(updaterEntered.promise, 'Native updater entry');
      await act(async () => availability.resolve(false));
      await bounded(
        offlineObserved.promise,
        'Offline result before replacement'
      );
      expect(entry()?.humanAgent?.onlineStatus).toBe('offline');
      await act(async () => {
        updaterGate.resolve();
        await bounded(nativeWrite, 'Native replacement');
      });
      expect(entry()?.item).toMatchObject({
        message_to_human_agent: 'Later snapshot',
      });
      expect(entry()?.humanAgent?.onlineStatus).toBe('offline');
      expect(checks).toBe(1);
    } finally {
      availability.resolve(false);
      updaterGate.resolve();
      try {
        await bounded(
          Promise.allSettled([legacyReceipt, nativeWrite]),
          'Owned operation cleanup'
        );
      } finally {
        unsubscribe();
        await act(async () => mount.unmount());
      }
    }
  });
});
