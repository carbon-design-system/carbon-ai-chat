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
 * `prompt-line-mentions-and-commands`, plus a `renderCustomToken` for mentions
 * that swaps the default chip for a `<cds-tag>` wrapped in a `<cds-tooltip>`
 * so hovering a mention reveals the picked user's description. Commands
 * keep the default chip.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.mention` + `PublicConfig.input.command`
 *   - `mention.renderCustomToken` for chip rendering
 *   - `mention.onSelect` / `mention.onRemove` keep the structured-data sidecar
 *     in sync as chips are added and deleted
 *
 * Start reading at: the `renderCustomToken` callback below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/web-components/es/components/tooltip/tooltip.js";
import "@carbon/web-components/es/components/tooltip/tooltip-content.js";
import "@carbon/web-components/es/components/tag/tag.js";
import {
  type ChatInstance,
  type PublicConfig,
  type SuggestionItem,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { mentionItems, commandItems } from "./suggestions";

/**
 * Creates a custom mention token element: a Carbon Tag wrapped in a Tooltip
 * so the picked user's description appears on hover.
 *
 * `autoalign` switches the popover to `position: fixed` via floating-ui so
 * the popover escapes the editor's `overflow: auto` clip. With
 * `align="top"` we request placement above the chip; on this chat-input
 * surface it currently renders to the side instead. `cds-popover`'s flip
 * middleware defaults its boundary to `"clippingAncestors"`, which here
 * resolves to the ~20px-tall editor row, so floating-ui concludes there's
 * no room above and flips off `"top"`. The parallel React example does
 * not have this divergence — `@carbon/react`'s Popover passes `undefined`
 * to floating-ui's `boundary` (viewport).
 *
 * Tracked at https://github.com/carbon-design-system/carbon-ai-chat/issues/1449
 * (sub-issue of #731). When that's resolved this example should render
 * above the chip without any change to the code below.
 */
function createMentionToken(item: SuggestionItem): HTMLElement {
  const tooltip = document.createElement("cds-tooltip");
  tooltip.setAttribute("align", "top");
  tooltip.setAttribute("autoalign", "");

  const content = document.createElement("cds-tooltip-content");
  content.textContent = item.description ?? item.label;
  tooltip.appendChild(content);

  const tag = document.createElement("cds-tag");
  tag.setAttribute("size", "sm");
  tag.setAttribute("type", "purple");
  tag.textContent = `@${item.label}`;
  tooltip.appendChild(tag);

  return tooltip;
}

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

  // Captures the ChatInstance handle so onSelect callbacks can reach input.updateStructuredData later.
  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
  };

  get config(): PublicConfig {
    return {
      // Routes user input through a local mock instead of a real backend so the example runs offline.
      messaging: { customSendMessage },
      layout: {
        // Hide the default chat frame so the custom element fills its host edge-to-edge — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // Auto-open the conversation so readers land on the input the example exists to showcase, not a launcher.
      openChatByDefault: true,
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
          // Symmetric cleanup: deleting a mention chip before sending removes
          // its sidecar field so it does not leak into structured_data. Match
          // the `mention_`-prefixed id from insert, drop a single instance so
          // duplicates stay balanced, and return prev untouched when no match.
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
          // Commands intentionally omit renderCustomToken to keep the default chip and contrast with mentions.
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
