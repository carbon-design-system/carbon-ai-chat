/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — File upload (Web components)
 *
 * Demonstrates: enabling the file-attachment button via `upload.is_on`
 * and wiring an `onFileUpload` handler so attached files become
 * `ExternalFileReference` payloads on the next user message.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.upload.is_on`
 *   - `PublicConfig.upload.onFileUpload` (see `./mockOnFileUpload.ts`)
 *
 * Start reading at: the `config` constant and `./mockOnFileUpload.ts`.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import { type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { mockOnFileUpload } from "./mockOnFileUpload";

const config: PublicConfig = {
  messaging: {
    // Drive assistant turns from the local `customSendMessage` mock instead
    // of a backend so the example runs without any network dependency.
    customSendMessage,
  },
  upload: {
    // Reveals the paperclip attachment button in the input area; without
    // this the rest of the upload config has no UI affordance to trigger it.
    is_on: true,
    // Invoked once per selected file before the next user turn is sent;
    // its returned `StructuredData` is what carries the file forward.
    onFileUpload: mockOnFileUpload,
  },
  layout: {
    // Drop the chat's window chrome since this example renders the chat
    // as the entire viewport via `cds-aichat-custom-element`.
    showFrame: false,
  },
  // Open the chat immediately on load so the upload affordance is visible
  // without an extra click.
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
        .upload=${config.upload}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
      ></cds-aichat-custom-element>
    `;
  }
}
