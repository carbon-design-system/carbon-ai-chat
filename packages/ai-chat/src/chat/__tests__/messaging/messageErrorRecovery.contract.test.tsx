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
  OnErrorType,
  type GenericItem,
  type OnErrorData,
} from '../../../aiChatEntry';
import {
  addChunk,
  completeText,
  contractChat,
  contractSetup,
  finalChunk,
  mainPanelText,
  partialText,
  responseOf,
  textItem,
} from '../helpers/contract';

const optionWithoutChoices = (): GenericItem =>
  ({ response_type: MessageResponseTypes.OPTION }) as GenericItem;

describe('legacy rendered message compatibility', () => {
  contractSetup();

  it('contains an addMessage renderer failure and displays later messages', async () => {
    const onError = vi.fn<(...args: [OnErrorData]) => void>();
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: { errors_singleMessage: 'This reply could not be displayed.' },
      onError,
    });

    await act(() =>
      instance.messaging.addMessage(
        responseOf('broken-option', [
          textItem('Before the broken option'),
          optionWithoutChoices(),
          textItem('After the broken option'),
        ])
      )
    );
    await waitFor(() => {
      expect(onError.mock.calls.map(([data]) => data.errorType)).toEqual([
        OnErrorType.RENDER,
      ]);
      expect(mainPanelText()).toContain('Before the broken option');
      expect(mainPanelText()).toContain('This reply could not be displayed.');
      expect(mainPanelText()).toContain('After the broken option');
    });

    await act(() =>
      instance.messaging.addMessage(
        responseOf('after-broken-option', [
          textItem('A later reply is still displayed'),
        ])
      )
    );
    await waitFor(() =>
      expect(mainPanelText()).toContain('A later reply is still displayed')
    );
    expect(onError.mock.calls.map(([data]) => data.errorType)).toEqual([
      OnErrorType.RENDER,
    ]);
  });

  it('contains a streamed renderer failure and displays later messages', async () => {
    const onError = vi.fn<(...args: [OnErrorData]) => void>();
    const { instance } = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: {
        errors_singleMessage: 'This streamed reply could not be displayed.',
      },
      onError,
    });
    const item = {
      ...optionWithoutChoices(),
      streaming_metadata: { id: 'broken-option' },
    };

    await addChunk(instance, {
      streaming_metadata: { response_id: 'broken-option-stream' },
      partial_item: item,
    });
    await addChunk(instance, {
      streaming_metadata: { response_id: 'broken-option-stream' },
      complete_item: item,
    });
    await addChunk(
      instance,
      finalChunk('broken-option-stream', [
        textItem('Before the streamed option', 'before'),
        item,
        textItem('After the streamed option', 'after'),
      ])
    );
    await waitFor(() => {
      expect(onError.mock.calls.map(([data]) => data.errorType)).toEqual([
        OnErrorType.RENDER,
      ]);
      expect(mainPanelText()).toContain('Before the streamed option');
      expect(mainPanelText()).toContain(
        'This streamed reply could not be displayed.'
      );
      expect(mainPanelText()).toContain('After the streamed option');
    });

    await addChunk(
      instance,
      partialText('after-option-stream', 'text', 'A later ')
    );
    await addChunk(
      instance,
      completeText(
        'after-option-stream',
        'text',
        'A later stream still displays'
      )
    );
    await addChunk(
      instance,
      finalChunk('after-option-stream', [
        textItem('A later stream still displays', 'text'),
      ])
    );
    await waitFor(() =>
      expect(mainPanelText()).toContain('A later stream still displays')
    );
    expect(onError.mock.calls.map(([data]) => data.errorType)).toEqual([
      OnErrorType.RENDER,
    ]);
  });
});
