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
  FeedbackInteractionType,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";

// These functions hook up to your back-end.
import { customSendMessage } from "./customSendMessage";
// This function returns a React component for user defined responses.
import { renderUserDefinedResponseFactory } from "./renderUserDefinedResponse";

/**
 * It is preferable to create your configuration object outside of your React functions. You can also make use of
 * useCallback or useMemo if you need to put it inside.
 *
 * Either way, this will prevent you from spinning up a new config object over and over. Carbon AI Chat will run
 * a diff on the config object and if it is not deeply equal, the chat will be re-started.
 */
const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
};

function App() {
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);

  function onBeforeRender(instance: ChatInstance) {
    const initialState = instance.getState();
    setActiveResponseId(initialState.activeResponseId ?? null);

    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        if (
          event.previousState?.activeResponseId !==
          event.newState?.activeResponseId
        ) {
          setActiveResponseId(event.newState.activeResponseId ?? null);
        }
      },
    });

    // Handle feedback event.
    instance.on({ type: BusEventType.FEEDBACK, handler: feedbackHandler });
  }

  /**
   * Handles when the user submits feedback.
   */
  function feedbackHandler(event: any) {
    if (event.interactionType === FeedbackInteractionType.SUBMITTED) {
      const { ...reportData } = event;
      setTimeout(() => {
        // eslint-disable-next-line no-alert
        window.alert(JSON.stringify(reportData, null, 2));
      });
    }
  }

  const renderUserDefinedResponse = useMemo(
    () => renderUserDefinedResponseFactory(activeResponseId),
    [activeResponseId],
  );

  return (
    <ChatContainer
      {...config}
      // Set the instance into state for usage.
      onBeforeRender={onBeforeRender}
      renderUserDefinedResponse={renderUserDefinedResponse}
    />
  );
}

ReactDOM.render(<App />, document.querySelector("#root"));
