/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Upsert message user defined (React)
 *
 * Demonstrates: long-running progressive updates to a user_defined widget
 * inside a single chat message via `ChatInstance.messaging.upsertMessage`,
 * plus an out-of-chat Carbon toast that fires on each scenario's completion
 * with a "View message" action that calls `instance.scrollToMessage`.
 *
 * APIs exercised:
 *   - `ChatCustomElement` with `layout.showFrame: false` + `openChatByDefault: true`
 *   - `PublicConfig.messaging.customSendMessage`
 *   - `ChatContainerProps.renderUserDefinedResponse`
 *   - `ChatContainerProps.onBeforeRender` (captures the `ChatInstance`)
 *   - `ChatInstance.scrollToMessage`
 *   - `@carbon/react` `ActionableNotification`
 *
 * Start reading at: the `config` constant, then `App()`, then `customSendMessage.ts`.
 */

import { ChatCustomElement, ChatInstance, PublicConfig } from "@carbon/ai-chat";
import { ActionableNotification } from "@carbon/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  customSendMessage,
  scenarioBus,
  ScenarioCompleteDetail,
} from "./customSendMessage";
import { renderUserDefinedResponse } from "./renderUserDefinedResponse";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Drop the rounded chat frame so the chat fills its host edge-to-edge.
    showFrame: false,
  },
  // Skip the launcher; readers land in the conversation on first paint.
  openChatByDefault: true,
};

interface Toast {
  toastID: string;
  messageID: string;
}

function App() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Stored in a ref (not state) because the toast action reads it at click
  // time — we don't need a re-render when the instance lands.
  const instanceRef = useRef<ChatInstance | null>(null);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    instanceRef.current = instance;
  }, []);

  useEffect(() => {
    // The scenarioBus is the named, typed channel between the mock back end
    // (which knows when a scenario finishes) and this host (which owns the
    // toast UI). Subscribe once on mount; unsubscribe on unmount.
    const handler = (event: Event) => {
      const { messageID } = (event as CustomEvent<ScenarioCompleteDetail>)
        .detail;
      setToasts((prev) => [
        ...prev,
        { toastID: crypto.randomUUID(), messageID },
      ]);
    };
    scenarioBus.addEventListener("complete", handler);
    return () => scenarioBus.removeEventListener("complete", handler);
  }, []);

  const dismiss = useCallback((toastID: string) => {
    setToasts((prev) => prev.filter((toast) => toast.toastID !== toastID));
  }, []);

  const scrollAndDismiss = useCallback(
    (messageID: string, toastID: string) => {
      instanceRef.current?.scrollToMessage(messageID);
      dismiss(toastID);
    },
    [dismiss],
  );

  return (
    <>
      <ChatCustomElement
        className="chat-custom-element"
        {...config}
        onBeforeRender={onBeforeRender}
        renderUserDefinedResponse={renderUserDefinedResponse}
      />
      <div className="toast-stack">
        {toasts.map((toast) => (
          <ActionableNotification
            key={toast.toastID}
            kind="success"
            title="Steps demo complete"
            subtitle="View the finished card in the conversation."
            actionButtonLabel="View message"
            onActionButtonClick={() =>
              scrollAndDismiss(toast.messageID, toast.toastID)
            }
            onClose={() => {
              dismiss(toast.toastID);
              return false;
            }}
          />
        ))}
      </div>
    </>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
