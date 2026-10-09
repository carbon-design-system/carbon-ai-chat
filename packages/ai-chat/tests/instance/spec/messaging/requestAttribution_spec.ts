/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';
import { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import {
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import {
  CancellationReason,
  MessageState,
} from '../../../../src/types/config/MessagingConfig';
import {
  BusEventPreReceive,
  BusEventType,
} from '../../../../src/types/events/eventBusTypes';
import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';

function response(id: string, requestID?: string): MessageResponse {
  return {
    id,
    request_id: requestID,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: id,
          streaming_metadata: { id: `${id}-item`, cancellable: true },
        },
      ],
    },
  };
}

type Delivery = 'add' | 'partial' | 'complete' | 'final' | 'upsert';

function deliver(
  instance: ChatInstance,
  kind: Delivery,
  message: MessageResponse
) {
  switch (kind) {
    case 'add':
      return instance.messaging.addMessage(message);
    case 'final':
      return instance.messaging.addMessageChunk({ final_response: message });
    case 'upsert':
      return instance.messaging.upsertMessage(
        message.id,
        MessageState.COMPLETE,
        () => message
      );
    default: {
      const streaming_metadata = {
        response_id: message.id,
        request_id: message.request_id,
      };
      return instance.messaging.addMessageChunk(
        kind === 'partial'
          ? { streaming_metadata, partial_item: message.output.generic[0] }
          : { streaming_metadata, complete_item: message.output.generic[0] }
      );
    }
  }
}

async function setupChat() {
  const requests: MessageRequest[] = [];
  const config = createBaseConfig();
  config.messaging = {
    skipWelcome: true,
    customSendMessage: async (request, _options, instance) => {
      requests.push(request);
      if (request.input.text === 'second') {
        await deliver(
          instance,
          'partial',
          response('current-response', request.id)
        );
      }
    },
  };
  return { ...(await renderChatAndGetInstanceWithStore(config)), requests };
}

