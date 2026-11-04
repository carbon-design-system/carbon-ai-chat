/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  BusEventPreReceive,
  BusEventType,
} from '../../../../src/types/events/eventBusTypes';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';

function response(id: string, text: string): MessageResponse {
  return {
    id,
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text }],
    },
  };
}

describe('renamed receive lifetime', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('preserves renaming after earlier and unrelated removals', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    await instance.messaging.removeMessages(['destination']);
    const message = response('temporary', 'Accepted');
    const receive = jest.fn();
    instance.on([
      {
        type: BusEventType.PRE_RECEIVE,
        handler: async (event: BusEventPreReceive) => {
          event.data.id = 'destination';
          await instance.messaging.removeMessages(['unrelated']);
        },
      },
      { type: BusEventType.RECEIVE, handler: receive },
    ]);

    await act(async () => {
      await instance.messaging.addMessage(message);
    });

    expect(store.getState().allMessagesByID.destination).not.toBe(message);
    expect(store.getState().allMessagesByID.destination).toEqual(message);
    expect(store.getState().allMessagesByID.temporary).toBeUndefined();
    expect(receive).toHaveBeenCalledTimes(1);
    expect(receive.mock.calls[0][0].data).toBe(message);
  });

  it.each(['before', 'after'])(
    'discards a pending receive renamed %s its destination is removed',
    async (renameTiming) => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      await act(async () => {
        await instance.messaging.addMessage(
          response('destination', 'Original')
        );
      });
      const entered = resolvablePromise();
      const release = resolvablePromise();
      const stale = response('temporary', 'Stale');
      const receive = jest.fn();
      instance.on([
        {
          type: BusEventType.PRE_RECEIVE,
          handler: async (event: BusEventPreReceive) => {
            if (event.data !== stale) {
              return;
            }
            if (renameTiming === 'before') {
              event.data.id = 'destination';
            }
            entered.doResolve();
            await release;
            event.data.id = 'destination';
          },
        },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);
      const pending = instance.messaging.addMessage(stale);
      try {
        await entered;
        await act(async () => {
          await instance.messaging.removeMessages(['destination']);
          await instance.messaging.upsertMessage(
            'destination',
            MessageState.STREAMING,
            () => response('destination', 'Replacement')
          );
        });
        const replacement = store.getState().allMessagesByID.destination;
        await act(async () => {
          release.doResolve();
          await pending;
        });

        expect(stale.id).toBe('destination');
        expect(store.getState().allMessagesByID.destination).toBe(replacement);
        expect(store.getState().allMessagesByID.temporary).toBeUndefined();
        expect((replacement as MessageResponse).output.generic).toEqual([
          { response_type: MessageResponseTypes.TEXT, text: 'Replacement' },
        ]);
        expect(receive).not.toHaveBeenCalled();
      } finally {
        release.doResolve();
        await pending;
      }
    }
  );
});
