/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom message footer (Web components)
 *
 * Demonstrates: rendering your own content beneath an assistant message with
 * the `renderCustomMessageFooter` callback. The mock backend attaches a
 * `custom_footer_slot` to every reply (see `./customSendMessage.ts`), and this
 * file creates a <custom-footer-example> element (`./custom-footer-example.ts`)
 * for each footer slot.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` (custom element)
 *   - `renderCustomMessageFooter` callback + `RenderCustomMessageFooterState`
 *   - `PublicConfig.layout.showFrame`, `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage`
 *
 * Start reading at: the `config` constant and `render()` below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  type ChatInstance,
  type PublicConfig,
  type RenderCustomMessageFooterState,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

// Side-effect import registers <custom-footer-example>; the type import only
// types the element we create in the render callback below.
import "./custom-footer-example";
import type CustomFooterExample from "./custom-footer-example";
import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Fill the host element edge-to-edge instead of floating in the corner.
    showFrame: false,
  },
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

  // Called for every message carrying a `custom_footer_slot`. Create the footer
  // element and hand it the message item plus the backend's `additional_data`;
  // the library tracks the slot and manages the element's lifecycle.
  renderCustomMessageFooter = (
    state: RenderCustomMessageFooterState,
    _instance: ChatInstance,
  ): HTMLElement | null => {
    const footer = document.createElement(
      "custom-footer-example",
    ) as CustomFooterExample;
    footer.messageItem = state.messageItem;
    footer.additionalData = state.additionalData;
    return footer;
  };

  render() {
    return html`
      <cds-aichat-custom-element
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .renderCustomMessageFooter=${this.renderCustomMessageFooter}
        class="chat-custom-element"
      ></cds-aichat-custom-element>
    `;
  }
}
