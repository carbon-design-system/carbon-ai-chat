/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom element (Fullscreen) (Web components)
 *
 * Demonstrates: rendering Carbon AI Chat as a fullscreen surface by mounting
 * `<cds-aichat-custom-element>` with the chat frame disabled and the
 * conversation open from first paint. This is the canonical baseline for
 * non-float Lit examples.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` (custom element)
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *
 * Start reading at: the `config` constant and `render()` below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import { type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    // route outbound messages through a client-side mock so this example runs
    // without a back end; see `./customSendMessage.ts`.
    customSendMessage,
  },
  layout: {
    // hide the default rounded chat frame so the chat fills the host element
    // edge-to-edge — required for the fullscreen baseline pattern.
    showFrame: false,
    customProperties: {
      // widen the message column past the floating-window default so long-form
      // content (tables, code blocks) has room to breathe at fullscreen widths.
      "messages-max-width": `max(60vw, 672px)`,
    },
  },
  // skip the launcher/closed state — at fullscreen there is no "closed" UI to
  // reveal, so the conversation must be visible from first paint.
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
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        class="chat-custom-element"
      ></cds-aichat-custom-element>
    `;
  }
}
