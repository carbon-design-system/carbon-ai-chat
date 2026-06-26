/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Markdown override (code snippet + table), web
 * components flavor.
 *
 * Demonstrates two `WCCustomMarkdownRenderers` element-replacement hooks:
 *   - `codeBlock` — render fenced code through a `cds-aichat-code-snippet`
 *     with `detectLanguage` set to `false` (a bare fence shows only the line
 *     count, no detected-language label).
 *   - `table` — render markdown tables through a Carbon `cds-table` from
 *     `@carbon/web-components`, rendered into a cached wrapper with Lit's
 *     `render`.
 *
 * The chat element is declared in `index.html` directly in page light DOM
 * (no `<my-app>` wrapper) for consistency with the rest of the
 * markdown-extensibility examples.
 *
 * Per the API contract, both renderers reuse the same element references
 * across calls (cached by `slotName`) so the markdown component does not
 * thrash the DOM during streaming re-renders.
 *
 * Start reading at the `el.markdown = ...` assignment below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat-components/es/components/card/index.js";
import "@carbon/ai-chat-components/es/components/code-snippet/index.js";
import "@carbon/web-components/es/components/data-table/index.js";

import { html, render } from "lit";

import {
  type MarkdownRendererCodeBlockArgs,
  type MarkdownRendererTableArgs,
  type WCMarkdown,
} from "@carbon/ai-chat";

import { customSendMessage } from "./customSendMessage";

// Cache rendered host elements by slotName so re-renders during streaming
// update the same DOM nodes in place instead of creating new ones each pass.
// The markdown element re-invokes the callback on every reconcile; returning
// the same reference is the documented way to avoid DOM churn.
const renderedHosts = new Map<string, HTMLElement>();
const tableHosts = new Map<string, HTMLElement>();

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
    // Render markdown tables through a Carbon `cds-table`. The renderer must
    // return an HTMLElement, so render the `cds-table` template into a cached
    // wrapper with Lit's `render` (stable across streaming re-renders).
    table: ({ headers, rows, slotName }: MarkdownRendererTableArgs) => {
      let wrapper = tableHosts.get(slotName);
      if (!wrapper) {
        wrapper = document.createElement("div");
        tableHosts.set(slotName, wrapper);
      }
      render(
        html`
          <cds-table>
            <cds-table-head>
              <cds-table-header-row>
                ${headers.map(
                  (cell) =>
                    html`<cds-table-header-cell
                      >${cell.text}</cds-table-header-cell
                    >`,
                )}
              </cds-table-header-row>
            </cds-table-head>
            <cds-table-body>
              ${rows.map(
                (row) => html`
                  <cds-table-row>
                    ${row.map(
                      (cell) =>
                        html`<cds-table-cell>${cell.text}</cds-table-cell>`,
                    )}
                  </cds-table-row>
                `,
              )}
            </cds-table-body>
          </cds-table>
        `,
        wrapper,
      );
      return wrapper;
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
