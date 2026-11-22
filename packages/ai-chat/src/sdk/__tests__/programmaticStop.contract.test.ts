/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKConfig, ChatSDKHandlers } from '../index';
import { CancellationReason } from '../../types/config/MessagingConfig';
import { BusEventType } from '../../types/events/eventBusTypes';
import { withSDK } from './helpers/publicContract';

type Send = NonNullable<
  NonNullable<ChatSDKConfig['messaging']>['customSendMessage']
>;

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

function watch<T>(work: Promise<T>): Promise<T> {
  void work.catch((): void => undefined);
  return work;
}

function twoTurns() {
  const entered = [gate(), gate()];
  const finish = [gate(), gate()];
  const signals: AbortSignal[] = [];
  const texts: string[] = [];
  const work: Promise<void>[] = [];
  const send: Send = (request, options) => {
    const index = signals.length;
    if (index >= 2) {
      throw new Error('Unexpected third transport');
    }
    signals.push(options.signal);
    texts.push(request.input.text);
    work.push(finish[index].promise);
    entered[index].resolve();
    return finish[index].promise;
  };
  return { send, entered, finish, signals, texts, work };
}

describe('SDK programmatic Stop ownership', () => {
  it('still aborts and settles a submitted turn when its Stop handler throws', async () => {
    const transport = twoTurns();
    await withSDK(async (sdk) => {
      const failure = new Error('Owned Stop handler failure');
      let handlerCalls = 0;
      const handler: ChatSDKHandlers = {
        type: BusEventType.STOP_STREAMING,
        handler: () => {
          handlerCalls += 1;
          throw failure;
        },
      };
      sdk.on(handler);
      const sending = watch(sdk.messaging.send('Stop despite the handler'));
      let stopping: Promise<void>;
      try {
        await bounded(transport.entered[0].promise, 'First transport entry');
        expect(sdk.state.get().status).toBe('submitted');
        expect(transport.signals[0].aborted).toBe(false);
        stopping = watch(sdk.messaging.stop());
        await expect(
          bounded(stopping, 'Throwing-handler Stop')
        ).resolves.toBeUndefined();
        expect(handlerCalls).toBe(1);
        expect(transport.signals[0].aborted).toBe(true);
        expect(transport.signals[0].reason).toBe(
          CancellationReason.STOP_STREAMING
        );
        expect(sdk.state.get().status).toBe('ready');
        await bounded(sending, 'Stopped send');
      } finally {
        transport.finish.forEach((held) => held.resolve());
        try {
          await bounded(
            Promise.allSettled([sending, stopping, ...transport.work]),
            'Owned Stop cleanup'
          );
        } finally {
          sdk.off(handler);
        }
      }
    }, transport.send);
  });

  it('starts the queued turn before the stopped transport returns', async () => {
    const transport = twoTurns();
    await withSDK(async (sdk) => {
      const first = watch(sdk.messaging.send('Submitted first turn'));
      let second: Promise<void>;
      let stopping: Promise<void>;
      try {
        await bounded(transport.entered[0].promise, 'First transport entry');
        second = watch(sdk.messaging.send('Queued second turn'));
        expect(transport.texts).toEqual(['Submitted first turn']);
        expect(sdk.state.get().status).toBe('submitted');
        stopping = watch(sdk.messaging.stop());
        await bounded(stopping, 'Submitted-turn Stop');
        await bounded(transport.entered[1].promise, 'Queued transport entry');
        await bounded(first, 'Stopped first send');
        expect(transport.texts).toEqual([
          'Submitted first turn',
          'Queued second turn',
        ]);
        expect(transport.signals.map((signal) => signal.aborted)).toEqual([
          true,
          false,
        ]);
        expect(sdk.state.get().status).toBe('submitted');
        transport.finish[1].resolve();
        await bounded(second, 'Second send');
        expect(sdk.state.get().status).toBe('ready');
      } finally {
        transport.finish.forEach((held) => held.resolve());
        await bounded(
          Promise.allSettled([first, second, stopping, ...transport.work]),
          'Owned queue cleanup'
        );
      }
    }, transport.send);
  });

  it('leaves the next turn running when its handler finishes the original turn', async () => {
    const transport = twoTurns();
    await withSDK(async (sdk) => {
      let handlerCalls = 0;
      const handler: ChatSDKHandlers = {
        type: BusEventType.STOP_STREAMING,
        handler: async () => {
          handlerCalls += 1;
          transport.finish[0].resolve();
          await bounded(
            transport.entered[1].promise,
            'Handler-driven next turn'
          );
        },
      };
      sdk.on(handler);
      const first = watch(sdk.messaging.send('Handler finishes this turn'));
      let second: Promise<void>;
      let stopping: Promise<void>;
      try {
        await bounded(transport.entered[0].promise, 'First transport entry');
        second = watch(sdk.messaging.send('Keep this next turn running'));
        expect(transport.texts).toEqual(['Handler finishes this turn']);
        stopping = watch(sdk.messaging.stop());
        await bounded(stopping, 'Reentrant-target Stop');
        await bounded(first, 'Normally finished first send');
        expect(handlerCalls).toBe(1);
        expect(transport.texts).toEqual([
          'Handler finishes this turn',
          'Keep this next turn running',
        ]);
        expect(transport.signals.map((signal) => signal.aborted)).toEqual([
          false,
          false,
        ]);
        expect(sdk.state.get().status).toBe('submitted');
        transport.finish[1].resolve();
        await bounded(second, 'Second send');
        expect(sdk.state.get().status).toBe('ready');
      } finally {
        transport.finish.forEach((held) => held.resolve());
        try {
          await bounded(
            Promise.allSettled([first, second, stopping, ...transport.work]),
            'Owned reentrant cleanup'
          );
        } finally {
          sdk.off(handler);
        }
      }
    }, transport.send);
  });

  it('shares one held Stop handler across overlapping public calls', async () => {
    const transport = twoTurns();
    const stopEntered = gate();
    const releaseStop = gate();
    await withSDK(async (sdk) => {
      let handlerCalls = 0;
      const handler: ChatSDKHandlers = {
        type: BusEventType.STOP_STREAMING,
        handler: async () => {
          handlerCalls += 1;
          stopEntered.resolve();
          await releaseStop.promise;
        },
      };
      sdk.on(handler);
      const sending = watch(sdk.messaging.send('Share this Stop'));
      let first: Promise<void>;
      let second: Promise<void>;
      try {
        await bounded(transport.entered[0].promise, 'First transport entry');
        first = watch(sdk.messaging.stop());
        await bounded(stopEntered.promise, 'Stop handler entry');
        second = watch(sdk.messaging.stop());
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(handlerCalls).toBe(1);
        expect(transport.signals[0].aborted).toBe(false);
        expect(sdk.state.get().status).toBe('submitted');
        releaseStop.resolve();
        await bounded(Promise.all([first, second]), 'Overlapping Stops');
        expect(handlerCalls).toBe(1);
        expect(transport.signals[0].aborted).toBe(true);
        expect(transport.signals[0].reason).toBe(
          CancellationReason.STOP_STREAMING
        );
        expect(sdk.state.get().status).toBe('ready');
        await bounded(sending, 'Stopped send');
      } finally {
        releaseStop.resolve();
        transport.finish.forEach((held) => held.resolve());
        try {
          await bounded(
            Promise.allSettled([sending, first, second, ...transport.work]),
            'Owned overlap cleanup'
          );
        } finally {
          sdk.off(handler);
        }
      }
    }, transport.send);
  });
});
