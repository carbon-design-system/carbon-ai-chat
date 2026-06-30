/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — watsonx.ai
 *
 * Demonstrates: wiring `customSendMessage` to a real watsonx.ai endpoint via
 * a local Express proxy that handles IAM auth and CORS, then streaming SSE
 * tokens back through `instance.messaging.addMessageChunk`.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *   - `instance.messaging.addMessageChunk` (streaming chunks)
 *
 * Start reading at: `App()`, then `./customSendMessage.ts` for the SSE plumbing.
 */

import { ChatCustomElement, PublicConfig } from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // render the chat without the default chrome frame so the embedded
    // ChatCustomElement fills its host container edge-to-edge.
    showFrame: false,
  },
  // surface the chat immediately on load — this example is a single-purpose
  // demo so there is no separate launcher to click.
  openChatByDefault: true,
};

function App() {
  return <ChatCustomElement className="chat-custom-element" {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
