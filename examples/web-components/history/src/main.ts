/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

import {
  BusEventType,
  CarbonTheme,
  type ChatInstance,
  type MessageResponse,
  type PublicConfig,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
    customLoadHistory,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .external {
      background: green;
      color: #fff;
      padding: 1rem;
    }
  `;

  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor activeResponseId: string | null = null;

  @state()
  accessor userDefinedSlotsMap: {
    [key: string]: { message: UserDefinedItem; fullMessage: MessageResponse };
  } = {};

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;

    const initialState = instance.getState();
    this.activeResponseId = initialState.activeResponseId ?? null;

    instance.on([
      {
        type: BusEventType.STATE_CHANGE,
        handler: (event: any) => {
          if (
            event.previousState?.activeResponseId !==
            event.newState?.activeResponseId
          ) {
            this.activeResponseId = event.newState.activeResponseId ?? null;
          }
        },
      },
      {
        type: BusEventType.USER_DEFINED_RESPONSE,
        handler: (event: any) => {
          const { slot, message, fullMessage } = event.data;
          if (!slot) {
            return;
          }
          this.userDefinedSlotsMap = {
            ...this.userDefinedSlotsMap,
            [slot]: { message, fullMessage },
          };
        },
      },
    ]);
  };

  async injectHistory() {
    if (!this.instance) {
      return;
    }

    const randomCount = Math.floor(Math.random() * 81) + 20; // Random number between 20 and 100
    const historyData = await customLoadHistory(this.instance, randomCount);

    await this.instance.messaging.clearConversation();
    this.instance.messaging.insertHistory(historyData);

    // Display the active response information for the last history message.
    const lastMessage = historyData[historyData.length - 1]?.message;
    const isLatest =
      lastMessage && lastMessage.id === this.activeResponseId ? "Yes" : "Nope";
    console.info(
      "[History Example] Last message id:",
      lastMessage?.id,
      "Is latest?",
      isLatest,
    );
  }

  render() {
    return html`
      ${this.instance
        ? html`<button @click=${this.injectHistory}>
            Insert a different conversation
          </button>`
        : ""}
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .injectCarbonTheme=${config.injectCarbonTheme}
      >
        ${Object.entries(this.userDefinedSlotsMap).map(
          ([slot, { message, fullMessage }]) => {
            const isLatest =
              Boolean(this.activeResponseId) &&
              fullMessage?.id === this.activeResponseId;
            return html`<div slot=${slot} class="external">
              ${message.user_defined?.text as string}
              <div>
                Latest response id:
                ${this.activeResponseId ? this.activeResponseId : "none yet"}
              </div>
              <div>
                Is this the most recent message? ${isLatest ? "Yes" : "Nope"}
              </div>
            </div>`;
          },
        )}
      </cds-aichat-container>
    `;
  }
}
