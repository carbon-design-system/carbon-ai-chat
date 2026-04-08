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
  FeedbackInteractionType,
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
  accessor activeResponseId: string | null = null;

  /**
   * Tracks callback-rendered elements so we can update their content
   * when parent state (activeResponseId) changes.
   */
  private _userDefinedElements = new Map<HTMLElement, TrackedElementData>();

  onBeforeRender = (instance: ChatInstance) => {
    // Set the instance in state.
    this.instance = instance;
    const initialState = instance.getState();
    this.activeResponseId = initialState.activeResponseId ?? null;

    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        if (
          event.previousState?.activeResponseId !==
          event.newState?.activeResponseId
        ) {
          this.activeResponseId = event.newState.activeResponseId ?? null;
        }
      },
    });

    // Register feedback handler.
    instance.on({ type: BusEventType.FEEDBACK, handler: this.feedbackHandler });
  };

  /**
   * Handles when the user submits feedback.
   */
  feedbackHandler = (event: any) => {
    if (event.interactionType === FeedbackInteractionType.SUBMITTED) {
      const { ...reportData } = event;
      setTimeout(() => {
        // eslint-disable-next-line no-alert
        window.alert(JSON.stringify(reportData, null, 2));
      });
    }
  };

  /**
   * When activeResponseId changes, update all tracked user_defined elements
   * so the "is this the most recent message" display stays current.
   */
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
   * streaming state, and element lifecycle. We just return an HTMLElement.
   */
  renderUserDefinedCallback = (
    state: RenderUserDefinedState,
    _instance: ChatInstance,
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
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .injectCarbonTheme=${config.injectCarbonTheme}
        .renderUserDefinedResponse=${this.renderUserDefinedCallback}
      ></cds-aichat-container>
    `;
  }
}
