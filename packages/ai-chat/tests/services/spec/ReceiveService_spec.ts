/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { makeConfigStore } from '../../test_helpers';
import { ConversationLifecycleService } from '../../../src/chat/services/ConversationLifecycleService';
import { ChunkProcessingService } from '../../../src/chat/services/ChunkProcessingService';
import { HydrationService } from '../../../src/chat/services/HydrationService';
import { MessageUpsertCoordinator } from '../../../src/chat/services/MessageUpsertCoordinator';
import { ReceiveService } from '../../../src/chat/services/ReceiveService';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import {
  BusEvent,
  BusEventPreReceive,
  BusEventReceive,
  BusEventType,
} from '../../../src/types/events/eventBusTypes';
import {
  GenericItem,
  MessageRequest,
  MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

function createHarness(config: PublicConfig = {}) {
  const store = makeConfigStore({ messaging: {}, ...config });
  const fire = jest.fn(async (_event: BusEvent): Promise<void> => undefined);
  const slotEventService = {
    handleUserDefinedResponseItems: jest.fn().mockResolvedValue(undefined),
    handleCustomFooterSlot: jest.fn().mockResolvedValue(undefined),
  };
  const handleConnectToHumanAgent = jest.fn().mockResolvedValue(undefined);
  const manager = {
    store,
    fire,
    restartCount: 0,
    slotEventService,
    actions: slotEventService,
    humanAgentService: {
      handleConnectToHumanAgent,
    },
    streamAnnouncerService: { clearAll: jest.fn() },
    messageService: {
      isRequestFromPreviousConversation: jest.fn().mockReturnValue(false),
      inboundStreaming: { streamingMessageID: null },
      messageLoadingManager: { end: jest.fn() },
      finalizeStreamingMessage: jest.fn(),
      clearStreamingCancellation: jest.fn(),
      clearAllStreamingCancellation: jest.fn(),
      hideStopStreamingButtonIfIdle: jest.fn(),
      hideStopStreamingButtonIfNoUpsertStreaming: jest.fn(),
      cancelAllMessageRequests: jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as ServiceManager;
  manager.conversationLifecycleService = new ConversationLifecycleService();
  manager.chunkProcessingService = new ChunkProcessingService(manager);
  manager.hydrationService = new HydrationService(manager);
  manager.messageUpsertCoordinator = new MessageUpsertCoordinator(manager);
  const service = new ReceiveService(manager);
  manager.receiveService = service;

  const localItems = () => {
    const state = store.getState();
    return state.assistantMessageState.localMessageIDs.map(
      (id) => state.allMessageItemsByID[id]
    );
  };
  const eventTypes = () => fire.mock.calls.map(([event]) => event.type);

  return {
    service,
    manager,
    store,
    fire,
    slotEventService,
    handleConnectToHumanAgent,
    localItems,
    eventTypes,
  };
}

function textItem(text: string): GenericItem {
  return { response_type: MessageResponseTypes.TEXT, text };
}

function response(items: GenericItem[] = [textItem('Hello')]): MessageResponse {
  return { id: 'response-1', output: { generic: items } };
}

describe('ReceiveService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await jest.runOnlyPendingTimersAsync();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('fires receive during a typing pause and delays only the following items', async () => {
    const { service, store, localItems, eventTypes } = createHarness();
    const message = response([
      textItem('Before'),
      { response_type: MessageResponseTypes.PAUSE, time: 1000, typing: true },
      textItem('After'),
    ]);

    await service.receive(message);
    await jest.advanceTimersByTimeAsync(0);

    expect(eventTypes()).toEqual([
      BusEventType.PRE_RECEIVE,
      BusEventType.RECEIVE,
    ]);
    expect(localItems().map((local) => local.item)).toEqual([
      textItem('Before'),
    ]);
    expect(store.getState().assistantMessageState.isMessageLoadingCounter).toBe(
      1
    );

    await jest.advanceTimersByTimeAsync(999);
    expect(localItems()).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1);

    expect(localItems().map((local) => local.item)).toEqual([
      textItem('Before'),
      textItem('After'),
    ]);
    expect(store.getState().assistantMessageState.isMessageLoadingCounter).toBe(
      0
    );
  });

  it('retains the write until a delayed receive callback finishes after its reveal', async () => {
    const { service, manager, fire, localItems, eventTypes } = createHarness();
    const callbackStarted = resolvablePromise<void>();
    const finishCallback = resolvablePromise<void>();
    const coordinator = manager.messageUpsertCoordinator;
    const pendingWrites = (coordinator as any).pendingWrites as Map<
      string,
      unknown
    >;
    fire.mockImplementation(async (event) => {
      if (event.type === BusEventType.RECEIVE) {
        callbackStarted.doResolve();
        await finishCallback;
      }
    });
    const receiving = service.receive(
      response([
        { response_type: MessageResponseTypes.PAUSE, time: 100 },
        textItem('Revealed'),
      ])
    );

    try {
      await callbackStarted;
      await jest.advanceTimersByTimeAsync(100);
      expect(localItems().map((local) => local.item)).toEqual([
        textItem('Revealed'),
      ]);
      expect(pendingWrites.size).toBe(1);
      expect(coordinator.getState('response-1')).toBeUndefined();
      finishCallback.doResolve();
      await receiving;
      expect(pendingWrites.size).toBe(0);
      expect(coordinator.getState('response-1')).toBe(MessageState.COMPLETE);

      await coordinator.upsert('response-1', MessageState.COMPLETE, () =>
        response([textItem('Updated')])
      );
      expect(
        eventTypes().filter((type) => type === BusEventType.RECEIVE)
      ).toHaveLength(1);
      expect(localItems().map((local) => local.item)).toEqual([
        textItem('Updated'),
      ]);
      expect(pendingWrites.size).toBe(0);
    } finally {
      finishCallback.doResolve();
      await receiving;
    }
  });

  it('keeps overlapping reveals alive until both writes finish', async () => {
    const { service, manager, slotEventService, localItems } = createHarness();
    const pendingWrites = (manager.messageUpsertCoordinator as any)
      .pendingWrites as Map<string, unknown>;
    await service.receive(
      response([
        { response_type: MessageResponseTypes.PAUSE, time: 100 },
        textItem('First reveal'),
      ])
    );
    await service.receive(
      response([
        { response_type: MessageResponseTypes.PAUSE, time: 200 },
        textItem('Second reveal'),
      ])
    );
    expect(pendingWrites.size).toBe(1);

    await jest.advanceTimersByTimeAsync(100);
    expect(
      slotEventService.handleUserDefinedResponseItems
    ).toHaveBeenCalledTimes(1);
    expect(localItems().map((local) => local.item)).toContainEqual(
      textItem('First reveal')
    );
    expect(pendingWrites.size).toBe(1);

    await jest.advanceTimersByTimeAsync(100);
    expect(
      slotEventService.handleUserDefinedResponseItems
    ).toHaveBeenCalledTimes(2);
    expect(localItems().map((local) => local.item)).toContainEqual(
      textItem('Second reveal')
    );
    expect(pendingWrites.size).toBe(0);
  });

  it('releases the write after a rejected receive callback and its remaining reveal settle', async () => {
    const { service, manager, fire, localItems } = createHarness();
    const pendingWrites = (manager.messageUpsertCoordinator as any)
      .pendingWrites as Map<string, unknown>;
    const failure = new Error('Receive failed');
    fire.mockImplementation(async (event) => {
      if (event.type === BusEventType.RECEIVE) {
        throw failure;
      }
    });
    await expect(
      service.receive(
        response([
          { response_type: MessageResponseTypes.PAUSE, time: 100 },
          textItem('Still revealed'),
        ])
      )
    ).rejects.toBe(failure);
    expect(pendingWrites.size).toBe(1);

    await jest.advanceTimersByTimeAsync(100);
    expect(localItems().map((local) => local.item)).toEqual([
      textItem('Still revealed'),
    ]);
    expect(pendingWrites.size).toBe(0);
  });

  it.each([false, true])(
    'preserves welcome metadata when isLatestWelcomeNode is %s',
    async (isWelcome) => {
      const { service, store, localItems } = createHarness();

      await service.receive(response(), isWelcome);
      await jest.advanceTimersByTimeAsync(0);

      expect(
        store.getState().persistedToBrowserStorage.hasSentNonWelcomeMessage
      ).toBe(!isWelcome);
      expect(Boolean(localItems()[0].ui_state.isWelcomeResponse)).toBe(
        isWelcome
      );
    }
  );

  it('records the corresponding request on the original caller before receive', async () => {
    const { service, store, fire } = createHarness();
    const message = response();
    const request: MessageRequest = {
      id: 'request-1',
      input: { text: 'Hello' },
    };
    fire.mockImplementation(async (event): Promise<void> => {
      if (event.type === BusEventType.RECEIVE) {
        const receiveEvent = event as BusEventReceive;
        const storedMessage = store.getState().allMessagesByID[
          message.id
        ] as MessageResponse;

        expect(storedMessage).toBe(message);
        expect(storedMessage).toEqual(receiveEvent.data);
        expect(storedMessage.request_id).toBe(request.id);
        expect(receiveEvent.data).toBe(storedMessage);
        expect(Object.isFrozen(receiveEvent.data)).toBe(true);
      }
    });

    await service.receive(message, false, request);

    expect(message.request_id).toBe(request.id);
    expect(Object.isFrozen(message)).toBe(true);
    expect(fire).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: BusEventType.RECEIVE }),
      expect.any(Function)
    );
  });

  it('fires user-defined events without adding silent items to the conversation', async () => {
    const { service, slotEventService, localItems } = createHarness();
    const message = response([
      {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { silent: true },
      },
    ]);

    await service.receive(message);
    await jest.advanceTimersByTimeAsync(0);

    expect(slotEventService.handleUserDefinedResponseItems).toHaveBeenCalled();
    expect(localItems()).toEqual([]);
  });

  it('checks human-agent availability before adding the connect card', async () => {
    const {
      service,
      store,
      handleConnectToHumanAgent,
      localItems,
      eventTypes,
    } = createHarness();
    const availability = resolvablePromise();
    handleConnectToHumanAgent.mockReturnValueOnce(availability);
    const message = response([
      { response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT },
      textItem('After'),
    ]);

    await service.receive(message);

    expect(handleConnectToHumanAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        fullMessageID: message.id,
        item: expect.objectContaining({
          response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
        }),
      }),
      expect.objectContaining({
        id: message.id,
        output: { generic: message.output.generic },
      }),
      store.getState().config,
      0,
      expect.any(Function)
    );
    expect(handleConnectToHumanAgent.mock.calls[0][1]).toBe(message);
    expect(localItems()).toEqual([]);
    expect(eventTypes()).toContain(BusEventType.RECEIVE);

    availability.doResolve();
    await jest.advanceTimersByTimeAsync(0);
    expect(localItems().map((local) => local.item)).toEqual(
      message.output.generic
    );
  });

  it('checks agent availability again when a removed pending card is replaced', async () => {
    const { service, handleConnectToHumanAgent, localItems } = createHarness();
    const pendingAvailability = resolvablePromise<void>();
    handleConnectToHumanAgent.mockReturnValueOnce(pendingAvailability);
    const connectResponse = () =>
      response([
        {
          response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
          streaming_metadata: { id: 'connect' },
        },
      ]);

    try {
      await service.receive(connectResponse());
      expect(handleConnectToHumanAgent).toHaveBeenCalledTimes(1);
      expect(localItems()).toEqual([]);

      await service.removeMessages(['response-1']);
      await service.receive(connectResponse());
      await jest.advanceTimersByTimeAsync(0);

      expect(handleConnectToHumanAgent).toHaveBeenCalledTimes(2);
      const replacement = localItems()[0];
      expect(replacement.ui_state.id).toBe('response-1-connect');
      pendingAvailability.doResolve();
      await jest.advanceTimersByTimeAsync(0);
      expect(localItems()).toEqual([replacement]);
      expect(localItems()[0]).toBe(replacement);
    } finally {
      pendingAvailability.doResolve();
    }
  });

  it('does not add delayed items after the conversation restarts', async () => {
    const { service, manager, store, localItems } = createHarness();
    await service.receive(
      response([
        { response_type: MessageResponseTypes.PAUSE, time: 1000, typing: true },
        textItem('Stale'),
      ])
    );

    await manager.hydrationService.restartConversation({
      skipHydration: true,
      fireEvents: false,
    });
    await jest.advanceTimersByTimeAsync(1000);

    expect(localItems()).toEqual([]);
    expect(store.getState().allMessagesByID).toEqual({});
    expect(store.getState().assistantMessageState.isMessageLoadingCounter).toBe(
      0
    );
  });

  it('drops a message when the conversation restarts during pre:receive', async () => {
    const { service, manager, store, fire, eventTypes } = createHarness();
    const preReceive = resolvablePromise();
    fire.mockReturnValueOnce(preReceive);
    const receiving = service.receive(response());

    await manager.hydrationService.restartConversation({
      skipHydration: true,
      fireEvents: false,
    });
    preReceive.doResolve();
    await receiving;

    expect(store.getState().allMessagesByID).toEqual({});
    expect(eventTypes()).toEqual([BusEventType.PRE_RECEIVE]);
  });

  it('drops a message when pre:receive assigns a request from a previous conversation', async () => {
    const { service, manager, store, fire, eventTypes } = createHarness();
    jest
      .spyOn(manager.messageService, 'isRequestFromPreviousConversation')
      .mockImplementation((requestID) => requestID === 'old-request');
    fire.mockImplementation(async (event): Promise<void> => {
      if (event.type === BusEventType.PRE_RECEIVE) {
        (event as BusEventPreReceive).data.request_id = 'old-request';
      }
    });

    await service.receive(response());

    expect(store.getState().allMessagesByID).toEqual({});
    expect(eventTypes()).toEqual([BusEventType.PRE_RECEIVE]);
  });

  it('does not call the old footer when restart happens while a slot is pending', async () => {
    const { service, manager, slotEventService, localItems } = createHarness();
    const pendingSlot = resolvablePromise();
    slotEventService.handleUserDefinedResponseItems.mockReturnValueOnce(
      pendingSlot
    );
    await service.receive(response());
    await manager.hydrationService.restartConversation({
      skipHydration: true,
      fireEvents: false,
    });
    pendingSlot.doResolve();
    await jest.advanceTimersByTimeAsync(0);
    expect(slotEventService.handleCustomFooterSlot).not.toHaveBeenCalled();
    expect(localItems()).toEqual([]);
  });

  it.each([
    'handleUserDefinedResponseItems',
    'handleCustomFooterSlot',
  ] as const)('does not wait for %s before firing receive', async (method) => {
    const { service, manager, slotEventService, eventTypes, localItems } =
      createHarness();
    const pendingSlot = resolvablePromise();
    slotEventService[method].mockReturnValueOnce(pendingSlot);
    let received = false;
    const receiving = service.receive(response()).then(() => {
      received = true;
    });

    try {
      await jest.advanceTimersByTimeAsync(0);
      expect(slotEventService[method]).toHaveBeenCalledTimes(1);
      expect(received).toBe(true);
      expect(eventTypes()).toContain(BusEventType.RECEIVE);
      expect(localItems()).toEqual([]);
      expect((manager.messageUpsertCoordinator as any).pendingWrites.size).toBe(
        1
      );
    } finally {
      pendingSlot.doResolve();
      await receiving;
      await jest.advanceTimersByTimeAsync(0);
    }

    expect(localItems()).toHaveLength(1);
    expect((manager.messageUpsertCoordinator as any).pendingWrites.size).toBe(
      0
    );
  });

  it.each([
    'handleUserDefinedResponseItems',
    'handleCustomFooterSlot',
  ] as const)('fires receive when %s rejects', async (method) => {
    const { service, manager, slotEventService, eventTypes } = createHarness();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    slotEventService[method].mockRejectedValueOnce(new Error('Host failed'));

    await expect(service.receive(response())).resolves.toBeUndefined();
    await jest.advanceTimersByTimeAsync(0);

    expect(eventTypes()).toContain(BusEventType.RECEIVE);
    expect((manager.messageUpsertCoordinator as any).pendingWrites.size).toBe(
      0
    );
  });
});
