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
import {
  MessageResponseTypes,
  TextItem,
  MessageResponse,
  FinalResponseChunk,
  PartialItemChunk,
  CompleteItemChunk,
} from "../../../../src/types/messaging/Messages";

describe("ChatInstance.messaging.addMessageChunk", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have addMessageChunk method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.addMessageChunk).toBe("function");
  });

  it("should accept stream chunk", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const chunk: PartialItemChunk = {
      streaming_metadata: {
        response_id: "msg-1",
      },
      partial_item: {
        streaming_metadata: {
          id: "chunk-1",
        },
        response_type: MessageResponseTypes.TEXT,
        text: "Hello ",
      },
    };

    await expect(
      instance.messaging.addMessageChunk(chunk),
    ).resolves.not.toThrow();
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const chunk: PartialItemChunk = {
      streaming_metadata: {
        response_id: "msg-1",
      },
      partial_item: {
        streaming_metadata: {
          id: "chunk-1",
        },
        response_type: MessageResponseTypes.TEXT,
        text: "streaming text",
      },
    };

    const result = instance.messaging.addMessageChunk(chunk);
    expect(result).toBeInstanceOf(Promise);
  });

  it("should handle multiple addMessageChunk calls and concatenate text properly in Redux", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = "msg-test-concat";
    const itemId = "chunk-1";

    const chunks: PartialItemChunk[] = [
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: "Hello ",
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: "world ",
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: "from ",
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: "Jest!",
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
      .join("");

    expect(concatenatedText).toBe("Hello world from Jest!");
  });

  it("should handle complete streaming flow: PartialItemChunk -> CompleteItemChunk -> FinalResponseChunk", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = "msg-full-flow";
    const itemId = "chunk-1";

    // Step 1: Send partial chunks
    const partialChunks: PartialItemChunk[] = [
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: "Streaming ",
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: "text ",
        },
      },
      {
        streaming_metadata: { response_id: responseId },
        partial_item: {
          streaming_metadata: { id: itemId },
          response_type: MessageResponseTypes.TEXT,
          text: "response!",
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
      .join("");
    expect(partialText).toBe("Streaming text response!");

    // Step 2: Send complete item chunk
    const completeItemChunk: CompleteItemChunk = {
      streaming_metadata: { response_id: responseId },
      complete_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: "Complete streaming text response!",
      },
    };

    await instance.messaging.addMessageChunk(completeItemChunk);

    // Verify complete item state
    state = store.getState();
    messageItem = state.allMessageItemsByID[localItemId];

    expect(messageItem).toBeDefined();
    expect(messageItem.ui_state.streamingState.isDone).toBe(true);
    expect((messageItem.item as TextItem).text).toBe(
      "Complete streaming text response!",
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
              text: "Final complete streaming text response!",
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
      "Final complete streaming text response!",
    );

    expect(finalMessageItem).toBeDefined();
    expect((finalMessageItem.item as TextItem).text).toBe(
      "Final complete streaming text response!",
    );
  });

  it("should properly transition streamingState.isDone when receiving CompleteItemChunk", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = "msg-complete-test";
    const itemId = "chunk-1";

    // Send partial chunk first
    const partialChunk: PartialItemChunk = {
      streaming_metadata: { response_id: responseId },
      partial_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: "Partial text",
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
        text: "Complete text",
      },
    };

    await instance.messaging.addMessageChunk(completeItemChunk);

    state = store.getState();
    messageItem = state.allMessageItemsByID[localItemId];

    expect(messageItem.ui_state.streamingState.isDone).toBe(true);
    expect((messageItem.item as TextItem).text).toBe("Complete text");
  });

  it("should finalize message with FinalResponseChunk and update Redux store", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);
    const responseId = "msg-final-test";
    const itemId = "chunk-1";

    // Send partial chunk
    const partialChunk: PartialItemChunk = {
      streaming_metadata: { response_id: responseId },
      partial_item: {
        streaming_metadata: { id: itemId },
        response_type: MessageResponseTypes.TEXT,
        text: "Building response...",
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
              text: "This is the final response text",
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
      "This is the final response text",
    );

    // Verify message item was updated with final content
    expect(messageItem).toBeDefined();
    expect((messageItem.item as TextItem).text).toBe(
      "This is the final response text",
    );

    // Verify that FinalResponseChunk achieves the same effects as CompleteItemChunk:
    // 1. Item content is replaced with final version (verified above)
    // 2. Streaming is marked as complete (no longer has streaming state)
    // 3. Intermediate streaming state is cleared
    // 4. Previous partial chunks are effectively discarded (replaced by final item)
    expect(messageItem.ui_state.streamingState).toBeUndefined();
    expect(messageItem.ui_state.isIntermediateStreaming).toBeUndefined();
  });
});
