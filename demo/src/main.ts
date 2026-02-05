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
import "./framework/demo-writeable-elements-switcher";
import "./framework/demo-stop-button-immediate-switcher";
import "./web-components/demo-app";

import { ChatInstance, PublicConfig } from "@carbon/ai-chat";
import { html, LitElement, PropertyValues, css } from "lit";
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
  accessor isSetChatConfigMode: boolean = false;

  @state()
  accessor hasReceivedSetChatConfig: boolean = false;

  private headerSettings?: Settings;
  private headerChatInstance: ChatInstance | null = null;
  private headerSlot: HTMLSlotElement | null = null;

  connectedCallback() {
    super.connectedCallback();
    // Listen for setChatConfig mode changes from demo-body
    this.addEventListener(
      "set-chat-config-mode-changed",
      this._onSetChatConfigModeChanged as EventListener,
    );
    this.addEventListener(
      "demo-settings-changed",
      this._onDemoSettingsChanged as EventListener,
    );
    this.addEventListener(
      "demo-chat-instance-changed",
      this._onDemoChatInstanceChanged as EventListener,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      "set-chat-config-mode-changed",
      this._onSetChatConfigModeChanged as EventListener,
    );
    this.removeEventListener(
      "demo-settings-changed",
      this._onDemoSettingsChanged as EventListener,
    );
    this.removeEventListener(
      "demo-chat-instance-changed",
      this._onDemoChatInstanceChanged as EventListener,
    );
    this.headerSlot?.removeEventListener(
      "slotchange",
      this._onHeaderSlotChange,
    );
    this.headerSlot = null;
  }

  private _onSetChatConfigModeChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    this.isSetChatConfigMode = customEvent.detail.isSetChatConfigMode;
    this.hasReceivedSetChatConfig = customEvent.detail.hasReceivedSetChatConfig;
  };

  private _onDemoSettingsChanged = (event: Event) => {
    const customEvent = event as CustomEvent<{ settings: Settings }>;
    this.headerSettings = customEvent.detail.settings;
    this._applyHeaderStateToComponent();
  };

  private _onDemoChatInstanceChanged = (event: Event) => {
    const customEvent = event as CustomEvent<{
      chatInstance: ChatInstance | null;
    }>;
    this.headerChatInstance = customEvent.detail.chatInstance ?? null;
    this._applyHeaderStateToComponent();
  };

  private _onHeaderSlotChange = () => {
    this._applyHeaderStateToComponent();
  };

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this.headerSlot = this.shadowRoot?.querySelector(
      'slot[name="demo-header"]',
    ) as HTMLSlotElement | null;
    this.headerSlot?.addEventListener("slotchange", this._onHeaderSlotChange);
    this._applyHeaderStateToComponent();
  }

  private _getDemoHeaderElement(): HTMLElement | null {
    const slot =
      this.headerSlot ??
      (this.shadowRoot?.querySelector(
        'slot[name="demo-header"]',
      ) as HTMLSlotElement | null);
    if (!slot) {
      return null;
    }

    const assignedElements = slot.assignedElements({ flatten: true });
    for (const element of assignedElements) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }

      if (element.tagName.toLowerCase() === "demo-header") {
        return element;
      }

      const nestedHeader = element.querySelector("demo-header");
      if (nestedHeader) {
        return nestedHeader as HTMLElement;
      }
    }

    return null;
  }

  private _applyHeaderStateToComponent() {
    const headerElement = this._getDemoHeaderElement();
    if (!headerElement) {
      return;
    }

    (headerElement as any).settings = this.headerSettings;
    (headerElement as any).chatInstance = this.headerChatInstance;
  }

  private _leaveSetChatConfigMode = () => {
    // Remove setChatConfig query parameters and reload
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("settings");
    urlParams.delete("config");

    // Build new URL without setChatConfig params
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname;

    // Navigate to the new URL (full refresh)
    window.location.href = newUrl;
  };

  render() {
    return html` <slot name="demo-header"></slot>
      <slot name="demo-body"></slot>
      ${this.isSetChatConfigMode && !this.hasReceivedSetChatConfig
        ? html` <div class="notification-holder">
            <cds-actionable-notification
              low-contrast
              kind="error"
              title="setChatConfig Mode - No Config Provided"
              subtitle="You are in setChatConfig mode but no configuration has been set. Call window.setChatConfig() to provide a configuration."
              inline
              hide-close-button
              data-testid="set_chat_config_notification_error"
            >
              <cds-actionable-notification-button
                slot="action"
                @click=${this._leaveSetChatConfigMode}
                >Leave setChatConfig Mode</cds-actionable-notification-button
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
