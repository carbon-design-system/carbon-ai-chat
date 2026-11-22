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

import {
  BusEventType,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import { MessageState } from '../../types/config/MessagingConfig';
import {
  storedResponse,
  userDefinedResponse,
  withSDK,
} from './helpers/publicContract';

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

function gate() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('SDK awaited user-defined response', () => {
  it('awaits a real SDK response handler before receive and commits its edit before the write settles', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const release = gate();
      const trace: string[] = [];
      sdk.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: async (event: BusEventUserDefinedResponse) => {
          expect(Object.isFrozen(event.data.fullMessage)).toBe(false);
          trace.push('response:start');
          entered.resolve();
          await release.promise;
          event.data.message.user_defined.value = 'After awaited response';
          trace.push('response:end');
        },
      });
      sdk.on({
        type: BusEventType.RECEIVE,
        handler: () => {
          trace.push('receive');
        },
      });
      let settled = false;
      const work = sdk.messaging
        .upsertMessage('awaited-response', MessageState.COMPLETE, () =>
          userDefinedResponse('awaited-response')
        )
        .then(() => {
          settled = true;
          trace.push('write:settled');
        });
      void work.catch((): void => undefined);
      try {
        await bounded(entered.promise, 'Response callback entry');
        // Let an incorrectly unawaited write settle while this is the only held callback.
        await bounded(
          new Promise<void>((resolve) => {
            setImmediate(resolve);
          }),
          'Response checkpoint'
        );
        expect(trace).toEqual(['response:start']);
        expect(settled).toBe(false);
        release.resolve();
        await bounded(work, 'Response write settlement');
        expect(trace).toEqual([
          'response:start',
          'response:end',
          'receive',
          'write:settled',
        ]);
        expect(settled).toBe(true);
        expect(
          storedResponse(sdk.state.get(), 'awaited-response').output.generic[0]
            .user_defined.value
        ).toBe('After awaited response');
      } finally {
        release.resolve();
        await bounded(
          Promise.allSettled([work]),
          'Owned response write cleanup'
        );
      }
    });
  });

  it('awaits a real SDK receive handler before its native write settles', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const release = gate();
      const trace: string[] = [];
      sdk.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: () => {
          trace.push('response');
        },
      });
      sdk.on({
        type: BusEventType.RECEIVE,
        handler: async () => {
          trace.push('receive:start');
          entered.resolve();
          await release.promise;
          trace.push('receive:end');
        },
      });
      let settled = false;
      const work = sdk.messaging
        .upsertMessage('awaited-receive', MessageState.COMPLETE, () =>
          userDefinedResponse('awaited-receive')
        )
        .then(() => {
          settled = true;
          trace.push('write:settled');
        });
      void work.catch((): void => undefined);
      try {
        await bounded(entered.promise, 'Receive callback entry');
        // USER_DEFINED is synchronous here, so it cannot hide a missing RECEIVE await.
        await bounded(
          new Promise<void>((resolve) => {
            setImmediate(resolve);
          }),
          'Receive checkpoint'
        );
        expect(trace).toEqual(['response', 'receive:start']);
        expect(settled).toBe(false);
        release.resolve();
        await bounded(work, 'Receive write settlement');
        expect(trace).toEqual([
          'response',
          'receive:start',
          'receive:end',
          'write:settled',
        ]);
        expect(settled).toBe(true);
        expect(
          storedResponse(sdk.state.get(), 'awaited-receive').output.generic[0]
            .user_defined.value
        ).toBe('before');
      } finally {
        release.resolve();
        await bounded(
          Promise.allSettled([work]),
          'Owned receive write cleanup'
        );
      }
    });
  });
});
