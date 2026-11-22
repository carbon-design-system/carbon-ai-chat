/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKErrorData, ChatSDKHandlers } from '../index';
import {
  CancellationReason,
  MessageState,
} from '../../types/config/MessagingConfig';
import {
  BusEventType,
  type BusEventPreSend,
} from '../../types/events/eventBusTypes';
import { MessageErrorState } from '../../types/messaging/LocalMessageItem';
import type { MessageRequest } from '../../types/messaging/Messages';
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

describe('SDK public turn failure recovery', () => {
  it('fails a renamed running request and advances its queue before the old transport returns', async () => {
    const entered = [gate(), gate()];
    const finish = [gate(), gate()];
    const requests: MessageRequest[] = [];
    const signals: AbortSignal[] = [];
    await withSDK(
      async (sdk) => {
        const rename: ChatSDKHandlers = {
          type: BusEventType.PRE_SEND,
          handler: (event: BusEventPreSend): void => {
            if (event.data.input.text === 'Fail this running request') {
              event.data.id = 'consumer-renamed-failure';
            }
          },
        };
        sdk.on(rename);
        const first = watch(sdk.messaging.send('Fail this running request'));
        let second: Promise<void>;
        let failing: Promise<void>;
        try {
          await bounded(entered[0].promise, 'Renamed real transport entry');
          expect(requests[0].id).toBe('consumer-renamed-failure');
          second = watch(sdk.messaging.send('Queued successful request'));
          expect(requests).toHaveLength(1);
          failing = watch(
            sdk.messaging.failTurn({
              messageID: requests[0].id,
              error: { message: 'The owned stream failed.' },
            })
          );
          await bounded(failing, 'Running turn failure');
          await expect(bounded(first, 'Failed send')).rejects.toThrow(
            'The owned stream failed.'
          );
          await bounded(entered[1].promise, 'Queued real transport entry');
          expect(signals[0].aborted).toBe(true);
          expect(signals[0].reason).toBe(CancellationReason.TURN_FAILED);
          expect(signals[1].aborted).toBe(false);
          expect(
            sdk.state
              .get()
              .messages.find(
                (message) =>
                  'input' in message &&
                  'text' in message.input &&
                  message.input.text === 'Fail this running request'
              )
          ).toMatchObject({
            history: { error_state: MessageErrorState.FAILED },
          });
          finish[0].resolve();
          await finish[0].promise;
          await new Promise<void>((resolve) => setImmediate(resolve));
          expect(sdk.state.get().status).toBe('submitted');
          expect(sdk.state.get().error).toBeNull();
          expect(signals[1].aborted).toBe(false);
          finish[1].resolve();
          await bounded(second, 'Queued successful send');
          expect(sdk.state.get().status).toBe('ready');
        } finally {
          finish.forEach((held) => held.resolve());
          try {
            await bounded(
              Promise.allSettled([
                first,
                second,
                failing,
                ...finish.map((held) => held.promise),
              ]),
              'Owned failure queue cleanup'
            );
          } finally {
            sdk.off(rename);
          }
        }
      },
      (request, options) => {
        const index = requests.length;
        if (index >= 2) {
          throw new Error('Unexpected third transport');
        }
        requests.push(request);
        signals.push(options.signal);
        entered[index].resolve();
        return finish[index].promise;
      }
    );
  });

  it('fails an older streaming response without aborting the newer running turn', async () => {
    const currentEntered = gate();
    const finishCurrent = gate();
    const requests: MessageRequest[] = [];
    const signals: AbortSignal[] = [];
    await withSDK(
      async (sdk) => {
        await sdk.messaging.send('Older native stream');
        expect(sdk.state.get().status).toBe('streaming');
        const current = watch(sdk.messaging.send('Current running request'));
        try {
          await bounded(currentEntered.promise, 'Newer real transport entry');
          await sdk.messaging.failTurn({
            messageID: 'older-response',
            error: { message: 'Only the old stream failed.' },
          });
          expect(sdk.state.get().error).toMatchObject({
            messageID: requests[0].id,
          });
          expect(signals[0].aborted).toBe(true);
          expect(signals[0].reason).toBe(CancellationReason.TURN_FAILED);
          expect(signals[1].aborted).toBe(false);
          expect(
            sdk.state.get().messages.find(({ id }) => id === 'older-response')
          ).toMatchObject({
            history: { error_state: MessageErrorState.FAILED_WHILE_STREAMING },
            output: { generic: [{ text: 'Retained older content' }] },
          });
          await sdk.messaging.upsertMessage(
            'older-response',
            MessageState.STREAMING,
            () =>
              textResponse('older-response', 'Late edit retains its failure')
          );
          expect(sdk.state.get().status).toBe('error');
          expect(
            sdk.state.get().messages.find(({ id }) => id === 'older-response')
          ).toMatchObject({
            history: { error_state: MessageErrorState.FAILED_WHILE_STREAMING },
            output: { generic: [{ text: 'Late edit retains its failure' }] },
          });
          sdk.messaging.clearError();
          expect(sdk.state.get().error).toBeNull();
          expect(sdk.state.get().status).toBe('submitted');
          expect(
            sdk.state.get().messages.find(({ id }) => id === 'older-response')
          ).toMatchObject({
            history: { error_state: MessageErrorState.FAILED_WHILE_STREAMING },
            output: { generic: [{ text: 'Late edit retains its failure' }] },
          });
          finishCurrent.resolve();
          await bounded(current, 'Unaffected current send');
          expect(sdk.state.get().status).toBe('ready');
        } finally {
          finishCurrent.resolve();
          await bounded(
            Promise.allSettled([current, finishCurrent.promise]),
            'Owned older-turn cleanup'
          );
        }
      },
      async (request, options, sdk) => {
        requests.push(request);
        signals.push(options.signal);
        if (request.input.text === 'Older native stream') {
          await sdk.messaging.upsertMessage(
            'older-response',
            MessageState.STREAMING,
            () => ({
              ...textResponse('older-response', 'Retained older content'),
              request_id: request.id,
            })
          );
        } else {
          currentEntered.resolve();
          await finishCurrent.promise;
        }
      }
    );
  });

  it('rejects an unknown failure target without corrupting a completed turn', async () => {
    let requestID: string;
    let signal: AbortSignal;
    await withSDK(
      async (sdk) => {
        await sdk.messaging.send('Known completed turn');
        const before = sdk.state.get();
        expect(before.status).toBe('ready');
        await expect(
          sdk.messaging.failTurn({ messageID: 'missing-consumer-target' })
        ).rejects.toBeInstanceOf(Error);
        expect(sdk.state.get().status).toBe('ready');
        expect(sdk.state.get().error).toBeNull();
        expect(sdk.state.get().messages).toEqual(before.messages);
        expect(signal.aborted).toBe(false);
        await sdk.messaging.failTurn({
          messageID: requestID,
          error: { message: 'Known completed failure' },
        });
        expect(sdk.state.get().error).toMatchObject({
          messageID: requestID,
          message: 'Known completed failure',
        });
        expect(signal.aborted).toBe(false);
        await sdk.messaging.restartConversation();
        expect(sdk.state.get().status).toBe('ready');
        expect(sdk.state.get().error).toBeNull();
        expect(sdk.state.get().messages).toEqual([]);
      },
      async (request, options, sdk) => {
        requestID = request.id;
        signal = options.signal;
        await sdk.messaging.upsertMessage(
          'completed-target',
          MessageState.COMPLETE,
          () => ({
            ...textResponse('completed-target', 'Completed content remains'),
            request_id: request.id,
          })
        );
      }
    );
  });

  it('does not revive a failed turn when its held native updater publishes after recovery', async () => {
    const entered = gate();
    const release = gate();
    const failure = new Error('Owned transport failed before updater return');
    let pending: Promise<void>;
    await withSDK(
      async (sdk) => {
        const first = watch(
          sdk.messaging.send('Fail before native publication')
        );
        try {
          await bounded(entered.promise, 'Real delayed updater entry');
          await expect(
            bounded(first, 'Failed actual transport')
          ).rejects.toThrow(failure.message);
          await sdk.messaging.send('Recover before delayed publication');
          expect(sdk.state.get().status).toBe('ready');
          release.resolve();
          await bounded(pending, 'Delayed native publication');
          expect(sdk.state.get().status).toBe('ready');
          expect(
            sdk.state
              .get()
              .messages.find(({ id }) => id === 'recovered-before-late')
          ).toMatchObject({
            output: { generic: [{ text: 'Current recovered content' }] },
          });
          const lateItems = sdk.state
            .get()
            .messageItems.filter(
              ({ messageID }) => messageID === 'late-native'
            );
          expect(lateItems).toHaveLength(1);
          expect(lateItems[0].item).toMatchObject({
            text: 'Late owned native content',
          });
          expect(lateItems[0].status).not.toBe('streaming');
        } finally {
          release.resolve();
          await bounded(
            Promise.allSettled([first, pending]),
            'Owned delayed write cleanup'
          );
          await sdk.messaging.stop();
        }
      },
      async (request, _options, sdk) => {
        if (request.input.text === 'Fail before native publication') {
          pending = watch(
            sdk.messaging.upsertMessage(
              'late-native',
              MessageState.STREAMING,
              async () => {
                entered.resolve();
                await release.promise;
                return textResponse('late-native', 'Late owned native content');
              }
            )
          );
          // Entry is observed without joining the pending write.
          await entered.promise;
          throw failure;
        }
        await sdk.messaging.upsertMessage(
          'recovered-before-late',
          MessageState.COMPLETE,
          () => ({
            ...textResponse(
              'recovered-before-late',
              'Current recovered content'
            ),
            request_id: request.id,
          })
        );
      }
    );
  });

  it('keeps an updated earlier stream active when a different current transport fails', async () => {
    const currentEntered = gate();
    const failCurrent = gate();
    const failure = new Error('Only the current transport failed');
    const errors: ChatSDKErrorData[] = [];
    let currentID: string;
    await withSDK(
      async (sdk) => {
        await sdk.messaging.send('Retained earlier stream');
        expect(sdk.state.get().status).toBe('streaming');
        const current = watch(
          sdk.messaging.send('Fail the unrelated current turn')
        );
        try {
          await bounded(
            currentEntered.promise,
            'Unrelated real transport entry'
          );
          await sdk.messaging.upsertMessage(
            'retained-earlier',
            MessageState.STREAMING,
            () =>
              textResponse('retained-earlier', 'Updated retained earlier text')
          );
          failCurrent.resolve();
          await expect(
            bounded(current, 'Unrelated send failure')
          ).rejects.toThrow(failure.message);
          expect(errors).toHaveLength(1);
          expect(errors[0]).toMatchObject({ messageID: currentID });
          sdk.messaging.clearError();
          expect(sdk.state.get().status).toBe('streaming');
          expect(
            sdk.state
              .get()
              .messageItems.filter(
                ({ messageID }) => messageID === 'retained-earlier'
              )
          ).toEqual([
            expect.objectContaining({
              status: 'streaming',
              item: expect.objectContaining({
                text: 'Updated retained earlier text',
              }),
            }),
          ]);
          await sdk.messaging.upsertMessage(
            'retained-earlier',
            MessageState.COMPLETE,
            () =>
              textResponse(
                'retained-earlier',
                'Completed retained earlier text'
              )
          );
          expect(sdk.state.get().status).toBe('ready');
        } finally {
          failCurrent.resolve();
          await bounded(
            Promise.allSettled([current]),
            'Owned unrelated failure cleanup'
          );
          await sdk.messaging.stop();
        }
      },
      async (request, _options, sdk) => {
        if (request.input.text === 'Retained earlier stream') {
          await sdk.messaging.upsertMessage(
            'retained-earlier',
            MessageState.STREAMING,
            () =>
              textResponse('retained-earlier', 'Initial retained earlier text')
          );
        } else {
          currentID = request.id;
          currentEntered.resolve();
          await failCurrent.promise;
          throw failure;
        }
      },
      {
        onError: (error): void => {
          errors.push(error);
        },
      }
    );
  });
});
