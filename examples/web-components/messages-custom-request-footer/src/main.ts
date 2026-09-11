/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom request footer (Web components)
 *
 * Demonstrates: rendering your own content beneath a user message with the
 * `renderCustomRequestFooter` callback. Here it is a copy button, so someone
 * can reuse or edit something they sent earlier.
 *
 * The mock backend (`./customSendMessage.ts`) sends nothing special. Outbound
 * footers need no wire field: the chat mints the slot for every message the
 * user sends, and passing this callback is the whole opt-in.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` (custom element)
 *   - `renderCustomRequestFooter` callback + `RenderCustomRequestFooterState`
 *   - `PublicConfig.layout.showFrame`, `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage`
 *
 * Start reading at: the `config` constant and `render()` below.
 */

import '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js';

import {
  type ChatInstance,
  type PublicConfig,
  type RenderCustomRequestFooterState,
} from '@carbon/ai-chat';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

// Side-effect import registers <copy-request-example>; the type import only
// types the element we create in the render callback below.
import './copy-request-example';
import type CopyRequestExample from './copy-request-example';
import { customSendMessage } from './customSendMessage';

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

@customElement('my-app')
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  // One footer element per slot, kept so the callback below can hand back the
  // same node each time.
  private footers = new Map<string, CopyRequestExample>();

  // Called on every render, once per user message that has a footer slot. The
  // library leaves the DOM alone when you return the element you returned last
  // time, so reuse it rather than creating a new one — a fresh element would be
  // torn down and re-mounted on every update.
  renderCustomRequestFooter = (
    state: RenderCustomRequestFooterState,
    _instance: ChatInstance
  ): HTMLElement | null => {
    let footer = this.footers.get(state.slotName);
    if (!footer) {
      footer = document.createElement(
        'copy-request-example'
      ) as CopyRequestExample;
      this.footers.set(state.slotName, footer);
    }
    footer.message = state.message;
    return footer;
  };

  render() {
    return html`
      <cds-aichat-custom-element
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .renderCustomRequestFooter=${this.renderCustomRequestFooter}
        class="chat-custom-element"></cds-aichat-custom-element>
    `;
  }
}
