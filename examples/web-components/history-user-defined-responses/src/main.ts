/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — History + user-defined responses (Web components)
 *
 * Demonstrates: rehydrating a conversation that contains multiple
 * `user_defined` cards via `customLoadHistory` + `insertHistory`
 * (returning `HTMLElement` from `renderUserDefinedResponse`), and showing
 * that `activeResponseId` (read via `instance.getState()` and tracked via
 * `BusEventType.STATE_CHANGE`) correctly identifies only the most-recent
 * card as active across a multi-card view.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `messaging.customLoadHistory` (see `./customLoadHistory.ts`)
 *   - `instance.messaging.clearConversation` / `insertHistory`
 *   - `renderUserDefinedResponse` (returns an `HTMLElement`)
 *   - `BusEventType.STATE_CHANGE` for `activeResponseId`
 *   - `MessageResponseTypes.USER_DEFINED` (see `./customSendMessage.ts`)
 *
 * Start reading at: `onBeforeRender` and the `updated()` hook.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  BusEventType,
  type BusEvent,
  type BusEventStateChange,
  type ChatInstance,
  type PublicConfig,
  type RenderUserDefinedState,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { html, LitElement, css, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customLoadHistory } from "./customLoadHistory";
import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  messaging: {
    // Routes outgoing messages through the local mock instead of a real backend so the example runs offline.
    customSendMessage,
    // Registered so it can be called from onBeforeRender; the example drives the rehydration manually rather than enabling history.isOn (which would also pull in the history-panel UI).
    customLoadHistory,
  },
  layout: {
    // Drops the default chat chrome so the embedded custom element fills the host frame cleanly.
    showFrame: false,
  },
  // Opens the chat immediately so the rehydrated cards land in front of the visitor without a launcher click.
  openChatByDefault: true,
};

interface TrackedElementData {
  text: string;
  fullMessageId?: string;
}

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }

    .external {
      background: green;
      color: #fff;
      padding: 1rem;
    }
  `;

  @state()
  accessor activeResponseId: string | null = null;

  // Each rendered user_defined element is kept alongside its source data so `updated()` can re-render its content imperatively when `activeResponseId` changes; the chat owns these nodes' lifetimes, not Lit.
  private _userDefinedElements = new Map<HTMLElement, TrackedElementData>();

  onBeforeRender = (instance: ChatInstance) => {
    // Order is load-bearing: seed → subscribe → insertHistory. If insertHistory ran first, the resulting STATE_CHANGE for activeResponseId would fire before the listener exists and the seeded null would stick.
    const initialState = instance.getState();
    this.activeResponseId = initialState.activeResponseId ?? null;

    // BusEventType.STATE_CHANGE: mirror `activeResponseId` into a reactive @state so Lit's `updated()` lifecycle fires and tracked elements can refresh (including for the change emitted by insertHistory below).
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: BusEvent) => {
        const { previousState, newState } = event as BusEventStateChange;
        // Guard against unrelated state changes so we only re-render when the active response actually flipped.
        if (previousState?.activeResponseId !== newState?.activeResponseId) {
          this.activeResponseId = newState.activeResponseId ?? null;
        }
      },
    });

    // Auto-rehydrate so the example surface has multiple user_defined cards from the start. clearConversation runs first because insertHistory appends; on a fresh chat it is idempotent and defends against re-entry if onBeforeRender ever fires twice.
    void (async () => {
      const historyData = await customLoadHistory(instance);
      await instance.messaging.clearConversation();
      instance.messaging.insertHistory(historyData);
    })();
  };

  protected updated(changedProperties: PropertyValues): void {
    // Lit cannot re-render the chat-owned children declaratively, so when the tracked id changes we walk the Map and mutate each detached element directly.
    if (changedProperties.has("activeResponseId")) {
      for (const [el, data] of this._userDefinedElements) {
        // Drop entries whose host node has been removed from the DOM by the chat to keep the Map from leaking across long sessions.
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

  renderUserDefinedCallback = (
    state: RenderUserDefinedState,
    _instance: ChatInstance,
  ): HTMLElement | null => {
    const messageItem = state.messageItem as UserDefinedItem | undefined;

    // Only claim items this example produced; returning null for anything else lets the chat fall back to its default rendering.
    if (
      messageItem?.user_defined?.user_defined_type === "my_unique_identifier"
    ) {
      const el = document.createElement("div");
      el.className = "external";
      const data: TrackedElementData = {
        text: messageItem.user_defined.text as string,
        fullMessageId: state.fullMessage?.id,
      };
      // Register before the first paint so the element is already tracked if `activeResponseId` flips on the very next tick.
      this._userDefinedElements.set(el, data);
      this.updateElementContent(el, data);
      return el;
    }

    return null;
  };

  render() {
    return html`
      <cds-aichat-custom-element
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .onBeforeRender=${this.onBeforeRender}
        .renderUserDefinedResponse=${this.renderUserDefinedCallback}
        class="chat-custom-element"
      ></cds-aichat-custom-element>
    `;
  }
}
