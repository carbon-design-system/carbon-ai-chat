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

import type { ChatSDKHandle, ChatSDKState } from '../index';
import {
  CancellationReason,
  MessageState,
} from '../../types/config/MessagingConfig';
import type { MessageResponse } from '../../types/messaging/Messages';
import { bounded, deferred, gate } from './helpers/lifecycleControl';
import { textResponse, withSDK } from './helpers/publicContract';

/** The public status of the item that message `id` shows, if any. */
function itemStatus(state: ChatSDKState, id: string) {
  const item = state.messageItems.find((value) => value.messageID === id);
  return item?.status;
}

/** Runs `run` with streams `a` and `b` open, each from its own real send. */
async function withTwoStreams(
  run: (sdk: ChatSDKHandle, signals: AbortSignal[]) => Promise<void>
) {
  const signals: AbortSignal[] = [];
  await withSDK(
    async (sdk) => {
      try {
        await sdk.messaging.send('a');
        await sdk.messaging.send('b');
        expect(signals).toHaveLength(2);
        expect(signals[0]).not.toBe(signals[1]);
        expect(signals.map(({ aborted }) => aborted)).toEqual([false, false]);
        const state = sdk.state.get();
        expect(itemStatus(state, 'a')).toBe('streaming');
        expect(itemStatus(state, 'b')).toBe('streaming');
        await run(sdk, signals);
      } finally {
        await bounded(sdk.messaging.stop(), 'Owned stream cleanup');
      }
    },
    async (request, options, sdk) => {
      signals.push(options.signal);
      await sdk.messaging.upsertMessage(
        request.input.text,
        MessageState.STREAMING,
        () => ({
          ...textResponse(request.input.text, `Stream ${request.input.text}`),
          request_id: request.id,
        })
      );
    }
  );
}

