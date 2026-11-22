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

import { MessageState } from '../../types/config/MessagingConfig';
import {
  BusEventType,
  type BusEventPreReceive,
} from '../../types/events/eventBusTypes';
import {
  storedResponse,
  textResponse,
  texts,
  withSDK,
} from './helpers/publicContract';
import {
  bounded,
  controlTimeouts,
  gate,
  nextTurn,
} from './helpers/lifecycleControl';

const QUEUE_TIMEOUT_MESSAGE = `earlier ${BusEventType.PRE_RECEIVE} event that had not finished`;

describe('SDK public event handlers', () => {
  it('settles an earlier async handler before starting the next handler of the same event', async () => {
    await withSDK(async (sdk) => {
      const order: string[] = [];
      sdk.on([
        {
          type: BusEventType.RECEIVE,
          handler: async () => {
            order.push('first start');
            await Promise.resolve();
            order.push('first end');
          },
        },
        {
          type: BusEventType.RECEIVE,
          handler: () => {
            order.push('second');
          },
        },
      ]);
      await sdk.messaging.upsertMessage('ordered', MessageState.COMPLETE, () =>
        textResponse('ordered', 'Ordered')
      );
      expect(order).toEqual(['first start', 'first end', 'second']);
    });
  });

  it('rejects only the write whose pre:receive handler threw, and still lands the write queued behind it', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const release = gate();
      const failure = new Error('Host pre:receive handler failed');
      const seen: string[] = [];
      const handler = {
        type: BusEventType.PRE_RECEIVE as const,
        handler: async (event: BusEventPreReceive): Promise<void> => {
          seen.push(String(event.data.id));
          if (event.data.id === 'bad') {
            entered.resolve();
            await release.promise;
            throw failure;
          }
        },
      };
      sdk.on(handler);
      let bad: Promise<unknown> = Promise.resolve();
      let good: Promise<unknown> = Promise.resolve();
      try {
        bad = sdk.messaging
          .upsertMessage('bad', MessageState.COMPLETE, () =>
            textResponse('bad', 'Rejected reply')
          )
          .then(
            () => 'resolved',
            (error: unknown) => error
          );
        await bounded(entered.promise, 'Throwing pre:receive entry');
        good = sdk.messaging
          .upsertMessage('good', MessageState.COMPLETE, () =>
            textResponse('good', 'Queued reply')
          )
          .then(
            () => 'resolved',
            (error: unknown) => error
          );
        await nextTurn();
        // The second write is queued behind the held one, not yet run.
        expect(seen).toEqual(['bad']);
        release.resolve();
        expect(await bounded(bad, 'Rejected write')).toBe(failure);
        expect(await bounded(good, 'Queued write')).toBe('resolved');
        expect(seen).toEqual(['bad', 'good']);
        const state = sdk.state.get();
        expect(texts(storedResponse(state, 'good'))).toEqual(['Queued reply']);
        expect(storedResponse(state, 'bad')).toBeUndefined();
      } finally {
        release.resolve();
        await bounded(Promise.allSettled([bad, good]), 'Owned write cleanup');
        sdk.off(handler);
      }
    });
  });

  it('rejects, after 10 seconds, a write queued behind a pre:receive handler that never settles, and runs the write queued behind it', async () => {
    await withSDK(async (sdk) => {
      const stuck = gate();
      const seen: string[] = [];
      const handler = {
        type: BusEventType.PRE_RECEIVE as const,
        handler: (event: BusEventPreReceive): Promise<void> | undefined => {
          seen.push(String(event.data.id));
          return event.data.id === 'stuck' ? stuck.promise : undefined;
        },
      };
      sdk.on(handler);
      let stuckWrite: Promise<unknown> = Promise.resolve();
      let waiting: Promise<unknown> = Promise.resolve();
      let behind: Promise<unknown> = Promise.resolve();
      let waitingSettled = false;
      controlTimeouts();
      try {
        stuckWrite = sdk.messaging
          .upsertMessage('stuck', MessageState.COMPLETE, () =>
            textResponse('stuck', 'Stuck reply')
          )
          .then(
            () => 'resolved',
            (error: unknown) => error
          );
        await nextTurn();
        expect(seen).toEqual(['stuck']);
        waiting = sdk.messaging
          .upsertMessage('waiting', MessageState.COMPLETE, () =>
            textResponse('waiting', 'Waiting reply')
          )
          .then(
            () => 'resolved',
            (error: unknown) => error
          )
          .finally(() => {
            waitingSettled = true;
          });
        // Each queued fire starts its 10 second wait at the current time.
        await nextTurn();
        await vi.advanceTimersByTimeAsync(1);
        behind = sdk.messaging
          .upsertMessage('behind', MessageState.COMPLETE, () =>
            textResponse('behind', 'Behind reply')
          )
          .then(
            () => 'resolved',
            (error: unknown) => error
          );
        await nextTurn();
        await vi.advanceTimersByTimeAsync(9_998);
        expect(waitingSettled).toBe(false);
        expect(seen).toEqual(['stuck']);
        await vi.advanceTimersByTimeAsync(1);
        const outcome = await bounded(waiting, 'Timed-out write');
        expect(outcome).toBeInstanceOf(Error);
        expect((outcome as Error).message).toContain(QUEUE_TIMEOUT_MESSAGE);
        expect(await bounded(behind, 'Write behind the timed-out one')).toBe(
          'resolved'
        );
        expect(seen).toEqual(['stuck', 'behind']);
        const state = sdk.state.get();
        expect(texts(storedResponse(state, 'behind'))).toEqual([
          'Behind reply',
        ]);
        expect(storedResponse(state, 'waiting')).toBeUndefined();
      } finally {
        stuck.resolve();
        vi.useRealTimers();
        await bounded(
          Promise.allSettled([stuckWrite, waiting, behind]),
          'Owned write cleanup'
        );
        sdk.off(handler);
      }
    });
  });

  it('rejects a write a pre:receive handler waits on after 10 seconds, then runs the next write at once', async () => {
    await withSDK(async (sdk) => {
      const seen: string[] = [];
      let inner: Promise<unknown> | undefined;
      let innerSettled = false;
      const handler = {
        type: BusEventType.PRE_RECEIVE as const,
        handler: (event: BusEventPreReceive): Promise<void> | undefined => {
          seen.push(String(event.data.id));
          if (event.data.id !== 'outer') {
            return undefined;
          }
          // A deadlock: this write's pre:receive waits behind this handler.
          inner = sdk.messaging
            .upsertMessage('inner', MessageState.COMPLETE, () =>
              textResponse('inner', 'Inner reply')
            )
            .then(
              () => 'resolved',
              (error: unknown) => error
            )
            .finally(() => {
              innerSettled = true;
            });
          return inner.then((): void => undefined);
        },
      };
      sdk.on(handler);
      let outer: Promise<unknown> = Promise.resolve();
      controlTimeouts();
      try {
        outer = sdk.messaging
          .upsertMessage('outer', MessageState.COMPLETE, () =>
            textResponse('outer', 'Outer reply')
          )
          .then(
            () => 'resolved',
            (error: unknown) => error
          );
        await nextTurn();
        await vi.advanceTimersByTimeAsync(9_999);
        expect(inner).toBeDefined();
        expect(innerSettled).toBe(false);
        expect(seen).toEqual(['outer']);
        await vi.advanceTimersByTimeAsync(1);
        const outcome = await bounded(inner, 'Deadlocked inner write');
        expect(outcome).toBeInstanceOf(Error);
        expect((outcome as Error).message).toContain(QUEUE_TIMEOUT_MESSAGE);
        expect(await bounded(outer, 'Outer write')).toBe('resolved');
        // Real timers: a queue still waiting would take another 10 seconds.
        vi.useRealTimers();
        await bounded(
          sdk.messaging.upsertMessage('after', MessageState.COMPLETE, () =>
            textResponse('after', 'After reply')
          ),
          'Write after the deadlock'
        );
        expect(seen).toEqual(['outer', 'after']);
        const state = sdk.state.get();
        expect(texts(storedResponse(state, 'outer'))).toEqual(['Outer reply']);
        expect(texts(storedResponse(state, 'after'))).toEqual(['After reply']);
        expect(storedResponse(state, 'inner')).toBeUndefined();
      } finally {
        vi.useRealTimers();
        await bounded(
          Promise.allSettled([outer, inner]),
          'Owned deadlock cleanup'
        );
        sdk.off(handler);
      }
    });
  });
});
