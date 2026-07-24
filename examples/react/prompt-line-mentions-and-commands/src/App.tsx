/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Mentions and commands
 *
 * Demonstrates: configuring `input.mention` for picking team members
 * anywhere in the message and `input.command` for slash commands
 * constrained to the start of the line, then keeping the structured-data
 * sidecar in sync with the editor via the `onSelect` / `onRemove` pair and
 * `updateStructuredData` — so deleting a chip before sending also drops its
 * field.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.mention` + `PublicConfig.input.command`
 *   - `mention.onSelect` / `mention.onRemove` (and the command equivalents)
 *   - `instance.input.updateStructuredData`
 *
 * Start reading at: `App()` and the `input` config block.
 */

import {
  ChatCustomElement,
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
      layout: {
        // Hide the default chat frame so the custom element fills its host container — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // Auto-open the conversation so readers land on the input the example exists to showcase, not a launcher.
      openChatByDefault: true,
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
          // Symmetric cleanup: when the user deletes a mention chip before
          // sending, drop the matching sidecar field so it does not leak into
          // structured_data. Remove one instance (not all by id) so duplicate
          // mentions stay balanced, and return prev untouched when nothing
          // matched to preserve the reference.
          onRemove: (item: SuggestionItem) => {
            instanceRef.current?.input.updateStructuredData((prev) => {
              if (!prev?.fields) {
                return prev;
              }
              const index = prev.fields.findIndex(
                (field) => field.type === "mention" && field.id === item.id,
              );
              if (index === -1) {
                return prev;
              }
              const fields = [...prev.fields];
              fields.splice(index, 1);
              return { ...prev, fields };
            });
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
          // Mirror the mention cleanup so a deleted command chip also leaves
          // structured_data, removing a single matching field.
          onRemove: (item: SuggestionItem) => {
            instanceRef.current?.input.updateStructuredData((prev) => {
              if (!prev?.fields) {
                return prev;
              }
              const index = prev.fields.findIndex(
                (field) => field.type === "command" && field.id === item.id,
              );
              if (index === -1) {
                return prev;
              }
              const fields = [...prev.fields];
              fields.splice(index, 1);
              return { ...prev, fields };
            });
          },
        },
      },
    }),
    [],
  );

  return (
    <ChatCustomElement
      className="chat-custom-element"
      {...config}
      onBeforeRender={onBeforeRender}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
