/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EventBus } from '../../../src/chat/events/EventBus';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  BusEvent,
  BusEventType,
} from '../../../src/types/events/eventBusTypes';

const instance = {} as ChatInstance;

const event = (type: BusEventType, label: string) =>
  ({ type, data: label }) as unknown as BusEvent;

/**
 * A promise the test settles by hand, so a handler can be held open while later fires queue behind it.
 */
const deferred = () => {
  let resolve: () => void;
  let reject: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('EventBus.fire', () => {
  it('runs overlapping fires of one type one at a time, in call order', async () => {
    const bus = new EventBus();
    const log: string[] = [];
    const gate = deferred();
    bus.on({
      type: BusEventType.PRE_RECEIVE,
      handler: async (busEvent: any) => {
        log.push(`start ${busEvent.data}`);
        if (busEvent.data === 'first') {
          await gate.promise;
        }
        log.push(`end ${busEvent.data}`);
      },
    });

    const fires = [
      bus.fire(event(BusEventType.PRE_RECEIVE, 'first'), instance),
      bus.fire(event(BusEventType.PRE_RECEIVE, 'second'), instance),
      bus.fire(event(BusEventType.PRE_RECEIVE, 'third'), instance),
    ];
    await Promise.resolve();
    expect(log).toEqual(['start first']);

    gate.resolve();
    await Promise.all(fires);

    expect(log).toEqual([
      'start first',
      'end first',
      'start second',
      'end second',
      'start third',
      'end third',
    ]);
  });

  it('lets two unawaited fires with a synchronous handler both run', async () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on({
      type: BusEventType.PRE_RECEIVE,
      handler: (busEvent: any) => {
        seen.push(busEvent.data);
      },
    });

    const first = bus.fire(event(BusEventType.PRE_RECEIVE, 'echo'), instance);
    const second = bus.fire(event(BusEventType.PRE_RECEIVE, 'reply'), instance);

    await expect(Promise.all([first, second])).resolves.toBeDefined();
    expect(seen).toEqual(['echo', 'reply']);
  });

  it('rejects only the fire whose handler threw and still runs the next one', async () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on({
      type: BusEventType.PRE_RECEIVE,
      handler: async (busEvent: any) => {
        if (busEvent.data === 'bad') {
          throw new Error('handler failed');
        }
        seen.push(busEvent.data);
      },
    });

    const bad = bus.fire(event(BusEventType.PRE_RECEIVE, 'bad'), instance);
    const good = bus.fire(event(BusEventType.PRE_RECEIVE, 'good'), instance);

    await expect(bad).rejects.toThrow('handler failed');
    await expect(good).resolves.toBeUndefined();
    expect(seen).toEqual(['good']);
  });

  it('does not make a fire of one type wait on a fire of another type', async () => {
    const bus = new EventBus();
    const gate = deferred();
    const seen: string[] = [];
    bus.on({
      type: BusEventType.PRE_RECEIVE,
      handler: () => gate.promise,
    });
    bus.on({
      type: BusEventType.RECEIVE,
      handler: (busEvent: any) => {
        seen.push(busEvent.data);
      },
    });

    const held = bus.fire(event(BusEventType.PRE_RECEIVE, 'held'), instance);
    await bus.fire(event(BusEventType.RECEIVE, 'free'), instance);

    expect(seen).toEqual(['free']);
    gate.resolve();
    await held;
  });

  it('starts the handlers synchronously when nothing of that type is running', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on({ type: BusEventType.PRE_RECEIVE, handler });

    bus.fire(event(BusEventType.PRE_RECEIVE, 'now'), instance);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('starts the handlers synchronously right after an earlier fire of that type finished', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on({ type: BusEventType.PRE_RECEIVE, handler });
    await bus.fire(event(BusEventType.PRE_RECEIVE, 'earlier'), instance);

    bus.fire(event(BusEventType.PRE_RECEIVE, 'now'), instance);

    expect(handler).toHaveBeenCalledTimes(2);
  });

  describe('when an earlier fire never finishes', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects the waiting fire after 10 seconds and runs the ones behind it', async () => {
      const bus = new EventBus();
      const seen: string[] = [];
      bus.on({
        type: BusEventType.PRE_RECEIVE,
        handler: (busEvent: any) => {
          if (busEvent.data === 'stuck') {
            return new Promise<void>(() => undefined);
          }
          seen.push(busEvent.data);
          return undefined;
        },
      });

      bus.fire(event(BusEventType.PRE_RECEIVE, 'stuck'), instance);
      const waiting = bus.fire(
        event(BusEventType.PRE_RECEIVE, 'waiting'),
        instance
      );
      const behind = bus.fire(
        event(BusEventType.PRE_RECEIVE, 'behind'),
        instance
      );
      const waitingResult = waiting.then(
        () => 'resolved',
        (error: Error) => error.message
      );

      await jest.advanceTimersByTimeAsync(9_999);
      expect(seen).toEqual([]);

      await jest.advanceTimersByTimeAsync(1);
      expect(await waitingResult).toContain(
        `earlier ${BusEventType.PRE_RECEIVE} event that had not finished`
      );
      await behind;
      expect(seen).toEqual(['behind']);
    });

    it('recovers from a handler that waits on a fire of its own type', async () => {
      const bus = new EventBus();
      const seen: string[] = [];
      bus.on({
        type: BusEventType.RECEIVE,
        handler: async (busEvent: any) => {
          if (busEvent.data === 'outer') {
            // `addMessage` awaits pre:receive before it fires receive, so the inner fire lands after a tick.
            await Promise.resolve();
            await bus.fire(event(BusEventType.RECEIVE, 'inner'), instance);
          }
          seen.push(busEvent.data);
        },
      });

      const outer = bus.fire(event(BusEventType.RECEIVE, 'outer'), instance);
      const outerResult = outer.then(
        () => 'resolved',
        () => 'rejected'
      );

      await jest.advanceTimersByTimeAsync(10_000);

      expect(await outerResult).toBe('rejected');
      await bus.fire(event(BusEventType.RECEIVE, 'after'), instance);
      expect(seen).toEqual(['after']);
    });

    it('does not reject a fire whose predecessor settles in time', async () => {
      const bus = new EventBus();
      const gate = deferred();
      bus.on({
        type: BusEventType.PRE_RECEIVE,
        handler: (busEvent: any) =>
          busEvent.data === 'first' ? gate.promise : undefined,
      });

      const first = bus.fire(
        event(BusEventType.PRE_RECEIVE, 'first'),
        instance
      );
      const second = bus.fire(
        event(BusEventType.PRE_RECEIVE, 'second'),
        instance
      );
      await jest.advanceTimersByTimeAsync(5_000);
      gate.resolve();

      await expect(Promise.all([first, second])).resolves.toBeDefined();
      await jest.advanceTimersByTimeAsync(20_000);
    });
  });

  it('makes waitForEmpty wait for fires still queued', async () => {
    const bus = new EventBus();
    const gate = deferred();
    const seen: string[] = [];
    bus.on({
      type: BusEventType.PRE_RECEIVE,
      handler: async (busEvent: any) => {
        if (busEvent.data === 'first') {
          await gate.promise;
        }
        seen.push(busEvent.data);
      },
    });

    bus.fire(event(BusEventType.PRE_RECEIVE, 'first'), instance);
    bus.fire(event(BusEventType.PRE_RECEIVE, 'second'), instance);
    const empty = bus.waitForEmpty();
    gate.resolve();
    await empty;

    expect(seen).toEqual(['first', 'second']);
  });
});
