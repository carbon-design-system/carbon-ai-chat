/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Watch state (Web components)
 *
 * Demonstrates: subscribing to `BusEventType.STATE_CHANGE` to mirror chat
 * state into the host UI. Tracks `homeScreenState.isHomeScreenOpen` and
 * reflects it in a small status panel above the chat.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` (canonical fullscreen baseline)
 *   - `BusEventType.STATE_CHANGE`
 *   - `instance.getState()` for the initial snapshot
 *   - `PublicConfig.homescreen` (drives view transitions used in the demo)
 *
 * Start reading at: `onBeforeRender` and the `STATE_CHANGE` handler.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  BusEventType,
  type BusEvent,
  type BusEventStateChange,
  type ChatInstance,
  type PublicConfig,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  homescreen: {
    // Enable the homescreen so the demo has two distinct view states for
    // `homeScreenState.isHomeScreenOpen` to toggle between.
    isOn: true,
    // Greeting copy is what the user sees while `isHomeScreenOpen === true`.
    greeting: "👋 Hello!\n\nWelcome to Carbon AI Chat.",
    starters: {
      // Render conversation starter buttons so a click trivially flips the
      // homescreen state and triggers a STATE_CHANGE event.
      isOn: true,
      buttons: [
        { label: "What can you help me with?" },
        { label: "Tell me about state management" },
        { label: "How do I use the STATE_CHANGE event?" },
      ],
    },
  },
  layout: {
    // Drop the chat frame chrome so the embedded custom element fills the
    // host layout cleanly alongside the status panel.
    showFrame: false,
  },
  // Skip the launcher and mount straight into the chat so the STATE_CHANGE
  // wiring is observable on first paint.
  openChatByDefault: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
    }
    .chat-custom-element {
      flex: 1 1 auto;
      min-height: 0;
    }
  `;

  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor isHomescreenVisible: boolean = true;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;

    // Seed the mirror from `instance.getState()` because STATE_CHANGE only
    // fires on transitions; without this the panel would render empty until
    // the user first interacts with the chat.
    const initialState = instance.getState();
    this.isHomescreenVisible = initialState.homeScreenState.isHomeScreenOpen;

    // Subscribe to BusEventType.STATE_CHANGE to mirror chat state into the
    // host UI; this is the canonical hook for observing every public state
    // mutation emitted by ChatInstance.
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: BusEvent) => {
        const { previousState, newState } = event as BusEventStateChange;
        const isHomescreen = newState.homeScreenState.isHomeScreenOpen;
        // STATE_CHANGE fires for every state slice; gate the mirror update
        // on a real `isHomeScreenOpen` transition to avoid redundant Lit
        // re-renders on unrelated state changes.
        if (previousState?.homeScreenState.isHomeScreenOpen !== isHomescreen) {
          this.isHomescreenVisible = isHomescreen;
        }
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
      <cds-aichat-custom-element
        class="chat-custom-element"
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .homescreen=${config.homescreen}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
      ></cds-aichat-custom-element>
    `;
  }
}
