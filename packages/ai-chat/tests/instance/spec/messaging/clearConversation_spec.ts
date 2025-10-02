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
import { MessageResponseTypes } from "../../../../src/types/messaging/Messages";

describe("ChatInstance.messaging.clearConversation", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have clearConversation method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.clearConversation).toBe("function");
  });

  it("should execute without parameters", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(instance.messaging.clearConversation()).resolves.not.toThrow();
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.messaging.clearConversation();
    expect(result).toBeInstanceOf(Promise);
  });

  describe("Redux state management", () => {
    it("should clear all messages from Redux state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add some messages first
      await instance.messaging.addMessage({
        id: "test-msg-1",
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
        id: "test-msg-2",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Second message",
            },
          ],
        },
      });

      // Verify messages were added
      let state = store.getState();
      const messageCountBeforeClear = Object.keys(state.allMessagesByID).length;
      const itemCountBeforeClear = Object.keys(
        state.allMessageItemsByID,
      ).length;
      const botMessageIDsBeforeClear =
        state.assistantMessageState.messageIDs.length;
      const botLocalIDsBeforeClear =
        state.assistantMessageState.localMessageIDs.length;

      expect(messageCountBeforeClear).toBeGreaterThan(0);
      expect(itemCountBeforeClear).toBeGreaterThan(0);
      expect(botMessageIDsBeforeClear).toBeGreaterThan(0);
      expect(botLocalIDsBeforeClear).toBeGreaterThan(0);

      // Clear conversation
      await instance.messaging.clearConversation();

      // Verify all messages are cleared
      state = store.getState();
      const messageCountAfterClear = Object.keys(state.allMessagesByID).length;
      const itemCountAfterClear = Object.keys(state.allMessageItemsByID).length;
      const botMessageIDsAfterClear =
        state.assistantMessageState.messageIDs.length;
      const botLocalIDsAfterClear =
        state.assistantMessageState.localMessageIDs.length;

      expect(messageCountAfterClear).toBe(0);
      expect(itemCountAfterClear).toBe(0);
      expect(botMessageIDsAfterClear).toBe(0);
      expect(botLocalIDsAfterClear).toBe(0);
    });

    it("should reset conversation state to initial values", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add some messages and modify state
      await instance.messaging.addMessage({
        id: "state-test-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "State test message",
            },
          ],
        },
      });

      // Verify state has changed
      let state = store.getState();
      expect(Object.keys(state.allMessagesByID).length).toBeGreaterThan(0);

      // Clear conversation
      await instance.messaging.clearConversation();

      // Verify state is reset
      state = store.getState();

      // Message collections should be empty
      expect(Object.keys(state.allMessagesByID)).toHaveLength(0);
      expect(Object.keys(state.allMessageItemsByID)).toHaveLength(0);
      expect(state.assistantMessageState.messageIDs).toHaveLength(0);
      expect(state.assistantMessageState.localMessageIDs).toHaveLength(0);

      // Loading states should be reset
      expect(state.assistantMessageState.isMessageLoadingCounter).toBe(0);
      expect(state.assistantMessageState.isHydratingCounter).toBe(0);

      // Scroll state should be reset to default
      expect(state.assistantMessageState.isScrollAnchored).toBe(false);
    });

    it("should handle multiple calls to clearConversation", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add messages
      await instance.messaging.addMessage({
        id: "multi-clear-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Multi clear test",
            },
          ],
        },
      });

      // First clear
      await instance.messaging.clearConversation();

      let state = store.getState();
      expect(Object.keys(state.allMessagesByID)).toHaveLength(0);

      // Second clear (should not throw)
      await expect(
        instance.messaging.clearConversation(),
      ).resolves.not.toThrow();

      // Third clear with no state changes
      await instance.messaging.clearConversation();

      state = store.getState();
      expect(Object.keys(state.allMessagesByID)).toHaveLength(0);
      expect(Object.keys(state.allMessageItemsByID)).toHaveLength(0);
    });

    it("should clear conversation without affecting human agent state", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Get initial human agent state
      const initialState = store.getState();
      const initialHumanAgentState = { ...initialState.humanAgentState };

      // Add messages
      await instance.messaging.addMessage({
        id: "agent-test-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Agent test message",
            },
          ],
        },
      });

      // Clear conversation
      await instance.messaging.clearConversation();

      // Verify human agent state is preserved
      const finalState = store.getState();
      expect(finalState.humanAgentState.isConnecting).toBe(
        initialHumanAgentState.isConnecting,
      );
      expect(finalState.humanAgentState.isReconnecting).toBe(
        initialHumanAgentState.isReconnecting,
      );
      expect(finalState.humanAgentState.numUnreadMessages).toBe(
        initialHumanAgentState.numUnreadMessages,
      );
    });

    it("should work correctly when called with no existing messages", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Get initial empty state
      const initialState = store.getState();
      const initialMessageCount = Object.keys(
        initialState.allMessagesByID,
      ).length;
      const initialItemCount = Object.keys(
        initialState.allMessageItemsByID,
      ).length;

      // Clear conversation on empty state
      await instance.messaging.clearConversation();

      // Verify state remains the same
      const finalState = store.getState();
      const finalMessageCount = Object.keys(finalState.allMessagesByID).length;
      const finalItemCount = Object.keys(finalState.allMessageItemsByID).length;

      expect(finalMessageCount).toBe(initialMessageCount);
      expect(finalItemCount).toBe(initialItemCount);
      expect(finalState.assistantMessageState.messageIDs).toHaveLength(0);
      expect(finalState.assistantMessageState.localMessageIDs).toHaveLength(0);
    });
  });

  describe("Behavior verification", () => {
    it("should not fire restart conversation events", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      let preRestartEventFired = false;
      let restartEventFired = false;

      // Set up event listeners to verify events are NOT fired
      instance.on([
        {
          type: "pre:restartConversation" as any,
          handler: () => {
            preRestartEventFired = true;
          },
        },
        {
          type: "restartConversation" as any,
          handler: () => {
            restartEventFired = true;
          },
        },
      ]);

      // Clear conversation
      await instance.messaging.clearConversation();

      // Give time for any potential events
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify no events were fired (since clearConversation calls restartConversation with fireEvents: false)
      expect(preRestartEventFired).toBe(false);
      expect(restartEventFired).toBe(false);
    });

    it("should allow adding messages after clearing conversation", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add initial message
      await instance.messaging.addMessage({
        id: "pre-clear-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Before clear",
            },
          ],
        },
      });

      // Clear conversation
      await instance.messaging.clearConversation();

      // Verify cleared state
      let state = store.getState();
      expect(Object.keys(state.allMessagesByID)).toHaveLength(0);

      // Add new message after clear
      await instance.messaging.addMessage({
        id: "post-clear-msg",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "After clear",
            },
          ],
        },
      });

      // Verify new message was added
      state = store.getState();
      expect(Object.keys(state.allMessagesByID).length).toBeGreaterThan(0);
      expect(state.allMessagesByID["post-clear-msg"]).toBeDefined();
      expect(state.allMessagesByID["pre-clear-msg"]).toBeUndefined();
    });
  });
});
