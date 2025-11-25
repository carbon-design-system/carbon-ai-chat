/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
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
  @property({ attribute: false })
  accessor settings: Settings | undefined = undefined;

  @property({ attribute: false })
  accessor chatInstance: ChatInstance | null = null;

  private _clickInProgress = false;

  onClick = async () => {
    if (this.chatInstance) {
      const state = this.chatInstance?.getState();
      if (state.viewState.mainWindow) {
        await this.chatInstance.changeView(ViewType.LAUNCHER);
      } else {
        await this.chatInstance.changeView(ViewType.MAIN_WINDOW);
      }
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
    } else {
      panel.setAttribute("expanded", "");
    }
  };

  render() {
    const chatInstanceReady = this.chatInstance ? true : false;

    return html`
      <cds-header aria-label="Carbon AI Chat">
        <cds-header-name
          href="https://chat.carbondesignsystem.com/tag/latest/docs/documents/Overview.html"
          prefix="Carbon"
          >AI chat</cds-header-name
        >
        <div class="cds--header__global">
          ${chatInstanceReady
            ? html`<cds-header-global-action
                aria-label="Open AI Chat"
                tooltip-text="Open AI Chat"
                ?disabled=${this._clickInProgress}
                @click=${this._handleButtonClick}
              >
                ${iconLoader(AiLaunch20, { slot: "icon" })}
              </cds-header-global-action>`
            : ""}
          <cds-header-global-action
            aria-label="Open Resources Panel"
            tooltip-text="Open Resources Panel"
            tooltip-alignment="right"
            panel-id="switcher-panel"
            @click=${this._handlePanelToggle}
          >
            ${iconLoader(Switcher20, { slot: "icon" })}
          </cds-header-global-action>
        </div>
        <cds-header-panel id="switcher-panel" aria-label="Resources Panel">
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
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-header": DemoHeader;
  }
}
