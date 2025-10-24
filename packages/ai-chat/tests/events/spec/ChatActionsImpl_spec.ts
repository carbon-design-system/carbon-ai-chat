/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../../test_helpers";
import { BusEventType } from "../../../src/types/events/eventBusTypes";
import { MessageResponseTypes } from "../../../src/types/messaging/Messages";
import { ViewType } from "../../../src/types/state/AppState";
import { NOTIFICATION_KIND } from "@carbon/web-components/es/components/notification/defs.js";
import * as actions from "../../../src/chat/store/actions";
import * as humanAgentActions from "../../../src/chat/store/humanAgentActions";

describe("ChatActionsImpl", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe("hydrateChat", () => {
    it("should hydrate the chat and fire CHAT_READY event", async () => {
      const config = createBaseConfig();
      const { store, instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const chatReadyHandler = jest.fn();
      instance.on({ type: BusEventType.CHAT_READY, handler: chatReadyHandler });

      await serviceManager.actions.hydrateChat();

      expect(chatReadyHandler).toHaveBeenCalledTimes(1);

      const state = store.getState();
      expect(state.isHydrated).toBe(true);
    });
  });

  describe("send", () => {
    it("should accept string message", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      await expect(
        serviceManager.actions.send("Hello", "test" as any, {}, true),
      ).resolves.not.toThrow();
    });

    it("should accept MessageRequest object", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const messageRequest = {
        input: { text: "Hello" },
      };

      await expect(
        serviceManager.actions.send(messageRequest, "test" as any, {}, true),
      ).resolves.not.toThrow();
    });

    it("should fire PRE_SEND and SEND events", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const preSendHandler = jest.fn();
      const sendHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      await serviceManager.actions.send("Test", "test" as any, {}, true);

      expect(preSendHandler).toHaveBeenCalledTimes(1);
      expect(sendHandler).toHaveBeenCalledTimes(1);
    });

    it("should add message to store", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const initialMessageCount = Object.keys(
        store.getState().allMessagesByID,
      ).length;

      await serviceManager.actions.send(
        "Test message",
        "test" as any,
        {},
        true,
      );

      const finalMessageCount = Object.keys(
        store.getState().allMessagesByID,
      ).length;
      expect(finalMessageCount).toBeGreaterThan(initialMessageCount);
    });

    it("should close home screen when sending message", async () => {
      const config = createBaseConfig();
      config.homescreen = { isOn: true };
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Open home screen first using the proper action
      store.dispatch(actions.default.setHomeScreenIsOpen(true));

      expect(
        store.getState().persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen,
      ).toBe(true);

      await serviceManager.actions.send("Test", "test" as any, {}, true);

      expect(
        store.getState().persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen,
      ).toBe(false);
    });

    it("should handle silent messages", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const initialLocalMessageCount = Object.keys(
        store.getState().allMessageItemsByID,
      ).length;

      await serviceManager.actions.send(
        "Silent message",
        "test" as any,
        { silent: true },
        true,
      );

      // Silent messages should not create local message items
      const finalLocalMessageCount = Object.keys(
        store.getState().allMessageItemsByID,
      ).length;
      expect(finalLocalMessageCount).toBe(initialLocalMessageCount);
    });
  });

  describe("sendWithCatch", () => {
    it("should call send and not throw on success", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      await expect(
        serviceManager.actions.sendWithCatch("Test", "test" as any, {}, true),
      ).resolves.not.toThrow();
    });

    it("should catch and log errors without throwing", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Mock console.error to verify it's called
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Force an error by passing invalid data
      await serviceManager.actions.sendWithCatch(
        null as any,
        "test" as any,
        {},
        true,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("receive", () => {
    it("should fire PRE_RECEIVE and RECEIVE events", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const preReceiveHandler = jest.fn();
      const receiveHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceiveHandler },
        { type: BusEventType.RECEIVE, handler: receiveHandler },
      ]);

      const messageResponse = {
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Hello from assistant",
            },
          ],
        },
      };

      await serviceManager.actions.receive(messageResponse, false);

      expect(preReceiveHandler).toHaveBeenCalledTimes(1);
      expect(receiveHandler).toHaveBeenCalledTimes(1);
    });

    it("should add message to store", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const initialMessageCount = Object.keys(
        store.getState().allMessagesByID,
      ).length;

      const messageResponse = {
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Response text",
            },
          ],
        },
      };

      await serviceManager.actions.receive(messageResponse, false);

      const finalMessageCount = Object.keys(
        store.getState().allMessagesByID,
      ).length;
      expect(finalMessageCount).toBeGreaterThan(initialMessageCount);
    });

    it("should allow PRE_RECEIVE handler to modify message", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const preReceiveHandler = jest.fn((event) => {
        event.data.output.generic[0].text = "Modified text";
      });
      const receiveHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceiveHandler },
        { type: BusEventType.RECEIVE, handler: receiveHandler },
      ]);

      const messageResponse = {
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Original text",
            },
          ],
        },
      };

      await serviceManager.actions.receive(messageResponse, false);

      expect(receiveHandler).toHaveBeenCalledTimes(1);
      const receiveCall = receiveHandler.mock.calls[0][0];
      expect(receiveCall.data.output.generic[0].text).toBe("Modified text");
    });

    it("should assign ID to message if not present", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const receiveHandler = jest.fn();
      instance.on({ type: BusEventType.RECEIVE, handler: receiveHandler });

      const messageResponse = {
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test",
            },
          ],
        },
      };

      await serviceManager.actions.receive(messageResponse, false);

      const receiveCall = receiveHandler.mock.calls[0][0];
      expect(receiveCall.data.id).toBeDefined();
      expect(typeof receiveCall.data.id).toBe("string");
    });
  });

  describe("receiveChunk", () => {
    it("should process partial item chunks", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const chunk = {
        partial_item: {
          id: "test-item-id",
          response_type: MessageResponseTypes.TEXT,
          text: "Partial text",
        },
        streaming_metadata: {
          response_id: "test-response-id",
          cancellable: true,
        },
      };

      await expect(
        serviceManager.actions.receiveChunk(chunk),
      ).resolves.not.toThrow();
    });

    it("should process complete item chunks", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const chunk = {
        complete_item: {
          id: "test-item-id",
          response_type: MessageResponseTypes.TEXT,
          text: "Complete text",
        },
        streaming_metadata: {
          response_id: "test-response-id",
        },
      };

      await expect(
        serviceManager.actions.receiveChunk(chunk),
      ).resolves.not.toThrow();
    });

    it("should queue chunks for processing", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const chunk1 = {
        partial_item: {
          id: "test-item-1",
          response_type: MessageResponseTypes.TEXT,
          text: "First",
        },
        streaming_metadata: {
          response_id: "test-response-id",
          cancellable: true,
        },
      };

      const chunk2 = {
        partial_item: {
          id: "test-item-2",
          response_type: MessageResponseTypes.TEXT,
          text: "Second",
        },
        streaming_metadata: {
          response_id: "test-response-id",
          cancellable: true,
        },
      };

      const promise1 = serviceManager.actions.receiveChunk(chunk1);
      const promise2 = serviceManager.actions.receiveChunk(chunk2);

      await expect(Promise.all([promise1, promise2])).resolves.not.toThrow();
    });
  });

  describe("getPublicChatState", () => {
    it("should return frozen state object", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const state = serviceManager.actions.getPublicChatState();

      expect(state).toBeDefined();
      expect(Object.isFrozen(state)).toBe(true);
    });

    it("should include viewState", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const state = serviceManager.actions.getPublicChatState();

      expect(state.viewState).toBeDefined();
      expect(typeof state.viewState).toBe("object");
    });

    it("should include humanAgent state", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const state = serviceManager.actions.getPublicChatState();

      expect(state.humanAgent).toBeDefined();
      expect(typeof state.humanAgent).toBe("object");
    });

    it("should not allow mutation of returned state", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const state = serviceManager.actions.getPublicChatState();

      expect(() => {
        (state as any).viewState = { launcher: true };
      }).toThrow();
    });
  });

  describe("changeView", () => {
    it("should change view to launcher", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      await serviceManager.actions.changeView(
        ViewType.LAUNCHER,
        { viewChangeReason: "test" as any },
        false,
      );

      const state = store.getState();
      expect(state.persistedToBrowserStorage.viewState.launcher).toBe(true);
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(false);
    });

    it("should change view to main window", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      await serviceManager.actions.changeView(
        ViewType.MAIN_WINDOW,
        { viewChangeReason: "test" as any },
        false,
      );

      const state = store.getState();
      expect(state.persistedToBrowserStorage.viewState.launcher).toBe(false);
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(true);
    });

    it("should fire VIEW_PRE_CHANGE and VIEW_CHANGE events", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const preChangeHandler = jest.fn();
      const changeHandler = jest.fn();

      instance.on([
        { type: BusEventType.VIEW_PRE_CHANGE, handler: preChangeHandler },
        { type: BusEventType.VIEW_CHANGE, handler: changeHandler },
      ]);

      await serviceManager.actions.changeView(
        ViewType.LAUNCHER,
        { viewChangeReason: "test" as any },
        false,
      );

      expect(preChangeHandler).toHaveBeenCalledTimes(1);
      expect(changeHandler).toHaveBeenCalledTimes(1);
    });

    it("should allow canceling view change in PRE_CHANGE event", async () => {
      const config = createBaseConfig();
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Set initial state
      await serviceManager.actions.changeView(
        ViewType.MAIN_WINDOW,
        { viewChangeReason: "test" as any },
        false,
      );

      const preChangeHandler = jest.fn((event) => {
        event.cancelViewChange = true;
      });

      instance.on({
        type: BusEventType.VIEW_PRE_CHANGE,
        handler: preChangeHandler,
      });

      await serviceManager.actions.changeView(
        ViewType.LAUNCHER,
        { viewChangeReason: "test" as any },
        false,
      );

      const state = store.getState();
      // View should remain as mainWindow since change was cancelled
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(true);
    });
  });

  describe("errorOccurred", () => {
    it("should call onError callback", async () => {
      const onError = jest.fn();
      const config = createBaseConfig();
      config.onError = onError;

      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      serviceManager.actions.errorOccurred({
        errorType: "INTEGRATION_ERROR" as any,
        message: "Test error",
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toMatchObject({
        errorType: "INTEGRATION_ERROR",
        message: "Test error",
      });
    });

    it("should set catastrophic error type in store", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      serviceManager.actions.errorOccurred({
        errorType: "INTEGRATION_ERROR" as any,
        message: "Test error",
        catastrophicErrorType: "CATASTROPHIC" as any,
      });

      const state = store.getState();
      expect(state.catastrophicErrorType).toBe("CATASTROPHIC");
    });
  });

  describe("restartConversation", () => {
    it("should fire PRE_RESTART_CONVERSATION and RESTART_CONVERSATION events", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const preRestartHandler = jest.fn();
      const restartHandler = jest.fn();

      instance.on([
        {
          type: BusEventType.PRE_RESTART_CONVERSATION,
          handler: preRestartHandler,
        },
        { type: BusEventType.RESTART_CONVERSATION, handler: restartHandler },
      ]);

      await serviceManager.actions.restartConversation();

      expect(preRestartHandler).toHaveBeenCalledTimes(1);
      expect(restartHandler).toHaveBeenCalledTimes(1);
    });

    it("should clear messages from store", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Send a message to populate the store
      await serviceManager.actions.send("Test", "test" as any, {}, true);

      const messageCountBeforeRestart = Object.keys(
        store.getState().allMessagesByID,
      ).length;
      expect(messageCountBeforeRestart).toBeGreaterThan(0);

      await serviceManager.actions.restartConversation();

      const messageCountAfterRestart = Object.keys(
        store.getState().allMessagesByID,
      ).length;
      // After restart, messages should be cleared (may keep welcome message)
      expect(messageCountAfterRestart).toBeLessThan(messageCountBeforeRestart);
    });

    it("should dispatch restartConversation action to store", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const dispatchSpy = jest.spyOn(store, "dispatch");

      await serviceManager.actions.restartConversation({ fireEvents: true });

      // Should have dispatched the restartConversation action
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining("RESTART"),
        }),
      );

      dispatchSpy.mockRestore();
    });

    it("should set and clear isRestarting flag", async () => {
      const config = createBaseConfig();
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      let isRestartingDuringRestart = false;

      const checkRestartingHandler = jest.fn(() => {
        isRestartingDuringRestart = store.getState().isRestarting;
      });

      instance.on({
        type: BusEventType.PRE_RESTART_CONVERSATION,
        handler: checkRestartingHandler,
      });

      await serviceManager.actions.restartConversation();

      expect(isRestartingDuringRestart).toBe(true);
      expect(store.getState().isRestarting).toBe(false);
    });

    it("should handle skipHydration option", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      await expect(
        serviceManager.actions.restartConversation({ skipHydration: true }),
      ).resolves.not.toThrow();
    });

    it("should handle fireEvents option", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const preRestartHandler = jest.fn();
      const restartHandler = jest.fn();

      instance.on([
        {
          type: BusEventType.PRE_RESTART_CONVERSATION,
          handler: preRestartHandler,
        },
        { type: BusEventType.RESTART_CONVERSATION, handler: restartHandler },
      ]);

      await serviceManager.actions.restartConversation({ fireEvents: false });

      expect(preRestartHandler).not.toHaveBeenCalled();
      expect(restartHandler).not.toHaveBeenCalled();
    });
  });

  describe("removeMessages", () => {
    it("should remove specified messages from store", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Add a message
      const messageResponse = {
        id: "test-message-id",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test message",
            },
          ],
        },
      };

      await serviceManager.actions.receive(messageResponse, false);

      expect(store.getState().allMessagesByID["test-message-id"]).toBeDefined();

      await serviceManager.actions.removeMessages(["test-message-id"]);

      expect(
        store.getState().allMessagesByID["test-message-id"],
      ).toBeUndefined();
    });

    it("should handle removing multiple messages", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Add messages
      await serviceManager.actions.receive(
        {
          id: "msg-1",
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: "Message 1" },
            ],
          },
        },
        false,
      );

      await serviceManager.actions.receive(
        {
          id: "msg-2",
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: "Message 2" },
            ],
          },
        },
        false,
      );

      expect(store.getState().allMessagesByID["msg-1"]).toBeDefined();
      expect(store.getState().allMessagesByID["msg-2"]).toBeDefined();

      await serviceManager.actions.removeMessages(["msg-1", "msg-2"]);

      expect(store.getState().allMessagesByID["msg-1"]).toBeUndefined();
      expect(store.getState().allMessagesByID["msg-2"]).toBeUndefined();
    });
  });

  describe("insertHistory", () => {
    it("should insert history messages into store", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const historyMessages = [
        {
          message: {
            input: { text: "Hello" },
          },
          time: new Date().toISOString(),
        },
        {
          message: {
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "Hi there",
                },
              ],
            },
          },
          time: new Date().toISOString(),
        },
      ];

      const initialMessageCount = Object.keys(
        store.getState().allMessagesByID,
      ).length;

      await serviceManager.actions.insertHistory(historyMessages);

      const finalMessageCount = Object.keys(
        store.getState().allMessagesByID,
      ).length;
      expect(finalMessageCount).toBeGreaterThan(initialMessageCount);
    });
  });

  describe("addNotification", () => {
    it("should add notification to store", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const notification = {
        kind: NOTIFICATION_KIND.INFO,
        title: "Test Notification",
        message: "Test message",
        groupID: "test-group",
      };

      serviceManager.actions.addNotification(notification);

      const state = store.getState();
      const notifications = state.notifications;
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].notification).toMatchObject({
        kind: NOTIFICATION_KIND.INFO,
        title: "Test Notification",
        message: "Test message",
        groupID: "test-group",
      });
    });
  });

  describe("removeNotification", () => {
    it("should remove notification by groupID", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const notification = {
        kind: NOTIFICATION_KIND.INFO,
        title: "Test Notification",
        message: "Test message",
        groupID: "test-group",
      };

      serviceManager.actions.addNotification(notification);

      let state = store.getState();
      expect(state.notifications.length).toBeGreaterThan(0);

      serviceManager.actions.removeNotification("test-group");

      state = store.getState();
      const remainingNotifications = state.notifications.filter(
        (n) => n.notification.groupID === "test-group",
      );
      expect(remainingNotifications.length).toBe(0);
    });
  });

  describe("removeAllNotifications", () => {
    it("should remove all notifications", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      serviceManager.actions.addNotification({
        kind: NOTIFICATION_KIND.INFO,
        title: "Notification 1",
        message: "Message 1",
        groupID: "group-1",
      });
      serviceManager.actions.addNotification({
        kind: NOTIFICATION_KIND.INFO,
        title: "Notification 2",
        message: "Message 2",
        groupID: "group-2",
      });

      let state = store.getState();
      expect(state.notifications.length).toBeGreaterThan(0);

      serviceManager.actions.removeAllNotifications();

      state = store.getState();
      expect(state.notifications.length).toBe(0);
    });
  });

  describe("destroySession", () => {
    it("should clear persisted state when keepOpenState is false", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Add some state
      await serviceManager.actions.send("Test", "test" as any, {}, true);

      await serviceManager.actions.destroySession(false);

      const state = store.getState();
      // Should reset to launcher open state
      expect(state.persistedToBrowserStorage.viewState.launcher).toBe(true);
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(false);
    });

    it("should preserve view state when keepOpenState is true", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Set specific view state
      await serviceManager.actions.changeView(
        ViewType.MAIN_WINDOW,
        { viewChangeReason: "test" as any },
        false,
      );

      const viewStateBeforeDestroy =
        store.getState().persistedToBrowserStorage.viewState;

      await serviceManager.actions.destroySession(true);

      const viewStateAfterDestroy =
        store.getState().persistedToBrowserStorage.viewState;
      expect(viewStateAfterDestroy).toEqual(viewStateBeforeDestroy);
    });
  });

  describe("agentUpdateIsSuspended", () => {
    it("should call agentUpdateIsSuspended action", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      // Mock service desk to be connected so isSuspended can be set

      store.dispatch(humanAgentActions.setIsConnecting(true, "test-id"));

      serviceManager.actions.agentUpdateIsSuspended(true);

      const state = store.getState();
      expect(state.persistedToBrowserStorage.humanAgentState.isSuspended).toBe(
        true,
      );

      serviceManager.actions.agentUpdateIsSuspended(false);

      const stateAfter = store.getState();
      expect(
        stateAfter.persistedToBrowserStorage.humanAgentState.isSuspended,
      ).toBe(false);
    });
  });

  describe("getOrCreateUserDefinedElement", () => {
    it("should create new user defined element registry entry", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const result =
        serviceManager.actions.getOrCreateUserDefinedElement("test-message-id");

      expect(result).toBeDefined();
      expect(result.slotName).toBeDefined();
      expect(typeof result.slotName).toBe("string");
      expect(result.slotName).toContain("slot-user-defined-");
    });

    it("should return existing registry entry if already created", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const first =
        serviceManager.actions.getOrCreateUserDefinedElement("test-message-id");
      const second =
        serviceManager.actions.getOrCreateUserDefinedElement("test-message-id");

      expect(first).toBe(second);
      expect(first.slotName).toBe(second.slotName);
    });

    it("should create unique entries for different message IDs", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const first =
        serviceManager.actions.getOrCreateUserDefinedElement("message-1");
      const second =
        serviceManager.actions.getOrCreateUserDefinedElement("message-2");

      expect(first).not.toBe(second);
      expect(first.slotName).not.toBe(second.slotName);
    });
  });

  describe("openResponsePanel", () => {
    it("should open response panel with provided content", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const localMessageItem = {
        ui_state: {
          id: "test-item-id",
        },
        item: {
          response_type: MessageResponseTypes.TEXT,
          text: "Test content",
        },
        fullMessageID: "test-message-id",
      } as any;

      serviceManager.actions.openResponsePanel(localMessageItem, false);

      const state = store.getState();
      expect(state.responsePanelState.isOpen).toBe(true);
      expect(state.responsePanelState.localMessageItem).toBeDefined();
    });
  });

  describe("insertLocalMessageResponse", () => {
    it("should insert local message response", async () => {
      const config = createBaseConfig();
      const { store, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Local message",
            },
          ],
        },
      } as any;

      const initialMessageCount = Object.keys(
        store.getState().allMessagesByID,
      ).length;

      await serviceManager.actions.insertLocalMessageResponse(messageResponse);

      const finalMessageCount = Object.keys(
        store.getState().allMessagesByID,
      ).length;
      expect(finalMessageCount).toBeGreaterThan(initialMessageCount);
    });

    it("should assign ID to message", async () => {
      const config = createBaseConfig();
      const { serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Local message",
            },
          ],
        },
      } as any;

      await serviceManager.actions.insertLocalMessageResponse(messageResponse);

      // Message should have been assigned an ID
      expect(messageResponse.id).toBeDefined();
      expect(typeof messageResponse.id).toBe("string");
    });
  });

  describe("handleUserDefinedResponseItems", () => {
    it("should fire USER_DEFINED_RESPONSE event for user defined messages", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const userDefinedHandler = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: userDefinedHandler,
      });

      const localMessage = {
        ui_state: {
          id: "test-item-id",
        },
        item: {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: {
            foo: "bar",
          },
        },
        fullMessageID: "test-message-id",
      } as any;

      const originalMessage = {
        id: "test-message-id",
        output: {
          generic: [localMessage.item],
        },
      } as any;

      await serviceManager.actions.handleUserDefinedResponseItems(
        localMessage,
        originalMessage,
      );

      expect(userDefinedHandler).toHaveBeenCalledTimes(1);
      const eventData = userDefinedHandler.mock.calls[0][0];
      expect(eventData.type).toBe(BusEventType.USER_DEFINED_RESPONSE);
      expect(eventData.data.message).toBeDefined();
      expect(eventData.data.slot).toBeDefined();
    });

    it("should not fire event for non-user-defined messages", async () => {
      const config = createBaseConfig();
      const { instance, serviceManager } =
        await renderChatAndGetInstanceWithStore(config);

      const userDefinedHandler = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: userDefinedHandler,
      });

      const localMessage = {
        ui_state: {
          id: "test-item-id",
        },
        item: {
          response_type: MessageResponseTypes.TEXT,
          text: "Regular text message",
        },
        fullMessageID: "test-message-id",
      } as any;

      const originalMessage = {
        id: "test-message-id",
        output: {
          generic: [localMessage.item],
        },
      } as any;

      await serviceManager.actions.handleUserDefinedResponseItems(
        localMessage,
        originalMessage,
      );

      expect(userDefinedHandler).not.toHaveBeenCalled();
    });
  });
});
