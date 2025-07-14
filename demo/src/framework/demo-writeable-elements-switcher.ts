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
import { customElement, property } from "lit/decorators.js";

import { Settings } from "./types";

@customElement("demo-writeable-elements-switcher")
export class DemoWriteableElementsSwitcher extends LitElement {
  @property({ type: Object })
  accessor settings!: Settings;

  dropdownSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    // Emit a custom event `settings-changed` with the new framework value
    this.dispatchEvent(
      new CustomEvent("settings-changed", {
        detail: {
          ...this.settings,
          writeableElements: customEvent.detail.item.value,
        },
        bubbles: true, // Ensure the event bubbles up to `demo-container`
        composed: true, // Allows event to pass through shadow DOM boundaries
      })
    );
  };

  render() {
    return html`<cds-dropdown
      value="${this.settings.writeableElements}"
      title-text="Show writeable elements"
      @cds-dropdown-selected=${this.dropdownSelected}
    >
      <cds-dropdown-item value="false">False</cds-dropdown-item>
      <cds-dropdown-item value="true">True</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-writeable-elements-switcher": DemoWriteableElementsSwitcher;
  }
}
