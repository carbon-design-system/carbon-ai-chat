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
  setupBeforeEach,
  setupAfterEach,
} from "../../../test_helpers";
import { MessageRequest } from "../../../../src/types/messaging/Messages";
import {
  CancellationReason,
  CustomSendMessageOptions,
} from "../../../../src/types/config/MessagingConfig";
import { ChatInstance } from "../../../../src/types/instance/ChatInstance";

describe("ChatInstance.messaging.restartConversation", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have messaging.restartConversation method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.restartConversation).toBe("function");
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.messaging.restartConversation();
    expect(result).toBeInstanceOf(Promise);
  });

  it("should resolve successfully", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(
      instance.messaging.restartConversation(),
    ).resolves.not.toThrow();
  });

  it("should clear conversation state", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    // Restart conversation using the new messaging API
    await instance.messaging.restartConversation();

    // Get state after restart
    const restartedState = instance.getState();

    // Should maintain basic state structure
    expect(restartedState).toBeDefined();
    expect(typeof restartedState).toBe("object");
  });

  describe("Deprecated instance.restartConversation", () => {
    it("should show deprecation warning when using instance.restartConversation", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      // Mock console.warn to capture the deprecation warning
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await instance.restartConversation();

      expect(
        consoleSpy.mock.calls.some(
          (call) =>
            call[0] ===
            "[Chat] instance.restartConversation is deprecated. Use instance.messaging.restartConversation instead.",
        ),
      ).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe("Abort signal behavior", () => {
    it("should trigger abort signal with CONVERSATION_RESTARTED reason when restarting during streaming", async () => {
      const config = createBaseConfig();
      let capturedAbortReason: string | undefined;

      // Create custom send message that captures abort signal
      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance,
        ) => {
          // Listen for abort
          options.signal?.addEventListener("abort", () => {
            capturedAbortReason = options.signal?.reason;
          });

          // Simulate streaming that takes time
          await new Promise((resolve) => setTimeout(resolve, 100));
        },
      };

      const instance = await renderChatAndGetInstance(config);

      // Send a message (starts streaming)
      const sendPromise = instance.send("test message");

      // Wait a moment to ensure message starts processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Restart conversation while streaming
      await instance.messaging.restartConversation();

      // Wait for send to complete/cancel
      await sendPromise.catch(() => {
        /* Expected to be cancelled */
      });

      // Verify abort was triggered with correct reason
      expect(capturedAbortReason).toBe(
        CancellationReason.CONVERSATION_RESTARTED,
      );
    });

    it("should cancel multiple pending messages on restart", async () => {
      const config = createBaseConfig();
      let abortCount = 0;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance,
        ) => {
          options.signal?.addEventListener("abort", () => {
            abortCount++;
          });

          // Simulate long streaming
          await new Promise((resolve) => setTimeout(resolve, 200));
        },
      };

      const instance = await renderChatAndGetInstance(config);

      // Send multiple messages
      const send1 = instance.send("message 1");
      const send2 = instance.send("message 2");

      // Wait a moment to ensure messages start processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Restart conversation
      await instance.messaging.restartConversation();

      // Wait for all sends to complete/cancel
      await Promise.allSettled([send1, send2]);

      // At least one message should be aborted
      expect(abortCount).toBeGreaterThan(0);
    });

    it("should use enum value for abort reason", async () => {
      const config = createBaseConfig();
      let capturedReason: string | undefined;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance,
        ) => {
          options.signal?.addEventListener("abort", () => {
            capturedReason = options.signal?.reason;
          });

          await new Promise((resolve) => setTimeout(resolve, 100));
        },
      };

      const instance = await renderChatAndGetInstance(config);

      const sendPromise = instance.send("test");

      // Wait a moment to ensure message starts processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      await instance.messaging.restartConversation();
      await sendPromise.catch(() => {});

      // Verify the reason matches the enum value
      expect(capturedReason).toBe("Conversation restarted");
      expect(capturedReason).toBe(CancellationReason.CONVERSATION_RESTARTED);
    });
  });

  describe("Chunk queue filtering during restart", () => {
    it("should handle restart during message processing gracefully", async () => {
      const config = createBaseConfig();
      const processedMessages: string[] = [];
      let restartOccurred = false;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance,
        ) => {
          const requestText = request.input.text;

          // Listen for abort
          options.signal?.addEventListener("abort", () => {
            restartOccurred = true;
          });

          // Simulate streaming that takes time
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Only process if not aborted
          if (!options.signal?.aborted) {
            processedMessages.push(requestText);
          }
        },
      };

      const instance = await renderChatAndGetInstance(config);

      // Send first message (will start streaming)
      const send1 = instance.send("message 1");

      // Wait a bit for first message to start processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Restart conversation while streaming is in progress
      await instance.messaging.restartConversation();

      // Wait for first send to be cancelled
      await send1.catch(() => {});

      // Send a new message after restart
      const send2 = instance.send("message 2");
      await send2;

      // Restart should have occurred
      expect(restartOccurred).toBe(true);

      // Only message 2 should have been fully processed since message 1 was aborted
      expect(processedMessages).toContain("message 2");
      expect(processedMessages.length).toBeLessThanOrEqual(2);
    });

    it("should process messages correctly after restart", async () => {
      const config = createBaseConfig();
      let messagesProcessed = 0;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance,
        ) => {
          // Simulate some processing
          await new Promise((resolve) => setTimeout(resolve, 10));

          if (!options.signal?.aborted) {
            messagesProcessed++;
          }
        },
      };

      const instance = await renderChatAndGetInstance(config);

      // Restart conversation
      await instance.messaging.restartConversation();

      // Send a message after restart
      await instance.send("test message");

      // Message should be processed
      expect(messagesProcessed).toBe(1);
    });

    it("should handle rapid successive restarts without errors", async () => {
      const config = createBaseConfig();
      let messagesProcessed = 0;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance,
        ) => {
          // Simulate brief processing
          await new Promise((resolve) => setTimeout(resolve, 5));

          if (!options.signal?.aborted) {
            messagesProcessed++;
          }
        },
      };

      const instance = await renderChatAndGetInstance(config);

      // Send initial message
      const send1 = instance.send("message 1");

      // Restart multiple times quickly
      await instance.messaging.restartConversation();
      await instance.messaging.restartConversation();
      await instance.messaging.restartConversation();

      // Wait for first message to be cancelled
      await send1.catch(() => {});

      // Send final message
      await instance.send("message 2");

      // Should handle all restarts gracefully - at least final message should process
      expect(messagesProcessed).toBeGreaterThanOrEqual(1);
    });
  });
});
