/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Chain of thought (Web components)
 *
 * Demonstrates: shipping a complete `chain_of_thought` array on the final
 * response so the chat surfaces a tool-trace drawer with each step's
 * `request`, `response`, and `status`. Unlike reasoning steps, chain of
 * thought is intended for raw debugging traces and does not stream
 * step-by-step.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `instance.messaging.addMessageChunk`
 *   - `ChainOfThoughtStep`, `ChainOfThoughtStepStatus`
 *
 * Start reading at: `./scenarios.ts` for the runner.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import { type ChatInstance, type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    // Route every user turn through the local mock so the example can drive
    // reasoning and chain-of-thought streaming chunks without a backend.
    customSendMessage,
  },
  layout: {
    // Drop the default chrome frame so the chat fills the host element edge to edge.
    showFrame: false,
  },
  // Open the chat immediately so the reasoning scenarios are visible on load.
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

  @state()
  accessor instance!: ChatInstance;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  render() {
    return html`
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
