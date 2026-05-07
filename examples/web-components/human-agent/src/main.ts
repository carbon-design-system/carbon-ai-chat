/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Human agent (Web components)
 *
 * Demonstrates: handing the conversation off to a live agent through
 * `serviceDeskFactory`, including the pattern for keeping the factory
 * reference stable so the active session is not torn down unnecessarily.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `PublicConfig.serviceDeskFactory`
 *   - `ServiceDesk` (see `./mockServiceDesk.ts`)
 *
 * Start reading at: `createServiceDeskFactory()` and `willUpdate()`.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  type PublicConfig,
  type ServiceDeskFactoryParameters,
} from "@carbon/ai-chat";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { MockServiceDesk } from "./mockServiceDesk";

interface UserData {
  name: string;
  id: string;
}

// Routes outgoing user messages through the local mock instead of a real back-end.
const messagingConfig: PublicConfig["messaging"] = {
  customSendMessage,
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    .chat-custom-element {
      height: 100vh;
      width: 100vw;
    }
  `;

  @state()
  accessor userData: UserData | undefined = undefined;

  // Cache the factory on the instance so its identity stays stable across renders and the active service desk session is not torn down on every update.
  serviceDeskFactory = this.createServiceDeskFactory();

  private createServiceDeskFactory() {
    // Capture the current userData by value so the closure does not observe later mutations and surprise the running session.
    const currentUserData = this.userData;
    return (parameters: ServiceDeskFactoryParameters) =>
      Promise.resolve(new MockServiceDesk(parameters, currentUserData));
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Simulates async user data arriving after mount to exercise the factory rebuild path in willUpdate.
    setTimeout(() => {
      this.userData = { name: "Bob", id: "1234" };
    }, 5000);
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    // Rebuild the factory only when userData actually changes so an in-flight session is preserved across unrelated re-renders.
    if (changedProperties.has("userData")) {
      this.serviceDeskFactory = this.createServiceDeskFactory();
    }
  }

  render() {
    // messaging wires the mock customSendMessage into the chat.
    // serviceDeskFactory produces the MockServiceDesk used for the human agent hand-off.
    // layout.showFrame is disabled so the chat fills the full-viewport host element instead of rendering the default rounded frame.
    // openChatByDefault is enabled so the demo is immediately usable on load.
    return html`
      <cds-aichat-custom-element
        class="chat-custom-element"
        .messaging=${messagingConfig}
        .serviceDeskFactory=${this.serviceDeskFactory}
        .layout=${{ showFrame: false }}
        .openChatByDefault=${true}
      ></cds-aichat-custom-element>
    `;
  }
}
