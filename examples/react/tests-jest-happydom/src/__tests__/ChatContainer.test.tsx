/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Title: ChatContainer smoke + shadow-DOM tests under happy-dom.
 *
 * Demonstrates: that Jest with the happy-dom test environment can mount
 * ChatContainer, traverse its Lit-backed shadow DOM via PageObjectId
 * selectors, drive the launcher, and observe slot + user_defined render
 * paths -- all without a real browser.
 *
 * APIs exercised: ChatContainer, PageObjectId, MessageResponseTypes,
 * messaging.customSendMessage, instance.messaging.addMessage,
 * renderUserDefinedResponse, renderWriteableElements, waitFor.
 *
 * Start reading at: the first describe block; each `it` is independent
 * and exercises one runner-level concern (smoke, launcher click, slot
 * projection, shadow-DOM PageObjectId lookup, custom response render).
 */

import React from "react";
import { waitFor } from "@testing-library/react";
import {
  ChatContainer,
  PageObjectId,
  MessageResponseTypes,
} from "@carbon/ai-chat";
import { deepQuerySelector } from "@carbon/ai-chat-components/es/globals/utils/dom-utils.js";
import { TEST_TIMEOUT, WAIT_FOR_TIMEOUT } from "./constants";
import {
  closeChat,
  openChat,
  renderChatContainer,
  waitForChatElement,
} from "./helpers";

// happy-dom (unlike many minimal DOM stubs) implements shadow DOM and
// runs Lit upgrades, so PageObjectId-based queries inside shadowRoot
// behave the same as in a real browser.
describe("ChatContainer", () => {
  it("should render the chat component", async () => {
    // Render ChatContainer with an inline customSendMessage so we can inject a deterministic
    // AI response without hitting a backend or wiring up WebSocket plumbing.
    const { container } = await renderChatContainer(
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
    );

    // renderChatContainer waits for the widget to be ready, so the element is guaranteed here.
    const customElement = await waitForChatElement(container);
    expect(customElement).toBeInTheDocument();
  });

  it("should open chat when launcher is clicked", async () => {
    // Exercise the full launcher interaction so we know happy-dom can open the floating widget
    // and expose the same shadow-rooted surface users see in production.
    const { container } = await renderChatContainer(
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
    );

    const customElement = await waitForChatElement(container);
    // `openChat` clicks the Carbon launcher (if present) and returns the widget's shadow root.
    const shadowRoot = await openChat(customElement);

    // Everything inside the widget uses PageObjectId-based data-testids,
    // but several of the targets (MAIN_PANEL, INPUT, INPUT_SEND) live behind
    // nested shadow-root boundaries from Carbon's `cds-button` / `cds-layer`
    // / `cds-aichat-input-send-control` etc. `deepQuerySelector` walks every
    // shadow root; a plain `shadowRoot.querySelector` only sees the
    // outermost tree.
    const mainPanel = await waitFor(
      () =>
        deepQuerySelector(
          shadowRoot,
          `[data-testid="${PageObjectId.MAIN_PANEL}"]`,
        ),
      { timeout: WAIT_FOR_TIMEOUT },
    );
    expect(mainPanel).toBeTruthy();

    const inputField = await waitFor(
      () =>
        deepQuerySelector(shadowRoot, `[data-testid="${PageObjectId.INPUT}"]`),
      { timeout: WAIT_FOR_TIMEOUT },
    );
    expect(inputField).toBeTruthy();

    const sendButton = await waitFor(
      () =>
        deepQuerySelector(
          shadowRoot,
          `[data-testid="${PageObjectId.INPUT_SEND}"]`,
        ),
      { timeout: WAIT_FOR_TIMEOUT },
    );
    expect(sendButton).toBeTruthy();

    expect(container.firstChild).toMatchSnapshot();

    await closeChat(customElement);
  });

  it("should render slotted content", async () => {
    // Render custom header content via `renderWriteableElements` so we can assert that
    // slot wiring behaves the same under happy-dom as it does in browsers.
    const { container } = await renderChatContainer(
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
    const { container } = await renderChatContainer(
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
    );

    const customElement = await waitForChatElement(container);

    // Lit hosts expose `updateComplete` as a Promise that resolves once
    // the element has finished its current render. Awaiting it here avoids
    // racing against the launcher's first paint inside happy-dom.
    if (typeof (customElement as any).updateComplete !== "undefined") {
      await (customElement as any).updateComplete;
    }

    const shadowRoot = (customElement as HTMLElement).shadowRoot!;

    // The LAUNCHER lives inside Carbon's `cds-button` shadow tree, which is
    // itself nested inside `cds-aichat-shell`'s shadow root. Use
    // `deepQuerySelector` to walk every boundary.
    const launcher = deepQuerySelector(
      shadowRoot,
      `[data-testid="${PageObjectId.LAUNCHER}"]`,
    );
    expect(launcher).toBeTruthy();

    expect(container.firstChild).toMatchSnapshot();
  });

  it(
    "should render a user-defined response type",
    async () => {
      // Demonstrate how to test custom user_defined response types. The
      // renderUserDefinedResponse prop receives the message state and returns
      // a React node — give that node a data-testid so the test can assert
      // on it without touching internal component selectors.
      //
      // Note: instead of driving the chat through the input UI to fire the
      // send flow, this test captures the chat instance via `onBeforeRender`
      // and calls `instance.send(...)` directly. Driving the input through
      // the UI under happy-dom is unreliable (`@lit/react`'s onChange
      // listener does not fire there, so the send button stays disabled);
      // the public instance API exercises the same customSendMessage path
      // without that dependency.
      const CUSTOM_TYPE = "my-custom-response";

      let chatInstance: any = null;

      const { container } = await renderChatContainer(
        <ChatContainer
          onBeforeRender={(instance) => {
            chatInstance = instance;
          }}
          messaging={{
            customSendMessage(_request, _requestOptions, instance) {
              instance.messaging.addMessage({
                output: {
                  generic: [
                    {
                      response_type: MessageResponseTypes.USER_DEFINED,
                      user_defined: {
                        user_defined_type: CUSTOM_TYPE,
                        text: "Custom response content",
                      },
                    },
                  ],
                },
              });
            },
          }}
          renderUserDefinedResponse={(state) => {
            const item = state.messageItem as any;
            if (item?.user_defined?.user_defined_type !== CUSTOM_TYPE) {
              return null;
            }
            return (
              <div data-testid="custom-response">{item.user_defined.text}</div>
            );
          }}
        />,
      );

      const customElement = await waitForChatElement(container);

      // Wait for `onBeforeRender` to run and capture the instance.
      await waitFor(
        () => {
          if (!chatInstance) {
            throw new Error("Chat instance not yet captured");
          }
          return chatInstance;
        },
        { timeout: WAIT_FOR_TIMEOUT },
      );

      await chatInstance.send("Hello");

      // The rendered output is portaled into the light DOM of the host element,
      // not the shadow root — query from customElement, not shadowRoot.
      const customResponse = await waitFor(
        () => customElement.querySelector('[data-testid="custom-response"]'),
        { timeout: WAIT_FOR_TIMEOUT },
      );
      expect(customResponse).toBeTruthy();
      expect(customResponse).toHaveTextContent("Custom response content");
    },
    TEST_TIMEOUT,
  );
});
