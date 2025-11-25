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
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

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
    const header = { ...this.config.header };

    if (checked) {
      header.isOn = false;
    } else {
      delete header.isOn;
    }

    this._updateConfig({ header });
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
    const header = { ...this.config.header };

    if (checked) {
      header.menuOptions = [
        {
          text: "Help",
          handler: () => alert("Help clicked!"),
        },
        {
          text: "Settings",
          handler: () => alert("Settings clicked!"),
        },
      ];
    } else {
      delete header.menuOptions;
    }

    this._updateConfig({ header });
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

  private _getCurrentMinimizeButtonType(): string {
    if (this.config?.header?.hideMinimizeButton) {
      return "none";
    }
    return this.config?.header?.minimizeButtonIconType || "default";
  }

  render() {
    const header = this.config?.header;
    return html`
      <div class="header-section">
        <div class="header-section">
          <cds-checkbox
            ?checked=${header?.isOn === false}
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
          ?checked=${(header?.menuOptions?.length ?? 0) > 0}
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
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-header-switcher": DemoHeaderSwitcher;
  }
}
