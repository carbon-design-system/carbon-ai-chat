/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/dropdown/index.js";
import "@carbon/web-components/es/components/text-input/index.js";
import "@carbon/web-components/es/components/checkbox/index.js";

import { PublicConfig, MinimizeButtonIconType } from "@carbon/ai-chat";
import Help16 from "@carbon/icons/es/help/16.js";
import Information16 from "@carbon/icons/es/information/16.js";
import Document16 from "@carbon/icons/es/document/16.js";
import Chat16 from "@carbon/icons/es/chat/16.js";
import UserAvatar16 from "@carbon/icons/es/user--avatar/16.js";
import Settings16 from "@carbon/icons/es/settings/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Settings } from "./types";

// Sample actions for demo
const sampleActions = [
  {
    icon: Help16,
    text: "Help",
    onClick: () => alert("Help clicked!"),
  },
  {
    icon: Information16,
    text: "About",
    onClick: () => alert("About clicked!"),
  },
  {
    icon: Document16,
    text: "Documentation",
    onClick: () => alert("Documentation clicked!"),
  },
  {
    icon: Chat16,
    text: "Feedback",
    onClick: () => alert("Feedback clicked!"),
  },
  {
    icon: UserAvatar16,
    text: "Profile",
    onClick: () => alert("Profile clicked!"),
  },
  {
    icon: Settings16,
    text: "Settings",
    onClick: () => alert("Settings clicked!"),
  },
  {
    icon: Share16,
    text: "Share",
    onClick: () => alert("Share clicked!"),
  },
  {
    icon: Download16,
    text: "Export Chat",
    onClick: () => alert("Export Chat clicked!"),
  },
];

