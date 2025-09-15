/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BusEventType,
  ChatContainer,
  ChatInstance,
  FeedbackInteractionType,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";
import { renderUserDefinedResponse } from "./renderUserDefinedResponse";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
};

function App() {
  const [chatInstance, setChatInstance] = useState<ChatInstance>();

  function onBeforeRender(instance: ChatInstance) {
    instance.on({ type: BusEventType.FEEDBACK, handler: feedbackHandler });
    setChatInstance(instance);
    console.log({ chatInstance });
  }

  function feedbackHandler(event: any) {
    if (event.interactionType === FeedbackInteractionType.SUBMITTED) {
      const { ...reportData } = event;
      setTimeout(() => {
        window.alert(JSON.stringify(reportData, null, 2));
      });
    }
  }

  return (
    <ChatContainer
      config={config}
      onBeforeRender={onBeforeRender}
      renderUserDefinedResponse={renderUserDefinedResponse}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
