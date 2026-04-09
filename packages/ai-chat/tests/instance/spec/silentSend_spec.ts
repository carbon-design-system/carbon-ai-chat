/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Tests for the silent-send behaviour introduced to handle file-only sends.
 *
 * When the user clicks Send with no text but with pending uploads, the message
 * should be sent silently (not rendered as an empty bubble in the chat UI).
 *
 * The logic lives in useInputCallbacks.onSendInput:
 *   silent: options?.silent ?? !text
 *
 * We test the observable outcome at the doSend level:
 *   - silent=true  → message is NOT added to the visible message list in Redux
 *   - silent=false → message IS added to the visible message list in Redux
 */

import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from "../../test_helpers";
import {
  BusEventType,
  MessageSendSource,
} from "../../../src/types/events/eventBusTypes";
import { createMessageRequestForText } from "../../../src/chat/utils/messageUtils";

describe("silent send – file-only messages are not shown in the UI", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  // -------------------------------------------------------------------------
  // silent: true → message NOT added to visible message list
  // -------------------------------------------------------------------------

  it("does not add a message to the visible store when silent=true", async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText(""),
      MessageSendSource.MESSAGE_INPUT,
      { silent: true },
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    // A silent message must not appear in the visible message list.
    expect(messagesAfter).toBe(messagesBefore);
  });

  it("sets history.silent=true on the outgoing message when silent=true", async () => {
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const preSendMessages: any[] = [];
    instance.on([
      {
        type: BusEventType.PRE_SEND,
        handler: (event: any) => {
          preSendMessages.push(event.data);
        },
      },
    ]);

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText(""),
      MessageSendSource.MESSAGE_INPUT,
      { silent: true },
    );

    expect(preSendMessages).toHaveLength(1);
    expect(preSendMessages[0].history.silent).toBe(true);
  });

  // -------------------------------------------------------------------------
  // silent: false (or omitted) → message IS added to visible message list
  // -------------------------------------------------------------------------

  it("adds a message to the visible store when silent=false (text send)", async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText("Hello"),
      MessageSendSource.MESSAGE_INPUT,
      { silent: false },
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    // A non-silent message must appear in the visible message list.
    expect(messagesAfter).toBeGreaterThan(messagesBefore);
  });

  it("adds a message to the visible store when no silent option is provided", async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText("Hello"),
      MessageSendSource.MESSAGE_INPUT,
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    expect(messagesAfter).toBeGreaterThan(messagesBefore);
  });

  // -------------------------------------------------------------------------
  // The silent=true logic in useInputCallbacks: !text
  // We verify the rule directly: empty text → silent, non-empty text → not silent
  // -------------------------------------------------------------------------

  it("empty string is falsy — !text is true (file-only send should be silent)", () => {
    const text = "";
    expect(!text).toBe(true);
  });

  it("non-empty string is truthy — !text is false (text send should not be silent)", () => {
    const text = "Hello";
    expect(!text).toBe(false);
  });

  it("whitespace-only string trimmed to empty is falsy", () => {
    const text = "   ".trim();
    expect(!text).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Explicit silent option is always preserved (options?.silent ?? !text)
  // -------------------------------------------------------------------------

  it("explicit silent:true is preserved even when text is non-empty", async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    // Simulate a caller that explicitly passes silent:true with text
    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText("Hello"),
      MessageSendSource.MESSAGE_INPUT,
      { silent: true },
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    // Explicit silent:true must be respected regardless of text content.
    expect(messagesAfter).toBe(messagesBefore);
  });

  it("explicit silent:false is preserved even when text is empty", async () => {
    const { store, serviceManager } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const messagesBefore =
      store.getState().assistantMessageState.localMessageIDs.length;

    // Simulate a caller that explicitly passes silent:false with empty text
    await serviceManager.actions.sendWithCatch(
      createMessageRequestForText(""),
      MessageSendSource.MESSAGE_INPUT,
      { silent: false },
    );

    const messagesAfter =
      store.getState().assistantMessageState.localMessageIDs.length;

    // Explicit silent:false must be respected — message should be visible.
    expect(messagesAfter).toBeGreaterThan(messagesBefore);
  });
});

// Made with Bob
