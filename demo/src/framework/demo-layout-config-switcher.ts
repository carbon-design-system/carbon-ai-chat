/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/dropdown/index.js";

import { CornersType, LayoutConfig, PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

const DROPDOWN_DEFAULT = "default";
const DROPDOWN_TRUE = "true";
const DROPDOWN_FALSE = "false";

@customElement("demo-layout-config-switcher")
export class DemoLayoutConfigSwitcher extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .layout-section {
      margin-bottom: 1rem;
    }

    .layout-section:last-child {
      margin-bottom: 0;
    }
  `;

  @property({ type: Object })
  accessor config!: PublicConfig;

  private _updateLayout(
    mutate: (layout: LayoutConfig | undefined) => LayoutConfig | undefined,
  ) {
    const currentLayout = this.config.layout
      ? { ...this.config.layout }
      : undefined;
    const nextLayout = mutate(currentLayout);

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          layout: nextLayout,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _normalizeLayout(
    layout: LayoutConfig | undefined,
  ): LayoutConfig | undefined {
    if (!layout) {
      return undefined;
    }

    const cleaned: LayoutConfig = { ...layout };

    if (cleaned.customProperties !== undefined) {
      const customPropsEntries = Object.entries(cleaned.customProperties ?? {});
      const filteredEntries = customPropsEntries.filter(
        ([, value]) => value !== undefined && value !== "",
      );
      if (filteredEntries.length > 0) {
        cleaned.customProperties = Object.fromEntries(filteredEntries);
      } else {
        delete cleaned.customProperties;
      }
    }

    (Object.keys(cleaned) as (keyof LayoutConfig)[]).forEach((key) => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });

    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  private _handleBooleanDropdown(
    event: Event,
    key: "showFrame" | "hasContentMaxWidth",
  ) {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    this._updateLayout((layout) => {
      const next = { ...(layout ?? {}) };

      if (value === DROPDOWN_DEFAULT) {
        delete next[key];
      } else if (value === DROPDOWN_TRUE) {
        next[key] = true;
      } else if (value === DROPDOWN_FALSE) {
        next[key] = false;
      }

      return this._normalizeLayout(next);
    });
  }

  private _handleCornersDropdown(event: Event) {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value as string;

    this._updateLayout((layout) => {
      const next = { ...(layout ?? {}) };

      if (value === DROPDOWN_DEFAULT) {
        delete next.corners;
      } else {
        next.corners = value as CornersType;
      }

      return this._normalizeLayout(next);
    });
  }

  private _getBooleanDropdownValue(value: boolean | undefined) {
    if (value === undefined) {
      return DROPDOWN_DEFAULT;
    }

    return value ? DROPDOWN_TRUE : DROPDOWN_FALSE;
  }

  private _getCornersValue(value: CornersType | undefined) {
    return value ?? DROPDOWN_DEFAULT;
  }

  render() {
    const layout = this.config?.layout;

    return html`
      <div class="layout-section">
        <cds-dropdown
          value="${this._getBooleanDropdownValue(layout?.showFrame)}"
          title-text="Show frame"
          @cds-dropdown-selected=${(event: Event) =>
            this._handleBooleanDropdown(event, "showFrame")}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}"
            >Default</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_TRUE}">True</cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_FALSE}">False</cds-dropdown-item>
        </cds-dropdown>
      </div>

      <div class="layout-section">
        <cds-dropdown
          value="${this._getBooleanDropdownValue(layout?.hasContentMaxWidth)}"
          title-text="Has content max width"
          @cds-dropdown-selected=${(event: Event) =>
            this._handleBooleanDropdown(event, "hasContentMaxWidth")}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}"
            >Default</cds-dropdown-item
          >
          <cds-dropdown-item value="${DROPDOWN_TRUE}">True</cds-dropdown-item>
          <cds-dropdown-item value="${DROPDOWN_FALSE}">False</cds-dropdown-item>
        </cds-dropdown>
      </div>

      <div class="layout-section">
        <cds-dropdown
          value="${this._getCornersValue(layout?.corners)}"
          title-text="Corner style"
          @cds-dropdown-selected=${this._handleCornersDropdown}
        >
          <cds-dropdown-item value="${DROPDOWN_DEFAULT}"
            >Default</cds-dropdown-item
          >
          <cds-dropdown-item value="${CornersType.ROUND}"
            >Round</cds-dropdown-item
          >
          <cds-dropdown-item value="${CornersType.SQUARE}"
            >Square</cds-dropdown-item
          >
        </cds-dropdown>
      </div>
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-layout-config-switcher": DemoLayoutConfigSwitcher;
  }
}
