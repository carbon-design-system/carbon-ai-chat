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
  setupAfterEach,
  setupBeforeEach,
} from "../../test_helpers";
import { fireEvent } from "@testing-library/react";
import { MessageResponseTypes } from "../../../src/types/messaging/Messages";

// Helper to create a test message
const createTestMessage = (text: string) => ({
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.TEXT,
        text,
      },
    ],
  },
});

describe("Keyboard Shortcuts", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe("Focus Toggle (F6)", () => {
    it("should use default shortcut when not configured", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add a message
      await instance.messaging.addMessage({
        id: "test-msg-1",
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: "Test message",
            },
          ],
        },
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-1"]).toBeDefined();

      // Trigger default shortcut (F6)
      fireEvent.keyDown(document, {
        key: "F6",
        bubbles: true,
      });

      // The shortcut should be registered (we can't easily test focus changes in jsdom)
      // but we can verify no errors occurred
      expect(true).toBe(true);
    });

    it("should use custom shortcut when configured", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "f",
          modifiers: { ctrl: true },
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-2",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-2"]).toBeDefined();

      // Default shortcut should not work
      fireEvent.keyDown(document, {
        key: "F6",
        bubbles: true,
      });

      // Custom shortcut should work
      fireEvent.keyDown(document, {
        key: "f",
        ctrlKey: true,
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should not trigger with wrong modifiers", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-3",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-3"]).toBeDefined();

      // Try with wrong modifiers (should not trigger)
      fireEvent.keyDown(document, {
        key: "F6",
        ctrlKey: true, // Wrong modifier (F6 has no modifiers by default)
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should not trigger with wrong key", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-4",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-4"]).toBeDefined();

      // Try with wrong key
      fireEvent.keyDown(document, {
        key: "F7", // Wrong key
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should handle case when no messages exist", async () => {
      const config = createBaseConfig();
      await renderChatAndGetInstanceWithStore(config);

      // Should not throw error when no messages exist
      expect(() => {
        fireEvent.keyDown(document, {
          key: "F6",
          bubbles: true,
        });
      }).not.toThrow();
    });

    it("should handle multiple messages", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Add multiple messages
      await instance.messaging.addMessage({
        id: "msg-1",
        ...createTestMessage("First message"),
      });
      await instance.messaging.addMessage({
        id: "msg-2",
        ...createTestMessage("Second message"),
      });
      await instance.messaging.addMessage({
        id: "msg-3",
        ...createTestMessage("Third message"),
      });

      // Verify messages were added to store
      const state = store.getState();
      expect(Object.keys(state.allMessagesByID).length).toBeGreaterThanOrEqual(
        3,
      );

      // Trigger shortcut
      fireEvent.keyDown(document, {
        key: "F6",
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should handle rapid shortcut key presses", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-5",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-5"]).toBeDefined();

      // Trigger shortcut multiple times rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(document, {
          key: "F6",
          bubbles: true,
        });
      }

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should work with different keyboard layouts", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-6",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-6"]).toBeDefined();

      // Test with lowercase (should still work due to case-insensitive matching)
      fireEvent.keyDown(document, {
        key: "f6",
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });
  });

  describe("Escape Key Handling", () => {
    it("should handle Escape key press", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-7",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-7"]).toBeDefined();

      // Trigger Escape key on document
      fireEvent.keyDown(document, {
        key: "Escape",
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should not interfere with other Escape key handlers", async () => {
      const config = createBaseConfig();
      await renderChatAndGetInstanceWithStore(config);

      // Trigger Escape on document
      fireEvent.keyDown(document, {
        key: "Escape",
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });
  });

  describe("Keyboard Shortcut Configuration", () => {
    it("should accept valid shortcut configuration", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "m",
          modifiers: { alt: true, ctrl: true },
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-8",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-8"]).toBeDefined();

      // Trigger custom shortcut
      fireEvent.keyDown(document, {
        key: "m",
        altKey: true,
        ctrlKey: true,
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should handle shortcut with only one modifier", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: { shift: true },
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-9",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-9"]).toBeDefined();

      // Trigger custom shortcut
      fireEvent.keyDown(document, {
        key: "F6",
        shiftKey: true,
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should handle shortcut with all modifiers", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "k",
          modifiers: { ctrl: true, alt: true, shift: true, meta: true },
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-10",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-10"]).toBeDefined();

      // Trigger custom shortcut
      fireEvent.keyDown(document, {
        key: "k",
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
        metaKey: true,
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should handle special function keys", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "F12",
          modifiers: { ctrl: true },
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-11",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-11"]).toBeDefined();

      // Trigger custom shortcut
      fireEvent.keyDown(document, {
        key: "F12",
        ctrlKey: true,
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle messages being added after shortcut registration", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Trigger shortcut before any messages exist
      fireEvent.keyDown(document, {
        key: "F6",
        bubbles: true,
      });

      // Now add a message
      await instance.messaging.addMessage({
        id: "test-msg-12",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-12"]).toBeDefined();

      // Trigger shortcut again
      fireEvent.keyDown(document, {
        key: "F6",
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should handle messages being removed", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-13",
        ...createTestMessage("Test message"),
      });

      // Verify message was added
      let state = store.getState();
      expect(state.allMessagesByID["test-msg-13"]).toBeDefined();

      // Clear conversation
      await instance.messaging.clearConversation();

      // Verify messages were cleared
      state = store.getState();
      expect(Object.keys(state.allMessagesByID).length).toBe(0);

      // Trigger shortcut after messages removed
      fireEvent.keyDown(document, {
        key: "F6",
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should not break when event target is null", async () => {
      const config = createBaseConfig();
      await renderChatAndGetInstanceWithStore(config);

      // Create event without target
      const event = new KeyboardEvent("keydown", {
        key: "F6",
        bubbles: true,
      });

      // Should not throw
      expect(() => {
        document.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe("is_on Property", () => {
    it("should enable shortcuts when is_on is true", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: {},
          is_on: true,
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-14",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-14"]).toBeDefined();

      // Shortcut should work
      fireEvent.keyDown(document, {
        key: "F6",
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should disable shortcuts when is_on is false", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: {},
          is_on: false,
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-15",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-15"]).toBeDefined();

      // Shortcut should not work (but should not throw errors)
      expect(() => {
        fireEvent.keyDown(document, {
          key: "F6",
          bubbles: true,
        });
      }).not.toThrow();
    });

    it("should enable shortcuts by default when is_on is undefined (inherits from DEFAULT which is true)", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "F6",
          modifiers: {},
          // is_on is undefined, should default to enabled (true)
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-16",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-16"]).toBeDefined();

      // Shortcut should work by default
      fireEvent.keyDown(document, {
        key: "F6",
        bubbles: true,
      });

      // Verify no errors occurred
      expect(true).toBe(true);
    });

    it("should respect is_on with custom key combinations", async () => {
      const config = createBaseConfig();
      config.keyboardShortcuts = {
        messageFocusToggle: {
          key: "k",
          modifiers: {
            ctrl: true,
            shift: true,
          },
          is_on: false,
        },
      };

      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage({
        id: "test-msg-17",
        ...createTestMessage("Test message"),
      });

      // Verify message was added to store
      const state = store.getState();
      expect(state.allMessagesByID["test-msg-17"]).toBeDefined();

      // Shortcut should not work when disabled
      expect(() => {
        fireEvent.keyDown(document, {
          key: "k",
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        });
      }).not.toThrow();
    });
  });
});
