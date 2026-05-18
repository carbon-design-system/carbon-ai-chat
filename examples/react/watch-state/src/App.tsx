/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Watch state
 *
 * Demonstrates: subscribing to `BusEventType.STATE_CHANGE` to mirror chat
 * state into the host UI. This example tracks
 * `homeScreenState.isHomeScreenOpen` and reflects it in a status panel that
 * sits next to the floating chat launcher — the panel is the primary host
 * surface so state transitions are observable as the user opens the chat.
 *
 * APIs exercised:
 *   - `ChatContainer`
 *   - `BusEventType.STATE_CHANGE`
 *   - `instance.getState()` for the initial snapshot
 *   - `PublicConfig.homescreen` (drives view transitions used in the demo)
 *
 * Start reading at: `App()` then the `STATE_CHANGE` handler in
 * `onBeforeRender`.
 */

import {
  BusEvent,
  BusEventStateChange,
  BusEventType,
  ChatContainer,
  ChatInstance,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import "@carbon/styles/css/styles.css";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  // Enable the homescreen so toggling between it and the chat view produces the STATE_CHANGE traffic this example watches.
  homescreen: {
    isOn: true,
    greeting: "👋 Hello!\n\nWelcome to Carbon AI Chat.",
    starters: {
      isOn: true,
      buttons: [
        { label: "What can you help me with?" },
        { label: "Tell me about state management" },
        { label: "How do I use the STATE_CHANGE event?" },
      ],
    },
  },
};

function App() {
  const [isHomescreenVisible, setIsHomescreenVisible] = useState(true);

  function onBeforeRender(instance: ChatInstance) {
    // Seed the host UI with the current snapshot before any STATE_CHANGE events fire.
    const initialState = instance.getState();
    setIsHomescreenVisible(initialState.homeScreenState.isHomeScreenOpen);

    // Subscribe to BusEventType.STATE_CHANGE to mirror chat state into host React state as it changes.
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: BusEvent) => {
        const { previousState, newState } = event as BusEventStateChange;
        const isHomescreen = newState.homeScreenState.isHomeScreenOpen;
        // STATE_CHANGE fires for every slice of state; gate on the field we care about to avoid redundant React renders.
        if (previousState?.homeScreenState.isHomeScreenOpen !== isHomescreen) {
          setIsHomescreenVisible(isHomescreen);
        }
      },
    });
  }

  return (
    <>
      <div className="watch-state-host">
        <h4>Current View State (via getState()):</h4>
        <p>{isHomescreenVisible ? "Homescreen" : "Chat View"}</p>
        <p>Watching state via STATE_CHANGE event</p>
      </div>
      <ChatContainer {...config} onBeforeRender={onBeforeRender} />
    </>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
