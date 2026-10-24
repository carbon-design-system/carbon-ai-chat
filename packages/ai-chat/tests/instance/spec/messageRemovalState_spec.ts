/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act } from '@testing-library/react';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import type { PublicChatState } from '../../../src/types/instance/PublicChatState';
import {
  MessageResponse,
  MessageResponseTypes,
  PartialItemChunk,
  TextItem,
} from '../../../src/types/messaging/Messages';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

function response(text: string, requestID: string): MessageResponse {
  return {
    id: 'reused-response',
    request_id: requestID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          streaming_metadata: { id: 'text', cancellable: true },
          text,
        },
      ],
    },
  };
}

function textChunk(text: string, requestID: string): PartialItemChunk {
  return {
    streaming_metadata: {
      response_id: 'reused-response',
      request_id: requestID,
    },
    partial_item: response(text, requestID).output.generic[0],
  };
}

function publicText(state: PublicChatState) {
  const message = state.messages.find(
    (item) => item.id === 'reused-response'
  ) as MessageResponse;
  return (message?.output.generic[0] as TextItem)?.text;
}

describe('message removal and public state', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('lets a new request reuse a stopped response ID without accepting the old request work', async () => {
    const oldUpdaterEntered = resolvablePromise();
    const releaseOldUpdater = resolvablePromise();
    const oldWorkFinished = resolvablePromise();
    const replacementStreaming = resolvablePromise();
    const finishReplacement = resolvablePromise();
    let originalRequestID: string;
    let replacementRequestID: string;
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, chat) => {
        if (request.input.text === 'Original') {
          originalRequestID = request.id;
          await chat.messaging.upsertMessage(
            'reused-response',
            MessageState.STREAMING,
            () => response('Original text', request.id)
          );
          await chat.messaging.upsertMessage(
            'reused-response',
            MessageState.COMPLETE,
            async (previous) => {
              (previous.output.generic[0] as TextItem).text = 'Stale updater';
              oldUpdaterEntered.doResolve();
              await releaseOldUpdater;
              return previous;
            }
          );
          await chat.messaging.addMessageChunk(
            textChunk('Stale chunk', request.id)
          );
          oldWorkFinished.doResolve();
          return;
        }
        replacementRequestID = request.id;
        await chat.messaging.addMessageChunk(
          textChunk('Replacement', request.id)
        );
        replacementStreaming.doResolve();
        await finishReplacement;
        await chat.messaging.addMessageChunk(
          textChunk(' continued', request.id)
        );
        await chat.messaging.addMessageChunk({
          final_response: response('Replacement continued', request.id),
        });
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const receive = jest.fn();
    instance.on({ type: BusEventType.RECEIVE, handler: receive });
    let originalSend: Promise<void>;
    let replacementSend: Promise<void>;
    try {
      await act(async () => {
        originalSend = instance.send('Original');
        await oldUpdaterEntered;
      });
      const originalSnapshot = instance.state.get();
      expect(originalSnapshot.status).toBe('streaming');
      expect(publicText(originalSnapshot)).toBe('Original text');
      await act(async () => {
        await serviceManager.messageService.cancelCurrentMessageRequest();
        await instance.messaging.removeMessages(['reused-response']);
      });
      expect(instance.state.get().status).toBe('ready');
      expect(
        serviceManager.conversationLifecycleService.isRequestStopped(
          originalRequestID
        )
      ).toBe(true);
      expect(
        serviceManager.conversationLifecycleService.responseRequestID(
          'reused-response'
        )
      ).toBeUndefined();

      const stoppedButton =
        store.getState().assistantInputState.stopStreamingButtonState;
      await act(async () => {
        await instance.messaging.addMessageChunk(
          textChunk('Late before replacement', originalRequestID)
        );
      });
      expect(
        store.getState().allMessagesByID['reused-response']
      ).toBeUndefined();
      expect(instance.state.get().status).toBe('ready');
      expect(
        store.getState().assistantInputState.stopStreamingButtonState
      ).toEqual(stoppedButton);
      expect(receive).not.toHaveBeenCalled();

      await act(async () => {
        replacementSend = instance.send('Replacement');
        await replacementStreaming;
      });
      const replacementSnapshot = instance.state.get();
      const storedReplacement =
        store.getState().allMessagesByID['reused-response'];
      expect(replacementSnapshot.status).toBe('streaming');
      expect(publicText(replacementSnapshot)).toBe('Replacement');
      expect(
        serviceManager.conversationLifecycleService.responseRequestID(
          'reused-response'
        )
      ).toBe(replacementRequestID);

      await act(async () => {
        releaseOldUpdater.doResolve();
        await oldWorkFinished;
        await originalSend;
      });
      expect(store.getState().allMessagesByID['reused-response']).toBe(
        storedReplacement
      );
      expect(instance.state.get().status).toBe('streaming');
      expect(publicText(instance.state.get())).toBe('Replacement');
      expect(receive).not.toHaveBeenCalled();
      expect(
        serviceManager.conversationLifecycleService.isRequestStopped(
          originalRequestID
        )
      ).toBe(true);

      await act(async () => {
        finishReplacement.doResolve();
        await replacementSend;
      });
      expect(instance.state.get().status).toBe('ready');
      expect(publicText(instance.state.get())).toBe('Replacement continued');
      expect(receive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ request_id: replacementRequestID }),
        }),
        instance
      );
      expect(publicText(originalSnapshot)).toBe('Original text');
      expect(publicText(replacementSnapshot)).toBe('Replacement');
      expect(Object.isFrozen(originalSnapshot.messages)).toBe(true);
      expect(Object.isFrozen(replacementSnapshot.messages)).toBe(true);
      expect(
        Object.isFrozen(
          replacementSnapshot.messages.find(
            (item) => item.id === 'reused-response'
          )
        )
      ).toBe(true);
    } finally {
      releaseOldUpdater.doResolve();
      finishReplacement.doResolve();
      await Promise.all([originalSend, replacementSend]);
    }
  });
});
