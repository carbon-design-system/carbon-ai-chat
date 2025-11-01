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

describe("ChatInstance.messaging.removeMessages", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have removeMessages method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.removeMessages).toBe("function");
  });

  it("should accept array of message IDs", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const messageIDs = ["msg-1", "msg-2", "msg-3"];

    await expect(
      instance.messaging.removeMessages(messageIDs),
    ).resolves.not.toThrow();
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.messaging.removeMessages(["msg-1"]);
    expect(result).toBeInstanceOf(Promise);
  });

  describe("Redux state management", () => {
    it("should remove specified messages from Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add some messages first
      await instance.messaging.addMessage({
        id: "remove-test-msg-1",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "First message to remove",
            },
          ],
        },
      });

      await instance.messaging.addMessage({
        id: "remove-test-msg-2",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Second message to remove",
            },
          ],
        },
      });

      await instance.messaging.addMessage({
        id: "keep-test-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Message to keep",
            },
          ],
        },
      });

      // Verify messages were added
      let state = store.getState();
      expect(state.allMessagesByID["remove-test-msg-1"]).toBeDefined();
      expect(state.allMessagesByID["remove-test-msg-2"]).toBeDefined();
      expect(state.allMessagesByID["keep-test-msg"]).toBeDefined();

      const initialMessageCount = Object.keys(state.allMessagesByID).length;

      // Remove specific messages
      await instance.messaging.removeMessages([
        "remove-test-msg-1",
        "remove-test-msg-2",
      ]);

      // Verify specified messages are removed
      state = store.getState();
      expect(state.allMessagesByID["remove-test-msg-1"]).toBeUndefined();
      expect(state.allMessagesByID["remove-test-msg-2"]).toBeUndefined();
      expect(state.allMessagesByID["keep-test-msg"]).toBeDefined();

      const finalMessageCount = Object.keys(state.allMessagesByID).length;
      expect(finalMessageCount).toBeLessThan(initialMessageCount);
    });

    it("should remove associated message items from Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add a message
      await instance.messaging.addMessage({
        id: "item-remove-test-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Message with items to remove",
            },
          ],
        },
      });

      // Get initial state
      let state = store.getState();
      expect(state.allMessagesByID["item-remove-test-msg"]).toBeDefined();

      // Find associated message items
      const initialItems = Object.values(state.allMessageItemsByID);
      const itemsForMessage = initialItems.filter(
        (item) => item.fullMessageID === "item-remove-test-msg",
      );
      expect(itemsForMessage.length).toBeGreaterThan(0);

      const initialItemCount = Object.keys(state.allMessageItemsByID).length;

      // Remove the message
      await instance.messaging.removeMessages(["item-remove-test-msg"]);

      // Verify message and its items are removed
      state = store.getState();
      expect(state.allMessagesByID["item-remove-test-msg"]).toBeUndefined();

      const finalItems = Object.values(state.allMessageItemsByID);
      const remainingItemsForMessage = finalItems.filter(
        (item) => item.fullMessageID === "item-remove-test-msg",
      );
      expect(remainingItemsForMessage.length).toBe(0);

      const finalItemCount = Object.keys(state.allMessageItemsByID).length;
      expect(finalItemCount).toBeLessThan(initialItemCount);
    });

    it("should update message order arrays in Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add messages in specific order
      await instance.messaging.addMessage({
        id: "order-msg-1",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "First message",
            },
          ],
        },
      });

      await instance.messaging.addMessage({
        id: "order-msg-2",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Second message",
            },
          ],
        },
      });

      await instance.messaging.addMessage({
        id: "order-msg-3",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Third message",
            },
          ],
        },
      });

      // Get initial order
      let state = store.getState();
      const initialMessageIDs = [...state.assistantMessageState.messageIDs];
      const initialLocalIDs = [...state.assistantMessageState.localMessageIDs];

      expect(initialMessageIDs.includes("order-msg-2")).toBe(true);

      // Remove middle message
      await instance.messaging.removeMessages(["order-msg-2"]);

      // Verify order arrays are updated
      state = store.getState();
      const finalMessageIDs = state.assistantMessageState.messageIDs;
      const finalLocalIDs = state.assistantMessageState.localMessageIDs;

      expect(finalMessageIDs.includes("order-msg-2")).toBe(false);
      expect(finalMessageIDs.includes("order-msg-1")).toBe(true);
      expect(finalMessageIDs.includes("order-msg-3")).toBe(true);

      expect(finalMessageIDs.length).toBeLessThan(initialMessageIDs.length);
      expect(finalLocalIDs.length).toBeLessThan(initialLocalIDs.length);
    });

    it("should handle removing non-existent message IDs gracefully", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add one real message
      await instance.messaging.addMessage({
        id: "real-message",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Real message",
            },
          ],
        },
      });

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID,
      ).length;

      // Try to remove non-existent messages
      await expect(
        instance.messaging.removeMessages(["non-existent-1", "non-existent-2"]),
      ).resolves.not.toThrow();

      // Verify state is unchanged
      const finalState = store.getState();
      const finalMessageCount = Object.keys(finalState.allMessagesByID).length;

      expect(finalMessageCount).toBe(initialMessageCount);
      expect(finalState.allMessagesByID["real-message"]).toBeDefined();
    });

    it("should handle mixed valid and invalid message IDs", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add some messages
      await instance.messaging.addMessage({
        id: "valid-msg-1",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Valid message 1",
            },
          ],
        },
      });

      await instance.messaging.addMessage({
        id: "valid-msg-2",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Valid message 2",
            },
          ],
        },
      });

      // Remove mix of valid and invalid IDs
      await instance.messaging.removeMessages([
        "valid-msg-1",
        "non-existent-msg",
        "valid-msg-2",
        "another-fake-msg",
      ]);

      // Verify only valid messages were removed
      const state = store.getState();
      expect(state.allMessagesByID["valid-msg-1"]).toBeUndefined();
      expect(state.allMessagesByID["valid-msg-2"]).toBeUndefined();
    });

    it("should handle empty message ID array", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add a message
      await instance.messaging.addMessage({
        id: "unchanged-message",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "This should remain",
            },
          ],
        },
      });

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID,
      ).length;

      // Remove empty array
      await expect(
        instance.messaging.removeMessages([]),
      ).resolves.not.toThrow();

      // Verify state is unchanged
      const finalState = store.getState();
      const finalMessageCount = Object.keys(finalState.allMessagesByID).length;

      expect(finalMessageCount).toBe(initialMessageCount);
      expect(finalState.allMessagesByID["unchanged-message"]).toBeDefined();
    });

    it("should preserve other Redux state when removing messages", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add a message
      await instance.messaging.addMessage({
        id: "state-preserve-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Message to remove",
            },
          ],
        },
      });

      // Get initial non-message state
      const initialState = store.getState();
      const initialHumanAgentState = { ...initialState.humanAgentState };
      const initialIsHydrated = initialState.isHydrated;
      const initialAssistantName = initialState.config.public.assistantName;

      // Remove the message
      await instance.messaging.removeMessages(["state-preserve-msg"]);

      // Verify other state is preserved
      const finalState = store.getState();
      expect(finalState.humanAgentState.isConnecting).toBe(
        initialHumanAgentState.isConnecting,
      );
      expect(finalState.humanAgentState.isReconnecting).toBe(
        initialHumanAgentState.isReconnecting,
      );
      expect(finalState.isHydrated).toBe(initialIsHydrated);
      expect(finalState.config.public.assistantName).toBe(initialAssistantName);
    });
  });

  describe("Behavior verification", () => {
    it("should allow adding messages after removing messages", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add initial message
      await instance.messaging.addMessage({
        id: "remove-then-add-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Will be removed",
            },
          ],
        },
      });

      // Remove the message
      await instance.messaging.removeMessages(["remove-then-add-msg"]);

      // Verify message is removed
      let state = store.getState();
      expect(state.allMessagesByID["remove-then-add-msg"]).toBeUndefined();

      // Add new message
      await instance.messaging.addMessage({
        id: "new-after-remove-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Added after removal",
            },
          ],
        },
      });

      // Verify new message exists
      state = store.getState();
      expect(state.allMessagesByID["new-after-remove-msg"]).toBeDefined();
      expect(state.allMessagesByID["remove-then-add-msg"]).toBeUndefined();
    });

    it("should handle multiple remove operations", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add several messages
      await instance.messaging.addMessage({
        id: "multi-remove-1",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "First batch message 1",
            },
          ],
        },
      });

      await instance.messaging.addMessage({
        id: "multi-remove-2",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "First batch message 2",
            },
          ],
        },
      });

      await instance.messaging.addMessage({
        id: "multi-remove-3",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Second batch message",
            },
          ],
        },
      });

      // First removal
      await instance.messaging.removeMessages([
        "multi-remove-1",
        "multi-remove-2",
      ]);

      let state = store.getState();
      expect(state.allMessagesByID["multi-remove-1"]).toBeUndefined();
      expect(state.allMessagesByID["multi-remove-2"]).toBeUndefined();
      expect(state.allMessagesByID["multi-remove-3"]).toBeDefined();

      // Second removal
      await instance.messaging.removeMessages(["multi-remove-3"]);

      state = store.getState();
      expect(state.allMessagesByID["multi-remove-3"]).toBeUndefined();
    });

    it("should be resilient to removing the same message ID multiple times", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add a message
      await instance.messaging.addMessage({
        id: "duplicate-remove-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Message to remove multiple times",
            },
          ],
        },
      });

      // First removal
      await instance.messaging.removeMessages(["duplicate-remove-msg"]);

      let state = store.getState();
      expect(state.allMessagesByID["duplicate-remove-msg"]).toBeUndefined();

      // Second removal of same ID (should not throw)
      await expect(
        instance.messaging.removeMessages(["duplicate-remove-msg"]),
      ).resolves.not.toThrow();

      // Third removal with duplicate IDs in same call
      await expect(
        instance.messaging.removeMessages([
          "duplicate-remove-msg",
          "duplicate-remove-msg",
          "duplicate-remove-msg",
        ]),
      ).resolves.not.toThrow();

      state = store.getState();
      expect(state.allMessagesByID["duplicate-remove-msg"]).toBeUndefined();
    });
  });
});
