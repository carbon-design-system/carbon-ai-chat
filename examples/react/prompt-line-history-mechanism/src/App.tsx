/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Prompt line history mechanism
 *
 * Demonstrates: registering a keyboard-only Tiptap extension on the chat input
 * that intercepts ArrowUp / ArrowDown to cycle through previously sent messages
 * — shell-style — using `instance.input.updateContent` + `textToDoc` to write
 * recalled entries back into the editor. A shared `HistoryState` object ties
 * the keyboard extension to the `customSendMessage` handler so no React state
 * or event bus subscription is needed.
 *
 * APIs exercised:
 *   - `ChatCustomElement` + `onBeforeRender`
 *   - `PublicConfig.input.tiptap.extensions` (the history keyboard extension)
 *   - `PublicConfig.layout.showFrame` / `openChatByDefault`
 *   - `instance.input.updateContent` + `textToDoc` / `getRawText`
 *
 * Start reading at: the module-scope constants, then `App()`.
 */

import "@carbon/styles/css/styles.css";
import { ChatCustomElement, ChatInstance, PublicConfig } from "@carbon/ai-chat";
import React, { useCallback, useMemo } from "react";
import { createRoot } from "react-dom/client";

import { createCustomSendMessage } from "./customSendMessage";
import { createHistoryExtension, createHistoryState } from "./historyExtension";

// These three constants are created at module scope — outside the component —
// so their references are stable across re-renders. Recreating `historyState`
// on each render would reset history; recreating `historyExtension` would cause
// Tiptap to rebuild the editor on every render.
const historyState = createHistoryState();
const historyExtension = createHistoryExtension(historyState);
const sendMessage = createCustomSendMessage(historyState);

function App() {
  // Capture the `ChatInstance` as soon as the chat is ready so the keyboard
  // extension can call `instance.input.updateContent`. `useCallback` keeps the
  // callback reference stable so it isn't re-registered on every render.
  const onBeforeRender = useCallback((instance: ChatInstance) => {
    historyState.instance = instance;
  }, []);

  const config: PublicConfig = useMemo(
    () => ({
      messaging: { customSendMessage: sendMessage },
      layout: {
        // Hide the default chat frame so the custom element fills its host
        // container — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // Auto-open so the conversation shows from first paint.
      openChatByDefault: true,
      input: {
        // Register the history keyboard extension. A non-empty `extensions`
        // array causes `resolvePromptLineMode` to switch the input to Tiptap
        // rich mode automatically — no extra config needed.
        tiptap: { extensions: [historyExtension] },
      },
    }),
    [],
  );

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      onBeforeRender={onBeforeRender}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
