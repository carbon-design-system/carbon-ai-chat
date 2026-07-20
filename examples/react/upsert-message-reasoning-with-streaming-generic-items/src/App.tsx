/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatCustomElement, PublicConfig } from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { renderUserDefinedResponse } from "./renderUserDefinedResponse";
import "@carbon/styles/css/styles.css";
import "./reasoning-summary.css";

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
  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      renderUserDefinedResponse={renderUserDefinedResponse}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
