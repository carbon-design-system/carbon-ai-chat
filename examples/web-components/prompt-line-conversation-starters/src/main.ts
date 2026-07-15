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
 * typing required). Selecting an item inserts the text AND auto-sends in one
 * action. The send-arrow is hidden (`enable-send-button` attribute absent/false)
 * because auto-send already handles submission.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.expanded`
 *   - `PublicConfig.input.starters` as `StartersConfig` (items + renderCustomList)
 *   - `starters.renderCustomList` (adds the "Prompt suggestions" header)
 *   - `PublicConfig.input.actions` (four dummy icon-button actions)
 *   - `<cds-aichat-autocomplete>` from `@carbon/ai-chat-components`
 *
 * Start reading at: `STARTER_ITEMS`, `config`, and the `Demo` class below.
 */

import "@carbon/styles/css/styles.css";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat-components/es/components/autocomplete/src/autocomplete.js";

import { type CustomListProps, type PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

import Add16 from "@carbon/icons/es/add/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Settings16 from "@carbon/icons/es/settings/16.js";

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
  starters.attached = true;
  starters.enableSendButton = false;
  starters.addEventListener(
    "cds-aichat-autocomplete-select",
    (e: CustomEvent<{ item: (typeof STARTER_ITEMS)[number] }>) =>
      onSelect(e.detail.item),
  );
  starters.addEventListener("cds-aichat-autocomplete-dismiss", onDismiss);
  return starters;
}

const config: PublicConfig = {
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
    starters: {
      items: STARTER_ITEMS,
      renderCustomList: renderStarterList,
    },

    // Four inline action buttons in the expanded actions row.
    // Each alerts on click — swap onClick for real handlers.
    actions: [
      {
        text: "Add",
        icon: Add16,
        onClick: () => window.alert("Add action clicked"),
      },
      {
        text: "Download",
        icon: Download16,
        onClick: () => window.alert("Download action clicked"),
      },
      {
        text: "Share",
        icon: Share16,
        onClick: () => window.alert("Share action clicked"),
      },
      {
        text: "Settings",
        icon: Settings16,
        onClick: () => window.alert("Settings action clicked"),
      },
    ],
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  render() {
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .input=${config.input}
      ></cds-aichat-custom-element>
    `;
  }
}
