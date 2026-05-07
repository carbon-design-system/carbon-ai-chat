/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html } from "lit";

import "../src/input-shell.js";
import "../src/prompt-line.js";
import "../src/send-control.js";
import { carbonMention } from "../src/tiptap/index.js";
import type { SuggestionItem } from "../src/tiptap/index.js";

const USERS: SuggestionItem[] = [
  { id: "1", label: "Alice", value: "@alice" },
  { id: "2", label: "Bob", value: "@bob" },
  { id: "3", label: "Carol", value: "@carol" },
];

export default {
  title: "Preview/Input/Input shell",
};

/**
 * Default — the shell renders its `<slot name="editor">` with a fallback
 * `<cds-aichat-prompt-line>` so existing consumers don't need to change.
 */
export const Default = {
  render: () =>
    html`<cds-aichat-input-shell
      aria-label="default shell"
      placeholder="Type a message..."
    >
      <cds-aichat-input-send-control
        slot="send-control"
      ></cds-aichat-input-send-control>
    </cds-aichat-input-shell>`,
};

/**
 * Slotted prompt-line — a consumer projects their own `<cds-aichat-prompt-line>`
 * into the editor slot. The shell binds events and forwards properties to
 * whichever prompt-line is assigned.
 */
export const SlottedPromptLine = {
  render: () =>
    html`<cds-aichat-input-shell
      aria-label="slotted shell"
      placeholder="Type @ to mention"
      .mention=${{ trigger: "@", items: USERS }}
    >
      <cds-aichat-prompt-line slot="editor"></cds-aichat-prompt-line>
      <cds-aichat-input-send-control
        slot="send-control"
      ></cds-aichat-input-send-control>
    </cds-aichat-input-shell>`,
};

/**
 * Slotted prompt-line with consumer-managed extensions — the shell still
 * forwards its computed extensions (chat-Enter binding + mention/command/
 * autocomplete factories from the shell's props), so the slotted prompt-line
 * does not need to declare its own.
 */
export const SlottedWithMention = {
  render: () =>
    html`<cds-aichat-input-shell
      aria-label="slotted with mention"
      placeholder="Type @ to mention a user"
      .extensions=${[carbonMention({ trigger: "@", items: USERS })]}
    >
      <cds-aichat-prompt-line slot="editor"></cds-aichat-prompt-line>
      <cds-aichat-input-send-control
        slot="send-control"
      ></cds-aichat-input-send-control>
    </cds-aichat-input-shell>`,
};
