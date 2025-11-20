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
  FeedbackInteractionType,
  PublicConfig,
} from "@carbon/ai-chat";
import React from "react";

import { customSendMessage } from "./customSendMessage";
import { renderUserDefinedResponse } from "./renderUserDefinedResponse";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
};

function App() {
  function onBeforeRender(instance: ChatInstance) {
    instance.on({ type: BusEventType.FEEDBACK, handler: feedbackHandler });
  }

  function feedbackHandler(event: any) {
    if (event.interactionType === FeedbackInteractionType.SUBMITTED) {
      const { ...reportData } = event;
      setTimeout(() => {
        // eslint-disable-next-line no-alert
        window.alert(JSON.stringify(reportData, null, 2));
      });
    }
  }

  return (
    <ChatContainer
      {...config}
      onBeforeRender={onBeforeRender}
      renderUserDefinedResponse={renderUserDefinedResponse}
    />
  );
}

export { App };
