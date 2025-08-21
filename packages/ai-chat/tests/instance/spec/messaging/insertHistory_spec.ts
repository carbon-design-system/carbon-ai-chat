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
} from "../../helpers/chatInstanceTestHelpers";
import { BusEventType } from "../../../../src/types/events/eventBusTypes";
import { MessageResponseTypes } from "../../../../src/types/messaging/Messages";
import { HistoryItem } from "../../../../src/types/messaging/History";

describe("ChatInstance.messaging.insertHistory", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have insertHistory method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.insertHistory).toBe("function");
  });

  it("should accept array of history items", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const historyItems: HistoryItem[] = [
      {
        message: {
          id: "hist-1",
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: "Bot response",
              },
            ],
          },
        },
        time: "2024-01-01T00:00:00.000Z",
      },
    ];

    await expect(
      instance.messaging.insertHistory(historyItems),
    ).resolves.not.toThrow();
  });

  it("should accept empty history array", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(instance.messaging.insertHistory([])).resolves.not.toThrow();
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.messaging.insertHistory([]);
    expect(result).toBeInstanceOf(Promise);
  });

  describe("Redux state updates", () => {
    it("should add history messages to allMessagesByID in Redux store", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const historyItems: HistoryItem[] = [
        {
          message: {
            id: "history-msg-1",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "First bot response",
                },
              ],
            },
          },
          time: "2024-01-01T00:00:00.000Z",
        },
        {
          message: {
            id: "history-msg-2",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "Second bot response",
                },
              ],
            },
          },
          time: "2024-01-01T00:01:00.000Z",
        },
      ];

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID,
      ).length;

      await instance.messaging.insertHistory(historyItems);

      const updatedState = store.getState();
      const updatedMessageCount = Object.keys(
        updatedState.allMessagesByID,
      ).length;

      // Should have added both request and response messages
      expect(updatedMessageCount).toBeGreaterThan(initialMessageCount);

      // Check specific messages exist
      expect(updatedState.allMessagesByID["history-msg-1"]).toBeDefined();
      expect(updatedState.allMessagesByID["history-msg-2"]).toBeDefined();
    });

    it("should add history message items to allMessageItemsByID", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const historyItems: HistoryItem[] = [
        {
          message: {
            id: "history-item-1",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "Test history response",
                },
              ],
            },
          },
          time: "2024-01-01T00:00:00.000Z",
        },
      ];

      const initialState = store.getState();
      const initialItemCount = Object.keys(
        initialState.allMessageItemsByID,
      ).length;

      await instance.messaging.insertHistory(historyItems);

      const updatedState = store.getState();
      const updatedItemCount = Object.keys(
        updatedState.allMessageItemsByID,
      ).length;

      expect(updatedItemCount).toBeGreaterThan(initialItemCount);

      // Find message items related to our history
      const messageItems = Object.values(updatedState.allMessageItemsByID);
      const historyMessageItems = messageItems.filter(
        (item) => item.fullMessageID === "history-item-1",
      );

      expect(historyMessageItems.length).toBeGreaterThan(0);
    });

    it("should maintain message order (history messages before current)", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // First add a current message
      await instance.messaging.addMessage({
        id: "current-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Current message",
            },
          ],
        },
      });

      const stateAfterCurrent = store.getState();
      const currentMessageIDs = [
        ...stateAfterCurrent.botMessageState.messageIDs,
      ];
      const currentLocalIDs = [
        ...stateAfterCurrent.botMessageState.localMessageIDs,
      ];

      // Then insert history
      const historyItems: HistoryItem[] = [
        {
          message: {
            id: "history-old-msg",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "Old bot response",
                },
              ],
            },
          },
          time: "2024-01-01T00:00:00.000Z",
        },
      ];

      await instance.messaging.insertHistory(historyItems);

      const finalState = store.getState();

      // History message IDs should come before current message IDs
      const finalMessageIDs = finalState.botMessageState.messageIDs;
      const finalLocalIDs = finalState.botMessageState.localMessageIDs;

      expect(finalMessageIDs.length).toBeGreaterThan(currentMessageIDs.length);
      expect(finalLocalIDs.length).toBeGreaterThan(currentLocalIDs.length);

      // Current message IDs should be at the end (preserved order)
      const currentIDsInFinal = finalMessageIDs.slice(
        -currentMessageIDs.length,
      );
      expect(currentIDsInFinal).toEqual(currentMessageIDs);
    });

    it("should handle empty history array without errors", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID,
      ).length;
      const initialItemCount = Object.keys(
        initialState.allMessageItemsByID,
      ).length;

      await instance.messaging.insertHistory([]);

      const updatedState = store.getState();
      const updatedMessageCount = Object.keys(
        updatedState.allMessagesByID,
      ).length;
      const updatedItemCount = Object.keys(
        updatedState.allMessageItemsByID,
      ).length;

      // Should not change state
      expect(updatedMessageCount).toBe(initialMessageCount);
      expect(updatedItemCount).toBe(initialItemCount);
    });

    it("should preserve existing messages when inserting history", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add an existing message first
      await instance.messaging.addMessage({
        id: "existing-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Existing message",
            },
          ],
        },
      });

      const stateAfterExisting = store.getState();
      const existingMessageKeys = Object.keys(
        stateAfterExisting.allMessagesByID,
      );

      // Insert history
      await instance.messaging.insertHistory([
        {
          message: {
            id: "new-history-msg",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "History output",
                },
              ],
            },
          },
          time: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const finalState = store.getState();

      // All existing messages should still be present
      existingMessageKeys.forEach((key) => {
        expect(finalState.allMessagesByID[key]).toBeDefined();
      });

      // New history message should also be present
      expect(finalState.allMessagesByID["new-history-msg"]).toBeDefined();
    });
  });

  describe("Event bus integration", () => {
    it("should fire history:begin and history:end events", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const historyBeginHandler = jest.fn();
      const historyEndHandler = jest.fn();

      instance.on([
        { type: BusEventType.HISTORY_BEGIN, handler: historyBeginHandler },
        { type: BusEventType.HISTORY_END, handler: historyEndHandler },
      ]);

      const historyItems: HistoryItem[] = [
        {
          message: {
            id: "event-test-msg",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "Event test output",
                },
              ],
            },
          },
          time: "2024-01-01T00:00:00.000Z",
        },
      ];

      await instance.messaging.insertHistory(historyItems);

      expect(historyBeginHandler).toHaveBeenCalledTimes(1);
      expect(historyEndHandler).toHaveBeenCalledTimes(1);

      // Verify event data structure
      const beginCall = historyBeginHandler.mock.calls[0][0];
      const endCall = historyEndHandler.mock.calls[0][0];

      expect(beginCall.type).toBe(BusEventType.HISTORY_BEGIN);
      expect(beginCall.messages).toBeDefined();

      expect(endCall.type).toBe(BusEventType.HISTORY_END);
      expect(endCall.messages).toBeDefined();
    });

    it("should fire events in correct order (begin before end)", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const eventOrder: string[] = [];

      const historyBeginHandler = jest.fn(() => {
        eventOrder.push("history:begin");
      });

      const historyEndHandler = jest.fn(() => {
        eventOrder.push("history:end");
      });

      instance.on([
        { type: BusEventType.HISTORY_BEGIN, handler: historyBeginHandler },
        { type: BusEventType.HISTORY_END, handler: historyEndHandler },
      ]);

      await instance.messaging.insertHistory([
        {
          message: {
            id: "order-test-msg",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "Order test response",
                },
              ],
            },
          },
          time: "2024-01-01T00:00:00.000Z",
        },
      ]);

      expect(eventOrder).toEqual(["history:begin", "history:end"]);
    });

    it("should not fire events for empty history", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const historyBeginHandler = jest.fn();
      const historyEndHandler = jest.fn();

      instance.on([
        { type: BusEventType.HISTORY_BEGIN, handler: historyBeginHandler },
        { type: BusEventType.HISTORY_END, handler: historyEndHandler },
      ]);

      await instance.messaging.insertHistory([]);

      // No events should be fired when there's no actual history
      expect(historyBeginHandler).toHaveBeenCalledTimes(0);
      expect(historyEndHandler).toHaveBeenCalledTimes(0);
    });

    it("should include history data in events", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const historyBeginHandler = jest.fn();
      const historyEndHandler = jest.fn();

      instance.on([
        { type: BusEventType.HISTORY_BEGIN, handler: historyBeginHandler },
        { type: BusEventType.HISTORY_END, handler: historyEndHandler },
      ]);

      const historyItems: HistoryItem[] = [
        {
          message: {
            id: "data-test-msg",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "Data test output",
                },
              ],
            },
          },
          time: "2024-01-01T00:00:00.000Z",
        },
      ];

      await instance.messaging.insertHistory(historyItems);

      const beginCall = historyBeginHandler.mock.calls[0][0];
      const endCall = historyEndHandler.mock.calls[0][0];

      // Events should contain the history messages
      expect(beginCall.messages).toBeDefined();
      expect(endCall.messages).toBeDefined();

      // The messages should contain information about the history being loaded
      expect(Array.isArray(beginCall.messages)).toBe(true);
      expect(Array.isArray(endCall.messages)).toBe(true);
    });

    it("should handle multiple history insertions", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const historyBeginHandler = jest.fn();
      const historyEndHandler = jest.fn();

      instance.on([
        { type: BusEventType.HISTORY_BEGIN, handler: historyBeginHandler },
        { type: BusEventType.HISTORY_END, handler: historyEndHandler },
      ]);

      // Insert first batch
      await instance.messaging.insertHistory([
        {
          message: {
            id: "multi-test-msg-1",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "First response",
                },
              ],
            },
          },
          time: "2024-01-01T00:00:00.000Z",
        },
      ]);

      // Insert second batch
      await instance.messaging.insertHistory([
        {
          message: {
            id: "multi-test-msg-2",
            output: {
              generic: [
                {
                  response_type: MessageResponseTypes.TEXT,
                  text: "Second response",
                },
              ],
            },
          },
          time: "2024-01-01T00:01:00.000Z",
        },
      ]);

      // Each insertion should fire both events
      expect(historyBeginHandler).toHaveBeenCalledTimes(2);
      expect(historyEndHandler).toHaveBeenCalledTimes(2);
    });
  });
});
