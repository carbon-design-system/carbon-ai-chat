/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "./styles.css";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import {
  BusEventType,
  type ChatInstance,
  FeedbackInteractionType,
  type MessageResponse,
  type PublicConfig,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

interface UserDefinedSlotsMap {
  [key: string]: UserDefinedSlot;
}

interface UserDefinedSlot {
  message: UserDefinedItem;
  fullMessage: MessageResponse;
}

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor userDefinedSlotsMap: UserDefinedSlotsMap = {};

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;

    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: this.userDefinedHandler,
    });

    instance.on({ type: BusEventType.FEEDBACK, handler: this.feedbackHandler });
  };

  feedbackHandler = (event: any) => {
    if (event.interactionType === FeedbackInteractionType.SUBMITTED) {
      const { ...reportData } = event;
      setTimeout(() => {
        window.alert(JSON.stringify(reportData, null, 2));
      });
    }
  };

  userDefinedHandler = (event: any) => {
    const { data } = event;
    this.userDefinedSlotsMap[data.slot] = {
      message: data.message,
      fullMessage: data.fullMessage,
    };
    this.requestUpdate();
  };

  renderUserDefinedSlots() {
    const userDefinedSlotsKeyArray = Object.keys(this.userDefinedSlotsMap);
    return userDefinedSlotsKeyArray.map((slot) => {
      return this.renderUserDefinedResponse(slot);
    });
  }

  renderUserDefinedResponse(slot: keyof UserDefinedSlotsMap) {
    const { message } = this.userDefinedSlotsMap[slot];

    const userDefinedMessage = message;

    switch (userDefinedMessage.user_defined?.user_defined_type) {
      case "my_unique_identifier":
        return html`<div slot=${slot} style="color: green;">
          ${userDefinedMessage.user_defined.text as string}
        </div>`;
      default:
        return null;
    }
  }

  render() {
    return html`
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        >${this.renderUserDefinedSlots()}</cds-aichat-container
      >
    `;
  }
}
