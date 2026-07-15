/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — File upload
 *
 * Demonstrates: enabling the file-attachment button via `upload.is_on` and
 * wiring an `onFileUpload` handler so attached files become
 * `ExternalFileReference` payloads on the next user message.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.upload.is_on`
 *   - `PublicConfig.upload.onFileUpload` (see `./mockOnFileUpload.ts`)
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *
 * Start reading at: the `config` constant below, then `./mockOnFileUpload.ts`.
 */

import { ChatCustomElement, PublicConfig } from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { mockOnFileUpload } from "./mockOnFileUpload";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    // Route outbound messages to a local handler so the example runs without a backend.
    customSendMessage,
  },
  upload: {
    // Enables the paperclip attachment button in the input area.
    is_on: true,
    // Per-file upload handler; resolves to a StructuredData payload that becomes a user-message attachment.
    onFileUpload: mockOnFileUpload,
  },
  layout: {
    // Removes the default chat frame so the embedded fullscreen layout fills the host element.
    showFrame: false,
  },
  // Auto-opens the chat on load so the example is interactive without a launcher click.
  openChatByDefault: true,
};

function App() {
  return <ChatCustomElement className="chat-custom-element" {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
