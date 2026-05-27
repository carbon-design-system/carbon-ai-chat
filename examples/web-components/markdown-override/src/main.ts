/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Markdown override (code snippet, hide detected
 * language label), web components flavor.
 *
 * Demonstrates `WCCustomMarkdownRenderers.codeBlock` by replacing the
 * default fenced-code renderer with a `cds-aichat-code-snippet` whose
 * `detectLanguage` property is explicitly set to `false` — overriding the
 * markdown component's default of `true`. The result:
 *   - ` ```python ` fences show the "Python" label as usual (explicit
 *     `language` always renders its label).
 *   - Bare ` ``` ` fences render with no language label in the snippet
 *     header — only the line count.
 *
 * The chat element is declared in `index.html` directly in page light DOM
 * (no `<my-app>` wrapper) for consistency with the rest of the
 * markdown-extensibility examples.
 *
 * Per the API contract, the renderer reuses the same element references
 * across calls (cached by `slotName`) so the markdown component does not
 * thrash the DOM during streaming re-renders.
 *
 * Start reading at the `el.markdown = ...` assignment below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat-components/es/components/card/index.js";
import "@carbon/ai-chat-components/es/components/code-snippet/index.js";

import {
  type MarkdownRendererCodeBlockArgs,
  type WCMarkdown,
} from "@carbon/ai-chat";

import { customSendMessage } from "./customSendMessage";

// Cache rendered card elements by slotName so re-renders during streaming
// update the same DOM nodes in place instead of creating new ones each pass.
// The markdown element re-invokes the callback on every reconcile; returning
// the same reference is the documented way to avoid DOM churn.
const renderedHosts = new Map<string, HTMLElement>();

const MARKDOWN_CONFIG: WCMarkdown = {
  customRenderers: {
    codeBlock: ({
      language,
      code,
      slotName,
    }: MarkdownRendererCodeBlockArgs) => {
      let card = renderedHosts.get(slotName);
      let snippet: HTMLElement | null = null;
      if (!card) {
        card = document.createElement("cds-aichat-card");
        card.setAttribute("is-flush", "");
        const wrap = document.createElement("div");
        wrap.setAttribute("slot", "body");
        snippet = document.createElement("cds-aichat-code-snippet");
        snippet.setAttribute("data-rounded", "");
        wrap.appendChild(snippet);
        card.appendChild(wrap);
        renderedHosts.set(slotName, card);
      } else {
        snippet = card.querySelector("cds-aichat-code-snippet");
      }
      if (snippet) {
        // Properties (not attributes) — `code` may contain quotes/newlines
        // and `highlight` is a boolean. The Lit element listens on both, but
        // the property path avoids serialization concerns.
        (snippet as unknown as Record<string, unknown>).language = language;
        (snippet as unknown as Record<string, unknown>).highlight = true;
        (snippet as unknown as Record<string, unknown>).detectLanguage = false;
        (snippet as unknown as Record<string, unknown>).code = code;
      }
      return card;
    },
  },
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
