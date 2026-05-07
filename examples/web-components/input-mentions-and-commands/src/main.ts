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
 * Demonstrates: configuring two `input.suggestions` entries —
 * `@mentions` for picking team members anywhere in the message, and
 * `/commands` constrained to the start of the line — and forwarding
 * picks to the structured-data sidecar via `onSelect` and
 * `updateStructuredData`.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.suggestions` + `SuggestionType` (multiple)
 *
 * Start reading at: the `Demo` element below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  CarbonTheme,
  type ChatInstance,
  type PublicConfig,
  type SuggestionItem,
  SuggestionType,
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
      injectCarbonTheme: CarbonTheme.WHITE,
      layout: {
        // Hide the default chat frame so the custom element fills its host edge-to-edge — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // Auto-open the conversation so readers land on the input the example exists to showcase, not a launcher.
      openChatByDefault: true,
      input: {
        // Two suggestion sources are registered so both the `@` and `/` triggers light up the picker.
        suggestions: [
          {
            type: SuggestionType.MENTION,
            // Mentions fire on `@` and may appear anywhere in the message body.
            trigger: "@",
            // Async source so a real implementation can swap to a network call without changing the contract.
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
                    type: SuggestionType.MENTION,
                    value: item.id,
                  },
                ],
              }));
            },
          },
          {
            type: SuggestionType.COMMAND,
            // Commands fire on `/`.
            trigger: "/",
            // Constrain commands to the start of a line so a stray `/` mid-sentence (e.g. URLs) does not open the picker.
            triggerPosition: "start",
            // Static array source — the picker filters the list internally as the user types.
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
                    type: SuggestionType.COMMAND,
                    value: item.id,
                  },
                ],
              }));
            },
          },
        ],
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
        .injectCarbonTheme=${cfg.injectCarbonTheme}
        .layout=${cfg.layout}
        .openChatByDefault=${cfg.openChatByDefault}
      ></cds-aichat-custom-element>
    `;
  }
}
