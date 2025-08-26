/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/dropdown/index.js";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { getSettings, updatePageTheme } from "./utils";

/**
 * `DemoPageThemeSwitcher` is a custom Lit element for switching the page theme.
 */
@customElement("demo-page-theme-switcher")
export class DemoPageThemeSwitcher extends LitElement {
  @state()
  accessor carbonTheme: string = "cds--white";

  constructor() {
    super();
    // Load theme from query parameters
    const { pageTheme } = getSettings();
    this.carbonTheme = pageTheme;
  }

  firstUpdated() {
    // Apply initial theme from query params
    this.applyTheme(this.carbonTheme);
  }

  applyTheme(theme: string) {
    // Remove existing theme classes from document
    document.documentElement.classList.remove(
      "cds--white",
      "cds--g10",
      "cds--g90",
      "cds--g100",
    );

    // Add the new theme class - Carbon will handle all the CSS variables
    document.documentElement.classList.add(theme);
  }

  themeSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    const newTheme = customEvent.detail.item.value;
    this.carbonTheme = newTheme;
    this.applyTheme(newTheme);
    // Save theme to query parameters
    updatePageTheme(newTheme);
  };

  render() {
    return html`<cds-dropdown
      value="${this.carbonTheme}"
      title-text="Page theme"
      @cds-dropdown-selected=${this.themeSelected}
    >
      <cds-dropdown-item value="cds--white">White</cds-dropdown-item>
      <cds-dropdown-item value="cds--g10">Light (G10)</cds-dropdown-item>
      <cds-dropdown-item value="cds--g90">Dark (G90)</cds-dropdown-item>
      <cds-dropdown-item value="cds--g100">Dark (G100)</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-page-theme-switcher": DemoPageThemeSwitcher;
  }
}
