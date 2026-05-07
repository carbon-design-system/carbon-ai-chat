/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom element (lazy load) (Web components)
 *
 * Demonstrates: dynamically importing the
 * `<cds-aichat-custom-element>` bundle so it is fetched only when the
 * chat is actually about to render, with `<cds-aichat-shell>` providing
 * a crossfade fallback covering both bundle download and chat
 * initialization.
 *
 * APIs exercised:
 *   - Dynamic `import()` of the chat custom-element bundle
 *   - `<cds-aichat-shell>` (overlay shown during bundle + init)
 *
 * Start reading at: the `Demo` element below and the lazy import.
 */

import "@carbon/ai-chat-components/es/components/chat-shell/index.js";

import { type ChatInstance, type PublicConfig } from "@carbon/ai-chat";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    // Routes outbound messages through the local mock so the example renders without a real back-end.
    customSendMessage,
  },
  layout: {
    // Hides the default chrome so the chat blends into the host page styling.
    showFrame: false,
  },
  // The chat is the entire page in this demo, so it opens immediately rather than waiting for a launcher click.
  openChatByDefault: true,
  // The launcher button is suppressed because the chat is always rendered inline as a custom element.
  launcher: { isOn: false },
  // Minimizing has no meaning when the chat owns the viewport, so the button is hidden.
  header: { hideMinimizeButton: true },
};

@customElement("my-app")
export class Demo extends LitElement {
  // Disable shadow DOM so global CSS classes from index.html apply to the
  // cds-aichat-custom-element and cds-aichat-shell host elements.
  createRenderRoot() {
    return this;
  }

  // True once the cds-aichat-custom-element bundle has been imported.
  @state()
  accessor _chatLoaded = false;

  // True once onAfterRender fires — signals the chat is fully initialized.
  @state()
  accessor _chatReady = false;

  connectedCallback() {
    super.connectedCallback();
    void this._loadChat();
  }

  // Dynamically import the custom element bundle so it is only fetched when the chat is about to render.
  async _loadChat() {
    // The 3000 ms delay makes the lazy-loading behavior obvious on localhost and should be removed in a real implementation.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // The dynamic import keeps the chat bundle out of the initial page download and only fetches it when the chat is about to render.
    await import("@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js");
    this._chatLoaded = true;
  }

  // onAfterRender is the earliest signal that the chat is fully initialized and safe to crossfade the loading shell out.
  _onAfterRender = (_instance: ChatInstance) => {
    this._chatReady = true;
  };

  // The shell renders on top of the chat element until onAfterRender fires, producing a crossfade that hides both bundle download and chat initialization.
  render() {
    return html`
      ${this._chatLoaded
        ? html`
            <cds-aichat-custom-element
              class="chat-custom-element"
              .messaging=${config.messaging}
              .layout=${config.layout}
              .openChatByDefault=${config.openChatByDefault}
              .launcher=${config.launcher}
              .header=${config.header}
              .onAfterRender=${this._onAfterRender}
            ></cds-aichat-custom-element>
          `
        : nothing}
      ${!this._chatReady
        ? html`
            <cds-aichat-shell
              class="chat-custom-element chat-custom-element-loading"
              ai-enabled
            ></cds-aichat-shell>
          `
        : nothing}
    `;
  }
}
