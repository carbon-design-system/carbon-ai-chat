/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "./reasoning-summary.css";

import {
  BusEventType,
  type BusEventUserDefinedResponse,
  type ChatInstance,
  type PublicConfig,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

interface ReasoningSummaryPayload {
  user_defined_type: "reasoning_summary";
  summary: string;
  citations?: string[];
}

interface SlotData {
  message: UserDefinedItem;
}

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    // Drop the default chrome frame so the chat fills the host element edge to edge.
    showFrame: false,
  },
  // Open the chat immediately so the reasoning scenarios are visible on load.
  openChatByDefault: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  // Render in the light DOM so the global reasoning-summary.css (imported above)
  // styles the user_defined summary cards.
  createRenderRoot() {
    return this;
  }

  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor slotsBySlotName: Record<string, SlotData> = {};

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: this.handleUserDefinedResponse,
    });
  };

  handleUserDefinedResponse = (event: BusEventUserDefinedResponse) => {
    const next = { ...this.slotsBySlotName };
    next[event.data.slot] = { message: event.data.message as UserDefinedItem };
    this.slotsBySlotName = next;
  };

  renderUserDefinedSlots() {
    return Object.entries(this.slotsBySlotName).map(([slot, data]) => {
      const payload = data.message.user_defined as
        ReasoningSummaryPayload | undefined;
      if (payload?.user_defined_type !== "reasoning_summary") {
        return null;
      }
      return html`
        <div slot=${slot}>
          <div class="reasoning-summary">
            <div class="reasoning-summary__eyebrow">Step summary</div>
            <div class="reasoning-summary__body">${payload.summary}</div>
            ${
              payload.citations && payload.citations.length
                ? html`<ul class="reasoning-summary__citations">
                    ${payload.citations.map(
                      (citation) => html`<li>${citation}</li>`,
                    )}
                  </ul>`
                : null
            }
          </div>
        </div>
      `;
    });
  }

  render() {
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        >${this.renderUserDefinedSlots()}</cds-aichat-custom-element
      >
    `;
  }
}
