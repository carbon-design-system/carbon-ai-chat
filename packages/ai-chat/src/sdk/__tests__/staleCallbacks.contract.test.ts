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

import type { ChatSDKHandlers } from '../index';
import {
  BusEventType,
  type BusEventReceive,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import { MessageState } from '../../types/config/MessagingConfig';
import {
  textResponse,
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

describe('SDK stale user-defined callbacks', () => {
  it('does not restore a response whose callback returns after a completed restart', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const release = gate();
      const receives: string[] = [];
      const response: ChatSDKHandlers = {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: async (event: BusEventUserDefinedResponse) => {
          entered.resolve();
          await release.promise;
          event.data.message.user_defined.value = 'Late response edit';
        },
      };
      const receive: ChatSDKHandlers = {
        type: BusEventType.RECEIVE,
        handler: (event: BusEventReceive) => {
          receives.push(event.data.id);
        },
      };
      sdk.on([response, receive]);
      let settled = false;
      const pending = sdk.messaging
        .upsertMessage('held-restart', MessageState.COMPLETE, () =>
          userDefinedResponse('held-restart')
        )
        .then(() => {
          settled = true;
        });
      void pending.catch((): void => undefined);
      const owned: Promise<unknown>[] = [pending];
      try {
        await bounded(entered.promise, 'Response callback entry');
        expect(settled).toBe(false);
        expect(
          sdk.state.get().messages.find(({ id }) => id === 'held-restart')
        ).toMatchObject({
          output: { generic: [{ user_defined: { value: 'before' } }] },
        });
        const restart = sdk.messaging.restartConversation();
        owned.push(restart);
        await bounded(restart, 'Completed public restart');
        expect(
          sdk.state.get().messages.some(({ id }) => id === 'held-restart')
        ).toBe(false);
        const current = sdk.messaging.upsertMessage(
          'current-response',
          MessageState.COMPLETE,
          () => textResponse('current-response', 'Current generation text')
        );
        owned.push(current);
        await bounded(current, 'Current text barrier');
        release.resolve();
        await bounded(pending, 'Stale callback settlement');
        expect(settled).toBe(true);
        expect(
          sdk.state.get().messages.some(({ id }) => id === 'held-restart')
        ).toBe(false);
        expect(
          sdk.state.get().messages.find(({ id }) => id === 'current-response')
        ).toMatchObject({
          output: { generic: [{ text: 'Current generation text' }] },
        });
        expect(receives).toEqual(['current-response']);
      } finally {
        release.resolve();
        try {
          await bounded(Promise.allSettled(owned), 'Owned response cleanup');
        } finally {
          sdk.off([response, receive]);
        }
      }
    });
  });

  it('keeps a same-ID replacement when its removed response callback returns late', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const release = gate();
      const receives: string[] = [];
      const response: ChatSDKHandlers = {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: async (event: BusEventUserDefinedResponse) => {
          entered.resolve();
          await release.promise;
          event.data.message.user_defined.value = 'Late removed edit';
        },
      };
      const receive: ChatSDKHandlers = {
        type: BusEventType.RECEIVE,
        handler: (event: BusEventReceive) => {
          receives.push(event.data.id);
        },
      };
      sdk.on([response, receive]);
      let settled = false;
      const pending = sdk.messaging
        .upsertMessage('replaced-response', MessageState.COMPLETE, () =>
          userDefinedResponse('replaced-response')
        )
        .then(() => {
          settled = true;
        });
      void pending.catch((): void => undefined);
      const owned: Promise<unknown>[] = [pending];
      try {
        await bounded(entered.promise, 'Removed callback entry');
        expect(settled).toBe(false);
        const removal = sdk.messaging.removeMessages(['replaced-response']);
        owned.push(removal);
        await bounded(removal, 'Public message removal');
        expect(
          sdk.state.get().messages.some(({ id }) => id === 'replaced-response')
        ).toBe(false);
        const replacement = sdk.messaging.upsertMessage(
          'replaced-response',
          MessageState.COMPLETE,
          () => textResponse('replaced-response', 'Replacement survives')
        );
        owned.push(replacement);
        await bounded(replacement, 'Same-ID text replacement');
        expect(settled).toBe(false);
        expect(
          sdk.state.get().messages.find(({ id }) => id === 'replaced-response')
        ).toMatchObject({
          output: { generic: [{ text: 'Replacement survives' }] },
        });
        release.resolve();
        await bounded(pending, 'Removed callback settlement');
        expect(settled).toBe(true);
        expect(
          sdk.state
            .get()
            .messages.filter(({ id }) => id === 'replaced-response')
        ).toMatchObject([
          { output: { generic: [{ text: 'Replacement survives' }] } },
        ]);
        expect(receives).toEqual(['replaced-response']);
      } finally {
        release.resolve();
        try {
          await bounded(Promise.allSettled(owned), 'Owned replacement cleanup');
        } finally {
          sdk.off([response, receive]);
        }
      }
    });
  });
});
