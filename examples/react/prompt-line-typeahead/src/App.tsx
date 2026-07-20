/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Typeahead
 *
 * Demonstrates: configuring `input.autocomplete` so a curated list filters
 * as the user types and renders in a dropdown above the input.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.autocomplete`
 *   - `autocomplete.items` (resolver returning the filtered list)
 *
 * Start reading at: `App()` and the `useMemo`'d `config`.
 */

import { ChatCustomElement, PublicConfig } from "@carbon/ai-chat";
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { CANNED_SUGGESTIONS } from "./suggestions";

function App() {
  const config: PublicConfig = useMemo(
    () => ({
      // route outbound turns through a local mock instead of a backend so the demo runs standalone.
      messaging: { customSendMessage },
      layout: {
        // hide the default chat frame so the custom element fills the host element — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // auto-open the conversation on mount so readers land directly in the input area the example showcases.
      openChatByDefault: true,
      input: {
        // register an autocomplete provider — this is the surface the example exists to demonstrate.
        // The dropdown opens above the input and filters as the user types; there is no trigger character.
        autocomplete: {
          // resolver receives the live query string and returns the filtered SuggestionItem[] for the dropdown.
          items: async (query: string) =>
            CANNED_SUGGESTIONS.filter((s) =>
              s.label.toLowerCase().includes(query.toLowerCase()),
            ),
          // throttle resolver calls so each keystroke does not trigger a fetch — 150ms keeps typing responsive.
          debounceMs: 150,
        },
      },
    }),
    [],
  );

  return <ChatCustomElement className="chat-custom-element" {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
