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
  CornersType,
  PanelType,
  ViewType,
  type ChatInstance,
  type MessageResponse,
  type PublicConfig,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import AiLaunch20 from "@carbon/icons/es/ai-launch/20.js";

import { customSendMessage } from "./customSendMessage";
import "./inventory-report-example";
import "./inventory-status-example";
import "./outstanding-orders-example";
import "./outstanding-orders-card";
import "./styles.css";

interface UserDefinedSlotsMap {
  [key: string]: UserDefinedSlot;
}

interface UserDefinedSlot {
  message: UserDefinedItem;
  fullMessage: MessageResponse;
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  layout: {
    corners: CornersType.SQUARE,
  },
  openChatByDefault: true,
  injectCarbonTheme: CarbonTheme.WHITE,
};

@customElement("my-app")
export class Demo extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .app-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 48px;
      background-color: #161616;
      color: #f4f4f4;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
      z-index: 10000;
    }

    .app-header__title {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0;
    }

    .app-header__button {
      background: transparent;
      border: none;
      color: #f4f4f4;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 70ms cubic-bezier(0.2, 0, 0.38, 0.9);
    }

    .app-header__button:hover {
      background-color: #353535;
    }

    .app-header__button:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .sidebar {
      position: fixed;
      right: 0;
      top: 48px;
      height: calc(100vh - 48px);
      width: 320px;
      z-index: 9999;
      transition: right 240ms cubic-bezier(0.2, 0, 0.38, 0.9);
      visibility: visible;
    }

    .sidebar .chat-custom-element {
      height: 100%;
      width: 100%;
    }

    .sidebar--expanded {
      width: calc(100vw - 320px - 2rem);
    }

    .sidebar--expanding {
      transition:
        right 240ms cubic-bezier(0.2, 0, 0.38, 0.9),
        width 400ms cubic-bezier(0.2, 0, 0.38, 0.9);
    }

    .sidebar--contracting {
      transition:
        right 240ms cubic-bezier(0.2, 0, 0.38, 0.9),
        width 400ms cubic-bezier(0.2, 0, 0.38, 0.9);
    }

    .sidebar--closing {
      right: calc(calc(320px + 1rem) * -1);
      width: 320px;
    }

    .sidebar--closed {
      right: calc(calc(320px + 1rem) * -1);
      width: 320px;
      visibility: hidden;
    }

    /* RTL support */
    :host([dir="rtl"]) .sidebar {
      right: auto;
      left: 0;
      transition:
        left 70ms cubic-bezier(0.2, 0, 0.38, 0.9),
        visibility 0s 70ms;
    }

    :host([dir="rtl"]) .sidebar--expanded {
      width: calc(100vw - 320px - 2rem);
    }

    :host([dir="rtl"]) .sidebar--expanding {
      transition:
        left 70ms cubic-bezier(0.2, 0, 0.38, 0.9),
        width 400ms cubic-bezier(0.2, 0, 0.38, 0.9),
        visibility 0s 70ms;
    }

    :host([dir="rtl"]) .sidebar--contracting {
      transition:
        left 70ms cubic-bezier(0.2, 0, 0.38, 0.9),
        width 400ms cubic-bezier(0.2, 0, 0.38, 0.9),
        visibility 0s 70ms;
    }

    :host([dir="rtl"]) .sidebar--closing {
      left: calc(calc(320px + 1rem) * -1);
      width: 320px;
    }

    :host([dir="rtl"]) .sidebar--closed {
      right: auto;
      left: calc(calc(320px + 1rem) * -1);
      width: 320px;
      transition:
        left 70ms cubic-bezier(0.2, 0, 0.38, 0.9),
        visibility 0s 0s;
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

  @state()
  accessor userDefinedSlotsMap: UserDefinedSlotsMap = {};

  // Sidebar state management
  @state()
  accessor sideBarOpen: boolean = false;

  @state()
  accessor sideBarClosing: boolean = false;

  @state()
  accessor workspaceExpanded: boolean = false;

  @state()
  accessor workspaceAnimating: "expanding" | "contracting" | null = null;

  @state()
  accessor clickInProgress: boolean = false;

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

    // Register user defined response handler.
    instance.on({
      type: BusEventType.USER_DEFINED_RESPONSE,
      handler: this.userDefinedHandler,
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
      type: BusEventType.WORKSPACE_PRE_CLOSE,
      handler: this.workspacePanelPreCloseHandler,
    });

    instance.on({
      type: BusEventType.WORKSPACE_CLOSE,
      handler: this.workspacePanelCloseHandler,
    });

    // Register view change handlers
    instance.on({
      type: BusEventType.VIEW_CHANGE,
      handler: this.onViewChange,
    });

    instance.on({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: this.onViewPreChange,
    });
  };

  /**
   * Handles when the workspace panel is about to open.
   */
  workspacePanelPreOpenHandler = (event: any) => {
    console.log(
      event.data,
      "This event can be used to load additional resources into the workspace while displaying a manual loading state.",
    );
    // Expand sidebar when workspace is opening
    console.log("Expanding sidebar - workspace opening");
    this.workspaceAnimating = "expanding";
    this.workspaceExpanded = true;
  };

  /**
   * Handles when the workspace panel is opened.
   */
  workspacePanelOpenHandler = (event: any) => {
    console.log(event.data, "Workspace panel opened");

    // Extract workspace data from the event
    const { workspaceId, additionalData } = event.data;
    this.workspaceId = workspaceId;
    this.workspaceAdditionalData = additionalData;
    this.workspaceType = (additionalData as { type?: string })?.type || null;
  };

  /**
   * Handles when the workspace panel is about to close.
   */
  workspacePanelPreCloseHandler = () => {
    // Contract sidebar when workspace is closing
    console.log("Contracting sidebar - workspace closing");
    this.workspaceAnimating = "contracting";
    this.workspaceExpanded = false;
  };

  /**
   * Handles when the workspace panel is closed.
   */
  workspacePanelCloseHandler = (event: any) => {
    console.log(event.data, "Workspace panel closed");

    // Clear workspace data when panel closes
    this.workspaceType = null;
    this.workspaceId = undefined;
    this.workspaceAdditionalData = null;
  };

  /**
   * Listens for view changes on the AI chat.
   */
  onViewChange = (event: any) => {
    if (event.newViewState.mainWindow) {
      this.sideBarOpen = true;
    } else {
      this.sideBarOpen = false;
      this.sideBarClosing = false;
    }
  };

  /**
   * Handles pre-view-change lifecycle for sidebar transitions.
   */
  onViewPreChange = async (event: any) => {
    if (!event.newViewState.mainWindow) {
      this.sideBarClosing = true;
      await sleep(250);
    }
  };

  /**
   * Handle transitionend to remove animation classes
   */
  handleTransitionEnd = (event: TransitionEvent) => {
    // Only handle width transitions
    if (event.propertyName === "width") {
      this.workspaceAnimating = null;
    }
  };

  /**
   * Handle header button click to toggle chat
   */
  handleHeaderButtonClick = async () => {
    if (!this.instance || this.clickInProgress) {
      return;
    }

    this.clickInProgress = true;
    try {
      const state = this.instance.getState();
      console.log({ viewState: state.viewState });
      if (state.viewState.mainWindow) {
        await this.instance.changeView(ViewType.LAUNCHER);
      } else {
        await this.instance.changeView(ViewType.MAIN_WINDOW);
      }
    } finally {
      this.clickInProgress = false;
    }
  };

  /**
   * Each user defined event is tied to a slot deeply rendered within AI chat that is generated at runtime.
   * Here we make sure we store all these slots along with their relevant data in order to be able to dynamically
   * render the content to be slotted when this.renderUserDefinedSlots() is called in the render function.
   */
  userDefinedHandler = (event: any) => {
    const { data } = event;
    this.userDefinedSlotsMap[data.slot] = {
      message: data.message,
      fullMessage: data.fullMessage,
    };
    this.requestUpdate();
  };

  /**
   * This renders each of the dynamically generated slots that were generated by the AI chat by calling
   * this.renderUserDefinedResponse on each one.
   */
  renderUserDefinedSlots() {
    const userDefinedSlotsKeyArray = Object.keys(this.userDefinedSlotsMap);
    return userDefinedSlotsKeyArray.map((slot) => {
      return this.renderUserDefinedResponse(slot);
    });
  }

  /**
   * Here we process a single item from this.userDefinedSlotsMap. We go ahead and use a switch statement to decide
   * which element we should be rendering.
   */
  renderUserDefinedResponse(slot: keyof UserDefinedSlotsMap) {
    const slotData = this.userDefinedSlotsMap[slot];
    if (!slotData) {
      return null;
    }

    const { message } = slotData;
    const userDefinedMessage = message;

    // Check the "type" we have used as our key.
    switch (userDefinedMessage.user_defined?.user_defined_type) {
      case "outstanding_orders_card":
        return html`<div slot=${slot}>
          <outstanding-orders-card
            .workspaceId=${userDefinedMessage.user_defined?.workspace_id}
            .additionalData=${userDefinedMessage.user_defined?.additional_data}
            .onMaximize=${() => {
              // Open workspace using the panels API
              const workspaceId = userDefinedMessage.user_defined
                ?.workspace_id as string;
              const additionalData = userDefinedMessage.user_defined
                ?.additional_data as { type?: string };
              this.workspaceId = workspaceId;
              this.workspaceAdditionalData = additionalData;
              this.workspaceType = additionalData?.type || null;

              // Use the customPanels API to open the workspace
              const panel = this.instance.customPanels?.getPanel(
                PanelType.WORKSPACE,
              );
              if (panel) {
                panel.open({
                  workspaceId,
                  additionalData,
                });
              }
            }}
          ></outstanding-orders-card>
        </div>`;
      default:
        return null;
    }
  }

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
      default:
        return html``;
    }
  }

  /**
   * Build className for sidebar layout
   */
  getSidebarClassName() {
    let className = "sidebar";
    if (this.workspaceExpanded) {
      className += " sidebar--expanded";
    }
    if (this.workspaceAnimating === "expanding") {
      className += " sidebar--expanding";
    } else if (this.workspaceAnimating === "contracting") {
      className += " sidebar--contracting";
    }
    if (this.sideBarClosing) {
      className += " sidebar--closing";
    } else if (!this.sideBarOpen) {
      className += " sidebar--closed";
    }
    return className;
  }

  render() {
    return html`
      <header class="app-header">
        <h1 class="app-header__title">Workspace Sidebar Example</h1>
        ${this.instance
          ? html`
              <button
                type="button"
                class="app-header__button"
                @click=${this.handleHeaderButtonClick}
                ?disabled=${this.clickInProgress}
                aria-label="Toggle AI Chat"
              >
                ${iconLoader(AiLaunch20)}
              </button>
            `
          : ""}
      </header>
      <div
        class=${this.getSidebarClassName()}
        @transitionend=${this.handleTransitionEnd}
      >
        <cds-aichat-custom-element
          .onBeforeRender=${this.onBeforeRender}
          .messaging=${config.messaging}
          .layout=${config.layout}
          .openChatByDefault=${config.openChatByDefault}
          .injectCarbonTheme=${config.injectCarbonTheme}
          class="chat-custom-element"
        >
          ${this.renderUserDefinedSlots()}
          <div slot="workspacePanelElement">
            ${this.renderWorkspaceElement()}
          </div>
        </cds-aichat-custom-element>
      </div>
    `;
  }
}

// Made with Bob
