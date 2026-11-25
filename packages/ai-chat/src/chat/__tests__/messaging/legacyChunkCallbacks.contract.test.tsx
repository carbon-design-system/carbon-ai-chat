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
  BusEventType,
  OnErrorType,
  type BusEventChunkUserDefinedResponse,
  type OnErrorData,
} from '../../../aiChatEntry';
import {
  addChunk,
  contractChat,
  contractSetup,
  finalChunk,
  partialUserDefined,
  textItem,
  textResponse,
  userDefinedItem,
} from '../helpers/contract';

describe('public legacy chunk callbacks', () => {
  contractSetup();

  it('commits writable caller event edits and isolates later host mutation from the streamed public value', async () => {
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    const chunk = partialUserDefined('chunk-owned', 'item', {
      value: 'before',
    });
    const handler = (event: BusEventChunkUserDefinedResponse) => {
      if (event.data.messageItem.user_defined?.value === 'before') {
        event.data.messageItem.user_defined.value = 'after';
      }
    };
    const listener = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler,
    };
    mount.instance.on(listener);
    const item = () =>
      mount.instance.state
        .get()
        .messageItems.find((entry) => entry.messageID === 'chunk-owned').item;
    try {
      await addChunk(mount.instance, chunk);
      expect(chunk.partial_item.user_defined.value).toBe('after');
      expect(item().user_defined.value).toBe('after');
      const retained = mount.instance.state.get();
      chunk.partial_item.user_defined.value = 'late host mutation';
      await addChunk(
        mount.instance,
        partialUserDefined('chunk-owned', 'item', { next: 'owned next chunk' })
      );
      expect(item().user_defined).toMatchObject({
        value: 'after',
        next: 'owned next chunk',
      });
      expect(
        retained.messageItems.find((entry) => entry.messageID === 'chunk-owned')
          .item.user_defined.value
      ).toBe('after');
      await addChunk(
        mount.instance,
        finalChunk('chunk-owned', [
          userDefinedItem('item', { value: 'after', next: 'owned next chunk' }),
        ])
      );
    } finally {
      mount.instance.off(listener);
      await act(async () => mount.unmount());
    }
  });

  it('preserves an async falsy chunk rejection without a conversation error and accepts the next chunk', async () => {
    const errors: OnErrorData[] = [];
    const mount = await contractChat({
      messaging: { skipWelcome: true },
      onError: (error) => {
        errors.push(error);
      },
    });
    const listener = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: async () => {
        throw false;
      },
    };
    mount.instance.on(listener);
    try {
      await act(async () => {
        await expect(
          mount.instance.messaging.addMessageChunk(
            partialUserDefined('rejected-chunk', 'item', { value: 'before' })
          )
        ).rejects.toBe(false);
      });
      expect(errors).toEqual([]);
      expect(mount.instance.state.get().status).toBe('ready');
      expect(mount.instance.state.get().error).toBeNull();
      mount.instance.off(listener);
      await addChunk(
        mount.instance,
        finalChunk('next-chunk', [textItem('Healthy later chunk', 'text')])
      );
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'next-chunk')
      ).toMatchObject({
        output: { generic: [{ text: 'Healthy later chunk' }] },
      });
    } finally {
      mount.instance.off(listener);
      await act(async () => mount.unmount());
    }
  });

  it('reports one communication error per send that awaits the same falsy chunk rejection', async () => {
    const errors: OnErrorData[] = [];
    let calls = 0;
    const mount = await contractChat({
      messaging: {
        skipWelcome: true,
        customSendMessage: async (_request, _options, instance) => {
          calls += 1;
          await instance.messaging.addMessageChunk(
            partialUserDefined(`rejected-send-${calls}`, 'item', {
              value: 'before',
            })
          );
        },
      },
      onError: (error) => {
        errors.push(error);
      },
    });
    const listener = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: async () => {
        throw false;
      },
    };
    mount.instance.on(listener);
    try {
      for (const text of ['First failing send', 'Second failing send']) {
        await act(async () => {
          await expect(mount.instance.send(text)).rejects.toBeInstanceOf(Error);
        });
      }
      expect(calls).toBe(2);
      expect(errors.map(({ errorType }) => errorType)).toEqual([
        OnErrorType.MESSAGE_COMMUNICATION,
        OnErrorType.MESSAGE_COMMUNICATION,
      ]);
    } finally {
      mount.instance.off(listener);
      await act(async () => mount.unmount());
    }
  });

  it('keeps a sender-caught chunk callback failure out of onError and finishes its later reply', async () => {
    const errors: OnErrorData[] = [];
    const caught: unknown[] = [];
    const mount = await contractChat({
      messaging: {
        skipWelcome: true,
        customSendMessage: async (request, _options, instance) => {
          await instance.messaging
            .addMessageChunk(
              partialUserDefined('caught-chunk', 'item', { value: 'before' })
            )
            .catch((error): void => {
              caught.push(error);
            });
          await instance.messaging.addMessage({
            ...textResponse('Recovered by sender', 'caught-reply'),
            request_id: request.id,
          });
        },
      },
      onError: (error) => {
        errors.push(error);
      },
    });
    const listener = {
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: async () => {
        throw false;
      },
    };
    mount.instance.on(listener);
    try {
      await act(() => mount.instance.send('Handle the callback failure'));
      expect(caught).toEqual([false]);
      expect(errors).toEqual([]);
      expect(
        mount.instance.state
          .get()
          .messages.find(({ id }) => id === 'caught-reply')
      ).toMatchObject({
        output: { generic: [{ text: 'Recovered by sender' }] },
      });
      expect(mount.instance.state.get().status).toBe('ready');
    } finally {
      mount.instance.off(listener);
      await act(async () => mount.unmount());
    }
  });
});
