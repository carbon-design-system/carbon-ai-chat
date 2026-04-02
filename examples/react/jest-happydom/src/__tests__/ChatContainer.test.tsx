import React from "react";
import { act, waitFor } from "@testing-library/react";
import {
  ChatContainer,
  PageObjectId,
  ChatInstance,
  MessageResponseTypes,
} from "@carbon/ai-chat";
import {
  CITATIONS_TOGGLE_ARIA_LABEL,
  CONVERSATIONAL_SEARCH_RESPONSE,
  MARKDOWN_WITH_TABLE_AND_CODE,
  TEST_TIMEOUT,
  WAIT_FOR_TIMEOUT,
} from "./constants";
import {
  closeChat,
  openChat,
  renderChatContainer,
  sendUserMessage,
  waitForChatElement,
} from "./helpers";

/**
 * These tests demonstrate Jest testing with @carbon/ai-chat React components using happy-dom.
 *
 * IMPORTANT: happy-dom DOES support shadow DOM and Lit components DO render!
 * We can query elements inside the shadow DOM using PageObjectId selectors.
 */
describe("ChatContainer", () => {
  it("should render the chat component", async () => {
    // Render ChatContainer with an inline customSendMessage so we can inject a deterministic
    // AI response without hitting a backend or wiring up WebSocket plumbing.
    const { container } = await renderChatContainer(
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
    );

    // The widget renders into a custom element (`cds-aichat-react`), so wait for it to
    // upgrade before making assertions.
    const customElement = await waitFor(() =>
      container.querySelector("cds-aichat-react"),
    );
    expect(customElement).toBeInTheDocument();
  });

  it("should open chat when launcher is clicked", async () => {
    // Exercise the full launcher interaction so we know happy-dom can open the floating widget
    // and expose the same shadow-rooted surface users see in production.
    const { container } = await renderChatContainer(
      <ChatContainer
        messaging={{
          customSendMessage(_request, _requestOptions, instance) {
            console.log("customSendMessage called");
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

    // Wait for the host web component before poking into its implementation details.
    const customElement = await waitFor(() =>
      container.querySelector("cds-aichat-react"),
    );
    // `openChat` clicks the Carbon launcher (if present) and returns the widget's shadow root.
    const shadowRoot = await openChat(customElement as Element);

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

    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );

    await closeChat(customElement as Element);
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

    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );
  });

  it("should have a shadow DOM with rendered content", async () => {
    // Push a text message through the mocked `customSendMessage` flow so the widget
    // renders markdown content we can later inspect inside the component's shadow root.
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

    const customElement = await waitFor(() =>
      container.querySelector("cds-aichat-react"),
    );

    expect(customElement).toBeTruthy();

    // Wait for Lit to finish rendering so the shadow root contains stable markup.
    if (typeof (customElement as any).updateComplete !== "undefined") {
      await (customElement as any).updateComplete;
    }

    await waitFor(() => container.querySelector("cds-aichat-react")).then(() =>
      expect(container.firstChild).toMatchSnapshot(),
    );

    const shadowRoot = await openChat(customElement as Element);

    expect(shadowRoot).toBeTruthy();

    try {
      const mainPanel = await waitFor(() => {
        const element = shadowRoot.querySelector(
          `[data-testid="${PageObjectId.MAIN_PANEL}"]`,
        ) as HTMLElement | null;
        if (!element) {
          throw new Error("Main panel not rendered yet");
        }
        return element;
      });

      const markdownElement = await waitFor(() => {
        const element = mainPanel.querySelector(
          "cds-aichat-markdown",
        ) as HTMLElement | null;
        if (!element || !(element as any).shadowRoot) {
          throw new Error("Markdown component not rendered yet");
        }
        return element;
      });

      const markdownShadow = (markdownElement as any).shadowRoot as ShadowRoot;

      expect(markdownShadow).toBeTruthy();

      // cds-aichat-markdown throttles its render pipeline, so wait for Lit to finish.
      if (typeof (markdownElement as any).updateComplete !== "undefined") {
        await (markdownElement as any).updateComplete;
      }

      expect(markdownShadow.textContent).toContain("Test message");
    } finally {
      await closeChat(customElement as Element);
    }
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
  });

  it(
    "should render markdown-driven table and code snippet responses",
    async () => {
      // Render a text response that embeds a markdown table and fenced code block so we
      // can assert that both complex components hydrate correctly under happy-dom.
      const { container } = await renderChatContainer(
        <ChatContainer
          messaging={{
            customSendMessage: async (_request, _requestOptions, instance) => {
              instance.messaging.addMessage({
                output: {
                  generic: [
                    {
                      response_type: MessageResponseTypes.TEXT,
                      text: MARKDOWN_WITH_TABLE_AND_CODE,
                    },
                  ],
                },
              });
            },
          }}
        />,
      );

      const customElement = await waitFor(() =>
        container.querySelector("cds-aichat-react"),
      );

      expect(customElement).toBeTruthy();

      // Wait for Lit rendering
      if (typeof (customElement as any).updateComplete !== "undefined") {
        await (customElement as any).updateComplete;
      }

      const shadowRoot = await openChat(customElement as Element);

      expect(shadowRoot).toBeTruthy();

      try {
        if (typeof (customElement as any).updateComplete !== "undefined") {
          await (customElement as any).updateComplete;
        }

        const messageElement = await waitFor(() => {
          const element = shadowRoot.querySelector(".cds-aichat--message");
          if (!element) {
            throw new Error("Message not rendered yet");
          }
          return element;
        });

        expect(messageElement).toBeTruthy();

        const mainPanel = await waitFor(() => {
          const element = shadowRoot.querySelector(
            `[data-testid="${PageObjectId.MAIN_PANEL}"]`,
          ) as HTMLElement | null;
          if (!element) {
            throw new Error("Main panel not rendered yet");
          }
          return element;
        });

        const markdownElement = await waitFor(() => {
          const element = mainPanel.querySelector(
            "cds-aichat-markdown",
          ) as HTMLElement | null;
          if (!element || !(element as any).shadowRoot) {
            throw new Error("Markdown component not rendered yet");
          }
          return element;
        });

        const markdownShadow = (markdownElement as any)
          .shadowRoot as ShadowRoot;

        const tableElement = await waitFor(
          () => {
            const element = markdownShadow.querySelector(
              "cds-aichat-table",
            ) as HTMLElement | null;
            if (!element) {
              throw new Error("Markdown table not rendered yet");
            }
            return element;
          },
          { timeout: 60000 },
        );

        expect(tableElement).toBeTruthy();

        if (typeof (tableElement as any).updateComplete !== "undefined") {
          await (tableElement as any).updateComplete;
        }

        // The code-snippet lives inside the markdown component as well, so query the same
        // shadow root and ensure CodeMirror successfully hydrated (even though it is mocked).
        const codeSnippetElement = await waitFor(
          () => {
            const element = markdownShadow.querySelector(
              "cds-aichat-code-snippet",
            ) as HTMLElement | null;
            if (!element) {
              throw new Error("Code snippet not rendered yet");
            }
            return element;
          },
          { timeout: 60000 },
        );

        expect(codeSnippetElement).toBeTruthy();

        if (typeof (codeSnippetElement as any).updateComplete !== "undefined") {
          await (codeSnippetElement as any).updateComplete;
        }
      } finally {
        await closeChat(customElement as Element);
      }
    },
    TEST_TIMEOUT,
  );

  it(
    "should render conversational search citations using the carousel",
    async () => {
      // Capture the ChatContainer instance via onBeforeRender so we can inject a mocked
      // conversational-search payload and verify the resulting carousel UI.
      let instanceRef: ChatInstance | null = null;
      const { container } = await renderChatContainer(
        <ChatContainer
          openChatByDefault
          onBeforeRender={(instance) => {
            instanceRef = instance;
          }}
          messaging={{
            skipWelcome: true,
            customSendMessage() {
              return Promise.resolve();
            },
          }}
        />,
      );

      const customElement = (await waitForChatElement(
        container as HTMLElement,
      )) as Element;
      const shadowRoot = await openChat(customElement);
      try {
        // Simulate the full user journey: type a query, wait for our captured instance,
        // then push the conversational-search message into the stream.
        await sendUserMessage(shadowRoot, "Show conversational search");
        await waitFor(() => instanceRef !== null, {
          timeout: WAIT_FOR_TIMEOUT,
        });
        await act(async () => {
          await instanceRef?.messaging.addMessage({
            id: "conversational-search-test",
            output: {
              generic: [CONVERSATIONAL_SEARCH_RESPONSE],
            },
          });
          if (typeof (customElement as any).updateComplete !== "undefined") {
            await (customElement as any).updateComplete;
          }
        });
        const citationsToggle = await waitFor(
          () => {
            const toggle = shadowRoot.querySelector(
              `[aria-label="${CITATIONS_TOGGLE_ARIA_LABEL}"]`,
            ) as HTMLElement | null;
            if (!toggle) {
              throw new Error("Citations toggle not rendered yet");
            }
            return toggle;
          },
          { timeout: WAIT_FOR_TIMEOUT },
        );
        expect(citationsToggle).toBeTruthy();

        await act(async () => {
          citationsToggle.click();
          if (typeof (customElement as any).updateComplete !== "undefined") {
            await (customElement as any).updateComplete;
          }
        });

        // Once the toggle is active, the carousel becomes visible inside the citations
        // region. Waiting for the region also verifies that Swiper dependencies loaded.
        const citationsRegion = await waitFor(
          () =>
            shadowRoot.querySelector(
              ".cds-aichat--conversational-search-citations",
            ),
          { timeout: WAIT_FOR_TIMEOUT },
        );
        expect(citationsRegion).toBeTruthy();
        expect(citationsRegion?.querySelector(".swiper")).toBeTruthy();
        await new Promise((resolve) => setTimeout(resolve, 100));
      } finally {
        await closeChat(customElement);
      }
    },
    TEST_TIMEOUT,
  );
});
