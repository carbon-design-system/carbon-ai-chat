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
} from "../helpers/chatInstanceTestHelpers";
import { BusEventType } from "../../../src/types/events/eventBusTypes";

describe("ChatInstance.send", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have send method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.send).toBe("function");
  });

  it("should accept string message", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(instance.send("Hello")).resolves.not.toThrow();
  });

  it("should accept MessageRequest object", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const messageRequest = {
      input: { text: "Hello" },
    };

    await expect(instance.send(messageRequest)).resolves.not.toThrow();
  });

  it("should accept send options", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const options = { silent: true };

    await expect(instance.send("Hello", options)).resolves.not.toThrow();
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.send("Hello");
    expect(result).toBeInstanceOf(Promise);
  });

  describe("Event bus integration", () => {
    it("should fire pre:send and send events", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preSendHandler = jest.fn();
      const sendHandler = jest.fn();

      // Register event handlers
      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      await instance.send("Test message for events");

      // Verify both events were fired
      expect(preSendHandler).toHaveBeenCalledTimes(1);
      expect(sendHandler).toHaveBeenCalledTimes(1);

      // Verify event data structure
      const preSendCall = preSendHandler.mock.calls[0][0];
      const sendCall = sendHandler.mock.calls[0][0];

      expect(preSendCall.type).toBe(BusEventType.PRE_SEND);
      expect(preSendCall.data).toBeDefined();
      expect(preSendCall.data.input).toBeDefined();
      expect(preSendCall.data.input.text).toBe("Test message for events");

      expect(sendCall.type).toBe(BusEventType.SEND);
      expect(sendCall.data).toBeDefined();
      expect(sendCall.data.input).toBeDefined();
      expect(sendCall.data.input.text).toBe("Test message for events");
    });

    it("should fire events for MessageRequest object", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preSendHandler = jest.fn();
      const sendHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      const messageRequest = {
        input: { text: "MessageRequest test" },
        context: { test: "data" },
      };

      await instance.send(messageRequest);

      expect(preSendHandler).toHaveBeenCalledTimes(1);
      expect(sendHandler).toHaveBeenCalledTimes(1);

      const preSendCall = preSendHandler.mock.calls[0][0];
      const sendCall = sendHandler.mock.calls[0][0];

      expect(preSendCall.data.input.text).toBe("MessageRequest test");
      expect(preSendCall.data.context).toEqual({ test: "data" });

      expect(sendCall.data.input.text).toBe("MessageRequest test");
      expect(sendCall.data.context).toEqual({ test: "data" });
    });

    it("should allow pre:send handler to modify message", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      // Handler that modifies the message
      const preSendHandler = jest.fn((event) => {
        event.data.input.text = "Modified by pre:send handler";
        event.data.context = { modified: true };
      });

      const sendHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      await instance.send("Original text");

      expect(preSendHandler).toHaveBeenCalledTimes(1);
      expect(sendHandler).toHaveBeenCalledTimes(1);

      // Verify the send handler received the modified message
      const sendCall = sendHandler.mock.calls[0][0];
      expect(sendCall.data.input.text).toBe("Modified by pre:send handler");
      expect(sendCall.data.context).toEqual({ modified: true });
    });

    it("should fire events in correct order (pre:send before send)", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const eventOrder: string[] = [];

      const preSendHandler = jest.fn(() => {
        eventOrder.push("pre:send");
      });

      const sendHandler = jest.fn(() => {
        eventOrder.push("send");
      });

      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      await instance.send("Test event order");

      expect(eventOrder).toEqual(["pre:send", "send"]);
    });

    it("should include message ID in events", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preSendHandler = jest.fn();
      const sendHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      await instance.send("Test with ID");

      const preSendCall = preSendHandler.mock.calls[0][0];
      const sendCall = sendHandler.mock.calls[0][0];

      // Messages should have auto-generated IDs
      expect(preSendCall.data.id).toBeDefined();
      expect(typeof preSendCall.data.id).toBe("string");
      expect(preSendCall.data.id.length).toBeGreaterThan(0);

      expect(sendCall.data.id).toBeDefined();
      expect(sendCall.data.id).toBe(preSendCall.data.id); // Same ID in both events
    });

    it("should preserve custom message ID", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preSendHandler = jest.fn();
      const sendHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      const messageRequest = {
        id: "custom-message-id",
        input: { text: "Message with custom ID" },
      };

      await instance.send(messageRequest);

      const preSendCall = preSendHandler.mock.calls[0][0];
      const sendCall = sendHandler.mock.calls[0][0];

      expect(preSendCall.data.id).toBe("custom-message-id");
      expect(sendCall.data.id).toBe("custom-message-id");
    });

    it("should work with send options", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preSendHandler = jest.fn();
      const sendHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      const options = { silent: true };
      await instance.send("Test with options", options);

      expect(preSendHandler).toHaveBeenCalledTimes(1);
      expect(sendHandler).toHaveBeenCalledTimes(1);

      // Events should still fire even with options
      const preSendCall = preSendHandler.mock.calls[0][0];
      expect(preSendCall.data.input.text).toBe("Test with options");
    });

    it("should handle multiple consecutive sends", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preSendHandler = jest.fn();
      const sendHandler = jest.fn();

      instance.on([
        { type: BusEventType.PRE_SEND, handler: preSendHandler },
        { type: BusEventType.SEND, handler: sendHandler },
      ]);

      await instance.send("First message");
      await instance.send("Second message");
      await instance.send("Third message");

      expect(preSendHandler).toHaveBeenCalledTimes(3);
      expect(sendHandler).toHaveBeenCalledTimes(3);

      // Check that each call had the correct message
      const preSendCalls = preSendHandler.mock.calls;
      expect(preSendCalls[0][0].data.input.text).toBe("First message");
      expect(preSendCalls[1][0].data.input.text).toBe("Second message");
      expect(preSendCalls[2][0].data.input.text).toBe("Third message");
    });
  });
});
