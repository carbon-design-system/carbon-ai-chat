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
  CarbonTheme,
  type PublicConfig,
  type ServiceDeskFactoryParameters,
} from "@carbon/ai-chat";
import { html, LitElement, type PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import { MockServiceDesk } from "./mockServiceDesk";

interface UserData {
  name: string;
  id: string;
}

const messagingConfig: PublicConfig["messaging"] = {
  customSendMessage,
};

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor userData: UserData | undefined = undefined;

  /**
   * serviceDeskFactory is special: when its reference changes, cds-aichat-container must restart
   * the service desk and any live human-agent conversation will be disconnected. Keep it stable
   * by default, and only swap in a new factory when user data truly changes.
   */
  serviceDeskFactory = this.createServiceDeskFactory();

  // Stable factory for normal renders; captures the current user data snapshot.
  private createServiceDeskFactory() {
    const currentUserData = this.userData;
    return (parameters: ServiceDeskFactoryParameters) =>
      Promise.resolve(new MockServiceDesk(parameters, currentUserData));
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Mock updating user data after mount to mirror the React example behavior.
    setTimeout(() => {
      this.userData = { name: "Bob", id: "1234" };
    }, 5000);
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("userData")) {
      // Changing the factory reference signals the container to rebuild the service desk with
      // the new user data; this will reset any active human-agent chat session. You should avoid
      // this unless you have to (for instance, you don't have the userData guaranteed on mount).
      // Alernatively, you could just wait to render the chat until you have all the information
      // you need.
      this.serviceDeskFactory = this.createServiceDeskFactory();
    }
  }

  render() {
    return html`
      <cds-aichat-container
        .messaging=${messagingConfig}
        .serviceDeskFactory=${this.serviceDeskFactory}
        .injectCarbonTheme=${CarbonTheme.WHITE}
      ></cds-aichat-container>
    `;
  }
}
