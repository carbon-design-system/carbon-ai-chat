/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History (fullscreen) (Web components)
 *
 * Demonstrates: the same history-panel pattern as `history-float`,
 * but on the fullscreen `<cds-aichat-custom-element>` baseline. Adds a
 * `STATE_CHANGE` subscription on `customPanels.history.isMobile` so the
 * custom history panel can adapt its layout responsively.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.history.isOn`
 *   - `PublicConfig.messaging.customLoadHistory`
 *   - `BusEventType.STATE_CHANGE` for `customPanels.history.isMobile`
 *
 * Start reading at: `_loadChat`, the `STATE_CHANGE` handler in
 * `onBeforeRender`, and `renderWriteableElementSlots()`.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "./history-writeable-element-example";

import {
  BusEventType,
  type BusEvent,
  type BusEventStateChange,
  type ChatInstance,
  type PublicConfig,
} from "@carbon/ai-chat";
import { html, LitElement, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { customLoadHistory } from "./customLoadHistory";

const config: PublicConfig = {
  history: {
    // Activates the built-in history panel; without this the writeable element slot is never rendered.
    isOn: true,
  },
  messaging: {
    customSendMessage,
    // Supplies the synthetic transcript that gets injected when a history entry is selected.
    customLoadHistory,
  },
  layout: {
    // Removes the default chrome frame so the chat fills the fullscreen container edge to edge.
    showFrame: false,
  },
  // The fullscreen shell has no launcher, so the chat must mount opened.
  openChatByDefault: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .fullScreen {
      position: fixed;
      bottom: 0;
      right: 0;
      height: 100vh;
      width: 100vw;
      z-index: 9999;
    }
  `;

  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor valueFromParent: string = Date.now().toString();

  @state()
  accessor isMobile: boolean = false;

  onBeforeRender = (instance: ChatInstance) => {
    this.instance = instance;

    // Mirror the chat's internal mobile breakpoint into local state so the writeable element can swap to a mobile-friendly layout (close button, full-bleed panel) without re-measuring the viewport itself.
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: BusEvent) => {
        const { previousState, newState } = event as BusEventStateChange;
        // Only react when the mobile flag actually flipped; STATE_CHANGE fires for every state field, so the guard prevents redundant re-renders.
        if (
          previousState?.customPanels.history.isMobile !==
          newState?.customPanels.history.isMobile
        ) {
          this.isMobile = newState?.customPanels.history.isMobile;
        }
      },
    });
  };

  /**
   * Handles loading a new chat history.
   */
  _loadChat = async (event: CustomEvent) => {
    if (!this.instance) {
      return;
    }
    const requestText = event.detail.chatName;
    const historyData = await customLoadHistory(this.instance, requestText);

    // Wipe the live thread before injecting the loaded transcript; insertHistory appends rather than replaces.
    await this.instance.messaging.clearConversation();
    this.instance.messaging.insertHistory(historyData);
  };

  renderWriteableElementSlots() {
    if (!this.instance) {
      return null;
    }

    const key = "historyPanelElement";

    return html`
      <div slot=${key}>
        <history-writeable-element-example
          location=${key}
          .instance=${this.instance}
          .valueFromParent=${this.valueFromParent}
          .isMobile=${this.isMobile}
        ></history-writeable-element-example>
      </div>
    `;
  }

  render() {
    return html`
      <cds-aichat-custom-element
        class="fullScreen"
        .config=${config}
        .onBeforeRender=${this.onBeforeRender}
        @history-panel-load-chat=${this._loadChat}
        >${this.renderWriteableElementSlots()}</cds-aichat-custom-element
      >
    `;
  }
}
