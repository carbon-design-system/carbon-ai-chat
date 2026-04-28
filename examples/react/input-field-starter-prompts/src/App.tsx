/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  BusEventType,
  CarbonTheme,
  ChatContainer,
  ChatInstance,
  PublicConfig,
  SuggestionType,
} from "@carbon/ai-chat";
import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { STARTER_PROMPTS } from "./suggestions";

function App() {
  // Tracks whether the user has sent at least one message in this session.
  // Backed by useState (not useRef) so flipping it re-renders App, which
  // rebuilds `config` below with a fresh `items` closure.
  const [hasSent, setHasSent] = useState(false);

  // onBeforeRender is the earliest hook where we get the ChatInstance, which
  // is the entry point for the event bus. We subscribe once here; the chat
  // instance owns the listener lifetime, so no off() / cleanup is needed.
  const onBeforeRender = useCallback((instance: ChatInstance) => {
    instance.on({
      // BusEventType.SEND fires after the user's message has been handed off
      // to customSendMessage. PRE_SEND would also work; we use SEND so the
      // starter list disappears in lockstep with the message hitting the
      // transcript.
      type: BusEventType.SEND,
      handler: () => setHasSent(true),
    });
  }, []);

  const config: PublicConfig = useMemo(
    () => ({
      messaging: { customSendMessage },
      injectCarbonTheme: CarbonTheme.WHITE,
      input: {
        suggestions: [
          {
            type: SuggestionType.STARTER,
            // items is an async resolver (not a static array) so we can gate
            // it on chat state: empty list once `hasSent` flips to true. The
            // chat re-invokes items() each time the synthetic STARTER trigger
            // fires (every focus on an empty input), so this read stays fresh
            // for the rest of the session.
            items: async () => (hasSent ? [] : STARTER_PROMPTS),
          },
        ],
      },
    }),
    // hasSent is in the dep list so the closure inside items() captures the
    // latest value. Without this, the resolver would always see `false`.
    [hasSent],
  );

  return <ChatContainer {...config} onBeforeRender={onBeforeRender} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
