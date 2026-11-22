/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { MessageResponse, MessageState } from '../../../aiChatEntry';
import {
  byRole,
  contractChat,
  contractSetup,
  userDefinedItem,
} from '../helpers/contract';

type PayloadBytes = Uint8Array & {
  metadata: { label: string };
  self?: PayloadBytes;
};

// @covers instance.messaging.upsertMessage state.messages state.messageItems
describe('typed-array public message copies', () => {
  contractSetup();

  it('renders a complete typed-array payload with frozen copied metadata around a cycle', async () => {
    const errors: string[] = [];
    const cleanup = { unmount: undefined as (() => void) | undefined };
    const mounted = await contractChat({
      messaging: { skipWelcome: true },
      openChatByDefault: true,
      renderUserDefinedResponse: () => (
        <p role="status" aria-label="Typed-array response">
          Typed-array response
        </p>
      ),
      onError: (error) => {
        errors.push(
          error.errorType +
            ': ' +
            String((error.otherData as { error?: unknown })?.error)
        );
        // Unmount a failed host so repeated render errors cannot keep the test running.
        queueMicrotask(() => cleanup.unmount?.());
      },
    });
    cleanup.unmount = mounted.unmount;
    const { instance } = mounted;
    const bytes: PayloadBytes = Object.assign(new Uint8Array([1, 2]), {
      metadata: { label: 'copied' },
    });
    bytes.self = bytes;
    let writeError: unknown;
    try {
      await act(async () => {
        await instance.messaging.upsertMessage(
          'typed-array-complete',
          MessageState.COMPLETE,
          () => ({
            id: 'typed-array-complete',
            output: { generic: [userDefinedItem('bytes', { bytes })] },
          })
        );
      });
    } catch (error) {
      writeError = error;
    }
    expect(errors).toEqual([]);
    expect(writeError).toBeUndefined();
    await waitFor(
      () => {
        expect(errors).toEqual([]);
        expect(byRole('status', 'Typed-array response')).toHaveTextContent(
          'Typed-array response'
        );
      },
      { timeout: 10000 }
    );
    const state = instance.getState();
    const message = state.messages.find(
      (value) => value.id === 'typed-array-complete'
    ) as MessageResponse;
    const entry = state.messageItems.find(
      (value) => value.messageID === 'typed-array-complete'
    );
    const messagePayload = message.output.generic[0].user_defined;
    const itemPayload = entry.item.user_defined;
    const copied = messagePayload.bytes as PayloadBytes;
    expect(Object.isFrozen(messagePayload)).toBe(true);
    expect(Object.isFrozen(itemPayload)).toBe(true);
    expect(itemPayload.bytes).toBe(copied);
    expect(copied).not.toBe(bytes);
    expect(ArrayBuffer.isView(copied)).toBe(true);
    expect(Array.from(copied)).toEqual([1, 2]);
    expect(copied.self).toBe(copied);
    expect(copied.metadata).toEqual({ label: 'copied' });
    expect(copied.metadata).not.toBe(bytes.metadata);
    expect(Object.isFrozen(copied.metadata)).toBe(true);
    expect(Object.isFrozen(copied)).toBe(false);
    copied[0] = 9;
    expect(copied[0]).toBe(9);
    expect(bytes[0]).toBe(1);
    let currentByte = NaN;
    await act(async () => {
      await instance.messaging.upsertMessage(
        'typed-array-complete',
        MessageState.COMPLETE,
        (current) => {
          const currentBytes = (current as MessageResponse).output.generic[0]
            .user_defined.bytes as PayloadBytes;
          currentByte = currentBytes[0];
          return current as MessageResponse;
        }
      );
    });
    expect(currentByte).toBe(1);
    expect(copied[0]).toBe(9);
    expect(Object.isFrozen(bytes)).toBe(false);
    expect(Object.isFrozen(bytes.metadata)).toBe(false);
  });

  it('still freezes empty typed arrays, DataViews and ArrayBuffers in public copies', async () => {
    const { instance } = await contractChat({
      messaging: { skipWelcome: true },
    });
    await act(async () => {
      await instance.messaging.upsertMessage(
        'freezable-views',
        MessageState.COMPLETE,
        () => ({
          id: 'freezable-views',
          output: {
            generic: [
              userDefinedItem('views', {
                empty: new Uint8Array(0),
                dataView: new DataView(new ArrayBuffer(1)),
                buffer: new ArrayBuffer(1),
              }),
            ],
          },
        })
      );
    });
    const message = instance
      .getState()
      .messages.find(
        (value) => value.id === 'freezable-views'
      ) as MessageResponse;
    const payload = message.output.generic[0].user_defined;
    expect(Object.isFrozen(payload)).toBe(true);
    expect(Object.isFrozen(payload.empty)).toBe(true);
    expect(Object.isFrozen(payload.dataView)).toBe(true);
    expect(Object.isFrozen(payload.buffer)).toBe(true);
  });
});
