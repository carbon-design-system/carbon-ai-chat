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
  type RenderUserDefinedState,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { html, LitElement, css, PropertyValues } from "lit";
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

interface TrackedElementData {
  text: string;
  fullMessageId?: string;
}

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

  private _userDefinedElements = new Map<HTMLElement, TrackedElementData>();

  onBeforeRender = (instance: ChatInstance) => {
    // Set the instance in state.
    this.instance = instance;

    // Get initial state
    const initialState = instance.getState();
    this.isHomescreenVisible = initialState.homeScreenState.isHomeScreenOpen;
    this.activeResponseId = initialState.activeResponseId ?? null;

    // Listen for STATE_CHANGE events
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        const isHomescreen = event.newState.homeScreenState.isHomeScreenOpen;
        if (
          event.previousState?.homeScreenState.isHomeScreenOpen !== isHomescreen
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
    });
  };

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("activeResponseId")) {
      for (const [el, data] of this._userDefinedElements) {
        if (!el.isConnected) {
          this._userDefinedElements.delete(el);
          continue;
        }
        this.updateElementContent(el, data);
      }
    }
  }

  private updateElementContent(el: HTMLElement, data: TrackedElementData) {
    const isLatest =
      Boolean(this.activeResponseId) &&
      data.fullMessageId === this.activeResponseId;
    el.innerHTML = `
      ${data.text}
      <div>Latest response id: ${this.activeResponseId ?? "none yet"}</div>
      <div>Is this the most recent message? ${isLatest ? "Yes" : "Nope"}</div>
    `;
  }

  /**
   * Callback to render user_defined responses. The library manages event listening, slot tracking,
   * streaming state, and element lifecycle.
   */
  renderUserDefinedCallback = (
    state: RenderUserDefinedState,
  ): HTMLElement | null => {
    const messageItem = state.messageItem as UserDefinedItem | undefined;

    if (
      messageItem?.user_defined?.user_defined_type === "my_unique_identifier"
    ) {
      const el = document.createElement("div");
      el.className = "external";
      const data: TrackedElementData = {
        text: messageItem.user_defined.text as string,
        fullMessageId: state.fullMessage?.id,
      };
      this._userDefinedElements.set(el, data);
      this.updateElementContent(el, data);
      return el;
    }

    return null;
  };

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
        .renderUserDefinedResponse=${this.renderUserDefinedCallback}
      ></cds-aichat-container>
    `;
  }
}
