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
  MessageState,
  OnErrorType,
  type BusEventReceive,
  type BusEventUserDefinedResponse,
  type ChatInstance,
  type MessageRequest,
  type MessageResponse,
  type OnErrorData,
  type PartialItemChunk,
} from '../../../aiChatEntry';
import {
  addChunk,
  contractChat,
  contractSetup,
  deferred,
  mainPanelText,
  partialText,
  responseOf,
  textItem,
  userDefinedItem,
  type Deferred,
} from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

const FAILING_TEXT = 'Fail this request';
const FAILURE = 'Owned first transport failure';

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

/** Keeps a promise the test settles later from failing as unhandled. */
function quiet<T>(work: Promise<T>): Promise<T> {
  void work.catch((): void => undefined);
  return work;
}

/** Records a promise for cleanup and keeps it from failing as unhandled. */
function own<T>(owned: Promise<unknown>[], work: Promise<T>): Promise<T> {
  owned.push(work);
  return quiet(work);
}

/** A text partial for `responseID`, owned by the request the host received. */
function ownedPartial(
  responseID: string,
  requestID: string,
  text: string
): PartialItemChunk {
  return {
    ...partialText(responseID, 'text', text),
    streaming_metadata: { response_id: responseID, request_id: requestID },
  };
}

/** True when the chat's public state holds a message with this ID. */
function hasMessage(instance: ChatInstance, messageID: string): boolean {
  return instance.state.get().messages.some(({ id }) => id === messageID);
}

/** True when the chat's public state holds an item from this message. */
function hasItemsOf(instance: ChatInstance, messageID: string): boolean {
  const { messageItems } = instance.state.get();
  return messageItems.some((item) => item.messageID === messageID);
}

/** Waits until the chat has loaded and has no turn in progress. */
async function waitForReady(instance: ChatInstance) {
  await waitFor(() => expect(instance.state.get().status).toBe('ready'));
}

/** Records each status the chat publishes after this call. */
function recordStatuses(instance: ChatInstance) {
  const statuses: string[] = [];
  const unsubscribe = instance.state.select(
    (state) => state.status,
    (status) => {
      statuses.push(status);
    }
  );
  return { statuses, unsubscribe };
}

/**
 * An open chat whose transport rejects `FAILING_TEXT` and holds every other
 * request until `finish` settles.
 */
function mountFailingChat(
  errors: OnErrorData[],
  entered: Deferred<void>,
  finish: Deferred<void>
) {
  return contractChat({
    openChatByDefault: true,
    onError: (error) => {
      errors.push(error);
    },
    messaging: {
      skipWelcome: true,
      customSendMessage: async (request) => {
        if (request.input.text === FAILING_TEXT) {
          throw new Error(FAILURE);
        }
        entered.resolve();
        await finish.promise;
      },
    },
  });
}

/** Fails a real send through the transport and checks the public error. */
async function failFirstSend(instance: ChatInstance, errors: OnErrorData[]) {
  await act(async () => {
    const failed = instance.messaging.send(FAILING_TEXT);
    await expect(failed).rejects.toThrow(FAILURE);
  });
  expect(instance.state.get().status).toBe('error');
  expect(instance.state.get().error).not.toBeNull();
  expect(errors.map(({ errorType }) => errorType)).toEqual([
    OnErrorType.MESSAGE_COMMUNICATION,
  ]);
}

