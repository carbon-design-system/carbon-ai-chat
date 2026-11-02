/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';

import { MessageState } from '../../../../src/types/config/MessagingConfig';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../../test_helpers';

function snapshot(id: string): MessageResponse {
  return {
    id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: 'snapshot',
          streaming_metadata: { id: 'text', cancellable: true },
        },
      ],
    },
  };
}

describe('upsert and chunk request ownership', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('keeps other responses streaming when an ERROR upsert finishes one response', async () => {
    const onError = jest.fn();
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        onError,
      });

    for (const responseID of ['response-a', 'response-b']) {
      await instance.messaging.upsertMessage(
        responseID,
        MessageState.STREAMING,
        () => snapshot(responseID)
      );
    }
    await instance.messaging.upsertMessage(
      'response-a',
      MessageState.ERROR,
      () => snapshot('response-a')
    );
    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(true);

    await instance.messaging.upsertMessage(
      'response-b',
      MessageState.ERROR,
      () => snapshot('response-b')
    );
    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('releases an awaited upsert stream when its send throws', async () => {
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        if (request.input.text === 'first') {
          await instance.messaging.upsertMessage(
            'response-a',
            MessageState.STREAMING,
            () => snapshot('response-a')
          );
          throw new Error('send failed');
        }
        await instance.messaging.upsertMessage(
          'response-b',
          MessageState.COMPLETE,
          () => snapshot('response-b')
        );
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toEqual(new Error('{}'));
    consoleError.mockRestore();
    await instance.send('second');

    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
  });

  it('releases an unawaited upsert that lands after its send throws', async () => {
    const release = resolvablePromise();
    let pendingUpsert: Promise<void>;
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        if (request.input.text === 'first') {
          pendingUpsert = instance.messaging.upsertMessage(
            'response-a',
            MessageState.STREAMING,
            async () => {
              await release;
              return snapshot('response-a');
            }
          );
          throw new Error('send failed');
        }
        await instance.messaging.upsertMessage(
          'response-b',
          MessageState.COMPLETE,
          () => snapshot('response-b')
        );
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toEqual(new Error('{}'));
    consoleError.mockRestore();
    await instance.send('second');
    release.doResolve();
    await pendingUpsert;

    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
  });

  it('releases an upsert stream when its send is canceled', async () => {
    const streaming = resolvablePromise();
    const release = resolvablePromise();
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (_request, _options, instance) => {
        await instance.messaging.upsertMessage(
          'response-a',
          MessageState.STREAMING,
          () => snapshot('response-a')
        );
        streaming.doResolve();
        await release;
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const pendingSend = instance.send('first');
    await streaming;
    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(true);

    await serviceManager.messageService.cancelCurrentMessageRequest();
    release.doResolve();
    await pendingSend;

    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
  });

  it('releases both chunk and upsert streams when their send is canceled', async () => {
    const streaming = resolvablePromise();
    const release = resolvablePromise();
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        await instance.messaging.addMessageChunk({
          streaming_metadata: {
            response_id: 'chunk-response',
            request_id: request.id,
          },
          partial_item: {
            response_type: MessageResponseTypes.TEXT,
            text: 'partial',
            streaming_metadata: { id: 'text', cancellable: true },
          },
        });
        await instance.messaging.upsertMessage(
          'upsert-response',
          MessageState.STREAMING,
          () => snapshot('upsert-response')
        );
        streaming.doResolve();
        await release;
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const pendingSend = instance.send('first');
    await streaming;

    await serviceManager.messageService.cancelCurrentMessageRequest();
    release.doResolve();
    await pendingSend;

    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
  });

  it.each(['cancel', 'failure'] as const)(
    'does not revive queued chunk responses after request %s',
    async (outcome) => {
      const handlerStarted = resolvablePromise();
      const releaseHandler = resolvablePromise();
      const chunksQueued = resolvablePromise();
      const releaseSend = resolvablePromise();
      let queuedChunks: Promise<void>[];
      const config = createBaseConfig();
      config.messaging = {
        skipWelcome: true,
        customSendMessage: async (request, _options, chat) => {
          if (request.input.text === 'next') {
            return;
          }
          queuedChunks = [true, false].flatMap((explicitOwner) =>
            ['queued ', 'content'].map((text) =>
              chat.messaging.addMessageChunk({
                streaming_metadata: {
                  response_id: explicitOwner
                    ? 'explicit-response'
                    : 'implicit-response',
                  ...(explicitOwner ? { request_id: request.id } : {}),
                },
                partial_item: {
                  response_type: MessageResponseTypes.TEXT,
                  text,
                  streaming_metadata: { id: 'text', cancellable: true },
                },
              })
            )
          );
          chunksQueued.doResolve();
          await releaseSend;
          if (outcome === 'failure') {
            throw new Error('send failed');
          }
        },
      };
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: jest.fn().mockImplementationOnce(() => {
          handlerStarted.doResolve();
          return releaseHandler;
        }),
      });
      const heldChunk = instance.messaging.addMessageChunk({
        final_response: snapshot('held-response'),
      });
      await handlerStarted;
      const send = instance.send('first');
      const sendSettled =
        outcome === 'failure'
          ? expect(send).rejects.toEqual(new Error('{}'))
          : send;
      await chunksQueued;
      if (outcome === 'cancel') {
        await serviceManager.messageService.cancelCurrentMessageRequest();
      }
      releaseSend.doResolve();
      await sendSettled;
      await instance.send('next');
      expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);

      releaseHandler.doResolve();
      await heldChunk;
      await Promise.all(queuedChunks);

      expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);
      expect(Object.keys(store.getState().allMessagesByID)).toEqual(
        expect.arrayContaining(['explicit-response', 'implicit-response'])
      );
      for (const responseID of ['explicit-response', 'implicit-response']) {
        expect(
          store.getState().allMessageItemsByID[`${responseID}-text`].item
        ).toMatchObject({ text: 'queued content' });
        expect(
          store.getState().allMessageItemsByID[`${responseID}-text`].ui_state
            .streamingState.isDone
        ).toBe(true);
      }
    }
  );

  it('releases chunk responses when their send fails', async () => {
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, chat) => {
        if (request.input.text === 'next') {
          return;
        }
        for (const responseID of ['response-a', 'response-b']) {
          await chat.messaging.addMessageChunk({
            streaming_metadata: { response_id: responseID },
            partial_item: {
              response_type: MessageResponseTypes.TEXT,
              text: 'partial',
              streaming_metadata: { id: 'text' },
            },
          });
        }
        throw new Error('send failed');
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(instance.send('first')).rejects.toEqual(new Error('{}'));
    for (const responseID of ['response-a', 'response-b']) {
      expect(
        store.getState().allMessageItemsByID[`${responseID}-text`].ui_state
          .streamingState.isDone
      ).toBe(true);
      expect(
        serviceManager.messageService.inboundStreaming.getStreamingMeta(
          responseID
        )
      ).toBeUndefined();
    }
    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
    await instance.send('next');

    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
  });

  it('settles an upsert response when its chunk callback rejects through send', async () => {
    const failure = new Error('chunk callback failed');
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, chat) => {
        await chat.messaging.upsertMessage(
          'mixed-response',
          MessageState.STREAMING,
          () => ({ ...snapshot('mixed-response'), request_id: request.id })
        );
        await chat.messaging.addMessageChunk({
          streaming_metadata: { response_id: 'mixed-response' },
          partial_item: {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { value: 'test' },
            streaming_metadata: { id: 'custom' },
          },
        });
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    instance.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: async () => {
        throw failure;
      },
    });

    await expect(instance.send('start')).rejects.toThrow(failure.message);

    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
    for (const itemID of ['text', 'custom']) {
      expect(
        store.getState().allMessageItemsByID[`mixed-response-${itemID}`]
          .ui_state.streamingState.isDone
      ).toBe(true);
    }
  });

  it('keeps a settled request stream alive when another send fails', async () => {
    const started = resolvablePromise();
    const release = resolvablePromise();
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        if (request.input.text === 'first') {
          await instance.messaging.upsertMessage(
            'response-a',
            MessageState.STREAMING,
            () => snapshot('response-a')
          );
        } else if (request.input.text === 'second') {
          throw new Error('send failed');
        } else {
          started.doResolve();
          await release;
          await instance.messaging.upsertMessage(
            'response-c',
            MessageState.COMPLETE,
            () => snapshot('response-c')
          );
        }
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await instance.send('first');
    await expect(instance.send('second')).rejects.toEqual(new Error('{}'));
    consoleError.mockRestore();
    const pendingSend = instance.send('third');
    await started;
    const streamingWhilePending =
      serviceManager.messageService.isAnyMessageStreaming();
    release.doResolve();
    await pendingSend;
    const streamingAfterSend =
      serviceManager.messageService.isAnyMessageStreaming();
    await instance.messaging.upsertMessage(
      'response-a',
      MessageState.COMPLETE,
      () => snapshot('response-a')
    );

    expect(streamingWhilePending).toBe(true);
    expect(streamingAfterSend).toBe(true);
    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
  });

  it('keeps an updated settled request stream alive when another send is canceled', async () => {
    const started = resolvablePromise();
    const release = resolvablePromise();
    let secondRequestID: string;
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        if (request.input.text === 'first') {
          await instance.messaging.upsertMessage(
            'response-a',
            MessageState.STREAMING,
            () => snapshot('response-a')
          );
        } else {
          secondRequestID = request.id;
          started.doResolve();
          await release;
        }
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    await instance.send('first');
    const pendingSend = instance.send('second');
    await started;
    await instance.messaging.upsertMessage(
      'response-a',
      MessageState.STREAMING,
      () => snapshot('response-a')
    );

    await serviceManager.messageService.cancelMessageRequestByID(
      secondRequestID,
      false
    );
    release.doResolve();
    await pendingSend;
    const streamingAfterCancel =
      serviceManager.messageService.isAnyMessageStreaming();
    await instance.messaging.upsertMessage(
      'response-a',
      MessageState.COMPLETE,
      () => snapshot('response-a')
    );

    expect(streamingAfterCancel).toBe(true);
    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
  });

  it('updates content without reviving an upsert stream after cancel', async () => {
    const streaming = resolvablePromise();
    const release = resolvablePromise();
    let requestID: string;
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      customSendMessage: async (request, _options, instance) => {
        requestID = request.id;
        await instance.messaging.upsertMessage(
          'response-a',
          MessageState.STREAMING,
          () => ({
            id: 'response-a',
            request_id: requestID,
            output: {
              generic: [
                { response_type: MessageResponseTypes.TEXT, text: 'before' },
              ],
            },
          })
        );
        streaming.doResolve();
        await release;
      },
    };
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const pendingSend = instance.send('first');
    await streaming;
    await serviceManager.messageService.cancelCurrentMessageRequest();
    release.doResolve();
    await pendingSend;

    await instance.messaging.upsertMessage(
      'response-a',
      MessageState.STREAMING,
      () => ({
        id: 'response-a',
        request_id: requestID,
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'after' },
          ],
        },
      })
    );

    expect(store.getState().allMessagesByID['response-a']).toMatchObject({
      output: { generic: [{ text: 'after' }] },
    });
    expect(serviceManager.messageService.isAnyMessageStreaming()).toBe(false);
    expect(
      store.getState().assistantInputState.stopStreamingButtonState.isVisible
    ).toBe(false);
  });
});
