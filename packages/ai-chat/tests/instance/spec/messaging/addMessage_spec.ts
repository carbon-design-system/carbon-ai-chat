/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import {
  createBaseConfig,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import {
  MessageResponse,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import { OnErrorType } from '../../../../src/types/config/ErrorConfig';
import {
  HumanAgentsOnlineStatus,
  ServiceDesk,
} from '../../../../src/types/config/ServiceDeskConfig';
import { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import actions from '../../../../src/chat/store/actions';
import { ViewType } from '../../../../src/types/instance/apiTypes';
import { MessageState } from '../../../../src/types/config/MessagingConfig';
import {
  MALFORMED,
  fixtureMessage,
  observeWrite,
} from '../../../utils/itemDrawabilityFixtures';

describe('ChatInstance.messaging.addMessage', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('should have addMessage method available', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.addMessage).toBe('function');
  });

  it('hides the immediate stop button after addMessage while customSendMessage is still pending', async () => {
    let allowResponse: () => void;
    let reportStarted: () => void;
    let reportResponse: () => void;
    let finishSend: () => void;
    const responseAllowed = new Promise<void>((resolve) => {
      allowResponse = resolve;
    });
    const started = new Promise<void>((resolve) => {
      reportStarted = resolve;
    });
    const responseAdded = new Promise<void>((resolve) => {
      reportResponse = resolve;
    });
    const sendAllowedToFinish = new Promise<void>((resolve) => {
      finishSend = resolve;
    });
    const config = createBaseConfig();
    config.messaging = {
      skipWelcome: true,
      showStopButtonImmediately: true,
      customSendMessage: async (_request, _options, chat) => {
        reportStarted();
        await responseAllowed;
        await chat.messaging.addMessage({
          id: 'ordinary-response',
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: 'done' },
            ],
          },
        });
        reportResponse();
        await sendAllowedToFinish;
      },
    };
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    let settled = false;
    const sending = instance.send('start').then(() => {
      settled = true;
    });
    try {
      await started;
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(true);
      allowResponse();
      await responseAdded;
      expect(
        store.getState().assistantInputState.stopStreamingButtonState.isVisible
      ).toBe(false);
      expect(settled).toBe(false);
    } finally {
      allowResponse();
      finishSend();
      await sending;
    }
  });

  it('should accept message response', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const messageResponse = {
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'Hello from bot',
          },
        ],
      },
    };

    await expect(
      instance.messaging.addMessage(messageResponse)
    ).resolves.not.toThrow();
  });

  it('should return a Promise', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const messageResponse = {
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: 'Welcome message',
          },
        ],
      },
    };

    const result = instance.messaging.addMessage(messageResponse);
    expect(result).toBeInstanceOf(Promise);
  });

  describe('state updates', () => {
    it('should add message to allMessagesByID in store', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        id: 'test-message-1',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Test message',
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID
      ).length;

      await instance.messaging.addMessage(messageResponse);

      const updatedState = store.getState();
      const updatedMessageCount = Object.keys(
        updatedState.allMessagesByID
      ).length;

      expect(updatedMessageCount).toBe(initialMessageCount + 1);
      expect(updatedState.allMessagesByID['test-message-1']).toBeDefined();
      expect(updatedState.allMessagesByID['test-message-1'].id).toBe(
        'test-message-1'
      );
    });

    it('should add local message item to allMessageItemsByID in store', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        id: 'test-message-2',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Test message for local items',
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialItemCount = Object.keys(
        initialState.allMessageItemsByID
      ).length;

      await instance.messaging.addMessage(messageResponse);

      const updatedState = store.getState();
      const updatedItemCount = Object.keys(
        updatedState.allMessageItemsByID
      ).length;

      expect(updatedItemCount).toBeGreaterThan(initialItemCount);

      // Find the local message item that corresponds to our message
      const localMessageItems = Object.values(updatedState.allMessageItemsByID);
      const relatedItem = localMessageItems.find(
        (item) => item.fullMessageID === 'test-message-2'
      );

      expect(relatedItem).toBeDefined();
      expect((relatedItem?.item as any).text).toBe(
        'Test message for local items'
      );
    });

    it('should add message ID to botMessageState.localMessageItemIDs', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        id: 'test-message-3',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Test message for message order',
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialMessageIDCount =
        initialState.assistantMessageState.localMessageIDs.length;

      await instance.messaging.addMessage(messageResponse);

      const updatedState = store.getState();
      const updatedMessageIDCount =
        updatedState.assistantMessageState.localMessageIDs.length;

      expect(updatedMessageIDCount).toBeGreaterThan(initialMessageIDCount);

      // Check that the new message item ID is in the list
      const allMessageItems = Object.values(updatedState.allMessageItemsByID);
      const relatedItem = allMessageItems.find(
        (item) => item.fullMessageID === 'test-message-3'
      );

      expect(relatedItem).toBeDefined();
      expect(updatedState.assistantMessageState.localMessageIDs).toContain(
        relatedItem?.ui_state.id
      );
    });

    it('should auto-generate message ID if not provided', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        // No ID provided
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Test message without ID',
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID
      ).length;

      await instance.messaging.addMessage(messageResponse);

      const updatedState = store.getState();
      const updatedMessageCount = Object.keys(
        updatedState.allMessagesByID
      ).length;

      expect(updatedMessageCount).toBe(initialMessageCount + 1);

      // Find the newly added message
      const messageKeys = Object.keys(updatedState.allMessagesByID);
      const newMessageKeys = messageKeys.filter(
        (key) => !initialState.allMessagesByID[key]
      );

      expect(newMessageKeys.length).toBe(1);

      const newMessage = updatedState.allMessagesByID[newMessageKeys[0]];
      expect(newMessage.id).toBeDefined();
      expect(typeof newMessage.id).toBe('string');
      expect(newMessage.id.length).toBeGreaterThan(0);
    });

    it('should handle multiple messages correctly', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const message1 = {
        id: 'multi-test-1',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'First message',
            },
          ],
        },
      };

      const message2 = {
        id: 'multi-test-2',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Second message',
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID
      ).length;

      await instance.messaging.addMessage(message1);
      await instance.messaging.addMessage(message2);

      const finalState = store.getState();
      const finalMessageCount = Object.keys(finalState.allMessagesByID).length;

      expect(finalMessageCount).toBe(initialMessageCount + 2);
      expect(finalState.allMessagesByID['multi-test-1']).toBeDefined();
      expect(finalState.allMessagesByID['multi-test-2']).toBeDefined();

      // Check order is maintained in localMessageIDs
      const message1Items = Object.values(
        finalState.allMessageItemsByID
      ).filter((item) => item.fullMessageID === 'multi-test-1');
      const message2Items = Object.values(
        finalState.allMessageItemsByID
      ).filter((item) => item.fullMessageID === 'multi-test-2');

      expect(message1Items.length).toBeGreaterThan(0);
      expect(message2Items.length).toBeGreaterThan(0);

      const message1ItemID = message1Items[0].ui_state.id;
      const message2ItemID = message2Items[0].ui_state.id;

      const message1Index =
        finalState.assistantMessageState.localMessageIDs.indexOf(
          message1ItemID
        );
      const message2Index =
        finalState.assistantMessageState.localMessageIDs.indexOf(
          message2ItemID
        );

      expect(message1Index).toBeGreaterThanOrEqual(0);
      expect(message2Index).toBeGreaterThanOrEqual(0);
      expect(message1Index).toBeLessThan(message2Index); // First message should come before second
    });
  });

  describe('Event bus integration', () => {
    it('should fire pre:receive and receive events', async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preReceiveHandler = jest.fn();
      const receiveHandler = jest.fn();

      // Register event handlers
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceiveHandler },
        { type: BusEventType.RECEIVE, handler: receiveHandler },
      ]);

      const messageResponse = {
        id: 'event-test-message',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Test message for events',
            },
          ],
        },
      };

      await instance.messaging.addMessage(messageResponse);

      // Verify both events were fired
      expect(preReceiveHandler).toHaveBeenCalledTimes(1);
      expect(receiveHandler).toHaveBeenCalledTimes(1);

      // Verify event data structure
      const preReceiveCall = preReceiveHandler.mock.calls[0][0];
      const receiveCall = receiveHandler.mock.calls[0][0];

      expect(preReceiveCall.type).toBe(BusEventType.PRE_RECEIVE);
      expect(preReceiveCall.data).toBeDefined();
      expect(preReceiveCall.data.id).toBe('event-test-message');

      expect(receiveCall.type).toBe(BusEventType.RECEIVE);
      expect(receiveCall.data).toBeDefined();
      expect(receiveCall.data.id).toBe('event-test-message');
    });

    it('should allow pre:receive handler to modify message', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Handler that modifies the message
      const preReceiveHandler = jest.fn((event) => {
        event.data.output.generic[0].text = 'Modified text';
      });

      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: preReceiveHandler,
      });

      const messageResponse = {
        id: 'modify-test-message',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Original text',
            },
          ],
        },
      };

      await instance.messaging.addMessage(messageResponse);

      // Verify the message was modified in the store
      const finalState = store.getState();
      const storedMessage = finalState.allMessagesByID['modify-test-message'];

      expect(storedMessage).toBeDefined();
      expect((storedMessage as any).output.generic[0].text).toBe(
        'Modified text'
      );
      expect(preReceiveHandler).toHaveBeenCalledTimes(1);
    });

    it('should fire events in correct order (pre:receive before receive)', async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const eventOrder: string[] = [];

      const preReceiveHandler = jest.fn(() => {
        eventOrder.push('pre:receive');
      });

      const receiveHandler = jest.fn(() => {
        eventOrder.push('receive');
      });

      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceiveHandler },
        { type: BusEventType.RECEIVE, handler: receiveHandler },
      ]);

      const messageResponse = {
        id: 'order-test-message',
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Test message for event order',
            },
          ],
        },
      };

      await instance.messaging.addMessage(messageResponse);

      expect(eventOrder).toEqual(['pre:receive', 'receive']);
    });

    it('fires receive before userDefinedResponse (H9 — addMessage event order)', async () => {
      // H9: addMessage fires userDefinedResponse before the store write, and receive
      // after. So the order on the event bus is: receive, then userDefinedResponse.
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const eventOrder: string[] = [];
      instance.on([
        {
          type: BusEventType.RECEIVE,
          handler: () => {
            eventOrder.push('receive');
          },
        },
        {
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: () => {
            eventOrder.push('userDefinedResponse');
          },
        },
      ]);

      await instance.messaging.addMessage({
        id: 'h9-order',
        output: {
          generic: [
            {
              streaming_metadata: { id: 'ud' },
              response_type: MessageResponseTypes.USER_DEFINED,
              user_defined: { kind: 'widget' },
            } as any,
          ],
        },
      });

      await waitFor(() => expect(eventOrder).toContain('userDefinedResponse'));
      expect(eventOrder).toEqual(['receive', 'userDefinedResponse']);
    });
  });

  // Characterization pins: each records what addMessage does today, so moving it onto a
  // different internal write path cannot change host-visible behavior silently.
  describe('behavior pins', () => {
    // The chat persists session state (open view, hasSentNonWelcomeMessage) to
    // sessionStorage, which outlives each render. Start every pin from a clean session.
    beforeEach(() => window.sessionStorage.clear());

    const text = (value: string) => ({
      response_type: MessageResponseTypes.TEXT,
      text: value,
    });

    const response = (id: string, generic: any[]): MessageResponse =>
      ({ id, output: { generic } }) as MessageResponse;

    /** Texts of the visible items that belong to the given message, in display order. */
    const visibleTexts = (store: any, messageID: string) => {
      const state = store.getState();
      return state.assistantMessageState.localMessageIDs
        .map((id: string) => state.allMessageItemsByID[id])
        .filter((item: any) => item?.fullMessageID === messageID)
        .map((item: any) => item.item.text);
    };

    const visibleItemCount = (store: any, messageID: string) =>
      visibleTexts(store, messageID).length;

    const gate = () => {
      let release: (value?: unknown) => void;
      const promise = new Promise((resolve) => {
        release = resolve;
      });
      return { promise, release };
    };

    /**
     * Renders a chat with a service desk whose availability check waits on the returned
     * gate. The main window has to open so hydration initializes the desk.
     */
    const renderWithPendingAvailability = async (extraConfig = {}) => {
      const availability = gate();
      const areAnyAgentsOnline = jest.fn(() => availability.promise);
      const serviceDesk = {
        getName: () => 'pin-desk',
        startChat: jest.fn().mockResolvedValue(undefined),
        endChat: jest.fn().mockResolvedValue(undefined),
        sendMessageToAgent: jest.fn().mockResolvedValue(undefined),
        areAnyAgentsOnline,
      } as unknown as ServiceDesk;
      const config = {
        ...createBaseConfig(),
        serviceDeskFactory: () => Promise.resolve(serviceDesk),
        messaging: { ...createBaseConfig().messaging, skipWelcome: true },
        ...extraConfig,
      };
      const rendered = await renderChatAndGetInstanceWithStore(config as any);
      await rendered.instance.changeView(ViewType.MAIN_WINDOW);
      await waitFor(() =>
        expect(rendered.store.getState().isHydrated).toBe(true)
      );
      return { ...rendered, availability, areAnyAgentsOnline };
    };

    const connectToAgent = {
      response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
      message_to_human_agent: 'The user needs help',
    };

    it('reveals items after a pause one at a time, showing the typing indicator during the pause', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const loadingCounter = () =>
        store.getState().assistantMessageState.isMessageLoadingCounter;
      const baseline = loadingCounter();
      const id = 'pin-pause';

      // The indicator is tied to `typing: true` on the pause; a bare pause only waits.
      await instance.messaging.addMessage(
        response(id, [
          text('First'),
          {
            response_type: MessageResponseTypes.PAUSE,
            time: 500,
            typing: true,
          },
          text('Second'),
        ])
      );

      await waitFor(() => expect(visibleTexts(store, id)).toEqual(['First']), {
        timeout: 200,
      });
      expect(loadingCounter()).toBe(baseline + 1);

      await waitFor(
        () => expect(visibleTexts(store, id)).toEqual(['First', 'Second']),
        { timeout: 2000 }
      );
      expect(loadingCounter()).toBe(baseline);
    });

    it('resolves addMessage and fires receive while a pause is still pending', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const receive = jest.fn();
      instance.on({ type: BusEventType.RECEIVE, handler: receive });
      const id = 'pin-resolve-pause';

      await instance.messaging.addMessage(
        response(id, [
          { response_type: MessageResponseTypes.PAUSE, time: 500 },
          text('After pause'),
        ])
      );

      expect(receive).toHaveBeenCalledTimes(1);
      expect(visibleTexts(store, id)).toEqual([]);

      await waitFor(
        () => expect(visibleTexts(store, id)).toEqual(['After pause']),
        { timeout: 2000 }
      );
    });

    it('resolves addMessage and fires receive while a slow userDefinedResponse handler is pending', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const handlerGate = gate();
      const userDefinedResponse = jest.fn(() => handlerGate.promise);
      const receive = jest.fn();
      instance.on([
        {
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: userDefinedResponse,
        },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);
      const id = 'pin-resolve-user-defined';

      await instance.messaging.addMessage(
        response(id, [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { kind: 'slow' },
          },
        ])
      );

      expect(userDefinedResponse).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledTimes(1);
      expect(visibleItemCount(store, id)).toBe(0);

      handlerGate.release();
      await waitFor(() => expect(visibleItemCount(store, id)).toBe(1));
    });

    it('resolves addMessage and fires receive while a connect_to_agent availability check is pending', async () => {
      const { instance, store, availability, areAnyAgentsOnline } =
        await renderWithPendingAvailability();
      const receive = jest.fn();
      instance.on({ type: BusEventType.RECEIVE, handler: receive });
      const id = 'pin-resolve-availability';

      await instance.messaging.addMessage(response(id, [connectToAgent]));

      expect(areAnyAgentsOnline).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledTimes(1);
      expect(visibleItemCount(store, id)).toBe(0);

      availability.release(true);
      await waitFor(() => expect(visibleItemCount(store, id)).toBe(1));
    });

    it('marks isLatestWelcomeNode items as welcome responses without setting hasSentNonWelcomeMessage', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const hasSentNonWelcome = () =>
        store.getState().persistedToBrowserStorage.hasSentNonWelcomeMessage;
      const uiStatesFor = (id: string) => {
        const state = store.getState();
        return Object.values(state.allMessageItemsByID)
          .filter((item) => item.fullMessageID === id)
          .map((item) => item.ui_state);
      };

      expect(hasSentNonWelcome()).toBe(false);

      // The public type declares no options argument, but the runtime reads one.
      await (instance.messaging.addMessage as any)(
        response('pin-welcome', [text('Welcome')]),
        { isLatestWelcomeNode: true }
      );
      await waitFor(() => expect(uiStatesFor('pin-welcome')).toHaveLength(1));
      expect(uiStatesFor('pin-welcome')[0].isWelcomeResponse).toBe(true);
      expect(hasSentNonWelcome()).toBe(false);

      await instance.messaging.addMessage(
        response('pin-not-welcome', [text('Hello')])
      );
      await waitFor(() =>
        expect(uiStatesFor('pin-not-welcome')).toHaveLength(1)
      );
      expect(uiStatesFor('pin-not-welcome')[0].isWelcomeResponse).toBe(
        undefined
      );
      expect(hasSentNonWelcome()).toBe(true);
    });

    it('fires userDefinedResponse once for a silent user_defined item but never shows it', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const userDefinedResponse = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: userDefinedResponse,
      });
      const id = 'pin-silent-user-defined';

      await instance.messaging.addMessage(
        response(id, [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { silent: true },
          },
          text('Visible'),
        ])
      );

      await waitFor(() => expect(visibleTexts(store, id)).toEqual(['Visible']));
      expect(userDefinedResponse).toHaveBeenCalledTimes(1);
      // A silent item gets no host element, so the event carries no slot.
      expect(userDefinedResponse.mock.calls[0][0].data.slot).toBeUndefined();
      expect(
        Object.values(store.getState().allMessageItemsByID).filter(
          (item) => item.fullMessageID === id
        )
      ).toHaveLength(1);
    });

    it('stores a history.silent message but adds no local items for it', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const id = 'pin-history-silent';

      await instance.messaging.addMessage({
        ...response(id, [text('Hidden')]),
        history: { silent: true },
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = store.getState();
      expect(state.allMessagesByID[id]).toBeDefined();
      expect(
        Object.values(state.allMessageItemsByID).filter(
          (item) => item.fullMessageID === id
        )
      ).toHaveLength(0);
      expect(visibleItemCount(store, id)).toBe(0);
    });

    it('closes an open home screen', async () => {
      const config = { ...createBaseConfig(), homescreen: { isOn: true } };
      const { instance, store } = await renderChatAndGetInstanceWithStore(
        config as any
      );
      const isHomeScreenOpen = () =>
        store.getState().persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen;

      act(() => {
        store.dispatch(actions.setHomeScreenIsOpen(true));
      });
      expect(isHomeScreenOpen()).toBe(true);

      await instance.messaging.addMessage(
        response('pin-home-screen', [text('Hi')])
      );

      await waitFor(() => expect(isHomeScreenOpen()).toBe(false));
    });

    it('runs the service desk availability check for connect_to_agent and records the result', async () => {
      const { instance, store, availability, areAnyAgentsOnline } =
        await renderWithPendingAvailability();
      const areAnyAgentsOnlineEvent = jest.fn();
      instance.on({
        type: BusEventType.HUMAN_AGENT_ARE_ANY_AGENTS_ONLINE,
        handler: areAnyAgentsOnlineEvent,
      });
      const loadingCounter = () =>
        store.getState().assistantMessageState.isMessageLoadingCounter;
      const baseline = loadingCounter();
      const id = 'pin-connect-to-agent';

      await instance.messaging.addMessage(response(id, [connectToAgent]));

      expect(areAnyAgentsOnline).toHaveBeenCalledTimes(1);
      expect((areAnyAgentsOnline.mock.calls[0] as any[])[0].id).toBe(id);
      // The loading indicator shows while the check is pending.
      expect(loadingCounter()).toBe(baseline + 1);

      availability.release(true);

      await waitFor(() => expect(visibleItemCount(store, id)).toBe(1));
      expect(loadingCounter()).toBe(baseline);
      expect(areAnyAgentsOnlineEvent).toHaveBeenCalledTimes(1);
      expect(areAnyAgentsOnlineEvent.mock.calls[0][0].areAnyAgentsOnline).toBe(
        HumanAgentsOnlineStatus.ONLINE
      );
      expect(
        store.getState().allMessagesByID[id].ui_state_internal
          .agent_availability
      ).toBe(HumanAgentsOnlineStatus.ONLINE);
    });

    it('reports an integration error for connect_to_agent with no service desk and still shows the message', async () => {
      const onError = jest.fn();
      const { instance, store } = await renderChatAndGetInstanceWithStore({
        ...createBaseConfig(),
        onError,
      });
      const loadingCounter = () =>
        store.getState().assistantMessageState.isMessageLoadingCounter;
      const baseline = loadingCounter();
      const receive = jest.fn();
      instance.on({ type: BusEventType.RECEIVE, handler: receive });
      const id = 'pin-connect-no-desk';

      await instance.messaging.addMessage(
        response(id, [connectToAgent, text('After the card')])
      );
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].errorType).toBe(
        OnErrorType.INTEGRATION_ERROR
      );
      expect(receive).toHaveBeenCalledTimes(1);
      expect(
        store.getState().allMessagesByID[id].ui_state_internal
          .agent_no_service_desk
      ).toBe(true);
      expect(visibleItemCount(store, id)).toBe(2);
      expect(loadingCounter()).toBe(baseline);
    });

    it('starts the chat right away when the config skips the connect card and agents are online', async () => {
      const { instance, availability } = await renderWithPendingAvailability({
        serviceDesk: { skipConnectHumanAgentCard: true },
      });
      const startChat = jest
        .spyOn((instance as any).serviceManager.humanAgentService, 'startChat')
        .mockResolvedValue(undefined);
      const id = 'pin-connect-skip-card';

      await instance.messaging.addMessage(response(id, [connectToAgent]));
      expect(startChat).not.toHaveBeenCalled();

      availability.release(true);

      await waitFor(() => expect(startChat).toHaveBeenCalledTimes(1));
      const [localItem, message] = startChat.mock.calls[0] as any[];
      expect(localItem.fullMessageID).toBe(id);
      expect(message.id).toBe(id);
    });

    it('drops the availability result when the conversation restarts during the check', async () => {
      const { instance, store, availability } =
        await renderWithPendingAvailability();
      const loadingCounter = () =>
        store.getState().assistantMessageState.isMessageLoadingCounter;
      const baseline = loadingCounter();
      const id = 'pin-connect-restart';

      await instance.messaging.addMessage(response(id, [connectToAgent]));
      expect(loadingCounter()).toBe(baseline + 1);

      await instance.restartConversation();
      availability.release(true);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(
        store.getState().allMessagesByID[id]?.ui_state_internal
          ?.agent_availability
      ).toBeUndefined();
      expect(visibleItemCount(store, id)).toBe(0);
      // The restart reset the counter, and the dropped check does not lower it again.
      expect(loadingCounter()).toBe(0);
    });

    it('waits out a pause without typing and never shows the typing indicator', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const loadingCounter = () =>
        store.getState().assistantMessageState.isMessageLoadingCounter;
      const baseline = loadingCounter();
      const counts: number[] = [];
      const unsubscribe = store.subscribe(() => counts.push(loadingCounter()));
      const id = 'pin-pause-quiet';

      await instance.messaging.addMessage(
        response(id, [
          {
            response_type: MessageResponseTypes.PAUSE,
            time: 300,
            typing: false,
          },
          text('After'),
        ])
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(visibleTexts(store, id)).toEqual([]);

      await waitFor(() => expect(visibleTexts(store, id)).toEqual(['After']), {
        timeout: 2000,
      });
      unsubscribe();
      expect(counts.every((count) => count === baseline)).toBe(true);
    });

    it('drops the message when a pre:receive handler restarts the conversation', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const receive = jest.fn();
      let restarted = false;
      instance.on([
        {
          type: BusEventType.PRE_RECEIVE,
          handler: async () => {
            if (!restarted) {
              restarted = true;
              await instance.restartConversation();
            }
          },
        },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);
      const id = 'pin-restart-in-pre-receive';

      await instance.messaging.addMessage(response(id, [text('Dropped')]));
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(store.getState().allMessagesByID[id]).toBeUndefined();
      expect(visibleItemCount(store, id)).toBe(0);
      // receive does not fire for the dropped message either.
      expect(receive).not.toHaveBeenCalled();
    });

    it('leaves request_id unset on a response added during customSendMessage, and clears a host-set one', async () => {
      // Surprising: addMessage always passes no originating request, so processing
      // overwrites request_id with undefined. The link to the request is never recorded.
      let requestID: string;
      const config = {
        ...createBaseConfig(),
        messaging: {
          skipWelcome: true,
          customSendMessage: async (
            request: any,
            _options: any,
            chatInstance: ChatInstance
          ) => {
            requestID = request.id;
            await chatInstance.messaging.addMessage(
              response('pin-request-id', [text('Answer')])
            );
          },
        },
      };
      const { instance, store } = await renderChatAndGetInstanceWithStore(
        config as any
      );

      await instance.send('Question');

      expect(requestID).toBeDefined();
      const answered = store.getState().allMessagesByID[
        'pin-request-id'
      ] as MessageResponse;
      expect(answered).toBeDefined();
      expect(answered.request_id).toBeUndefined();

      const hostSet = {
        ...response('pin-host-request-id', [text('Proactive')]),
        request_id: 'host-set',
      };
      await instance.messaging.addMessage(hostSet);

      expect(
        (
          store.getState().allMessagesByID[
            'pin-host-request-id'
          ] as MessageResponse
        ).request_id
      ).toBeUndefined();
      // The host's own object is the one that was changed.
      expect(hostSet.request_id).toBeUndefined();
    });

    it('turns a message with no output into an inline error', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);
      const id = 'pin-no-output';
      const inlineErrors = () =>
        Object.values(store.getState().allMessageItemsByID).filter(
          (item) =>
            item.item.response_type === MessageResponseTypes.INLINE_ERROR
        );

      await instance.messaging.addMessage({ id } as any);

      await waitFor(() => expect(inlineErrors()).toHaveLength(1));
      const state = store.getState();
      // The original message is never stored; a generated inline-error response is.
      expect(state.allMessagesByID[id]).toBeUndefined();
      expect(inlineErrors()[0].fullMessageID).not.toBe(id);
      expect(state.assistantMessageState.localMessageIDs).toContain(
        inlineErrors()[0].ui_state.id
      );
      // Both the original and the inline error go through pre:receive and receive.
      await waitFor(() => expect(receive).toHaveBeenCalledTimes(2));
      expect(preReceive).toHaveBeenCalledTimes(2);
      expect(preReceive.mock.calls[0][0].data.id).toBe(id);
      expect(receive.mock.calls.map((call) => call[0].data.id)).toContain(id);
    });

    it("assigns an id to a message without one, writing it onto the host's object", async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const preReceive = jest.fn();
      instance.on({ type: BusEventType.PRE_RECEIVE, handler: preReceive });
      const message = { output: { generic: [text('No id')] } } as any;

      await instance.messaging.addMessage(message);

      expect(typeof message.id).toBe('string');
      expect(message.id.length).toBeGreaterThan(0);
      expect(preReceive.mock.calls[0][0].data.id).toBe(message.id);
      expect(store.getState().allMessagesByID[message.id]).toBe(message);
    });

    it('fires pre:receive and receive again for a second addMessage with the same id', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);
      const id = 'pin-same-id';

      await instance.messaging.addMessage(response(id, [text('One')]));
      await waitFor(() => expect(visibleTexts(store, id)).toEqual(['One']));
      await instance.messaging.addMessage(response(id, [text('Two')]));

      expect(preReceive).toHaveBeenCalledTimes(2);
      expect(receive).toHaveBeenCalledTimes(2);
      // Items without a streaming id are replaced, not appended.
      await waitFor(() => expect(visibleTexts(store, id)).toEqual(['Two']));
    });

    it('hides the stop button that showStopButtonImmediately put up', async () => {
      const visible: boolean[] = [];
      const rendered: { store?: any } = {};
      const isVisible = () =>
        rendered.store.getState().assistantInputState.stopStreamingButtonState
          .isVisible;
      const config = {
        ...createBaseConfig(),
        messaging: {
          skipWelcome: true,
          showStopButtonImmediately: true,
          customSendMessage: async (
            _request: any,
            _options: any,
            chatInstance: ChatInstance
          ) => {
            visible.push(isVisible());
            await chatInstance.messaging.addMessage(
              response('pin-stop-button', [text('Answer')])
            );
            visible.push(isVisible());
          },
        },
      };
      const { instance, store } = await renderChatAndGetInstanceWithStore(
        config as any
      );
      rendered.store = store;

      await instance.send('Question');

      expect(visible).toEqual([true, false]);
    });

    it("freezes the stored message, which is the host's own object", async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const message = response('pin-frozen', [text('Frozen')]);

      await instance.messaging.addMessage(message);

      const stored = store.getState().allMessagesByID['pin-frozen'];
      expect(stored).toBe(message);
      expect(Object.isFrozen(stored)).toBe(true);
      expect(
        Object.isFrozen((stored as MessageResponse).output.generic[0])
      ).toBe(true);
    });

    it('fires userDefinedResponse and customFooterSlot before the item is in the store', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const id = 'pin-events-before-store';
      const localID = `${id}-ud`;
      const seen: Record<
        string,
        { itemVisible: boolean; messageStored: boolean }
      > = {};
      const snapshot = (name: string) => () => {
        const state = store.getState();
        seen[name] = {
          itemVisible:
            state.assistantMessageState.localMessageIDs.includes(localID),
          messageStored: Boolean(state.allMessagesByID[id]),
        };
      };
      instance.on([
        {
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: snapshot('userDefinedResponse'),
        },
        {
          type: BusEventType.CUSTOM_FOOTER_SLOT,
          handler: snapshot('customFooterSlot'),
        },
      ]);

      await instance.messaging.addMessage(
        response(id, [
          {
            streaming_metadata: { id: 'ud' },
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { kind: 'widget' },
            message_item_options: {
              custom_footer_slot: { slot_name: 'pin-footer' },
            },
          },
        ])
      );
      await waitFor(() =>
        expect(
          store.getState().assistantMessageState.localMessageIDs
        ).toContain(localID)
      );

      // The full message is already stored; only the item is not yet visible.
      expect(seen).toEqual({
        userDefinedResponse: { itemVisible: false, messageStored: true },
        customFooterSlot: { itemVisible: false, messageStored: true },
      });
    });

    describe('writes for one id that overlap', () => {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const textWithStreamID = (value: string, streamID?: string) =>
        streamID
          ? { ...text(value), streaming_metadata: { id: streamID } }
          : text(value);

      const pausedResponse = (id: string, streamIDs: string[] = []) =>
        response(id, [
          textWithStreamID('First 1', streamIDs[0]),
          { response_type: MessageResponseTypes.PAUSE, time: 300 },
          textWithStreamID('First 2', streamIDs[1]),
        ]);

      const secondResponse = (id: string, streamIDs: string[] = []) =>
        response(id, [
          textWithStreamID('Second 1', streamIDs[0]),
          textWithStreamID('Second 2', streamIDs[1]),
        ]);

      it('runs a second addMessage while the first is paused, and the first still shows its later items', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'pin-overlap';
        const receive = jest.fn();
        instance.on({ type: BusEventType.RECEIVE, handler: receive });

        await instance.messaging.addMessage(pausedResponse(id));
        let isPauseOver = false;
        setTimeout(() => {
          isPauseOver = true;
        }, 300);

        const second = secondResponse(id);
        await instance.messaging.addMessage(second);
        expect(isPauseOver).toBe(false);
        expect(receive).toHaveBeenCalledTimes(2);
        await waitFor(() =>
          expect(visibleTexts(store, id)).toEqual(['Second 1', 'Second 2'])
        );

        // The first message's reveal goes on, and its item without a streaming id goes at
        // the end, since the item it would follow is gone.
        await waitFor(() =>
          expect(visibleTexts(store, id)).toEqual([
            'Second 1',
            'Second 2',
            'First 2',
          ])
        );
        expect(store.getState().allMessagesByID[id]).toBe(second);
        expect(store.getState().assistantMessageState.messageIDs).toEqual([id]);
      });

      it('lets the first addMessage replace the item with the same streaming id when its pause ends', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'pin-overlap-streamed';

        await instance.messaging.addMessage(pausedResponse(id, ['a', 'b']));
        const second = secondResponse(id, ['a', 'b']);
        await instance.messaging.addMessage(second);
        await waitFor(() =>
          expect(visibleTexts(store, id)).toEqual(['Second 1', 'Second 2'])
        );

        await waitFor(() =>
          expect(visibleTexts(store, id)).toEqual(['Second 1', 'First 2'])
        );
        expect(store.getState().allMessagesByID[id]).toBe(second);
      });

      it('runs an upsertMessage while an addMessage for the same id is paused', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'pin-overlap-upsert';

        await instance.messaging.addMessage(pausedResponse(id));
        let isPauseOver = false;
        setTimeout(() => {
          isPauseOver = true;
        }, 300);

        await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () =>
          response(id, [text('Upserted')])
        );
        expect(isPauseOver).toBe(false);
        expect(visibleTexts(store, id)).toEqual(['Upserted']);

        await sleep(400);
        expect(visibleTexts(store, id)).toEqual(['Upserted', 'First 2']);
      });

      /** Registers a `receive` handler that waits on the returned gate for `message` only. */
      const holdReceiveOf = (
        instance: ChatInstance,
        message: MessageResponse
      ) => {
        const handlerGate = gate();
        instance.on({
          type: BusEventType.RECEIVE,
          handler: (event: any) =>
            event.data === message ? handlerGate.promise : undefined,
        });
        return handlerGate;
      };

      it('stores a second addMessage and fires its receive while the first one waits on its receive handler', async () => {
        const { instance, store, serviceManager } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'pin-overlap-receive';
        const first = response(id, [text('First')]);
        const second = response(id, [text('Second')]);
        const firstHandler = holdReceiveOf(instance, first);
        const fire = jest.spyOn(serviceManager.eventBus, 'fire');

        const firstAdd = instance.messaging.addMessage(first);
        const secondAdd = instance.messaging.addMessage(second);
        // The bus refuses or queues a second receive while the first one's handler runs,
        // so only the attempt to fire it is pinned.
        secondAdd.catch((): void => undefined);

        await waitFor(() =>
          expect(
            fire.mock.calls.some(
              ([event]: any) =>
                event.type === BusEventType.RECEIVE && event.data === second
            )
          ).toBe(true)
        );
        expect(store.getState().allMessagesByID[id]).toBe(second);

        firstHandler.release();
        await firstAdd;
      });

      it('stores an upsertMessage while an addMessage for the same id waits on its receive handler', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const id = 'pin-overlap-receive-upsert';
        const added = response(id, [text('Added')]);
        const addedHandler = holdReceiveOf(instance, added);

        const add = instance.messaging.addMessage(added);
        await waitFor(() => expect(visibleTexts(store, id)).toEqual(['Added']));
        const upsert = instance.messaging.upsertMessage(
          id,
          MessageState.COMPLETE,
          () => response(id, [text('Upserted')])
        );
        upsert.catch((): void => undefined);

        await waitFor(() =>
          expect(visibleTexts(store, id)).toEqual(['Upserted'])
        );

        addedHandler.release();
        await add;
      });
    });

    it('moves a re-added message after a later message when its first item has no streaming id', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const allVisibleTexts = () => {
        const state = store.getState();
        return state.assistantMessageState.localMessageIDs.map(
          (localID: string) =>
            (state.allMessageItemsByID[localID].item as any).text
        );
      };
      const streamed = (value: string) => ({
        ...text(value),
        streaming_metadata: { id: 's' },
      });

      await instance.messaging.addMessage(
        response('pin-order-a', [text('A 1'), streamed('A 2')])
      );
      await instance.messaging.addMessage(response('pin-order-b', [text('B')]));
      await waitFor(() =>
        expect(allVisibleTexts()).toEqual(['A 1', 'A 2', 'B'])
      );

      await instance.messaging.addMessage(
        response('pin-order-a', [text('A 1, again'), streamed('A 2, again')])
      );
      await waitFor(() =>
        expect(allVisibleTexts()).toEqual(['B', 'A 1, again', 'A 2, again'])
      );
    });
  });

  describe('on the upsert path', () => {
    beforeEach(() => window.sessionStorage.clear());

    const itemsOf = (store: any, messageID: string) => {
      const state = store.getState();
      return state.assistantMessageState.localMessageIDs
        .map((id: string) => state.allMessageItemsByID[id])
        .filter((item: any) => item?.fullMessageID === messageID);
    };

    it('writes the response through one COMPLETE coordinator upsert and upsert writes only', async () => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const upsert = jest.spyOn(
        serviceManager.messageUpsertCoordinator,
        'upsert'
      );
      const dispatch = jest.spyOn(store, 'dispatch');
      const id = 'path-add';

      await instance.messaging.addMessage({
        id,
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'One' },
            { response_type: MessageResponseTypes.TEXT, text: 'Two' },
          ],
        },
      } as MessageResponse);
      await waitFor(() => expect(itemsOf(store, id)).toHaveLength(2));

      expect(upsert).toHaveBeenCalledTimes(1);
      expect(upsert.mock.calls[0].slice(0, 3)).toEqual([
        id,
        MessageState.COMPLETE,
        expect.any(Function),
      ]);
      expect(upsert.mock.calls[0][3]).toMatchObject({ origin: 'addMessage' });
      const messageWrites = dispatch.mock.calls
        .map(([action]: any) => action.type)
        .filter((type: string) =>
          /^(ADD_MESSAGE|ADD_LOCAL_MESSAGE_ITEM|ADD_NESTED_MESSAGES|UPDATE_MESSAGE|UPSERT_MESSAGE)$/.test(
            type
          )
        );
      // One write stores the message, then one shows each item.
      expect(messageWrites).toEqual([
        'UPSERT_MESSAGE',
        'UPSERT_MESSAGE',
        'UPSERT_MESSAGE',
      ]);
    });

    it('gives a user_defined item nested in a card the slot its stored item renders', async () => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const userDefinedResponse = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: userDefinedResponse,
      });
      const id = 'path-nested';

      await instance.messaging.addMessage({
        id,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.CARD,
              body: [
                {
                  response_type: MessageResponseTypes.USER_DEFINED,
                  user_defined: { kind: 'nested' },
                },
              ],
            },
          ],
        },
      } as MessageResponse);
      await waitFor(() => expect(itemsOf(store, id)).toHaveLength(1));

      expect(userDefinedResponse).toHaveBeenCalledTimes(1);
      const [card] = itemsOf(store, id);
      const nestedID = card.ui_state.bodyLocalMessageItemIDs[0];
      expect(store.getState().allMessageItemsByID[nestedID]).toBeDefined();
      expect(
        serviceManager.userDefinedElementRegistry.get(nestedID).slotName
      ).toBe(userDefinedResponse.mock.calls[0][0].data.slot);
    });

    it('announces each item once when the same message is added again with the same streaming ids', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const id = 'path-announce';
      const localID = `${id}-a`;
      const history: boolean[] = [];
      const unsubscribe = store.subscribe(() => {
        const value =
          store.getState().allMessageItemsByID[localID]?.ui_state
            .needsAnnouncement;
        if (value !== undefined && history[history.length - 1] !== value) {
          history.push(value);
        }
      });
      const message = (text: string) =>
        ({
          id,
          output: {
            generic: [
              {
                streaming_metadata: { id: 'a' },
                response_type: MessageResponseTypes.TEXT,
                text,
              },
              { response_type: MessageResponseTypes.TEXT, text: 'Second' },
            ],
          },
        }) as MessageResponse;

      await instance.messaging.addMessage(message('First'));
      await waitFor(() => expect(itemsOf(store, id)).toHaveLength(2));
      await waitFor(() => expect(history).toEqual([true, false]));

      await instance.messaging.addMessage(message('First, again'));
      await waitFor(() =>
        expect(itemsOf(store, id).map((item: any) => item.item.text)).toEqual([
          'First, again',
          'Second',
        ])
      );
      // A repeat addMessage replaces the item, so it is announced again, once.
      await waitFor(() => expect(history).toEqual([true, false, true, false]));
      unsubscribe();
    });

    const pausedMessage = (id: string, time = 200) =>
      ({
        id,
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'Before' },
            { response_type: MessageResponseTypes.PAUSE, time },
            { response_type: MessageResponseTypes.TEXT, text: 'After' },
          ],
        },
      }) as MessageResponse;

    it('leaves the active response alone when a later item shows', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const activeResponseId = () =>
        store.getState().assistantMessageState.activeResponseId;

      await instance.messaging.addMessage(pausedMessage('path-active-a'));
      await instance.messaging.addMessage({
        id: 'path-active-b',
        output: {
          generic: [{ response_type: MessageResponseTypes.TEXT, text: 'B' }],
        },
      } as MessageResponse);
      expect(activeResponseId()).toBe('path-active-b');

      await waitFor(() =>
        expect(itemsOf(store, 'path-active-a')).toHaveLength(2)
      );
      expect(activeResponseId()).toBe('path-active-b');
    });

    it('keeps history recorded on the message while its items are still showing', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const id = 'path-history';

      await instance.messaging.addMessage(pausedMessage(id));
      act(() => {
        store.dispatch(
          actions.mergeMessageHistory(id, {
            feedback: { [`${id}-feedback`]: { is_positive: true } },
          } as any)
        );
      });

      await waitFor(() => expect(itemsOf(store, id)).toHaveLength(2));
      expect(
        (store.getState().allMessagesByID[id] as MessageResponse).history
          .feedback
      ).toEqual({ [`${id}-feedback`]: { is_positive: true } });
    });

    it('shows two items with one streaming id once, and fires each item its own event', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const userDefinedResponse = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: userDefinedResponse,
      });
      const id = 'path-duplicate';
      const widget = (kind: string) => ({
        streaming_metadata: { id: 'same' },
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { kind },
      });

      await instance.messaging.addMessage({
        id,
        output: { generic: [widget('first'), widget('second')] },
      } as MessageResponse);

      await waitFor(() => expect(userDefinedResponse).toHaveBeenCalledTimes(2));
      expect(
        userDefinedResponse.mock.calls.map(
          (call) => call[0].data.message.user_defined.kind
        )
      ).toEqual(['first', 'second']);
      await waitFor(() =>
        expect(
          itemsOf(store, id).map((item: any) => item.item.user_defined.kind)
        ).toEqual(['second'])
      );
    });

    it('still fires receive for a second addMessage of the same, now frozen, object', async () => {
      const { instance } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const receive = jest.fn();
      instance.on({ type: BusEventType.RECEIVE, handler: receive });
      const message = {
        id: 'path-same-object',
        output: {
          generic: [{ response_type: MessageResponseTypes.TEXT, text: 'Hi' }],
        },
      } as MessageResponse;

      await instance.messaging.addMessage(message);
      await expect(
        instance.messaging.addMessage(message)
      ).resolves.not.toThrow();

      expect(receive).toHaveBeenCalledTimes(2);
    });

    it('stops showing a removed message, and leaves one added again under its id alone', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const id = 'path-removed';

      await instance.messaging.addMessage(pausedMessage(id));
      await instance.messaging.removeMessages([id]);
      const replacement = {
        id,
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'Replacement' },
          ],
        },
      } as MessageResponse;
      await instance.messaging.addMessage(replacement);
      await waitFor(() =>
        expect(itemsOf(store, id).map((item: any) => item.item.text)).toEqual([
          'Replacement',
        ])
      );

      // Outlast the first message's pause.
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(store.getState().allMessagesByID[id]).toBe(replacement);
      expect(itemsOf(store, id).map((item: any) => item.item.text)).toEqual([
        'Replacement',
      ]);
    });
  });
});

