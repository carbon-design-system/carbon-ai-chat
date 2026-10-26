/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import MessageService, {
  PendingMessageRequest,
} from '../../../src/chat/services/MessageService';
import { ChunkProcessingService } from '../../../src/chat/services/ChunkProcessingService';
import { ConversationLifecycleService } from '../../../src/chat/services/ConversationLifecycleService';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import storeActions from '../../../src/chat/store/actions';
import {
  MessageRequest,
  MessageInputType,
} from '../../../src/types/messaging/Messages';
import {
  BusEventType,
  MessageSendSource,
} from '../../../src/types/events/eventBusTypes';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { OnErrorType } from '../../../src/types/config/ErrorConfig';
import { CancellationReason } from '../../../src/types/config/MessagingConfig';

const createMessage = (id: string): MessageRequest<any> => ({
  id,
  input: {
    message_type: MessageInputType.TEXT,
    text: 'hello',
  },
  history: {
    timestamp: Date.now(),
    silent: false,
  },
});

const createDeferred = () => {
  let resolve: () => void;
  let reject: (error: Error) => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

const flushMessageQueue = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const createServiceManagerStub = (
  customSendMessage = jest.fn(),
  stopStreamingButtonState = { isVisible: false, isDisabled: false }
) => {
  const store = {
    dispatch: jest.fn(),
    getState: () => ({
      config: {
        public: {
          messaging: {
            customSendMessage,
            messageTimeoutSecs: 0,
            messageLoadingIndicatorTimeoutSecs: 0,
          },
        },
        derived: {},
      },
      languagePack: {
        errors_singleMessage: 'error',
        messages_requestCancelled: 'Request cancelled',
      },
      assistantMessageState: { messageIDs: [] as string[] },
      assistantInputState: {
        stopStreamingButtonState,
      },
      allMessagesByID: {},
      targetViewState: {},
      persistedToBrowserStorage: {
        launcherState: { wasLoadedFromBrowser: false },
      },
    }),
  };

  const actions = {
    receive: jest.fn().mockResolvedValue(undefined),
    errorOccurred: jest.fn(),
  };

  const eventBus = {
    fire: jest.fn().mockResolvedValue(undefined),
  };

  // MessageService resolves this collaborator through ServiceManager to answer
  // "is an upsertMessage stream still running".
  const messageUpsertCoordinator = {
    hasStreamingMessages: jest.fn().mockReturnValue(false),
    endAllStreaming: jest.fn(),
    endStreamingForRequest: jest.fn(),
    endStreamingMessage: jest.fn((messageID, generation) => {
      serviceManager.conversationLifecycleService.responseFinished(
        messageID,
        generation
      );
      store.dispatch(storeActions.endMessageStreaming(messageID));
    }),
  };

  const serviceManager = {
    restartCount: 0,
    store,
    actions,
    eventBus,
    instance: {},
    conversationLifecycleService: new ConversationLifecycleService(),
    messageUpsertCoordinator,
    messageService: {
      hideStopStreamingButtonIfNoUpsertStreaming: jest.fn(),
      updateStreamingCancellation: jest.fn(),
    },
  } as unknown as ServiceManager;

  serviceManager.chunkProcessingService = new ChunkProcessingService(
    serviceManager
  );
  return serviceManager;
};

describe('MessageService', () => {
  it('retains request ownership after its callback returns and across restarts', async () => {
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const serviceManager = createServiceManagerStub(customSendMessage);
    const messageService = new MessageService(serviceManager, {
      messaging: { messageTimeoutSecs: 0 },
    });

    await messageService.send(
      createMessage('first-request'),
      MessageSendSource.MESSAGE_INPUT,
      'local-first'
    );
    expect(
      messageService.isRequestFromPreviousConversation('first-request')
    ).toBe(false);
    await messageService.cancelAllMessageRequests();
    serviceManager.restartCount++;

    await messageService.send(
      createMessage('second-request'),
      MessageSendSource.MESSAGE_INPUT,
      'local-second'
    );
    expect(
      messageService.isRequestFromPreviousConversation('first-request')
    ).toBe(true);
    expect(
      messageService.isRequestFromPreviousConversation('second-request')
    ).toBe(false);
    expect(
      messageService.isRequestFromPreviousConversation('unknown-request')
    ).toBe(false);
    expect(messageService.isRequestFromPreviousConversation(undefined)).toBe(
      false
    );

    await messageService.cancelAllMessageRequests();
    serviceManager.restartCount++;
    expect(
      messageService.isRequestFromPreviousConversation('first-request')
    ).toBe(true);
    expect(
      messageService.isRequestFromPreviousConversation('second-request')
    ).toBe(true);
  });

  it('registers the final request ID before calling the host', async () => {
    const customSendMessage = jest.fn((request) => {
      serviceManager.restartCount++;
      expect(messageService.isRequestFromPreviousConversation(request.id)).toBe(
        true
      );
    });
    const serviceManager = createServiceManagerStub(customSendMessage);
    const messageService = new MessageService(serviceManager, {
      messaging: { messageTimeoutSecs: 0 },
    });
    (serviceManager.eventBus.fire as jest.Mock).mockImplementation(
      async (event) => {
        if (event.type === BusEventType.PRE_SEND) {
          event.data.id = 'host-request';
        }
      }
    );

    await messageService.send(
      createMessage('initial-request'),
      MessageSendSource.MESSAGE_INPUT,
      'local-request'
    );
    expect(customSendMessage).toHaveBeenCalledTimes(1);
    expect(
      messageService.isRequestFromPreviousConversation('host-request')
    ).toBe(true);
    expect(
      messageService.isRequestFromPreviousConversation('initial-request')
    ).toBe(false);
  });

  it('uses the queued generation when the conversation changes before the host callback', async () => {
    const sendEvent = resolvablePromise<void>();
    const reachedSendEvent = resolvablePromise<void>();
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const serviceManager = createServiceManagerStub(customSendMessage);
    const messageService = new MessageService(serviceManager, {
      messaging: { messageTimeoutSecs: 0 },
    });
    (serviceManager.eventBus.fire as jest.Mock).mockImplementation((event) => {
      if (event.type === BusEventType.SEND) {
        reachedSendEvent.doResolve();
        return sendEvent;
      }
      return Promise.resolve();
    });

    const sent = messageService.send(
      createMessage('waiting-request'),
      MessageSendSource.MESSAGE_INPUT,
      'local-waiting'
    );
    await reachedSendEvent;
    serviceManager.restartCount++;
    sendEvent.doResolve();
    await sent;

    expect(customSendMessage).toHaveBeenCalledTimes(1);
    expect(
      messageService.isRequestFromPreviousConversation('waiting-request')
    ).toBe(true);
  });

  it('retains request ownership after stop and stream cleanup', async () => {
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const serviceManager = createServiceManagerStub(customSendMessage);
    const messageService = new MessageService(serviceManager, {
      messaging: { messageTimeoutSecs: 0 },
    });
    await messageService.send(
      createMessage('stopped-request'),
      MessageSendSource.MESSAGE_INPUT,
      'local-stopped'
    );
    await messageService.cancelMessageRequestByID(
      'stopped-request',
      false,
      CancellationReason.STOP_STREAMING
    );
    messageService.finalizeStreamingMessage('stopped-request');

    expect(
      messageService.isRequestFromPreviousConversation('stopped-request')
    ).toBe(false);
    serviceManager.restartCount++;
    expect(
      messageService.isRequestFromPreviousConversation('stopped-request')
    ).toBe(true);
  });

  it('sends a message and advances the queue', async () => {
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const serviceManager = createServiceManagerStub(customSendMessage);

    const messageService = new MessageService(serviceManager, {
      messaging: {
        customSendMessage,
        messageTimeoutSecs: 0,
        messageLoadingIndicatorTimeoutSecs: 0,
      },
    } as any);

    const message = createMessage('m-1');
    await messageService.send(
      message,
      MessageSendSource.MESSAGE_INPUT,
      'local-1',
      { silent: false }
    );

    expect(customSendMessage).toHaveBeenCalledTimes(1);
    const [, options] = customSendMessage.mock.calls[0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect((messageService as any).queue.current).toBeNull();
  });

  it("keeps an external stream's stop button visible when another request completes", async () => {
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const serviceManager = createServiceManagerStub(customSendMessage, {
      isVisible: true,
      isDisabled: false,
    });
    const messageService = new MessageService(serviceManager, {
      messaging: {
        customSendMessage,
        messageTimeoutSecs: 0,
        messageLoadingIndicatorTimeoutSecs: 0,
      },
    } as any);

    messageService.markCurrentMessageAsStreaming(
      'external-response',
      'external-item'
    );

    await messageService.send(
      createMessage('separate-request'),
      MessageSendSource.MESSAGE_INPUT,
      'local-separate',
      { silent: false }
    );

    expect(customSendMessage).toHaveBeenCalledTimes(1);
    expect((messageService as any).queue.current).toBeNull();
    expect(messageService.inboundStreaming.streamingMessageID).toBe(
      'external-response'
    );
    expect(serviceManager.store.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_STOP_STREAMING_BUTTON_VISIBLE',
        isVisible: false,
      })
    );
  });

  it('cancels a streaming message by response id and advances the queue', async () => {
    const serviceManager = createServiceManagerStub(jest.fn());
    const messageService = new MessageService(serviceManager, {
      messaging: {
        customSendMessage: jest.fn().mockResolvedValue(undefined),
        messageTimeoutSecs: 0,
        messageLoadingIndicatorTimeoutSecs: 0,
      },
    } as any);

    const sendMessagePromise = resolvablePromise<void>();
    const abortController = new AbortController();
    const pendingRequest: PendingMessageRequest = {
      restartGeneration: 0,
      localMessageID: 'local-1',
      message: createMessage('m-2'),
      sendMessagePromise,
      requestOptions: {},
      timeFirstRequest: 0,
      timeLastRequest: 0,
      trackData: {
        numErrors: 0,
        lastRequestTime: 0,
        totalRequestTime: 0,
      },
      isProcessed: false,
      source: MessageSendSource.MESSAGE_INPUT,
      sendMessageController: abortController,
    };

    (messageService as any).queue.current = pendingRequest;
    messageService.markCurrentMessageAsStreaming('resp-1', 'item-1');

    await messageService.cancelCurrentMessageRequest();

    expect(abortController.signal.aborted).toBe(true);
    expect((messageService as any).queue.current).toBeNull();
  });

  it('cancels a waiting message using its abort controller', async () => {
    const serviceManager = createServiceManagerStub(jest.fn());
    const messageService = new MessageService(serviceManager, {
      messaging: {
        customSendMessage: jest.fn().mockResolvedValue(undefined),
        messageTimeoutSecs: 0,
        messageLoadingIndicatorTimeoutSecs: 0,
      },
    } as any);

    // Keep the queue busy so the next send stays in the waiting list.
    (messageService as any).queue.current = {
      restartGeneration: 0,
      localMessageID: 'local-current',
      message: createMessage('m-current'),
      sendMessagePromise: resolvablePromise<void>(),
      requestOptions: {},
      timeFirstRequest: 0,
      timeLastRequest: 0,
      trackData: {
        numErrors: 0,
        lastRequestTime: 0,
        totalRequestTime: 0,
      },
      isProcessed: false,
      source: MessageSendSource.MESSAGE_INPUT,
      sendMessageController: new AbortController(),
    };

    const sendPromise = messageService.send(
      createMessage('m-waiting'),
      MessageSendSource.MESSAGE_INPUT,
      'local-waiting',
      { silent: false }
    );

    const controller = (messageService as any).messageAbortControllers.get(
      'm-waiting'
    );
    expect(controller).toBeInstanceOf(AbortController);

    await messageService.cancelMessageRequestByID(
      'm-waiting',
      false,
      CancellationReason.CONVERSATION_RESTARTED
    );

    await expect(sendPromise).resolves.toBeUndefined();
    expect(controller.signal.aborted).toBe(true);
    expect((messageService as any).queue.waiting).toHaveLength(0);
  });

  it.each([false, true])(
    'cancels requests after their send callbacks return (streaming: %s)',
    async (isStreaming) => {
      const customSendMessage = jest.fn().mockResolvedValue(undefined);
      const serviceManager = createServiceManagerStub(customSendMessage);
      const messageService = new MessageService(serviceManager, {
        messaging: { messageTimeoutSecs: 0 },
      });

      await messageService.send(
        createMessage('returned-request'),
        MessageSendSource.MESSAGE_INPUT,
        'local-returned'
      );
      const signal: AbortSignal = customSendMessage.mock.calls[0][1].signal;
      const onAbort = jest.fn();
      signal.addEventListener('abort', onAbort);
      expect((messageService as any).queue.current).toBeNull();

      if (isStreaming) {
        messageService.markCurrentMessageAsStreaming('response-id', 'item-id');
      }

      await messageService.cancelAllMessageRequests();

      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBe(CancellationReason.CONVERSATION_RESTARTED);
      expect(onAbort).toHaveBeenCalledTimes(1);
      expect((messageService as any).messageAbortControllers.size).toBe(0);
      expect(messageService.inboundStreaming.streamingMessageID).toBeNull();
    }
  );

  it('cancels retained requests even when an abort listener clears their tracking', async () => {
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const serviceManager = createServiceManagerStub(customSendMessage);
    const messageService = new MessageService(serviceManager, {
      messaging: { messageTimeoutSecs: 0 },
    });

    for (const id of ['first-request', 'second-request']) {
      await messageService.send(
        createMessage(id),
        MessageSendSource.MESSAGE_INPUT,
        `local-${id}`
      );
    }
    const firstSignal: AbortSignal = customSendMessage.mock.calls[0][1].signal;
    const secondSignal: AbortSignal = customSendMessage.mock.calls[1][1].signal;
    firstSignal.addEventListener('abort', () => {
      messageService.finalizeStreamingMessage('second-request');
    });

    await messageService.cancelAllMessageRequests('custom cancellation');

    expect(firstSignal.reason).toBe('custom cancellation');
    expect(secondSignal.reason).toBe('custom cancellation');
    expect((messageService as any).messageAbortControllers.size).toBe(0);
  });

  it('clears retained controllers that were already aborted', async () => {
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const serviceManager = createServiceManagerStub(customSendMessage);
    const messageService = new MessageService(serviceManager, {
      messaging: { messageTimeoutSecs: 0 },
    });

    await messageService.send(
      createMessage('aborted-request'),
      MessageSendSource.MESSAGE_INPUT,
      'local-aborted'
    );
    const controller: AbortController = (
      messageService as any
    ).messageAbortControllers.get('aborted-request');
    controller.abort(CancellationReason.STOP_STREAMING);

    await messageService.cancelAllMessageRequests();

    expect(controller.signal.reason).toBe(CancellationReason.STOP_STREAMING);
    expect((messageService as any).messageAbortControllers.size).toBe(0);
  });

  it('rejects a send when it exceeds the configured timeout', async () => {
    const customSendMessage = jest.fn(() => new Promise<void>(() => undefined));
    const serviceManager = createServiceManagerStub(customSendMessage);

    const messageService = new MessageService(serviceManager, {
      messaging: {
        customSendMessage,
        messageTimeoutSecs: 1,
        messageLoadingIndicatorTimeoutSecs: 0,
      },
    } as any);

    const startSpy = jest
      .spyOn(messageService.messageLoadingManager, 'start')
      .mockImplementation((_, __, onTimeout) => {
        onTimeout();
      });

    try {
      const sendPromise = messageService.send(
        createMessage('m-timeout'),
        MessageSendSource.MESSAGE_INPUT,
        'local-timeout',
        { silent: false }
      );

      await expect(sendPromise).rejects.toThrow(CancellationReason.TIMEOUT);
      expect(customSendMessage).toHaveBeenCalledTimes(1);
      expect(serviceManager.actions.errorOccurred).toHaveBeenCalledWith({
        errorType: OnErrorType.MESSAGE_COMMUNICATION,
        message: CancellationReason.TIMEOUT,
        otherData: undefined,
      });
    } finally {
      startSpy.mockRestore();
    }
  });

  it('cancels streaming by item id even when response_id differs', async () => {
    const serviceManager = createServiceManagerStub(jest.fn());
    const messageService = new MessageService(serviceManager, {
      messaging: {
        customSendMessage: jest.fn().mockResolvedValue(undefined),
        messageTimeoutSecs: 0,
        messageLoadingIndicatorTimeoutSecs: 0,
      },
    } as any);

    const sendMessagePromise = resolvablePromise<void>();
    const abortController = new AbortController();
    const pendingRequest: PendingMessageRequest = {
      restartGeneration: 0,
      localMessageID: 'local-streaming',
      message: createMessage('m-streaming'),
      sendMessagePromise,
      requestOptions: {},
      timeFirstRequest: 0,
      timeLastRequest: 0,
      trackData: {
        numErrors: 0,
        lastRequestTime: 0,
        totalRequestTime: 0,
      },
      isProcessed: false,
      source: MessageSendSource.MESSAGE_INPUT,
      sendMessageController: abortController,
    };

    (messageService as any).queue.current = pendingRequest;
    (messageService as any).messageAbortControllers.set(
      'm-streaming',
      abortController
    );

    messageService.markCurrentMessageAsStreaming('resp-1', 'item-1');

    await messageService.cancelMessageRequestByID(
      'item-1',
      false,
      CancellationReason.STOP_STREAMING
    );

    await expect(sendMessagePromise).resolves.toBeUndefined();
    expect(abortController.signal.aborted).toBe(true);
    expect((messageService as any).inboundStreaming.streamingMessageID).toBe(
      null
    );
    expect((messageService as any).queue.current).toBeNull();
  });

  describe('streaming terminal cleanup', () => {
    it("keeps another stream's stop button visible after an ERROR upsert", () => {
      const serviceManager = createServiceManagerStub(jest.fn(), {
        isVisible: true,
        isDisabled: false,
      });
      const messageService = new MessageService(serviceManager, {
        messaging: { messageTimeoutSecs: 0 },
      });
      messageService.markCurrentMessageAsStreaming('response-a');
      messageService.markCurrentMessageAsStreaming('response-b');

      messageService.markStreamingResponseError('response-a');

      expect(messageService.inboundStreaming.streamingMessageID).toBe(
        'response-b'
      );
      expect(serviceManager.store.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_STOP_STREAMING_BUTTON_VISIBLE',
          isVisible: false,
        })
      );
    });

    it('hides the stop button after the only stream receives an ERROR upsert', () => {
      const serviceManager = createServiceManagerStub(jest.fn(), {
        isVisible: true,
        isDisabled: false,
      });
      const messageService = new MessageService(serviceManager, {
        messaging: { messageTimeoutSecs: 0 },
      });
      messageService.markCurrentMessageAsStreaming('response-a');

      messageService.markStreamingResponseError('response-a');

      expect(messageService.inboundStreaming.streamingMessageID).toBeNull();
      expect(serviceManager.store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_STOP_STREAMING_BUTTON_VISIBLE',
          isVisible: false,
        })
      );
    });

    it('advances after an ERROR upsert when the transport later succeeds', async () => {
      const first = createDeferred();
      const customSendMessage = jest.fn((message: MessageRequest<any>) =>
        message.id === 'm-first' ? first.promise : Promise.resolve()
      );
      const serviceManager = createServiceManagerStub(customSendMessage);
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);

      const firstSend = messageService.send(
        createMessage('m-first'),
        MessageSendSource.MESSAGE_INPUT,
        'local-first'
      );
      await flushMessageQueue();
      messageService.markCurrentMessageAsStreaming('response-first');
      const secondSend = messageService.send(
        createMessage('m-second'),
        MessageSendSource.MESSAGE_INPUT,
        'local-second'
      );

      messageService.markStreamingResponseError('response-first');
      expect((messageService as any).queue.current.message.id).toBe('m-first');

      first.resolve();
      await firstSend;
      await secondSend;

      expect(customSendMessage).toHaveBeenCalledTimes(2);
      expect((messageService as any).queue.current).toBeNull();
    });

    it('advances immediately when an ERROR upsert follows transport settlement', async () => {
      const customSendMessage = jest.fn();
      const serviceManager = createServiceManagerStub(customSendMessage);
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);
      customSendMessage.mockImplementation((message: MessageRequest<any>) => {
        if (message.id === 'm-first') {
          messageService.markCurrentMessageAsStreaming('response-first');
        }
        return Promise.resolve();
      });

      await messageService.send(
        createMessage('m-first'),
        MessageSendSource.MESSAGE_INPUT,
        'local-first'
      );
      const secondSend = messageService.send(
        createMessage('m-second'),
        MessageSendSource.MESSAGE_INPUT,
        'local-second'
      );
      expect(customSendMessage).toHaveBeenCalledTimes(1);

      messageService.markStreamingResponseError('response-first');
      await secondSend;

      expect(customSendMessage).toHaveBeenCalledTimes(2);
      expect((messageService as any).queue.current).toBeNull();
    });

    it('advances after an ERROR upsert when the transport later fails', async () => {
      const first = createDeferred();
      const customSendMessage = jest.fn((message: MessageRequest<any>) =>
        message.id === 'm-first' ? first.promise : Promise.resolve()
      );
      const serviceManager = createServiceManagerStub(customSendMessage);
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);
      serviceManager.messageService = messageService;

      const firstSend = messageService.send(
        createMessage('m-first'),
        MessageSendSource.MESSAGE_INPUT,
        'local-first'
      );
      const rejectedFirstSend = expect(firstSend).rejects.toEqual(
        new Error('{}')
      );
      await flushMessageQueue();
      messageService.markCurrentMessageAsStreaming('response-first');
      const secondSend = messageService.send(
        createMessage('m-second'),
        MessageSendSource.MESSAGE_INPUT,
        'local-second'
      );

      messageService.markStreamingResponseError('response-first');
      first.reject(new Error('failed'));
      await rejectedFirstSend;
      await secondSend;

      expect(customSendMessage).toHaveBeenCalledTimes(2);
      expect((messageService as any).queue.current).toBeNull();
    });

    it('clears partial-stream routing before advancing after a send failure', async () => {
      const first = createDeferred();
      const customSendMessage = jest.fn((message: MessageRequest<any>) =>
        message.id === 'm-first' ? first.promise : Promise.resolve()
      );
      const serviceManager = createServiceManagerStub(customSendMessage);
      const lifecycle = serviceManager.conversationLifecycleService;
      const responseFinished = jest.spyOn(lifecycle, 'responseFinished');
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);
      serviceManager.messageService = messageService;

      const firstSend = messageService.send(
        createMessage('m-first'),
        MessageSendSource.MESSAGE_INPUT,
        'local-first'
      );
      const rejectedFirstSend = expect(firstSend).rejects.toEqual(
        new Error('{}')
      );
      await flushMessageQueue();
      messageService.markCurrentMessageAsStreaming('response-first');
      const secondSend = messageService.send(
        createMessage('m-second'),
        MessageSendSource.MESSAGE_INPUT,
        'local-second'
      );

      first.reject(new Error('failed'));
      await rejectedFirstSend;
      await secondSend;

      expect(messageService.inboundStreaming.streamingMessageID).toBeNull();
      expect(lifecycle.responseFinished).toHaveBeenCalledWith(
        'response-first',
        0
      );
      expect(
        customSendMessage.mock.calls.map(([message]) => message.id)
      ).toEqual(['m-first', 'm-second']);
      expect(responseFinished.mock.invocationCallOrder[0]).toBeLessThan(
        customSendMessage.mock.invocationCallOrder[1]
      );
    });

    it('clears partial-stream routing before advancing after a timeout', async () => {
      let timeout: () => void;
      const customSendMessage = jest.fn((message: MessageRequest<any>) =>
        message.id === 'm-first'
          ? new Promise<void>(() => undefined)
          : Promise.resolve()
      );
      const serviceManager = createServiceManagerStub(customSendMessage);
      const lifecycle = serviceManager.conversationLifecycleService;
      const responseFinished = jest.spyOn(lifecycle, 'responseFinished');
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 1,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);
      const startSpy = jest
        .spyOn(messageService.messageLoadingManager, 'start')
        .mockImplementation((_, __, onTimeout) => {
          timeout = onTimeout;
        });

      try {
        const firstSend = messageService.send(
          createMessage('m-first'),
          MessageSendSource.MESSAGE_INPUT,
          'local-first'
        );
        const rejectedFirstSend = expect(firstSend).rejects.toThrow(
          CancellationReason.TIMEOUT
        );
        await flushMessageQueue();
        messageService.markCurrentMessageAsStreaming('response-first');
        const secondSend = messageService.send(
          createMessage('m-second'),
          MessageSendSource.MESSAGE_INPUT,
          'local-second'
        );

        timeout!();
        await rejectedFirstSend;
        await secondSend;

        expect(messageService.inboundStreaming.streamingMessageID).toBeNull();
        expect(lifecycle.responseFinished).toHaveBeenCalledWith(
          'response-first',
          0
        );
        expect(
          customSendMessage.mock.calls.map(([message]) => message.id)
        ).toEqual(['m-first', 'm-second']);
        expect(responseFinished.mock.invocationCallOrder[0]).toBeLessThan(
          customSendMessage.mock.invocationCallOrder[1]
        );
      } finally {
        startSpy.mockRestore();
      }
    });
  });

  describe('Message cancellation with system messages', () => {
    it('creates system message when canceling before streaming starts', async () => {
      const customSendMessage = jest.fn().mockImplementation(
        () => new Promise<void>(() => undefined) // Never resolves
      );
      const serviceManager = createServiceManagerStub(customSendMessage);
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);

      const message = createMessage('m-1');
      const sendPromise = messageService.send(
        message,
        MessageSendSource.MESSAGE_INPUT,
        'local-1',
        { silent: false }
      );

      // Cancel before streaming starts
      await messageService.cancelMessageRequestByID(
        'm-1',
        false,
        CancellationReason.STOP_STREAMING
      );

      await expect(sendPromise).resolves.toBeUndefined();

      // Verify system message was dispatched
      const dispatchCalls = (serviceManager.store.dispatch as jest.Mock).mock
        .calls;
      const addMessageCalls = dispatchCalls.filter(
        (call: any) => call[0]?.type === 'ADD_MESSAGE'
      );
      expect(addMessageCalls.length).toBeGreaterThan(0);
    });

    it('does not create duplicate system message when canceling during streaming', async () => {
      const customSendMessage = jest.fn().mockResolvedValue(undefined);
      const serviceManager = createServiceManagerStub(customSendMessage);
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);

      const sendMessagePromise = resolvablePromise<void>();
      const abortController = new AbortController();
      const pendingRequest: PendingMessageRequest = {
        restartGeneration: 0,
        localMessageID: 'local-1',
        message: createMessage('m-1'),
        sendMessagePromise,
        requestOptions: {},
        timeFirstRequest: 0,
        timeLastRequest: 0,
        trackData: {
          numErrors: 0,
          lastRequestTime: 0,
          totalRequestTime: 0,
        },
        isProcessed: false,
        source: MessageSendSource.MESSAGE_INPUT,
        sendMessageController: abortController,
        isStreaming: true, // Mark as streaming
      };

      (messageService as any).queue.current = pendingRequest;
      messageService.markCurrentMessageAsStreaming('resp-1', 'item-1');

      const initialDispatchCount = (serviceManager.store.dispatch as jest.Mock)
        .mock.calls.length;

      await messageService.cancelMessageRequestByID(
        'item-1',
        false,
        CancellationReason.STOP_STREAMING
      );

      await expect(sendMessagePromise).resolves.toBeUndefined();

      // Verify no additional system message was created
      // (MessageTypeComponent renders the stopped message inline via stream_stopped metadata)
      const finalDispatchCount = (serviceManager.store.dispatch as jest.Mock)
        .mock.calls.length;
      const newDispatches = finalDispatchCount - initialDispatchCount;

      // Should only have stop button visibility changes, not system message
      expect(newDispatches).toBeLessThan(5);
    });

    it('hides and re-enables the stop streaming button when canceling a streaming message', async () => {
      const serviceManager = createServiceManagerStub(jest.fn(), {
        isVisible: true,
        isDisabled: true,
      });
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage: jest.fn().mockResolvedValue(undefined),
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);

      const sendMessagePromise = resolvablePromise<void>();
      const pendingRequest: PendingMessageRequest = {
        restartGeneration: 0,
        localMessageID: 'local-1',
        message: createMessage('m-1'),
        sendMessagePromise,
        requestOptions: {},
        timeFirstRequest: 0,
        timeLastRequest: 0,
        trackData: {
          numErrors: 0,
          lastRequestTime: 0,
          totalRequestTime: 0,
        },
        isProcessed: false,
        source: MessageSendSource.MESSAGE_INPUT,
        sendMessageController: new AbortController(),
        isStreaming: true,
      };

      (messageService as any).queue.current = pendingRequest;
      messageService.markCurrentMessageAsStreaming('resp-1', 'item-1');

      await messageService.cancelMessageRequestByID(
        'item-1',
        false,
        CancellationReason.STOP_STREAMING
      );

      const dispatchCalls = (serviceManager.store.dispatch as jest.Mock).mock
        .calls;
      const visibilityToggle = dispatchCalls.find(
        (call: any) =>
          call[0]?.type === 'SET_STOP_STREAMING_BUTTON_VISIBLE' &&
          call[0]?.isVisible === false
      );
      const disabledToggle = dispatchCalls.find(
        (call: any) =>
          call[0]?.type === 'SET_STOP_STREAMING_BUTTON_DISABLED' &&
          call[0]?.isDisabled === false
      );
      expect(visibilityToggle).toBeDefined();
      expect(disabledToggle).toBeDefined();
    });

    it('handles cancellation with USER_CANCELLED reason', async () => {
      const customSendMessage = jest
        .fn()
        .mockImplementation(() => new Promise<void>(() => undefined));
      const serviceManager = createServiceManagerStub(customSendMessage);
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);

      const message = createMessage('m-cancel');
      const sendPromise = messageService.send(
        message,
        MessageSendSource.MESSAGE_INPUT,
        'local-cancel',
        { silent: false }
      );

      // Get the controller before cancellation
      const controller = (messageService as any).messageAbortControllers.get(
        'm-cancel'
      );
      expect(controller).toBeDefined();

      await messageService.cancelMessageRequestByID(
        'm-cancel',
        false,
        CancellationReason.STOP_STREAMING
      );

      await expect(sendPromise).resolves.toBeUndefined();

      // Verify the controller was aborted
      expect(controller.signal.aborted).toBe(true);
    });
  });

  describe('isAnyMessageStreaming', () => {
    const build = (stopStreamingButtonState?: {
      isVisible: boolean;
      isDisabled: boolean;
    }) => {
      const serviceManager = createServiceManagerStub(
        jest.fn().mockResolvedValue(undefined),
        stopStreamingButtonState
      );
      const messageService = new MessageService(serviceManager, {
        messaging: { messageTimeoutSecs: 0 },
      } as any);
      return { serviceManager, messageService };
    };

    it('is false when nothing is streaming', () => {
      const { messageService } = build();
      expect(messageService.isAnyMessageStreaming()).toBe(false);
    });

    it('is true while a chunk stream is active', () => {
      const { messageService } = build();
      messageService.inboundStreaming.streamingMessageID = 'chunk-1';
      expect(messageService.isAnyMessageStreaming()).toBe(true);
    });

    it('is true while an upsert stream is active', () => {
      const { serviceManager, messageService } = build();
      (
        serviceManager.messageUpsertCoordinator
          .hasStreamingMessages as jest.Mock
      ).mockReturnValue(true);

      // The chunk registry is null for a pure-upsert flow, which is exactly why the
      // predicate cannot be built on inboundStreaming alone.
      expect(messageService.inboundStreaming.streamingMessageID).toBeNull();
      expect(messageService.isAnyMessageStreaming()).toBe(true);
    });

    it('hideStopStreamingButtonIfIdle leaves the button alone while anything streams', () => {
      const { serviceManager, messageService } = build({
        isVisible: true,
        isDisabled: false,
      });
      (
        serviceManager.messageUpsertCoordinator
          .hasStreamingMessages as jest.Mock
      ).mockReturnValue(true);

      messageService.hideStopStreamingButtonIfIdle();

      expect(serviceManager.store.dispatch).not.toHaveBeenCalled();
    });

    it('hideStopStreamingButtonIfIdle leaves the button alone while a chunk stream is active', () => {
      // The call sites that use this variant used to pass inboundStreaming's id to
      // resetStopStreamingButton, which kept the button up; that must still hold.
      const { serviceManager, messageService } = build({
        isVisible: true,
        isDisabled: false,
      });
      messageService.inboundStreaming.streamingMessageID = 'chunk-1';

      messageService.hideStopStreamingButtonIfIdle();

      expect(serviceManager.store.dispatch).not.toHaveBeenCalled();
    });

    it('hideStopStreamingButtonIfIdle hides once nothing streams', () => {
      const { serviceManager, messageService } = build({
        isVisible: true,
        isDisabled: false,
      });

      messageService.hideStopStreamingButtonIfIdle();

      const types = (serviceManager.store.dispatch as jest.Mock).mock.calls.map(
        (call) => call[0]?.type
      );
      expect(types).toContain('SET_STOP_STREAMING_BUTTON_VISIBLE');
      expect(types).toContain('SET_STOP_STREAMING_BUTTON_DISABLED');
    });

    it('hideStopStreamingButtonIfNoUpsertStreaming ignores an active chunk stream', () => {
      const { serviceManager, messageService } = build({
        isVisible: true,
        isDisabled: false,
      });
      messageService.inboundStreaming.streamingMessageID = 'chunk-1';

      // The chunk flow has always hidden on its own complete_item, so this variant must
      // not consult inboundStreaming — otherwise complete_item would stop hiding.
      messageService.hideStopStreamingButtonIfNoUpsertStreaming();

      const types = (serviceManager.store.dispatch as jest.Mock).mock.calls.map(
        (call) => call[0]?.type
      );
      expect(types).toContain('SET_STOP_STREAMING_BUTTON_VISIBLE');
    });

    it('hideStopStreamingButtonIfNoUpsertStreaming respects an active upsert stream', () => {
      const { serviceManager, messageService } = build({
        isVisible: true,
        isDisabled: false,
      });
      (
        serviceManager.messageUpsertCoordinator
          .hasStreamingMessages as jest.Mock
      ).mockReturnValue(true);

      messageService.hideStopStreamingButtonIfNoUpsertStreaming();

      expect(serviceManager.store.dispatch).not.toHaveBeenCalled();
    });
  });
});
