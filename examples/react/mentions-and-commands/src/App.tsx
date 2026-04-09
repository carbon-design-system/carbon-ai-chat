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
  ChatInstance,
  PublicConfig,
  SuggestionItem,
  SuggestionType,
} from "@carbon/ai-chat";
import React, { useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { mentionItems, commandItems } from "./suggestions";

function App() {
  const instanceRef = useRef<ChatInstance | null>(null);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    instanceRef.current = instance;
  }, []);

  const config: PublicConfig = useMemo(
    () => ({
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
              instanceRef.current?.input.updateStructuredData((prev) => ({
                ...prev,
                fields: [
                  ...(prev?.fields ?? []),
                  {
                    id: item.id,
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
            trigger: "/",
            triggerPosition: "start" as const,
            items: commandItems,
            onSelect: (item: SuggestionItem) => {
              instanceRef.current?.input.updateStructuredData((prev) => ({
                ...prev,
                fields: [
                  ...(prev?.fields ?? []),
                  {
                    id: item.id,
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
    }),
    [],
  );

  return <ChatContainer {...config} onBeforeRender={onBeforeRender} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
