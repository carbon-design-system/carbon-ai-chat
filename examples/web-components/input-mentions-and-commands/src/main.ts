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
 * to the start of the line, then forwarding picks to the structured-data
 * sidecar via `onSelect` and `updateStructuredData`.
 *
 * APIs exercised:
 *   - `<cds-aichat-container>` (default float layout — input-surface
 *     examples stay on the float baseline because they exercise the
 *     editor area, not the chat shell)
 *   - `PublicConfig.input.mention` + `PublicConfig.input.command`
 *
 * Start reading at: the `Demo` element below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import {
  CarbonTheme,
  type ChatInstance,
  type PublicConfig,
  type SuggestionItem,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { mentionItems, commandItems } from "./suggestions";

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor instance!: ChatInstance;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  get config(): PublicConfig {
    return {
      messaging: { customSendMessage },
      injectCarbonTheme: CarbonTheme.WHITE,
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
        },
      },
    };
  }

  render() {
    const cfg = this.config;
    return html`
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${cfg.messaging}
        .input=${cfg.input}
        .injectCarbonTheme=${cfg.injectCarbonTheme}
      ></cds-aichat-container>
    `;
  }
}
