/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History / File attachments (Web components)
 *
 * Demonstrates: an uploaded file surviving a conversation reload. The restored
 * history includes a request whose `structured_data` carries a `file`-typed field,
 * and the chat renders it as a chip in that message's bubble — the same chip the
 * user saw when they sent it.
 *
 * Reload the page: the attachment is still there, because it lives on the message
 * rather than in any upload-specific storage.
 *
 * Note that `upload` is deliberately not configured here. This example is about the
 * restore, so the history is host-authored rather than produced by a live upload;
 * see the `prompt-line-file-upload` example for the upload flow itself.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` (custom element)
 *   - `PublicConfig.messaging.customLoadHistory` (see `./customLoadHistory.ts`)
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *
 * Start reading at: `./customLoadHistory.ts`, which holds the attachment fixture,
 * then the `config` constant below.
 */

import '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js';

import { type PublicConfig } from '@carbon/ai-chat';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import { customLoadHistory } from './customLoadHistory';
import { customSendMessage } from './customSendMessage';

const config: PublicConfig = {
  messaging: {
    // Called once on boot. Whatever this returns becomes the transcript, so the
    // attachment chip is rendered straight from the restored message.
    customLoadHistory,
    customSendMessage,
  },
  layout: {
    // Hide the default rounded chat frame so the chat fills the host element.
    showFrame: false,
  },
  // Open on mount so the restored conversation is visible without clicking a
  // launcher first.
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

  render() {
    return html`
      <cds-aichat-custom-element
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        class="chat-custom-element"></cds-aichat-custom-element>
    `;
  }
}
