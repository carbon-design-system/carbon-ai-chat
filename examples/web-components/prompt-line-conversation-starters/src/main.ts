/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Prompt Line Conversation Starters (Web components)
 *
 * Demonstrates: surfacing conversation-starter prompts in the prompt line using
 * `input.starters` with a `renderCustomList` that adds a "Prompt suggestions"
 * header by setting `headerConfig` on `<cds-aichat-autocomplete>`.
 *
 * The starters appear immediately when the editor is focused and empty (no
 * typing required). Selecting an item auto-sends in one action.
 *
 * A single toggle action enables or disables the starters list.
 * The action is disabled while the input has text because starters only trigger
 * on an empty editor.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.expanded`
 *   - `PublicConfig.input.starters` as `StartersConfig` (items + renderCustomList + isOn)
 *   - `starters.renderCustomList` (adds the "Prompt suggestions" header)
 *   - `starters.isOn` (toggled by the Chat action button)
 *   - `PublicConfig.input.actions` (one toggle action that enables/disables starters)
 *   - `<cds-aichat-autocomplete>` from `@carbon/ai-chat-components`
 *   - `cds-aichat-prompt-change` event (tracks whether the input has text)
 *
 * Start reading at: `STARTER_ITEMS`, `config`, and the `Demo` class below.
 */

import "@carbon/styles/css/styles.css";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat-components/es/components/autocomplete/src/autocomplete.js";

import { type CustomListProps, type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

import Chat16 from "@carbon/icons/es/chat/16.js";

/**
 * The four conversation-starter prompts. Replace with a dynamic source
 * (e.g. a fetch call) for production use.
 */
const STARTER_ITEMS = [
  { id: "starter-1", label: "Generate a chart for key metrics" },
  { id: "starter-2", label: "Convert my question into an SQL query" },
  { id: "starter-3", label: "Summarize recent High and Critical incidents" },
  { id: "starter-4", label: "Generate test data with similar schema" },
];

/**
 * Custom starter list renderer.
 *
 * Creates a `<cds-aichat-autocomplete>` element with a "Prompt suggestions"
 * header via `headerConfig`. The send-arrow is hidden (`enableSendButton: false`)
 * because selecting an item already auto-sends — one interaction, no ambiguity.
 *
 * The element is created imperatively so the chat framework can mount it into
 * its own managed slot and forward keyboard events through it.
 */
function renderStarterList({ items, onSelect, onDismiss }: CustomListProps) {
  const starters = document.createElement("cds-aichat-autocomplete") as any;
  // Set the CSS custom property on the host so the dropdown height matches
  // the React example's App.css `.starter-list` rule.
  starters.style.setProperty("--cds-aichat-autocomplete-max-height", "328px");
  starters.items = items;
  starters.headerConfig = { showHeader: true, title: "Prompt suggestions" };
  starters.attached = false;
  starters.enableSendButton = false;
  starters.addEventListener(
    "cds-aichat-autocomplete-select",
    (e: CustomEvent<{ item: (typeof STARTER_ITEMS)[number] }>) =>
      onSelect(e.detail.item),
  );
  starters.addEventListener("cds-aichat-autocomplete-dismiss", onDismiss);
  return starters;
}

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  /** Whether the conversation starters list is currently active. */
  @state()
  accessor startersEnabled: boolean = true;

  /**
   * Whether the prompt editor has any text. When true the toggle action is
   * disabled because starters only trigger on an empty editor.
   */
  @state()
  accessor inputHasText: boolean = false;

  /**
   * Handles `cds-aichat-prompt-change` events bubbled up from the prompt line.
   * The event is `bubbles: true, composed: true` so it reaches this `@`-binding
   * on `<cds-aichat-custom-element>` even though the prompt line lives inside a
   * shadow root.
   */
  private _onPromptChange = (e: CustomEvent<{ rawValue: string }>): void => {
    this.inputHasText = e.detail.rawValue.length > 0;
  };

  get config(): PublicConfig {
    return {
      // Route outbound turns through a local mock — swap for a real backend.
      messaging: { customSendMessage },
      layout: {
        // Hide the default chat frame so the custom element fills the host
        // element — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // Auto-open on mount so readers land directly in the chat view.
      openChatByDefault: true,
      input: {
        // Expanded layout: the editor occupies its own full-width row, with
        // the action buttons and send control on a second row beneath it.
        expanded: true,

        // StartersConfig: items appear when the editor is empty and focused
        // (no typing required). renderCustomList adds the "Prompt suggestions"
        // header. Selecting an item inserts the text AND auto-sends.
        // `isOn: false` suppresses the list without removing the config, keeping
        // the rich editor alive so toggling back on is instant.
        starters: {
          items: STARTER_ITEMS,
          renderCustomList: renderStarterList,
          isOn: this.startersEnabled,
        },

        // Single toggle action: enables or disables the conversation starters.
        // Disabled when the input has text because starters only trigger on an
        // empty editor.
        actions: [
          {
            text: this.startersEnabled
              ? "Hide conversation starters"
              : "Show conversation starters",
            icon: Chat16,
            onClick: () => {
              this.startersEnabled = !this.startersEnabled;
            },
            disabled: this.inputHasText,
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
        .messaging=${cfg.messaging}
        .layout=${cfg.layout}
        .openChatByDefault=${cfg.openChatByDefault}
        .input=${cfg.input}
        @cds-aichat-prompt-change=${this._onPromptChange}
      ></cds-aichat-custom-element>
    `;
  }
}
