/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatSDKErrorData, ChatSDKState } from '../index';
import { OnErrorType } from '../../types/config/ErrorConfig';
import { MessageState } from '../../types/config/MessagingConfig';
import {
  ButtonItemType,
  MessageResponseTypes,
  type GenericItem,
  type MessageResponse,
  type TextItem,
} from '../../types/messaging/Messages';
import {
  FIXED_TIMESTAMP,
  textResponse,
  withSDK,
} from './helpers/publicContract';

function response(id: string, generic: GenericItem[]): MessageResponse {
  return { id, history: { timestamp: FIXED_TIMESTAMP }, output: { generic } };
}

function text(value: string, streamID?: string): GenericItem {
  return {
    response_type: MessageResponseTypes.TEXT,
    text: value,
    ...(streamID ? { streaming_metadata: { id: streamID } } : {}),
  };
}

function drawn(state: ChatSDKState, id: string) {
  return state.messageItems!.filter((entry) => entry.messageID === id);
}

function drawnTexts(state: ChatSDKState, id: string) {
  return drawn(state, id)
    .filter((entry) => entry.item.response_type === MessageResponseTypes.TEXT)
    .map((entry) => (entry.item as TextItem).text);
}

function grid(cells: Array<{ items?: GenericItem[] }>): GenericItem {
  return {
    response_type: MessageResponseTypes.GRID,
    streaming_metadata: { id: 'grid' },
    columns: cells.map(() => ({ width: '1' })),
    rows: [{ cells }],
  } as GenericItem;
}

