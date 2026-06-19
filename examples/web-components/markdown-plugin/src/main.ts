/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Markdown plugin (KaTeX), web components flavor.
 *
 * Demonstrates extending the chat's markdown renderer with a markdown-it
 * plugin by setting the `<cds-aichat-custom-element>.markdown` property.
 * The plugin (`@vscode/markdown-it-katex`) introduces inline (`$E = mc^2$`)
 * and block (`$$ ... $$`) math tokens; the chat container appends the
 * plugin's rendered HTML into its own light-DOM slot host so the KaTeX
 * stylesheet loaded by `index.html` styles it normally.
 *
 * The chat element is declared in `index.html` directly in page light DOM
 * (no `<my-app>` wrapper) — wrapping it in another custom element would
 * place plugin-output hosts inside that wrapper's shadow root, where the
 * page-level KaTeX stylesheet could not reach them. We bind the complex
 * config objects (`messaging`, `markdown`, etc.) as JS properties here,
 * since they cannot be expressed as HTML attributes.
 *
 * Start reading at the `el.markdown = ...` and `el.messaging = ...`
 * assignments below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import { type WCMarkdown } from "@carbon/ai-chat";
import markdownItKatex from "@vscode/markdown-it-katex";

import { customSendMessage } from "./customSendMessage";

// Stable reference — a fresh array reference each render would rebuild the
// chat's markdown-it instance and wipe any plugin-managed state.
const MARKDOWN_CONFIG: WCMarkdown = {
  markdownItPlugins: [markdownItKatex],
};

const el = document.querySelector("cds-aichat-custom-element") as
  | (HTMLElement & {
      messaging?: { customSendMessage: typeof customSendMessage };
      layout?: { showFrame?: boolean };
      openChatByDefault?: boolean;
      markdown?: WCMarkdown;
    })
  | null;

if (el) {
  el.messaging = { customSendMessage };
  el.layout = { showFrame: false };
  el.openChatByDefault = true;
  el.markdown = MARKDOWN_CONFIG;
}
