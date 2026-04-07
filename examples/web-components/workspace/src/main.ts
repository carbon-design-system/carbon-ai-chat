/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  BusEventType,
  CarbonTheme,
  PanelType,
  type ChatInstance,
  type PublicConfig,
  type RenderUserDefinedState,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";
import "./inventory-report-example";
import "./inventory-status-example";
import "./outstanding-orders-example";
import "./outstanding-orders-card";
import "./sql-editor-example";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    showFrame: false,
    customProperties: {
      "messages-max-width": `max(60vw, 672px)`,
    },
  },
  openChatByDefault: true,
  injectCarbonTheme: CarbonTheme.WHITE,
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
  accessor instance!: ChatInstance;

  @state()
  accessor activeResponseId: string | null = null;

  @state()
  accessor workspaceType: string | null = null;

  @state()
  accessor workspaceId: string | undefined = undefined;

  @state()
  accessor workspaceAdditionalData: any = null;

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

    // Register workspace panel handlers.
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: this.workspacePanelPreOpenHandler,
    });

    instance.on({
      type: BusEventType.WORKSPACE_OPEN,
      handler: this.workspacePanelOpenHandler,
    });

    instance.on({
      type: BusEventType.WORKSPACE_CLOSE,
      handler: this.workspacePanelCloseHandler,
    });
  };

  /**
   * Handles when the workspace panel is about to open.
   */
  workspacePanelPreOpenHandler = (event: any) => {
    console.log(event, "Workspace panel pre-open");
  };

  /**
   * Handles when the workspace panel is opened.
   */
  workspacePanelOpenHandler = (event: any) => {
    console.log(event, "Workspace panel opened");

    // Extract workspace data from the event
    const { workspaceId, additionalData } = event.data;
    this.workspaceId = workspaceId;
    this.workspaceAdditionalData = additionalData;
    this.workspaceType = (additionalData as { type?: string })?.type || null;
  };

  /**
   * Handles when the workspace panel is closed.
   */
  workspacePanelCloseHandler = (event: any) => {
    console.log(event, "Workspace panel closed");

    // Clear workspace data when panel closes
    this.workspaceType = null;
    this.workspaceId = undefined;
    this.workspaceAdditionalData = null;
  };

  /**
   * Callback to render user_defined responses. The library manages event listening, slot tracking,
   * streaming state, and element lifecycle.
   */
  renderUserDefinedCallback = (
    state: RenderUserDefinedState,
  ): HTMLElement | null => {
    const messageItem = state.messageItem as UserDefinedItem | undefined;

    if (
      messageItem?.user_defined?.user_defined_type === "outstanding_orders_card"
    ) {
      const el = document.createElement("outstanding-orders-card") as any;
      el.workspaceId = messageItem.user_defined?.workspace_id;
      el.additionalData = messageItem.user_defined?.additional_data;
      el.onMaximize = () => {
        const workspaceId = messageItem.user_defined?.workspace_id as string;
        const additionalData = messageItem.user_defined?.additional_data as {
          type?: string;
        };
        this.workspaceId = workspaceId;
        this.workspaceAdditionalData = additionalData;
        this.workspaceType = additionalData?.type || null;

        // Use the customPanels API to open the workspace
        const panel = this.instance.customPanels?.getPanel(PanelType.WORKSPACE);
        if (panel) {
          panel.open({
            workspaceId,
            additionalData,
          });
        }
      };
      return el;
    }

    return null;
  };

  /**
   * Renders the workspace panel element when the workspace slot is set.
   */
  renderWorkspaceElement() {
    if (!this.workspaceType) {
      return html``;
    }

    switch (this.workspaceType) {
      case "inventory_report":
        return html`<inventory-report-example
          .instance=${this.instance}
          .workspaceId=${this.workspaceId}
          .additionalData=${this.workspaceAdditionalData}
          location="workspace"
          valueFromParent="Hello from parent!"
        ></inventory-report-example>`;
      case "inventory_status":
        return html`<inventory-status-example
          .instance=${this.instance}
          .workspaceId=${this.workspaceId}
          .additionalData=${this.workspaceAdditionalData}
          location="workspace"
        ></inventory-status-example>`;
      case "outstanding_orders":
        return html`<outstanding-orders-example
          .instance=${this.instance}
          .workspaceId=${this.workspaceId}
          .additionalData=${this.workspaceAdditionalData}
          location="workspace"
        ></outstanding-orders-example>`;
      case "sql_editor":
        return html`<sql-editor-example
          .instance=${this.instance}
          .workspaceId=${this.workspaceId}
          .additionalData=${this.workspaceAdditionalData}
        ></sql-editor-example>`;
      default:
        return html``;
    }
  }

  render() {
    return html`
      <cds-aichat-custom-element
        .onBeforeRender=${this.onBeforeRender}
        .messaging=${config.messaging}
        .layout=${config.layout}
        .openChatByDefault=${config.openChatByDefault}
        .injectCarbonTheme=${config.injectCarbonTheme}
        .renderUserDefinedResponse=${this.renderUserDefinedCallback}
        class="chat-custom-element"
      >
        <div slot="workspacePanelElement">${this.renderWorkspaceElement()}</div>
      </cds-aichat-custom-element>
    `;
  }
}
