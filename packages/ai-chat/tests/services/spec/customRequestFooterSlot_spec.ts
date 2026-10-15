/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstanceService } from '../../../src/chat/services/ChatInstanceService';
import { EventBus } from '../../../src/chat/events/EventBus';
import { HydrationService } from '../../../src/chat/services/HydrationService';
import { InputActionsService } from '../../../src/chat/services/InputActionsService';
import { PublicStateService } from '../../../src/chat/services/PublicStateService';
import { ReceiveService } from '../../../src/chat/services/ReceiveService';
import { SendService } from '../../../src/chat/services/SendService';
import { SlotEventService } from '../../../src/chat/services/SlotEventService';
import { ViewService } from '../../../src/chat/services/ViewService';
import { ServiceManager } from '../../../src/chat/services/ServiceManager';
import {
  BusEvent,
  BusEventCustomRequestFooterSlot,
  BusEventType,
  MessageSendSource,
} from '../../../src/types/events/eventBusTypes';
import {
  HumanAgentMessageType,
  MessageInputType,
  MessageRequest,
} from '../../../src/types/messaging/Messages';

const createRequest = (text: string): MessageRequest => ({
  input: {
    message_type: MessageInputType.TEXT,
    text,
  },
});

/**
 * The narrowest store `ChatInstanceService.send` reads through on the outbound path: the input slice it merges pending
 * structured data from, the human-agent slices the input selectors route on, and the two panels a send closes.
 */
const createServiceManagerStub = () => {
  const firedEvents: BusEvent[] = [];

  const state = {
    config: { public: {}, derived: {} },
    languagePack: {},
    assistantInputState: {
      pendingUploads: [] as unknown[],
      pendingStructuredData: null as unknown,
    },
    humanAgentState: {
      inputState: {
        pendingUploads: [] as unknown[],
        pendingStructuredData: null as unknown,
      },
      isConnecting: false,
      isReconnecting: false,
      isHumanAgentTyping: false,
    },
    persistedToBrowserStorage: {
      humanAgentState: { isSuspended: false, isConnected: false },
      homeScreenState: { isHomeScreenOpen: false },
    },
    responsePanelState: { isOpen: false },
  };

  const serviceManager = {
    store: {
      dispatch: jest.fn(),
      getState: () => state,
    },
    messageService: {
      send: jest.fn().mockResolvedValue(undefined),
      isRequestFromPreviousConversation: jest.fn().mockReturnValue(false),
      messageLoadingManager: { end: jest.fn() },
    },
    fire: jest.fn(async (event: BusEvent) => {
      firedEvents.push(event);
    }),
    getInputFunctionsRef: (): null => null,
  } as unknown as ServiceManager;
  (serviceManager as any).inputActionsService = new InputActionsService(
    serviceManager
  );
  (serviceManager as any).slotEventService = new SlotEventService(
    serviceManager
  );
  (serviceManager as any).hydrationService = new HydrationService(
    serviceManager
  );
  (serviceManager as any).publicStateService = new PublicStateService(
    serviceManager
  );
  (serviceManager as any).receiveService = new ReceiveService(serviceManager);
  (serviceManager as any).sendService = new SendService(serviceManager);
  (serviceManager as any).viewService = new ViewService(serviceManager);

  return { serviceManager, firedEvents };
};

const footerEventsIn = (events: BusEvent[]) =>
  events.filter(
    (event) => event.type === BusEventType.CUSTOM_REQUEST_FOOTER_SLOT
  ) as BusEventCustomRequestFooterSlot[];

/**
 * `doSend` starts the footer fire without awaiting it, so the send resolves first. A macrotask boundary lets every
 * fire queued so far run, since the footer handlers here only ever await microtasks.
 */
const flushFooterFires = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

/**
 * A stub whose `fire` routes through a real EventBus, which runs overlapping fires of one type in order. The jest.fn
 * stub above cannot see that rule, so the concurrency case needs the real thing.
 */
const createServiceManagerStubWithRealBus = () => {
  const { serviceManager } = createServiceManagerStub();
  const eventBus = new EventBus();
  (serviceManager as any).fire = (event: BusEvent) =>
    eventBus.fire(event, {} as any);
  return { serviceManager, eventBus };
};

