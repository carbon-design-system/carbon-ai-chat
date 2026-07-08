/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Markdown overrides, web components flavor.
 *
 * Demonstrates the five `WCCustomMarkdownRenderers` hooks together:
 *   - `codeBlock` — element replacement: render fenced code through a
 *     `cds-aichat-code-snippet` with `detectLanguage` set to `false`. The
 *     renderer reuses cached element references (keyed by `slotName`) so the
 *     markdown element does not thrash the DOM during streaming re-renders.
 *   - `table` — element replacement: render markdown tables through a Carbon
 *     `cds-table` (rendered with Lit) instead of the default `cds-aichat-table`.
 *   - `link` — attribute transform: append a `utm_source` query param and
 *     force anchors to open in the same tab (`target="_self"`).
 *   - `image` — attribute transform: resolve a custom `app-image:` reference
 *     to a real `src` and make the image clickable (alert on click).
 *   - `checklist` — behavior hook: make task-list checkboxes actionable, log
 *     toggles, and persist state via `getChecked`.
 *
 * The chat element is declared in `index.html` directly in page light DOM.
 * Start reading at the `el.markdown = ...` assignment below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat-components/es/components/card/index.js";
import "@carbon/ai-chat-components/es/components/code-snippet/index.js";
import "@carbon/web-components/es/components/data-table/index.js";

import { html, render } from "lit";

import {
  type MarkdownRendererCodeBlockArgs,
  type MarkdownRendererImageArgs,
  type MarkdownRendererLinkArgs,
  type MarkdownRendererTableArgs,
  type WCMarkdown,
} from "@carbon/ai-chat";

import { customSendMessage } from "./customSendMessage";

// Cache rendered host elements by slotName so re-renders during streaming
// update the same DOM nodes in place instead of creating new ones each pass.
// The markdown element re-invokes the callback on every reconcile; returning
// the same reference is the documented way to avoid DOM churn.
const codeBlockHosts = new Map<string, HTMLElement>();
const tableHosts = new Map<string, HTMLElement>();

// Checklist state, persisted across re-renders and fed back via `getChecked`.
const checklistState = new Map<string, boolean>();

// The image the `image` override resolves the markdown's `app-image:lions`
// reference to — the same photo the demo site uses for its "image" utterance.
const DEMO_IMAGE =
  "https://news-cdn.softpedia.com/images/news2/Picture-of-the-Day-Real-Life-Simba-and-Mufasa-Caught-on-Camera-in-Tanzania-392687-2.jpg";

const MARKDOWN_CONFIG: WCMarkdown = {
  customRenderers: {
    // Element replacement — render fenced code without a detected-language
    // label, reusing cached hosts to avoid DOM churn while streaming.
    codeBlock: ({
      language,
      code,
      slotName,
    }: MarkdownRendererCodeBlockArgs) => {
      let card = codeBlockHosts.get(slotName);
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
        codeBlockHosts.set(slotName, card);
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
    // Element replacement — render markdown tables through a Carbon `cds-table`.
    // The renderer must return an HTMLElement, so render the `cds-table`
    // template into a cached wrapper with Lit's `render` (stable across
    // streaming re-renders).
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
    // Attribute transform — rewrite the href and keep navigation in the same tab.
    link: ({ href }: MarkdownRendererLinkArgs) => {
      try {
        const url = new URL(href);
        url.searchParams.set("utm_source", "ai-chat");
        return {
          href: url.toString(),
          target: "_self",
          rel: "noopener noreferrer",
        };
      } catch {
        return null;
      }
    },
    // Attribute transform — resolve a custom image reference to a real src and
    // make the image clickable. The inline `onclick` works because this example
    // does not enable HTML sanitization; a sanitized/CSP setup would instead
    // delegate a click listener on the host.
    image: ({ src, attributes }: MarkdownRendererImageArgs) => {
      if (src.startsWith("app-image:")) {
        return {
          src: DEMO_IMAGE,
          attributes: {
            ...attributes,
            style:
              "cursor: pointer; max-width: 100%; height: auto; border-radius: 8px;",
            title: "Click me",
            onclick: "alert('You clicked the image!')",
          },
        };
      }
      return null;
    },
    // Behavior hook — persist toggles and reflect them back on re-render.
    checklist: {
      getChecked: ({ id, checked }) =>
        checklistState.has(id) ? checklistState.get(id) : checked,
      onToggle: ({ id, label, checked }) => {
        checklistState.set(id, checked);
        console.log(`[checklist] "${label}" → ${checked ? "done" : "todo"}`);
      },
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