async function bounded<T>(work: Promise<T>, name: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timed out waiting for ${name}`)),
          5000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describe('SDK public upsert outcomes', () => {
  it('keeps a usable positional and nested model through edits and removal', async () => {
    await withSDK(async (sdk) => {
      const card = (body: string[]): GenericItem => ({
        response_type: MessageResponseTypes.CARD,
        body: body.map((value) => text(value)),
        footer: [
          {
            response_type: MessageResponseTypes.BUTTON,
            button_type: ButtonItemType.POST_BACK,
            label: 'Choose',
            value: { input: { text: 'chosen' } },
          },
        ],
      });
      const write = (
        body: string[],
        withTrailing = true,
        state = MessageState.STREAMING
      ) =>
        sdk.messaging.upsertMessage('model', state, () =>
          response('model', [
            card(body),
            ...(withTrailing ? [text('Trailing item')] : []),
          ])
        );
      await sdk.messaging.upsertMessage('prior', MessageState.COMPLETE, () =>
        textResponse('prior', 'Prior message')
      );
      await write(['Fixed child', 'Draft child']);
      const before = sdk.state.get();
      const beforeItems = drawn(before, 'model');
      expect(before.activeResponseId).toBe('model');
      expect(beforeItems.map(({ id, parentID }) => [id, parentID])).toEqual([
        ['model:i:0', undefined],
        ['model:i:0:i:0', 'model:i:0'],
        ['model:i:0:i:1', 'model:i:0'],
        ['model:i:0:f:0', 'model:i:0'],
        ['model:i:1', undefined],
      ]);

      await sdk.messaging.upsertMessage('prior', MessageState.COMPLETE, () =>
        textResponse('prior', 'Prior message edited')
      );
      expect(sdk.state.get().activeResponseId).toBe('prior');
      await write(['Fixed child', 'Final child']);
      const edited = sdk.state.get();
      expect(edited.activeResponseId).toBe('model');
      expect(edited.messages.map(({ id }) => id)).toEqual(['prior', 'model']);
      expect(drawnTexts(edited, 'model')).toEqual([
        'Fixed child',
        'Final child',
        'Trailing item',
      ]);
      expect(drawn(edited, 'model')[1]).toBe(beforeItems[1]);
      expect(drawn(edited, 'model')[3]).toBe(beforeItems[3]);
      expect(drawn(edited, 'model')[4]).toBe(beforeItems[4]);

      await write(['Fixed child'], false, MessageState.COMPLETE);
      const after = sdk.state.get();
      expect(drawn(after, 'model').map(({ id }) => id)).toEqual([
        'model:i:0',
        'model:i:0:i:0',
        'model:i:0:f:0',
      ]);
      expect(drawnTexts(after, 'model')).toEqual(['Fixed child']);
      expect(after.activeResponseId).toBe('model');
      expect(drawnTexts(before, 'model')).toEqual([
        'Fixed child',
        'Draft child',
        'Trailing item',
      ]);
    });
  });

  it('settles identical text without changing a retained streaming snapshot', async () => {
    await withSDK(async (sdk) => {
      const message = () =>
        response('same', [
          text('Unchanged payload', 'text'),
          { response_type: MessageResponseTypes.IMAGE, source: 'image.png' },
        ]);
      await sdk.messaging.upsertMessage(
        'same',
        MessageState.STREAMING,
        message
      );
      const before = sdk.state.get();
      const beforeItems = drawn(before, 'same');
      expect(beforeItems.map(({ status }) => status)).toEqual([
        'streaming',
        'streaming',
      ]);
      await sdk.messaging.upsertMessage(
        'same',
        MessageState.STREAMING,
        message
      );
      const repeated = drawn(sdk.state.get(), 'same');
      expect(repeated[0]).toBe(beforeItems[0]);
      expect(repeated[1]).toBe(beforeItems[1]);

      await sdk.messaging.upsertMessage('same', MessageState.COMPLETE, message);
      const after = drawn(sdk.state.get(), 'same');
      expect(after.map(({ id, status }) => [id, status])).toEqual([
        ['same:s:text', 'complete'],
        ['same:i:1', 'complete'],
      ]);
      expect((after[0].item as TextItem).text).toBe('Unchanged payload');
      expect(beforeItems.map(({ status }) => status)).toEqual([
        'streaming',
        'streaming',
      ]);
      expect(drawnTexts(before, 'same')).toEqual(['Unchanged payload']);
    });
  });

  it('keeps already shown content and equal siblings through two real pauses', async () => {
    await withSDK(async (sdk) => {
      await sdk.messaging.upsertMessage('pauses', MessageState.STREAMING, () =>
        response('pauses', [text('A', 'a'), text('Same')])
      );
      const before = sdk.state.get();
      const observed = [drawnTexts(before, 'pauses')];
      const unsubscribe = sdk.state.subscribe(() => {
        const next = drawnTexts(sdk.state.get(), 'pauses');
        if (
          JSON.stringify(next) !== JSON.stringify(observed[observed.length - 1])
        ) {
          observed.push(next);
        }
      });
      try {
        const pause: GenericItem = {
          response_type: MessageResponseTypes.PAUSE,
          time: 1,
        };
        await sdk.messaging.upsertMessage(
          'pauses',
          MessageState.STREAMING,
          () =>
            response('pauses', [
              pause,
              text('Same'),
              text('Same'),
              pause,
              text('New'),
              text('A', 'a'),
            ])
        );
        expect(observed).toEqual([
          ['A', 'Same'],
          ['Same', 'A'],
          ['Same', 'Same', 'A'],
          ['Same', 'Same', 'New', 'A'],
        ]);
        const items = drawn(sdk.state.get(), 'pauses');
        expect(new Set(items.map(({ id }) => id)).size).toBe(4);
        expect(items[items.length - 1].id).toBe('pauses:s:a');
        expect(
          items.some(
            ({ item }) => item.response_type === MessageResponseTypes.PAUSE
          )
        ).toBe(false);
        expect(drawnTexts(before, 'pauses')).toEqual(['A', 'Same']);
      } finally {
        unsubscribe();
      }
    });
  });

  it('stops a real native turn while retaining its published content', async () => {
    let requestID: string;
    let signal: AbortSignal;
    let enteredTransport: () => void;
    let finishTransport: () => void;
    const entered = new Promise<void>((resolve) => {
      enteredTransport = resolve;
    });
    const transport = new Promise<void>((resolve) => {
      finishTransport = resolve;
    });
    await withSDK(
      async (sdk) => {
        await sdk.messaging.upsertMessage('prior', MessageState.COMPLETE, () =>
          textResponse('prior', 'Unrelated settled reply')
        );
        const sending = sdk.messaging.send('Start this turn');
        const outcome = sending.then(
          () => ({ status: 'resolved' as const }),
          (error: unknown) => ({ status: 'rejected' as const, error })
        );
        try {
          await bounded(entered, 'transport entry');
          await sdk.messaging.upsertMessage(
            'stopped',
            MessageState.STREAMING,
            () => ({
              ...response('stopped', [text('Keep this response', 'text')]),
              request_id: requestID,
            })
          );
          const before = sdk.state.get();
          const beforeItems = drawn(before, 'stopped');
          const prior = before.messages.find(({ id }) => id === 'prior');
          expect(before.status).toBe('streaming');
          expect(beforeItems.map(({ status }) => status)).toEqual([
            'streaming',
          ]);

          await sdk.messaging.stop();
          expect(signal.aborted).toBe(true);
          expect(await bounded(outcome, 'stopped send')).toEqual({
            status: 'resolved',
          });
          const after = sdk.state.get();
          expect(after.status).toBe('ready');
          expect(drawn(after, 'stopped').map(({ status }) => status)).toEqual([
            'complete',
          ]);
          expect(drawnTexts(after, 'stopped')).toEqual(['Keep this response']);
          expect(after.messages.find(({ id }) => id === 'prior')).toBe(prior);
          expect(beforeItems.map(({ status }) => status)).toEqual([
            'streaming',
          ]);
          expect(drawnTexts(before, 'stopped')).toEqual(['Keep this response']);
        } finally {
          finishTransport();
          await transport;
          await bounded(outcome, 'send cleanup');
        }
      },
      (request, options) => {
        requestID = request.id;
        signal = options.signal;
        enteredTransport();
        return transport;
      }
    );
  });

  it('retains the last usable grid only while partial data is streaming', async () => {
    const errors: ChatSDKErrorData[] = [];
    await withSDK(
      async (sdk) => {
        const write = (
          state: MessageState,
          cells: Array<{ items?: GenericItem[] }>
        ) =>
          sdk.messaging.upsertMessage('grid', state, () =>
            response('grid', [grid(cells)])
          );
        await write(MessageState.STREAMING, [{ items: [text('Cell A')] }]);
        const before = sdk.state.get();
        const beforeItems = drawn(before, 'grid');
        expect(drawnTexts(before, 'grid')).toEqual(['Cell A']);

        await write(MessageState.STREAMING, [{ items: [text('Cell A')] }, {}]);
        const partial = drawn(sdk.state.get(), 'grid');
        expect(partial[0]).toBe(beforeItems[0]);
        expect(drawnTexts(sdk.state.get(), 'grid')).toEqual(['Cell A']);
        expect(errors).toEqual([]);

        await write(MessageState.STREAMING, [
          { items: [text('Cell A')] },
          { items: [text('Cell B')] },
        ]);
        expect(drawnTexts(sdk.state.get(), 'grid')).toEqual([
          'Cell A',
          'Cell B',
        ]);
        expect(
          drawn(sdk.state.get(), 'grid').every(
            ({ status }) => status === 'streaming'
          )
        ).toBe(true);

        await write(MessageState.COMPLETE, [{ items: [text('Cell A')] }, {}]);
        const completed = drawn(sdk.state.get(), 'grid');
        expect(completed).toHaveLength(1);
        expect(completed[0]).not.toBe(partial[0]);
        expect(completed[0].status).toBe('complete');
        expect(errors.map(({ errorType }) => errorType)).toEqual([
          OnErrorType.RENDER,
        ]);
        expect(errors[0].otherData).toMatchObject({
          messageID: 'grid',
          responseType: MessageResponseTypes.GRID,
        });
        expect(drawnTexts(before, 'grid')).toEqual(['Cell A']);

        await write(MessageState.COMPLETE, [
          { items: [text('Recovered cell')] },
        ]);
        expect(drawnTexts(sdk.state.get(), 'grid')).toEqual(['Recovered cell']);
        expect(errors).toHaveLength(1);
      },
      () => undefined,
      { onError: (error) => errors.push(error) }
    );
  });
});
