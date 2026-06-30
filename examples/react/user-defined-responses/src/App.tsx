/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — User-defined responses
 *
 * Demonstrates: rendering `user_defined` response items via
 * `renderUserDefinedResponse`, with `STATE_CHANGE` tracking of
 * `activeResponseId` so each rendered card can show whether it is the
 * latest message in the conversation.
 *
 * APIs exercised:
 *   - `ChatCustomElement` from `@carbon/ai-chat`
 *   - `renderUserDefinedResponse` (see `./renderUserDefinedResponse.tsx`)
 *   - `BusEventType.STATE_CHANGE` for `activeResponseId`
 *   - `MessageResponseTypes.USER_DEFINED` (see `./customSendMessage.ts`)
 *
 * Start reading at: `App()` and `renderUserDefinedResponseFactory`.
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

import { customSendMessage } from "./customSendMessage";
import { renderUserDefinedResponseFactory } from "./renderUserDefinedResponse";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Hide the default chat frame chrome so the host page controls the visual container.
    showFrame: false,
  },
  // Auto-open on load so the example is interactive without an extra click.
  openChatByDefault: true,
};

function App() {
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);

  function onBeforeRender(instance: ChatInstance) {
    const initialState = instance.getState();
    setActiveResponseId(initialState.activeResponseId ?? null);

    // BusEventType.STATE_CHANGE — mirror activeResponseId into React state so each
    // user-defined card can re-render when the latest response in the conversation changes.
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
