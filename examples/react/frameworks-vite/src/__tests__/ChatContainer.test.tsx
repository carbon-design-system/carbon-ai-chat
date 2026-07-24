/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Vitest coverage for `ChatContainer` under happy-dom.
 *
 * Verifies: that the React `ChatContainer` mounts a shadow-rooted custom
 * element, that the launcher click opens the main panel, that
 * `renderWriteableElements` slots authored React nodes into the widget,
 * and that `PageObjectId` selectors resolve inside the shadow tree.
 * Snapshots use the serializer registered by `vitest.setup.ts`.
 */

import React from "react";
import { render, act, waitFor, cleanup } from "@testing-library/react";
import {
  ChatContainer,
  PageObjectId,
  MessageResponseTypes,
} from "@carbon/ai-chat";
import { deepQuerySelector } from "@carbon/ai-chat-components/es/globals/utils/dom-utils.js";
import { WAIT_FOR_TIMEOUT } from "./constants";
import { closeChat, openChat, waitForChatElement } from "./helpers";

describe("ChatContainer", () => {
  // Unmount every rendered widget after each test so a leftover open chat (e.g.
  // from a test whose teardown was skipped by a mid-body assertion failure) can
  // never leak into the next test. `cleanup()` is idempotent, so this is safe
  // even when vitest's `globals: true` already auto-registers Testing Library
  // cleanup — it removes any dependence on that being configured.
  afterEach(() => {
    cleanup();
  });

  it("should render the chat component", async () => {
    // Render ChatContainer with an inline customSendMessage so we can inject a deterministic
    // AI response without hitting a backend or wiring up WebSocket plumbing.
    const { container } = await act(() =>
      render(
        <ChatContainer
          messaging={{
            customSendMessage(_request, _requestOptions, instance) {
              instance.messaging.addMessage({
                output: {
                  generic: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "Hello! How can I help you today?",
                    },
                  ],
                },
              });
            },
          }}
          data-testid="chat-container"
          renderWriteableElements={{
            headerBottomElement: (
              <div data-testid="custom-header">Custom Header Content</div>
            ),
          }}
        />,
      ),
    );

    // waitForChatElement finds the host element by locating PageObjectId.CHAT_WIDGET inside
    // its shadow root, so the assertion below confirms the widget is fully rendered.
    const customElement = await waitForChatElement(container);
    expect(customElement).toBeInTheDocument();
  });

  it("should open chat when launcher is clicked", async () => {
    // Exercise the full launcher interaction so we know happy-dom can open the floating widget
    // and expose the same shadow-rooted surface users see in production.
    const { container } = await act(() =>
      render(
        <ChatContainer
          messaging={{
            customSendMessage(_request, _requestOptions, instance) {
              instance.messaging.addMessage({
                output: {
                  generic: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "Welcome! How can I help you?",
                    },
                  ],
                },
              });
            },
          }}
        />,
      ),
    );

    const customElement = await waitForChatElement(container);
    // `openChat` clicks the Carbon launcher (if present) and returns the widget's shadow root.
    const shadowRoot = await openChat(customElement);

    // `closeChat` runs in `finally` so that a failing assertion (e.g. a stale
    // snapshot) can't skip teardown and leak an open widget into later tests.
    try {
      // Everything inside the widget uses PageObjectId-based data-testids, so look for those
      // markers to make sure the critical interactive pieces are present.
      const mainPanel = await waitFor(
        () =>
          shadowRoot.querySelector(
            `[data-testid="${PageObjectId.MAIN_PANEL}"]`,
          ),
        { timeout: WAIT_FOR_TIMEOUT },
      );
      expect(mainPanel).toBeTruthy();

      const inputField = deepQuerySelector(
        shadowRoot,
        `[data-testid="${PageObjectId.INPUT}"]`,
      );
      expect(inputField).toBeTruthy();

      const sendButton = deepQuerySelector(
        shadowRoot,
        `[data-testid="${PageObjectId.INPUT_SEND}"]`,
      );
      expect(sendButton).toBeTruthy();

      expect(container.firstChild).toMatchSnapshot();
    } finally {
      await closeChat(customElement);
    }
  });

  it("should render slotted content", async () => {
    // Render custom header content via `renderWriteableElements` so we can assert that
    // slot wiring behaves the same under happy-dom as it does in browsers.
    const { container } = await act(() =>
      render(
        <ChatContainer
          messaging={{
            customSendMessage(_request, _requestOptions, _instance) {
              console.log("customSendMessage");
            },
          }}
          renderWriteableElements={{
            headerBottomElement: (
              <div data-testid="custom-header">Custom Header Content</div>
            ),
          }}
        />,
      ),
    );

    // Slot assertions happen outside the widget's shadow DOM: Carbon copies whatever we
    // provide into light DOM slots, so we only need to make sure our authored nodes exist.
    const slotWrapper = await waitFor(() =>
      container.querySelector('[slot="headerBottomElement"]'),
    );
    expect(slotWrapper).toBeInTheDocument();

    const customHeader = slotWrapper?.querySelector(
      '[data-testid="custom-header"]',
    );
    expect(customHeader).toBeInTheDocument();
    expect(customHeader).toHaveTextContent("Custom Header Content");

    expect(container.firstChild).toMatchSnapshot();
  });

  it("should render PageObjectId elements in shadow DOM", async () => {
    // Minimal render that only needs the launcher so we can document how PageObjectId
    // selectors map to real DOM elements inside the custom element's shadow tree.
    const { container } = await act(() =>
      render(
        <ChatContainer
          messaging={{
            customSendMessage(_request, _requestOptions, instance) {
              instance.messaging.addMessage({
                output: {
                  generic: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: "Test message",
                    },
                  ],
                },
              });
            },
          }}
        />,
      ),
    );

    const customElement = await waitForChatElement(container);

    if (typeof (customElement as any).updateComplete !== "undefined") {
      await (customElement as any).updateComplete;
    }

    const shadowRoot = (customElement as HTMLElement).shadowRoot!;

    // The LAUNCHER should be present (in minimized state). Mirror `openChat`'s
    // `waitFor` so the lookup tolerates an async render tick instead of relying
    // on the launcher being in the shadow tree the instant `updateComplete` resolves.
    const launcher = await waitFor(
      () => {
        const el = deepQuerySelector(
          shadowRoot,
          `[data-testid="${PageObjectId.LAUNCHER}"]`,
        );
        if (!el) {
          throw new Error("Launcher not rendered yet");
        }
        return el;
      },
      { timeout: WAIT_FOR_TIMEOUT },
    );
    expect(launcher).toBeTruthy();

    expect(container.firstChild).toMatchSnapshot();
  });
});
