/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Mentions and commands (React)
 *
 * Demonstrates: configuring `input.mention` for picking team members
 * anywhere in the message and `input.command` for slash commands
 * constrained to the start of the line, then forwarding picks to the
 * structured-data sidecar via `onSelect` and `updateStructuredData`.
 *
 * APIs exercised:
 *   - `ChatContainer` (default float layout — examples for the input
 *     surface stay on the float baseline because they exercise the
 *     editor area, not the chat shell)
 *   - `PublicConfig.input.mention` + `PublicConfig.input.command`
 *   - `instance.input.updateStructuredData`
 *
 * Start reading at: `App()` and the `input` config block.
 */

import {
  CarbonTheme,
  ChatContainer,
  ChatInstance,
  PublicConfig,
  SuggestionItem,
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
      // Match the surrounding page chrome by forcing the white Carbon theme.
      injectCarbonTheme: CarbonTheme.WHITE,
      input: {
        // `@` for people anywhere in the message.
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
            // Mirror the pick into the message's structured-data sidecar so
            // the backend can read the resolved id alongside the raw text.
            instanceRef.current?.input.updateStructuredData((prev) => ({
              ...prev,
              fields: [
                ...(prev?.fields ?? []),
                {
                  id: item.id,
                  label: item.label,
                  type: "mention",
                  value: item.id,
                },
              ],
            }));
          },
        },
        // `/` for slash commands constrained to the start of the line.
        command: {
          trigger: "/",
          // Slash commands only fire at the very start of the message.
          triggerPosition: "start",
          items: commandItems,
          onSelect: (item: SuggestionItem) => {
            // Mirror the pick into the message's structured-data sidecar so
            // the backend can dispatch on the command id without reparsing.
            instanceRef.current?.input.updateStructuredData((prev) => ({
              ...prev,
              fields: [
                ...(prev?.fields ?? []),
                {
                  id: item.id,
                  label: item.label,
                  type: "command",
                  value: item.id,
                },
              ],
            }));
          },
        },
      },
    }),
    [],
  );

  return <ChatContainer {...config} onBeforeRender={onBeforeRender} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
