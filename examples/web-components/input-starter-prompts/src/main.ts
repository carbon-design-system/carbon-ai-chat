/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Input-field starter prompts (Web components)
 *
 * Demonstrates: registering a `SuggestionType.STARTER` entry on
 * `input.suggestions` so a curated list of prompt seeds appears when the
 * user focuses an empty input. The list disappears once `BusEventType.SEND`
 * fires.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` (canonical fullscreen baseline)
 *   - `PublicConfig.input.suggestions` + `SuggestionType.STARTER`
 *   - `BusEventType.SEND` for one-time gating
 *
 * Start reading at: the `config` getter and the `Demo` element below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  BusEventType,
  CarbonTheme,
  type ChatInstance,
  type PublicConfig,
  SuggestionType,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { STARTER_PROMPTS } from "./suggestions";

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  // One-shot latch flipped by the first `BusEventType.SEND`; the suggestions
  // resolver reads it to ensure starter prompts only appear before the user
  // has spoken once in the session.
  @state()
  accessor hasSent = false;

  onBeforeRender = (instance: ChatInstance) => {
    // Subscribe to `BusEventType.SEND` so we can latch `hasSent` the moment
    // the user submits their first message and stop returning starter prompts.
    instance.on({
      type: BusEventType.SEND,
      handler: () => {
        this.hasSent = true;
      },
    });
  };

  get config(): PublicConfig {
    return {
      messaging: { customSendMessage },
      // Pin the Carbon theme so the demo renders predictably regardless of
      // the host page's theme tokens.
      injectCarbonTheme: CarbonTheme.WHITE,
      layout: {
        // Drop the chat frame so the custom element fills the viewport like a
        // fullscreen assistant surface.
        showFrame: false,
      },
      // Auto-open so the starter prompts are visible without an extra click.
      openChatByDefault: true,
      input: {
        // Register a single `SuggestionType.STARTER` entry; the resolver gates
        // on `hasSent` so prompts vanish after the first send and never reappear.
        suggestions: [
          {
            type: SuggestionType.STARTER,
            items: async () => (this.hasSent ? [] : STARTER_PROMPTS),
          },
        ],
      },
    };
  }

  render() {
    const cfg = this.config;
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${cfg.messaging}
        .input=${cfg.input}
        .injectCarbonTheme=${cfg.injectCarbonTheme}
        .layout=${cfg.layout}
        .openChatByDefault=${cfg.openChatByDefault}
      ></cds-aichat-custom-element>
    `;
  }
}
