/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
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

function response(id: string, text: string): MessageResponse {
  return {
    id,
    output: { generic: [{ response_type: MessageResponseTypes.TEXT, text }] },
  };
}

it('keeps a replacement native tail and lease when an older removed write rejects', async () => {
  const { instance, store } =
    await renderChatAndGetInstanceWithStore(createBaseConfig());
  await instance.messaging.addMessage(response('same', 'original'));
  const oldEntered = resolvablePromise<void>();
  const oldResult = resolvablePromise<MessageResponse>();
  const newEntered = resolvablePromise<void>();
  const newResult = resolvablePromise<MessageResponse>();
  const failure = new Error('removed updater failed');
  const oldWrite = instance.messaging.upsertMessage(
    'same',
    MessageState.COMPLETE,
    () => {
      oldEntered.doResolve();
      return oldResult;
    }
  );
  const rejected = expect(oldWrite).rejects.toBe(failure);
  let replacement: Promise<void>;
  let queued: Promise<void>;
  const successor = jest.fn(() => response('same', 'queued'));
  try {
    await oldEntered;
    await instance.messaging.removeMessages(['same']);
    replacement = instance.messaging.upsertMessage(
      'same',
      MessageState.COMPLETE,
      () => {
        newEntered.doResolve();
        return newResult;
      }
    );
    await newEntered;
    oldResult.doReject(failure);
    await rejected;

    queued = instance.messaging.upsertMessage(
      'same',
      MessageState.COMPLETE,
      successor
    );
    await instance.messaging.upsertMessage('other', MessageState.COMPLETE, () =>
      response('other', 'independent')
    );
    expect(store.getState().allMessagesByID.other).toMatchObject(
      response('other', 'independent')
    );
    expect(successor).not.toHaveBeenCalled();
    expect(store.getState().allMessagesByID.same).toBeUndefined();

    await instance.messaging.removeMessages(['same']);
    await act(async () => {
      newResult.doResolve(response('same', 'stale replacement'));
      await Promise.all([replacement, queued]);
    });
    expect(successor).not.toHaveBeenCalled();
    expect(store.getState().allMessagesByID.same).toBeUndefined();
  } finally {
    await act(async () => {
      oldResult.doReject(failure);
      newResult.doResolve(response('same', 'cleanup'));
      await Promise.all([rejected, replacement, queued]);
    });
  }
});

it.each(['addMessage', 'final response'] as const)(
  '%s completes while a native updater for the same ID is held',
  async (route) => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const entered = resolvablePromise<void>();
    const blocked = resolvablePromise<MessageResponse>();
    const failure = new Error('held native updater failed');
    let nativeSettled = false;
    const native = instance.messaging.upsertMessage(
      'held',
      MessageState.STREAMING,
      () => {
        entered.doResolve();
        return blocked;
      }
    );
    const rejected = expect(native).rejects.toBe(failure);
    const settled = native.then(
      () => {
        nativeSettled = true;
      },
      () => {
        nativeSettled = true;
      }
    );
    try {
      await entered;
      expect(store.getState().allMessagesByID.held).toBeUndefined();
      const message = response('held', 'bypassed');
      await act(async () => {
        if (route === 'addMessage') {
          await instance.messaging.addMessage(message);
        } else {
          await instance.messaging.addMessageChunk({
            streaming_metadata: { response_id: 'held' },
            final_response: message,
          });
        }
      });
      expect(nativeSettled).toBe(false);
      const stored = store.getState().allMessagesByID.held;
      expect(stored).toMatchObject(response('held', 'bypassed'));
      blocked.doReject(failure);
      await Promise.all([rejected, settled]);
      expect(store.getState().allMessagesByID.held).toBe(stored);
      const successor = jest.fn((previous: MessageResponse) => previous);
      await instance.messaging.upsertMessage(
        'held',
        MessageState.COMPLETE,
        successor
      );
      expect(successor).toHaveBeenCalledWith(
        expect.objectContaining(response('held', 'bypassed'))
      );
    } finally {
      blocked.doReject(failure);
      await Promise.all([rejected, settled]);
    }
  }
);
