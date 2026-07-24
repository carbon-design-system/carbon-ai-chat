/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Input code snippet
 *
 * Demonstrates: registering a custom Tiptap node on the chat input so typing
 * ``` swaps the current paragraph for an editable
 * `<cds-aichat-code-snippet>`. The closing fence is implicit — it is added
 * at send time when the node's `attrs.value` (a fenced-markdown projection)
 * is serialized into the outgoing message text. On send, the JSON node rides
 * in `display_content` and the message bubble shows a read-only snippet via
 * `renderUserDefinedInputNode`.
 *
 * APIs exercised:
 *   - `ChatCustomElement` + `renderUserDefinedInputNode` prop
 *   - `PublicConfig.input.tiptap.extensions` (the custom `codeSnippetBlock` node)
 *   - `PublicConfig.layout.showFrame` / `openChatByDefault`
 *
 * Start reading at: the `config` constant, then `App()`.
 */

import "@carbon/styles/css/styles.css";
import { ChatCustomElement, PublicConfig } from "@carbon/ai-chat";
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";

import { codeSnippetNode } from "./codeSnippetNode";
import { customSendMessage } from "./customSendMessage";
import { renderCodeSnippet } from "./renderCodeSnippet";

function App() {
  const config: PublicConfig = useMemo(
    () => ({
      messaging: { customSendMessage },
      layout: {
        // Hide the default chat frame so the chat fills the viewport.
        showFrame: false,
      },
      // Auto-open so the conversation shows from first paint.
      openChatByDefault: true,
      input: {
        // Register the host-defined `codeSnippetBlock` node. The reference is
        // stable (module singleton) so the editor is not recreated on every
        // render.
        tiptap: { extensions: [codeSnippetNode] },
      },
    }),
    [],
  );

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      renderUserDefinedInputNode={renderCodeSnippet}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
