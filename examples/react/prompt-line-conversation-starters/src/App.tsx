/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Prompt Line Conversation Starters
 *
 * Demonstrates: surfacing conversation-starter prompts in the prompt line using
 * `input.starters` with a `renderCustomList` that adds a "Prompt suggestions"
 * header.
 *
 * The starters appear immediately when the editor is focused and empty (no
 * typing required). Selecting an item auto-sends in one action.
 *
 * A single toggle action enables or disables the starters list.
 * The action is disabled while the input has text because starters only trigger
 * on an empty editor.
 *
 * APIs exercised:
 *   - `ChatCustomElement`
 *   - `PublicConfig.layout.showFrame`
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.input.expanded`
 *   - `PublicConfig.input.starters` as `StartersConfig` (items + renderCustomList)
 *   - `starters.renderCustomList` (adds the "Prompt suggestions" header)
 *   - `PublicConfig.input.actions` (one toggle action that enables/disables starters)
 *   - `CDSAIChatAutocomplete` from `@carbon/ai-chat-components`
 *
 * Start reading at: `App()` and the `useMemo`'d `config`.
 */

import {
  ChatCustomElement,
  CustomListProps,
  PublicConfig,
  StartersConfig,
} from "@carbon/ai-chat";
import CDSAIChatAutocomplete from "@carbon/ai-chat-components/es/react/autocomplete.js";
import { Chat, ChatOff } from "@carbon/icons-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

/**
 * Example conversation-starter prompts. Replace with a dynamic source
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
 * Wraps `CDSAIChatAutocomplete` to add the "Prompt suggestions" header via
 * `headerConfig`. The send-arrow is hidden (`enableSendButton={false}`)
 * because selecting an item already auto-sends.
 */
function renderCustomList(props: CustomListProps) {
  const { items, onSelect, onDismiss } = props;
  return (
    <CDSAIChatAutocomplete
      items={items}
      headerConfig={{ showHeader: true, title: "Prompt suggestions" }}
      attached={false}
      enableSendButton={false}
      className="starter-list"
      onSelect={(e: CustomEvent<{ item: (typeof STARTER_ITEMS)[number] }>) =>
        onSelect(e.detail.item)
      }
      onDismiss={onDismiss}
    />
  );
}

function App() {
  const [startersEnabled, setStartersEnabled] = useState(true);
  const [inputHasText, setInputHasText] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const onPromptChange = (e: Event) => {
      const { rawValue } = (e as CustomEvent<{ rawValue: string }>).detail;
      setInputHasText(rawValue.length > 0);
    };
    el.addEventListener("cds-aichat-prompt-change", onPromptChange);
    return () => {
      el.removeEventListener("cds-aichat-prompt-change", onPromptChange);
    };
  }, []);

  const starters: StartersConfig = useMemo(
    () => ({ items: STARTER_ITEMS, renderCustomList }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const config: PublicConfig = useMemo(
    () => ({
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
        // header. Selecting an item auto-sends the message.
        // `isOn: false` suppresses the list without removing the config, keeping
        // the rich editor alive so toggling back on is instant.
        starters: { ...starters, isOn: startersEnabled },

        // Single toggle action: enables or disables the conversation starters.
        // Disabled when the input has text because starters only trigger on an
        // empty editor.
        actions: [
          {
            text: startersEnabled
              ? "Hide conversation starters"
              : "Show conversation starters",
            icon: startersEnabled ? ChatOff : Chat,
            onClick: () => setStartersEnabled((prev) => !prev),
            disabled: inputHasText,
          },
        ],
      },
    }),
    [starters, startersEnabled, inputHasText],
  );

  return (
    <div ref={containerRef}>
      <ChatCustomElement className="chat-custom-element" {...config} />
    </div>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
