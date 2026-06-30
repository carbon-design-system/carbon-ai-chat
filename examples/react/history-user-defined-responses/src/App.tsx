/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History + user-defined responses
 *
 * Demonstrates: rehydrating a conversation that contains multiple
 * `user_defined` cards via `customLoadHistory` + `insertHistory`, and
 * showing that `activeResponseId` (read via `instance.getState()` and
 * tracked via `BusEventType.STATE_CHANGE`) correctly identifies only the
 * most-recent card as active across a multi-card view.
 *
 * APIs exercised:
 *   - `ChatCustomElement` from `@carbon/ai-chat`
 *   - `messaging.customLoadHistory` (see `./customLoadHistory.ts`)
 *   - `instance.messaging.clearConversation` / `insertHistory`
 *   - `renderUserDefinedResponse` (see `./renderUserDefinedResponse.tsx`)
 *   - `BusEventType.STATE_CHANGE` for `activeResponseId`
 *   - `MessageResponseTypes.USER_DEFINED` (see `./customSendMessage.ts`)
 *
 * Start reading at: `App()` then `onBeforeRender`.
 */

import {
  BusEvent,
  BusEventStateChange,
  BusEventType,
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";
import { renderUserDefinedResponseFactory } from "./renderUserDefinedResponse";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    // Registered so it can be called from onBeforeRender; the example drives the rehydration manually rather than enabling history.isOn (which would also pull in the history-panel UI).
    customLoadHistory,
  },
  layout: {
    // Hide the default chat frame chrome so the host page controls the visual container.
    showFrame: false,
  },
  // Auto-open on load so the rehydrated cards are visible without an extra click.
  openChatByDefault: true,
};

function App() {
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);

  function onBeforeRender(instance: ChatInstance) {
    // Order is load-bearing: seed → subscribe → insertHistory. If insertHistory ran first, the resulting STATE_CHANGE for activeResponseId would fire before the listener exists and the seeded null would stick.
    const initialState = instance.getState();
    setActiveResponseId(initialState.activeResponseId ?? null);

    // BusEventType.STATE_CHANGE — mirror activeResponseId into React state so each user-defined card can re-render when the latest response in the conversation changes (including the change emitted by insertHistory below).
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: BusEvent) => {
        const { previousState, newState } = event as BusEventStateChange;
        // Skip work unless activeResponseId itself changed; STATE_CHANGE fires for any state slice.
        if (previousState?.activeResponseId !== newState?.activeResponseId) {
          setActiveResponseId(newState.activeResponseId ?? null);
        }
      },
    });

    // Auto-rehydrate so the example surface has multiple user_defined cards from the start. clearConversation runs first because insertHistory appends; on a fresh chat it is idempotent and defends against re-entry if onBeforeRender ever fires twice.
    void (async () => {
      const historyData = await customLoadHistory(instance);
      await instance.messaging.clearConversation();
      instance.messaging.insertHistory(historyData);
    })();
  }

  const renderUserDefinedResponse = useMemo(
    () => renderUserDefinedResponseFactory(activeResponseId),
    [activeResponseId],
  );

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      onBeforeRender={onBeforeRender}
      renderUserDefinedResponse={renderUserDefinedResponse}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