describe('public legacy queue and callback reentry', () => {
  contractSetup();

  it.each(['chunk stream', 'final chunk', 'addMessage'] as const)(
    'keeps a real turn streaming after its %s response completes while its transport is held, then reports ready when the transport returns',
    async (route) => {
      const received = deferred();
      const release = deferred();
      const mount = await contractChat({
        openChatByDefault: true,
        messaging: {
          skipWelcome: true,
          messageTimeoutSecs: 0,
          customSendMessage: async (request, _options, chat) => {
            const response: MessageResponse = {
              ...responseOf('held-answer', [
                textItem('Held turn answer', 'text'),
              ]),
              request_id: request.id,
            };
            if (route === 'addMessage') {
              await chat.messaging.addMessage(response);
            } else {
              if (route === 'chunk stream') {
                await chat.messaging.addMessageChunk(
                  ownedPartial('held-answer', request.id, 'Held turn partial')
                );
              }
              await chat.messaging.addMessageChunk({
                final_response: response,
              });
            }
            received.resolve();
            await release.promise;
          },
        },
      });
      let settled = false;
      const markSettled = () => {
        settled = true;
      };
      let sending: Promise<void> = Promise.resolve();
      await waitForReady(mount.instance);
      const { statuses, unsubscribe } = recordStatuses(mount.instance);
      try {
        await act(async () => {
          sending = mount.instance.messaging.send('Hold this turn');
          void sending.then(markSettled, (): void => undefined);
        });
        await bounded(received.promise, 'Held turn response');
        await waitFor(() =>
          expect(mainPanelText()).toContain('Held turn answer')
        );
        expect(settled).toBe(false);
        expect(mount.instance.state.get().status).toBe('streaming');
        await act(async () => {
          release.resolve();
          await bounded(sending, 'Held turn transport');
        });
        expect(settled).toBe(true);
        expect(statuses).toEqual(['submitted', 'streaming', 'ready']);
        expect(mount.instance.state.get().error).toBeNull();
      } finally {
        unsubscribe();
        release.resolve();
        try {
          await act(() =>
            bounded(Promise.allSettled([sending]), 'Owned held-turn cleanup')
          );
        } finally {
          await act(async () => mount.unmount());
        }
      }
    }
  );

  it.each([
    ['chunk final', 'restart'],
    ['chunk final', 'Stop'],
    ['upsert COMPLETE', 'restart'],
    ['upsert COMPLETE', 'Stop'],
  ] as const)(
    'releases the queue when a chunk stream ends through %s while its transport is held and keeps later sends owned after %s',
    async (ending, termination) => {
      const entered = [deferred(), deferred(), deferred(), deferred()];
      const finish = [deferred(), deferred(), deferred(), deferred()];
      const requests: MessageRequest[] = [];
      const signals: AbortSignal[] = [];
      const errors: OnErrorData[] = [];
      const receiving = deferred();
      const releaseReceive = deferred();
      const mount = await contractChat({
        openChatByDefault: true,
        onError: (error) => {
          errors.push(error);
        },
        messaging: {
          skipWelcome: true,
          messageTimeoutSecs: 0,
          customSendMessage: (request, options) => {
            const index = requests.length;
            requests.push(request);
            signals.push(options.signal);
            entered[index].resolve();
            return finish[index].promise;
          },
        },
      });
      const receive = {
        type: BusEventType.RECEIVE,
        handler: async (event: BusEventReceive) => {
          if (event.data.id === 'first-response') {
            receiving.resolve();
            await releaseReceive.promise;
          }
        },
      };
      let stopEvents = 0;
      const stop = {
        type: BusEventType.STOP_STREAMING,
        handler: () => {
          stopEvents += 1;
        },
      };
      mount.instance.on(receive);
      mount.instance.on(stop);
      const endFirstStream = (requestID: string) => {
        const response: MessageResponse = {
          ...responseOf('first-response', [textItem('First final', 'text')]),
          request_id: requestID,
        };
        if (ending === 'chunk final') {
          return mount.instance.messaging.addMessageChunk({
            final_response: response,
          });
        }
        return mount.instance.messaging.upsertMessage(
          'first-response',
          MessageState.COMPLETE,
          () => response
        );
      };
      await waitForReady(mount.instance);
      const { statuses, unsubscribe } = recordStatuses(mount.instance);
      const owned: Promise<unknown>[] = [];
      let firstSettled = false;
      const markFirstSettled = () => {
        firstSettled = true;
      };
      let first: Promise<void> = Promise.resolve();
      let second: Promise<void> = Promise.resolve();
      let final: Promise<void> = Promise.resolve();
      let replacement: Promise<void> = Promise.resolve();
      let following: Promise<void> = Promise.resolve();
      try {
        await act(async () => {
          first = own(
            owned,
            mount.instance.messaging.send('first').then(markFirstSettled)
          );
        });
        await bounded(entered[0].promise, 'First transport');
        await addChunk(
          mount.instance,
          ownedPartial('first-response', requests[0].id, 'First partial')
        );
        await act(async () => {
          second = own(owned, mount.instance.messaging.send('second'));
        });
        await act(async () => {
          final = own(owned, endFirstStream(requests[0].id));
        });
        await bounded(receiving.promise, 'First final receive entry');
        expect(requests.map(({ input }) => input.text)).toEqual(['first']);
        expect(firstSettled).toBe(false);
        await act(async () => {
          releaseReceive.resolve();
          await bounded(final, 'First final receive');
        });
        await bounded(entered[1].promise, 'Released second transport');
        await waitFor(() => expect(mainPanelText()).toContain('First final'));
        expect(firstSettled).toBe(false);
        expect(signals.map(({ aborted }) => aborted)).toEqual([false, false]);
        expect(mount.instance.state.get().status).toBe('streaming');
        expect(statuses).not.toContain('ready');
        await addChunk(
          mount.instance,
          ownedPartial('second-response', requests[1].id, 'Second partial')
        );
        if (termination === 'Stop') {
          await act(() => bounded(mount.instance.messaging.stop(), 'Stop'));
        } else {
          await act(() => mount.instance.messaging.restartConversation());
        }
        await expect(bounded(second, 'Second send')).resolves.toBeUndefined();
        expect(signals[1].aborted).toBe(true);
        expect(signals[1].reason).toBe(
          termination === 'Stop'
            ? CancellationReason.STOP_STREAMING
            : CancellationReason.CONVERSATION_RESTARTED
        );
        expect(signals[0].aborted).toBe(false);
        expect(firstSettled).toBe(false);
        expect(stopEvents).toBe(termination === 'Stop' ? 1 : 0);
        expect(mainPanelText().includes('First final')).toBe(
          termination === 'Stop'
        );
        await act(async () => {
          replacement = own(
            owned,
            mount.instance.messaging.send('replacement')
          );
        });
        await bounded(entered[2].promise, 'Replacement transport');
        await act(async () => {
          following = own(owned, mount.instance.messaging.send('following'));
        });
        // Stop leaves the answered first request active until it returns.
        expect(mount.instance.state.get().status).toBe(
          termination === 'Stop' ? 'streaming' : 'submitted'
        );
        await act(async () => {
          finish[0].resolve();
          finish[1].resolve();
          await bounded(first, 'Late first transport');
        });
        expect(firstSettled).toBe(true);
        expect(requests.map(({ input }) => input.text)).toEqual([
          'first',
          'second',
          'replacement',
        ]);
        expect(signals[2].aborted).toBe(false);
        expect(mount.instance.state.get().status).toBe('submitted');
        await act(async () => {
          finish[2].resolve();
          await bounded(replacement, 'Replacement send');
          await bounded(entered[3].promise, 'Following transport');
          finish[3].resolve();
          await bounded(following, 'Following send');
        });
        expect(requests.map(({ input }) => input.text)).toEqual([
          'first',
          'second',
          'replacement',
          'following',
        ]);
        expect(mount.instance.state.get().status).toBe('ready');
        expect(statuses[statuses.length - 1]).toBe('ready');
        expect(errors).toEqual([]);
      } finally {
        releaseReceive.resolve();
        finish.forEach((item) => item.resolve());
        mount.instance.off(receive);
        mount.instance.off(stop);
        unsubscribe();
        try {
          await act(async () => {
            await bounded(mount.instance.messaging.stop(), 'Cleanup stop');
            await bounded(Promise.allSettled(owned), 'Owned queue cleanup');
          });
        } finally {
          await act(async () => mount.unmount());
        }
      }
    }
  );

  it('restarts an open chat after a real send failure through loading to ready', async () => {
    const entered = deferred();
    const finish = deferred();
    const errors: OnErrorData[] = [];
    const mount = await mountFailingChat(errors, entered, finish);
    let unsubscribe = (): void => undefined;
    try {
      await failFirstSend(mount.instance, errors);
      const recorded = recordStatuses(mount.instance);
      unsubscribe = recorded.unsubscribe;
      await act(() => mount.instance.messaging.restartConversation());
      expect(recorded.statuses).toEqual(['loading', 'ready']);
      expect(mount.instance.state.get().error).toBeNull();
      expect(errors).toHaveLength(1);
    } finally {
      unsubscribe();
      finish.resolve();
      await act(async () => mount.unmount());
    }
  });

  it('starts the next real send after a failure as submitted and keeps it submitted through an unrelated response', async () => {
    const entered = deferred();
    const finish = deferred();
    const errors: OnErrorData[] = [];
    const mount = await mountFailingChat(errors, entered, finish);
    let unsubscribe = (): void => undefined;
    let sending: Promise<void> = Promise.resolve();
    try {
      await failFirstSend(mount.instance, errors);
      const recorded = recordStatuses(mount.instance);
      unsubscribe = recorded.unsubscribe;
      await act(async () => {
        sending = quiet(mount.instance.messaging.send('Send after failure'));
      });
      await bounded(entered.promise, 'Next real transport');
      expect(mount.instance.state.get().status).toBe('submitted');
      expect(mount.instance.state.get().error).toBeNull();
      await act(() =>
        mount.instance.messaging.addMessage({
          ...responseOf('unrelated-response', [
            textItem('An unrelated response'),
          ]),
          request_id: 'another-request',
        })
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('An unrelated response')
      );
      expect(mount.instance.state.get().status).toBe('submitted');
      await act(async () => {
        finish.resolve();
        await bounded(sending, 'Next real send');
      });
      expect(recorded.statuses).toEqual(['submitted', 'ready']);
      expect(mount.instance.state.get().error).toBeNull();
      expect(errors).toHaveLength(1);
    } finally {
      unsubscribe();
      finish.resolve();
      try {
        await act(() =>
          bounded(Promise.allSettled([sending]), 'Owned next-send cleanup')
        );
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it.each(['addMessage', 'final chunk'] as const)(
    'discards a legacy %s accepted while its real status subscriber clears the conversation',
    async (route) => {
      const entered = deferred<MessageRequest>();
      const finish = deferred();
      const hold = deferred();
      const revealed: string[] = [];
      const mount = await contractChat({
        openChatByDefault: true,
        messaging: {
          skipWelcome: true,
          customSendMessage: async (request) => {
            entered.resolve(request);
            await finish.promise;
          },
        },
      });
      const reveal = {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: (event: BusEventUserDefinedResponse): Promise<void> | void => {
          revealed.push(event.data.fullMessage.id);
          if (event.data.fullMessage.id === 'obsolete-response') {
            return hold.promise;
          }
          return undefined;
        },
      };
      mount.instance.on(reveal);
      const accept = (message: MessageResponse) => {
        if (route === 'addMessage') {
          return mount.instance.messaging.addMessage(message);
        }
        return mount.instance.messaging.addMessageChunk({
          final_response: message,
        });
      };
      let clearing: Promise<void> = Promise.resolve();
      let clearCalls = 0;
      let unsubscribe = (): void => undefined;
      let sending: Promise<void> = Promise.resolve();
      try {
        await act(async () => {
          sending = quiet(mount.instance.messaging.send('Hold the request'));
        });
        const request = await bounded(entered.promise, 'Held real transport');
        unsubscribe = mount.instance.state.select(
          (state) => state.status,
          (status) => {
            if (status === 'streaming') {
              clearCalls += 1;
              clearing = mount.instance.messaging.clearConversation();
            }
          }
        );
        await act(() =>
          bounded(
            accept({
              ...responseOf('obsolete-response', [
                userDefinedItem('obsolete-widget', { value: 'obsolete' }),
                textItem('Obsolete accepted response', 'obsolete-text'),
              ]),
              request_id: request.id,
            }),
            'Accepted legacy response'
          )
        );
        expect(clearCalls).toBe(1);
        await act(() => bounded(clearing, 'Reentrant public clear'));
        unsubscribe();
        await act(async () => {
          hold.resolve();
          finish.resolve();
          await bounded(sending, 'Cleared real sender');
        });
        await act(() =>
          mount.instance.messaging.addMessage(
            responseOf('current-response', [
              userDefinedItem('current-widget', { value: 'current' }),
              textItem('Current response after clear', 'current-text'),
            ])
          )
        );
        await waitFor(() =>
          expect(mainPanelText()).toContain('Current response after clear')
        );
        expect(revealed).toContain('current-response');
        expect(hasMessage(mount.instance, 'current-response')).toBe(true);
        expect(hasItemsOf(mount.instance, 'current-response')).toBe(true);
        expect(mainPanelText()).not.toContain('Obsolete accepted response');
        expect(hasMessage(mount.instance, 'obsolete-response')).toBe(false);
        expect(hasItemsOf(mount.instance, 'obsolete-response')).toBe(false);
      } finally {
        unsubscribe();
        hold.resolve();
        finish.resolve();
        mount.instance.off(reveal);
        try {
          await act(() =>
            bounded(
              Promise.allSettled([sending, clearing]),
              'Owned accepted-clear cleanup'
            )
          );
        } finally {
          await act(async () => mount.unmount());
        }
      }
    }
  );

  it.each(['final chunk', 'addMessage'] as const)(
    'completes a real legacy %s while a native updater for the same ID is held and accepts the next native update after its original rejection',
    async (route) => {
      const mount = await contractChat({
        openChatByDefault: true,
        messaging: { skipWelcome: true },
      });
      const entered = deferred();
      const result = deferred<MessageResponse>();
      const failure = new Error('Owned held native updater rejection');
      const previous: (MessageResponse | undefined)[] = [];
      let nativeSettled = false;
      const markNativeSettled = () => {
        nativeSettled = true;
      };
      let native: Promise<void> = Promise.resolve();
      try {
        await act(async () => {
          native = mount.instance.messaging.upsertMessage(
            'held',
            MessageState.STREAMING,
            () => {
              entered.resolve();
              return result.promise;
            }
          );
          void native.then(markNativeSettled, markNativeSettled);
        });
        await bounded(entered.promise, 'Held native updater');
        expect(hasMessage(mount.instance, 'held')).toBe(false);
        const completion = responseOf('held', [
          textItem('Current legacy final'),
        ]);
        if (route === 'final chunk') {
          await addChunk(mount.instance, { final_response: completion });
        } else {
          await act(() => mount.instance.messaging.addMessage(completion));
        }
        await waitFor(() =>
          expect(mainPanelText()).toContain('Current legacy final')
        );
        expect(nativeSettled).toBe(false);
        await act(async () => {
          result.reject(failure);
          await expect(bounded(native, 'Rejection')).rejects.toBe(failure);
        });
        const { messages } = mount.instance.state.get();
        expect(messages.find(({ id }) => id === 'held')).toMatchObject({
          output: { generic: [{ text: 'Current legacy final' }] },
        });
        const continuation = responseOf('held', [
          textItem('Current native continuation'),
        ]);
        await act(() =>
          mount.instance.messaging.upsertMessage(
            'held',
            MessageState.COMPLETE,
            (value) => {
              previous.push(value);
              return continuation;
            }
          )
        );
        expect(previous).toHaveLength(1);
        expect(previous[0]?.output.generic).toEqual([
          expect.objectContaining({ text: 'Current legacy final' }),
        ]);
        await waitFor(() =>
          expect(mainPanelText()).toContain('Current native continuation')
        );
        expect(mainPanelText()).not.toContain('Current legacy final');
        expect(mount.instance.state.get().status).toBe('ready');
      } finally {
        result.reject(failure);
        try {
          await act(() =>
            bounded(Promise.allSettled([native]), 'Owned mixed-write cleanup')
          );
        } finally {
          await act(async () => mount.unmount());
        }
      }
    }
  );
});
