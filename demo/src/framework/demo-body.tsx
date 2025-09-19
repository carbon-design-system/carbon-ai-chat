/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicConfig, ChatInstance } from "@carbon/ai-chat";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import React from "react";
import { createRoot, Root } from "react-dom/client";

import { DemoApp } from "../react/DemoApp";
import { Settings } from "./types";
import {
  getSettings,
  updateQueryParams,
  updateQueryParamsWithoutRefresh,
} from "./utils";
import "./demo-chat-theme-switcher";
import "./demo-header-switcher";
import "./demo-layout-config-switcher";
import "./demo-launcher-switcher";
import "./demo-chat-instance-switcher";
import "./demo-direction-switcher";
import "@carbon/web-components/es/components/button/index.js";

const { defaultConfig, defaultSettings } = getSettings();

/**
 * `DemoBody` is a custom Lit element representing the body component.
 */
@customElement("demo-body")
export class DemoBody extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: calc(100vh - 40px);
      width: 100%;
      margin-top: 40px;
    }

    .page {
      display: flex;
      gap: 1rem;
      height: calc(100vh - 40px);
    }

    .nav-block {
      flex-basis: 320px;
      padding: 1rem;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
    }

    .main {
      flex-grow: 1;
    }

    cds-accordion {
      margin-block-start: 0;
    }

    cds-accordion-item {
      border: none;
    }

    demo-version-switcher,
    demo-page-theme-switcher,
    demo-layout-switcher,
    demo-theme-switcher,
    demo-chat-theme-switcher,
    demo-homescreen-switcher,
    demo-writeable-elements-switcher,
    demo-direction-switcher {
      display: block;
      margin-block-start: 1rem;
    }

    .config-section {
      display: block;
      margin-block-start: 1rem;
    }

    .config-section__title {
      font-size: 1rem;
      font-weight: 600;
      margin-block-end: 0.75rem;
    }

    .config-section > demo-header-switcher,
    .config-section > demo-layout-config-switcher,
    .config-section > demo-launcher-switcher {
      display: block;
      margin-block-start: 0;
    }

    /* First item in each accordion doesn't need top margin */
    demo-page-theme-switcher,
    cds-accordion-item demo-version-switcher:first-child {
      margin-block-start: 0;
    }

    .page.programmatic-mode-no-config {
      flex-direction: column;
    }

    .page.programmatic-mode-no-config .nav-block {
      display: none;
    }

    .page.programmatic-mode-no-config .main {
      flex-basis: auto;
      width: 100%;
      max-width: 100%;
    }

    .programmatic-sidebar {
      padding: 1rem;
    }

    .programmatic-sidebar .title {
      font-size: 1rem;
      font-weight: 600;
      margin-block-end: 1rem;
      color: var(--cds-text-primary);
    }

    .programmatic-sidebar .description {
      font-size: 0.875rem;
      margin-block-end: 1rem;
      color: var(--cds-text-secondary);
      line-height: 1.5;
    }

    .programmatic-sidebar cds-button {
      margin-block-start: 1rem;
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

  private chatInstance: ChatInstance | null = null;

  private _setChatInstance(instance: ChatInstance | null) {
    this.chatInstance = instance;

    if (instance) {
      window.chatInstance = instance;
    } else {
      delete window.chatInstance;
    }

    this.requestUpdate();
  }

  private _setChatConfig = (
    newConfig: Partial<PublicConfig>,
    newSettings?: Settings,
  ) => {
    // Merge the new config with the existing config, preserving the demo's customSendMessage if not provided
    const config: PublicConfig = {
      ...this.config,
      ...newConfig,
      messaging: {
        ...this.config.messaging,
        ...newConfig.messaging,
        customSendMessage:
          newConfig.messaging?.customSendMessage ||
          this.config.messaging?.customSendMessage,
      },
    };

    // Update this.config
    this.config = config;

    // Update this.settings if provided, otherwise keep current settings
    if (newSettings !== undefined) {
      this.settings = newSettings;
    }
    // If newSettings is undefined, keep this.settings as is

    // Set programmatic mode to true and mark that we've received config
    this.isProgrammaticMode = true;
    this.hasReceivedProgrammaticConfig = true;

    // Set query params to "programatic" to signal the system to ignore them
    updateQueryParamsWithoutRefresh([
      { key: "settings", value: "programatic" },
      { key: "config", value: "programatic" },
    ]);

    // Notify container about programmatic mode changes
    this._notifyProgrammaticModeChange();

    // Re-render React app if using React framework
    if (this.settings?.framework === "react") {
      this._renderReactApp();
    }
  };

  private _notifyProgrammaticModeChange = () => {
    // Notify the parent container about programmatic mode changes
    this.dispatchEvent(
      new CustomEvent("programmatic-mode-changed", {
        detail: {
          isProgrammaticMode: this.isProgrammaticMode,
          hasReceivedProgrammaticConfig: this.hasReceivedProgrammaticConfig,
        },
        bubbles: true,
      }),
    );
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

  private _setupAccordionStateManagement = () => {
    // Use a longer delay to ensure accordion is fully rendered
    setTimeout(() => {
      this._restoreAccordionStates();
      this._addAccordionEventListeners();
    }, 100);
  };

  private _restoreAccordionStates = () => {
    const accordion = this.shadowRoot?.querySelector("cds-accordion");
    if (!accordion) {
      return;
    }

    const accordionItems = accordion.querySelectorAll("cds-accordion-item");
    const storedStates = this._getStoredAccordionStates();

    accordionItems.forEach((item) => {
      const title = item.getAttribute("title") || "";
      const isOpen = storedStates[title];

      if (isOpen) {
        item.setAttribute("open", "");
        (item as any).expanded = true;
      }
    });
  };

  private _addAccordionEventListeners = () => {
    const accordion = this.shadowRoot?.querySelector("cds-accordion");
    if (!accordion) {
      return;
    }

    const accordionItems = accordion.querySelectorAll("cds-accordion-item");
    accordionItems.forEach((item) => {
      const toggleButton =
        item.shadowRoot?.querySelector("button") ||
        item.querySelector("button");
      if (toggleButton) {
        toggleButton.addEventListener("click", () => {
          const title = item.getAttribute("title") || "";

          setTimeout(() => {
            const isOpen = item.hasAttribute("open");
            this._saveAccordionState(title, isOpen);
          }, 100);
        });
      }
    });
  };

  private _getStoredAccordionStates = (): Record<string, boolean> => {
    try {
      const stored = sessionStorage.getItem("accordion-states");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  private _saveAccordionState = (title: string, isOpen: boolean) => {
    try {
      const currentStates = this._getStoredAccordionStates();
      currentStates[title] = isOpen;
      sessionStorage.setItem("accordion-states", JSON.stringify(currentStates));
    } catch {
      // Silently fail if sessionStorage is not available
    }
  };

  protected firstUpdated(_changedProperties: PropertyValues): void {
    // Listen for config and settings changes
    this.addEventListener("config-changed", this._onConfigChanged);
    this.addEventListener("settings-changed", this._onSettingsChanged);

    // Expose the programmatic config function on window
    window.setChatConfig = this._setChatConfig;

    // Setup accordion state management
    this._setupAccordionStateManagement();

    // Check if we're already in programmatic mode based on URL params
    const urlParams = new URLSearchParams(window.location.search);
    const settingsParam = urlParams.get("settings");
    const configParam = urlParams.get("config");
    const isProgrammaticFromURL =
      settingsParam === "programatic" || configParam === "programatic";

    if (isProgrammaticFromURL) {
      this.isProgrammaticMode = true;
      // If we're in programmatic mode from URL but haven't received config via setChatConfig,
      // it means the page was refreshed - hasReceivedProgrammaticConfig stays false
    }

    // Set data attribute for CSS styling
    this.setAttribute(
      "data-programmatic-mode",
      this.isProgrammaticMode.toString(),
    );

    // Notify container about initial programmatic mode state
    this._notifyProgrammaticModeChange();

    if (this.settings.framework === "react") {
      this._renderReactApp();
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    // Update data attribute when programmatic mode changes
    if (_changedProperties.has("isProgrammaticMode")) {
      this.setAttribute(
        "data-programmatic-mode",
        this.isProgrammaticMode.toString(),
      );
    }
  }

  /**
   * Track if a previous React 18 root was already created so we don't create a memory leak on re-renders.
   */
  _root!: Root;

  private _renderReactApp() {
    const container: HTMLElement = document.querySelector(
      "#root",
    ) as HTMLElement;
    // Create root only once, then just re-render with new props
    if (!this._root) {
      this._root = createRoot(container);
    }

    // Don't render chat if in programmatic mode without config
    if (this.isProgrammaticMode && !this.hasReceivedProgrammaticConfig) {
      this._root.render(<div></div>); // Render empty div instead
      return;
    }

    this._root.render(
      <DemoApp
        config={this.config}
        settings={this.settings}
        onChatInstanceReady={(instance: ChatInstance) => {
          this._setChatInstance(instance);
        }}
      />,
    );
  }

  private _onConfigChanged = (event: Event) => {
    event.stopPropagation(); // Prevent bubbling to parent demo-container
    const customEvent = event as CustomEvent;
    const settings = { ...this.settings };
    const newConfig: PublicConfig = customEvent.detail;
    const oldConfig = this.config;

    // Preserve the customSendMessage function from the existing config
    const config: PublicConfig = {
      ...newConfig,
      messaging: {
        ...newConfig.messaging,
        customSendMessage: this.config.messaging?.customSendMessage,
      },
    };

    // Check if homescreen changed
    const homescreenChanged = oldConfig.homescreen !== newConfig.homescreen;
    const shouldRefresh = homescreenChanged;

    // Reset session if homescreen changed to clear disclaimer acceptance
    if (homescreenChanged && this.chatInstance) {
      this.chatInstance.destroySession(true); // true keeps the open state
    }

    this.config = config;

    // Create a copy for serialization without customSendMessage
    const configForSerialization: PublicConfig = {
      ...config,
      messaging: config.messaging
        ? {
            ...config.messaging,
            customSendMessage: undefined,
          }
        : undefined,
    };

    if (shouldRefresh) {
      updateQueryParams([
        { key: "settings", value: JSON.stringify(settings) },
        { key: "config", value: JSON.stringify(configForSerialization) },
      ]);
    } else {
      updateQueryParamsWithoutRefresh([
        { key: "settings", value: JSON.stringify(settings) },
        { key: "config", value: JSON.stringify(configForSerialization) },
      ]);
    }

    // Re-render React app if using React framework
    if (this.settings.framework === "react") {
      this._renderReactApp();
    }
  };

  private _onSettingsChanged = (event: Event) => {
    event.stopPropagation(); // Prevent bubbling to parent demo-container
    const customEvent = event as CustomEvent;
    const newSettings = customEvent.detail;
    const oldSettings = this.settings;

    // Check if framework or layout changed
    const frameworkChanged = oldSettings.framework !== newSettings.framework;
    const layoutChanged = oldSettings.layout !== newSettings.layout;
    const shouldRefresh = frameworkChanged || layoutChanged;

    this.settings = newSettings;

    // Create a copy for serialization without customSendMessage
    const configForSerialization: PublicConfig = {
      ...this.config,
      messaging: this.config.messaging
        ? {
            ...this.config.messaging,
            customSendMessage: undefined,
          }
        : undefined,
    };

    // Use appropriate update function based on what changed
    if (shouldRefresh) {
      updateQueryParams([
        { key: "settings", value: JSON.stringify(newSettings) },
        { key: "config", value: JSON.stringify(configForSerialization) },
      ]);
    } else {
      updateQueryParamsWithoutRefresh([
        { key: "settings", value: JSON.stringify(newSettings) },
        { key: "config", value: JSON.stringify(configForSerialization) },
      ]);
    }

    // Re-render React app if using React framework
    if (this.settings.framework === "react") {
      this._renderReactApp();
    }
  };

  // Define the element's render template
  render() {
    const pageClass =
      this.isProgrammaticMode && !this.hasReceivedProgrammaticConfig
        ? "page programmatic-mode-no-config"
        : "page";

    return html` <div class="${pageClass}">
      ${this.isProgrammaticMode && this.hasReceivedProgrammaticConfig
        ? html`<div
            class="nav-block programmatic-sidebar"
            data-testid="config_sidebar"
          >
            <div class="title">Programmatic Mode Active</div>
            <div class="description">
              Configuration is being controlled programmatically via
              <code>window.setChatConfig()</code>.
            </div>
            <cds-button
              kind="secondary"
              size="sm"
              @click=${this._leaveProgrammaticMode}
              data-testid="leave_programmatic_mode_button"
            >
              Leave Programmatic Mode
            </cds-button>
          </div>`
        : !this.isProgrammaticMode
          ? html`<div class="nav-block" data-testid="config_sidebar">
              <cds-accordion>
                <cds-accordion-item title="Page Settings">
                  <demo-page-theme-switcher></demo-page-theme-switcher>
                  <demo-direction-switcher
                    .settings=${this.settings}
                  ></demo-direction-switcher>
                  <demo-writeable-elements-switcher
                    .settings=${this.settings}
                  ></demo-writeable-elements-switcher>
                </cds-accordion-item>
                <cds-accordion-item title="Choose Chat Component">
                  <demo-version-switcher
                    .settings=${this.settings}
                  ></demo-version-switcher>
                  <demo-layout-switcher
                    .settings=${this.settings}
                  ></demo-layout-switcher>
                </cds-accordion-item>
                <cds-accordion-item title="Chat Configuration">
                  <demo-theme-switcher
                    .config=${this.config}
                  ></demo-theme-switcher>
                  <demo-chat-theme-switcher
                    .config=${this.config}
                  ></demo-chat-theme-switcher>
                  <demo-homescreen-switcher
                    .config=${this.config}
                  ></demo-homescreen-switcher>
                  <div class="config-section">
                    <div class="config-section__title">Header</div>
                    <demo-header-switcher
                      .config=${this.config}
                    ></demo-header-switcher>
                  </div>
                  <div class="config-section">
                    <div class="config-section__title">Layout</div>
                    <demo-layout-config-switcher
                      .config=${this.config}
                    ></demo-layout-config-switcher>
                  </div>
                  <div class="config-section">
                    <div class="config-section__title">Launcher</div>
                    <demo-launcher-switcher
                      .config=${this.config}
                    ></demo-launcher-switcher>
                  </div>
                </cds-accordion-item>
                ${this.chatInstance
                  ? html`<cds-accordion-item title="Chat instance methods">
                      <demo-chat-instance-switcher
                        .chatInstance=${this.chatInstance}
                      ></demo-chat-instance-switcher>
                    </cds-accordion-item>`
                  : null}
              </cds-accordion>
            </div>`
          : ""}
      <div class="main">
        ${this.settings.framework === "web-component" &&
        !(this.isProgrammaticMode && !this.hasReceivedProgrammaticConfig)
          ? html`<demo-app
              .config=${this.config}
              .settings=${this.settings}
              .onChatInstanceReady=${(instance: ChatInstance) => {
                this._setChatInstance(instance);
              }}
            />`
          : html``}
      </div>
    </div>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-body": DemoBody;
  }
}
