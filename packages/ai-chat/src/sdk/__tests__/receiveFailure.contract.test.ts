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
  type BusEventReceive,
} from '../../types/events/eventBusTypes';
import {
  storedResponse,
  textResponse,
  texts,
  withSDK,
} from './helpers/publicContract';

describe('SDK native receive failure', () => {
  it('logs a rejected receive handler, resolves its write and accepts the next real response', async () => {
    const failure = new Error('Owned native receive failure');
    const logged = vi.spyOn(console, 'error');
    try {
      await withSDK(async (sdk) => {
        const received: string[] = [];
        const handler: ChatSDKHandlers = {
          type: BusEventType.RECEIVE,
          handler: async (event: BusEventReceive) => {
            received.push(event.data.id);
            if (event.data.id === 'receive-rejected') {
              throw failure;
            }
          },
        };
        sdk.on(handler);
        try {
          await expect(
            sdk.messaging.upsertMessage(
              'receive-rejected',
              MessageState.COMPLETE,
              () => textResponse('receive-rejected', 'Retained first text')
            )
          ).resolves.toBeUndefined();
          expect(logged).toHaveBeenCalledWith(
            expect.stringContaining('receive handler threw'),
            failure
          );
          expect(
            texts(storedResponse(sdk.state.get(), 'receive-rejected'))
          ).toEqual(['Retained first text']);
          await sdk.messaging.upsertMessage(
            'receive-recovery',
            MessageState.COMPLETE,
            () => textResponse('receive-recovery', 'Accepted later text')
          );
          expect(received).toEqual(['receive-rejected', 'receive-recovery']);
          expect(
            texts(storedResponse(sdk.state.get(), 'receive-recovery'))
          ).toEqual(['Accepted later text']);
          expect(sdk.state.get().status).toBe('ready');
        } finally {
          sdk.off(handler);
        }
      });
    } finally {
      logged.mockRestore();
    }
  });
});