describe('Request attribution across restart', () => {
  beforeEach(setupBeforeEach);
  afterEach(async () => {
    jest.restoreAllMocks();
    await setupAfterEach();
  });

  describe.each(['restartConversation', 'clearConversation'] as const)(
    '%s',
    (reset) => {
      it.each<Delivery>(['add', 'partial', 'complete', 'final', 'upsert'])(
        'ignores a late first %s delivery without changing the new stream',
        async (kind) => {
          const { instance, store, serviceManager, requests } =
            await setupChat();
          await instance.send('first');
          await instance.messaging[reset]();
          await instance.send('second');
          const state = store.getState();
          const endLoading = jest.spyOn(
            serviceManager.messageService.messageLoadingManager,
            'end'
          );
          const announce = jest.spyOn(
            serviceManager.streamAnnouncerService,
            'announceStreamStarts'
          );
          const receive = jest.fn();
          instance.on([
            { type: BusEventType.PRE_RECEIVE, handler: receive },
            { type: BusEventType.RECEIVE, handler: receive },
          ]);

          await deliver(
            instance,
            kind,
            response('late-response', requests[0].id)
          );

          expect(store.getState()).toBe(state);
          expect(
            serviceManager.messageService.inboundStreaming.streamingMessageID
          ).toBe('current-response');
          expect(endLoading).not.toHaveBeenCalled();
          expect(announce).not.toHaveBeenCalled();
          expect(receive).not.toHaveBeenCalled();
        }
      );
    }
  );

  it('sends the next request after an attributed late first chunk and the current final reply', async () => {
    const { instance, requests } = await setupChat();
    await instance.send('first');
    await instance.messaging.restartConversation();
    await instance.send('second');
    const third = instance.send('third');

    await deliver(
      instance,
      'partial',
      response('late-response', requests[0].id)
    );
    await deliver(
      instance,
      'final',
      response('current-response', requests[1].id)
    );

    await waitFor(() =>
      expect(requests.map((request) => request.input.text)).toEqual([
        'first',
        'second',
        'third',
      ])
    );
    await third;
  });

  describe.each<Delivery>(['add', 'final', 'upsert'])('%s', (kind) => {
    it.each(['current', 'unknown', 'omitted'] as const)(
      'accepts and preserves %s request attribution',
      async (attribution) => {
        const { instance, store, requests } = await setupChat();
        await instance.send('first');
        const requestID =
          attribution === 'current'
            ? requests[0].id
            : attribution === 'unknown'
              ? 'host-owned-request'
              : undefined;

        await deliver(instance, kind, response('accepted-response', requestID));

        expect(
          store.getState().allMessagesByID['accepted-response']
        ).toMatchObject({ id: 'accepted-response', request_id: requestID });
      }
    );
  });

  it.each(['updater', 'pre:receive'] as const)(
    'drops an upsert that crosses restart during %s',
    async (boundary) => {
      const { instance, store, serviceManager, requests } = await setupChat();
      await instance.send('first');
      const entered = resolvablePromise();
      const release = resolvablePromise();
      const receive = jest.fn();
      instance.on({ type: BusEventType.RECEIVE, handler: receive });
      if (boundary === 'pre:receive') {
        instance.on({
          type: BusEventType.PRE_RECEIVE,
          handler: async (event) => {
            if ((event as BusEventPreReceive).data.id === 'late-response') {
              entered.doResolve();
              await release;
            }
          },
        });
      }
      const pending = instance.messaging.upsertMessage(
        'late-response',
        MessageState.COMPLETE,
        async () => {
          if (boundary === 'updater') {
            entered.doResolve();
            await release;
          }
          return response('late-response', requests[0].id);
        }
      );
      await entered;
      await instance.messaging.restartConversation();
      await instance.send('second');
      const state = store.getState();
      const endLoading = jest.spyOn(
        serviceManager.messageService.messageLoadingManager,
        'end'
      );
      receive.mockClear();

      release.doResolve();
      await pending;

      expect(store.getState()).toBe(state);
      expect(endLoading).not.toHaveBeenCalled();
      expect(receive).not.toHaveBeenCalled();
    }
  );

  it('waits for an acceptable updater result before ending loading', async () => {
    const { instance, serviceManager, requests } = await setupChat();
    await instance.send('first');
    const entered = resolvablePromise();
    const release = resolvablePromise();
    const endLoading = jest.spyOn(
      serviceManager.messageService.messageLoadingManager,
      'end'
    );
    const pending = instance.messaging.upsertMessage(
      'reply',
      MessageState.COMPLETE,
      async () => {
        entered.doResolve();
        await release;
        return response('reply', requests[0].id);
      }
    );
    await entered;
    expect(endLoading).not.toHaveBeenCalled();
    release.doResolve();
    await pending;
    expect(endLoading).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'preserves updater rejection without clearing a later conversation (restart: %s)',
    async (restart) => {
      const { instance, serviceManager } = await setupChat();
      const entered = resolvablePromise();
      const release = resolvablePromise();
      const failure = new Error('Updater failed');
      const pending = instance.messaging.upsertMessage(
        'reply',
        MessageState.COMPLETE,
        async () => {
          entered.doResolve();
          await release;
          throw failure;
        }
      );
      const rejected = expect(pending).rejects.toBe(failure);
      await entered;
      if (restart) {
        await instance.messaging.restartConversation();
        await instance.send('second');
      }
      const endLoading = jest.spyOn(
        serviceManager.messageService.messageLoadingManager,
        'end'
      );
      release.doResolve();
      await rejected;
      expect(endLoading).toHaveBeenCalledTimes(restart ? 0 : 1);
    }
  );

  it('does not invoke an updater that was queued before restart', async () => {
    const { instance, store, requests } = await setupChat();
    await instance.send('first');
    const entered = resolvablePromise();
    const release = resolvablePromise();
    const first = instance.messaging.upsertMessage(
      'reply',
      MessageState.STREAMING,
      async () => {
        entered.doResolve();
        await release;
        return response('reply', requests[0].id);
      }
    );
    const updater = jest.fn(() => response('reply', requests[0].id));
    const queued = instance.messaging.upsertMessage(
      'reply',
      MessageState.COMPLETE,
      updater
    );
    await entered;
    await instance.messaging.restartConversation();
    await instance.send('second');
    const state = store.getState();
    release.doResolve();
    await Promise.all([first, queued]);
    expect(updater).not.toHaveBeenCalled();
    expect(store.getState()).toBe(state);
  });

  it('does not finalize the new stream when an old final chunk crosses restart during pre:receive', async () => {
    const { instance, store, serviceManager, requests } = await setupChat();
    await instance.send('first');
    const entered = resolvablePromise();
    const release = resolvablePromise();
    instance.on({
      type: BusEventType.PRE_RECEIVE,
      handler: async (event) => {
        if ((event as BusEventPreReceive).data.id === 'old-response') {
          entered.doResolve();
          await release;
        }
      },
    });
    const final = deliver(
      instance,
      'final',
      response('old-response', requests[0].id)
    );
    await entered;
    await instance.messaging.restartConversation();
    const second = instance.send('second');
    await waitFor(() => expect(requests).toHaveLength(2));
    const finalize = jest.spyOn(
      serviceManager.messageService,
      'finalizeStreamingMessage'
    );
    release.doResolve();
    await final;
    await second;
    expect(finalize).not.toHaveBeenCalled();
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(true);
  });

  it('keeps history replay outside live request filtering', async () => {
    const { instance, store, requests } = await setupChat();
    await instance.send('first');
    await instance.messaging.restartConversation();
    await instance.messaging.insertHistory([
      {
        time: '2026-01-01T00:00:00.000Z',
        message: response('historic-reply', requests[0].id),
      },
    ]);
    expect(store.getState().allMessagesByID['historic-reply']).toMatchObject({
      request_id: requests[0].id,
    });
  });

  it('accepts an attributed final reply after normal stop', async () => {
    const { instance, store, serviceManager, requests } = await setupChat();
    await instance.send('second');
    await serviceManager.messageService.cancelMessageRequestByID(
      requests[0].id,
      false,
      CancellationReason.STOP_STREAMING
    );
    await deliver(
      instance,
      'final',
      response('current-response', requests[0].id)
    );
    expect(store.getState().allMessagesByID['current-response']).toMatchObject({
      request_id: requests[0].id,
    });
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
    await instance.send('third');
    expect(requests.map((request) => request.input.text)).toEqual([
      'second',
      'third',
    ]);
  });
});
