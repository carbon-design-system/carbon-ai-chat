/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from "@testing-library/react";
import { MessageResponseTypes } from "../../../../src/types/messaging/Messages";
import actions from "../../../../src/chat/store/actions";
import {
  createBaseConfig,
  mockCustomSendMessage,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from "../../../test_helpers";

describe("activeResponseId public state", () => {
  beforeEach(() => {
    setupBeforeEach();
  });

  afterEach(() => {
    setupAfterEach();
  });

  it("tracks added messages and streaming chunks", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    // Starts null
    expect(instance.getState().activeResponseId).toBeNull();

    // Receiving a message sets activeResponseId
    await instance.messaging.addMessage({
      id: "resp-1",
      output: { generic: [] },
    });
    expect(instance.getState().activeResponseId).toBe("resp-1");

    // Streaming chunk updates activeResponseId immediately
    await instance.messaging.addMessageChunk({
      partial_item: {
        response_type: MessageResponseTypes.TEXT,
        text: "hi",
        streaming_metadata: { id: "item-1" },
      },
      streaming_metadata: { response_id: "stream-123" },
    });
    expect(instance.getState().activeResponseId).toBe("stream-123");
  });

  it("clears on send and updates when response arrives", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    mockCustomSendMessage.mockImplementation(async (_req, _opts, inst) => {
      // Simulate async backend so we can observe the cleared state
      await new Promise((resolve) => setTimeout(resolve, 0));
      await inst.messaging.addMessage({
        id: "resp-2",
        output: { generic: [] },
      });
    });

    // Prime with an existing response
    await instance.messaging.addMessage({
      id: "resp-prime",
      output: { generic: [] },
    });
    expect(instance.getState().activeResponseId).toBe("resp-prime");

    const sendPromise = instance.send("hello");

    // Immediately after send, active response should be cleared
    expect(instance.getState().activeResponseId).toBeNull();

    // Once the response is added, activeResponseId should update
    await sendPromise;
    expect(instance.getState().activeResponseId).toBe("resp-2");
  });

  it("sets the active response from hydrated history and clears on restart", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    await instance.messaging.insertHistory([
      {
        message: {
          id: "hist-1",
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: "one" },
            ],
          },
        } as any,
        time: new Date(Date.now() - 2).toISOString(),
      },
      {
        message: {
          id: "hist-2",
          output: {
            generic: [
              { response_type: MessageResponseTypes.TEXT, text: "two" },
            ],
          },
        } as any,
        time: new Date(Date.now() - 1).toISOString(),
      },
    ]);

    await waitFor(() =>
      expect(instance.getState().activeResponseId).toBe("hist-2"),
    );

    store.dispatch(actions.restartConversation());
    expect(instance.getState().activeResponseId).toBeNull();
  });

  it("sets activeResponseId from customLoadHistory when last message is a response", async () => {
    const config = {
      ...createBaseConfig(),
      messaging: {
        ...createBaseConfig().messaging,
        customLoadHistory: jest.fn(async () => {
          return [
            {
              message: {
                id: "hist-a",
                output: {
                  generic: [
                    { response_type: MessageResponseTypes.TEXT, text: "old" },
                  ],
                },
              } as any,
              time: new Date(Date.now() - 5).toISOString(),
            },
            {
              message: {
                id: "hist-b",
                output: {
                  generic: [
                    { response_type: MessageResponseTypes.TEXT, text: "new" },
                  ],
                },
              } as any,
              time: new Date(Date.now() - 1).toISOString(),
            },
          ];
        }),
      },
    };

    const { instance } = await renderChatAndGetInstanceWithStore(config as any);

    await waitFor(
      () => {
        const state = instance.serviceManager?.store.getState();
        const lastId =
          state?.assistantMessageState.messageIDs[
            state.assistantMessageState.messageIDs.length - 1
          ];
        expect(instance.getState().activeResponseId).toBe(lastId ?? null);
      },
      { timeout: 5000 },
    );
  });

  it("updates when messages are removed", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    await instance.messaging.addMessage({
      id: "resp-1",
      output: { generic: [] },
    });
    await instance.messaging.addMessage({
      id: "resp-2",
      output: { generic: [] },
    });

    expect(instance.getState().activeResponseId).toBe("resp-2");

    await instance.messaging.removeMessages(["resp-2"]);
    expect(instance.getState().activeResponseId).toBe("resp-1");
  });

  it("clearConversation resets activeResponseId", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    await instance.messaging.addMessage({
      id: "resp-clear",
      output: { generic: [] },
    });
    expect(instance.getState().activeResponseId).toBe("resp-clear");

    await instance.messaging.clearConversation();
    expect(instance.getState().activeResponseId).toBeNull();
  });
});
