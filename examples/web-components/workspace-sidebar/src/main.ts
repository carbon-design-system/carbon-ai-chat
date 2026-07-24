/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Workspace sidebar (Web components)
 *
 * Demonstrates: the workspace feature combined with a docked sidebar layout
 * built on the library's shipped `cds-aichat-sidebar` classes and driven by
 * `VIEW_CHANGE` lifecycle hooks. Includes a custom host chrome and
 * `CornersType.SQUARE` for the sidebar treatment. The workspace expand /
 * contract modifiers compose on top of the shipped base class.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` styled with the shipped sidebar-layout CSS
 *     (`@carbon/ai-chat/css/chat-sidebar-layout.css`)
 *   - `BusEventType.WORKSPACE_*` (open / pre-open / close)
 *   - `BusEventType.VIEW_CHANGE`
 *   - `CornersType.SQUARE`
 *   - `instance.customPanels.getPanel(PanelType.WORKSPACE)`
 *
 * Start reading at: `onBeforeRender` and the view-change handlers.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat/css/chat-sidebar-layout.css";

import {
  BusEventType,
  CornersType,
  PanelType,
  ViewType,
  type BusEvent,
  type BusEventStateChange,
  type BusEventViewChange,
  type BusEventViewPreChange,
  type BusEventWorkspaceClose,
  type BusEventWorkspaceOpen,
  type BusEventWorkspacePreOpen,
  type ChatInstance,
  type PublicConfig,
  type RenderUserDefinedState,
  type UserDefinedItem,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import AiLaunch20 from "@carbon/icons/es/ai-launch/20.js";

import { customSendMessage } from "./customSendMessage";
import "./inventory-report-example";
import "./inventory-status-example";
import "./outstanding-orders-example";
import "./outstanding-orders-card";
import "./sql-editor-example";
import "./styles.css";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const config: PublicConfig = {
  messaging: {
    // Wire the local mock backend instead of a real assistant so the example runs offline.
    customSendMessage,
  },
  layout: {
    // Square corners visually fuse the chat into the docked sidebar so it reads as part of the host chrome.
    corners: CornersType.SQUARE,
  },
  // Skip the launcher because the sidebar is the entire experience this example demonstrates.
  openChatByDefault: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  // Disable shadow DOM so the document-level sidebar-layout CSS imported from
  // @carbon/ai-chat (and the local styles.css) applies to the host elements.
  createRenderRoot() {
    return this;
  }

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
    // Cache the ChatInstance so toolbar and card actions can reach customPanels and changeView later.
    this.instance = instance;
    const initialState = instance.getState();
    this.activeResponseId = initialState.activeResponseId ?? null;

    // Track activeResponseId so workspace components can correlate UI to the in-flight assistant turn.
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: BusEvent) => {
        const { previousState, newState } = event as BusEventStateChange;
        if (previousState?.activeResponseId !== newState?.activeResponseId) {
          this.activeResponseId = newState.activeResponseId ?? null;
        }
      },
    });

    // WORKSPACE_PRE_OPEN fires before the panel is shown so we can start the sidebar expand animation in lockstep.
    instance.on({
      type: BusEventType.WORKSPACE_PRE_OPEN,
      handler: this.workspacePanelPreOpenHandler,
    });

    // WORKSPACE_OPEN delivers the resolved workspaceId and additionalData payload that drives renderWorkspaceElement().
    instance.on({
      type: BusEventType.WORKSPACE_OPEN,
      handler: this.workspacePanelOpenHandler,
    });

    // WORKSPACE_PRE_CLOSE lets the host start contracting the sidebar before the panel actually disappears.
    instance.on({
      type: BusEventType.WORKSPACE_PRE_CLOSE,
      handler: this.workspacePanelPreCloseHandler,
    });

    // WORKSPACE_CLOSE is the final hook for clearing workspace state once the panel is fully torn down.
    instance.on({
      type: BusEventType.WORKSPACE_CLOSE,
      handler: this.workspacePanelCloseHandler,
    });

    // VIEW_CHANGE toggles sideBarOpen so the sidebar slides in or out together with the chat mainWindow view.
    instance.on({
      type: BusEventType.VIEW_CHANGE,
      handler: this.onViewChange,
    });

    // VIEW_PRE_CHANGE runs before the view actually changes so we can play the closing animation before the chat unmounts.
    instance.on({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: this.onViewPreChange,
    });
  };

  workspacePanelPreOpenHandler = (event: BusEvent) => {
    const { data } = event as BusEventWorkspacePreOpen;
    // Debug log of the pre-open payload so developers can see the data shape during integration.
    console.log(
      data,
      "This event can be used to load additional resources into the workspace while displaying a manual loading state.",
    );
    // Trace marker that pairs with the contraction log below so the expand/contract sequence is observable.
    console.log("Expanding sidebar - workspace opening");
    // Apply the expanding modifier first so the width transition fires alongside the panel's own open animation.
    this.workspaceAnimating = "expanding";
    this.workspaceExpanded = true;
  };

  workspacePanelOpenHandler = (event: BusEvent) => {
    const { data } = event as BusEventWorkspaceOpen;
    // Debug log so integrators can see the resolved open payload that downstream components consume.
    console.log(data, "Workspace panel opened");

    // Pull the workspaceId and additionalData out of the event so renderWorkspaceElement can route on type.
    const { workspaceId, additionalData } = data;
    this.workspaceId = workspaceId;
    this.workspaceAdditionalData = additionalData;
    // additionalData.type is the discriminator used by the renderWorkspaceElement switch.
    this.workspaceType = (additionalData as { type?: string })?.type || null;
  };

  workspacePanelPreCloseHandler = () => {
    // Trace marker so the contract phase is visible in the console alongside the expand log.
    console.log("Contracting sidebar - workspace closing");
    // Switch to the contracting modifier before the panel hides so the width transition is in flight when it disappears.
    this.workspaceAnimating = "contracting";
    this.workspaceExpanded = false;
  };

  workspacePanelCloseHandler = (event: BusEvent) => {
    const { data } = event as BusEventWorkspaceClose;
    // Debug log so the close payload is visible during integration.
    console.log(data, "Workspace panel closed");

    // Reset workspace state so renderWorkspaceElement returns empty html on the next render.
    this.workspaceType = null;
    this.workspaceId = undefined;
    this.workspaceAdditionalData = null;
  };

  onViewChange = (event: BusEvent) => {
    const { newViewState } = event as BusEventViewChange;
    if (newViewState.mainWindow) {
      // mainWindow becoming visible means the sidebar should be considered fully opened.
      this.sideBarOpen = true;
    } else {
      // After the closing animation finishes the chat is gone, so clear both flags to reach the closed resting state.
      this.sideBarOpen = false;
      this.sideBarClosing = false;
    }
  };

  onViewPreChange = async (event: BusEvent) => {
    const { newViewState } = event as BusEventViewPreChange;
    if (!newViewState.mainWindow) {
      // Set the closing modifier so the slide-out CSS transition begins while the chat is still mounted.
      this.sideBarClosing = true;
      // Awaiting holds the view transition until the 240ms CSS animation finishes so the chat does not pop out mid-slide.
      await sleep(250);
    }
  };

  handleTransitionEnd = (event: TransitionEvent) => {
    // Only the width transition signals expand/contract completion; other transitions like right/left would clear too early.
    if (event.propertyName === "width") {
      this.workspaceAnimating = null;
    }
  };

  handleHeaderButtonClick = async () => {
    // Guard against re-entry while the previous changeView is still resolving so the animation cannot get stuck mid-transition.
    if (!this.instance || this.clickInProgress) {
      return;
    }

    this.clickInProgress = true;
    try {
      const state = this.instance.getState();
      // Debug log so the toggle source-of-truth is visible during integration.
      console.log({ viewState: state.viewState });
      if (state.viewState.mainWindow) {
        // Currently open, so closing the chat is the inverse action; LAUNCHER hides the mainWindow.
        await this.instance.changeView(ViewType.LAUNCHER);
      } else {
        // Currently closed, so re-open by switching to the MAIN_WINDOW view.
        await this.instance.changeView(ViewType.MAIN_WINDOW);
      }
    } finally {
      this.clickInProgress = false;
    }
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

        // getPanel(PanelType.WORKSPACE) returns the workspace panel handle; calling open() triggers WORKSPACE_PRE_OPEN/WORKSPACE_OPEN.
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

  getSidebarClassName() {
    // Compose the shipped `cds-aichat-sidebar` base class with this example's
    // workspace expand/contract modifiers.
    let className = "cds-aichat-sidebar";
    if (this.workspaceExpanded) {
      className += " cds-aichat-sidebar--expanded";
    }
    if (this.workspaceAnimating === "expanding") {
      className += " cds-aichat-sidebar--expanding";
    } else if (this.workspaceAnimating === "contracting") {
      className += " cds-aichat-sidebar--contracting";
    }
    if (this.sideBarClosing) {
      className += " cds-aichat-sidebar--closing";
    } else if (!this.sideBarOpen) {
      className += " cds-aichat-sidebar--closed";
    }
    return className;
  }

  render() {
    return html`
      <header class="app-header">
        <h1 class="app-header__title">Workspace Sidebar Example</h1>
        ${
          this.instance
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
            : ""
        }
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
          .renderUserDefinedResponse=${this.renderUserDefinedCallback}
          class="chat-custom-element"
        >
          <div slot="workspacePanelElement">
            ${this.renderWorkspaceElement()}
          </div>
        </cds-aichat-custom-element>
      </div>
    `;
  }
}
