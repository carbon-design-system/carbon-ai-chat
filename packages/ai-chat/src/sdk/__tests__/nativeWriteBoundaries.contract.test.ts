/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKHandlers } from '../index';
import { BusEventType } from '../../types/events/eventBusTypes';
import { MessageState } from '../../types/config/MessagingConfig';
import {
  MessageResponseTypes,
  type GenericItem,
  type MessageResponse,
} from '../../types/messaging/Messages';
import { textResponse, withSDK } from './helpers/publicContract';

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

function gridMessage(cells: Array<{ items?: GenericItem[] }>): MessageResponse {
  return {
    id: 'latest-grid',
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.GRID,
          streaming_metadata: { id: 'grid' },
          columns: cells.map(() => ({ width: '1' })),
          rows: [{ cells }],
        } as GenericItem,
      ],
    },
  };
}

describe('SDK native write boundaries', () => {
  it('gives an updater the latest partial grid while the public model retains the last usable grid', async () => {
    await withSDK(async (sdk) => {
      const cell = {
        items: textResponse(undefined, 'Kept cell').output.generic,
      };
      const initial = gridMessage([cell]);
      const partial = gridMessage([cell, {}]);
      await sdk.messaging.upsertMessage(
        initial.id,
        MessageState.STREAMING,
        () => initial
      );
      await sdk.messaging.upsertMessage(
        partial.id,
        MessageState.STREAMING,
        () => partial
      );
      const retained = sdk.state
        .get()
        .messageItems.find((item) => item.messageID === initial.id);
      expect(retained.item).toEqual(initial.output.generic[0]);
      await sdk.messaging.upsertMessage(
        initial.id,
        MessageState.COMPLETE,
        (previous) => {
          expect(previous.output.generic).toEqual(partial.output.generic);
          return gridMessage([cell]);
        }
      );
      const completed = sdk.state
        .get()
        .messages.find((item) => item.id === initial.id);
      if (!completed || !('output' in completed)) {
        throw new Error('Expected the completed public response');
      }
      expect(completed.output.generic).toEqual(initial.output.generic);
      expect(retained.item).toEqual(initial.output.generic[0]);
    });
  });

  it('discards a native updater that returns after a completed public restart', async () => {
    await withSDK(async (sdk) => {
      let enter: () => void;
      let release: () => void;
      const entered = new Promise<void>((resolve) => {
        enter = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let receives = 0;
      const receive: ChatSDKHandlers = {
        type: BusEventType.RECEIVE,
        handler: () => {
          receives += 1;
        },
      };
      sdk.on(receive);
      const pending = sdk.messaging.upsertMessage(
        'stale-updater',
        MessageState.COMPLETE,
        async () => {
          enter();
          await gate;
          return textResponse('stale-updater', 'Stale answer');
        }
      );
      void pending.catch((): void => undefined);
      try {
        await bounded(entered, 'Updater entry');
        await bounded(sdk.messaging.restartConversation(), 'Public restart');
        release();
        await bounded(pending, 'Stale native write');
        expect(
          sdk.state.get().messages.some((item) => item.id === 'stale-updater')
        ).toBe(false);
        expect(receives).toBe(0);
        await sdk.messaging.upsertMessage('fresh', MessageState.COMPLETE, () =>
          textResponse('fresh', 'Fresh answer')
        );
        expect(
          sdk.state.get().messages.find((item) => item.id === 'fresh')
        ).toMatchObject({ output: { generic: [{ text: 'Fresh answer' }] } });
        expect(receives).toBe(1);
      } finally {
        release();
        try {
          await bounded(pending, 'Owned updater cleanup');
        } finally {
          sdk.off(receive);
        }
      }
    });
  });
});
