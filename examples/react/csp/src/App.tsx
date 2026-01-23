/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CarbonTheme, ChatContainer, PublicConfig } from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";

// This function hooks up to your back-end.
import { customSendMessage } from "./customSendMessage";

/**
 * Configuration object for the chat component.
 * Created outside of React to prevent unnecessary re-renders.
 */
const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
};

function App() {
  return <ChatContainer {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);

// Made with Bob
