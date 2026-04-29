/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Input-field starter prompts (React)
 *
 * Demonstrates: registering a `SuggestionType.STARTER` entry on
 * `input.suggestions` so a curated list of prompt seeds appears when the
 * user focuses an empty input. The list disappears once `BusEventType.SEND`
 * fires (i.e. the conversation has started).
 *
 * APIs exercised:
 *   - `ChatCustomElement` (canonical fullscreen baseline)
 *   - `PublicConfig.input.suggestions` + `SuggestionType.STARTER`
 *   - `BusEventType.SEND` for one-time gating
 *
 * Start reading at: `App()` and the `useMemo`'d `config`.
 */

import {
  BusEventType,
  CarbonTheme,
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
  SuggestionType,
} from "@carbon/ai-chat";
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { STARTER_PROMPTS } from "./suggestions";

function App() {
  const [hasSent, setHasSent] = useState(false);

  const onBeforeRender = useCallback((instance: ChatInstance) => {
    // BusEventType.SEND fires once per user-submitted message; flipping
    // `hasSent` collapses the starter-prompt list so it does not reappear
    // mid-conversation.
    instance.on({
      type: BusEventType.SEND,
      handler: () => setHasSent(true),
    });
  }, []);

  const config: PublicConfig = useMemo(
    () => ({
      messaging: { customSendMessage },
      // Apply the Carbon WHITE token palette so the embedded chat matches
      // the host page rather than defaulting to the system theme.
      injectCarbonTheme: CarbonTheme.WHITE,
      layout: {
        // Render the chat without the surrounding window chrome since this
        // example mounts inline as a fullscreen custom element.
        showFrame: false,
      },
      // Auto-open the chat panel so the starter prompts are immediately
      // visible when the page loads.
      openChatByDefault: true,
      input: {
        // SuggestionType.STARTER renders the items above the input only
        // while the conversation is empty; returning [] after `hasSent`
        // gates the list to a single appearance.
        suggestions: [
          {
            type: SuggestionType.STARTER,
            items: async () => (hasSent ? [] : STARTER_PROMPTS),
          },
        ],
      },
    }),
    [hasSent],
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
