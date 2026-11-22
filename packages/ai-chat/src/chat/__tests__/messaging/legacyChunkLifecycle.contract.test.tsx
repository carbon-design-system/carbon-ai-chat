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
import {
  BusEventType,
  MessageResponseTypes,
  MessageState,
  OnErrorType,
  type BusEventUserDefinedResponse,
  type GenericItem,
  type MessageResponse,
  type OnErrorData,
} from '../../../aiChatEntry';
import {
  addChunk,
  allByRole,
  byRole,
  completeText,
  contractChat,
  contractSetup,
  deferred,
  finalChunk,
  mainPanelText,
  partialText,
  recordEvents,
  slotted,
  textItem,
  userDefinedItem,
} from '../helpers/contract';

const schedule = globalThis.setTimeout.bind(globalThis);
const cancel = globalThis.clearTimeout.bind(globalThis);

async function bounded<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof schedule>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = schedule(
          () => reject(new Error(`${label} did not settle`)),
          5000
        );
      }),
    ]);
  } finally {
    cancel(timer);
  }
}

describe('public legacy chunk lifecycle', () => {
  contractSetup();

  it('reveals a chunked grid and its actual nested custom content only at final_response', async () => {
    const errors: OnErrorData[] = [];
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      onError: (error) => {
        errors.push(error);
      },
      renderUserDefinedResponse: () =>
        React.createElement('span', null, 'Nested legacy widget'),
    });
    const events = recordEvents(mount.instance, [
      BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      BusEventType.USER_DEFINED_RESPONSE,
    ]);
    const grid: GenericItem = {
      response_type: MessageResponseTypes.GRID,
      streaming_metadata: { id: 'grid' },
      columns: [{ width: '1' }],
      rows: [
        {
          cells: [
            {
              items: [
                textItem('Legacy grid cell'),
                userDefinedItem('nested', { value: 'nested' }),
              ],
            },
          ],
        },
      ],
    };
    try {
      await addChunk(mount.instance, {
        streaming_metadata: { response_id: 'legacy-grid' },
        partial_item: grid,
      });
      await addChunk(mount.instance, {
        streaming_metadata: { response_id: 'legacy-grid' },
        complete_item: grid,
      });
      expect(events.events).toEqual([]);
      expect(mainPanelText()).not.toContain('Legacy grid cell');
      await addChunk(mount.instance, finalChunk('legacy-grid', [grid]));
      await waitFor(() => {
        expect(mainPanelText()).toContain('Legacy grid cell');
        const event = events.of<BusEventUserDefinedResponse>(
          BusEventType.USER_DEFINED_RESPONSE
        )[0];
        expect(event).toBeDefined();
        expect(
          slotted(mount.host, event.data.slot).map(
            (element) => element.textContent
          )
        ).toEqual(['Nested legacy widget']);
      });
      expect(events.types()).toEqual([BusEventType.USER_DEFINED_RESPONSE]);
      expect(events.events[0]).toMatchObject({
        data: {
          state: MessageState.COMPLETE,
          message: { user_defined: { value: 'nested' } },
        },
      });
      expect(errors).toEqual([]);
    } finally {
      events.stop();
      await act(async () => mount.unmount());
    }
  });

  it('does not let a late final for a failed request release a newer pending send or its queued successor', async () => {
    const enteredSecond = deferred();
    const finishSecond = deferred();
    const errors: OnErrorData[] = [];
    const sent: string[] = [];
    let failedRequestID: string;
    const mount = await contractChat({
      messaging: {
        skipWelcome: true,
        messageTimeoutSecs: 0,
        customSendMessage: async (request, _options, instance) => {
          sent.push(request.input.text);
          if (request.input.text === 'First request') {
            failedRequestID = request.id;
            await instance.messaging.addMessageChunk(
              partialText('failed-owner', 'text', 'Original partial')
            );
            throw new Error('Owned first transport failed');
          }
          if (request.input.text === 'Second request') {
            enteredSecond.resolve();
            await finishSecond.promise;
          }
        },
      },
      onError: (error) => {
        errors.push(error);
      },
    });
    let second = Promise.resolve();
    let third = Promise.resolve();
    let secondSettled = false;
    try {
      await act(async () => {
        await expect(mount.instance.send('First request')).rejects.toThrow(
          'Owned first transport failed'
        );
      });
      await act(async () => {
        second = mount.instance.send('Second request').then(() => {
          secondSettled = true;
        });
        void second.catch((): void => undefined);
      });
      await bounded(enteredSecond.promise, 'Second transport entry');
      await act(async () => {
        third = mount.instance.send('Third request');
        void third.catch((): void => undefined);
      });
      await addChunk(
        mount.instance,
        finalChunk(
          'failed-owner',
          [textItem('Late failed-owner final', 'text')],
          { request_id: failedRequestID }
        )
      );
      expect(sent).toEqual(['First request', 'Second request']);
      expect(secondSettled).toBe(false);
      await act(async () => {
        finishSecond.resolve();
        await bounded(Promise.all([second, third]), 'Owned send queue');
      });
      expect(sent).toEqual([
        'First request',
        'Second request',
        'Third request',
      ]);
      expect(errors.map(({ errorType }) => errorType)).toEqual([
        OnErrorType.MESSAGE_COMMUNICATION,
      ]);
    } finally {
      finishSecond.resolve();
      try {
        await bounded(
          Promise.allSettled([second, third]),
          'Owned send cleanup'
        );
      } finally {
        await act(async () => mount.unmount());
      }
    }
  });

  it('keeps the latest explicit chunk cancellation setting until a terminal item clears the actual Stop control', async () => {
    const stopName = 'Contract chunk metadata stop';
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { input_stopResponse: stopName },
    });
    const stop = () => byRole('button', stopName);
    try {
      await addChunk(
        mount.instance,
        partialText('metadata-chunk', 'text', 'A', { cancellable: true })
      );
      await waitFor(() => expect(stop()).toBeEnabled());
      await addChunk(
        mount.instance,
        partialText('metadata-chunk', 'text', 'B', { cancellable: false })
      );
      await waitFor(() => expect(stop()).toBeDisabled());
      await addChunk(
        mount.instance,
        partialText('metadata-chunk', 'text', 'C')
      );
      expect(stop()).toBeDisabled();
      await addChunk(
        mount.instance,
        partialText('metadata-chunk', 'text', 'D', { cancellable: true })
      );
      await waitFor(() => expect(stop()).toBeEnabled());
      await addChunk(
        mount.instance,
        completeText('metadata-chunk', 'text', 'ABCD')
      );
      await waitFor(() =>
        expect(allByRole('button', stopName)).toHaveLength(0)
      );
      await addChunk(
        mount.instance,
        finalChunk('metadata-chunk', [textItem('ABCD', 'text')])
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('merges typed reasoning content and later steps across real chunks', async () => {
    const mount = await contractChat({ messaging: { skipWelcome: true } });
    try {
      await addChunk(mount.instance, {
        ...partialText('reasoning-merge', 'text', ''),
        partial_response: {
          message_options: { reasoning: { content: 'Thinking it over' } },
        },
      });
      await addChunk(mount.instance, {
        ...partialText('reasoning-merge', 'text', 'Answer'),
        partial_response: {
          message_options: {
            reasoning: { steps: [{ title: 'Step one', content: 'Looked' }] },
          },
        },
      });
      const message = mount.instance.state
        .get()
        .messages.find(({ id }) => id === 'reasoning-merge') as MessageResponse;
      expect(message.message_options.reasoning).toEqual({
        content: 'Thinking it over',
        steps: [{ title: 'Step one', content: 'Looked' }],
      });
      await addChunk(
        mount.instance,
        finalChunk('reasoning-merge', [textItem('Answer', 'text')], {
          message_options: { reasoning: message.message_options.reasoning },
        })
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
