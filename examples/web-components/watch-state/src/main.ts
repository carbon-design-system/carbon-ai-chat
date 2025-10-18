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
  type PublicConfig,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
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
      ],
    },
  },
};

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor isHomescreenVisible: boolean = true;

  onBeforeRender = (instance: ChatInstance) => {
    // Set the instance in state.
    this.instance = instance;

    // Get initial state
    const initialState = instance.getState();
    this.isHomescreenVisible = initialState.homeScreenState.isHomeScreenOpen;

    // Listen for STATE_CHANGE events
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        const isHomescreen = event.newState.homeScreenState.isHomeScreenOpen;
        this.isHomescreenVisible = isHomescreen;
      },
    });
  };

  render() {
    return html`
      <div>
        <h4>Current View State (via getState()):</h4>
        <p>${this.isHomescreenVisible ? "Homescreen" : "Chat View"}</p>
        <p>Watching state via STATE_CHANGE event</p>
      </div>
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .homescreen=${config.homescreen}
        .injectCarbonTheme=${config.injectCarbonTheme}
      ></cds-aichat-container>
    `;
  }
}
