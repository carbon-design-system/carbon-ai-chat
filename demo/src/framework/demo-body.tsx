/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicConfig } from "@carbon/ai-chat";
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

const { defaultConfig, defaultSettings } = getSettings();

/**
 * `DemoBody` is a custom Lit element representing the body component.
 */
@customElement("demo-body")
export class DemoBody extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: calc(100vh - 48px);
      width: 100%;
      margin-top: 48px;
    }

    .page {
      display: flex;
      gap: 1rem;
    }

    .nav-block {
      flex-basis: 320px;
      padding: 1rem;
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
    demo-writeable-elements-switcher {
      display: block;
      margin-block-start: 1rem;
    }

    /* First item in each accordion doesn't need top margin */
    demo-page-theme-switcher,
    cds-accordion-item demo-version-switcher:first-child {
      margin-block-start: 0;
    }
  `;

  @state()
  accessor settings: Settings = defaultSettings;

  @state()
  accessor config: PublicConfig = defaultConfig;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    // Listen for config and settings changes
    this.addEventListener("config-changed", this._onConfigChanged);
    this.addEventListener("settings-changed", this._onSettingsChanged);

    if (this.settings.framework === "react") {
      this._renderReactApp();
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
    this._root.render(
      <DemoApp config={this.config} settings={this.settings} />,
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
    return html`<div class="page">
      <div class="nav-block">
        <cds-accordion>
          <cds-accordion-item open title="Page Settings">
            <demo-page-theme-switcher></demo-page-theme-switcher>
            <demo-writeable-elements-switcher
              .settings=${this.settings}
            ></demo-writeable-elements-switcher>
          </cds-accordion-item>
          <cds-accordion-item open title="Choose Chat Component">
            <demo-version-switcher
              .settings=${this.settings}
            ></demo-version-switcher>
            <demo-layout-switcher
              .settings=${this.settings}
            ></demo-layout-switcher>
          </cds-accordion-item>
          <cds-accordion-item open title="Chat Configuration">
            <demo-theme-switcher .config=${this.config}></demo-theme-switcher>
            <demo-chat-theme-switcher
              .config=${this.config}
            ></demo-chat-theme-switcher>
            <demo-homescreen-switcher
              .config=${this.config}
            ></demo-homescreen-switcher>
          </cds-accordion-item>
        </cds-accordion>
      </div>
      <div class="main">
        ${this.settings.framework === "web-component"
          ? html`<demo-app .config=${this.config} .settings=${this.settings} />`
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
