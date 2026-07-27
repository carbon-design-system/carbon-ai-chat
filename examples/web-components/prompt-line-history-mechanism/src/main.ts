/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Prompt line history mechanism (Web Components)
 *
 * Demonstrates: registering a keyboard-only Tiptap extension on the chat input
 * that intercepts ArrowUp / ArrowDown to cycle through previously sent messages
 * — shell-style — using `instance.input.updateContent` + `textToDoc` to write
 * recalled entries back into the editor. A shared `HistoryState` object ties
 * the keyboard extension to the `customSendMessage` handler so no framework
 * state or event bus subscription is needed.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` + `.onBeforeRender` property
 *   - `PublicConfig.input.tiptap.extensions` (the history keyboard extension)
 *   - `PublicConfig.layout.showFrame` / `openChatByDefault`
 *   - `instance.input.updateContent` + `textToDoc` / `getRawText`
 *
 * Start reading at: the module-scope constants, then the `Demo` class.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/styles/css/styles.css";
import { type ChatInstance, type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { createCustomSendMessage } from "./customSendMessage";
import { createHistoryExtension, createHistoryState } from "./historyExtension";

// These three constants are created at module scope — outside the component —
// so their references are stable across re-renders. Recreating `historyState`
// would reset history; recreating `historyExtension` would cause Tiptap to
// rebuild the editor on every render.
const historyState = createHistoryState();
const historyExtension = createHistoryExtension(historyState);
const sendMessage = createCustomSendMessage(historyState);

// Module-scope so the reference is stable across renders — a fresh `input`
// object (or `tiptap.extensions` array) would make the editor recreate.
const config: PublicConfig = {
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
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  // Capture the `ChatInstance` as soon as the chat is ready so the keyboard
  // extension can call `instance.input.updateContent`. The arrow-function
  // class field keeps `this` bound without needing `.bind(this)` in the
  // template — matching the pattern used in upsert-message-user-defined.
  private onBeforeRender = (instance: ChatInstance) => {
    historyState.instance = instance;
  };

  render() {
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .messaging=${config.messaging}
        .input=${config.input}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .onBeforeRender=${this.onBeforeRender}
      ></cds-aichat-custom-element>
    `;
  }
}
