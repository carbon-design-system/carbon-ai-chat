/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Mentions and commands (custom render) (Web components)
 *
 * Demonstrates: the same mention/command suggestion configuration as
 * `input-mentions-and-commands`, plus a `renderCustomToken` for mentions
 * that swaps the default chip for a `<cds-definition-tooltip>` showing the
 * picked user's description on hover. Commands keep the default chip.
 *
 * APIs exercised:
 *   - `<cds-aichat-container>` (float baseline)
 *   - `PublicConfig.input.mention` + `PublicConfig.input.command`
 *   - `mention.renderCustomToken` for chip rendering
 *
 * Start reading at: the `renderCustomToken` callback below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";
import "@carbon/web-components/es/components/tooltip/definition-tooltip.js";
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

/**
 * Creates a custom mention token element: a definition tooltip that shows
 * the user's description on hover. Wrapped in an inline-block span so the
 * popover-based component works inline.
 */
function createMentionToken(item: SuggestionItem): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "mention-token-wrapper";

  const tooltip = document.createElement("cds-definition-tooltip");
  tooltip.setAttribute("align", "top");
  tooltip.setAttribute("open-on-hover", "");
  tooltip.textContent = `@${item.label}`;

  const definition = document.createElement("span");
  definition.setAttribute("slot", "definition");
  definition.textContent = item.description ?? item.label;
  tooltip.appendChild(definition);

  wrapper.appendChild(tooltip);
  return wrapper;
}

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor instance!: ChatInstance;

  // Captures the ChatInstance handle so onSelect callbacks can reach input.updateStructuredData later.
  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  get config(): PublicConfig {
    return {
      // Routes user input through a local mock instead of a real backend so the example runs offline.
      messaging: { customSendMessage },
      // Pins the Carbon theme so screenshots and visual regressions are deterministic regardless of host page.
      injectCarbonTheme: CarbonTheme.WHITE,
      input: {
        // `@`-mention slot — drives the inline chip UI customized below via renderCustomToken.
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
            // Mirrors the picked mention into structured_data so customSendMessage can read it on submit.
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
          // Replaces the default chip with a definition tooltip so hovering a mention reveals the user's role.
          renderCustomToken: (item: SuggestionItem) => createMentionToken(item),
        },
        command: {
          trigger: "/",
          triggerPosition: "start",
          items: commandItems,
          onSelect: (item: SuggestionItem) => {
            // Mirrors the picked command into structured_data so customSendMessage can read it on submit.
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
          // Commands intentionally omit renderCustomToken to keep the default chip and contrast with mentions.
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