describe('SDK queue and callback reentry', () => {
  it('aborts both real producers after a completion subscriber removes the sibling stream during Stop', async () => {
    await withTwoStreams(async (sdk, signals) => {
      let removal: Promise<void> = Promise.resolve();
      const abortedAtRemoval: boolean[][] = [];
      const unsubscribe = sdk.state.select(
        (state) => itemStatus(state, 'a'),
        (status) => {
          if (status === 'complete' && !abortedAtRemoval.length) {
            abortedAtRemoval.push(signals.map(({ aborted }) => aborted));
            removal = sdk.messaging.removeMessages(['b']);
          }
        }
      );
      try {
        await bounded(sdk.messaging.stop(), 'Reentrant Stop');
        // It ran inside Stop, before either captured signal aborted.
        expect(abortedAtRemoval).toEqual([[false, false]]);
        await bounded(removal, 'Sibling removal');
        expect(signals.map(({ aborted }) => aborted)).toEqual([true, true]);
        expect(signals.map(({ reason }) => reason)).toEqual([
          CancellationReason.STOP_STREAMING,
          CancellationReason.STOP_STREAMING,
        ]);
        const state = sdk.state.get();
        expect(state.messages.some(({ id }) => id === 'b')).toBe(false);
        expect(itemStatus(state, 'a')).toBe('complete');
        expect(state.status).toBe('ready');
      } finally {
        unsubscribe();
        await bounded(Promise.allSettled([removal]), 'Owned removal cleanup');
      }
    });
  });

  it('aborts both real producers and discards a write created by the first abort listener during restart', async () => {
    await withTwoStreams(async (sdk, signals) => {
      const abortOrder: number[] = [];
      const owned: Promise<void>[] = [];
      let updaterCalls = 0;
      const listeners = signals.map((signal, index) => {
        const listener = () => {
          abortOrder.push(index);
          if (index === 0) {
            owned.push(sdk.messaging.removeMessages(['b']));
            owned.push(
              sdk.messaging.upsertMessage(
                'abort-write',
                MessageState.COMPLETE,
                () => {
                  updaterCalls += 1;
                  return textResponse('abort-write', 'Obsolete abort write');
                }
              )
            );
          }
        };
        signal.addEventListener('abort', listener, { once: true });
        return listener;
      });
      try {
        await bounded(sdk.messaging.restartConversation(), 'Reentrant restart');
        await bounded(Promise.all(owned), 'Abort-listener work');
        expect([...abortOrder].sort()).toEqual([0, 1]);
        expect(signals.map(({ aborted }) => aborted)).toEqual([true, true]);
        expect(signals.map(({ reason }) => reason)).toEqual([
          CancellationReason.CONVERSATION_RESTARTED,
          CancellationReason.CONVERSATION_RESTARTED,
        ]);
        expect(updaterCalls).toBe(0);
        expect(sdk.state.get().messages).toEqual([]);
        expect(sdk.state.get().status).toBe('ready');
        await sdk.messaging.upsertMessage('fresh', MessageState.COMPLETE, () =>
          textResponse('fresh', 'Current write')
        );
        expect(sdk.state.get().messages.map(({ id }) => id)).toEqual(['fresh']);
      } finally {
        signals.forEach((signal, index) =>
          signal.removeEventListener('abort', listeners[index])
        );
        await bounded(Promise.allSettled(owned), 'Owned listener cleanup');
      }
    });
  });

  it('keeps a replacement updater tail blocked after the removed old updater rejects while another ID progresses', async () => {
    await withSDK(async (sdk) => {
      const oldEntered = gate();
      const oldResult = deferred<MessageResponse>();
      const currentEntered = gate();
      const currentResult = deferred<MessageResponse>();
      const failure = new Error('Owned removed updater failure');
      await sdk.messaging.upsertMessage('same', MessageState.COMPLETE, () =>
        textResponse('same', 'Original')
      );
      const old = sdk.messaging.upsertMessage(
        'same',
        MessageState.COMPLETE,
        () => {
          oldEntered.resolve();
          return oldResult.promise;
        }
      );
      void old.catch((): void => undefined);
      const owned: Promise<void>[] = [old];
      let tailCalls = 0;
      try {
        await bounded(oldEntered.promise, 'Old updater entry');
        await sdk.messaging.removeMessages(['same']);
        const replacement = sdk.messaging.upsertMessage(
          'same',
          MessageState.COMPLETE,
          () => {
            currentEntered.resolve();
            return currentResult.promise;
          }
        );
        void replacement.catch((): void => undefined);
        owned.push(replacement);
        await bounded(currentEntered.promise, 'Replacement updater entry');
        oldResult.reject(failure);
        await expect(bounded(old, 'Old rejection')).rejects.toBe(failure);
        const tail = sdk.messaging.upsertMessage(
          'same',
          MessageState.COMPLETE,
          () => {
            tailCalls += 1;
            return textResponse('same', 'Queued replacement tail');
          }
        );
        void tail.catch((): void => undefined);
        owned.push(tail);
        await sdk.messaging.upsertMessage(
          'independent',
          MessageState.COMPLETE,
          () => textResponse('independent', 'Independent progress')
        );
        expect(sdk.state.get().messages.map(({ id }) => id)).toEqual([
          'independent',
        ]);
        expect(tailCalls).toBe(0);
        await sdk.messaging.removeMessages(['same']);
        currentResult.resolve(textResponse('same', 'Obsolete replacement'));
        await bounded(Promise.all([replacement, tail]), 'Removed tail');
        expect(tailCalls).toBe(0);
        expect(sdk.state.get().messages.map(({ id }) => id)).toEqual([
          'independent',
        ]);
        await sdk.messaging.upsertMessage('same', MessageState.COMPLETE, () =>
          textResponse('same', 'Current replacement')
        );
        const { messages } = sdk.state.get();
        expect(messages.find(({ id }) => id === 'same')).toMatchObject({
          output: { generic: [{ text: 'Current replacement' }] },
        });
      } finally {
        oldResult.reject(failure);
        currentResult.resolve(textResponse('same', 'Cleanup result'));
        await bounded(Promise.allSettled(owned), 'Owned updater cleanup');
      }
    });
  });
});
