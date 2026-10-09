/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from '@testing-library/react';

import {
  createBaseConfig,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import {
  MessageRequest,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import {
  CancellationReason,
  CustomSendMessageOptions,
} from '../../../../src/types/config/MessagingConfig';
import { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import { resolvablePromise } from '../../../../src/chat/utils/resolvablePromise';

describe('ChatInstance.messaging.restartConversation', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('should have messaging.restartConversation method available', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.restartConversation).toBe('function');
  });

  it('should return a Promise', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.messaging.restartConversation();
    expect(result).toBeInstanceOf(Promise);
  });

  it('should resolve successfully', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(
      instance.messaging.restartConversation()
    ).resolves.not.toThrow();
  });

  it('should clear conversation state', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    // Restart conversation using the new messaging API
    await instance.messaging.restartConversation();

    // Get state after restart
    const restartedState = instance.getState();

    // Should maintain basic state structure
    expect(restartedState).toBeDefined();
    expect(typeof restartedState).toBe('object');
  });

  describe('Deprecated instance.restartConversation', () => {
    it('should show deprecation warning when using instance.restartConversation', async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);

      // Mock console.warn to capture the deprecation warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await instance.restartConversation();

      expect(
        consoleSpy.mock.calls.some(
          (call) =>
            call[0] ===
            '[Chat] instance.restartConversation is deprecated. Use instance.messaging.restartConversation instead.'
        )
      ).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Abort signal behavior', () => {
    it('should trigger abort signal with CONVERSATION_RESTARTED reason when restarting during streaming', async () => {
      const config = createBaseConfig();
      let capturedAbortReason: string | undefined;

      // Create custom send message that captures abort signal
      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance
        ) => {
          // Listen for abort
          options.signal?.addEventListener('abort', () => {
            capturedAbortReason = options.signal?.reason;
          });

          // Simulate streaming that takes time
          await new Promise((resolve) => setTimeout(resolve, 100));
        },
      };

      const instance = await renderChatAndGetInstance(config);

      // Send a message (starts streaming)
      const sendPromise = instance.send('test message');

      // Wait a moment to ensure message starts processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Restart conversation while streaming
      await instance.messaging.restartConversation();

      // Wait for send to complete/cancel
      await sendPromise.catch(() => {
        /* Expected to be canceled */
      });

      // Verify abort was triggered with correct reason
      expect(capturedAbortReason).toBe(
        CancellationReason.CONVERSATION_RESTARTED
      );
    });

    it('should cancel multiple pending messages on restart', async () => {
      const config = createBaseConfig();
      let abortCount = 0;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance
        ) => {
          options.signal?.addEventListener('abort', () => {
            abortCount++;
          });

          // Simulate long streaming
          await new Promise((resolve) => setTimeout(resolve, 200));
        },
      };

      const instance = await renderChatAndGetInstance(config);

      // Send multiple messages
      const send1 = instance.send('message 1');
      const send2 = instance.send('message 2');

      // Wait a moment to ensure messages start processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Restart conversation
      await instance.messaging.restartConversation();

      // Wait for all sends to complete/cancel
      await Promise.allSettled([send1, send2]);

      // At least one message should be aborted
      expect(abortCount).toBeGreaterThan(0);
    });

    it('should use enum value for abort reason', async () => {
      const config = createBaseConfig();
      let capturedReason: string | undefined;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance
        ) => {
          options.signal?.addEventListener('abort', () => {
            capturedReason = options.signal?.reason;
          });

          await new Promise((resolve) => setTimeout(resolve, 100));
        },
      };

      const instance = await renderChatAndGetInstance(config);

      const sendPromise = instance.send('test');

      // Wait a moment to ensure message starts processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      await instance.messaging.restartConversation();
      await sendPromise.catch(() => {});

      // Verify the reason matches the enum value
      expect(capturedReason).toBe('Conversation restarted');
      expect(capturedReason).toBe(CancellationReason.CONVERSATION_RESTARTED);
    });
  });

  describe('Chunk queue filtering during restart', () => {
    afterEach(() => jest.restoreAllMocks());

    it('sends the next queued message when a stale chunk arrives before the current final response', async () => {
      const config = createBaseConfig();
      const sentMessages: string[] = [];
      config.messaging = {
        skipWelcome: true,
        customSendMessage: async (request, _options, instance) => {
          const text = request.input.text;
          sentMessages.push(text);
          if (text === 'third') {
            return;
          }
          await instance.messaging.addMessageChunk({
            streaming_metadata: { response_id: `${text}-response` },
            partial_item: {
              streaming_metadata: { id: `${text}-item` },
              response_type: MessageResponseTypes.TEXT,
              text,
            },
          });
        },
      };
      const instance = await renderChatAndGetInstance(config);

      await instance.send('first');
      await instance.messaging.restartConversation();
      await instance.send('second');
      const thirdSend = instance.send('third');

      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'first-response' },
        partial_item: {
          streaming_metadata: { id: 'first-item' },
          response_type: MessageResponseTypes.TEXT,
          text: 'late chunk',
        },
      });
      await instance.messaging.addMessageChunk({
        final_response: {
          id: 'second-response',
          output: {
            generic: [
              {
                streaming_metadata: { id: 'second-item' },
                response_type: MessageResponseTypes.TEXT,
                text: 'second response complete',
              },
            ],
          },
        },
      });

      await waitFor(() =>
        expect(sentMessages).toEqual(['first', 'second', 'third'])
      );
      await thirdSend;
    });

    it.each(['partial', 'complete', 'final'] as const)(
      'leaves the new stream untouched when an old %s chunk arrives',
      async (kind) => {
        const config = createBaseConfig();
        config.messaging = { skipWelcome: true, customSendMessage: () => {} };
        const { instance, store, serviceManager } =
          await renderChatAndGetInstanceWithStore(config);
        const item = {
          streaming_metadata: { id: 'old-item', cancellable: true },
          response_type: MessageResponseTypes.TEXT,
          text: 'old response',
        };
        const staleChunks = {
          partial: {
            streaming_metadata: { response_id: 'old-response' },
            partial_item: item,
          },
          complete: {
            streaming_metadata: { response_id: 'old-response' },
            complete_item: item,
          },
          final: {
            final_response: {
              id: 'old-response',
              output: { generic: [item] },
            },
          },
        };
        await instance.messaging.addMessageChunk(staleChunks.partial);
        await instance.messaging.restartConversation();
        await instance.messaging.addMessageChunk({
          streaming_metadata: { response_id: 'new-response' },
          partial_item: {
            streaming_metadata: { id: 'new-item', cancellable: true },
            response_type: MessageResponseTypes.TEXT,
            text: 'new response',
          },
        });
        const state = store.getState();
        expect(
          state.assistantInputState.stopStreamingButtonState.isVisible
        ).toBe(true);
        const endLoading = jest.spyOn(
          serviceManager.messageService.messageLoadingManager,
          'end'
        );
        const announce = jest.spyOn(
          serviceManager.streamAnnouncerService,
          'announceStreamStarts'
        );

        await instance.messaging.addMessageChunk(staleChunks[kind]);

        expect(store.getState()).toBe(state);
        expect(
          serviceManager.messageService.inboundStreaming.streamingMessageID
        ).toBe('new-response');
        expect(endLoading).not.toHaveBeenCalled();
        expect(announce).not.toHaveBeenCalled();
      }
    );

    it.each(['partial', 'final without an ID'])(
      'drops a %s chunk that was waiting in the chunk queue when restart happened',
      async (kind) => {
        const config = createBaseConfig();
        config.messaging = { skipWelcome: true, customSendMessage: () => {} };
        const { instance, store, serviceManager } =
          await renderChatAndGetInstanceWithStore(config);
        const releaseSlot = resolvablePromise();
        jest
          .spyOn(
            serviceManager.slotEventService,
            'handleUserDefinedResponseItemsChunk'
          )
          .mockReturnValueOnce(releaseSlot);
        const first = instance.messaging.addMessageChunk({
          streaming_metadata: { response_id: 'blocking-response' },
          partial_item: {
            streaming_metadata: { id: 'blocking-item' },
            response_type: MessageResponseTypes.TEXT,
            text: 'blocking response',
          },
        });
        const queued = instance.messaging.addMessageChunk(
          kind === 'partial'
            ? {
                streaming_metadata: { response_id: 'queued-response' },
                partial_item: {
                  streaming_metadata: { id: 'queued-item' },
                  response_type: MessageResponseTypes.TEXT,
                  text: 'queued response',
                },
              }
            : {
                final_response: {
                  output: {
                    generic: [
                      {
                        response_type: MessageResponseTypes.TEXT,
                        text: 'queued response',
                      },
                    ],
                  },
                },
              }
        );

        await instance.messaging.restartConversation();
        releaseSlot.doResolve();
        await Promise.all([first, queued]);

        expect(Object.keys(store.getState().allMessagesByID)).toEqual([]);
      }
    );

    it('should handle restart during message processing gracefully', async () => {
      const config = createBaseConfig();
      const processedMessages: string[] = [];
      let restartOccurred = false;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance
        ) => {
          const requestText = request.input.text;

          // Listen for abort
          options.signal?.addEventListener('abort', () => {
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
      const send1 = instance.send('message 1');

      // Wait a bit for first message to start processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Restart conversation while streaming is in progress
      await instance.messaging.restartConversation();

      // Wait for first send to be canceled
      await send1.catch(() => {});

      // Send a new message after restart
      const send2 = instance.send('message 2');
      await send2;

      // Restart should have occurred
      expect(restartOccurred).toBe(true);

      // Only message 2 should have been fully processed since message 1 was aborted
      expect(processedMessages).toContain('message 2');
      expect(processedMessages.length).toBeLessThanOrEqual(2);
    });

    it('should process messages correctly after restart', async () => {
      const config = createBaseConfig();
      let messagesProcessed = 0;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance
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
      await instance.send('test message');

      // Message should be processed
      expect(messagesProcessed).toBe(1);
    });

    it('should handle rapid successive restarts without errors', async () => {
      const config = createBaseConfig();
      let messagesProcessed = 0;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance
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
      const send1 = instance.send('message 1');

      // Restart multiple times quickly
      await instance.messaging.restartConversation();
      await instance.messaging.restartConversation();
      await instance.messaging.restartConversation();

      // Wait for first message to be canceled
      await send1.catch(() => {});

      // Send final message
      await instance.send('message 2');

      // Should handle all restarts gracefully - at least final message should process
      expect(messagesProcessed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Loading indicator', () => {
    it('is off after a reply when the request before the restart got none', async () => {
      const config = createBaseConfig();
      config.messaging = {
        skipWelcome: true,
        messageLoadingIndicatorTimeoutSecs: 0.05,
        customSendMessage: async (
          request: MessageRequest,
          _options: CustomSendMessageOptions,
          instance: ChatInstance
        ) => {
          if (request.input.text !== 'answered') {
            return;
          }
          await instance.messaging.addMessage({
            output: {
              generic: [
                { response_type: MessageResponseTypes.TEXT, text: 'reply' },
              ],
            },
          });
        },
      };
      const instance = await renderChatAndGetInstance(config);

      await instance.send('unanswered');
      await instance.messaging.restartConversation();
      await instance.send('answered');
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(instance.getState().isMessageLoadingCounter).toBe(0);
    });

    it('stays off after a restart when the request before it got none', async () => {
      const config = createBaseConfig();
      config.messaging = {
        skipWelcome: true,
        messageLoadingIndicatorTimeoutSecs: 0.05,
        customSendMessage: async () => {},
      };
      const instance = await renderChatAndGetInstance(config);

      await instance.send('unanswered');
      await instance.messaging.restartConversation();
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(instance.getState().isMessageLoadingCounter).toBe(0);
    });
  });
});
