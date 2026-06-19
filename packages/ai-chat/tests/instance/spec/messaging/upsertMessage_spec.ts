/*
 *  Copyright IBM Corp. 2025, 2026
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
} from "../../../test_helpers";
import {
  MessageResponse,
  MessageResponseTypes,
} from "../../../../src/types/messaging/Messages";
import { MessageState } from "../../../../src/types/config/MessagingConfig";
import { BusEventType } from "../../../../src/types/events/eventBusTypes";

function textResponse(id: string, text: string): MessageResponse {
  return {
    id,
    output: {
      generic: [{ response_type: MessageResponseTypes.TEXT, text }],
    },
  };
}

function userDefinedResponse(
  id: string,
  payload: Record<string, unknown>,
): MessageResponse {
  return {
    id,
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.USER_DEFINED,
          user_defined: payload,
        },
      ],
    },
  };
}

describe("ChatInstance.messaging.upsertMessage", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should expose upsertMessage as a function on instance.messaging", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);
    expect(typeof instance.messaging.upsertMessage).toBe("function");
  });

  describe("store integration", () => {
    it("inserts a brand-new message via upsert", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.upsertMessage(
        "upsert-1",
        MessageState.COMPLETE,
        () => textResponse("upsert-1", "hello"),
      );

      const state = store.getState();
      expect(state.allMessagesByID["upsert-1"]).toBeDefined();
      expect(
        (state.allMessagesByID["upsert-1"] as any).output.generic[0].text,
      ).toBe("hello");
    });

    it("updates the stored message text on a follow-up COMPLETE upsert", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.upsertMessage("u2", MessageState.STREAMING, () =>
        textResponse("u2", "v1"),
      );
      await instance.messaging.upsertMessage("u2", MessageState.COMPLETE, () =>
        textResponse("u2", "v2"),
      );

      const state = store.getState();
      expect((state.allMessagesByID["u2"] as any).output.generic[0].text).toBe(
        "v2",
      );
    });
  });

  describe("pre:receive / receive firing predicate", () => {
    it("fires pre:receive and receive on undefined → COMPLETE", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);

      await instance.messaging.upsertMessage("u3", MessageState.COMPLETE, () =>
        textResponse("u3", "done"),
      );

      expect(preReceive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledTimes(1);
    });

    it("does not fire on STREAMING; fires once on the final COMPLETE", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);

      await instance.messaging.upsertMessage("u4", MessageState.STREAMING, () =>
        textResponse("u4", "a"),
      );
      await instance.messaging.upsertMessage("u4", MessageState.STREAMING, () =>
        textResponse("u4", "ab"),
      );
      expect(preReceive).not.toHaveBeenCalled();
      expect(receive).not.toHaveBeenCalled();

      await instance.messaging.upsertMessage("u4", MessageState.COMPLETE, () =>
        textResponse("u4", "abc"),
      );

      expect(preReceive).toHaveBeenCalledTimes(1);
      expect(receive).toHaveBeenCalledTimes(1);
    });

    it("does not fire when upserting COMPLETE onto an already-COMPLETE message produced by addMessage", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      await instance.messaging.addMessage(textResponse("u5", "v1"));

      const preReceive = jest.fn();
      const receive = jest.fn();
      instance.on([
        { type: BusEventType.PRE_RECEIVE, handler: preReceive },
        { type: BusEventType.RECEIVE, handler: receive },
      ]);

      await instance.messaging.upsertMessage("u5", MessageState.COMPLETE, () =>
        textResponse("u5", "v2"),
      );

      expect(preReceive).not.toHaveBeenCalled();
      expect(receive).not.toHaveBeenCalled();
    });
  });

  describe("USER_DEFINED_RESPONSE event integration", () => {
    it("fires USER_DEFINED_RESPONSE with the state from the upsert call", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const handler = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler,
      });

      await instance.messaging.upsertMessage("u6", MessageState.STREAMING, () =>
        userDefinedResponse("u6", { foo: "bar" }),
      );

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0];
      expect(event.type).toBe(BusEventType.USER_DEFINED_RESPONSE);
      expect(event.data.state).toBe(MessageState.STREAMING);
    });

    it("populates state on USER_DEFINED_RESPONSE fired from addMessage with MessageState.COMPLETE", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const handler = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler,
      });

      await instance.messaging.addMessage(
        userDefinedResponse("u7", { foo: "bar" }),
      );

      expect(handler).toHaveBeenCalled();
      const event = handler.mock.calls[0][0];
      expect(event.data.state).toBe(MessageState.COMPLETE);
    });

    it("does NOT re-fire USER_DEFINED_RESPONSE when the item is deep-equal across upserts", async () => {
      const config = createBaseConfig();
      const { instance } = await renderChatAndGetInstanceWithStore(config);

      const handler = jest.fn();
      instance.on({
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler,
      });

      const payload = { foo: "bar" };
      await instance.messaging.upsertMessage("u8", MessageState.STREAMING, () =>
        userDefinedResponse("u8", payload),
      );
      expect(handler).toHaveBeenCalledTimes(1);

      // Same payload again — coordinator should detect that LocalMessageItem reference
      // was reused and suppress the event.
      await instance.messaging.upsertMessage("u8", MessageState.STREAMING, () =>
        userDefinedResponse("u8", payload),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("input validation", () => {
    it("rejects with TypeError when updater returns undefined", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      const badUpdater = ((): undefined => undefined) as any;
      await expect(
        instance.messaging.upsertMessage(
          "u9",
          MessageState.COMPLETE,
          badUpdater,
        ),
      ).rejects.toThrow(TypeError);
    });

    it("rejects when updater returns a message with a mismatched id", async () => {
      const config = createBaseConfig();
      const instance = await renderChatAndGetInstance(config);
      await expect(
        instance.messaging.upsertMessage("u10", MessageState.COMPLETE, () =>
          textResponse("not-u10", ""),
        ),
      ).rejects.toThrow(/but call was for/i);
    });

    it("assigns messageID when the returned message has no id", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);
      await instance.messaging.upsertMessage(
        "u11",
        MessageState.COMPLETE,
        () => ({
          output: {
            generic: [{ response_type: MessageResponseTypes.TEXT, text: "hi" }],
          },
        }),
      );
      const state = store.getState();
      expect(state.allMessagesByID["u11"]).toBeDefined();
    });
  });
});
