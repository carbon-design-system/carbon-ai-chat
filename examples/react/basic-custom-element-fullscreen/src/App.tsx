/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom element (Fullscreen) (React)
 *
 * Demonstrates: rendering Carbon AI Chat as a fullscreen surface by mounting
 * `ChatCustomElement` with the chat frame disabled and the conversation open
 * from first paint. This is the canonical baseline for non-float examples.
 *
 * APIs exercised:
 *   - `ChatCustomElement` from `@carbon/ai-chat`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *
 * Start reading at: the `config` constant below, then `App()`.
 */

import { ChatCustomElement, PublicConfig } from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    // Wire a client-side mock so the example runs with no backend; swap this
    // for a real handler that calls your service in production.
    customSendMessage,
  },
  layout: {
    // Hide the default chat frame so the custom element fills its host
    // container — required for the canonical fullscreen surface.
    showFrame: false,
  },
  // Auto-open the conversation on mount so readers land in the chat view
  // rather than having to click a launcher first.
  openChatByDefault: true,
};

function App() {
  return <ChatCustomElement className="chat-custom-element" {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
