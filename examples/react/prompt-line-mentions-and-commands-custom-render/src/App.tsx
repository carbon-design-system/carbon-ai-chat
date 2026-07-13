/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Mentions and commands (custom render)
 *
 * Demonstrates: the same mention/command suggestion configuration as the
 * `prompt-line-mentions-and-commands` example, plus a `renderCustomToken` for
 * mentions that swaps the default chip for a Carbon `Tag` wrapped in a
 * `Tooltip`. Commands keep the default chip rendering.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.mention` + `PublicConfig.input.command`
 *   - `mention.renderCustomToken` for chip rendering
 *   - `mention.onSelect` / `mention.onRemove` keep the structured-data sidecar
 *     in sync as chips are added and deleted
 *
 * Start reading at: `App()` and the `renderCustomToken` callback.
 */

import {
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
  SuggestionItem,
} from "@carbon/ai-chat";
import "@carbon/styles/css/styles.css";
import { Tag, Tooltip } from "@carbon/react";
import React, { useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { mentionItems, commandItems } from "./suggestions";

function App() {
  const instanceRef = useRef<ChatInstance | null>(null);

  // capture the ChatInstance early so suggestion onSelect handlers
  // (created inside a memoized config) can reach the live instance via
  // ref instead of capturing a stale closure.
  const onBeforeRender = useCallback((instance: ChatInstance) => {
    instanceRef.current = instance;
  }, []);

  const config: PublicConfig = useMemo(
    () => ({
      // route outbound user messages through the local handler
      // instead of opening a network connection to a real backend.
      messaging: { customSendMessage },
      layout: {
        // hide the default chat frame so the custom element fills its
        // host container — required for the canonical fullscreen surface.
        showFrame: false,
      },
      // auto-open the conversation so readers land on the input area
      // the example exists to showcase, not a launcher.
      openChatByDefault: true,
      input: {
        // declare the @-mention trigger that this example exists to
        // demonstrate alongside the default-rendered /-command trigger.
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
            // write the selected mention into the structured-data
            // sidecar so customSendMessage can read it alongside the
            // free-form text on submit.
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
          // symmetric cleanup: deleting a mention chip before sending
          // removes its sidecar field so it does not leak into
          // structured_data. drop a single instance so duplicates stay
          // balanced; return prev untouched when nothing matched.
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
          // replace the default mention chip with a Carbon Tag
          // wrapped in a Tooltip — this is the entire point of the
          // example. autoAlign uses floating-ui with strategy:'fixed'
          // so the tooltip escapes the editor's scroll/overflow
          // clipping rather than being hidden behind it.
          renderCustomToken: (item: SuggestionItem) => (
            <Tooltip
              label={item.description ?? item.label}
              align="top"
              autoAlign
            >
              <Tag size="sm" type="purple">
                @{item.label}
              </Tag>
            </Tooltip>
          ),
        },
        command: {
          trigger: "/",
          // commands only make sense at the start of the input,
          // so suppress the picker when "/" appears mid-line.
          triggerPosition: "start",
          items: commandItems,
          onSelect: (item: SuggestionItem) => {
            // mirror the mention path so commands also land in
            // structured_data and can be inspected by the backend.
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
          // mirror the mention cleanup so a deleted command chip also
          // leaves structured_data, removing a single matching field.
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
          // intentionally omit renderCustomToken so commands
          // keep the default chip — this contrast with the mention
          // path is what the example demonstrates.
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
