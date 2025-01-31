/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import {
  BusEventType,
  ChatContainer,
  ChatInstance,
  FeedbackInteractionType,
  PublicConfig,
} from "@carbon/ai-chat";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

// This function hooks up to your back-end.
import { customSendMessage } from "./customSendMessage";
// This function returns a React component for user defined responses.
import { renderUserDefinedResponse } from "./renderUserDefinedResponse";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
};

function App() {
  const [chatInstance, setChatInstance] = useState<ChatInstance>();

  function onBeforeRender(instance: ChatInstance) {
    // Handle feedback event.
    instance.on({ type: BusEventType.FEEDBACK, handler: feedbackHandler });

    // For usage later.
    setChatInstance(instance);
  }

  /**
   * Handles when the user submits feedback.
   */
  function feedbackHandler(event: any) {
    if (event.interactionType === FeedbackInteractionType.SUBMITTED) {
      const { message, messageItem, ...reportData } = event;
      setTimeout(() => {
        // eslint-disable-next-line no-alert
        window.alert(JSON.stringify(reportData, null, 2));
      });
    }
  }

  return (
    <ChatContainer
      config={config}
      // Set the instance into state for usage.
      onBeforeRender={onBeforeRender}
      renderUserDefinedResponse={renderUserDefinedResponse}
    />
  );
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
