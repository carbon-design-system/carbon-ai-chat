/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/dropdown/index.js";

import { CarbonTheme, PublicConfig } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("demo-theme-switcher")
export class DemoThemeSwitcher extends LitElement {
  @property({ type: Object })
  accessor config!: PublicConfig;

  dropdownSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    // Emit a custom event `settings-changed` with the new framework value
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          themeConfig: {
            ...this.config.themeConfig,
            carbonTheme: customEvent.detail.item.value,
          },
        },
        bubbles: true, // Ensure the event bubbles up to `demo-container`
        composed: true, // Allows event to pass through shadow DOM boundaries
      }),
    );
  };

  render() {
    return html`<cds-dropdown
      value="${this.config?.themeConfig?.carbonTheme || CarbonTheme.G10}"
      title-text="Carbon theme"
      @cds-dropdown-selected=${this.dropdownSelected}
    >
      <cds-dropdown-item value="g10">Light (g10)</cds-dropdown-item>
      <cds-dropdown-item value="g100">Dark (g100)</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-theme-switcher": DemoThemeSwitcher;
  }
}
