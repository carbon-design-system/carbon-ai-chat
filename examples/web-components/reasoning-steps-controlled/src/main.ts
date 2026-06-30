/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Reasoning steps (controlled) (Web components)
 *
 * Demonstrates: a controlled reasoning-step flow where the host drives the
 * in-progress affordance with `instance.updateIsMessageLoadingCounter` and the
 * parent `reasoning.open_state` is held `CLOSE` so the panel stays collapsed
 * even though every individual step inside is marked `OPEN`.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `instance.messaging.addMessageChunk` (reasoning chunks)
 *   - `instance.updateIsMessageLoadingCounter` (custom loading affordance)
 *   - `ReasoningStepOpenState` (controlled open/closed state)
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
