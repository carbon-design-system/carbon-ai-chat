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
  BusEventType,
} from "@carbon/ai-chat";
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

// These functions hook up to your back-end.
import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

// This function returns a React component for user defined responses.
import { renderUserDefinedResponse } from "./renderUserDefinedResponse";

import { ChatHistoryExample } from "./ChatHistoryExample";

const config: PublicConfig = {
  history: {
    isOn: true,
  },
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
  layout: {
    showFrame: false,
    customProperties: {
      "messages-max-width": `max(60vw, 672px)`,
    },
  },
  openChatByDefault: true,
  injectCarbonTheme: CarbonTheme.WHITE,
};

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  function onBeforeRender(instance: ChatInstance) {
    setInstance(instance);

    // Initialize isMobile from current state
    const initialIsMobile = instance.getState().customPanels.history.isMobile;
    setIsMobile(initialIsMobile);

    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        if (
          event.previousState?.customPanels.history.isMobile !==
          event.newState?.customPanels.history.isMobile
        ) {
          setIsMobile(event.newState?.customPanels.history.isMobile);
        }
      },
    });
  }

  const loadChat = useCallback(
    async (event: CustomEvent) => {
      if (!instance) {
        return;
      }
      const requestText = event.detail.itemName;
      const historyData = await customLoadHistory(instance, requestText);

      await instance.messaging.clearConversation();
      instance.messaging.insertHistory(historyData);
    },
    [instance],
  );

  const historyWriteableElementExample = useMemo(
    () => (
      <ChatHistoryExample
        instance={instance as ChatInstance}
        isMobile={isMobile}
        loadChat={loadChat}
      />
    ),
    [instance, isMobile, loadChat],
  );

  const renderWriteableElements = useMemo(() => {
    return {
      historyPanelElement: historyWriteableElementExample,
    };
  }, [historyWriteableElementExample]);

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
