/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CarbonTheme,
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

// These functions hook up to your back-end.
import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

// This function returns a React component for user defined responses.
import { renderUserDefinedResponse } from "./renderUserDefinedResponse";

import { ChatHistoryExample } from "./ChatHistoryExample";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
  layout: {
    showFrame: false,
    customProperties: {
      "messages-max-width": `max(60vw, 672px)`,
    },
    showHistory: true,
  },
  openChatByDefault: true,
  injectCarbonTheme: CarbonTheme.WHITE,
};

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);

  function onBeforeRender(instance: ChatInstance) {
    setInstance(instance);
  }

  const loadChat = async (event: CustomEvent) => {
    if (!instance) {
      return;
    }
    const requestText = event.detail.itemTitle;
    const historyData = await customLoadHistory(instance, requestText);

    await instance.messaging.clearConversation();
    instance.messaging.insertHistory(historyData);
  };

  const renderWriteableElements = useMemo(() => {
    if (!instance) {
      return { historyPanelElement: null };
    }

    const chatHistory = (
      <ChatHistoryExample
        showCloseAction={false}
        searchOff={false}
        headerTitle="Conversations"
        loadChat={loadChat}
      />
    );

    return { historyPanelElement: chatHistory };
  }, [instance, loadChat]);

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      onBeforeRender={onBeforeRender}
      renderUserDefinedResponse={renderUserDefinedResponse}
      renderWriteableElements={renderWriteableElements}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
