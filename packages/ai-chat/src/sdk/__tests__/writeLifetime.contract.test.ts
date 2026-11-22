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
import { MessageState } from '../../types/config/MessagingConfig';
import {
  BusEventType,
  type BusEventPreReceive,
  type BusEventReceive,
  type BusEventUserDefinedResponse,
} from '../../types/events/eventBusTypes';
import {
  MessageResponseTypes,
  type MessageResponse,
} from '../../types/messaging/Messages';
import { textResponse, withSDK } from './helpers/publicContract';

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

function nested(id: string): MessageResponse {
  return {
    id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.CARD,
          body: [
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { value: 'first' },
            },
            {
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { value: 'second' },
            },
          ],
        },
      ],
    },
  };
}

describe('SDK public write lifetime', () => {
  it('keeps a same-ID replacement when an earlier updater returns after removal', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const release = gate();
      const received: string[] = [];
      const handler: ChatSDKHandlers = {
        type: BusEventType.RECEIVE,
        handler: (event: BusEventReceive): void => {
          received.push(event.data.id);
        },
      };
      await sdk.messaging.upsertMessage('reused', MessageState.COMPLETE, () =>
        textResponse('reused', 'Original response')
      );
      sdk.on(handler);
      const pending = sdk.messaging.upsertMessage(
        'reused',
        MessageState.COMPLETE,
        async () => {
          entered.resolve();
          await release.promise;
          return textResponse('reused', 'Obsolete updater result');
        }
      );
      void pending.catch((): void => undefined);
      try {
        await bounded(entered.promise, 'Original updater entry');
        await sdk.messaging.removeMessages(['reused']);
        await sdk.messaging.upsertMessage('reused', MessageState.COMPLETE, () =>
          textResponse('reused', 'Current replacement')
        );
        expect(received).toEqual(['reused']);
        release.resolve();
        await bounded(pending, 'Obsolete updater settlement');
        expect(
          sdk.state.get().messages.find(({ id }) => id === 'reused')
        ).toMatchObject({
          output: { generic: [{ text: 'Current replacement' }] },
        });
        expect(received).toEqual(['reused']);
      } finally {
        release.resolve();
        try {
          await bounded(Promise.allSettled([pending]), 'Owned updater cleanup');
        } finally {
          sdk.off(handler);
        }
      }
    });
  });

  it('stops nested sibling callbacks when the first callback removes their response', async () => {
    await withSDK(async (sdk) => {
      const calls: string[] = [];
      const handler: ChatSDKHandlers = {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: async (event: BusEventUserDefinedResponse) => {
          const id = event.data.fullMessage.id;
          calls.push(`${id}:${event.data.message.user_defined.value}`);
          if (id === 'removed-nested') {
            await sdk.messaging.removeMessages([id]);
          }
        },
      };
      sdk.on(handler);
      try {
        await sdk.messaging.upsertMessage(
          'clean-nested',
          MessageState.COMPLETE,
          () => nested('clean-nested')
        );
        expect(calls).toEqual(['clean-nested:first', 'clean-nested:second']);
        await sdk.messaging.upsertMessage(
          'removed-nested',
          MessageState.COMPLETE,
          () => nested('removed-nested')
        );
        expect(calls).toEqual([
          'clean-nested:first',
          'clean-nested:second',
          'removed-nested:first',
        ]);
        expect(
          sdk.state.get().messages.some(({ id }) => id === 'removed-nested')
        ).toBe(false);
        expect(
          sdk.state.get().messages.some(({ id }) => id === 'clean-nested')
        ).toBe(true);
      } finally {
        sdk.off(handler);
      }
    });
  });

  it('removes a canceled native completion and accepts a later request through the same receive handler', async () => {
    const requests: string[] = [];
    let requestID: string;
    await withSDK(
      async (sdk) => {
        const received: string[] = [];
        const handlers: ChatSDKHandlers = [
          {
            type: BusEventType.PRE_RECEIVE,
            handler: (event: BusEventPreReceive): void => {
              if (event.data.id === 'canceled-stream') {
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
        const first = sdk.messaging.send('Stream this request');
        void first.catch((): void => undefined);
        let second: Promise<void>;
        let completion: Promise<void>;
        try {
          await bounded(first, 'First streaming send');
          expect(sdk.state.get().status).toBe('streaming');
          expect(
            sdk.state.get().messages.some(({ id }) => id === 'canceled-stream')
          ).toBe(true);
          sdk.on(handlers);
          completion = sdk.messaging.upsertMessage(
            'canceled-stream',
            MessageState.COMPLETE,
            () => ({
              ...textResponse('canceled-stream', 'Canceled completed text'),
              request_id: requestID,
            })
          );
          void completion.catch((): void => undefined);
          await bounded(completion, 'Canceled completion');
          expect(
            sdk.state.get().messages.some(({ id }) => id === 'canceled-stream')
          ).toBe(false);
          expect(received).toEqual([]);
          expect(sdk.state.get().status).toBe('ready');
          second = sdk.messaging.send('Request after cancellation');
          void second.catch((): void => undefined);
          await bounded(second, 'Post-cancellation request');
          expect(requests).toEqual([
            'Stream this request',
            'Request after cancellation',
          ]);
          expect(received).toEqual(['after-cancel-reply']);
          expect(
            sdk.state
              .get()
              .messages.find(({ id }) => id === 'after-cancel-reply')
          ).toMatchObject({
            output: {
              generic: [{ text: 'Accepted after native cancellation' }],
            },
          });
          expect(sdk.state.get().status).toBe('ready');
        } finally {
          sdk.off(handlers);
          await bounded(sdk.messaging.stop(), 'Owned stream cleanup');
          await bounded(
            Promise.allSettled([first, second, completion]),
            'Owned cancellation cleanup'
          );
        }
      },
      async (request, _options, sdk) => {
        requests.push(request.input.text);
        if (request.input.text === 'Stream this request') {
          requestID = request.id;
          await sdk.messaging.upsertMessage(
            'canceled-stream',
            MessageState.STREAMING,
            () => ({
              ...textResponse('canceled-stream', 'Published partial text'),
              request_id: request.id,
            })
          );
        } else {
          await sdk.messaging.upsertMessage(
            'after-cancel-reply',
            MessageState.COMPLETE,
            () =>
              textResponse(
                'after-cancel-reply',
                'Accepted after native cancellation'
              )
          );
        }
      }
    );
  });

  it('keeps a previously settled response when a later completion is canceled', async () => {
    await withSDK(async (sdk) => {
      await sdk.messaging.upsertMessage('settled', MessageState.ERROR, () =>
        textResponse('settled', 'Retained settled text')
      );
      const received: string[] = [];
      const handlers: ChatSDKHandlers = [
        {
          type: BusEventType.PRE_RECEIVE,
          handler: (event: BusEventPreReceive): void => {
            if (event.data.id === 'settled') {
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
      sdk.on(handlers);
      try {
        await sdk.messaging.upsertMessage(
          'settled',
          MessageState.COMPLETE,
          () => textResponse('settled', 'Rejected replacement text')
        );
        expect(
          sdk.state.get().messages.find(({ id }) => id === 'settled')
        ).toMatchObject({
          output: { generic: [{ text: 'Retained settled text' }] },
        });
        expect(received).toEqual([]);
        await sdk.messaging.upsertMessage('fresh', MessageState.COMPLETE, () =>
          textResponse('fresh', 'Fresh accepted response')
        );
        expect(sdk.state.get().messages.some(({ id }) => id === 'fresh')).toBe(
          true
        );
        expect(received).toEqual(['fresh']);
      } finally {
        sdk.off(handlers);
      }
    });
  });

  it('skips a queued receive callback after its response is removed and replaced', async () => {
    await withSDK(async (sdk) => {
      const entered = gate();
      const victimPreReceive = gate();
      const release = gate();
      const received: string[] = [];
      const handlers: ChatSDKHandlers = [
        {
          type: BusEventType.PRE_RECEIVE,
          handler: (event: BusEventPreReceive): void => {
            if (event.data.id === 'queued-victim') {
              victimPreReceive.resolve();
            }
          },
        },
        {
          type: BusEventType.RECEIVE,
          handler: async (event: BusEventReceive) => {
            received.push(event.data.id);
            if (event.data.id === 'receive-barrier') {
              entered.resolve();
              await release.promise;
            }
          },
        },
      ];
      sdk.on(handlers);
      const barrier = sdk.messaging.upsertMessage(
        'receive-barrier',
        MessageState.COMPLETE,
        () => textResponse('receive-barrier', 'Real receive barrier')
      );
      void barrier.catch((): void => undefined);
      let victim: Promise<void>;
      try {
        await bounded(entered.promise, 'First receive handler entry');
        victim = sdk.messaging.upsertMessage(
          'queued-victim',
          MessageState.COMPLETE,
          () => textResponse('queued-victim', 'Obsolete queued response')
        );
        void victim.catch((): void => undefined);
        await bounded(victimPreReceive.promise, 'Second pre-receive entry');
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(received).toEqual(['receive-barrier']);
        await sdk.messaging.removeMessages(['queued-victim']);
        await sdk.messaging.upsertMessage(
          'queued-victim',
          MessageState.STREAMING,
          () => textResponse('queued-victim', 'Current queued replacement')
        );
        release.resolve();
        await bounded(
          Promise.all([barrier, victim]),
          'Queued receive settlement'
        );
        expect(received).toEqual(['receive-barrier']);
        expect(
          sdk.state.get().messages.find(({ id }) => id === 'queued-victim')
        ).toMatchObject({
          output: { generic: [{ text: 'Current queued replacement' }] },
        });
      } finally {
        release.resolve();
        try {
          await bounded(
            Promise.allSettled([barrier, victim]),
            'Owned receive queue cleanup'
          );
        } finally {
          sdk.off(handlers);
        }
      }
    });
  });
});
