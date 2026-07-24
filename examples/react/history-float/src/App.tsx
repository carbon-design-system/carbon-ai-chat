/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History (float)
 *
 * Demonstrates: enabling the built-in history feature via `history.isOn`,
 * supplying `customLoadHistory`, and rendering a custom conversation picker
 * inside the `historyPanelElement` writeable-element slot. This example is
 * intentionally on the float / launcher layout (see also
 * `history-fullscreen`).
 *
 * APIs exercised:
 *   - `ChatContainer`
 *   - `PublicConfig.history.isOn`
 *   - `PublicConfig.messaging.customLoadHistory`
 *   - `renderWriteableElements.historyPanelElement`
 *
 * Start reading at: `App()` and the `loadChat` callback.
 */

import { ChatContainer, ChatInstance, PublicConfig } from "@carbon/ai-chat";
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

import { ChatHistoryExample } from "./ChatHistoryExample";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
  // Opt into the built-in history feature so the chat will request and render
  // prior conversations through `customLoadHistory`.
  history: {
    isOn: true,
  },
};

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);

  function onBeforeRender(instance: ChatInstance) {
    setInstance(instance);
  }

  const loadChat = useCallback(
    async (event: CustomEvent) => {
      if (!instance) {
        return;
      }
      const requestText = event.detail.itemName;
      const historyData = await customLoadHistory(instance, requestText);

      // Wipe the active conversation before injecting the selected history so
      // `insertHistory` does not append to whatever was already on screen.
      await instance.messaging.clearConversation();
      instance.messaging.insertHistory(historyData);
    },
    [instance],
  );

  const historyWriteableElementExample = useMemo(
    () => (
      <ChatHistoryExample
        instance={instance as ChatInstance}
        loadChat={loadChat}
      />
    ),
    [instance, loadChat],
  );

  const renderWriteableElements = useMemo(() => {
    return {
      // Project the custom conversation picker into the built-in history panel
      // slot so the launcher's history button opens this UI.
      historyPanelElement: historyWriteableElementExample,
    };
  }, [historyWriteableElementExample]);

  return (
    <ChatContainer
      {...config}
      onBeforeRender={onBeforeRender}
      renderWriteableElements={renderWriteableElements}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
