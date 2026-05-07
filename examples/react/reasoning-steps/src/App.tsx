/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Reasoning steps (React)
 *
 * Demonstrates: two reasoning-streaming UX patterns — discrete `ReasoningStep`
 * items (the default behavior) and a single long-form `reasoning.content`
 * trace — picked via a dropdown on the welcome message.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `instance.messaging.addMessageChunk` (reasoning chunks)
 *   - `MessageResponseTypes.OPTION` (scenario picker)
 *
 * Start reading at: `App()`, then `./scenarios.ts` for the two runners.
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
    // Render the chat without the default header frame so the canvas is full-bleed.
    showFrame: false,
  },
  // Skip the launcher so the demo lands directly on the chat surface.
  openChatByDefault: true,
};

function App() {
  return <ChatCustomElement className="chat-custom-element" {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
