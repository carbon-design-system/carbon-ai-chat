/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import "@carbon/web-components/es/components/dropdown/index.js";

import { CarbonTheme, PublicConfig } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("demo-theme-switcher")
export class DemoThemeSwitcher extends LitElement {
  @property({ type: Object })
  config: PublicConfig;

  firstUpdated() {
    // Listen for the `cds-dropdown-selected` event to handle changes in the dropdown
    this.shadowRoot
      ?.querySelector("cds-dropdown")
      ?.addEventListener("cds-dropdown-selected", (event: CustomEvent) => {
        // Emit a custom event `settings-changed` with the new framework value
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: {
              ...this.config,
              themeConfig: {
                ...this.config.themeConfig,
                carbonTheme: event.detail.item.value,
              },
            },
            bubbles: true, // Ensure the event bubbles up to `demo-container`
            composed: true, // Allows event to pass through shadow DOM boundaries
          })
        );
      });
  }

  render() {
    return html`<cds-dropdown
      value="${this.config.themeConfig.carbonTheme || CarbonTheme.G10}"
      title-text="Carbon theme"
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
