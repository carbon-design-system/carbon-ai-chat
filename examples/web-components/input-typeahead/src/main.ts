/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Typeahead (Web components)
 *
 * Demonstrates: configuring `input.autocomplete` so a curated list filters
 * as the user types and renders in a dropdown above the input.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.autocomplete`
 *   - `autocomplete.items` (resolver returning the filtered list)
 *
 * Start reading at: the `config` constant and the `Demo` element below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import { type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { CANNED_SUGGESTIONS } from "./suggestions";

const config: PublicConfig = {
  // Route every outbound user turn through the local mock so the example runs
  // without a backend; swap this for a real transport in production.
  messaging: { customSendMessage },
  layout: {
    // Hide the default chat frame so the custom element fills its host element
    // edge-to-edge — required for the canonical fullscreen surface.
    showFrame: false,
  },
  // Auto-open the conversation so readers land directly in the input area the
  // example exists to showcase, not a launcher.
  openChatByDefault: true,
  input: {
    // Register an autocomplete provider whose dropdown filters the curated
    // CANNED_SUGGESTIONS list as the user types. There is no trigger
    // character — the list opens whenever the user is typing.
    autocomplete: {
      // Resolver is async so production callers can swap in a network lookup
      // without changing the surrounding shape.
      items: async (query: string) =>
        CANNED_SUGGESTIONS.filter((s) =>
          s.label.toLowerCase().includes(query.toLowerCase()),
        ),
      // Debounce keystrokes so we do not invoke `items` on every character
      // when this resolver is later wired to a remote endpoint.
      debounceMs: 150,
    },
  },
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
        .input=${config.input}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
      ></cds-aichat-custom-element>
    `;
  }
}
