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
  type BusEventPreSend,
} from '../../types/events/eventBusTypes';
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

describe('SDK public renamed requests', () => {
  it('owns a response and stops a renamed request while its pre-send handler is held', async () => {
    const sent: string[] = [];
    await withSDK(
      async (sdk) => {
        const entered = gate();
        const release = gate();
        const handler: ChatSDKHandlers = {
          type: BusEventType.PRE_SEND,
          handler: async (event: BusEventPreSend) => {
            if (event.data.input.text === 'Rename before transport') {
              event.data.id = 'renamed-before-transport';
              entered.resolve();
              await release.promise;
            }
          },
        };
        sdk.on(handler);
        const sending = sdk.messaging.send('Rename before transport');
        void sending.catch((): void => undefined);
        let stopping: Promise<void>;
        try {
          await bounded(entered.promise, 'Renamed pre-send entry');
          expect(sent).toEqual([]);
          await sdk.messaging.upsertMessage(
            'early-owned-reply',
            MessageState.STREAMING,
            () => ({
              ...textResponse(
                'early-owned-reply',
                'Reply owned by the renamed request'
              ),
              request_id: 'renamed-before-transport',
            })
          );
          expect(sdk.state.get().status).toBe('streaming');
          stopping = sdk.messaging.stop();
          void stopping.catch((): void => undefined);
          await bounded(stopping, 'Stop during pre-send');
          expect(sdk.state.get().status).toBe('ready');
          expect(
            sdk.state
              .get()
              .messages.find(({ id }) => id === 'early-owned-reply')
          ).toMatchObject({
            output: {
              generic: [{ text: 'Reply owned by the renamed request' }],
            },
          });
          release.resolve();
          await bounded(sending, 'Stopped pre-send');
          await new Promise<void>((resolve) => setImmediate(resolve));
          expect(sent).toEqual([]);
          sdk.off(handler);
          await sdk.messaging.send('Fresh transport');
          expect(sent).toEqual(['Fresh transport']);
          expect(sdk.state.get().status).toBe('ready');
        } finally {
          release.resolve();
          sdk.off(handler);
          await bounded(
            Promise.allSettled([sending, stopping, release.promise]),
            'Owned pre-send cleanup'
          );
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      },
      async (request) => {
        sent.push(request.input.text);
      }
    );
  });

  it('recovers a renamed streamed transport failure with a successful renamed next request', async () => {
    const ids: string[] = [];
    const failure = new Error('Owned renamed transport failure');
    await withSDK(
      async (sdk) => {
        let next = 0;
        const handler: ChatSDKHandlers = {
          type: BusEventType.PRE_SEND,
          handler: (event: BusEventPreSend): void => {
            next += 1;
            event.data.id = `consumer-request-${next}`;
          },
        };
        sdk.on(handler);
        try {
          await expect(sdk.messaging.send('Fail renamed turn')).rejects.toThrow(
            failure.message
          );
          expect(ids).toEqual(['consumer-request-1']);
          expect(sdk.state.get().status).toBe('error');
          await sdk.messaging.send('Recover renamed turn');
          expect(ids).toEqual(['consumer-request-1', 'consumer-request-2']);
          expect(sdk.state.get().status).toBe('ready');
          expect(
            sdk.state.get().messages.find(({ id }) => id === 'renamed-recovery')
          ).toMatchObject({
            request_id: 'consumer-request-2',
            output: { generic: [{ text: 'Successful renamed reply' }] },
          });
        } finally {
          sdk.off(handler);
        }
      },
      async (request, _options, sdk) => {
        ids.push(request.id);
        if (request.input.text === 'Fail renamed turn') {
          await sdk.messaging.upsertMessage(
            'renamed-failure-stream',
            MessageState.STREAMING,
            () => ({
              ...textResponse(
                'renamed-failure-stream',
                'Published renamed partial'
              ),
              request_id: request.id,
            })
          );
          throw failure;
        }
        await sdk.messaging.upsertMessage(
          'renamed-recovery',
          MessageState.COMPLETE,
          () => ({
            ...textResponse('renamed-recovery', 'Successful renamed reply'),
            request_id: request.id,
          })
        );
      }
    );
  });
});
