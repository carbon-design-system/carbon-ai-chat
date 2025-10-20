import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { ChatContainer } from "@carbon/ai-chat";

/**
 * These tests demonstrate Jest testing with @carbon/ai-chat React components using jsdom.
 *
 * IMPORTANT: jsdom does NOT support shadow DOM. The @carbon/ai-chat components use
 * web components with shadow DOM, which means you cannot query elements inside the
 * shadow DOM in jsdom based tests. You are limited to checking if the Carbon AI Chat
 * correctly mounts with jsdom based tests.
 *
 * For shadow DOM support and PageObjectId selector usage, see the jest-happydom example.
 */
describe("ChatContainer", () => {
  it("should render the chat component", async () => {
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

    // We can only verify the custom element is rendered, not its shadow DOM contents
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

    // We CAN test slotted content (light DOM) even though we cannot test shadow DOM.
    // This is testing the content passed into the slot, not where it is slotted. This
    // means that even if it is not currently slotted by Carbon AI Chat and is just
    // invisible on the screen, you can still access it for your tests.
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

    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );
  }, 60000);
});
