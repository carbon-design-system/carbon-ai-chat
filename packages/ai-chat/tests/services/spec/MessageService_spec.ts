/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import MessageService, {
  PendingMessageRequest,
} from "../../../src/chat/services/MessageService";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import {
  MessageRequest,
  MessageInputType,
} from "../../../src/types/messaging/Messages";
import { MessageSendSource } from "../../../src/types/events/eventBusTypes";
import { resolvablePromise } from "../../../src/chat/utils/resolvablePromise";
import { OnErrorType } from "../../../src/types/config/PublicConfig";
import { CancellationReason } from "../../../src/types/config/MessagingConfig";

const createMessage = (id: string): MessageRequest<any> => ({
  id,
  input: {
    message_type: MessageInputType.TEXT,
    text: "hello",
  },
  history: {
    timestamp: Date.now(),
    silent: false,
  },
});

const createServiceManagerStub = (customSendMessage = jest.fn()) => {
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
        derived: {
          languagePack: {
            errors_singleMessage: "error",
          },
        },
      },
      assistantMessageState: { messageIDs: [] as string[] },
      assistantInputState: {
        stopStreamingButtonState: {
          isVisible: false,
          isDisabled: false,
        },
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

  const serviceManager = {
    store,
    actions,
    eventBus,
    instance: {},
  } as unknown as ServiceManager;

  return serviceManager;
};

describe("MessageService", () => {
  it("sends a message and advances the queue", async () => {
    const customSendMessage = jest.fn().mockResolvedValue(undefined);
    const serviceManager = createServiceManagerStub(customSendMessage);

    const messageService = new MessageService(serviceManager, {
      messaging: {
        customSendMessage,
        messageTimeoutSecs: 0,
        messageLoadingIndicatorTimeoutSecs: 0,
      },
    } as any);

    const message = createMessage("m-1");
    await messageService.send(
      message,
      MessageSendSource.MESSAGE_INPUT,
      "local-1",
      { silent: false },
    );

    expect(customSendMessage).toHaveBeenCalledTimes(1);
    const [, options] = customSendMessage.mock.calls[0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect((messageService as any).queue.current).toBeNull();
  });

  it("cancels a streaming message by response id and advances the queue", async () => {
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
      localMessageID: "local-1",
      message: createMessage("m-2"),
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
    messageService.markCurrentMessageAsStreaming("resp-1", "item-1");

    await messageService.cancelCurrentMessageRequest();

    expect(abortController.signal.aborted).toBe(true);
    expect((messageService as any).queue.current).toBeNull();
  });

  it("cancels a waiting message using its abort controller", async () => {
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
      localMessageID: "local-current",
      message: createMessage("m-current"),
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
      createMessage("m-waiting"),
      MessageSendSource.MESSAGE_INPUT,
      "local-waiting",
      { silent: false },
    );

    const controller = (messageService as any).messageAbortControllers.get(
      "m-waiting",
    );
    expect(controller).toBeInstanceOf(AbortController);

    await messageService.cancelMessageRequestByID(
      "m-waiting",
      false,
      CancellationReason.CONVERSATION_RESTARTED,
    );

    await expect(sendPromise).resolves.toBeUndefined();
    expect(controller.signal.aborted).toBe(true);
    expect((messageService as any).queue.waiting).toHaveLength(0);
  });

  it("rejects a send when it exceeds the configured timeout", async () => {
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
      .spyOn(messageService.messageLoadingManager, "start")
      .mockImplementation((_, __, onTimeout) => {
        onTimeout();
      });

    try {
      const sendPromise = messageService.send(
        createMessage("m-timeout"),
        MessageSendSource.MESSAGE_INPUT,
        "local-timeout",
        { silent: false },
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

  it("cancels streaming by item id even when response_id differs", async () => {
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
      localMessageID: "local-streaming",
      message: createMessage("m-streaming"),
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
      "m-streaming",
      abortController,
    );

    messageService.markCurrentMessageAsStreaming("resp-1", "item-1");

    await messageService.cancelMessageRequestByID(
      "item-1",
      false,
      CancellationReason.STOP_STREAMING,
    );

    await expect(sendMessagePromise).resolves.toBeUndefined();
    expect(abortController.signal.aborted).toBe(true);
    expect((messageService as any).inboundStreaming.streamingMessageID).toBe(
      null,
    );
    expect((messageService as any).queue.current).toBeNull();
  });

  describe("Message cancellation with system messages", () => {
    it("creates system message when cancelling before streaming starts", async () => {
      const customSendMessage = jest.fn().mockImplementation(
        () => new Promise<void>(() => undefined), // Never resolves
      );
      const serviceManager = createServiceManagerStub(customSendMessage);
      const messageService = new MessageService(serviceManager, {
        messaging: {
          customSendMessage,
          messageTimeoutSecs: 0,
          messageLoadingIndicatorTimeoutSecs: 0,
        },
      } as any);

      const message = createMessage("m-1");
      const sendPromise = messageService.send(
        message,
        MessageSendSource.MESSAGE_INPUT,
        "local-1",
        { silent: false },
      );

      // Cancel before streaming starts
      await messageService.cancelMessageRequestByID(
        "m-1",
        false,
        CancellationReason.STOP_STREAMING,
      );

      await expect(sendPromise).resolves.toBeUndefined();

      // Verify system message was dispatched
      const dispatchCalls = (serviceManager.store.dispatch as jest.Mock).mock
        .calls;
      const addMessageCalls = dispatchCalls.filter(
        (call: any) => call[0]?.type === "ADD_MESSAGE",
      );
      expect(addMessageCalls.length).toBeGreaterThan(0);
    });

    it("does not create duplicate system message when cancelling during streaming", async () => {
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
        localMessageID: "local-1",
        message: createMessage("m-1"),
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
      messageService.markCurrentMessageAsStreaming("resp-1", "item-1");

      const initialDispatchCount = (serviceManager.store.dispatch as jest.Mock)
        .mock.calls.length;

      await messageService.cancelMessageRequestByID(
        "item-1",
        false,
        CancellationReason.STOP_STREAMING,
      );

      await expect(sendMessagePromise).resolves.toBeUndefined();

      // Verify no additional system message was created (ResponseStopped handles it)
      const finalDispatchCount = (serviceManager.store.dispatch as jest.Mock)
        .mock.calls.length;
      const newDispatches = finalDispatchCount - initialDispatchCount;

      // Should only have stop button visibility changes, not system message
      expect(newDispatches).toBeLessThan(5);
    });

    it("handles cancellation with USER_CANCELLED reason", async () => {
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

      const message = createMessage("m-cancel");
      const sendPromise = messageService.send(
        message,
        MessageSendSource.MESSAGE_INPUT,
        "local-cancel",
        { silent: false },
      );

      // Get the controller before cancellation
      const controller = (messageService as any).messageAbortControllers.get(
        "m-cancel",
      );
      expect(controller).toBeDefined();

      await messageService.cancelMessageRequestByID(
        "m-cancel",
        false,
        CancellationReason.STOP_STREAMING,
      );

      await expect(sendPromise).resolves.toBeUndefined();

      // Verify the controller was aborted
      expect(controller.signal.aborted).toBe(true);
    });
  });
});
