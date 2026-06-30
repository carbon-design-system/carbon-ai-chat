/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Feedback
 *
 * Demonstrates: subscribing to `BusEventType.FEEDBACK` so submitted thumbs
 * up/down events can be forwarded to a host telemetry pipeline. The mock
 * backend tags responses with `message_item_options.feedback` so the
 * widget renders.
 *
 * APIs exercised:
 *   - `ChatCustomElement` from `@carbon/ai-chat`
 *   - `BusEventType.FEEDBACK` + `FeedbackInteractionType.SUBMITTED`
 *   - `instance.on(...)` (subscription lifecycle)
 *   - `message_item_options.feedback` (see `./customSendMessage.ts`)
 *
 * Start reading at: the `config` constant below, then `feedbackHandler`.
 */

import {
  BusEvent,
  BusEventFeedback,
  BusEventType,
  ChatCustomElement,
  ChatInstance,
  FeedbackInteractionType,
  PublicConfig,
} from "@carbon/ai-chat";
import React from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Render without the default chrome so the example can be embedded inline.
    showFrame: false,
  },
  // Auto-open so the feedback widget is visible without a user gesture.
  openChatByDefault: true,
};

function feedbackHandler(event: BusEvent) {
  const feedback = event as BusEventFeedback;
  if (feedback.interactionType === FeedbackInteractionType.SUBMITTED) {
    const { ...reportData } = feedback;
    setTimeout(() => {
      // eslint-disable-next-line no-alert
      window.alert(JSON.stringify(reportData, null, 2));
    });
  }
}

function onBeforeRender(instance: ChatInstance) {
  // Subscribe to BusEventType.FEEDBACK so the host app can forward thumbs up/down submissions to telemetry.
  instance.on({ type: BusEventType.FEEDBACK, handler: feedbackHandler });
}

function App() {
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
