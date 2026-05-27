/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Markdown plugin (KaTeX).
 *
 * Demonstrates extending the chat's markdown renderer with a markdown-it
 * plugin through the `markdown.markdownItPlugins` config. The plugin
 * (`@vscode/markdown-it-katex`) introduces inline (`$E = mc^2$`) and block
 * (`$$ ... $$`) math tokens; the chat renders the plugin's HTML output into
 * a light-DOM slot so the KaTeX stylesheet loaded in `index.html` styles
 * it normally.
 *
 * Start reading at `App()` and the `useMemo`'d `plugins` array.
 */

import {
  ChatCustomElement,
  type MarkdownItPlugin,
  type PublicConfig,
} from "@carbon/ai-chat";
import markdownItKatex from "@vscode/markdown-it-katex";
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    showFrame: false,
  },
  openChatByDefault: true,
};

function App() {
  // The plugins array must be referentially stable across renders — a fresh
  // array reference would rebuild the markdown-it instance on every render,
  // wiping any plugin-managed state.
  const plugins = useMemo<MarkdownItPlugin[]>(() => [markdownItKatex], []);

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      markdown={{ markdownItPlugins: plugins }}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
