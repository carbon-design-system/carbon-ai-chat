/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Smoke tests for `ChatContainer` running under `jest-environment-jsdom`.
 *
 * Demonstrates: that the runner harness can mount the chat's web-component
 * wrapper, observe slotted light-DOM children, and produce a stable snapshot
 * of the host element. Because jsdom does NOT implement shadow DOM, these
 * specs verify only what is reachable from the light tree - mount success,
 * slotted React content, and the serialized host markup.
 *
 * APIs exercised: `ChatContainer`, `messaging.customSendMessage`,
 * `renderWriteableElements.headerBottomElement`, `@testing-library/react`
 * (`render`, `act`, `waitFor`).
 *
 * Start reading at: the first `it("should render the chat component")`.
 */

import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { ChatContainer } from "@carbon/ai-chat";

describe("ChatContainer", () => {
  it("should render the chat component", async () => {
    // `act` wraps the render so React's effects (including the chat's
    // mount-time async wiring) are flushed before assertions run under jsdom.
    const { container } = await act(() =>
      render(
        <ChatContainer
          messaging={{
            customSendMessage(_request, _requestOptions, _instance) {
              console.log("customSendMessage");
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

    // only the custom-element host is reachable from the light DOM in
    // jsdom; querying inside its shadow root would silently return null.
    const customElement = await waitFor(() =>
      container.querySelector("cds-aichat-react"),
    );
    expect(customElement).toBeInTheDocument();
  }, 60000);

  it("should render slotted content", async () => {
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

    // slotted children live in light DOM regardless of where the
    // component projects them, so they remain queryable under jsdom even
    // when the slot's shadow-DOM destination is not observable.
    const slotWrapper = await waitFor(() =>
      container.querySelector('[slot="headerBottomElement"]'),
    );
    expect(slotWrapper).toBeInTheDocument();

    const customHeader = slotWrapper?.querySelector(
      '[data-testid="custom-header"]',
    );
    expect(customHeader).toBeInTheDocument();
    expect(customHeader).toHaveTextContent("Custom Header Content");
  }, 60000);

  it("should match snapshot", async () => {
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
          data-testid="chat-container"
        />,
      ),
    );

    // snapshotting only after the host element has appeared keeps the
    // serialized output stable - otherwise the first run captures a pre-mount
    // tree and later runs diff against the post-mount tree.
    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );
  }, 60000);
});
