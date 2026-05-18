/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Slot-key contract test. `MessageRichUserContent` emits a `<slot name=...>`
 * for every non-built-in TipTap node it walks, and `InputNodePortalsContainer`
 * independently walks the same `display_content` to build the matching
 * `<div slot=...>` hosts. Slot projection only works if the two walks produce
 * identical keys. This test pins them together so the two implementations
 * can't drift apart.
 */

import React from "react";
import { render } from "@testing-library/react";
import type { JSONContent } from "@tiptap/core";

import {
  MessageRichUserContent,
  INPUT_NODE_SLOT_ATTR,
} from "../../../src/chat/components-legacy/MessageRichUserContent";
import { collectInputNodeSlots } from "../../../src/chat/components/portals/InputNodePortalsContainer";
import { StoreProvider } from "../../../src/chat/providers/StoreProvider";
import { createAppStore } from "../../../src/chat/store/appStore";
import type { MessageRequest } from "../../../src/types/messaging/Messages";

const MESSAGE_ID = "msg-1";

function messageWith(content: JSONContent): MessageRequest {
  return {
    id: MESSAGE_ID,
    input: { text: "", display_content: content },
  } as unknown as MessageRequest;
}

// Minimal store — the pure-text branch renders `<MarkdownWithDefaults>`, which
// reads `state.config.public.shouldSanitizeHTML` via a selector.
function makeStore() {
  return createAppStore((state) => state, { config: { public: {} } } as never);
}

/** Slot keys as `MessageRichUserContent` actually renders them, in DOM order. */
function renderedSlotKeys(content: JSONContent): string[] {
  const { container } = render(
    <StoreProvider store={makeStore()}>
      <MessageRichUserContent
        content={content}
        message={messageWith(content)}
      />
    </StoreProvider>,
  );
  return Array.from(
    container.querySelectorAll(`[${INPUT_NODE_SLOT_ATTR}]`),
  ).map((el) => el.getAttribute(INPUT_NODE_SLOT_ATTR) ?? "");
}

/** Slot keys as `InputNodePortalsContainer` computes them, in document order. */
function walkedSlotKeys(content: JSONContent): string[] {
  return collectInputNodeSlots(content, MESSAGE_ID).map((s) => s.slotKey);
}

describe("rich user message slot-key contract", () => {
  it("agrees on a mixed paragraph with a mention and a custom inline node", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hi " },
            { type: "mention", attrs: { id: "u1", label: "Alice" } },
            { type: "text", text: " see " },
            { type: "taskCard", attrs: { label: "Ship it" } },
          ],
        },
      ],
    };
    // The mention is built-in (no slot); only the custom inline node gets one.
    expect(walkedSlotKeys(content)).toEqual([`${MESSAGE_ID}::0.3`]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));
  });

  it("agrees on top-level custom blocks and an opaque blockquote", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "intro" }],
        },
        { type: "fileBlock", attrs: { label: "report.pdf" } },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "quoted" }],
            },
          ],
        },
      ],
    };
    // blockquote is not built-in, so both walks stop at it without descending.
    expect(walkedSlotKeys(content)).toEqual([
      `${MESSAGE_ID}::1`,
      `${MESSAGE_ID}::2`,
    ]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));
  });

  it("agrees that command nodes and pure-text docs produce no slots", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "run " },
            { type: "command", attrs: { id: "c1", label: "deploy" } },
            { type: "widget", attrs: { label: "w" } },
          ],
        },
      ],
    };
    expect(walkedSlotKeys(content)).toEqual([`${MESSAGE_ID}::0.2`]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));

    // A doc with no custom nodes goes down the plain-markdown path. The walker
    // emits nothing; the bubble emits a `<MarkdownWithDefaults>` with no
    // `<slot>`, so there is nothing to project and nothing to keep in sync.
    const pureText: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "just text" }] },
      ],
    };
    expect(walkedSlotKeys(pureText)).toEqual([]);
  });

  it("agrees when custom nodes sit in multiple paragraphs", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a" },
            { type: "chip", attrs: { label: "one" } },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "chip", attrs: { label: "two" } },
            { type: "text", text: "b" },
          ],
        },
      ],
    };
    expect(walkedSlotKeys(content)).toEqual([
      `${MESSAGE_ID}::0.1`,
      `${MESSAGE_ID}::1.0`,
    ]);
    expect(renderedSlotKeys(content)).toEqual(walkedSlotKeys(content));
  });
});
