/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import {
  CarbonTheme,
  type ChatInstance,
  type PublicConfig,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
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

  render() {
    return html`
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .injectCarbonTheme=${config.injectCarbonTheme}
      ></cds-aichat-container>
    `;
  }
}
