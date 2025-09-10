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
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { Settings } from "./framework/types";
import {
  getSettings,
  updateQueryParamsWithoutRefresh,
} from "./framework/utils";

const { defaultConfig, defaultSettings } = getSettings();

@customElement("demo-container")
export class Demo extends LitElement {
  @state()
  accessor settings: Settings = defaultSettings;

  @state()
  accessor config: PublicConfig = defaultConfig;

  firstUpdated() {
    this.addEventListener("config-changed", this._onConfigChanged);
    this.addEventListener("settings-changed", this._onSettingsChanged);
  }

  private _onSettingsChanged(event: Event) {
    const customEvent = event as CustomEvent;
    const settings = customEvent.detail;
    this.settings = settings;

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

    updateQueryParamsWithoutRefresh([
      { key: "settings", value: JSON.stringify(settings) },
      { key: "config", value: JSON.stringify(configForSerialization) },
    ]);
  }

  private _onConfigChanged(event: Event) {
    const customEvent = event as CustomEvent;
    const settings = { ...this.settings };
    const newConfig: PublicConfig = customEvent.detail;

    // Preserve the customSendMessage function from the existing config
    const config: PublicConfig = {
      ...newConfig,
      messaging: {
        ...newConfig.messaging,
        customSendMessage: this.config.messaging?.customSendMessage,
      },
    };

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

    updateQueryParamsWithoutRefresh([
      { key: "settings", value: JSON.stringify(settings) },
      { key: "config", value: JSON.stringify(configForSerialization) },
    ]);
  }

  render() {
    return html`<slot name="demo-header"></slot>
      <slot name="demo-body"></slot>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-container": Demo;
  }
}
