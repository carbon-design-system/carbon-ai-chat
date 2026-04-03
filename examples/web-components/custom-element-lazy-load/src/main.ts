/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat-components/es/components/chat-shell/index.js";

import {
  CarbonTheme,
  type ChatInstance,
  type PublicConfig,
} from "@carbon/ai-chat";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    showFrame: false,
  },
  openChatByDefault: true,
  launcher: { isOn: false },
  header: { hideMinimizeButton: true },
  injectCarbonTheme: CarbonTheme.WHITE,
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

  // Dynamically import the custom element bundle, mirroring React.lazy.
  async _loadChat() {
    // The 300 ms delay makes the lazy-loading behavior obvious on localhost and should be removed in a real implementation.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await import("@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js");
    this._chatLoaded = true;
  }

  _onAfterRender = (_instance: ChatInstance) => {
    this._chatReady = true;
  };

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
              .injectCarbonTheme=${config.injectCarbonTheme}
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