@customElement("demo-header-switcher")
export class DemoHeaderSwitcher extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .header-section {
      margin-bottom: 1rem;
    }

    .header-section:last-child {
      margin-bottom: 0;
    }

    cds-text-input {
      margin-bottom: 0.5rem;
    }

    cds-checkbox {
      margin-bottom: 0.5rem;
    }
  `;

  @property({ type: Object })
  accessor config!: PublicConfig;

  @property({ type: Object })
  accessor settings!: Settings;

  private _updateConfig(updates: Partial<PublicConfig>) {
    const newConfig = {
      ...this.config,
      ...updates,
    };

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: newConfig,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _updateSettings(updates: Partial<Settings>) {
    const newSettings = {
      ...this.settings,
      ...updates,
    };

    this.dispatchEvent(
      new CustomEvent("settings-changed", {
        detail: newSettings,
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Apply settings to config by adding complex objects (menuOptions, actions)
   * based on settings state. This keeps complex objects out of URL serialization.
   */
  static applySettingsToConfig(
    config: PublicConfig,
    settings: Settings,
  ): PublicConfig {
    const header = { ...config.header };

    // Apply showHeader setting
    if (settings.showHeader === false) {
      header.isOn = false;
    } else if (settings.showHeader === true) {
      delete header.isOn;
    }

    // Apply showMenuOptions setting
    if (settings.showMenuOptions) {
      header.menuOptions = [
        {
          text: "Help",
          handler: () => alert("Help clicked!"),
        },
        {
          text: "Documentation",
          href: "https://chat.carbondesignsystem.com/tag/latest/docs/documents/Overview.html",
          target: "_blank",
        },
        {
          text: "Settings",
          handler: () => alert("Settings clicked!"),
        },
        {
          text: "Disabled Option",
          handler: () => alert("This should not appear!"),
          disabled: true,
        },
      ];
    } else {
      delete header.menuOptions;
    }

    // Apply showSampleActions setting
    if (settings.showSampleActions) {
      header.actions = sampleActions;
    } else {
      delete header.actions;
    }

    return {
      ...config,
      header,
    };
  }

  private _onMinimizeButtonTypeChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value;

    this._updateConfig({
      header: {
        ...this.config.header,
        minimizeButtonIconType:
          value === "default" ? undefined : (value as MinimizeButtonIconType),
        hideMinimizeButton: value === "none" ? true : undefined,
      },
    });
  };

  private _onTitleChanged = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const header = { ...this.config.header };

    if (input.value.trim()) {
      header.title = input.value;
    } else {
      delete header.title;
    }

    this._updateConfig({ header });
  };

  private _onNameChanged = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const header = { ...this.config.header };

    if (input.value.trim()) {
      header.name = input.value;
    } else {
      delete header.name;
    }

    this._updateConfig({ header });
  };

  private _onIsOnChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;

    // Update settings instead of config
    this._updateSettings({
      showHeader: !checked,
    });
  };

  private _onShowRestartButtonChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;
    const header = { ...this.config.header };

    if (checked) {
      header.showRestartButton = true;
    } else {
      delete header.showRestartButton;
    }

    this._updateConfig({ header });
  };

  private _onMenuOptionsChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;

    // Update settings instead of config
    this._updateSettings({
      showMenuOptions: checked,
    });
  };

  private _onShowAiLabelChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;
    const header = { ...this.config.header };

    if (checked) {
      header.showAiLabel = true;
    } else {
      header.showAiLabel = false;
    }

    this._updateConfig({ header });
  };

  private _onSampleActionsChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;

    // Update settings instead of config
    this._updateSettings({
      showSampleActions: checked,
    });
  };

  private _onHasContentMaxWidthChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value;
    const header = { ...this.config.header };

    if (value === "default") {
      delete header.hasContentMaxWidth;
    } else if (value === "true") {
      header.hasContentMaxWidth = true;
    } else if (value === "false") {
      header.hasContentMaxWidth = false;
    }

    this._updateConfig({ header });
  };

  private _getCurrentMinimizeButtonType(): string {
    if (this.config?.header?.hideMinimizeButton) {
      return "none";
    }
    return this.config?.header?.minimizeButtonIconType || "default";
  }

  private _getHasContentMaxWidthValue(): string {
    const value = this.config?.header?.hasContentMaxWidth;
    if (value === undefined) {
      return "default";
    }
    return value ? "true" : "false";
  }

  render() {
    const header = this.config?.header;
    return html`
      <div class="header-section">
        <div class="header-section">
          <cds-checkbox
            ?checked=${this.settings?.showHeader === false}
            @cds-checkbox-changed=${this._onIsOnChanged}
          >
            Hide chat header
          </cds-checkbox>
        </div>
        <cds-dropdown
          value="${this._getCurrentMinimizeButtonType()}"
          title-text="Minimize button icon"
          @cds-dropdown-selected=${this._onMinimizeButtonTypeChanged}
        >
          <cds-dropdown-item value="default">Default</cds-dropdown-item>
          <cds-dropdown-item value="close">Close (X)</cds-dropdown-item>
          <cds-dropdown-item value="minimize">Minimize (-)</cds-dropdown-item>
          <cds-dropdown-item value="side-panel-left"
            >Side Panel Left</cds-dropdown-item
          >
          <cds-dropdown-item value="side-panel-right"
            >Side Panel Right</cds-dropdown-item
          >
          <cds-dropdown-item value="none">None</cds-dropdown-item>
        </cds-dropdown>
      </div>

      <div class="header-section">
        <cds-text-input
          label="Header title"
          placeholder="Enter custom title"
          value="${header?.title || ""}"
          @input=${this._onTitleChanged}
        ></cds-text-input>
      </div>

      <div class="header-section">
        <cds-text-input
          label="Header name"
          placeholder="Enter custom name"
          value="${header?.name || ""}"
          @input=${this._onNameChanged}
        ></cds-text-input>
      </div>

      <div class="header-section">
        <cds-checkbox
          ?checked=${header?.showRestartButton}
          @cds-checkbox-changed=${this._onShowRestartButtonChanged}
        >
          Show restart button
        </cds-checkbox>
      </div>

      <div class="header-section">
        <cds-checkbox
          ?checked=${this.settings?.showMenuOptions === true}
          @cds-checkbox-changed=${this._onMenuOptionsChanged}
        >
          Add menu options
        </cds-checkbox>
      </div>

      <div class="header-section">
        <cds-checkbox
          ?checked=${header?.showAiLabel !== false}
          @cds-checkbox-changed=${this._onShowAiLabelChanged}
        >
          Show AI label
        </cds-checkbox>
      </div>

      <div class="header-section">
        <cds-checkbox
          ?checked=${this.settings?.showSampleActions === true}
          @cds-checkbox-changed=${this._onSampleActionsChanged}
        >
          Add menu actions
        </cds-checkbox>
      </div>

      <div class="header-section">
        <cds-dropdown
          value="${this._getHasContentMaxWidthValue()}"
          title-text="Has content max width"
          @cds-dropdown-selected=${this._onHasContentMaxWidthChanged}
        >
          <cds-dropdown-item value="default">Default</cds-dropdown-item>
          <cds-dropdown-item value="true">True</cds-dropdown-item>
          <cds-dropdown-item value="false">False</cds-dropdown-item>
        </cds-dropdown>
      </div>
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-header-switcher": DemoHeaderSwitcher;
  }
}
