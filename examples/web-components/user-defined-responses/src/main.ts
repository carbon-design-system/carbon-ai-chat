/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — User-defined responses (Web components)
 *
 * Demonstrates: rendering `user_defined` response items via
 * `renderUserDefinedResponse` (returning an HTMLElement), with
 * `STATE_CHANGE` tracking of `activeResponseId`. Tracked elements are
 * stored in a Map so the parent component can mutate their content as
 * the active response changes.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `renderUserDefinedResponse` (returns an `HTMLElement`)
 *   - `BusEventType.STATE_CHANGE` for `activeResponseId`
 *   - `MessageResponseTypes.USER_DEFINED` (see `./customSendMessage.ts`)
 *
 * Start reading at: `renderUserDefinedCallback` and the `updated()` hook.
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

import { customSendMessage } from "./customSendMessage";

const config: PublicConfig = {
  // Routes outgoing messages through the local mock instead of a real backend so the example runs offline.
  messaging: {
    customSendMessage,
  },
  layout: {
    // Drops the default chat chrome so the embedded custom element fills the host frame cleanly.
    showFrame: false,
  },
  // Opens the chat immediately so visitors land directly on the user-defined render demo without an extra click.
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
    // Seed from the current state so the very first render reflects an already-active response when the chat reopens with history.
    const initialState = instance.getState();
    this.activeResponseId = initialState.activeResponseId ?? null;

    // BusEventType.STATE_CHANGE: mirror `activeResponseId` into a reactive @state so Lit's `updated()` lifecycle fires and tracked elements can refresh.
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
