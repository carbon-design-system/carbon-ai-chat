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
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { renderUserDefinedResponseFactory } from "./renderUserDefinedResponse";

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
        { label: "Show me a user_defined response" },
      ],
    },
  },
};

function App() {
  const [isHomescreenVisible, setIsHomescreenVisible] = useState(true);
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);

  function onBeforeRender(instance: ChatInstance) {
    // Get initial state
    const initialState = instance.getState();
    setIsHomescreenVisible(initialState.homeScreenState.isHomeScreenOpen);
    setActiveResponseId(initialState.activeResponseId ?? null);

    // Listen for STATE_CHANGE events
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        const isHomescreen = event.newState.homeScreenState.isHomeScreenOpen;
        if (
          event.previousState?.homeScreenState.isHomeScreenOpen !==
          event.newState.homeScreenState.isHomeScreenOpen
        ) {
          setIsHomescreenVisible(isHomescreen);
        }

        if (
          event.previousState?.activeResponseId !==
          event.newState?.activeResponseId
        ) {
          setActiveResponseId(event.newState.activeResponseId ?? null);
        }
        console.log(
          "View changed via STATE_CHANGE event:",
          isHomescreen ? "Homescreen" : "Chat View",
        );
      },
    });
  }

  const renderUserDefinedResponse = useMemo(
    () => renderUserDefinedResponseFactory(activeResponseId),
    [activeResponseId],
  );

  return (
    <div>
      <div>
        <h4>Current View State (via getState()):</h4>
        <p>{isHomescreenVisible ? "Homescreen" : "Chat View"}</p>
        <p>Watching state via STATE_CHANGE event</p>
      </div>
      <ChatContainer
        {...config}
        onBeforeRender={onBeforeRender}
        renderUserDefinedResponse={renderUserDefinedResponse}
      />
    </div>
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
