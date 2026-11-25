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
  MessageState,
  type BusEventPreReceive,
  type BusEventReceive,
  type BusEventChunkUserDefinedResponse,
  type MessageRequest,
  type PublicConfig,
  type TypeAndHandler,
} from '../../../aiChatEntry';
import {
  addChunk,
  contractChat,
  contractSetup,
  deferred,
  finalChunk,
  mainPanelText,
  partialText,
  partialUserDefined,
  textItem,
  textResponse,
} from '../helpers/contract';

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

function generationTransport() {
  const firstEntered = deferred();
  const finishFirst = deferred();
  const secondEntered = deferred();
  const requests: MessageRequest[] = [];
  const signals: AbortSignal[] = [];
  const work: Promise<void>[] = [];
  const send: NonNullable<
    NonNullable<PublicConfig['messaging']>['customSendMessage']
  > = (request, options, instance) => {
    requests.push(request);
    signals.push(options.signal);
    const operation = (async () => {
      if (request.input.text === 'Old generation request') {
        await instance.messaging.addMessageChunk({
          ...partialText('old-response', 'old-text', 'Old streamed text'),
          streaming_metadata: {
            response_id: 'old-response',
            request_id: request.id,
          },
        });
        firstEntered.resolve();
        await finishFirst.promise;
      } else if (request.input.text === 'Current generation request') {
        secondEntered.resolve();
        await instance.messaging.addMessageChunk({
          ...partialText(
            'current-response',
            'current-text',
            'Current streamed text'
          ),
          streaming_metadata: {
            response_id: 'current-response',
            request_id: request.id,
          },
        });
      }
    })();
    work.push(operation);
    return operation;
  };
  return {
    send,
    firstEntered,
    finishFirst,
    secondEntered,
    requests,
    signals,
    work,
  };
}

