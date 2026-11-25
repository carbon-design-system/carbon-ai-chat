/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import {
  BusEventType,
  CancellationReason,
  OnErrorType,
  type BusEventPreSend,
  type MessageRequest,
  type OnErrorData,
} from '../../../aiChatEntry';
import {
  SEND_ERROR_MESSAGE,
  advance,
  contractChat,
  contractSetup,
  countChatReady,
  deferred,
  fakeBackend,
} from '../helpers/contract';

// Kept from before any test fakes timers, so a bounded wait stays real.
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

/** Fakes only `setTimeout`, which owns the message timeout. */
function controlTimeouts(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

describe('public send failure attribution', () => {
  contractSetup();

  it('reports one send error for a welcome request a pre:send handler renames, linked to the renamed request', async () => {
    const ready = countChatReady();
    const backend = fakeBackend();
    const errors: OnErrorData[] = [];
    let originalID: string;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mount = await contractChat({
      openChatByDefault: true,
      onError: (error): void => {
        errors.push(error);
      },
      messaging: { customSendMessage: backend.customSendMessage },
      onBeforeRender: (instance) => {
        ready.onBeforeRender(instance);
        instance.on({
          type: BusEventType.PRE_SEND,
          handler: (event: BusEventPreSend) => {
            originalID = event.data.id;
            event.data.id = 'renamed-welcome';
          },
        });
      },
    });
    try {
      const sent = await backend.next();
      expect(sent.request.history?.is_welcome_request).toBe(true);
      expect(sent.request.id).toBe('renamed-welcome');
      expect(originalID).not.toBe('renamed-welcome');
      await act(async () => {
        sent.reject('welcome failed');
      });
      // chat:ready fires after loading settles, so a second error from loading would show by now.
      await waitFor(() => expect(ready.count()).toBe(1));
      expect(errors).toEqual([
        {
          errorType: OnErrorType.MESSAGE_COMMUNICATION,
          message: SEND_ERROR_MESSAGE,
          otherData: 'welcome failed',
          messageID: 'renamed-welcome',
        },
      ]);
      expect(mount.instance.state.get().error).toEqual(errors[0]);
      expect(mount.instance.state.get().status).toBe('error');
      expect(backend.requests).toHaveLength(1);
    } finally {
      log.mockRestore();
      await act(async () => mount.unmount());
    }
  });

  it.each(['resolves', 'rejects'] as const)(
    'keeps the timeout outcome when the transport %s on its abort signal, then starts the queued send',
    async (settlement) => {
      const entered = [deferred<MessageRequest>(), deferred<MessageRequest>()];
      const finishNext = deferred();
      const signals: AbortSignal[] = [];
      const errors: OnErrorData[] = [];
      const mount = await contractChat({
        openChatByDefault: true,
        onError: (error): void => {
          errors.push(error);
        },
        messaging: {
          skipWelcome: true,
          messageTimeoutSecs: 2,
          customSendMessage: (request, { signal }) => {
            const index = signals.length;
            signals.push(signal);
            entered[index].resolve(request);
            if (index > 0) {
              return finishNext.promise;
            }
            // The host settles its own transport as soon as the chat aborts it.
            return new Promise<void>((resolve, reject) => {
              signal.addEventListener('abort', () => {
                if (settlement === 'resolves') {
                  resolve();
                } else {
                  reject(new Error('Transport closed on abort'));
                }
              });
            });
          },
        },
      });
      await waitFor(() =>
        expect(mount.instance.state.get().status).toBe('ready')
      );
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const seen: unknown[] = [];
      let stopWatching = (): void => undefined;
      let first: Promise<void>;
      let next: Promise<void>;
      try {
        controlTimeouts();
        await act(async () => {
          first = mount.instance.send('Times out');
          void first.catch((): void => undefined);
        });
        const outcome = first.then(
          (): Error | undefined => undefined,
          (error: Error) => error
        );
        let request: MessageRequest;
        await act(async () => {
          request = await bounded(entered[0].promise, 'Timed transport');
        });
        await act(async () => {
          next = mount.instance.send('Waits behind it');
          void next.catch((): void => undefined);
        });

        await advance(1999);
        expect(signals[0].aborted).toBe(false);
        expect(signals).toHaveLength(1);
        expect(errors).toEqual([]);
        // The queued send clears the error at once, so read what subscribers saw.
        stopWatching = mount.instance.state.subscribe(() => {
          seen.push(mount.instance.state.get().error);
        });
        await advance(1);
        expect(signals[0].reason).toBe(CancellationReason.TIMEOUT);
        const timeout = {
          errorType: OnErrorType.MESSAGE_COMMUNICATION,
          message: CancellationReason.TIMEOUT,
          otherData: undefined as unknown,
          messageID: request.id,
        };
        expect(await outcome).toEqual(
          expect.objectContaining({ message: CancellationReason.TIMEOUT })
        );
        expect(errors).toEqual([timeout]);
        expect(seen).toContainEqual(timeout);

        let queued: MessageRequest;
        await act(async () => {
          queued = await bounded(entered[1].promise, 'Queued transport');
        });
        expect(queued.input.text).toBe('Waits behind it');
        expect(mount.instance.state.get().status).toBe('submitted');
        await act(async () => {
          finishNext.resolve();
          await next;
        });
        expect(mount.instance.state.get().status).toBe('ready');
        expect(errors).toHaveLength(1);
      } finally {
        stopWatching();
        finishNext.resolve();
        vi.useRealTimers();
        log.mockRestore();
        try {
          await act(() =>
            bounded(Promise.allSettled([first, next]), 'Send cleanup')
          );
        } finally {
          await act(async () => mount.unmount());
        }
      }
    }
  );
});
