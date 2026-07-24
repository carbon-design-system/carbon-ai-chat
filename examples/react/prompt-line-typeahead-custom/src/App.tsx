/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Typeahead (custom list)
 *
 * Demonstrates: the same typeahead suggestion configuration as the
 * `prompt-line-typeahead` example, with the dropdown UI replaced by a fully custom
 * React component supplied through `renderCustomList`.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.autocomplete`
 *   - `autocomplete.renderCustomList` for the dropdown body
 *
 * Start reading at: `App()` and the `renderCustomList` prop.
 */

import { ChatCustomElement, PublicConfig } from "@carbon/ai-chat";
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { CANNED_SUGGESTIONS } from "./suggestions";
import { CustomSuggestionList } from "./CustomSuggestionList";

function App() {
  const config: PublicConfig = useMemo(
    () => ({
      // route every user turn through a local stub so the example runs
      // without a live backend.
      messaging: { customSendMessage },
      layout: {
        // hide the default chat frame so the custom element fills its host
        // container — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // auto-open the conversation so readers land on the input area the
      // example exists to showcase, not a launcher.
      openChatByDefault: true,
      input: {
        // autocomplete is the typeahead variant that filters items
        // against the live query as the user types — there is no
        // trigger character.
        autocomplete: {
          // async resolver mimics a real fetch so consumers can swap in
          // a network call without changing the surrounding shape.
          items: async (query: string) =>
            CANNED_SUGGESTIONS.filter((s) =>
              s.label.toLowerCase().includes(query.toLowerCase()),
            ),
          // debounce keystrokes so rapid typing does not thrash the
          // resolver; 150ms balances responsiveness with reduced churn.
          debounceMs: 150,
          // `renderCustomList` lives on the autocomplete config so the
          // dropdown UI can be fully custom while the chat keeps
          // ownership of when to show, update, and tear it down.
          renderCustomList: ({ items, query, onSelect, onDismiss }) => (
            <CustomSuggestionList
              items={items}
              query={query}
              onSelect={onSelect}
              onDismiss={onDismiss}
            />
          ),
        },
      },
    }),
    [],
  );

  return <ChatCustomElement className="chat-custom-element" {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