describe('public host request generation ownership', () => {
  contractSetup();

  it('keeps a replacement after an awaited legacy receive renames its removed destination', async () => {
    const entered = deferred();
    const release = deferred();
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const received: string[] = [];
    const handlers: TypeAndHandler[] = [
      {
        type: BusEventType.PRE_RECEIVE,
        handler: async (event: BusEventPreReceive) => {
          if (event.data.id === 'clean-temporary') {
            event.data.id = 'clean-destination';
          } else if (event.data.id === 'held-temporary') {
            event.data.id = 'destination';
            entered.resolve();
            await release.promise;
            event.data.id = 'destination';
          }
        },
      },
      {
        type: BusEventType.RECEIVE,
        handler: (event: BusEventReceive): void => {
          received.push(event.data.id);
        },
      },
    ];
    await act(() =>
      mount.instance.messaging.addMessage(
        textResponse('Original destination text', 'destination')
      )
    );
    await waitFor(() =>
      expect(mainPanelText()).toContain('Original destination text')
    );
    mount.instance.on(handlers);
    let pending: Promise<void>;
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Clean renamed text', 'clean-temporary')
        )
      );
      expect(received).toEqual(['clean-destination']);
      expect(
        mount.instance.state
          .get()
          .messages.some(({ id }) => id === 'clean-destination')
      ).toBe(true);
      received.length = 0;
      await act(async () => {
        pending = mount.instance.messaging.addMessage(
          textResponse('Obsolete renamed text', 'held-temporary')
        );
        void pending.catch((): void => undefined);
      });
      await bounded(entered.promise, 'Held mutable legacy receive');
      await act(async () => {
        await mount.instance.messaging.removeMessages(['destination']);
        await mount.instance.messaging.upsertMessage(
          'destination',
          MessageState.STREAMING,
          () => textResponse('Current destination replacement', 'destination')
        );
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Current destination replacement')
      );
      await act(async () => {
        release.resolve();
        await bounded(pending, 'Obsolete legacy receive');
      });
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'destination')
      ).toMatchObject({
        output: { generic: [{ text: 'Current destination replacement' }] },
      });
      expect(
        mount.instance.state
          .get()
          .messages.some(({ id }) => id === 'held-temporary')
      ).toBe(false);
      expect(received).toEqual([]);
      expect(mainPanelText()).not.toContain('Obsolete renamed text');
    } finally {
      release.resolve();
      mount.instance.off(handlers);
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([pending]),
            'Owned renamed receive cleanup'
          );
          await mount.instance.messaging.stop();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('keeps a new stream and its queued successor owned when an old final crosses restart', async () => {
    const transport = generationTransport();
    const { requests, signals } = transport;
    const oldFinalEntered = deferred();
    const releaseOldFinal = deferred();
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        messageTimeoutSecs: 0,
        customSendMessage: transport.send,
      },
    });
    const handler = {
      type: BusEventType.PRE_RECEIVE as const,
      handler: async (event: BusEventPreReceive) => {
        if (event.data.id === 'old-response') {
          oldFinalEntered.resolve();
          await releaseOldFinal.promise;
        }
      },
    };
    mount.instance.on(handler);
    let first: Promise<void>;
    let second: Promise<void>;
    let third: Promise<void>;
    let oldFinal: Promise<void>;
    try {
      await act(async () => {
        first = mount.instance.messaging.send('Old generation request');
        void first.catch((): void => undefined);
      });
      await bounded(transport.firstEntered.promise, 'Old real transport entry');
      await act(async () => {
        oldFinal = mount.instance.messaging.addMessageChunk(
          finalChunk('old-response', [textItem('Obsolete final text')], {
            request_id: requests[0].id,
          })
        );
        void oldFinal.catch((): void => undefined);
      });
      await bounded(oldFinalEntered.promise, 'Old final pre-receive entry');
      await act(() => mount.instance.messaging.restartConversation());
      await bounded(first, 'Restarted old send');
      expect(signals[0].aborted).toBe(true);
      await act(async () => {
        second = mount.instance.messaging.send('Current generation request');
        void second.catch((): void => undefined);
      });
      await bounded(
        transport.secondEntered.promise,
        'Current real producer entry'
      );
      expect(mount.instance.state.get().status).toBe('submitted');
      await act(async () => {
        third = mount.instance.messaging.send('Queued current successor');
        void third.catch((): void => undefined);
        releaseOldFinal.resolve();
        await bounded(oldFinal, 'Obsolete final settlement');
        await bounded(second, 'Current streaming send after old queue drains');
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Current streamed text')
      );
      expect(requests.map(({ input }) => input.text)).toEqual([
        'Old generation request',
        'Current generation request',
      ]);
      expect(mount.instance.state.get().status).toBe('streaming');
      expect(mainPanelText()).toContain('Current streamed text');
      expect(mainPanelText()).not.toContain('Obsolete final text');
      expect(signals[1].aborted).toBe(false);
      await addChunk(mount.instance, {
        ...partialText('old-response', 'old-text', 'Late obsolete partial'),
        streaming_metadata: {
          response_id: 'old-response',
          request_id: requests[0].id,
        },
      });
      expect(mainPanelText()).not.toContain('Late obsolete partial');
      expect(mount.instance.state.get().status).toBe('streaming');
      expect(requests).toHaveLength(2);
      await addChunk(
        mount.instance,
        finalChunk('current-response', [textItem('Current final text')], {
          request_id: requests[1].id,
        })
      );
      await bounded(third, 'Current queued successor');
      expect(requests.map(({ input }) => input.text)).toEqual([
        'Old generation request',
        'Current generation request',
        'Queued current successor',
      ]);
      expect(signals[2].aborted).toBe(false);
      await waitFor(() =>
        expect(mainPanelText()).toContain('Current final text')
      );
      expect(mount.instance.state.get().status).toBe('ready');
    } finally {
      releaseOldFinal.resolve();
      transport.finishFirst.resolve();
      mount.instance.off(handler);
      try {
        await act(async () => {
          await mount.instance.messaging.stop();
          await bounded(
            Promise.allSettled([
              first,
              second,
              third,
              oldFinal,
              ...transport.work,
            ]),
            'Owned generation cleanup'
          );
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('skips a globally queued chunk when its target is removed and replaced', async () => {
    const entered = deferred();
    const release = deferred();
    const calls: string[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    const handler = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE as const,
      handler: async (event: BusEventChunkUserDefinedResponse) => {
        const value = event.data.messageItem.user_defined?.value;
        calls.push(String(value));
        if (value === 'barrier') {
          entered.resolve();
          await release.promise;
        }
      },
    };
    mount.instance.on(handler);
    let blocker: Promise<void>;
    let queued: Promise<void>;
    try {
      await addChunk(
        mount.instance,
        partialUserDefined('clean-chunk', 'custom', { value: 'clean' })
      );
      expect(calls).toEqual(['clean']);
      await addChunk(
        mount.instance,
        finalChunk('clean-chunk', [textItem('Clean chunk completed')])
      );
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Original queued target', 'queued-target')
        )
      );
      await act(async () => {
        blocker = mount.instance.messaging.addMessageChunk(
          partialUserDefined('chunk-barrier', 'custom', { value: 'barrier' })
        );
        void blocker.catch((): void => undefined);
      });
      await bounded(entered.promise, 'Actual chunk barrier callback');
      await act(async () => {
        queued = mount.instance.messaging.addMessageChunk(
          partialUserDefined('queued-target', 'custom', { value: 'obsolete' })
        );
        void queued.catch((): void => undefined);
        await mount.instance.messaging.removeMessages(['queued-target']);
        await mount.instance.messaging.addMessage(
          textResponse('Current queued target', 'queued-target')
        );
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Current queued target')
      );
      await act(async () => {
        release.resolve();
        await bounded(
          Promise.all([blocker, queued]),
          'Queued chunk settlement'
        );
      });
      expect(calls).toEqual(['clean', 'barrier']);
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'queued-target')
      ).toMatchObject({
        output: { generic: [{ text: 'Current queued target' }] },
      });
      expect(mainPanelText()).toContain('Current queued target');
    } finally {
      release.resolve();
      mount.instance.off(handler);
      try {
        await act(async () => {
          await bounded(
            Promise.allSettled([blocker, queued]),
            'Owned chunk queue cleanup'
          );
          await mount.instance.messaging.stop();
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('releases a queued request when its actual legacy final is canceled', async () => {
    const requests: string[] = [];
    const received: string[] = [];
    let firstID: string;
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request, _options, instance) => {
          requests.push(request.input.text);
          if (request.input.text === 'Cancelable legacy turn') {
            firstID = request.id;
            await instance.messaging.addMessageChunk({
              ...partialText(
                'canceled-legacy',
                'text',
                'Visible legacy partial'
              ),
              streaming_metadata: {
                response_id: 'canceled-legacy',
                request_id: request.id,
              },
            });
          } else {
            await instance.messaging.addMessage(
              textResponse('Accepted successor reply', 'successor-reply')
            );
          }
        },
      },
    });
    const handlers: TypeAndHandler[] = [
      {
        type: BusEventType.PRE_RECEIVE,
        handler: (event: BusEventPreReceive): void => {
          if (event.data.id === 'canceled-legacy') {
            event.cancel = true;
          }
        },
      },
      {
        type: BusEventType.RECEIVE,
        handler: (event: BusEventReceive): void => {
          received.push(event.data.id);
        },
      },
    ];
    mount.instance.on(handlers);
    let first: Promise<void>;
    let queued: Promise<void>;
    try {
      await act(async () => {
        first = mount.instance.messaging.send('Cancelable legacy turn');
        void first.catch((): void => undefined);
        await bounded(first, 'First legacy transport return');
      });
      await waitFor(() =>
        expect(mainPanelText()).toContain('Visible legacy partial')
      );
      expect(mount.instance.state.get().status).toBe('streaming');
      await act(async () => {
        queued = mount.instance.messaging.send('Queued after canceled final');
        void queued.catch((): void => undefined);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
      expect(requests).toEqual(['Cancelable legacy turn']);
      await addChunk(
        mount.instance,
        finalChunk(
          'canceled-legacy',
          [textItem('Canceled legacy completed text')],
          { request_id: firstID }
        )
      );
      await bounded(queued, 'Queued successor after canceled final');
      expect(requests).toEqual([
        'Cancelable legacy turn',
        'Queued after canceled final',
      ]);
      expect(received).toEqual(['successor-reply']);
      expect(
        mount.instance.state
          .get()
          .messages.some(({ id }) => id === 'canceled-legacy')
      ).toBe(false);
      await waitFor(() =>
        expect(mainPanelText()).toContain('Accepted successor reply')
      );
      expect(mainPanelText()).not.toContain('Canceled legacy completed text');
      expect(mount.instance.state.get().status).toBe('ready');
    } finally {
      mount.instance.off(handlers);
      try {
        await act(async () => {
          await mount.instance.messaging.stop();
          await bounded(
            Promise.allSettled([first, queued]),
            'Owned canceled-final cleanup'
          );
        });
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });
});
