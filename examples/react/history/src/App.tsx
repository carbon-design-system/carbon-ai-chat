/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CarbonTheme,
  ChatContainer,
  ChatInstance,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";
// This function returns a React component for user defined responses.
import { renderUserDefinedResponse } from "./renderUserDefinedResponse";
import { Button } from "@carbon/react";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
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
    const randomCount = Math.floor(Math.random() * 81) + 20; // Random number between 20 and 100
    const historyData = await customLoadHistory(chatInstance, randomCount);

    chatInstance.messaging.clearConversation();
    chatInstance.messaging.insertHistory(historyData);
  }

  return (
    <>
      {chatInstance && (
        <Button onClick={injectHistory}>Insert a different conversation</Button>
      )}
      <ChatContainer
        messaging={config.messaging}
        onBeforeRender={onBeforeRender}
        renderUserDefinedResponse={renderUserDefinedResponse}
      />
    </>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
