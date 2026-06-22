/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom message footer (React)
 *
 * Demonstrates: rendering your own content beneath an assistant message with
 * the `renderCustomMessageFooter` render prop. The mock backend attaches a
 * `custom_footer_slot` to every reply (see `./customSendMessage.ts`), and this
 * file renders a copy button (`./CustomFooterExample.tsx`) into it.
 *
 * APIs exercised:
 *   - `ChatCustomElement` from `@carbon/ai-chat`
 *   - `RenderCustomMessageFooter` (the `renderCustomMessageFooter` render prop)
 *   - `PublicConfig.layout.showFrame`, `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage`
 *
 * Start reading at: the `config` constant, then `renderCustomMessageFooter`, then `App()`.
 */

import {
  ChatCustomElement,
  PublicConfig,
  RenderCustomMessageFooter,
} from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";

import { CustomFooterExample } from "./CustomFooterExample";
import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";
import "./App.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Fill the host element edge-to-edge instead of floating in the corner.
    showFrame: false,
  },
  openChatByDefault: true,
};

// Called for every message that carries a `custom_footer_slot`. Keep it a thin
// pass-through to a component so React owns the footer's render and lifecycle.
const renderCustomMessageFooter: RenderCustomMessageFooter = (
  slotName,
  message,
  messageItem,
  instance,
  additionalData,
) => (
  <CustomFooterExample
    slotName={slotName}
    message={message}
    messageItem={messageItem}
    instance={instance}
    additionalData={additionalData}
  />
);

function App() {
  return (
    <ChatCustomElement
      className="chat-custom-element"
      renderCustomMessageFooter={renderCustomMessageFooter}
      {...config}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
