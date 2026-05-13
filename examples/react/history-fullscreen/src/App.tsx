/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History (fullscreen) (React)
 *
 * Demonstrates: the same history-panel pattern as `history-float`,
 * but on the fullscreen `ChatCustomElement` baseline. Adds a
 * `STATE_CHANGE` subscription on `customPanels.history.isMobile` so the
 * custom history panel can adapt its layout responsively.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.history.isOn`
 *   - `PublicConfig.messaging.customLoadHistory`
 *   - `BusEventType.STATE_CHANGE` for `customPanels.history.isMobile`
 *
 * Start reading at: `App()` and the `STATE_CHANGE` handler in
 * `onBeforeRender`.
 */

import {
  BusEvent,
  BusEventStateChange,
  BusEventType,
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

import { ChatHistoryExample } from "./ChatHistoryExample";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  history: {
    // opt into the persisted-conversation feature so `customLoadHistory` is invoked and the history panel is rendered.
    isOn: true,
  },
  messaging: {
    customSendMessage,
    // provides the conversation transcript when a history item is selected; without this the panel cannot rehydrate a chat.
    customLoadHistory,
  },
  layout: {
    // drop the chrome/border so the chat fills the host element edge-to-edge in this fullscreen baseline.
    showFrame: false,
    customProperties: {
      // widen the message column on large viewports while keeping a sensible minimum on small ones.
      "messages-max-width": `max(60vw, 672px)`,
    },
  },
  // the example is a dedicated chat surface, so the chat is visible immediately without a launcher click.
  openChatByDefault: true,
};

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  function onBeforeRender(instance: ChatInstance) {
    setInstance(instance);

    const initialIsMobile = instance.getState().customPanels.history.isMobile;
    setIsMobile(initialIsMobile);

    // subscribe to BusEventType.STATE_CHANGE so the writeable history panel can re-render when `customPanels.history.isMobile` flips between desktop and mobile breakpoints.
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: BusEvent) => {
        const { previousState, newState } = event as BusEventStateChange;
        if (
          previousState?.customPanels.history.isMobile !==
          newState?.customPanels.history.isMobile
        ) {
          setIsMobile(newState?.customPanels.history.isMobile);
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
      renderWriteableElements={renderWriteableElements}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
