/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html } from "lit";

import "../src/prompt-line.js";
import {
  carbonAutocomplete,
  carbonCommand,
  carbonMention,
} from "../src/tiptap/index.js";
import type { SuggestionItem } from "../src/tiptap/index.js";

const USERS: SuggestionItem[] = [
  { id: "1", label: "Alice", value: "@alice" },
  { id: "2", label: "Bob", value: "@bob" },
  { id: "3", label: "Carol", value: "@carol" },
];

const COMMANDS: SuggestionItem[] = [
  { id: "search", label: "search", value: "/search " },
  { id: "summarize", label: "summarize", value: "/summarize " },
];

const SUGGESTIONS: SuggestionItem[] = [
  { id: "today", label: "today" },
  { id: "tomorrow", label: "tomorrow" },
  { id: "yesterday", label: "yesterday" },
];

export default {
  title: "Preview/Input/Prompt line",
};

export const Empty = {
  render: () =>
    html`<cds-aichat-prompt-line
      placeholder="Type a message..."
      aria-label="empty prompt"
    ></cds-aichat-prompt-line>`,
};

export const InitialContent = {
  render: () =>
    html`<cds-aichat-prompt-line
      .content=${{
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Pre-populated content." }],
          },
        ],
      }}
      aria-label="initial content prompt"
    ></cds-aichat-prompt-line>`,
};

export const Disabled = {
  render: () =>
    html`<cds-aichat-prompt-line
      disabled
      placeholder="Editor disabled"
      aria-label="disabled prompt"
    ></cds-aichat-prompt-line>`,
};

export const WithMention = {
  render: () =>
    html`<cds-aichat-prompt-line
      placeholder="Type @ to mention a user"
      aria-label="mention prompt"
      .extensions=${[carbonMention({ trigger: "@", items: USERS })]}
    ></cds-aichat-prompt-line>`,
};

export const WithCommand = {
  render: () =>
    html`<cds-aichat-prompt-line
      placeholder="Type / for a command"
      aria-label="command prompt"
      .extensions=${[
        carbonCommand({
          trigger: "/",
          items: COMMANDS,
          triggerPosition: "start",
        }),
      ]}
    ></cds-aichat-prompt-line>`,
};

export const WithAutocomplete = {
  render: () =>
    html`<cds-aichat-prompt-line
      placeholder="Start typing for suggestions"
      aria-label="autocomplete prompt"
      .extensions=${[carbonAutocomplete({ items: SUGGESTIONS })]}
    ></cds-aichat-prompt-line>`,
};

export const SwapExtensions = {
  render: () => {
    let withMention = false;
    return html`
      <button
        type="button"
        @click=${(event: Event) => {
          const button = event.target as HTMLButtonElement;
          const promptLine = button.parentElement?.querySelector(
            "cds-aichat-prompt-line",
          ) as HTMLElement & { extensions: unknown[] };
          if (!promptLine) {
            return;
          }
          withMention = !withMention;
          promptLine.extensions = withMention
            ? [carbonMention({ trigger: "@", items: USERS })]
            : [];
          button.textContent = withMention
            ? "Remove @-mention extension"
            : "Add @-mention extension";
        }}
      >
        Add @-mention extension
      </button>
      <cds-aichat-prompt-line
        placeholder="Tap the button to swap extensions"
        aria-label="swap extensions prompt"
        .extensions=${[]}
      ></cds-aichat-prompt-line>
      <p>
        Validates the recreate-on-extensions-change behavior (PLAN.md risk #6).
        Type into the input, then click the button: the editor recreates and
        content / selection are preserved.
      </p>
    `;
  },
};
