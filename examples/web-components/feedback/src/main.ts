/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Feedback (Web components)
 *
 * Demonstrates: subscribing to `BusEventType.FEEDBACK` so submitted thumbs
 * up/down events can be forwarded to a host telemetry pipeline. The mock
 * backend tags responses with `message_item_options.feedback` so the
 * widget renders.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `BusEventType.FEEDBACK` + `FeedbackInteractionType.SUBMITTED`
 *   - `instance.on(...)` (subscription lifecycle)
 *   - `message_item_options.feedback` (see `./customSendMessage.ts`)
 *
 * Start reading at: `feedbackHandler` and the `Demo` element below.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  BusEventType,
  type BusEvent,
  type BusEventFeedback,
  type ChatInstance,
  FeedbackInteractionType,
  type PublicConfig,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Drop the chat frame so the embedded widget blends with the host page chrome.
    showFrame: false,
  },
  // Skip the launcher so the feedback affordance is reachable in a single click.
  openChatByDefault: true,
};

function feedbackHandler(event: BusEvent) {
  const feedback = event as BusEventFeedback;
  // Only forward fully-submitted feedback; intermediate interactions (open/close of the details panel) are noise to the host app.
  if (feedback.interactionType === FeedbackInteractionType.SUBMITTED) {
    const { ...reportData } = feedback;
    // Defer the alert so the chat finishes its own state updates before the modal blocks the main thread.
    setTimeout(() => {
      // eslint-disable-next-line no-alert
      window.alert(JSON.stringify(reportData, null, 2));
    });
  }
}

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  onBeforeRender = (instance: ChatInstance) => {
    // Subscribe to BusEventType.FEEDBACK so thumbs up/down submissions can be forwarded to a host telemetry pipeline.
    instance.on({ type: BusEventType.FEEDBACK, handler: feedbackHandler });
  };

  render() {
    return html`
      <cds-aichat-custom-element
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .onBeforeRender=${this.onBeforeRender}
        class="chat-custom-element"
      ></cds-aichat-custom-element>
    `;
  }
}
