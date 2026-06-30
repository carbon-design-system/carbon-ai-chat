/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatContainer, PublicConfig } from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";

// These functions hook up to your back-end.
import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

/**
 * Define your config outside your React component, or wrap it in useMemo /
 * useCallback if it must live inside.
 *
 * Carbon AI Chat applies config changes in place — a new config object does not
 * restart the chat or your conversation. But a fresh reference on every render
 * makes the chat re-render more than it needs to, and makes any effect you key
 * on the config run every render. Keep the reference stable.
 */
const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
};

function App() {
  return <ChatContainer {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
