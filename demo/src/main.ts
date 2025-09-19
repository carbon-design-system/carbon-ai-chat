/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/ui-shell/index.js";
import "@carbon/web-components/es/components/layer/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import "@carbon/web-components/es/components/accordion/index.js";
import "@carbon/web-components/es/components/notification/index.js";
import "./framework/demo-body";
import "./framework/demo-header";
import "./framework/demo-version-switcher";
import "./framework/demo-layout-switcher";
import "./framework/demo-homescreen-switcher";
import "./framework/demo-theme-switcher";
import "./framework/demo-page-theme-switcher";
import "./framework/demo-side-bar-nav";
import "./framework/demo-writeable-elements-switcher";
import "./web-components/demo-app";

import { PublicConfig } from "@carbon/ai-chat";
import { html, LitElement, css } from "lit";
import { customElement, state } from "lit/decorators.js";

import { Settings } from "./framework/types";
import { getSettings } from "./framework/utils";

const { defaultConfig, defaultSettings } = getSettings();

@customElement("demo-container")
export class Demo extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .notification-holder {
      position: fixed;
      top: 41px;
      left: 0;
      width: 100%;
      z-index: 9999;
    }

    .notification-holder cds-actionable-notification {
      inline-size: 100%;
      margin: 0;
      border-radius: 0;
      max-inline-size: 100%;
    }
  `;

  @state()
  accessor settings: Settings = defaultSettings;

  @state()
  accessor config: PublicConfig = defaultConfig;

  @state()
  accessor isProgrammaticMode: boolean = false;

  @state()
  accessor hasReceivedProgrammaticConfig: boolean = false;

  connectedCallback() {
    super.connectedCallback();
    // Listen for programmatic mode changes from demo-body
    this.addEventListener(
      "programmatic-mode-changed",
      this._onProgrammaticModeChanged as EventListener,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      "programmatic-mode-changed",
      this._onProgrammaticModeChanged as EventListener,
    );
  }

  private _onProgrammaticModeChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    this.isProgrammaticMode = customEvent.detail.isProgrammaticMode;
    this.hasReceivedProgrammaticConfig =
      customEvent.detail.hasReceivedProgrammaticConfig;
  };

  private _leaveProgrammaticMode = () => {
    // Remove programmatic query parameters and reload
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("settings");
    urlParams.delete("config");

    // Build new URL without programmatic params
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;

    // Navigate to the new URL (full refresh)
    window.location.href = newUrl;
  };

  render() {
    return html` <slot name="demo-header"></slot>
      <slot name="demo-body"></slot>
      ${this.isProgrammaticMode && !this.hasReceivedProgrammaticConfig
        ? html` <div class="notification-holder">
            <cds-actionable-notification
              low-contrast
              kind="error"
              title="Programmatic Mode - No Config Provided"
              subtitle="You are in programmatic mode but no configuration has been set. Call window.setChatConfig() to provide a configuration."
              inline
              hide-close-button
              data-testid="programmatic_notification_error"
            >
              <cds-actionable-notification-button
                slot="action"
                @click=${this._leaveProgrammaticMode}
                >Leave Programmatic Mode</cds-actionable-notification-button
              >
            </cds-actionable-notification>
          </div>`
        : ""}`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-container": Demo;
  }
}
