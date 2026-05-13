/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History (float) (Web components)
 *
 * Demonstrates: enabling the built-in history feature (`history.isOn`),
 * supplying `customLoadHistory`, and rendering a custom conversation
 * picker inside the `historyPanelElement` writeable-element slot. This
 * example is intentionally on the float / launcher layout (see also
 * `history-fullscreen`).
 *
 * APIs exercised:
 *   - `<cds-aichat-container>`
 *   - `PublicConfig.history.isOn`
 *   - `PublicConfig.messaging.customLoadHistory`
 *   - `historyPanelElement` slot
 *
 * Start reading at: `_loadChat` and `renderWriteableElementSlots()`.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";
import "./history-writeable-element-example";

import { type ChatInstance, type PublicConfig } from "@carbon/ai-chat";
import { html, LitElement, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { customLoadHistory } from "./customLoadHistory";

const config: PublicConfig = {
  history: {
    // Enables the built-in history feature so the chat will request prior conversations through `customLoadHistory`.
    isOn: true,
  },
  messaging: {
    // Routes user input through the local mock back-end. Replace with a real production implementation.
    customSendMessage,
    // Supplies past conversation turns when the user picks a chat from the writeable history panel. Replace with a real production implementation.
    customLoadHistory,
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css``;

  @state()
  accessor instance!: ChatInstance;

  // Captures the `ChatInstance` so the host element can reach into `messaging` and `customPanels` from event handlers below.
  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  /**
   * Handles loading a new chat history.
   */
  _loadChat = async (event: CustomEvent) => {
    if (!this.instance) {
      return;
    }
    const requestText = event.detail.chatName;
    const historyData = await customLoadHistory(this.instance, requestText);

    // Clear before insert so the existing conversation does not interleave with the freshly loaded history.
    await this.instance.messaging.clearConversation();
    this.instance.messaging.insertHistory(historyData);
  };

  renderWriteableElementSlots() {
    // Bail until `onBeforeRender` has supplied the instance; the slot child needs `instance` to function.
    if (!this.instance) {
      return null;
    }

    // The `historyPanelElement` slot name is the documented contract for replacing the built-in history panel.
    const key = "historyPanelElement";

    return html`
      <div slot=${key}>
        <history-writeable-element-example
          location=${key}
          .instance=${this.instance}
          .isMobile=${this.instance?.getState().customPanels.history.isMobile ??
          false}
          @history-panel-load-chat=${this._loadChat}
        ></history-writeable-element-example>
      </div>
    `;
  }

  render() {
    return html`
      <cds-aichat-container
        .config=${config}
        .onBeforeRender=${this.onBeforeRender}
        >${this.renderWriteableElementSlots()}</cds-aichat-container
      >
    `;
  }
}