describe('custom request footer slot', () => {
  it('fires once per sent message with the request as payload', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);
    const message = createRequest('what is the weather?');

    await chatActions.send(message, MessageSendSource.MESSAGE_INPUT, {}, true);
    await flushFooterFires();

    const footerEvents = footerEventsIn(firedEvents);
    expect(footerEvents).toHaveLength(1);
    expect(footerEvents[0].data.message).toBe(message);
    expect(footerEvents[0].data.message.input.text).toBe(
      'what is the weather?'
    );
    const [, , localMessageID] = (
      serviceManager.messageService.send as jest.Mock
    ).mock.calls[0];
    expect(footerEvents[0].data.slotName).toBe(
      `request-footer-${localMessageID}`
    );
  });

  it('sends the message even when a handler rejects', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const { serviceManager, eventBus } = createServiceManagerStubWithRealBus();
    const chatActions = new ChatInstanceService(serviceManager);
    const seen: string[] = [];
    let failNext = true;

    eventBus.on({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      handler: async (event: any) => {
        if (failNext) {
          failNext = false;
          throw new Error('the host footer blew up');
        }
        seen.push(event.data.message.input.text);
      },
    });

    await chatActions.send(
      createRequest('hello'),
      MessageSendSource.MESSAGE_INPUT,
      {},
      true
    );

    expect(serviceManager.messageService.send).toHaveBeenCalledTimes(1);

    // And the next send still fires: the bus recovers from a rejected fire.
    await chatActions.send(
      createRequest('again'),
      MessageSendSource.MESSAGE_INPUT,
      {},
      true
    );
    await flushFooterFires();

    expect(seen).toEqual(['again']);
    errorSpy.mockRestore();
  });

  it('does not wait for a handler that never settles', async () => {
    const { serviceManager, eventBus } = createServiceManagerStubWithRealBus();
    const chatActions = new ChatInstanceService(serviceManager);

    eventBus.on({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      handler: (): Promise<void> => new Promise<void>(() => undefined),
    });

    // Both sends resolve even though the first handler never does.
    await chatActions.send(
      createRequest('hello'),
      MessageSendSource.MESSAGE_INPUT,
      {},
      true
    );
    await chatActions.send(
      createRequest('again'),
      MessageSendSource.MESSAGE_INPUT,
      {},
      true
    );

    expect(serviceManager.messageService.send).toHaveBeenCalledTimes(2);
  });

  it('hands the host a frozen message', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    await chatActions.send(
      createRequest('hello'),
      MessageSendSource.MESSAGE_INPUT,
      {},
      true
    );

    await flushFooterFires();

    expect(Object.isFrozen(footerEventsIn(firedEvents)[0].data.message)).toBe(
      true
    );
  });

  it('gives each message its own slot name', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    await chatActions.send(
      createRequest('first'),
      MessageSendSource.MESSAGE_INPUT,
      {},
      true
    );
    await chatActions.send(
      createRequest('second'),
      MessageSendSource.MESSAGE_INPUT,
      {},
      true
    );

    await flushFooterFires();

    const [first, second] = footerEventsIn(firedEvents);
    expect(first.data.slotName).not.toBe(second.data.slotName);
  });

  it('survives sends that overlap', async () => {
    const { serviceManager, eventBus } = createServiceManagerStubWithRealBus();
    const chatActions = new ChatInstanceService(serviceManager);
    const seen: string[] = [];

    eventBus.on({
      type: BusEventType.CUSTOM_REQUEST_FOOTER_SLOT,
      handler: async (event: any) => {
        await Promise.resolve();
        seen.push(event.data.message.input.text);
      },
    });

    await Promise.all([
      chatActions.send(
        createRequest('first'),
        MessageSendSource.MESSAGE_INPUT,
        {},
        true
      ),
      chatActions.send(
        createRequest('second'),
        MessageSendSource.MESSAGE_INPUT,
        {},
        true
      ),
      chatActions.send(
        createRequest('third'),
        MessageSendSource.MESSAGE_INPUT,
        {},
        true
      ),
    ]);

    await flushFooterFires();

    expect(seen).toEqual(['first', 'second', 'third']);
  });

  it('fires nothing for a silent message', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    await chatActions.send(
      createRequest('hello'),
      MessageSendSource.MESSAGE_INPUT,
      { silent: true },
      true
    );

    await flushFooterFires();

    expect(footerEventsIn(firedEvents)).toHaveLength(0);
  });

  it('fires nothing for a message typed to a human agent', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);
    const message = createRequest('hello');
    message.input.agent_message_type = HumanAgentMessageType.FROM_USER;

    await chatActions.send(message, MessageSendSource.MESSAGE_INPUT, {}, true);

    await flushFooterFires();

    expect(footerEventsIn(firedEvents)).toHaveLength(0);
  });

  it('fires nothing for a message with no bubble content', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    await chatActions.send(
      createRequest(''),
      MessageSendSource.MESSAGE_INPUT,
      {},
      true
    );

    await flushFooterFires();

    expect(footerEventsIn(firedEvents)).toHaveLength(0);
  });
});

