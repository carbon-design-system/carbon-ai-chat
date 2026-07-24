/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Chain of thought
 *
 * Demonstrates: shipping a complete `chain_of_thought` array on the final
 * response so the chat surfaces a tool-trace drawer with each step's
 * `request`, `response`, and `status`. Unlike reasoning steps, chain of
 * thought is intended for raw debugging traces and does not stream
 * step-by-step.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `instance.messaging.addMessageChunk`
 *   - `ChainOfThoughtStep`, `ChainOfThoughtStepStatus`
 *
 * Start reading at: `App()`, then `./scenarios.ts` for the runner.
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
