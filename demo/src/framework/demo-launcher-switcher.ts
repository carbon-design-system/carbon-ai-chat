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

import {
  LauncherCallToActionConfig,
  LauncherConfig,
  PublicConfig,
} from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

const DROPDOWN_DEFAULT = "default";
const DROPDOWN_TRUE = "true";
const DROPDOWN_FALSE = "false";

@customElement("demo-launcher-switcher")
export class DemoLauncherSwitcher extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .launcher-section {
      margin-bottom: 1.5rem;
    }

    .launcher-section:last-child {
      margin-bottom: 0;
    }

    .cta-inputs {
      display: grid;
      gap: 0.75rem;
      margin-top: 0.75rem;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
  `;

  @property({ type: Object })
  accessor config!: PublicConfig;

  private _updateLauncher(
    mutate: (
      launcher: LauncherConfig | undefined,
    ) => LauncherConfig | undefined,
  ) {
    const currentLauncher = this.config.launcher
      ? { ...this.config.launcher }
      : undefined;
    const nextLauncher = mutate(currentLauncher);

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          launcher: nextLauncher,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _normalizeLauncher(
    launcher: LauncherConfig | undefined,
  ): LauncherConfig | undefined {
    if (!launcher) {
      return undefined;
    }

    const cleaned: LauncherConfig = { ...launcher };

    cleaned.mobile = this._normalizeCTA(cleaned.mobile);
    cleaned.desktop = this._normalizeCTA(cleaned.desktop);

    (Object.keys(cleaned) as (keyof LauncherConfig)[]).forEach((key) => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });

    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  private _normalizeCTA(
    cta: LauncherCallToActionConfig | undefined,
  ): LauncherCallToActionConfig | undefined {
    if (!cta) {
      return undefined;
    }

    const cleaned: LauncherCallToActionConfig = { ...cta };

    if (cleaned.title !== undefined && cleaned.title.trim() === "") {
      delete cleaned.title;
    }

    if (
      cleaned.avatarUrlOverride !== undefined &&
      cleaned.avatarUrlOverride.trim() === ""
    ) {
      delete cleaned.avatarUrlOverride;
    }

    (Object.keys(cleaned) as (keyof LauncherCallToActionConfig)[]).forEach(
      (key) => {
        if (cleaned[key] === undefined) {
          delete cleaned[key];
        }
      },
    );

    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  private _booleanDropdownValue(value: boolean | undefined) {
    if (value === undefined) {
      return DROPDOWN_DEFAULT;
    }

    return value ? DROPDOWN_TRUE : DROPDOWN_FALSE;
  }

  private _handleLauncherVisibility(event: Event) {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    this._updateLauncher((launcher) => {
      const next = { ...(launcher ?? {}) };

      if (value === DROPDOWN_DEFAULT) {
        delete next.isOn;
      } else if (value === DROPDOWN_TRUE) {
        next.isOn = true;
      } else if (value === DROPDOWN_FALSE) {
        next.isOn = false;
      }

      return this._normalizeLauncher(next);
    });
  }

  private _handleCTAVisibility(event: Event, targetKey: "mobile" | "desktop") {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    this._updateLauncher((launcher) => {
      const next = { ...(launcher ?? {}) };
      const target = { ...(next[targetKey] ?? {}) };

      if (value === DROPDOWN_DEFAULT) {
        delete target.isOn;
      } else if (value === DROPDOWN_TRUE) {
        target.isOn = true;
      } else if (value === DROPDOWN_FALSE) {
        target.isOn = false;
      }

      next[targetKey] = this._normalizeCTA(target);

      return this._normalizeLauncher(next);
    });
  }

  private _handleCTATitle(event: Event, targetKey: "mobile" | "desktop") {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    this._updateLauncher((launcher) => {
      const next = { ...(launcher ?? {}) };
      const target = { ...(next[targetKey] ?? {}) };

      if (value.trim()) {
        target.title = value;
      } else {
        delete target.title;
      }

      next[targetKey] = this._normalizeCTA(target);

      return this._normalizeLauncher(next);
    });
  }

  private _handleCTAAvatar(event: Event, targetKey: "mobile" | "desktop") {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    this._updateLauncher((launcher) => {
      const next = { ...(launcher ?? {}) };
      const target = { ...(next[targetKey] ?? {}) };

      if (value.trim()) {
        target.avatarUrlOverride = value;
      } else {
        delete target.avatarUrlOverride;
      }

      next[targetKey] = this._normalizeCTA(target);

      return this._normalizeLauncher(next);
    });
  }

  private _renderCTAControls(
    label: string,
    key: "mobile" | "desktop",
    config: LauncherCallToActionConfig | undefined,
  ) {
    return html`
      <div class="launcher-section">
        <div class="section-title">${label}</div>
        <cds-dropdown
          value="${this._booleanDropdownValue(config?.isOn)}"
          title-text="Show call to action"
          @cds-dropdown-selected=${(event: Event) =>
            this._handleCTAVisibility(event, key)}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}"
            >Default</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_TRUE}">True</cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_FALSE}">False</cds-dropdown-item>
        </cds-dropdown>
        <div class="cta-inputs">
          <cds-text-input
            label="Call to action title"
            placeholder="Enter title"
            value="${config?.title ?? ""}"
            @input=${(event: Event) => this._handleCTATitle(event, key)}
          ></cds-text-input>
          <cds-text-input
            label="Avatar URL override"
            placeholder="Enter URL"
            value="${config?.avatarUrlOverride ?? ""}"
            @input=${(event: Event) => this._handleCTAAvatar(event, key)}
          ></cds-text-input>
        </div>
      </div>
    `;
  }

  render() {
    const launcher = this.config?.launcher;

    return html`
      <div class="launcher-section">
        <cds-dropdown
          value="${this._booleanDropdownValue(launcher?.isOn)}"
          title-text="Launcher visibility"
          @cds-dropdown-selected=${this._handleLauncherVisibility}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}"
            >Default</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_TRUE}">On</cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_FALSE}">Off</cds-dropdown-item>
        </cds-dropdown>
      </div>

      ${this._renderCTAControls(
        "Mobile call to action",
        "mobile",
        launcher?.mobile,
      )}
      ${this._renderCTAControls(
        "Desktop call to action",
        "desktop",
        launcher?.desktop,
      )}
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-launcher-switcher": DemoLauncherSwitcher;
  }
}
