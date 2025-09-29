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

import { Settings } from "./types";
import {
  getSettings,
  updateQueryParams,
  updateQueryParamsWithoutRefresh,
} from "./utils";
import {
  SetChatConfigManager,
  type SetChatConfigModeState,
} from "./set-chat-config-manager";
import { AccordionStateManager } from "./accordion-state-manager";
import { ConfigManager } from "./config-manager";
import { ReactAppManager } from "./react-app-manager";
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

    .page.set-chat-config-mode-no-config {
      flex-direction: column;
    }

    .page.set-chat-config-mode-no-config .nav-block {
      display: none;
    }

    .page.set-chat-config-mode-no-config .main {
      flex-basis: auto;
      width: 100%;
      max-width: 100%;
    }

    .set-chat-config-sidebar {
      padding: 1rem;
    }

    .set-chat-config-sidebar .title {
      font-size: 1rem;
      font-weight: 600;
      margin-block-end: 1rem;
      color: var(--cds-text-primary);
    }

    .set-chat-config-sidebar .description {
      font-size: 0.875rem;
      margin-block-end: 1rem;
      color: var(--cds-text-secondary);
      line-height: 1.5;
    }

    .set-chat-config-sidebar cds-button {
      margin-block-start: 1rem;
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

  // Manager instances for different concerns
  private setChatConfigManager: SetChatConfigManager;
  private accordionStateManager: AccordionStateManager;
  private configManager: ConfigManager;
  private reactAppManager: ReactAppManager;
  private chatInstance: ChatInstance | null = null;

  constructor() {
    super();

    // Initialize managers with appropriate callbacks
    this.setChatConfigManager = new SetChatConfigManager(
      this._onSetChatConfigModeChanged.bind(this),
    );
    this.accordionStateManager = new AccordionStateManager();
    this.configManager = new ConfigManager();
    this.reactAppManager = new ReactAppManager();

    // Initialize setChatConfig mode state from manager
    const setChatConfigState = this.setChatConfigManager.getState();
    this.isSetChatConfigMode = setChatConfigState.isSetChatConfigMode;
    this.hasReceivedSetChatConfig = setChatConfigState.hasReceivedSetChatConfig;
  }

  /**
   * Set the chat instance and expose it globally for tests and debugging
   */
  private _setChatInstance(instance: ChatInstance | null) {
    this.chatInstance = instance;

    if (instance) {
      window.chatInstance = instance;
    } else {
      delete window.chatInstance;
    }

    this.requestUpdate();
  }

  /**
   * Set chat configuration via setChatConfig
   * Delegates to SetChatConfigManager for proper handling
   */
  private _setChatConfig = async (newConfig: Partial<PublicConfig>) => {
    await this.setChatConfigManager.setChatConfig(
      newConfig,
      this.config,
      async (mergedConfig: PublicConfig) => {
        const event = new CustomEvent<PublicConfig>("config-changed", {
          detail: mergedConfig,
        });
        await this._processConfigChange(event, {
          triggerSetChatConfigMode: false,
        });
      },
    );
  };

  /**
   * Handle setChatConfig mode changes from the manager
   */
  private _onSetChatConfigModeChanged = (data: SetChatConfigModeState) => {
    this.isSetChatConfigMode = data.isSetChatConfigMode;
    this.hasReceivedSetChatConfig = data.hasReceivedSetChatConfig;

    // Notify parent container about the change
    this.dispatchEvent(
      new CustomEvent("set-chat-config-mode-changed", {
        detail: data,
        bubbles: true,
      }),
    );

    this.requestUpdate();
  };

  /**
   * Leave setChatConfig mode - delegates to manager
   */
  private _leaveSetChatConfigMode = () => {
    this.setChatConfigManager.leaveSetChatConfigMode();
  };

  /**
   * Set up accordion state management - delegates to AccordionStateManager
   */
  private _setupAccordionStateManagement = () => {
    if (this.shadowRoot) {
      this.accordionStateManager.setupAccordionStateManagement(this.shadowRoot);
    }
  };

  /**
   * Component initialization - set up event listeners and initial state
   */
  protected firstUpdated(_changedProperties: PropertyValues): void {
    // Listen for config and settings changes
    this.addEventListener("config-changed", this._onConfigChanged);
    this.addEventListener("settings-changed", this._onSettingsChanged);

    // Expose the setChatConfig function globally for external use
    window.setChatConfig = this._setChatConfig;

    // Set up accordion state persistence
    this._setupAccordionStateManagement();

    // Set data attribute for CSS styling
    this.setAttribute(
      "data-set-chat-config-mode",
      this.isSetChatConfigMode.toString(),
    );

    // Initial React app render if using React framework
    if (this.settings.framework === "react") {
      this._renderReactApp();
    }

    // Notify parent about initial setChatConfig mode state
    this.dispatchEvent(
      new CustomEvent("set-chat-config-mode-changed", {
        detail: {
          isSetChatConfigMode: this.isSetChatConfigMode,
          hasReceivedSetChatConfig: this.hasReceivedSetChatConfig,
        },
        bubbles: true,
      }),
    );
  }

  /**
   * Handle component updates - update data attributes for CSS
   */
  protected updated(_changedProperties: PropertyValues): void {
    // Update data attribute when setChatConfig mode changes
    if (_changedProperties.has("isSetChatConfigMode")) {
      this.setAttribute(
        "data-set-chat-config-mode",
        this.isSetChatConfigMode.toString(),
      );
    }
  }

  /**
   * Clean up resources when component is disconnected
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.reactAppManager.destroy();
  }

  /**
   * Render the React demo app using ReactAppManager
   */
  private async _renderReactApp(): Promise<void> {
    await this._renderReactAppWithConfig(this.config);
  }

  /**
   * Render the React demo app with a specific configuration
   */
  private async _renderReactAppWithConfig(config: PublicConfig): Promise<void> {
    const setChatConfigState = this.setChatConfigManager.getState();

    await this.reactAppManager.renderReactApp(
      config,
      this.settings,
      setChatConfigState,
      (instance: ChatInstance) => {
        this._setChatInstance(instance);
      },
    );
  }

  private _onConfigChanged = async (event: Event) => {
    event.stopPropagation();
    await this._processConfigChange(event as CustomEvent<PublicConfig>, {
      triggerSetChatConfigMode: true,
    });
  };

  /**
   * Process configuration changes using ConfigManager
   * Handles all side effects including React re-renders and session restarts
   */
  private async _processConfigChange(
    event: CustomEvent<PublicConfig>,
    { triggerSetChatConfigMode }: { triggerSetChatConfigMode: boolean },
  ): Promise<void> {
    const newConfig = event.detail;
    const oldConfig = this.config;
    const settings = { ...this.settings };

    // Use ConfigManager to handle the complex processing logic
    const processedConfig = await this.configManager.processConfigChange(
      newConfig,
      oldConfig,
      settings,
      this.chatInstance,
      {
        triggerSetChatConfigMode,
        onReactRender:
          this.settings.framework === "react"
            ? (config: PublicConfig) => this._renderReactAppWithConfig(config)
            : undefined,
      },
    );

    // Update the component's config state
    this.config = processedConfig;
  }

  /**
   * Handle settings changes from sidebar controls
   */
  private _onSettingsChanged = (event: Event) => {
    event.stopPropagation(); // Prevent bubbling to parent demo-container

    const customEvent = event as CustomEvent;
    const newSettings = customEvent.detail;
    const oldSettings = this.settings;

    // Check if changes require a page refresh
    const frameworkChanged = oldSettings.framework !== newSettings.framework;
    const layoutChanged = oldSettings.layout !== newSettings.layout;
    const shouldRefresh = frameworkChanged || layoutChanged;

    this.settings = newSettings;

    // Update query parameters with new settings
    this._updateQueryParamsForSettings(newSettings, shouldRefresh);

    // Re-render React app if using React framework
    if (this.settings.framework === "react") {
      this._renderReactApp();
    }
  };

  /**
   * Update query parameters with current settings and config
   */
  private _updateQueryParamsForSettings(
    newSettings: Settings,
    shouldRefresh: boolean,
  ): void {
    // Don't update query params if in setChatConfig mode - let setChatConfigManager handle it
    if (this.isSetChatConfigMode) {
      return;
    }

    // Create config copy for serialization (without customSendMessage function)
    const configForSerialization: PublicConfig = {
      ...this.config,
      messaging: this.config.messaging
        ? {
            ...this.config.messaging,
            customSendMessage: undefined,
          }
        : undefined,
    };

    const queryUpdates = [
      { key: "settings", value: JSON.stringify(newSettings) },
      { key: "config", value: JSON.stringify(configForSerialization) },
    ];

    // Use appropriate update function based on what changed
    if (shouldRefresh) {
      updateQueryParams(queryUpdates);
    } else {
      updateQueryParamsWithoutRefresh(queryUpdates);
    }
  }

  // Define the element's render template
  render() {
    const pageClass =
      this.isSetChatConfigMode && !this.hasReceivedSetChatConfig
        ? "page set-chat-config-mode-no-config"
        : "page";

    return html` <div class="${pageClass}">
      ${this.isSetChatConfigMode && this.hasReceivedSetChatConfig
        ? html`<div
            class="nav-block set-chat-config-sidebar"
            data-testid="config_sidebar"
          >
            <div class="title">setChatConfig Mode Active</div>
            <div class="description">
              Configuration is being controlled via
              <code>window.setChatConfig()</code>.
            </div>
            <cds-button
              kind="secondary"
              size="sm"
              @click=${this._leaveSetChatConfigMode}
              data-testid="leave_set_chat_config_mode_button"
            >
              Leave setChatConfig Mode
            </cds-button>
          </div>`
        : !this.isSetChatConfigMode
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
        !(this.isSetChatConfigMode && !this.hasReceivedSetChatConfig)
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
