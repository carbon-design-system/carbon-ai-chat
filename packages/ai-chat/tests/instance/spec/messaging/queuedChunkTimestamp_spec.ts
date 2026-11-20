/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  type MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

beforeEach(setupBeforeEach);
afterEach(setupAfterEach);

it('timestamps the first public chunk when its queued updater runs', async () => {
  const { instance, store, serviceManager } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  const entered = resolvablePromise<void>();
  const blocked = resolvablePromise<MessageResponse>();
  const failure = new Error('earlier updater failed');
  const messageID = 'queued-timestamp';
  const first = instance.messaging.upsertMessage(
    messageID,
    MessageState.STREAMING,
    (previous) => {
      expect(previous).toBeUndefined();
      entered.doResolve();
      return blocked;
    }
  );
  const rejected = expect(first).rejects.toBe(failure);
  await entered;

  const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
  const writes = jest.spyOn(serviceManager.messageUpsertCoordinator, 'upsert');
  let chunkSettled = false;
  let chunk: Promise<void>;
  try {
    chunk = instance.messaging
      .addMessageChunk({
        streaming_metadata: { response_id: messageID },
        partial_item: {
          response_type: MessageResponseTypes.TEXT,
          text: 'first chunk',
          streaming_metadata: { id: 'item' },
        },
      })
      .then(() => {
        chunkSettled = true;
      });
    await waitFor(() =>
      expect(writes).toHaveBeenCalledWith(
        messageID,
        MessageState.STREAMING,
        expect.any(Function),
        expect.objectContaining({ origin: 'chunk' })
      )
    );
    expect(chunkSettled).toBe(false);
    expect(store.getState().allMessagesByID[messageID]).toBeUndefined();

    now.mockReturnValue(2000);
    await act(async () => {
      blocked.doReject(failure);
      await Promise.all([rejected, chunk]);
    });
    expect(chunkSettled).toBe(true);
    expect(store.getState().allMessagesByID[messageID].history.timestamp).toBe(
      2000
    );
    expect(
      store.getState().allMessageItemsByID[`${messageID}-item`].item
    ).toMatchObject({ text: 'first chunk' });
  } finally {
    try {
      await act(async () => {
        blocked.doReject(failure);
        await Promise.all([rejected, chunk]);
      });
    } finally {
      writes.mockRestore();
      now.mockRestore();
    }
  }
});
