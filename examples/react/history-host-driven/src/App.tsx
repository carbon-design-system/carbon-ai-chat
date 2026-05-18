/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History (host-driven)
 *
 * Demonstrates: rehydrating the chat from a host-supplied history payload by
 * pairing `customLoadHistory` with manual calls to
 * `instance.messaging.clearConversation()` + `instance.messaging.insertHistory()`
 * triggered from a host button.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.messaging.customLoadHistory` (see `./customLoadHistory.ts`)
 *   - `ChatInstance.messaging.clearConversation` / `insertHistory`
 *
 * Start reading at: `App()` then `injectHistory()`.
 */

import { ChatCustomElement, ChatInstance, PublicConfig } from "@carbon/ai-chat";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";
import { Button } from "@carbon/react";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
  layout: {
    // Render the chat without the default Carbon AI Chat window chrome so the host page owns the surrounding layout.
    showFrame: false,
  },
  // Open the chat immediately on load so the example surface is interactive without a launcher click.
  openChatByDefault: true,
};

function App() {
  const [chatInstance, setChatInstance] = useState<ChatInstance>();
  function onBeforeRender(instance: ChatInstance) {
    setChatInstance(instance);
  }

  async function injectHistory() {
    if (!chatInstance) {
      return;
    }
    const randomCount = Math.floor(Math.random() * 81) + 20;
    const historyData = await customLoadHistory(chatInstance, randomCount);

    // Clear before insert; insertHistory appends to the existing conversation, so skipping clearConversation would stack history payloads.
    await chatInstance.messaging.clearConversation();
    chatInstance.messaging.insertHistory(historyData);
  }

  return (
    <div className="history-example-host">
      {chatInstance && (
        <Button onClick={injectHistory}>Insert a different conversation</Button>
      )}
      <ChatCustomElement
        className="chat-custom-element"
        {...config}
        onBeforeRender={onBeforeRender}
      />
    </div>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
