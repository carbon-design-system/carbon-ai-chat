/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Workspace panel (Web components)
 *
 * Demonstrates: the workspace feature for opening rich, side-by-side
 * content via the `workspacePanelElement` slot. Subscribes to the
 * `WORKSPACE_*` bus events and uses `customPanels.getPanel` to open the
 * workspace from a `user_defined` response card's "maximize" action.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>`
 *   - `BusEventType.WORKSPACE_PRE_OPEN` / `WORKSPACE_OPEN` / `WORKSPACE_CLOSE`
 *   - `instance.customPanels.getPanel(PanelType.WORKSPACE)`
 *   - `renderUserDefinedResponse` for the maximize affordance
 *   - `workspacePanelElement` slot
 *
 * Start reading at: `onBeforeRender` and `renderWorkspaceElement()`.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

import {
  BusEventType,
  PanelType,
  type BusEvent,
  type BusEventWorkspaceClose,
  type BusEventWorkspaceOpen,
  type BusEventWorkspacePreOpen,
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
    // Route every outgoing message through the local mock so the example runs without a backend.
    customSendMessage,
  },
  layout: {
    // Drop the chat frame chrome so the workspace panel can occupy the full viewport alongside the messages.
    showFrame: false,
    customProperties: {
      // Cap message width while still letting the workspace breathe at wide viewports.
      "messages-max-width": `max(60vw, 672px)`,
    },
  },
  // Open immediately so the workspace demo is visible without an extra click.
  openChatByDefault: true,
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
  accessor workspaceType: string | null = null;

  @state()
  accessor workspaceId: string | undefined = undefined;

  @state()
  accessor workspaceAdditionalData: any = null;

  onBeforeRender = (instance: ChatInstance) => {
    // Capture the instance so panel actions (open/close) can call back into customPanels.
    this.instance = instance;

    // Subscribe before WORKSPACE_OPEN so callers can veto or mutate the open in a future iteration.
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: this.workspacePanelPreOpenHandler,
    });

    // Use WORKSPACE_OPEN to copy workspaceId/additionalData into local state and pick the slot child.
    instance.on({
      type: BusEventType.WORKSPACE_OPEN,
      handler: this.workspacePanelOpenHandler,
    });

    // Use WORKSPACE_CLOSE to clear local state so the slot collapses back to an empty fragment.
    instance.on({
      type: BusEventType.WORKSPACE_CLOSE,
      handler: this.workspacePanelCloseHandler,
    });
  };

  workspacePanelPreOpenHandler = (event: BusEvent) => {
    const preOpen = event as BusEventWorkspacePreOpen;
    // Debug wiring so the order of WORKSPACE_PRE_OPEN/OPEN/CLOSE is observable in the console.
    console.log(preOpen, "Workspace panel pre-open");
  };

  workspacePanelOpenHandler = (event: BusEvent) => {
    const open = event as BusEventWorkspaceOpen;
    // Debug wiring so the order of WORKSPACE_PRE_OPEN/OPEN/CLOSE is observable in the console.
    console.log(open, "Workspace panel opened");

    // Pull payload from the bus event so the slot can branch on additionalData.type without polling.
    const { workspaceId, additionalData } = open.data;
    this.workspaceId = workspaceId;
    this.workspaceAdditionalData = additionalData;
    // additionalData.type drives which child element renderWorkspaceElement returns.
    this.workspaceType = (additionalData as { type?: string })?.type || null;
  };

  workspacePanelCloseHandler = (event: BusEvent) => {
    const close = event as BusEventWorkspaceClose;
    // Debug wiring so the order of WORKSPACE_PRE_OPEN/OPEN/CLOSE is observable in the console.
    console.log(close, "Workspace panel closed");

    // Reset state so renderWorkspaceElement returns an empty template and the slot tears down.
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
        // Seed local state synchronously so the slot has content the moment WORKSPACE_OPEN fires.
        this.workspaceId = workspaceId;
        this.workspaceAdditionalData = additionalData;
        this.workspaceType = additionalData?.type || null;

        // Calling panel.open() is the supported way to drive the workspace from a user_defined card.
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
        .renderUserDefinedResponse=${this.renderUserDefinedCallback}
        class="chat-custom-element"
      >
        <div slot="workspacePanelElement">${this.renderWorkspaceElement()}</div>
      </cds-aichat-custom-element>
    `;
  }
}
