/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import {
  MessageResponseTypes,
  MessageState,
  OnErrorType,
  type GenericItem,
  type OnErrorData,
  type TextItem,
} from '../../../aiChatEntry';
import {
  addChunk,
  completeText,
  contractChat,
  contractSetup,
  fakeBackend,
  instanceSender,
  mainPanelText,
  partialText,
  responseOf,
  startSend,
  textItem,
} from '../helpers/contract';

function grid(cells: Array<{ items?: GenericItem[] }>): GenericItem {
  return {
    response_type: MessageResponseTypes.GRID,
    streaming_metadata: { id: 'grid' },
    columns: cells.map(() => ({ width: '1' })),
    rows: [{ cells }],
  } as GenericItem;
}

function politeRegions(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*')).flatMap((node) => [
    ...(node.getAttribute('aria-live') === 'polite' ? [node] : []),
    ...(node.shadowRoot ? politeRegions(node.shadowRoot) : []),
  ]);
}

describe('native streaming public outcomes', () => {
  contractSetup();

  it('keeps a native grid useful through partial data, completion failure and repair', async () => {
    const onError = vi.fn<(...args: [OnErrorData]) => void>();
    const failureText = 'This streamed grid could not be displayed.';
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { errors_singleMessage: failureText },
      onError,
    });
    const write = (
      state: MessageState,
      cells: Array<{ items?: GenericItem[] }>
    ) =>
      act(() =>
        instance.messaging.upsertMessage('native-grid', state, () =>
          responseOf('native-grid', [
            grid(cells),
            textItem('Healthy neighboring item', 'neighbor'),
          ])
        )
      );
    await write(MessageState.STREAMING, [{ items: [textItem('Grid cell A')] }]);
    await waitFor(() => expect(mainPanelText()).toContain('Grid cell A'));
    await write(MessageState.STREAMING, [
      { items: [textItem('Grid cell A')] },
      {},
    ]);
    await waitFor(() => {
      expect(mainPanelText()).toContain('Grid cell A');
      expect(mainPanelText()).toContain('Healthy neighboring item');
    });
    expect(onError).not.toHaveBeenCalled();

    await write(MessageState.STREAMING, [
      { items: [textItem('Grid cell A')] },
      { items: [textItem('Grid cell B')] },
    ]);
    await waitFor(() => expect(mainPanelText()).toContain('Grid cell B'));
    await write(MessageState.COMPLETE, [
      { items: [textItem('Grid cell A')] },
      {},
    ]);
    await waitFor(() => {
      expect(onError.mock.calls.map(([error]) => error.errorType)).toEqual([
        OnErrorType.RENDER,
      ]);
      expect(mainPanelText()).toContain(failureText);
      expect(mainPanelText()).toContain('Healthy neighboring item');
      expect(mainPanelText()).not.toContain('Grid cell A');
      expect(mainPanelText()).not.toContain('Grid cell B');
    });

    await act(() =>
      instance.messaging.upsertMessage('following', MessageState.COMPLETE, () =>
        responseOf('following', [textItem('A following reply still works')])
      )
    );
    await waitFor(() =>
      expect(mainPanelText()).toContain('A following reply still works')
    );
    await write(MessageState.COMPLETE, [
      { items: [textItem('Repaired grid cell')] },
    ]);
    await waitFor(() => {
      expect(mainPanelText()).toContain('Repaired grid cell');
      expect(mainPanelText()).toContain('A following reply still works');
      expect(mainPanelText()).not.toContain(failureText);
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('finishes a nested markdown table when the public stop settles its stream', async () => {
    const backend = fakeBackend();
    const onError = vi.fn<(...args: [OnErrorData]) => void>();
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      onError,
    });
    const started = await startSend(
      instanceSender(instance, backend),
      'Start nested stream'
    );
    const outcome = started.done.then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ status: 'rejected' as const, error })
    );
    try {
      await act(() =>
        instance.messaging.upsertMessage(
          'nested-stream',
          MessageState.STREAMING,
          () => ({
            ...responseOf('nested-stream', [
              {
                response_type: MessageResponseTypes.CARD,
                streaming_metadata: { id: 'card' },
                body: [
                  textItem('Visible streaming card'),
                  textItem('| Column |\n| --- |\n| Settled nested cell |'),
                ],
              } as GenericItem,
            ]),
            request_id: started.sent.request.id,
          })
        )
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('Visible streaming card')
      );
      expect(mainPanelText()).not.toContain('Settled nested cell');
      const before = instance.state.get();
      const beforeItems = before.messageItems!.filter(
        (entry) => entry.messageID === 'nested-stream'
      );
      expect(beforeItems.every(({ status }) => status === 'streaming')).toBe(
        true
      );

      await act(async () => {
        await instance.messaging.stop();
        expect(await outcome).toEqual({ status: 'resolved' });
      });
      expect(started.sent.options.signal.aborted).toBe(true);
      await waitFor(() =>
        expect(mainPanelText()).toContain('Settled nested cell')
      );
      expect(instance.state.get().status).toBe('ready');
      expect(beforeItems.every(({ status }) => status === 'streaming')).toBe(
        true
      );
      expect(onError).not.toHaveBeenCalled();
    } finally {
      started.sent.resolve();
      await outcome;
    }
  });

  it('announces completed content once without announcing its later edit again', async () => {
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    await waitFor(() => expect(politeRegions().length).toBeGreaterThan(0));
    const deliveries: string[] = [];
    const observers = politeRegions().map((region) => {
      const observer = new MutationObserver(() => {
        const value = region.textContent?.trim();
        if (value) {
          deliveries.push(value);
        }
      });
      observer.observe(region, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return observer;
    });
    const content = 'Announce this completed reply only once';
    const occurrences = () =>
      deliveries.reduce(
        (count, value) => count + value.split(content).length - 1,
        0
      );
    const write = (id: string, state: MessageState, value: string) =>
      act(() =>
        instance.messaging.upsertMessage(id, state, () =>
          responseOf(id, [textItem(value, 'text')])
        )
      );
    try {
      await write('announced', MessageState.STREAMING, content);
      await waitFor(() => expect(mainPanelText()).toContain(content));
      await write(
        'before-completion',
        MessageState.COMPLETE,
        'Before completion announcement barrier'
      );
      await waitFor(() =>
        expect(
          deliveries.some((value) =>
            value.includes('Before completion announcement barrier')
          )
        ).toBe(true)
      );
      expect(occurrences()).toBe(0);

      await write('announced', MessageState.COMPLETE, content);
      await waitFor(() => expect(occurrences()).toBe(1));
      await write('announced', MessageState.COMPLETE, `${content}, edited`);
      await waitFor(() =>
        expect(mainPanelText()).toContain(`${content}, edited`)
      );
      await write(
        'after-edit',
        MessageState.COMPLETE,
        'After edit announcement barrier'
      );
      await waitFor(() =>
        expect(
          deliveries.some((value) =>
            value.includes('After edit announcement barrier')
          )
        ).toBe(true)
      );
      expect(occurrences()).toBe(1);
    } finally {
      observers.forEach((observer) => observer.disconnect());
    }
  });

  it('keeps cumulative drawn text for named chunks after their send fails', async () => {
    const backend = fakeBackend();
    const onError = vi.fn<(...args: [OnErrorData]) => void>();
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: {
        skipWelcome: true,
        customSendMessage: backend.customSendMessage,
      },
      onError,
    });
    const started = await startSend(
      instanceSender(instance, backend),
      'Start chunk turn'
    );
    const outcome = started.done.then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ status: 'rejected' as const, error })
    );
    const metadata = {
      response_id: 'failed-stream',
      request_id: started.sent.request.id,
    };
    const delta = (value: string) => ({
      ...partialText('failed-stream', 'text', value),
      streaming_metadata: metadata,
    });
    const drawnTexts = () =>
      instance.state
        .get()
        .messageItems!.filter(
          (entry) =>
            entry.messageID === 'failed-stream' &&
            entry.item.response_type === MessageResponseTypes.TEXT
        )
        .map((entry) => (entry.item as TextItem).text);
    try {
      await addChunk(instance, delta('Earlier '));
      await addChunk(instance, delta('text. '));
      await waitFor(() => expect(mainPanelText()).toContain('Earlier text.'));
      expect(drawnTexts()).toEqual(['Earlier text. ']);
      const before = instance.state.get();
      const beforeItem = before.messageItems!.find(
        (entry) => entry.messageID === 'failed-stream'
      );
      const failure = new Error('Transport disconnected');
      await act(async () => {
        started.sent.reject(failure);
        expect(await outcome).toMatchObject({ status: 'rejected' });
      });
      expect(instance.state.get().status).toBe('error');
      expect(drawnTexts()).toEqual(['Earlier text. ']);
      for (const [value, expected] of [
        ['Hello ', 'Earlier text. Hello '],
        ['world', 'Earlier text. Hello world'],
      ]) {
        await addChunk(instance, delta(value));
        expect(drawnTexts()).toEqual([expected]);
        await waitFor(() => expect(mainPanelText()).toContain(expected.trim()));
      }
      const closing = {
        ...completeText('failed-stream', 'text', 'Final replacement'),
        streaming_metadata: metadata,
      };
      await addChunk(instance, closing);
      expect(drawnTexts()).toEqual(['Final replacement']);
      await waitFor(() => {
        expect(mainPanelText()).toContain('Final replacement');
        expect(mainPanelText()).not.toContain('Earlier text. Hello world');
      });
      expect((beforeItem.item as TextItem).text).toBe('Earlier text. ');
      expect(
        onError.mock.calls.some(
          ([error]) => error.errorType === OnErrorType.RENDER
        )
      ).toBe(false);
    } finally {
      started.sent.resolve();
      await outcome;
    }
  });
});
