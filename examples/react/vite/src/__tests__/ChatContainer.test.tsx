import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import {
  ChatContainer,
  PageObjectId,
  MessageResponseTypes,
} from "@carbon/ai-chat";
import { WAIT_FOR_TIMEOUT } from "./constants";
import {
  closeChat,
  openChat,
  sendUserMessage,
  waitForChatElement,
} from "./helpers";

/**
 * These tests demonstrate Vitest testing with @carbon/ai-chat React components using happy-dom.
 *
 * IMPORTANT: happy-dom DOES support shadow DOM and Lit components DO render!
 * We can query elements inside the shadow DOM using PageObjectId selectors.
 */
describe("ChatContainer", () => {
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

    // Everything inside the widget uses PageObjectId-based data-testids, so look for those
    // markers to make sure the critical interactive pieces are present.
    const mainPanel = await waitFor(
      () =>
        shadowRoot.querySelector(`[data-testid="${PageObjectId.MAIN_PANEL}"]`),
      { timeout: WAIT_FOR_TIMEOUT },
    );
    expect(mainPanel).toBeTruthy();

    const inputField = shadowRoot.querySelector(
      `[data-testid="${PageObjectId.INPUT}"]`,
    );
    expect(inputField).toBeTruthy();

    const sendButton = shadowRoot.querySelector(
      `[data-testid="${PageObjectId.INPUT_SEND}"]`,
    );
    expect(sendButton).toBeTruthy();

    expect(container.firstChild).toMatchSnapshot();

    await closeChat(customElement);
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

    // The LAUNCHER should be present (in minimized state)
    const launcher = shadowRoot.querySelector(
      `[data-testid="${PageObjectId.LAUNCHER}"]`,
    );
    expect(launcher).toBeTruthy();

    expect(container.firstChild).toMatchSnapshot();
  });

  it("should render a user-defined response type", async () => {
    // Demonstrate how to test custom user_defined response types. The renderUserDefinedResponse
    // prop receives the message state and returns a React node — give that node a data-testid
    // so the test can assert on it without touching internal component selectors.
    const CUSTOM_TYPE = "my-custom-response";

    const { container } = await act(() =>
      render(
        <ChatContainer
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
      ),
    );

    const customElement = await waitForChatElement(container);
    const shadowRoot = await openChat(customElement);
    await sendUserMessage(shadowRoot, "Hello");

    // The rendered output is portaled into the light DOM of the host element,
    // not the shadow root — query from customElement, not shadowRoot.
    const customResponse = await waitFor(
      () => customElement.querySelector('[data-testid="custom-response"]'),
      { timeout: WAIT_FOR_TIMEOUT },
    );
    expect(customResponse).toBeTruthy();
    expect(customResponse).toHaveTextContent("Custom response content");
  });
});
