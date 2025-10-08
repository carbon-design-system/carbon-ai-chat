/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./styles.css";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import {
  CarbonTheme,
  type ChatInstance,
  type PublicConfig,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
};

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor instance!: ChatInstance;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  async injectHistory() {
    if (!this.instance) {
      return;
    }

    const randomCount = Math.floor(Math.random() * 81) + 20; // Random number between 20 and 100
    const historyData = await customLoadHistory(this.instance, randomCount);

    this.instance.messaging.clearConversation();
    this.instance.messaging.insertHistory(historyData);
  }

  render() {
    return html`
      ${this.instance
        ? html`<button @click=${this.injectHistory}>
            Insert a different conversation
          </button>`
        : ""}
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .injectCarbonTheme=${config.injectCarbonTheme}
      ></cds-aichat-container>
    `;
  }
}
