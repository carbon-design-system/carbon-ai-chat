/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Vite + Vitest
 *
 * Demonstrates: building Carbon AI Chat with a Vite dev server (instead of
 * webpack) and exercising it under Vitest with happy-dom. The "one thing"
 * demonstrated by this example is the Vite + Vitest integration, not a chat
 * feature.
 *
 * APIs exercised:
 *   - `ChatContainer` (the chat surface — kept minimal so the framework
 *     glue is the focus)
 *   - Vitest harness (see `./__tests__/`)
 *
 * Start reading at: `./main.tsx` for the bootstrap, then `./__tests__/`
 * for the suite.
 */

import { ChatContainer, PublicConfig } from "@carbon/ai-chat";
import React from "react";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  // a `customSendMessage` keeps the example self-contained — Vite's dev
  // server can serve the page without a backend, and Vitest can drive the
  // same component tree without mocking network calls.
  messaging: {
    customSendMessage,
  },
};

function App() {
  return <ChatContainer {...config} />;
}

export { App };
