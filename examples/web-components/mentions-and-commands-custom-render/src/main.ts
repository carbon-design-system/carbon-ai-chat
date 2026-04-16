/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";
import "@carbon/web-components/es/components/tooltip/definition-tooltip.js";
import {
  CarbonTheme,
  type ChatInstance,
  type PublicConfig,
  type SuggestionItem,
  SuggestionType,
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
  wrapper.style.display = "inline-block";

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

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  get config(): PublicConfig {
    return {
      messaging: { customSendMessage },
      injectCarbonTheme: CarbonTheme.WHITE,
      input: {
        suggestions: [
          {
            type: SuggestionType.MENTION,
            trigger: "@",
            items: async (query: string) => {
              if (!query) {
                return mentionItems;
              }
              return mentionItems.filter((m) =>
                m.label.toLowerCase().includes(query.toLowerCase()),
              );
            },
            initialItems: mentionItems,
            onSelect: (item: SuggestionItem) => {
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
            // Custom token renderer: Carbon Tag with Tooltip
            renderCustomToken: (item: SuggestionItem) =>
              createMentionToken(item),
          },
          {
            type: SuggestionType.COMMAND,
            trigger: "/",
            triggerPosition: "start",
            items: commandItems,
            onSelect: (item: SuggestionItem) => {
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
            // No renderCustomToken — commands use the default chip
          },
        ],
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
