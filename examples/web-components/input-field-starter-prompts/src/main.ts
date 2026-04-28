/*
 *  Copyright IBM Corp. 2026
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
  SuggestionType,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { STARTER_PROMPTS } from "./suggestions";

@customElement("my-app")
export class Demo extends LitElement {
  // Tracks whether the user has sent at least one message in this session.
  // @state makes Lit re-render on change, which rebuilds `config` below with
  // a fresh `items` closure that captures the new value.
  @state()
  accessor hasSent = false;

  // onBeforeRender is the earliest hook where we get the ChatInstance, which
  // is the entry point for the event bus. We subscribe once here; the chat
  // instance owns the listener lifetime, so no off() / cleanup is needed.
  onBeforeRender = (instance: ChatInstance) => {
    instance.on({
      // BusEventType.SEND fires after the user's message has been handed off
      // to customSendMessage. PRE_SEND would also work; we use SEND so the
      // starter list disappears in lockstep with the message hitting the
      // transcript.
      type: BusEventType.SEND,
      handler: () => {
        this.hasSent = true;
      },
    });
  };

  // Getter (not a constant) so each render builds a new `items` closure that
  // captures the current `this.hasSent`.
  get config(): PublicConfig {
    return {
      messaging: { customSendMessage },
      injectCarbonTheme: CarbonTheme.WHITE,
      input: {
        suggestions: [
          {
            type: SuggestionType.STARTER,
            // items is an async resolver (not a static array) so we can gate
            // it on chat state: empty list once `this.hasSent` flips to true.
            // The chat re-invokes items() each time the synthetic STARTER
            // trigger fires (every focus on an empty input), so this read
            // stays fresh for the rest of the session.
            items: async () => (this.hasSent ? [] : STARTER_PROMPTS),
          },
        ],
      },
    };
  }

  render() {
    const cfg = this.config;
    return html`
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${cfg.messaging}
        .input=${cfg.input}
        .injectCarbonTheme=${cfg.injectCarbonTheme}
      ></cds-aichat-container>
    `;
  }
}
