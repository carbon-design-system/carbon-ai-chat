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
import { html, LitElement, css } from "lit";
import { customElement, state } from "lit/decorators.js";

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
        { label: "Show me a user_defined response" },
      ],
    },
  },
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
  accessor isHomescreenVisible: boolean = true;

  @state()
  accessor activeResponseId: string | null = null;

  @state()
  accessor userDefinedSlotsMap: {
    [key: string]: { message: UserDefinedItem; fullMessage: MessageResponse };
  } = {};

  onBeforeRender = (instance: ChatInstance) => {
    // Set the instance in state.
    this.instance = instance;

    // Get initial state
    const initialState = instance.getState();
    this.isHomescreenVisible = initialState.homeScreenState.isHomeScreenOpen;
    this.activeResponseId = initialState.activeResponseId ?? null;

    // Listen for STATE_CHANGE events
    instance.on([
      {
        type: BusEventType.STATE_CHANGE,
        handler: (event: any) => {
          const isHomescreen = event.newState.homeScreenState.isHomeScreenOpen;
          if (
            event.previousState?.homeScreenState.isHomeScreenOpen !==
            isHomescreen
          ) {
            this.isHomescreenVisible = isHomescreen;
          }

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

  renderUserDefinedSlots() {
    return Object.entries(this.userDefinedSlotsMap).map(
      ([slot, { message, fullMessage }]) => {
        const isLatest =
          Boolean(this.activeResponseId) &&
          fullMessage?.id === this.activeResponseId;
        return html`<div slot=${slot}>
          <div class="external">
            ${message.user_defined?.text as string}
            <div>
              Latest response id:
              ${this.activeResponseId ? this.activeResponseId : "none yet"}
            </div>
            <div>
              Is this the most recent message? ${isLatest ? "Yes" : "Nope"}
            </div>
          </div>
        </div>`;
      },
    );
  }

  render() {
    return html`
      <div>
        <h4>Current View State (via getState()):</h4>
        <p>${this.isHomescreenVisible ? "Homescreen" : "Chat View"}</p>
        <p>Watching state via STATE_CHANGE event</p>
        <p>
          Active response id:
          ${this.activeResponseId ? this.activeResponseId : "none yet"}
        </p>
      </div>
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .homescreen=${config.homescreen}
        .injectCarbonTheme=${config.injectCarbonTheme}
      >
        ${this.renderUserDefinedSlots()}
      </cds-aichat-container>
    `;
  }
}