describe('footer replay from history', () => {
  const restoredRequest = (id: string, text: string) => ({
    localMessage: {
      item: { response_type: 'text', text },
      ui_state: { id: `local-${id}`, originalUserText: text },
      fullMessageID: id,
    },
    message: {
      id,
      input: { message_type: MessageInputType.TEXT, text },
      history: { timestamp: 0 },
    },
  });

  const restoredResponse = (
    id: string,
    slotName: string,
    isOn: boolean | undefined
  ) => ({
    localMessage: {
      item: {
        response_type: 'text',
        text: 'a reply',
        message_item_options: {
          custom_footer_slot: { slot_name: slotName, is_on: isOn },
        },
      },
      ui_state: { id: `local-${id}` },
      fullMessageID: id,
    },
    message: { id, output: { generic: [] as unknown[] } },
  });

  /**
   * Hydration puts the nested items of a grid or carousel in `allMessageItemsByID` but not in `localMessageIDs`,
   * which holds the top-level items the renderer walks. `nested` models that half.
   */
  const historyFrom = (entries: any[], nested: any[] = []) => ({
    allMessageItemsByID: Object.fromEntries(
      [...entries, ...nested].map((e) => [
        e.localMessage.ui_state.id,
        e.localMessage,
      ])
    ),
    allMessagesByID: Object.fromEntries(
      entries.map((e) => [e.message.id, e.message])
    ),
    assistantMessageState: {
      messageIDs: [] as string[],
      localMessageIDs: entries.map((e) => e.localMessage.ui_state.id),
    },
  });

  it('fires for restored user messages', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    await chatActions.replayFooterSlots(
      historyFrom([restoredRequest('m1', 'restored text')]) as never
    );

    const footerEvents = footerEventsIn(firedEvents);
    expect(footerEvents).toHaveLength(1);
    expect(footerEvents[0].data.slotName).toBe('request-footer-local-m1');
    expect(footerEvents[0].data.message.input.text).toBe('restored text');
  });

  it('fires for restored assistant messages', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    await chatActions.replayFooterSlots(
      historyFrom([restoredResponse('m1', 'backend-slot', true)]) as never
    );

    const incoming = firedEvents.filter(
      (event) => event.type === BusEventType.CUSTOM_FOOTER_SLOT
    );
    expect(incoming).toHaveLength(1);
    expect((incoming[0] as any).data.slotName).toBe('backend-slot');
  });

  it('replays both directions in one pass', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    await chatActions.replayFooterSlots(
      historyFrom([
        restoredRequest('m1', 'what the user asked'),
        restoredResponse('m2', 'backend-slot', true),
      ]) as never
    );

    expect(footerEventsIn(firedEvents)).toHaveLength(1);
    expect(
      firedEvents.filter(
        (event) => event.type === BusEventType.CUSTOM_FOOTER_SLOT
      )
    ).toHaveLength(1);
  });

  it('honors the documented is_on default', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    // `is_on` is documented as defaulting to true, so an unset one still gets a
    // footer. This used to require an explicit true and left the slot empty.
    await chatActions.replayFooterSlots(
      historyFrom([restoredResponse('m1', 'backend-slot', undefined)]) as never
    );

    expect(
      firedEvents.filter(
        (event) => event.type === BusEventType.CUSTOM_FOOTER_SLOT
      )
    ).toHaveLength(1);
  });

  it('skips the nested items of a restored grid', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    // A nested item renders no footer, so firing for one would name a slot that never reaches the DOM.
    const nestedItem = restoredResponse('m1', 'nested-slot', true);
    nestedItem.localMessage.ui_state.id = 'local-m1-nested';

    await chatActions.replayFooterSlots(
      historyFrom(
        [restoredResponse('m1', 'backend-slot', true)],
        [nestedItem]
      ) as never
    );

    const incoming = firedEvents.filter(
      (event) => event.type === BusEventType.CUSTOM_FOOTER_SLOT
    );
    expect(incoming).toHaveLength(1);
    expect((incoming[0] as any).data.slotName).toBe('backend-slot');
  });

  it('skips an assistant footer switched off', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);

    await chatActions.replayFooterSlots(
      historyFrom([restoredResponse('m1', 'backend-slot', false)]) as never
    );

    expect(
      firedEvents.filter(
        (event) => event.type === BusEventType.CUSTOM_FOOTER_SLOT
      )
    ).toHaveLength(0);
  });

  it('fires nothing for a restored human-agent message', async () => {
    const { serviceManager, firedEvents } = createServiceManagerStub();
    const chatActions = new ChatInstanceService(serviceManager);
    const entry = restoredRequest('m1', 'to the agent');
    (entry.localMessage.item as any).agent_message_type =
      HumanAgentMessageType.FROM_USER;

    await chatActions.replayFooterSlots(historyFrom([entry]) as never);

    expect(footerEventsIn(firedEvents)).toHaveLength(0);
  });
});
