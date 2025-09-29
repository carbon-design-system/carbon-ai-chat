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

// These functions hook up to your back-end.
import { customSendMessage } from "./customSendMessage";

/**
 * It is preferable to create your configuration object outside of your React functions. You can also make use of
 * useCallback or useMemo if you need to put it inside.
 *
 * Either way, this will prevent you from spinning up a new config object over and over. Carbon AI Chat will run
 * a diff on the config object and if it is not deeply equal, the chat will be re-started.
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