describe('malformed items through addMessage', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('keeps the valid prefix when a later nested item cannot be built', async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const message = {
      id: 'malformed-suffix',
      output: {
        generic: [
          { response_type: MessageResponseTypes.TEXT, text: 'Valid prefix' },
          { response_type: MessageResponseTypes.GRID },
        ],
      },
    } as MessageResponse;

    await expect(
      instance.messaging.addMessage(message)
    ).resolves.toBeUndefined();
    await waitFor(() => {
      const state = store.getState();
      const items = state.assistantMessageState.localMessageIDs
        .map((id) => state.allMessageItemsByID[id])
        .filter((item) => item.fullMessageID === message.id);
      expect(items.map((item) => item.item)).toEqual([
        message.output.generic[0],
      ]);
    });
    expect(store.getState().allMessagesByID[message.id]).toBe(message);
  });

  /** Items a renderer throws on. The rest throw while the message is stored, which drops it. */
  const SHOWS_ERROR = new Set([
    'grid, column width not a string',
    'option, no options',
    'option, null entry',
    'option, dropdown entry with no value.input',
    'option, more than four entries, one with no value',
    'conversational_search, citations not a list',
    'conversational_search, null citation',
    'system, after a null item in the message',
  ]);

  it.each(MALFORMED)('keeps what "$name" does', async (fixture) => {
    const outcome = await observeWrite((instance) =>
      instance.messaging.addMessage(fixtureMessage(fixture))
    );

    expect(outcome).toEqual(
      SHOWS_ERROR.has(fixture.name)
        ? {
            rejects: false,
            shownItems: 1,
            reports: ['RENDER: Message.componentDidCatch'],
            failedItems: 1,
            catastrophic: false,
          }
        : {
            rejects: false,
            shownItems: 0,
            reports: [],
            failedItems: 0,
            catastrophic: false,
          }
    );
  });
});
