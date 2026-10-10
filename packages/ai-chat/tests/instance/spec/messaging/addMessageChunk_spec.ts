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
  getChatShadowRoot,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import actions from '../../../../src/chat/store/actions';
import { BusEventType } from '../../../../src/types/events/eventBusTypes';
import {
  MessageResponseTypes,
  TextItem,
  MessageResponse,
  FinalResponseChunk,
  PartialItemChunk,
  CompleteItemChunk,
  MessageRequest,
} from '../../../../src/types/messaging/Messages';
import {
  CancellationReason,
  CustomSendMessageOptions,
  MessageState,
} from '../../../../src/types/config/MessagingConfig';
import { ChatInstance } from '../../../../src/types/instance/ChatInstance';
import { OnErrorType } from '../../../../src/types/config/ErrorConfig';
import {
  MALFORMED,
  fixtureMessage,
  observeWrite,
} from '../../../utils/itemDrawabilityFixtures';

describe('ChatInstance.messaging.addMessageChunk', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('should have addMessageChunk method available', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.addMessageChunk).toBe('function');
  });

  it('drops a queued chunk event when a restart interrupts its upsert', async () => {
    const { instance, store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    let releaseUpdater: () => void;
    const blocked = new Promise<void>((resolve) => {
      releaseUpdater = resolve;
    });
    const updater = jest.fn(async (): Promise<MessageResponse> => {
      await blocked;
      return { id: 'queued-chunk', output: { generic: [] } };
    });
    const chunkEvent = jest.fn();
    instance.on({
      type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
      handler: chunkEvent,
    });
    const write = jest.spyOn(serviceManager.messageUpsertCoordinator, 'upsert');
    const pendingUpsert = instance.messaging.upsertMessage(
      'queued-chunk',
      MessageState.STREAMING,
      updater
    );
    let pendingChunk: Promise<void>;
    try {
      await waitFor(() => expect(updater).toHaveBeenCalled());
      pendingChunk = instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'queued-chunk' },
        partial_item: {
          response_type: MessageResponseTypes.USER_DEFINED,
          streaming_metadata: { id: 'custom' },
          user_defined: { text: 'Old conversation' },
        },
      });
      await waitFor(() =>
        expect(write).toHaveBeenCalledWith(
          'queued-chunk',
          MessageState.STREAMING,
          expect.any(Function),
          expect.objectContaining({ origin: 'chunk' })
        )
      );

      await instance.messaging.restartConversation();
      releaseUpdater();
      await Promise.all([pendingUpsert, pendingChunk]);

      expect(chunkEvent).not.toHaveBeenCalled();
      expect(store.getState().allMessagesByID['queued-chunk']).toBeUndefined();
      expect(
        serviceManager.userDefinedElementRegistry.has('queued-chunk-custom')
      ).toBe(false);
    } finally {
      releaseUpdater();
      await Promise.all([pendingUpsert, pendingChunk]);
      write.mockRestore();
    }
  });

  it('should accept stream chunk', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const chunk: PartialItemChunk = {
      streaming_metadata: {
        response_id: 'msg-1',
      },
      partial_item: {
        streaming_metadata: {
          id: 'chunk-1',
        },
        response_type: MessageResponseTypes.TEXT,
        text: 'Hello ',
      },
    };

    await expect(
      instance.messaging.addMessageChunk(chunk)
    ).resolves.not.toThrow();
  });

  it('should return a Promise', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const chunk: PartialItemChunk = {
      streaming_metadata: {
        response_id: 'msg-1',
      },
      partial_item: {
        streaming_metadata: {
          id: 'chunk-1',
        },
        response_type: MessageResponseTypes.TEXT,
        text: 'streaming text',
      },
    };

    const result = instance.messaging.addMessageChunk(chunk);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should handle multiple addMessageChunk calls and concatenate text properly in store', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = 'msg-test-concat';
    const itemId = 'chunk-1';

    const chunks: PartialItemChunk[] = [
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: 'Hello ',
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: 'world ',
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: 'from ',
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: 'Jest!',
        },
      },
    ];

    for (const chunk of chunks) {
      await instance.messaging.addMessageChunk(chunk);
    }

    const state = store.getState();
    const localItemId = `${responseId}-${itemId}`;
    const messageItem = state.allMessageItemsByID[localItemId];

    expect(messageItem).toBeDefined();
    expect(messageItem.ui_state.streamingState).toBeDefined();
    expect(messageItem.ui_state.streamingState.chunks).toHaveLength(4);
    expect(messageItem.ui_state.streamingState.isDone).toBe(false);

    const concatenatedText = messageItem.ui_state.streamingState.chunks
      .map((chunk: any) => chunk.text)
      .join('');

    expect(concatenatedText).toBe('Hello world from Jest!');
  });

  it('should handle complete streaming flow: PartialItemChunk -> CompleteItemChunk -> FinalResponseChunk', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = 'msg-full-flow';
    const itemId = 'chunk-1';

    // Step 1: Send partial chunks
    const partialChunks: PartialItemChunk[] = [
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: 'Streaming ',
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: 'text ',
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: 'response!',
        },
      },
    ];

    for (const chunk of partialChunks) {
      await instance.messaging.addMessageChunk(chunk);
    }

    // Verify partial chunks state
    let state = store.getState();
    const localItemId = `${responseId}-${itemId}`;
    let messageItem = state.allMessageItemsByID[localItemId];

    expect(messageItem).toBeDefined();
    expect(messageItem.ui_state.streamingState.chunks).toHaveLength(3);
    expect(messageItem.ui_state.streamingState.isDone).toBe(false);

    const partialText = messageItem.ui_state.streamingState.chunks
      .map((chunk: any) => chunk.text)
      .join('');
    expect(partialText).toBe('Streaming text response!');

    // Step 2: Send complete item chunk
    const completeItemChunk: CompleteItemChunk = {
      streaming_metadata: { response_id: responseId },
      complete_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: 'Complete streaming text response!',
      },
    };

    await instance.messaging.addMessageChunk(completeItemChunk);

    // Verify complete item state
    state = store.getState();
    messageItem = state.allMessageItemsByID[localItemId];

    expect(messageItem).toBeDefined();
    expect(messageItem.ui_state.streamingState.isDone).toBe(true);
    expect((messageItem.item as TextItem).text).toBe(
      'Complete streaming text response!'
    );

    // Step 3: Send final response chunk
    const finalResponseChunk: FinalResponseChunk = {
      final_response: {
        id: responseId,
        output: {
          generic: [
            {
              streaming_metadata: { id: itemId },
              response_type: MessageResponseTypes.TEXT,
              text: 'Final complete streaming text response!',
            },
          ],
        },
      },
    };

    await instance.messaging.addMessageChunk(finalResponseChunk);

    // Verify final response state
    state = store.getState();
    const finalMessage = state.allMessagesByID[responseId] as MessageResponse;
    const finalMessageItem = state.allMessageItemsByID[localItemId];

    expect(finalMessage).toBeDefined();
    expect(finalMessage.id).toBe(responseId);
    expect(finalMessage.output.generic).toHaveLength(1);
    expect((finalMessage.output.generic[0] as TextItem).text).toBe(
      'Final complete streaming text response!'
    );

    expect(finalMessageItem).toBeDefined();
    expect((finalMessageItem.item as TextItem).text).toBe(
      'Final complete streaming text response!'
    );
  });

  it('should properly transition streamingState.isDone when receiving CompleteItemChunk', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = 'msg-complete-test';
    const itemId = 'chunk-1';

    // Send partial chunk first
    const partialChunk: PartialItemChunk = {
      streaming_metadata: { response_id: responseId },
      partial_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: 'Partial text',
      },
    };

    await instance.messaging.addMessageChunk(partialChunk);

    let state = store.getState();
    const localItemId = `${responseId}-${itemId}`;
    let messageItem = state.allMessageItemsByID[localItemId];

    expect(messageItem.ui_state.streamingState.isDone).toBe(false);

    // Send complete item chunk
    const completeItemChunk: CompleteItemChunk = {
      streaming_metadata: { response_id: responseId },
      complete_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: 'Complete text',
      },
    };

    await instance.messaging.addMessageChunk(completeItemChunk);

    state = store.getState();
    messageItem = state.allMessageItemsByID[localItemId];

    expect(messageItem.ui_state.streamingState.isDone).toBe(true);
    expect((messageItem.item as TextItem).text).toBe('Complete text');
  });

  it('should finalize message with FinalResponseChunk and update store', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = 'msg-final-test';
    const itemId = 'chunk-1';

    // Send partial chunk
    const partialChunk: PartialItemChunk = {
      streaming_metadata: { response_id: responseId },
      partial_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: 'Building response...',
      },
    };

    await instance.messaging.addMessageChunk(partialChunk);

    // Verify initial streaming state before FinalResponseChunk
    let state = store.getState();
    const localItemId = `${responseId}-${itemId}`;
    let messageItem = state.allMessageItemsByID[localItemId];

    expect(messageItem).toBeDefined();
    expect(messageItem.ui_state.streamingState.isDone).toBe(false);
    expect(messageItem.ui_state.isIntermediateStreaming).toBe(true);
    expect(messageItem.ui_state.streamingState.chunks).toHaveLength(1);

    // Send final response chunk
    const finalResponseChunk: FinalResponseChunk = {
      final_response: {
        id: responseId,
        output: {
          generic: [
            {
              streaming_metadata: { id: itemId },
              response_type: MessageResponseTypes.TEXT,
              text: 'This is the final response text',
            },
          ],
        },
      },
    };

    await instance.messaging.addMessageChunk(finalResponseChunk);

    state = store.getState();
    const message = state.allMessagesByID[responseId] as MessageResponse;
    messageItem = state.allMessageItemsByID[localItemId];

    // Verify message was added to store
    expect(message).toBeDefined();
    expect(message.id).toBe(responseId);
    expect(message.output.generic).toHaveLength(1);
    expect((message.output.generic[0] as TextItem).text).toBe(
      'This is the final response text'
    );

    // Verify message item was updated with final content
    expect(messageItem).toBeDefined();
    expect((messageItem.item as TextItem).text).toBe(
      'This is the final response text'
    );

    // Verify that FinalResponseChunk achieves the same effects as CompleteItemChunk:
    // 1. Item content is replaced with final version (verified above)
    // 2. Streaming is marked as complete (no longer has streaming state)
    // 3. Intermediate streaming state is cleared
    // 4. Previous partial chunks are effectively discarded (replaced by final item)
    expect(messageItem.ui_state.streamingState).toBeUndefined();
    expect(messageItem.ui_state.isIntermediateStreaming).toBeUndefined();
  });

  it('should reuse streaming IDs when final response items match existing items but omit IDs', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = 'msg-final-id-patch';
    const itemId = 'chunk-1';

    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: responseId },
      partial_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: 'Partial ',
      },
    });

    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: responseId },
      complete_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: 'Complete text',
      },
    });

    const finalResponseChunk: FinalResponseChunk = {
      final_response: {
        id: responseId,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Complete text',
            },
          ],
        },
      },
    };

    await instance.messaging.addMessageChunk(finalResponseChunk);

    const state = store.getState();
    const message = state.allMessagesByID[responseId] as MessageResponse;
    const finalItem = message.output.generic[0] as TextItem;

    expect(finalItem.streaming_metadata?.id).toBe(itemId);
    expect(state.allMessageItemsByID[`${responseId}-${itemId}`]).toBeDefined();
  });

  it('should not reuse streaming IDs when final response items differ', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = 'msg-final-id-no-patch';
    const itemId = 'chunk-1';

    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: responseId },
      partial_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: 'Partial ',
      },
    });

    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: responseId },
      complete_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: 'Complete text',
      },
    });

    const finalResponseChunk: FinalResponseChunk = {
      final_response: {
        id: responseId,
        output: {
          generic: [
            {
              response_type: MessageResponseTypes.TEXT,
              text: 'Different final text',
            },
          ],
        },
      },
    };

    await instance.messaging.addMessageChunk(finalResponseChunk);

    const state = store.getState();
    const message = state.allMessagesByID[responseId] as MessageResponse;
    const finalItem = message.output.generic[0] as TextItem;

    expect(finalItem.streaming_metadata?.id).toBeUndefined();
    // Orphaned streaming items should be removed when content differs
    expect(
      state.allMessageItemsByID[`${responseId}-${itemId}`]
    ).toBeUndefined();
  });

  // The reported symptom: a stream canceled mid-flight never receives a complete_item
  // or final_response, so nothing used to settle its items and the markdown table kept
  // rendering in its in-progress treatment for the rest of the session. The
  // stream_stopped test below covers the case where the host *does* send a closing
  // chunk; this covers the case where it just stops calling.
  it('settles streaming flags when a stream is canceled with no closing chunk', async () => {
    const responseId = 'canceled-no-close';
    const itemId = 'item-1';
    let stopped = false;

    const config = {
      ...createBaseConfig(),
      messaging: {
        ...createBaseConfig().messaging,
        customSendMessage: async (
          _request: any,
          options: any,
          chatInstance: ChatInstance
        ) => {
          options.signal?.addEventListener('abort', () => {
            stopped = true;
          });

          await chatInstance.messaging.addMessageChunk({
            streaming_metadata: { response_id: responseId },
            partial_item: {
              streaming_metadata: { id: itemId, cancellable: true },
              response_type: MessageResponseTypes.TEXT,
              text: '| a | b |',
            },
          } as PartialItemChunk);

          // Break out on abort and send nothing further — the whole point of the case.
          while (!stopped) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        },
      },
    };

    const { instance, store } = await renderChatAndGetInstanceWithStore(
      config as any
    );

    const sendPromise = instance.send('go');
    await new Promise((resolve) => setTimeout(resolve, 60));

    const localItemID = `${responseId}-${itemId}`;
    const before = store.getState().allMessageItemsByID[localItemID];
    expect(before.ui_state.streamingState.isDone).toBe(false);
    expect(before.ui_state.isIntermediateStreaming).toBe(true);

    await (
      instance as any
    ).serviceManager.messageService.cancelCurrentMessageRequest();
    await sendPromise.catch(() => {});

    const after = store.getState().allMessageItemsByID[localItemID];
    expect(after.ui_state.streamingState.isDone).toBe(true);
    expect((after.item as any).text).toBe('| a | b |');
    // Settling never reveals a type the chunk flow hides mid-stream.
    expect(after.ui_state.isIntermediateStreaming).toBe(true);
  });

  it('settles streaming flags and keeps the streamed text when customSendMessage throws mid-stream', async () => {
    const responseId = 'throws-mid-stream';
    const itemId = 'item-1';

    const config = {
      ...createBaseConfig(),
      messaging: {
        ...createBaseConfig().messaging,
        customSendMessage: async (
          _request: any,
          _options: any,
          chatInstance: ChatInstance
        ) => {
          for (const text of ['Hello, ', 'world']) {
            await chatInstance.messaging.addMessageChunk({
              streaming_metadata: { response_id: responseId },
              partial_item: {
                streaming_metadata: { id: itemId },
                response_type: MessageResponseTypes.TEXT,
                text,
              },
            } as PartialItemChunk);
          }
          throw new Error('backend went away');
        },
      },
    };

    const { instance, store } = await renderChatAndGetInstanceWithStore(
      config as any
    );

    await instance.send('go').catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 60));

    const item =
      store.getState().allMessageItemsByID[`${responseId}-${itemId}`];
    expect(item.ui_state.streamingState.isDone).toBe(true);
    expect(item.ui_state.isIntermediateStreaming).toBe(true);
    expect((item.item as any).text).toBe('Hello, world');
  });

  it('leaves a stream from outside the request alone when customSendMessage throws', async () => {
    const config = {
      ...createBaseConfig(),
      messaging: {
        ...createBaseConfig().messaging,
        customSendMessage: async () => {
          throw new Error('backend went away');
        },
      },
    };

    const { instance, store } = await renderChatAndGetInstanceWithStore(
      config as any
    );

    // A host streaming on its own, with no request in flight.
    await instance.messaging.addMessageChunk({
      streaming_metadata: { response_id: 'proactive' },
      partial_item: {
        streaming_metadata: { id: '1' },
        response_type: MessageResponseTypes.TEXT,
        text: 'Still going',
      },
    } as PartialItemChunk);

    await instance.send('go').catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 60));

    const item = store.getState().allMessageItemsByID['proactive-1'];
    expect(item.ui_state.streamingState.isDone).toBe(false);
  });

  describe('stop streaming button', () => {
    const isVisible = (store: { getState: () => any }) =>
      store.getState().assistantInputState.stopStreamingButtonState.isVisible;

    it.each(['chunk', 'upsert'])(
      'keeps a non-cancellable %s response protected from the other API',
      async (blockedAPI) => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const write = (
          api: string,
          id: string,
          cancellable?: boolean,
          complete = false
        ) => {
          const item: TextItem = {
            response_type: MessageResponseTypes.TEXT,
            text: 'Partial',
            streaming_metadata: { id: `${id}-item`, cancellable },
          };
          if (api === 'upsert') {
            return instance.messaging.upsertMessage(
              id,
              complete ? MessageState.COMPLETE : MessageState.STREAMING,
              () => ({ id, output: { generic: [item] } })
            );
          }
          return instance.messaging.addMessageChunk(
            complete
              ? {
                  streaming_metadata: { response_id: id },
                  complete_item: item,
                }
              : {
                  streaming_metadata: { response_id: id },
                  partial_item: item,
                }
          );
        };
        const otherAPI = blockedAPI === 'chunk' ? 'upsert' : 'chunk';
        await write(blockedAPI, 'blocked', false);
        await write(otherAPI, 'available', true);
        const button = () =>
          store.getState().assistantInputState.stopStreamingButtonState;
        expect(button()).toMatchObject({
          isVisible: true,
          isMetadataDisabled: true,
        });
        await write(otherAPI, 'available', true);
        await write(blockedAPI, 'blocked');
        expect(button().isMetadataDisabled).toBe(true);
        await write(blockedAPI, 'blocked', false, true);
        expect(button()).toMatchObject({
          isVisible: true,
          isMetadataDisabled: false,
        });
      }
    );

    it.each(['complete_item', 'final_response'])(
      'updates cancellation metadata and resets it on %s',
      async (terminalChunk) => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const write = (cancellable?: boolean, itemId = 'flags-item') =>
          instance.messaging.addMessageChunk({
            streaming_metadata: { response_id: 'chunk-flags' },
            partial_item: {
              response_type: MessageResponseTypes.TEXT,
              text: 'Partial ',
              streaming_metadata: { id: itemId, cancellable },
            },
          });
        const buttonState = () =>
          store.getState().assistantInputState.stopStreamingButtonState;

        await write(false);
        expect(buttonState()).toMatchObject({
          isVisible: false,
          isMetadataDisabled: false,
        });
        await write(true);
        await write(false);
        expect(buttonState()).toMatchObject({
          isVisible: true,
          isMetadataDisabled: true,
        });
        await write();
        expect(buttonState().isMetadataDisabled).toBe(true);
        await write(true, 'another-item');
        expect(buttonState().isMetadataDisabled).toBe(false);
        await write(false);

        const completedItem: TextItem = {
          response_type: MessageResponseTypes.TEXT,
          text: 'Complete',
          streaming_metadata: { id: 'flags-item', cancellable: false },
        };
        if (terminalChunk === 'complete_item') {
          await instance.messaging.addMessageChunk({
            streaming_metadata: { response_id: 'chunk-flags' },
            complete_item: completedItem,
          });
        } else {
          await instance.messaging.addMessageChunk({
            final_response: {
              id: 'chunk-flags',
              output: { generic: [completedItem] },
            },
          });
        }
        expect(buttonState()).toMatchObject({
          isVisible: false,
          isDisabled: false,
          isMetadataDisabled: false,
        });
        await write(true);
        expect(buttonState()).toMatchObject({
          isVisible: true,
          isMetadataDisabled: false,
        });
      }
    );

    it.each(['upsert', 'chunk'])(
      'disables the immediate stop button through %s metadata',
      async (api) => {
        let finishSend: () => void;
        const pendingSend = new Promise<void>((resolve) => {
          finishSend = resolve;
        });
        const config = createBaseConfig();
        config.messaging = {
          showStopButtonImmediately: true,
          customSendMessage: () => pendingSend,
        };
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(config);
        const send = instance.send('Start');
        await waitFor(() => expect(isVisible(store)).toBe(true));
        try {
          const item: TextItem = {
            response_type: MessageResponseTypes.TEXT,
            text: 'Cannot interrupt',
            streaming_metadata: { id: 'immediate-item', cancellable: false },
          };
          if (api === 'upsert') {
            await instance.messaging.upsertMessage(
              'immediate',
              MessageState.STREAMING,
              () => ({ id: 'immediate', output: { generic: [item] } })
            );
          } else {
            await instance.messaging.addMessageChunk({
              streaming_metadata: { response_id: 'immediate' },
              partial_item: item,
            });
          }
          expect(
            store.getState().assistantInputState.stopStreamingButtonState
          ).toMatchObject({
            isVisible: true,
            isMetadataDisabled: true,
          });
        } finally {
          finishSend();
          await send;
        }
      }
    );

    // The chunk flow has always hidden the button on its own complete_item. Making the
    // stop button concurrency-aware must not change that, so pin it here.
    it('hides the button on complete_item when nothing else is streaming', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const responseId = 'chunk-stop-1';
      const itemId = 'chunk-stop-item-1';

      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId, cancellable: true },
          response_type: MessageResponseTypes.TEXT,
          text: 'Partial ',
        },
      } as PartialItemChunk);

      expect(isVisible(store)).toBe(true);

      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: responseId },
        complete_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: 'Partial complete',
        },
      } as CompleteItemChunk);

      expect(isVisible(store)).toBe(false);
    });

    // A complete_item carrying no streaming_metadata leaves the resolved message id
    // undefined while the coordinator fell back to the queued request id. Any fix that
    // compared those two ids would silently stop hiding here.
    it('hides the button on a complete_item with no streaming metadata', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: 'chunk-stop-2' },
        partial_item: {
          streaming_metadata: { id: 'chunk-stop-item-2', cancellable: true },
          response_type: MessageResponseTypes.TEXT,
          text: 'Partial ',
        },
      } as PartialItemChunk);

      expect(isVisible(store)).toBe(true);

      await instance.messaging.addMessageChunk({
        complete_item: {
          response_type: MessageResponseTypes.TEXT,
          text: 'Done',
        },
      } as CompleteItemChunk);

      expect(isVisible(store)).toBe(false);
    });
  });

  describe('Abort signal behavior during streaming', () => {
    it('should trigger abort signal with STOP_STREAMING reason when stop button is used', async () => {
      const config = createBaseConfig();
      let capturedAbortReason: string | undefined;
      let isStreaming = false;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          instance: ChatInstance
        ) => {
          isStreaming = true;

          // Listen for abort
          options.signal?.addEventListener('abort', () => {
            capturedAbortReason = options.signal?.reason;
            isStreaming = false;
          });

          const responseId = 'streaming-test';
          const itemId = 'chunk-1';

          // Send partial chunks
          for (let i = 0; i < 10; i++) {
            if (!isStreaming) {
              break;
            }

            await instance.messaging.addMessageChunk({
              streaming_metadata: { response_id: responseId },
              partial_item: {
                streaming_metadata: { id: itemId, cancellable: true },
                response_type: MessageResponseTypes.TEXT,
                text: `Word ${i} `,
              },
            });

            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          if (isStreaming) {
            // Send final response if not canceled
            await instance.messaging.addMessageChunk({
              final_response: {
                id: responseId,
                output: {
                  generic: [
                    {
                      streaming_metadata: { id: itemId },
                      response_type: MessageResponseTypes.TEXT,
                      text: 'Complete message',
                    },
                  ],
                },
              },
            });
          }
        },
      };

      const instance = await renderChatAndGetInstance(config);

      // Start sending message
      const sendPromise = instance.send('test');

      // Wait for streaming to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate stop button click by canceling current message
      (
        instance as any
      ).serviceManager.messageService.cancelCurrentMessageRequest();

      // Wait for message to complete/cancel
      await sendPromise.catch(() => {});

      // Verify abort was triggered with correct reason
      expect(capturedAbortReason).toBe(CancellationReason.STOP_STREAMING);
    });

    it('should handle stream_stopped flag in CompleteItemChunk when canceled', async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      const responseId = 'stopped-stream';
      const itemId = 'chunk-1';

      // Send some partial chunks
      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId, cancellable: true },
          response_type: MessageResponseTypes.TEXT,
          text: 'Partial ',
        },
      });

      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId, cancellable: true },
          response_type: MessageResponseTypes.TEXT,
          text: 'text ',
        },
      });

      // Send complete item with stream_stopped flag
      await instance.messaging.addMessageChunk({
        streaming_metadata: { response_id: responseId },
        complete_item: {
          streaming_metadata: { id: itemId, stream_stopped: true },
          response_type: MessageResponseTypes.TEXT,
          text: 'Partial text',
        },
      });

      // Verify the item was marked as stopped
      const state = store.getState();
      const localItemId = `${responseId}-${itemId}`;
      const messageItem = state.allMessageItemsByID[localItemId];

      expect(messageItem).toBeDefined();
      expect(messageItem.ui_state.streamingState.isDone).toBe(true);
      expect((messageItem.item as TextItem).text).toBe('Partial text');
    });

    it('should verify abort signal is passed to customSendMessage', async () => {
      const config = createBaseConfig();
      let signalReceived = false;
      let signalIsAbortSignal = false;

      config.messaging = {
        customSendMessage: async (
          request: MessageRequest,
          options: CustomSendMessageOptions,
          _instance: ChatInstance
        ) => {
          signalReceived = options.signal !== undefined;
          signalIsAbortSignal = options.signal instanceof AbortSignal;
        },
      };

      const instance = await renderChatAndGetInstance(config);
      await instance.send('test');

      expect(signalReceived).toBe(true);
      expect(signalIsAbortSignal).toBe(true);
    });
  });

  // Characterization pins: each records what the chunk path does today, so moving
  // addMessageChunk onto a different internal write path cannot change it silently.
  describe('behavior pins', () => {
    // The chat persists session state (open view, hasSentNonWelcomeMessage) to
    // sessionStorage, which outlives each render. Start every pin from a clean session.
    beforeEach(() => window.sessionStorage.clear());

    const partial = (
      responseId: string,
      itemId: string,
      item: Record<string, unknown> = {},
      partialResponse?: Record<string, unknown>
    ): PartialItemChunk =>
      ({
        streaming_metadata: { response_id: responseId },
        ...(partialResponse ? { partial_response: partialResponse } : {}),
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          ...item,
        },
      }) as unknown as PartialItemChunk;

    const complete = (
      responseId: string,
      itemId: string,
      item: Record<string, unknown>
    ): CompleteItemChunk =>
      ({
        streaming_metadata: { response_id: responseId },
        complete_item: {
          streaming_metadata: { id: itemId },
          ...item,
        },
      }) as unknown as CompleteItemChunk;

    const final = (
      responseId: string,
      items: Array<Record<string, unknown>>
    ): FinalResponseChunk =>
      ({
        final_response: {
          id: responseId,
          output: { generic: items },
        },
      }) as unknown as FinalResponseChunk;

    const textItem = (itemId: string, text: string) => ({
      streaming_metadata: { id: itemId },
      response_type: MessageResponseTypes.TEXT,
      text,
    });

    it('streams new items with needsAnnouncement false, then announces each item once after final_response', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'pin-announce';
      const localIDs = [`${responseId}-a`, `${responseId}-b`];

      // Record every change to each item's needsAnnouncement flag. A true -> false edge is
      // MessageComponent calling the aria announcer and marking the item announced.
      const history: Record<string, boolean[]> = {
        [localIDs[0]]: [],
        [localIDs[1]]: [],
      };
      const unsubscribe = store.subscribe(() => {
        localIDs.forEach((id) => {
          const value =
            store.getState().allMessageItemsByID[id]?.ui_state
              .needsAnnouncement;
          const seen = history[id];
          if (value !== undefined && seen[seen.length - 1] !== value) {
            seen.push(value);
          }
        });
      });

      await instance.messaging.addMessageChunk(
        partial(responseId, 'a', { text: 'First ' })
      );
      await instance.messaging.addMessageChunk(
        partial(responseId, 'b', { text: 'Second ' })
      );

      expect(history[localIDs[0]]).toEqual([false]);
      expect(history[localIDs[1]]).toEqual([false]);

      await instance.messaging.addMessageChunk(
        final(responseId, [textItem('a', 'First'), textItem('b', 'Second')])
      );

      await waitFor(() => {
        expect(history[localIDs[0]]).toEqual([false, true, false]);
        expect(history[localIDs[1]]).toEqual([false, true, false]);
      });
      unsubscribe();
    });

    it('hides a card whose first chunk is complete_item until final_response, then renders it', async () => {
      const config = {
        ...createBaseConfig(),
        openChatByDefault: true,
        messaging: { ...createBaseConfig().messaging, skipWelcome: true },
      };
      const { instance, store } = await renderChatAndGetInstanceWithStore(
        config as any
      );
      const responseId = 'pin-card';
      const card = {
        response_type: MessageResponseTypes.CARD,
        body: [{ response_type: MessageResponseTypes.TEXT, text: 'Card body' }],
      };
      const cardInDOM = () =>
        getChatShadowRoot()?.querySelector('.cds-aichat--received--card');

      await instance.messaging.addMessageChunk(
        complete(responseId, 'card-1', card)
      );

      const item = store.getState().allMessageItemsByID[`${responseId}-card-1`];
      expect(item.ui_state.isIntermediateStreaming).toBe(true);
      expect(item.ui_state.streamingState).toEqual({
        chunks: [],
        isDone: true,
      });
      // Give React a chance to render anything it was going to.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(cardInDOM()).toBeFalsy();

      await instance.messaging.addMessageChunk(
        final(responseId, [{ streaming_metadata: { id: 'card-1' }, ...card }])
      );

      await waitFor(() => expect(cardInDOM()).toBeTruthy());
    });

    describe('a grid or carousel streamed partial then complete', () => {
      const gridWith = (cellItem: Record<string, unknown>) => ({
        response_type: MessageResponseTypes.GRID,
        columns: [{ width: '1' }],
        rows: [{ cells: [{ items: [cellItem] }] }],
      });

      it('fires no chunk event for a user_defined item in a cell, and one userDefinedResponse at final_response', async () => {
        const { instance } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const responseId = 'grid-user-defined';
        const grid = gridWith({
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: { kind: 'in-a-cell' },
        });
        const userDefinedResponse = jest.fn();
        const chunkUserDefinedResponse = jest.fn();
        instance.on([
          {
            type: BusEventType.USER_DEFINED_RESPONSE,
            handler: userDefinedResponse,
          },
          {
            type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
            handler: chunkUserDefinedResponse,
          },
        ]);

        await instance.messaging.addMessageChunk(
          partial(responseId, 'g', {
            response_type: MessageResponseTypes.GRID,
          })
        );
        await instance.messaging.addMessageChunk(
          complete(responseId, 'g', grid)
        );
        expect(userDefinedResponse).not.toHaveBeenCalled();

        await instance.messaging.addMessageChunk(
          final(responseId, [{ streaming_metadata: { id: 'g' }, ...grid }])
        );

        expect(chunkUserDefinedResponse).not.toHaveBeenCalled();
        expect(userDefinedResponse).toHaveBeenCalledTimes(1);
        expect(
          userDefinedResponse.mock.calls[0][0].data.message.user_defined
        ).toEqual({ kind: 'in-a-cell' });
      });

      // Message text renders inside cds-aichat-markdown's own shadow root, which a plain
      // textContent on the chat's shadow root doesn't reach.
      const deepText = (root: ParentNode | null): string => {
        let text = '';
        root?.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent ?? '';
          } else if (node instanceof Element) {
            text += deepText(node.shadowRoot) + deepText(node);
          }
        });
        return text;
      };
      const errorBox = () =>
        getChatShadowRoot()?.querySelector(
          '.cds-aichat--message--inline-error'
        );
      const renderErrors = (onError: jest.Mock) =>
        onError.mock.calls.filter(
          ([error]) => error.errorType === OnErrorType.RENDER
        );
      const shownConfig = (onError: jest.Mock) => ({
        ...createBaseConfig(),
        openChatByDefault: true,
        messaging: { ...createBaseConfig().messaging, skipWelcome: true },
        onError,
      });
      const cardWith = (text: string) => ({
        response_type: MessageResponseTypes.CARD,
        body: [{ response_type: MessageResponseTypes.TEXT, text }],
      });
      const containers = [
        {
          name: 'grid',
          selector: '.cds-aichat--grid',
          build: (suffix: string) =>
            gridWith({
              response_type: MessageResponseTypes.TEXT,
              text: `Grid cell${suffix}`,
            }),
          texts: (suffix: string) => [`Grid cell${suffix}`],
        },
        {
          name: 'carousel',
          selector: '.carousel-container',
          build: (suffix: string) => ({
            response_type: MessageResponseTypes.CAROUSEL,
            items: [
              cardWith(`Card one${suffix}`),
              cardWith(`Card two${suffix}`),
            ],
          }),
          texts: (suffix: string) => [`Card one${suffix}`, `Card two${suffix}`],
        },
      ];

      it.each(containers)(
        'holds a $name streamed as partial then complete until final_response',
        async ({ name, selector, build, texts }) => {
          const onError = jest.fn();
          const { instance, store } = await renderChatAndGetInstanceWithStore(
            shownConfig(onError) as any
          );
          const responseId = `held-${name}`;
          const localID = `${responseId}-c`;
          const inDOM = () => getChatShadowRoot()?.querySelector(selector);

          await instance.messaging.addMessageChunk(
            partial(responseId, 'c', { response_type: build('').response_type })
          );
          await instance.messaging.addMessageChunk(
            complete(responseId, 'c', build(''))
          );
          // Give React a chance to render anything it was going to.
          await new Promise((resolve) => setTimeout(resolve, 50));

          expect(inDOM()).toBeFalsy();
          expect(errorBox()).toBeFalsy();
          expect(renderErrors(onError)).toEqual([]);
          expect(
            store.getState().assistantMessageState.localMessageIDs
          ).toContain(localID);

          await instance.messaging.addMessageChunk(
            final(responseId, [
              { streaming_metadata: { id: 'c' }, ...build(' final') },
            ])
          );

          await waitFor(() => {
            const shown = deepText(getChatShadowRoot());
            texts(' final').forEach((text) => expect(shown).toContain(text));
          });
          expect(inDOM()).toBeTruthy();
          expect(errorBox()).toBeFalsy();
          expect(renderErrors(onError)).toEqual([]);
          const { allMessageItemsByID, assistantMessageState } =
            store.getState();
          expect(
            assistantMessageState.localMessageIDs.filter(
              (id) => allMessageItemsByID[id]?.fullMessageID === responseId
            )
          ).toEqual([localID]);
          expect(
            allMessageItemsByID[localID].ui_state.isIntermediateStreaming
          ).toBeFalsy();
        }
      );

      it('keeps a grid streamed as partial then complete hidden when the stream is stopped', async () => {
        const onError = jest.fn();
        const responseId = 'held-grid-stopped';
        let stopped = false;
        const config = {
          ...shownConfig(onError),
          messaging: {
            ...shownConfig(onError).messaging,
            customSendMessage: async (
              _request: MessageRequest,
              options: CustomSendMessageOptions,
              chatInstance: ChatInstance
            ) => {
              options.signal?.addEventListener('abort', () => {
                stopped = true;
              });
              await chatInstance.messaging.addMessageChunk(
                partial(responseId, 'g', {
                  response_type: MessageResponseTypes.GRID,
                })
              );
              await chatInstance.messaging.addMessageChunk(
                complete(
                  responseId,
                  'g',
                  gridWith({
                    response_type: MessageResponseTypes.TEXT,
                    text: 'Grid cell',
                  })
                )
              );
              while (!stopped) {
                await new Promise((resolve) => setTimeout(resolve, 10));
              }
            },
          },
        };
        const { instance, store } = await renderChatAndGetInstanceWithStore(
          config as any
        );

        const localItem = () =>
          store.getState().allMessageItemsByID[`${responseId}-g`];
        const sendPromise = instance.send('go');
        // Stop only once the complete_item has landed.
        await waitFor(() =>
          expect((localItem()?.item as any)?.rows).toBeDefined()
        );
        await (
          instance as any
        ).serviceManager.messageService.cancelCurrentMessageRequest();
        await sendPromise.catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(localItem().ui_state.streamingState.isDone).toBe(true);
        expect(localItem().ui_state.isIntermediateStreaming).toBe(true);
        expect(
          getChatShadowRoot()?.querySelector('.cds-aichat--grid')
        ).toBeFalsy();
        expect(errorBox()).toBeFalsy();
        expect(renderErrors(onError)).toEqual([]);
      });

      it.each([
        ['partial then complete', true],
        ['complete only', false],
      ])(
        'treats a grid with no rows streamed as %s the same way',
        async (_sequence, sendsPartial) => {
          const onError = jest.fn();
          const { instance, store } = await renderChatAndGetInstanceWithStore(
            shownConfig(onError) as any
          );
          const responseId = `rowless-grid-${sendsPartial}`;
          const rowless = {
            response_type: MessageResponseTypes.GRID,
            columns: [{ width: '1' }],
          };
          const consoleError = jest.spyOn(console, 'error');

          if (sendsPartial) {
            await instance.messaging.addMessageChunk(
              partial(responseId, 'g', {
                response_type: MessageResponseTypes.GRID,
              })
            );
          }
          // Rejecting here would fail the case.
          await instance.messaging.addMessageChunk(
            complete(responseId, 'g', rowless)
          );
          await new Promise((resolve) => setTimeout(resolve, 50));

          expect(errorBox()).toBeFalsy();
          expect(
            store.getState().allMessageItemsByID[`${responseId}-g`].ui_state
              .isIntermediateStreaming
          ).toBe(true);

          await instance.messaging.addMessageChunk(
            final(responseId, [{ streaming_metadata: { id: 'g' }, ...rowless }])
          );
          await waitFor(() =>
            expect(
              consoleError.mock.calls.some(
                ([message]) =>
                  typeof message === 'string' &&
                  message.endsWith('Error processing the message response')
              )
            ).toBe(true)
          );
          await new Promise((resolve) => setTimeout(resolve, 50));

          expect(
            getChatShadowRoot()?.querySelector('.cds-aichat--grid')
          ).toBeFalsy();
          expect(errorBox()).toBeFalsy();
          expect(renderErrors(onError)).toEqual([]);
        }
      );
    });

    it('clears isIntermediateStreaming when complete_item lands on an item a partial_item created', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'pin-complete-existing';
      const localItemID = `${responseId}-a`;

      await instance.messaging.addMessageChunk(
        partial(responseId, 'a', { text: 'Hi' })
      );
      expect(
        store.getState().allMessageItemsByID[localItemID].ui_state
          .isIntermediateStreaming
      ).toBe(true);

      await instance.messaging.addMessageChunk(
        complete(responseId, 'a', {
          response_type: MessageResponseTypes.TEXT,
          text: 'Hi there',
        })
      );
      expect(
        store.getState().allMessageItemsByID[localItemID].ui_state
          .isIntermediateStreaming
      ).toBe(false);
    });

    it('keeps the first chunk as the item on later partial_items and only grows streamingState.chunks', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'pin-partial-existing';
      const localItemID = `${responseId}-a`;

      await instance.messaging.addMessageChunk(
        partial(responseId, 'a', { text: 'Hello ' })
      );
      const firstItem = store.getState().allMessageItemsByID[localItemID].item;

      await instance.messaging.addMessageChunk(
        partial(responseId, 'a', { text: 'world' })
      );

      const after = store.getState().allMessageItemsByID[localItemID];
      // The item is never merged with later partials: renderers read the text from
      // streamingState.chunks while the stream runs.
      expect(after.item).toBe(firstItem);
      expect((after.item as TextItem).text).toBe('Hello ');
      expect(after.ui_state.streamingState.chunks).toHaveLength(2);
      expect(
        after.ui_state.streamingState.chunks.map((chunk: any) => chunk.text)
      ).toEqual(['Hello ', 'world']);
    });

    it('keeps reasoning.content from one chunk when a later chunk carries reasoning.steps', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'pin-reasoning';

      await instance.messaging.addMessageChunk(
        partial(
          responseId,
          'a',
          { text: '' },
          { message_options: { reasoning: { content: 'Thinking it over' } } }
        )
      );
      await instance.messaging.addMessageChunk(
        partial(
          responseId,
          'a',
          { text: 'Answer' },
          {
            message_options: {
              reasoning: { steps: [{ title: 'Step 1', content: 'Looked' }] },
            },
          }
        )
      );

      const message = store.getState().allMessagesByID[
        responseId
      ] as MessageResponse;
      expect(message.message_options.reasoning).toEqual({
        content: 'Thinking it over',
        steps: [{ title: 'Step 1', content: 'Looked' }],
      });
    });

    it('merges complete_item over the existing item, keeping fields only earlier partials carried', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'pin-complete-merge';

      await instance.messaging.addMessageChunk(
        partial(responseId, 'a', {
          text: 'Partial',
          partial_only_marker: 'kept',
        })
      );
      await instance.messaging.addMessageChunk(
        complete(responseId, 'a', {
          response_type: MessageResponseTypes.TEXT,
          text: 'Complete',
        })
      );

      const item = store.getState().allMessageItemsByID[`${responseId}-a`]
        .item as any;
      expect(item.text).toBe('Complete');
      expect(item.partial_only_marker).toBe('kept');
    });

    it('extends the items of a message written by upsertMessage rather than replacing them', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'pin-upsert-then-chunk';

      await instance.messaging.upsertMessage(
        responseId,
        MessageState.STREAMING,
        () => ({
          id: responseId,
          output: { generic: [textItem('a', 'From upsert')] },
        })
      );
      await instance.messaging.addMessageChunk(
        partial(responseId, 'b', { text: 'From chunk' })
      );

      const state = store.getState();
      const itemsForMessage =
        state.assistantMessageState.localMessageIDs.filter(
          (id) => state.allMessageItemsByID[id]?.fullMessageID === responseId
        );
      expect(itemsForMessage).toEqual([`${responseId}-a`, `${responseId}-b`]);
      expect(
        (state.allMessageItemsByID[`${responseId}-a`].item as TextItem).text
      ).toBe('From upsert');
      // The stored message is still the upsert's: the chunk item is not folded into it.
      expect(
        (state.allMessagesByID[responseId] as MessageResponse).output.generic
      ).toHaveLength(1);
    });

    it('fires pre:receive and receive exactly once, at final_response', async () => {
      const { instance } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'pin-receive-once';
      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);

      await instance.messaging.addMessageChunk(
        partial(responseId, 'a', { text: 'One ' })
      );
      await instance.messaging.addMessageChunk(
        partial(responseId, 'a', { text: 'two' })
      );
      await instance.messaging.addMessageChunk(
        complete(responseId, 'a', {
          response_type: MessageResponseTypes.TEXT,
          text: 'One two',
        })
      );

      expect(preReceive).not.toHaveBeenCalled();
      expect(receive).not.toHaveBeenCalled();

      await instance.messaging.addMessageChunk(
        final(responseId, [textItem('a', 'One two')])
      );

      expect(preReceive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledTimes(1);
      expect(preReceive.mock.calls[0][0].data.id).toBe(responseId);
      expect(receive.mock.calls[0][0].data.id).toBe(responseId);
    });

    it('appends interleaved new items at the global end, then groups each response at final_response', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const ids = () => store.getState().assistantMessageState.localMessageIDs;

      await instance.messaging.addMessageChunk(
        partial('A', 'a1', { text: 'A1' })
      );
      await instance.messaging.addMessageChunk(
        partial('B', 'b1', { text: 'B1' })
      );
      await instance.messaging.addMessageChunk(
        partial('A', 'a2', { text: 'A2' })
      );
      await instance.messaging.addMessageChunk(
        partial('B', 'b2', { text: 'B2' })
      );

      expect(ids()).toEqual(['A-a1', 'B-b1', 'A-a2', 'B-b2']);

      await instance.messaging.addMessageChunk(
        final('A', [textItem('a1', 'A1'), textItem('a2', 'A2')])
      );
      // A's final pulls its items together at the position of its first item.
      expect(ids()).toEqual(['A-a1', 'A-a2', 'B-b1', 'B-b2']);

      await instance.messaging.addMessageChunk(
        final('B', [textItem('b1', 'B1'), textItem('b2', 'B2')])
      );
      expect(ids()).toEqual(['A-a1', 'A-a2', 'B-b1', 'B-b2']);
    });

    it('fires userDefinedResponse (COMPLETE) and customFooterSlot for a user_defined complete_item only at final_response', async () => {
      const { instance } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'pin-user-defined';
      const userDefined = {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { kind: 'widget' },
        message_item_options: {
          custom_footer_slot: { slot_name: 'pin-footer' },
        },
      };
      const userDefinedResponse = jest.fn();
      const chunkUserDefinedResponse = jest.fn();
      const customFooterSlot = jest.fn();
      instance.on([
        {
          type: BusEventType.USER_DEFINED_RESPONSE,
          handler: userDefinedResponse,
        },
        {
          type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
          handler: chunkUserDefinedResponse,
        },
        { type: BusEventType.CUSTOM_FOOTER_SLOT, handler: customFooterSlot },
      ]);

      await instance.messaging.addMessageChunk(
        complete(responseId, 'ud', userDefined)
      );

      // Mid-stream, only the chunk event fires.
      expect(chunkUserDefinedResponse).toHaveBeenCalledTimes(1);
      expect(userDefinedResponse).not.toHaveBeenCalled();
      expect(customFooterSlot).not.toHaveBeenCalled();

      await instance.messaging.addMessageChunk(
        final(responseId, [
          { streaming_metadata: { id: 'ud' }, ...userDefined },
        ])
      );

      expect(userDefinedResponse).toHaveBeenCalledTimes(1);
      expect(userDefinedResponse.mock.calls[0][0].data.state).toBe(
        MessageState.COMPLETE
      );
      expect(customFooterSlot).toHaveBeenCalledTimes(1);
      expect(customFooterSlot.mock.calls[0][0].data.slotName).toBe(
        'pin-footer'
      );
      expect(chunkUserDefinedResponse).toHaveBeenCalledTimes(1);
    });

    it('announces reasoning start, then streaming start, once each per response', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const announced: Array<{ key: string; sender: string }> = [];
      let last = store.getState().announceMessage;
      const unsubscribe = store.subscribe(() => {
        const current = store.getState().announceMessage;
        if (current && current !== last) {
          announced.push({
            key: current.messageID,
            sender: current.messageValues?.sender as string,
          });
        }
        last = current;
      });
      const reasoning = {
        message_options: { reasoning: { steps: [{ title: 'Thinking' }] } },
      };

      // Reasoning partials with no text yet announce only reasoning start.
      await instance.messaging.addMessageChunk(
        partial('pin-starts-1', 'a', { text: ' ' }, reasoning)
      );
      await instance.messaging.addMessageChunk(
        partial('pin-starts-1', 'a', { text: ' ' }, reasoning)
      );
      await instance.messaging.addMessageChunk(
        partial('pin-starts-1', 'a', { text: 'Hel' }, reasoning)
      );
      await instance.messaging.addMessageChunk(
        partial('pin-starts-1', 'a', { text: 'lo' })
      );
      await instance.messaging.addMessageChunk(
        partial('pin-starts-2', 'a', { text: 'Hi' })
      );
      await instance.messaging.addMessageChunk(
        partial('pin-starts-2', 'a', { text: ' there' })
      );
      unsubscribe();

      const sender = announced[0]?.sender;
      expect(sender).toEqual(expect.any(String));
      expect(announced).toEqual([
        { key: 'messages_reasoningStart', sender },
        { key: 'messages_streamingStart', sender },
        { key: 'messages_streamingStart', sender },
      ]);
    });

    it('keeps an open home screen open through the chunks and closes it at final_response', async () => {
      const config = { ...createBaseConfig(), homescreen: { isOn: true } };
      const { instance, store } = await renderChatAndGetInstanceWithStore(
        config as any
      );
      const isHomeScreenOpen = () =>
        store.getState().persistedToBrowserStorage.homeScreenState
          .isHomeScreenOpen;
      const responseId = 'pin-home-screen';

      act(() => {
        store.dispatch(actions.setHomeScreenIsOpen(true));
      });
      expect(isHomeScreenOpen()).toBe(true);

      await instance.messaging.addMessageChunk(
        partial(responseId, 'a', { text: 'Streaming' })
      );
      await instance.messaging.addMessageChunk(
        complete(responseId, 'a', {
          response_type: MessageResponseTypes.TEXT,
          text: 'Streamed',
        })
      );
      expect(isHomeScreenOpen()).toBe(true);

      await instance.messaging.addMessageChunk(
        final(responseId, [textItem('a', 'Streamed')])
      );
      expect(isHomeScreenOpen()).toBe(false);
    });

    describe('items without streaming_metadata.id', () => {
      const idlessPartial = (responseId: string, text: string) =>
        ({
          streaming_metadata: { response_id: responseId },
          partial_item: { response_type: MessageResponseTypes.TEXT, text },
        }) as unknown as PartialItemChunk;

      const streamedTexts = (store: any, responseId: string) => {
        const state = store.getState();
        return state.assistantMessageState.localMessageIDs
          .map((id: string) => state.allMessageItemsByID[id])
          .filter((item: any) => item?.fullMessageID === responseId)
          .map((item: any) =>
            item.ui_state.streamingState?.isDone === false
              ? item.ui_state.streamingState.chunks
                  .map((chunk: any) => chunk.text)
                  .join('')
              : item.item.text
          );
      };

      it('keeps the text of two responses in their own bubbles', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());

        await instance.messaging.addMessageChunk(
          idlessPartial('pin-idless-1', 'First ')
        );
        await instance.messaging.addMessageChunk(
          idlessPartial('pin-idless-2', 'Second ')
        );
        await instance.messaging.addMessageChunk(
          idlessPartial('pin-idless-1', 'one')
        );
        await instance.messaging.addMessageChunk(
          idlessPartial('pin-idless-2', 'two')
        );

        expect(streamedTexts(store, 'pin-idless-1')).toEqual(['First one']);
        expect(streamedTexts(store, 'pin-idless-2')).toEqual(['Second two']);
      });

      it('replaces each response’s streamed item at its final_response', async () => {
        const { instance, store } =
          await renderChatAndGetInstanceWithStore(createBaseConfig());
        const finalText = (text: string) => ({
          response_type: MessageResponseTypes.TEXT,
          text,
        });

        await instance.messaging.addMessageChunk(
          idlessPartial('pin-idless-3', 'Third')
        );
        await instance.messaging.addMessageChunk(
          idlessPartial('pin-idless-4', 'Fourth')
        );

        await instance.messaging.addMessageChunk(
          final('pin-idless-3', [finalText('Third, final')])
        );
        expect(streamedTexts(store, 'pin-idless-3')).toEqual(['Third, final']);
        expect(streamedTexts(store, 'pin-idless-4')).toEqual(['Fourth']);

        await instance.messaging.addMessageChunk(
          final('pin-idless-4', [finalText('Fourth, final')])
        );
        expect(streamedTexts(store, 'pin-idless-3')).toEqual(['Third, final']);
        expect(streamedTexts(store, 'pin-idless-4')).toEqual(['Fourth, final']);
      });
    });
  });

  describe('on the upsert path', () => {
    const partialChunk = (responseId: string, text: string) =>
      ({
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: 'a' },
          response_type: MessageResponseTypes.TEXT,
          text,
        },
      }) as unknown as PartialItemChunk;

    it('writes partial_item and complete_item chunks through the upsert coordinator only', async () => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const upsert = jest.spyOn(
        serviceManager.messageUpsertCoordinator,
        'upsert'
      );
      const dispatch = jest.spyOn(store, 'dispatch');
      const partial = partialChunk('path-1', 'Hi');
      const complete = {
        streaming_metadata: { response_id: 'path-1' },
        complete_item: {
          streaming_metadata: { id: 'a' },
          response_type: MessageResponseTypes.TEXT,
          text: 'Hi there',
        },
      } as unknown as CompleteItemChunk;

      await instance.messaging.addMessageChunk(partial);
      await instance.messaging.addMessageChunk(complete);

      expect(upsert.mock.calls).toEqual([
        [
          'path-1',
          MessageState.STREAMING,
          expect.any(Function),
          {
            origin: 'chunk',
            chunk: { item: partial.partial_item, isComplete: false },
          },
        ],
        [
          'path-1',
          MessageState.STREAMING,
          expect.any(Function),
          {
            origin: 'chunk',
            chunk: { item: complete.complete_item, isComplete: true },
          },
        ],
      ]);
      const messageWrites = dispatch.mock.calls
        .map(([action]: any) => action.type)
        .filter((type: string) =>
          /^(ADD_MESSAGE|UPDATE_MESSAGE|UPSERT_MESSAGE|STREAMING_.*)$/.test(
            type
          )
        );
      expect(messageWrites).toEqual(['UPSERT_MESSAGE', 'UPSERT_MESSAGE']);
    });

    it('runs a host upsert for the same id after the chunk in flight, with the message stored as before', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'path-race';
      let seen: { generic: unknown; chunkItemShown: boolean };

      const chunkDone = instance.messaging.addMessageChunk(
        partialChunk(responseId, 'From chunk')
      );
      const upsertDone = instance.messaging.upsertMessage(
        responseId,
        MessageState.STREAMING,
        (previous) => {
          seen = {
            generic: previous?.output.generic,
            chunkItemShown: Boolean(
              store.getState().allMessageItemsByID[`${responseId}-a`]
            ),
          };
          return previous;
        }
      );
      await Promise.all([chunkDone, upsertDone]);

      expect(seen).toEqual({ generic: [], chunkItemShown: true });
    });

    it('completes the stream at final_response with one COMPLETE chunk-origin upsert that keeps the local ids', async () => {
      const { instance, store, serviceManager } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'path-final';
      await instance.messaging.addMessageChunk(
        partialChunk(responseId, 'Streamed')
      );
      const upsert = jest.spyOn(
        serviceManager.messageUpsertCoordinator,
        'upsert'
      );
      const dispatch = jest.spyOn(store, 'dispatch');

      await instance.messaging.addMessageChunk({
        final_response: {
          id: responseId,
          output: {
            generic: [
              {
                streaming_metadata: { id: 'a' },
                response_type: MessageResponseTypes.TEXT,
                text: 'Streamed, final',
              },
            ],
          },
        },
      } as unknown as FinalResponseChunk);
      await waitFor(() =>
        expect(
          (
            store.getState().allMessageItemsByID[`${responseId}-a`]
              .item as TextItem
          ).text
        ).toBe('Streamed, final')
      );

      expect(upsert).toHaveBeenCalledTimes(1);
      expect(upsert.mock.calls[0].slice(0, 3)).toEqual([
        responseId,
        MessageState.COMPLETE,
        expect.any(Function),
      ]);
      expect(upsert.mock.calls[0][3]).toMatchObject({ origin: 'chunk' });
      const messageWrites = dispatch.mock.calls
        .map(([action]: any) => action.type)
        .filter((type: string) =>
          /^(ADD_MESSAGE|ADD_LOCAL_MESSAGE_ITEM|ADD_NESTED_MESSAGES|UPDATE_MESSAGE|UPSERT_MESSAGE)$/.test(
            type
          )
        );
      expect(messageWrites).toEqual(['UPSERT_MESSAGE', 'UPSERT_MESSAGE']);
      const state = store.getState();
      expect(
        state.assistantMessageState.localMessageIDs.filter(
          (id) => state.allMessageItemsByID[id]?.fullMessageID === responseId
        )
      ).toEqual([`${responseId}-a`]);
    });

    it('keeps a streamed item showing when the final_response is history.silent', async () => {
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(createBaseConfig());
      const responseId = 'path-final-silent';
      await instance.messaging.addMessageChunk(
        partialChunk(responseId, 'Streamed')
      );

      await instance.messaging.addMessageChunk({
        final_response: {
          id: responseId,
          history: { silent: true },
          output: {
            generic: [
              {
                streaming_metadata: { id: 'a' },
                response_type: MessageResponseTypes.TEXT,
                text: 'Streamed, final',
              },
            ],
          },
        },
      } as unknown as FinalResponseChunk);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state = store.getState();
      expect(state.assistantMessageState.localMessageIDs).toContain(
        `${responseId}-a`
      );
      expect(state.allMessageItemsByID[`${responseId}-a`]).toBeDefined();
    });
  });
});

describe('malformed items through addMessageChunk', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  /**
   * Items a renderer throws on. The rest throw while `final_response` is stored, which
   * leaves the streamed item as it was.
   */
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

  it.each(MALFORMED)(
    'keeps what "$name" does as a partial, complete, and final chunk',
    async (fixture) => {
      const item = {
        ...(fixture.item as object),
        streaming_metadata: { id: 'fixture-item' },
      };
      const final = fixtureMessage({ ...fixture, item });
      const outcome = await observeWrite(async (instance) => {
        const streaming_metadata = { response_id: final.id };
        await instance.messaging.addMessageChunk({
          streaming_metadata,
          partial_item: item,
        } as PartialItemChunk);
        await instance.messaging.addMessageChunk({
          streaming_metadata,
          complete_item: item,
        } as CompleteItemChunk);
        await instance.messaging.addMessageChunk({
          final_response: final,
        } as FinalResponseChunk);
      });

      expect(outcome).toEqual({
        rejects: false,
        shownItems: 1,
        reports: SHOWS_ERROR.has(fixture.name)
          ? ['RENDER: Message.componentDidCatch']
          : [],
        failedItems: SHOWS_ERROR.has(fixture.name) ? 1 : 0,
        catastrophic: false,
      });
    }
  );
});
