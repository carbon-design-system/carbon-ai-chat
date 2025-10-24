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
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../../../test_helpers";
import { MessageResponseTypes } from "../../../../src/types/messaging/Messages";
import { BusEventType } from "../../../../src/types/events/eventBusTypes";

describe("ChatInstance.messaging.addMessage", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have addMessage method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.addMessage).toBe("function");
  });

  it("should accept message response", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const messageResponse = {
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: "Hello from bot",
          },
        ],
      },
    };

    await expect(
      instance.messaging.addMessage(messageResponse),
    ).resolves.not.toThrow();
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const messageResponse = {
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.TEXT,
            text: "Welcome message",
          },
        ],
      },
    };

    const result = instance.messaging.addMessage(messageResponse);
    expect(result).toBeInstanceOf(Promise);
  });

  describe("state updates", () => {
    it("should add message to allMessagesByID in store", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        id: "test-message-1",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test message",
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID,
      ).length;

      await instance.messaging.addMessage(messageResponse);

      const updatedState = store.getState();
      const updatedMessageCount = Object.keys(
        updatedState.allMessagesByID,
      ).length;

      expect(updatedMessageCount).toBe(initialMessageCount + 1);
      expect(updatedState.allMessagesByID["test-message-1"]).toBeDefined();
      expect(updatedState.allMessagesByID["test-message-1"].id).toBe(
        "test-message-1",
      );
    });

    it("should add local message item to allMessageItemsByID in store", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        id: "test-message-2",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test message for local items",
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialItemCount = Object.keys(
        initialState.allMessageItemsByID,
      ).length;

      await instance.messaging.addMessage(messageResponse);

      const updatedState = store.getState();
      const updatedItemCount = Object.keys(
        updatedState.allMessageItemsByID,
      ).length;

      expect(updatedItemCount).toBeGreaterThan(initialItemCount);

      // Find the local message item that corresponds to our message
      const localMessageItems = Object.values(updatedState.allMessageItemsByID);
      const relatedItem = localMessageItems.find(
        (item) => item.fullMessageID === "test-message-2",
      );

      expect(relatedItem).toBeDefined();
      expect((relatedItem?.item as any).text).toBe(
        "Test message for local items",
      );
    });

    it("should add message ID to botMessageState.localMessageItemIDs", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        id: "test-message-3",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test message for message order",
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
        (item) => item.fullMessageID === "test-message-3",
      );

      expect(relatedItem).toBeDefined();
      expect(updatedState.assistantMessageState.localMessageIDs).toContain(
        relatedItem?.ui_state.id,
      );
    });

    it("should auto-generate message ID if not provided", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const messageResponse = {
        // No ID provided
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test message without ID",
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID,
      ).length;

      await instance.messaging.addMessage(messageResponse);

      const updatedState = store.getState();
      const updatedMessageCount = Object.keys(
        updatedState.allMessagesByID,
      ).length;

      expect(updatedMessageCount).toBe(initialMessageCount + 1);

      // Find the newly added message
      const messageKeys = Object.keys(updatedState.allMessagesByID);
      const newMessageKeys = messageKeys.filter(
        (key) => !initialState.allMessagesByID[key],
      );

      expect(newMessageKeys.length).toBe(1);

      const newMessage = updatedState.allMessagesByID[newMessageKeys[0]];
      expect(newMessage.id).toBeDefined();
      expect(typeof newMessage.id).toBe("string");
      expect(newMessage.id.length).toBeGreaterThan(0);
    });

    it("should handle multiple messages correctly", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const message1 = {
        id: "multi-test-1",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "First message",
            },
          ],
        },
      };

      const message2 = {
        id: "multi-test-2",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Second message",
            },
          ],
        },
      };

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID,
      ).length;

      await instance.messaging.addMessage(message1);
      await instance.messaging.addMessage(message2);

      const finalState = store.getState();
      const finalMessageCount = Object.keys(finalState.allMessagesByID).length;

      expect(finalMessageCount).toBe(initialMessageCount + 2);
      expect(finalState.allMessagesByID["multi-test-1"]).toBeDefined();
      expect(finalState.allMessagesByID["multi-test-2"]).toBeDefined();

      // Check order is maintained in localMessageIDs
      const message1Items = Object.values(
        finalState.allMessageItemsByID,
      ).filter((item) => item.fullMessageID === "multi-test-1");
      const message2Items = Object.values(
        finalState.allMessageItemsByID,
      ).filter((item) => item.fullMessageID === "multi-test-2");

      expect(message1Items.length).toBeGreaterThan(0);
      expect(message2Items.length).toBeGreaterThan(0);

      const message1ItemID = message1Items[0].ui_state.id;
      const message2ItemID = message2Items[0].ui_state.id;

      const message1Index =
        finalState.assistantMessageState.localMessageIDs.indexOf(
          message1ItemID,
        );
      const message2Index =
        finalState.assistantMessageState.localMessageIDs.indexOf(
          message2ItemID,
        );

      expect(message1Index).toBeGreaterThanOrEqual(0);
      expect(message2Index).toBeGreaterThanOrEqual(0);
      expect(message1Index).toBeLessThan(message2Index); // First message should come before second
    });
  });

  describe("Event bus integration", () => {
    it("should fire pre:receive and receive events", async () => {
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
        id: "event-test-message",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test message for events",
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
      expect(preReceiveCall.data.id).toBe("event-test-message");

      expect(receiveCall.type).toBe(BusEventType.RECEIVE);
      expect(receiveCall.data).toBeDefined();
      expect(receiveCall.data.id).toBe("event-test-message");
    });

    it("should allow pre:receive handler to modify message", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Handler that modifies the message
      const preReceiveHandler = jest.fn((event) => {
        event.data.output.generic[0].text = "Modified text";
      });

      instance.on({
        type: BusEventType.PRE_RECEIVE,
        handler: preReceiveHandler,
      });

      const messageResponse = {
        id: "modify-test-message",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Original text",
            },
          ],
        },
      };

      await instance.messaging.addMessage(messageResponse);

      // Verify the message was modified in the store
      const finalState = store.getState();
      const storedMessage = finalState.allMessagesByID["modify-test-message"];

      expect(storedMessage).toBeDefined();
      expect((storedMessage as any).output.generic[0].text).toBe(
        "Modified text",
      );
      expect(preReceiveHandler).toHaveBeenCalledTimes(1);
    });

    it("should fire events in correct order (pre:receive before receive)", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const eventOrder: string[] = [];

      const preReceiveHandler = jest.fn(() => {
        eventOrder.push("pre:receive");
      });

      const receiveHandler = jest.fn(() => {
        eventOrder.push("receive");
      });

      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceiveHandler },
        { type: BusEventType.RECEIVE, handler: receiveHandler },
      ]);

      const messageResponse = {
        id: "order-test-message",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test message for event order",
            },
          ],
        },
      };

      await instance.messaging.addMessage(messageResponse);

      expect(eventOrder).toEqual(["pre:receive", "receive"]);
    });
  });
});
