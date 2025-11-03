/*
 *  Copyright IBM Corp. 2025
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
} from "@carbon/ai-chat";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
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
    // Get initial state
    const initialState = instance.getState();
    setIsHomescreenVisible(initialState.homeScreenState.isHomeScreenOpen);

    // Listen for STATE_CHANGE events
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        const isHomescreen = event.newState.homeScreenState.isHomeScreenOpen;
        setIsHomescreenVisible(isHomescreen);
        console.log(
          "View changed via STATE_CHANGE event:",
          isHomescreen ? "Homescreen" : "Chat View",
        );
      },
    });
  }

  return (
    <div>
      <div>
        <h4>Current View State (via getState()):</h4>
        <p>{isHomescreenVisible ? "Homescreen" : "Chat View"}</p>
        <p>Watching state via STATE_CHANGE event</p>
      </div>
      <ChatContainer {...config} onBeforeRender={onBeforeRender} />
    </div>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
