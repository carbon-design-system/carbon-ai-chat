/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import AiLaunch20 from "@carbon/icons/es/ai-launch/20.js";
import Switcher20 from "@carbon/icons/es/switcher/20.js";
import { ViewType, type ChatInstance } from "@carbon/ai-chat";

import type { Settings } from "./types";

/**
 * `DemoHeader` is a custom Lit element representing a header component.
 */
@customElement("demo-header")
export class DemoHeader extends LitElement {
  static styles = css`
    cds-header {
      z-index: 10000 !important;
    }

    cds-header-panel {
      z-index: 100000 !important;
    }
  `;

  @property({ attribute: false })
  accessor settings: Settings | undefined = undefined;

  @property({ attribute: false })
  accessor chatInstance: ChatInstance | null = null;

  private _clickInProgress = false;

  @state()
  private accessor _panelExpanded = false;

  @state()
  private accessor _panelAnnouncement = "";

  onClick = async () => {
    if (this.chatInstance) {
      const state = this.chatInstance?.getState();
      if (state.viewState.mainWindow) {
        await this.chatInstance.changeView(ViewType.LAUNCHER);
      } else {
        await this.chatInstance.changeView(ViewType.MAIN_WINDOW);
      }
      // Request update to refresh aria-label
      this.requestUpdate();
    }
  };

  private _handleButtonClick = async () => {
    if (this._clickInProgress) {
      return;
    }

    this._clickInProgress = true;
    this.requestUpdate();

    try {
      await this.onClick();
    } finally {
      this._clickInProgress = false;
      this.requestUpdate();
    }
  };

  private _handleButtonKeyDown = async (event: KeyboardEvent) => {
    // Handle Enter and Space keys for keyboard accessibility
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      await this._handleButtonClick();
    }
  };

  private _getChatButtonLabel(): string {
    if (!this.chatInstance) {
      return "Open AI Chat";
    }
    const state = this.chatInstance.getState();
    return state.viewState.mainWindow ? "Close AI Chat" : "Open AI Chat";
  }

  private _handlePanelToggle = (event: Event) => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    const panelId = target.getAttribute("panel-id");
    if (!panelId) {
      return;
    }

    const panel = this.renderRoot?.querySelector<HTMLElement>(`#${panelId}`);
    if (!panel) {
      return;
    }

    if (panel.hasAttribute("expanded")) {
      panel.removeAttribute("expanded");
      this._panelExpanded = false;
      this._panelAnnouncement = "Resources Panel closed";
    } else {
      panel.setAttribute("expanded", "");
      this._panelExpanded = true;
      this._panelAnnouncement = "Resources Panel opened";
    }
  };

  private _handlePanelKeyDown = (event: KeyboardEvent) => {
    // Handle Enter and Space keys for keyboard accessibility
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this._handlePanelToggle(event);
    }
  };

  private _getPanelButtonLabel(): string {
    return this._panelExpanded
      ? "Close Resources Panel"
      : "Open Resources Panel";
  }

  render() {
    const chatInstanceReady = this.chatInstance ? true : false;

    return html`
      <cds-header aria-label="Carbon AI Chat" role="banner">
        <cds-header-name
          href="https://chat.carbondesignsystem.com/tag/latest/docs/documents/Overview.html"
          prefix="Carbon"
          >AI chat</cds-header-name
        >
        <div class="cds--header__global">
          ${chatInstanceReady
            ? html`<cds-header-global-action
                aria-label="${this._getChatButtonLabel()}"
                tooltip-text="${this._getChatButtonLabel()}"
                ?disabled=${this._clickInProgress}
                @click=${this._handleButtonClick}
                @keydown=${this._handleButtonKeyDown}
              >
                ${iconLoader(AiLaunch20, { slot: "icon" })}
                <span slot="tooltip-content">AI Chat</span>
              </cds-header-global-action>`
            : ""}
          <cds-header-global-action
            aria-label="${this._getPanelButtonLabel()}"
            tooltip-text="${this._getPanelButtonLabel()}"
            tooltip-alignment="right"
            panel-id="switcher-panel"
            @click=${this._handlePanelToggle}
            @keydown=${this._handlePanelKeyDown}
          >
            ${iconLoader(Switcher20, { slot: "icon" })}
            <span slot="tooltip-content">Resources</span>
          </cds-header-global-action>
        </div>
        <cds-header-panel
          id="switcher-panel"
          aria-label="Resources Panel"
          ?inert=${!this._panelExpanded}
          aria-hidden="${!this._panelExpanded}"
        >
          <cds-switcher aria-label="Resources">
            <cds-switcher-item
              aria-label="Documentation site"
              href="https://chat.carbondesignsystem.com/tag/latest/docs/documents/Overview.html"
              >Documentation site</cds-switcher-item
            >
            <cds-switcher-item
              aria-label="React examples"
              href="https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/react"
              >React examples</cds-switcher-item
            >
            <cds-switcher-item
              aria-label="Web component examples"
              href="https://github.com/carbon-design-system/carbon-ai-chat/tree/main/examples/web-components"
              >Web component examples</cds-switcher-item
            >
          </cds-switcher>
        </cds-header-panel>
      </cds-header>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;"
      >
        ${this._panelAnnouncement}
      </div>
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-header": DemoHeader;
  }
}
