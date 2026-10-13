/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { makeConfigStore } from '../../test_helpers';
import { ChunkProcessingService } from '../../../src/chat/services/ChunkProcessingService';
import { HydrationService } from '../../../src/chat/services/HydrationService';
import { MessageUpsertCoordinator } from '../../../src/chat/services/MessageUpsertCoordinator';
import { ReceiveService } from '../../../src/chat/services/ReceiveService';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import {
  BusEvent,
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
    humanAgentService: { handleConnectToHumanAgent },
    streamAnnouncerService: { clearAll: jest.fn() },
    messageService: {
      isRequestFromPreviousConversation: jest.fn().mockReturnValue(false),
      inboundStreaming: { streamingMessageID: null },
      messageLoadingManager: { end: jest.fn() },
      finalizeStreamingMessage: jest.fn(),
      cancelAllMessageRequests: jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as ServiceManager;
  manager.chunkProcessingService = new ChunkProcessingService(manager);
  manager.hydrationService = new HydrationService(manager);
  manager.messageUpsertCoordinator = new MessageUpsertCoordinator(manager);
  const service = new ReceiveService(manager);

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

  it('records the corresponding request before freezing and firing receive', async () => {
    const { service, store, fire } = createHarness();
    const message = response();
    const request: MessageRequest = {
      id: 'request-1',
      input: { text: 'Hello' },
    };
    fire.mockImplementation(async (event): Promise<void> => {
      if (event.type === BusEventType.RECEIVE) {
        expect(store.getState().allMessagesByID[message.id]).toBe(message);
        expect(message.request_id).toBe(request.id);
        expect(Object.isFrozen(message)).toBe(true);
      }
    });

    await service.receive(message, false, request);

    expect(fire).toHaveBeenLastCalledWith({
      type: BusEventType.RECEIVE,
      data: message,
    });
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
        item: message.output.generic[0],
      }),
      message,
      store.getState().config,
      0
    );
    expect(localItems()).toEqual([]);
    expect(eventTypes()).toContain(BusEventType.RECEIVE);

    availability.doResolve();
    await jest.advanceTimersByTimeAsync(0);
    expect(localItems().map((local) => local.item)).toEqual(
      message.output.generic
    );
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
    const { service, slotEventService, eventTypes, localItems } =
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
    } finally {
      pendingSlot.doResolve();
      await receiving;
      await jest.advanceTimersByTimeAsync(0);
    }

    expect(localItems()).toHaveLength(1);
  });

  it.each([
    'handleUserDefinedResponseItems',
    'handleCustomFooterSlot',
  ] as const)('fires receive when %s rejects', async (method) => {
    const { service, slotEventService, eventTypes } = createHarness();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    slotEventService[method].mockRejectedValueOnce(new Error('Host failed'));

    await expect(service.receive(response())).resolves.toBeUndefined();
    await jest.advanceTimersByTimeAsync(0);

    expect(eventTypes()).toContain(BusEventType.RECEIVE);
  });
});
