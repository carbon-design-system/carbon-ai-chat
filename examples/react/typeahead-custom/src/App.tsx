/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CarbonTheme,
  ChatContainer,
  PublicConfig,
  SuggestionType,
} from "@carbon/ai-chat";
import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { CANNED_SUGGESTIONS } from "./suggestions";
import { CustomSuggestionList } from "./CustomSuggestionList";

function App() {
  const config: PublicConfig = useMemo(
    () => ({
      messaging: { customSendMessage },
      injectCarbonTheme: CarbonTheme.WHITE,
      input: {
        suggestions: [
          {
            type: SuggestionType.AUTOCOMPLETE,
            trigger: "",
            items: async (query: string) => {
              if (!query.trim()) {
                return [];
              }
              return CANNED_SUGGESTIONS.filter((s) =>
                s.label.toLowerCase().includes(query.toLowerCase()),
              );
            },
            debounceMs: 150,
            renderCustomList: ({ items, query, onSelect, onDismiss }) => (
              <CustomSuggestionList
                items={items}
                query={query}
                onSelect={onSelect}
                onDismiss={onDismiss}
              />
            ),
          },
        ],
      },
    }),
    [],
  );

  return <ChatContainer {...config} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
