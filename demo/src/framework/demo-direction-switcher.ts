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

@customElement("demo-direction-switcher")
export class DemoDirectionSwitcher extends LitElement {
  @property({ type: Object })
  accessor settings!: Settings;

  dropdownSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    const newDirection = customEvent.detail.item.value;

    // Update HTML dir attribute
    const htmlElement = document.documentElement;
    if (newDirection === "default") {
      htmlElement.removeAttribute("dir");
    } else {
      htmlElement.setAttribute("dir", newDirection);
    }

    // Emit a custom event `settings-changed` with the new direction value
    this.dispatchEvent(
      new CustomEvent("settings-changed", {
        detail: { ...this.settings, direction: newDirection },
        bubbles: true, // Ensure the event bubbles up to `demo-container`
        composed: true, // Allows event to pass through shadow DOM boundaries
      }),
    );
  };

  render() {
    return html`<cds-dropdown
      value="${this.settings.direction}"
      title-text="Direction"
      @cds-dropdown-selected=${this.dropdownSelected}
    >
      <cds-dropdown-item value="default">Default</cds-dropdown-item>
      <cds-dropdown-item value="ltr">LTR</cds-dropdown-item>
      <cds-dropdown-item value="rtl">RTL</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-direction-switcher": DemoDirectionSwitcher;
  }
}
