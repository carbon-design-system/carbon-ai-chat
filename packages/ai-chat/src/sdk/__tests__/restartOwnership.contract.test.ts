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
  CancellationReason,
  MessageState,
} from '../../types/config/MessagingConfig';
import {
  BusEventType,
  type BusEventPreReset,
  type BusEventPreReceive,
} from '../../types/events/eventBusTypes';
import { textResponse, withSDK } from './helpers/publicContract';

function gate() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function watch<T>(work: Promise<T>): Promise<T> {
  void work.catch((): void => undefined);
  return work;
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

describe('SDK public restart ownership', () => {
  it('invalidates an awaited updater before pre-restart settles and aborts the producer afterward', async () => {
    const transportEntered = gate();
    const finishTransport = gate();
    let signal: AbortSignal;
    let requestID: string;
    const sent: string[] = [];
    await withSDK(
      async (sdk) => {
        const updaterEntered = gate();
        const releaseUpdater = gate();
        const preEntered = gate();
        const releasePre = gate();
        const handler: ChatSDKHandlers = {
          type: BusEventType.PRE_RESTART_CONVERSATION,
          handler: async () => {
            preEntered.resolve();
            await releasePre.promise;
          },
        };
        sdk.on(handler);
        const sending = watch(sdk.messaging.send('Restart this producer'));
        let pending: Promise<void>;
        let restarting: Promise<void>;
        let queuedSend: Promise<void>;
        try {
          await bounded(transportEntered.promise, 'Actual transport entry');
          queuedSend = watch(
            sdk.messaging.send('Discard this queued generation send')
          );
          await sdk.messaging.upsertMessage(
            'before-restart',
            MessageState.STREAMING,
            () => ({
              ...textResponse('before-restart', 'Published before restart'),
              request_id: requestID,
            })
          );
          pending = watch(
            sdk.messaging.upsertMessage(
              'pending-before-pre',
              MessageState.COMPLETE,
              async () => {
                updaterEntered.resolve();
                await releaseUpdater.promise;
                return textResponse('pending-before-pre', 'Obsolete result');
              }
            )
          );
          await bounded(updaterEntered.promise, 'Updater entry');
          expect(sdk.state.get().status).toBe('streaming');
          restarting = watch(sdk.messaging.restartConversation());
          await bounded(preEntered.promise, 'Pre-restart entry');
          expect(signal.aborted).toBe(false);
          releaseUpdater.resolve();
          await bounded(pending, 'Updater during pre-restart');
          expect(
            sdk.state
              .get()
              .messages.some(({ id }) => id === 'pending-before-pre')
          ).toBe(false);
          expect(signal.aborted).toBe(false);
          expect(sdk.state.get().status).toBe('streaming');
          releasePre.resolve();
          await bounded(restarting, 'Completed restart');
          expect(signal.aborted).toBe(true);
          expect(signal.reason).toBe(CancellationReason.CONVERSATION_RESTARTED);
          await bounded(
            Promise.all([sending, queuedSend]),
            'Restarted old sends'
          );
          expect(sent).toEqual(['Restart this producer']);
          expect(sdk.state.get().status).toBe('ready');
          await sdk.messaging.upsertMessage(
            'fresh-after-pre',
            MessageState.COMPLETE,
            () => textResponse('fresh-after-pre', 'Usable new conversation')
          );
          expect(sdk.state.get().messages.map(({ id }) => id)).toEqual([
            'fresh-after-pre',
          ]);
        } finally {
          releaseUpdater.resolve();
          releasePre.resolve();
          finishTransport.resolve();
          try {
            await bounded(
              Promise.allSettled([
                sending,
                queuedSend,
                pending,
                restarting,
                finishTransport.promise,
              ]),
              'Owned restart cleanup'
            );
          } finally {
            sdk.off(handler);
          }
        }
      },
      (request, options) => {
        sent.push(request.input.text);
        requestID = request.id;
        signal = options.signal;
        transportEntered.resolve();
        return finishTransport.promise;
      }
    );
  });

  it('keeps a live conversation on canceled restart without reviving its queued old updaters', async () => {
    const transportEntered = gate();
    const finishTransport = gate();
    let signal: AbortSignal;
    await withSDK(
      async (sdk) => {
        await sdk.messaging.upsertMessage('kept', MessageState.COMPLETE, () =>
          textResponse('kept', 'Keep this settled response')
        );
        const updaterEntered = gate();
        const releaseUpdater = gate();
        let queuedCalls = 0;
        const handlers: ChatSDKHandlers = [
          {
            type: BusEventType.PRE_RESTART_CONVERSATION,
            handler: (event: BusEventPreReset): void => {
              event.cancel = true;
            },
          },
        ];
        sdk.on(handlers);
        const sending = watch(sdk.messaging.send('Keep this live producer'));
        let first: Promise<void>;
        let queued: Promise<void>;
        try {
          await bounded(transportEntered.promise, 'Live producer entry');
          first = watch(
            sdk.messaging.upsertMessage(
              'old-chain',
              MessageState.COMPLETE,
              async () => {
                updaterEntered.resolve();
                await releaseUpdater.promise;
                return textResponse('old-chain', 'Dropped first write');
              }
            )
          );
          await bounded(updaterEntered.promise, 'First updater entry');
          queued = watch(
            sdk.messaging.upsertMessage(
              'old-chain',
              MessageState.COMPLETE,
              () => {
                queuedCalls += 1;
                return textResponse('old-chain', 'Dropped queued write');
              }
            )
          );
          await bounded(
            sdk.messaging.restartConversation(),
            'Canceled restart'
          );
          releaseUpdater.resolve();
          await bounded(
            Promise.all([first, queued]),
            'Invalidated write chain'
          );
          expect(queuedCalls).toBe(0);
          expect(
            sdk.state.get().messages.some(({ id }) => id === 'old-chain')
          ).toBe(false);
          expect(
            sdk.state.get().messages.find(({ id }) => id === 'kept')
          ).toMatchObject({
            output: { generic: [{ text: 'Keep this settled response' }] },
          });
          expect(signal.aborted).toBe(false);
          expect(sdk.state.get().status).toBe('submitted');
          finishTransport.resolve();
          await bounded(sending, 'Uncanceled send');
          expect(sdk.state.get().status).toBe('ready');
        } finally {
          releaseUpdater.resolve();
          finishTransport.resolve();
          try {
            await bounded(
              Promise.allSettled([
                sending,
                first,
                queued,
                finishTransport.promise,
              ]),
              'Owned canceled-restart cleanup'
            );
          } finally {
            sdk.off(handlers);
          }
        }
      },
      (_request, options) => {
        signal = options.signal;
        transportEntered.resolve();
        return finishTransport.promise;
      }
    );
  });

  it('rejects with the original pre-restart error even when that handler also cancels', async () => {
    await withSDK(async (sdk) => {
      await sdk.messaging.upsertMessage(
        'kept-on-throw',
        MessageState.COMPLETE,
        () => textResponse('kept-on-throw', 'Kept when restart rejects')
      );
      const failure = new Error('Owned pre-restart rejection');
      const handler: ChatSDKHandlers = {
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: (event: BusEventPreReset): void => {
          event.cancel = true;
          throw failure;
        },
      };
      sdk.on(handler);
      try {
        await expect(sdk.messaging.restartConversation()).rejects.toBe(failure);
        expect(sdk.state.get().messages.map(({ id }) => id)).toEqual([
          'kept-on-throw',
        ]);
      } finally {
        sdk.off(handler);
      }
      await sdk.messaging.restartConversation();
      expect(sdk.state.get().messages).toEqual([]);
      expect(sdk.state.get().status).toBe('ready');
    });
  });

  it('preserves an old updater rejection without ending a newer generation stream', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const release = gate();
      const failure = new Error('Owned obsolete updater rejection');
      const pending = watch(
        sdk.messaging.upsertMessage(
          'obsolete-rejection',
          MessageState.COMPLETE,
          async () => {
            entered.resolve();
            await release.promise;
            throw failure;
          }
        )
      );
      try {
        await bounded(entered.promise, 'Old updater entry');
        await sdk.messaging.restartConversation();
        await sdk.messaging.upsertMessage(
          'current-stream',
          MessageState.STREAMING,
          () => textResponse('current-stream', 'Current stream remains active')
        );
        expect(sdk.state.get().status).toBe('streaming');
        release.resolve();
        await expect(bounded(pending, 'Old updater rejection')).rejects.toBe(
          failure
        );
        expect(sdk.state.get().status).toBe('streaming');
        expect(
          sdk.state.get().messages.find(({ id }) => id === 'current-stream')
        ).toMatchObject({
          output: { generic: [{ text: 'Current stream remains active' }] },
        });
        expect(
          sdk.state.get().messages.some(({ id }) => id === 'obsolete-rejection')
        ).toBe(false);
        await sdk.messaging.upsertMessage(
          'current-stream',
          MessageState.COMPLETE,
          () => textResponse('current-stream', 'Current completed response')
        );
        expect(sdk.state.get().status).toBe('ready');
      } finally {
        release.resolve();
        await bounded(Promise.allSettled([pending]), 'Owned rejection cleanup');
      }
    });
  });

  it('lets a completion already in pre-receive finish when the restart is canceled', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const release = gate();
      await sdk.messaging.upsertMessage(
        'accepted-before-restart',
        MessageState.STREAMING,
        () =>
          textResponse(
            'accepted-before-restart',
            'Published before canceled restart'
          )
      );
      const handlers: ChatSDKHandlers = [
        {
          type: BusEventType.PRE_RECEIVE,
          handler: async (event: BusEventPreReceive) => {
            if (event.data.id === 'accepted-before-restart') {
              entered.resolve();
              await release.promise;
            }
          },
        },
        {
          type: BusEventType.PRE_RESTART_CONVERSATION,
          handler: (event: BusEventPreReset): void => {
            event.cancel = true;
          },
        },
      ];
      sdk.on(handlers);
      const completing = watch(
        sdk.messaging.upsertMessage(
          'accepted-before-restart',
          MessageState.COMPLETE,
          () =>
            textResponse(
              'accepted-before-restart',
              'Accepted completed response'
            )
        )
      );
      try {
        await bounded(entered.promise, 'Accepted completion pre-receive');
        await sdk.messaging.restartConversation();
        release.resolve();
        await bounded(completing, 'Completion after canceled restart');
        expect(
          sdk.state
            .get()
            .messages.find(({ id }) => id === 'accepted-before-restart')
        ).toMatchObject({
          output: { generic: [{ text: 'Accepted completed response' }] },
        });
        expect(sdk.state.get().status).toBe('ready');
      } finally {
        release.resolve();
        try {
          await bounded(
            Promise.allSettled([completing]),
            'Owned accepted completion cleanup'
          );
        } finally {
          sdk.off(handlers);
        }
      }
    });
  });
});
