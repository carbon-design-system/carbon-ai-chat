/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Mentions and commands (Web components)
 *
 * Demonstrates: configuring `input.mention` for `@`-picking team members
 * anywhere in the message and `input.command` for `/`-commands constrained
 * to the start of the line, then keeping the structured-data sidecar in sync
 * with the editor via the `onSelect` / `onRemove` pair and
 * `updateStructuredData` — so deleting a chip before sending also drops its
 * field.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.mention` + `PublicConfig.input.command`
 *   - `mention.onSelect` / `mention.onRemove` (and the command equivalents)
 *
 * Start reading at: the `Demo` element below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  type ChatInstance,
  type PublicConfig,
  type SuggestionItem,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { mentionItems, commandItems } from "./suggestions";

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  @state()
  accessor instance!: ChatInstance;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  get config(): PublicConfig {
    return {
      messaging: { customSendMessage },
      layout: {
        // Hide the default chat frame so the custom element fills its host edge-to-edge — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // Auto-open the conversation so readers land on the input the example exists to showcase, not a launcher.
      openChatByDefault: true,
      input: {
        // `@`-mention slot — fires anywhere in the message body. Async source
        // so a real implementation can swap to a network call without changing
        // the contract.
        mention: {
          trigger: "@",
          items: async (query: string) => {
            if (!query) {
              return mentionItems;
            }
            return mentionItems.filter((m) =>
              m.label.toLowerCase().includes(query.toLowerCase()),
            );
          },
          onSelect: (item: SuggestionItem) => {
            // Persist the pick onto the structured-data sidecar so the host can read it from `MessageRequest`.
            this.instance?.input.updateStructuredData((prev) => ({
              ...prev,
              fields: [
                ...(prev?.fields ?? []),
                {
                  id: `mention_${item.id}`,
                  label: item.label,
                  type: "mention",
                  value: item.id,
                },
              ],
            }));
          },
          // Symmetric cleanup: when the user deletes a mention chip before
          // sending, drop the matching sidecar field so it does not leak into
          // structured_data. Match the same `mention_`-prefixed id used on
          // insert, remove one instance so duplicates stay balanced, and
          // return prev untouched when nothing matched.
          onRemove: (item: SuggestionItem) => {
            this.instance?.input.updateStructuredData((prev) => {
              if (!prev?.fields) {
                return prev;
              }
              const index = prev.fields.findIndex(
                (field) =>
                  field.type === "mention" && field.id === `mention_${item.id}`,
              );
              if (index === -1) {
                return prev;
              }
              const fields = [...prev.fields];
              fields.splice(index, 1);
              return { ...prev, fields };
            });
          },
        },
        // `/`-command slot — constrained to the start of a line so a stray
        // `/` mid-sentence (e.g. URLs) does not open the picker. Static array
        // source — the picker filters the list internally as the user types.
        command: {
          trigger: "/",
          triggerPosition: "start",
          items: commandItems,
          onSelect: (item: SuggestionItem) => {
            // Persist the pick onto the structured-data sidecar so the host can read it from `MessageRequest`.
            this.instance?.input.updateStructuredData((prev) => ({
              ...prev,
              fields: [
                ...(prev?.fields ?? []),
                {
                  id: `command_${item.id}`,
                  label: item.label,
                  type: "command",
                  value: item.id,
                },
              ],
            }));
          },
          // Mirror the mention cleanup so a deleted command chip also leaves
          // structured_data, matching the `command_`-prefixed id and removing
          // a single field.
          onRemove: (item: SuggestionItem) => {
            this.instance?.input.updateStructuredData((prev) => {
              if (!prev?.fields) {
                return prev;
              }
              const index = prev.fields.findIndex(
                (field) =>
                  field.type === "command" && field.id === `command_${item.id}`,
              );
              if (index === -1) {
                return prev;
              }
              const fields = [...prev.fields];
              fields.splice(index, 1);
              return { ...prev, fields };
            });
          },
        },
      },
    };
  }

  render() {
    const cfg = this.config;
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${cfg.messaging}
        .input=${cfg.input}
        .layout=${cfg.layout}
        .openChatByDefault=${cfg.openChatByDefault}
      ></cds-aichat-custom-element>
    `;
  }
}
