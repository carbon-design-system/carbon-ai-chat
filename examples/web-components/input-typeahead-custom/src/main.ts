/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Typeahead (custom list) (Web components)
 *
 * Demonstrates: the same typeahead suggestion configuration as the
 * `input-typeahead` example, with the dropdown UI replaced by a fully custom
 * Lit element supplied through `renderCustomList`.
 *
 * APIs exercised:
 *   - `<cds-aichat-container>` (float baseline)
 *   - `PublicConfig.input.autocomplete`
 *   - `autocomplete.renderCustomList` for the dropdown body
 *
 * Start reading at: `./custom-suggestion-list.ts` and the `Demo` below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";
import "./custom-suggestion-list";

import { CarbonTheme, type PublicConfig } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { CANNED_SUGGESTIONS } from "./suggestions";
import type { CustomSuggestionList } from "./custom-suggestion-list";

const config: PublicConfig = {
  // Route outbound messages through the local mock instead of a hosted backend so the example runs offline.
  messaging: { customSendMessage },
  // Pin the WHITE Carbon theme so the purple custom dropdown reads consistently regardless of the host page's theme.
  injectCarbonTheme: CarbonTheme.WHITE,
  input: {
    // Autocomplete drives a typeahead dropdown anchored to the input as the user types.
    autocomplete: {
      // Async resolver keeps the contract identical to a real network-backed suggestion source.
      items: async (query: string) =>
        CANNED_SUGGESTIONS.filter((s) =>
          s.label.toLowerCase().includes(query.toLowerCase()),
        ),
      // Wait 150ms after the last keystroke to avoid firing the resolver on every character.
      debounceMs: 150,
      // renderCustomList replaces the built-in dropdown UI with a fully custom Lit element while
      // keeping the chat in charge of when to show, update, and tear it down.
      renderCustomList: ({ items, query, onSelect, onDismiss }) => {
        const list = document.createElement(
          "custom-suggestion-list",
        ) as CustomSuggestionList;
        list.items = items;
        list.query = query;
        // Hand the chat-provided callbacks to the element so click and keyboard activations
        // dispatch back through the framework's selection and dismissal pipeline.
        list.setCallbacks(onSelect, onDismiss);
        return list;
      },
    },
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  render() {
    return html`
      <cds-aichat-container
        .messaging=${config.messaging}
        .input=${config.input}
        .injectCarbonTheme=${config.injectCarbonTheme}
      ></cds-aichat-container>
    `;
  }
}
