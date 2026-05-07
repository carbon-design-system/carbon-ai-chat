/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — watsonx.ai (Web components)
 *
 * Demonstrates: wiring `customSendMessage` to a real watsonx.ai endpoint
 * via a local Express proxy and streaming SSE tokens back through
 * `instance.messaging.addMessageChunk`.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *   - `instance.messaging.addMessageChunk`
 *
 * Start reading at: the `config` constant and `./customSendMessage.ts`.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import { type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    // Route every user message through the watsonx.ai SSE bridge instead of the default backend.
    customSendMessage,
  },
  layout: {
    // Hide the chat frame so the embedded element fills the host viewport in this fullscreen demo.
    showFrame: false,
  },
  // Open immediately so first-time visitors see the streaming demo without an extra click.
  openChatByDefault: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  render() {
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
      ></cds-aichat-custom-element>
    `;
  }
}
