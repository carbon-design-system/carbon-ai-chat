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
  mockCustomSendMessage,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from "../../test_helpers";
import { BusEventType } from "../../../src/types/events/eventBusTypes";
import type { StructuredData } from "../../../src/types/messaging/Messages";

describe("ChatInstance.input.updateStructuredData", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have updateStructuredData method available", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    expect(typeof instance.input.updateStructuredData).toBe("function");
  });

  it("sets pending structured data in the store", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const structuredData: StructuredData = {
      fields: [{ id: "rating", type: "number", value: 4 }],
    };

    instance.input.updateStructuredData(() => structuredData);

    const state = store.getState();
    expect(state.assistantInputState.pendingStructuredData).toEqual(
      structuredData,
    );
  });

  it("passes the previous value to the updater function", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Set initial value
    instance.input.updateStructuredData(() => ({
      fields: [{ id: "field1", type: "text", value: "hello" }],
    }));

    // Update by appending a field
    const updater = jest.fn(
      (prev: StructuredData | undefined): StructuredData => ({
        ...prev,
        fields: [
          ...(prev?.fields ?? []),
          { id: "field2", type: "number" as const, value: 42 },
        ],
      }),
    );

    instance.input.updateStructuredData(updater);

    expect(updater).toHaveBeenCalledWith({
      fields: [{ id: "field1", type: "text", value: "hello" }],
    });

    const state = store.getState();
    expect(state.assistantInputState.pendingStructuredData).toEqual({
      fields: [
        { id: "field1", type: "text", value: "hello" },
        { id: "field2", type: "number", value: 42 },
      ],
    });
  });

  it("clears pending structured data when updater returns undefined", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Set initial value
    instance.input.updateStructuredData(() => ({
      fields: [{ id: "field1", type: "text", value: "hello" }],
    }));

    expect(
      store.getState().assistantInputState.pendingStructuredData,
    ).toBeDefined();

    // Clear it
    instance.input.updateStructuredData(() => undefined);

    expect(
      store.getState().assistantInputState.pendingStructuredData,
    ).toBeUndefined();
  });

  it("supports multi_select field type", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.input.updateStructuredData(() => ({
      fields: [
        {
          id: "features",
          type: "multi_select",
          value: ["feature-a", "feature-b"],
        },
      ],
    }));

    const state = store.getState();
    expect(
      state.assistantInputState.pendingStructuredData?.fields?.[0],
    ).toEqual({
      id: "features",
      type: "multi_select",
      value: ["feature-a", "feature-b"],
    });
  });

  it("supports file field with ExternalFileReference", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.input.updateStructuredData(() => ({
      fields: [
        {
          id: "attachment",
          type: "file",
          value: {
            type: "reference",
            id: "doc-123",
            url: "https://cdn.example.com/doc-123.pdf",
            name: "document.pdf",
            mime_type: "application/pdf",
            size: 12345,
          },
        },
      ],
    }));

    const state = store.getState();
    const fileField =
      state.assistantInputState.pendingStructuredData?.fields?.[0];
    expect(fileField?.id).toBe("attachment");
    expect(fileField?.type).toBe("file");
    expect((fileField?.value as any).type).toBe("reference");
    expect((fileField?.value as any).id).toBe("doc-123");
  });

  it("supports user_defined escape hatch", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.input.updateStructuredData(() => ({
      user_defined: {
        analytics: { time_spent: 45, interactions: 12 },
      },
    }));

    const state = store.getState();
    expect(
      state.assistantInputState.pendingStructuredData?.user_defined,
    ).toEqual({
      analytics: { time_spent: 45, interactions: 12 },
    });
  });
});

