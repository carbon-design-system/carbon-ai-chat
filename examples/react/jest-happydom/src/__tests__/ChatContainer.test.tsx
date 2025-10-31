import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import {
  ChatContainer,
  PageObjectId,
  MessageResponseTypes,
} from "@carbon/ai-chat";

/**
 * These tests demonstrate Jest testing with @carbon/ai-chat React components using happy-dom.
 *
 * IMPORTANT: happy-dom DOES support shadow DOM and Lit components DO render!
 * We can query elements inside the shadow DOM using PageObjectId selectors.
 */
describe("ChatContainer", () => {
  it("should render the chat component", async () => {
    const { container } = await act(() =>
      render(
        <ChatContainer
          messaging={{
            customSendMessage(_request, _requestOptions, instance) {
              // Return a welcome message
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

    // Wait for the custom element to be rendered
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

    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );
  }, 60000);

  it("should have a shadow DOM with rendered content", async () => {
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

    const customElement = await waitFor(() =>
      container.querySelector("cds-aichat-react"),
    );

    // Wait for Lit to finish rendering
    if (typeof (customElement as any).updateComplete !== "undefined") {
      await (customElement as any).updateComplete;
    }

    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );
  }, 60000);

  it("should render PageObjectId elements in shadow DOM", async () => {
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

    const customElement = await waitFor(() =>
      container.querySelector("cds-aichat-react"),
    );

    // Wait for Lit rendering
    if (typeof (customElement as any).updateComplete !== "undefined") {
      await (customElement as any).updateComplete;
    }

    const shadowRoot = (customElement as any)?.shadowRoot;

    // The LAUNCHER should be present (in minimized state)
    const launcher = shadowRoot.querySelector(
      `[data-testid="${PageObjectId.LAUNCHER}"]`,
    );
    expect(launcher).toBeTruthy();
    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );
  }, 60000);

  it("should open chat when launcher is clicked", async () => {
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

    const customElement = await waitFor(() =>
      container.querySelector("cds-aichat-react"),
    );

    // Wait for Lit rendering
    if (typeof (customElement as any).updateComplete !== "undefined") {
      await (customElement as any).updateComplete;
    }

    const shadowRoot = (customElement as any)?.shadowRoot;

    // Find the launcher button
    const launcher = shadowRoot.querySelector(
      `[data-testid="${PageObjectId.LAUNCHER}"]`,
    );
    expect(launcher).toBeTruthy();

    // Click the launcher to open the chat
    await act(async () => {
      launcher.click();
      // Wait for next render cycle
      if (typeof (customElement as any).updateComplete !== "undefined") {
        await (customElement as any).updateComplete;
      }
    });

    // Verify main panel is now visible
    const mainPanel = await waitFor(() =>
      shadowRoot.querySelector(`[data-testid="${PageObjectId.MAIN_PANEL}"]`),
    );
    expect(mainPanel).toBeTruthy();

    // Verify input field and send button are present
    const inputField = shadowRoot.querySelector(
      `[data-testid="${PageObjectId.INPUT}"]`,
    );
    expect(inputField).toBeTruthy();

    const sendButton = shadowRoot.querySelector(
      `[data-testid="${PageObjectId.INPUT_SEND}"]`,
    );
    expect(sendButton).toBeTruthy();

    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );
  }, 60000);
});
