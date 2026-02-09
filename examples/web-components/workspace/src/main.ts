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
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import "./workspace-writeable-element-example";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  injectCarbonTheme: CarbonTheme.WHITE,
};

@customElement("my-app")
export class Demo extends LitElement {
  @state()
  accessor instance!: ChatInstance;

  @state()
  accessor activeResponseId: string | null = null;

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

    // Register workspace panel handler.
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: this.workspacePanelHandler,
    });
  };

  /**
   * Handles when the workspace panel is opened.
   */
  workspacePanelHandler = (event: any) => {
    console.log(event, "Workspace panel opened");
  };

  /**
   * Renders the workspace panel element when the workspace slot is set.
   */
  renderWorkspaceElement() {
    return html`<workspace-writeable-element-example
      .instance=${this.instance}
      location="workspace"
      valueFromParent="Hello from parent!"
    ></workspace-writeable-element-example>`;
  }

  render() {
    return html`
      <cds-aichat-container
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .injectCarbonTheme=${config.injectCarbonTheme}
        ><div slot="workspacePanelElement">
          ${this.renderWorkspaceElement()}
        </div></cds-aichat-container
      >
    `;
  }
}