describe("getState().input.structuredData", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("returns undefined when no pending structured data is set", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    const state = instance.getState();
    expect(state.input.structuredData).toBeUndefined();
  });

  it("reflects pending structured data set via updateStructuredData", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    const structuredData: StructuredData = {
      fields: [{ id: "rating", type: "number", value: 5 }],
    };

    instance.input.updateStructuredData(() => structuredData);

    const state = instance.getState();
    expect(state.input.structuredData).toEqual(structuredData);
  });

  it("returns a frozen snapshot (not the live store reference)", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    instance.input.updateStructuredData(() => ({
      fields: [{ id: "field1", type: "text", value: "hello" }],
    }));

    const snapshot = instance.getState().input.structuredData;

    // Mutating the snapshot should not affect the store
    expect(() => {
      (snapshot as any).fields = [];
    }).toThrow(); // frozen object throws in strict mode
  });
});

describe("structured_data merge on send", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("merges pending structured data into the outgoing MessageRequest on instance.send(string)", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    const structuredData: StructuredData = {
      fields: [{ id: "rating", type: "number", value: 4 }],
    };

    instance.input.updateStructuredData(() => structuredData);

    const sendHandler = jest.fn();
    instance.on([{ type: BusEventType.SEND, handler: sendHandler }]);

    await instance.send("My message");

    expect(sendHandler).toHaveBeenCalledTimes(1);
    const sentMessage = sendHandler.mock.calls[0][0].data;
    expect(sentMessage.input.text).toBe("My message");
    expect(sentMessage.input.structured_data).toEqual(structuredData);
  });

  it("clears pending structured data from the store after send", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.input.updateStructuredData(() => ({
      fields: [{ id: "rating", type: "number", value: 4 }],
    }));

    expect(
      store.getState().assistantInputState.pendingStructuredData,
    ).toBeDefined();

    await instance.send("My message");

    expect(
      store.getState().assistantInputState.pendingStructuredData,
    ).toBeUndefined();
  });

  it("does NOT overwrite explicit structured_data on a MessageRequest passed to instance.send()", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    // Set pending structured data in the store
    instance.input.updateStructuredData(() => ({
      fields: [{ id: "store_field", type: "text", value: "from store" }],
    }));

    // Send a MessageRequest that already has structured_data
    const explicitStructuredData: StructuredData = {
      fields: [{ id: "explicit_field", type: "text", value: "explicit" }],
    };

    const sendHandler = jest.fn();
    instance.on([{ type: BusEventType.SEND, handler: sendHandler }]);

    await instance.send({
      input: {
        text: "My message",
        structured_data: explicitStructuredData,
      },
    });

    const sentMessage = sendHandler.mock.calls[0][0].data;
    // The explicit structured_data should be preserved, not overwritten by store data
    expect(sentMessage.input.structured_data).toEqual(explicitStructuredData);
    expect(sentMessage.input.structured_data?.fields?.[0]?.id).toBe(
      "explicit_field",
    );
  });

  it("passes structured_data through to customSendMessage", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    const structuredData: StructuredData = {
      fields: [
        { id: "name", type: "text", value: "John Doe" },
        { id: "score", type: "number", value: 10 },
      ],
    };

    instance.input.updateStructuredData(() => structuredData);

    await instance.send("Submit form");

    expect(mockCustomSendMessage).toHaveBeenCalledTimes(1);
    const [sentMessage] = mockCustomSendMessage.mock.calls[0];
    expect(sentMessage.input.structured_data).toEqual(structuredData);
  });

  it("sends without structured_data when none is pending", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    const sendHandler = jest.fn();
    instance.on([{ type: BusEventType.SEND, handler: sendHandler }]);

    await instance.send("Plain text message");

    const sentMessage = sendHandler.mock.calls[0][0].data;
    expect(sentMessage.input.structured_data).toBeUndefined();
  });

  it("sends structured_data provided directly on a MessageRequest without store involvement", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    const sendHandler = jest.fn();
    instance.on([{ type: BusEventType.SEND, handler: sendHandler }]);

    const structuredData: StructuredData = {
      fields: [{ id: "selection", type: "multi_select", value: ["a", "b"] }],
    };

    await instance.send({
      input: {
        text: "Selected items",
        structured_data: structuredData,
      },
    });

    const sentMessage = sendHandler.mock.calls[0][0].data;
    expect(sentMessage.input.structured_data).toEqual(structuredData);
  });
});

// Made with Bob
