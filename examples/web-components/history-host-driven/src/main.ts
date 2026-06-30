/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History (host-driven) (Web components)
 *
 * Demonstrates: rehydrating the chat from a host-supplied history payload
 * by pairing `customLoadHistory` with manual calls to
 * `instance.messaging.clearConversation()` + `insertHistory()` triggered
 * from a host button.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.messaging.customLoadHistory`
 *   - `ChatInstance.messaging.clearConversation` / `insertHistory`
 *
 * Start reading at: `injectHistory()` and the `Demo` element below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import { type ChatInstance, type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    // Routes outbound messages to a local mock back-end so the example runs
    // without any server dependency.
    customSendMessage,
    // Supplies the initial conversation that hydrates the chat on mount and
    // is the focus of this example.
    customLoadHistory,
  },
  layout: {
    // The custom element renders inside a host-controlled flex container, so
    // the chat's own bordered frame is suppressed to avoid double chrome.
    showFrame: false,
  },
  // Open immediately so the rehydrated conversation is visible without an
  // extra click when the page loads.
  openChatByDefault: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
    }
    .chat-custom-element {
      flex: 1 1 auto;
      min-height: 0;
    }
  `;

  @state()
  accessor instance!: ChatInstance;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  async injectHistory() {
    if (!this.instance) {
      return;
    }

    // Pick a length between 20 and 100 so each click produces a visibly
    // different transcript and exercises a range of history sizes.
    const randomCount = Math.floor(Math.random() * 81) + 20;
    const historyData = await customLoadHistory(this.instance, randomCount);

    // `insertHistory` appends to existing messages, so the conversation must
    // be cleared first to fully replace the transcript rather than stack onto it.
    await this.instance.messaging.clearConversation();
    this.instance.messaging.insertHistory(historyData);
  }

  render() {
    return html`
      ${this.instance
        ? html`<button @click=${this.injectHistory}>
            Insert a different conversation
          </button>`
        : ""}
      <cds-aichat-custom-element
        class="chat-custom-element"
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
      ></cds-aichat-custom-element>
    `;
  }
}
