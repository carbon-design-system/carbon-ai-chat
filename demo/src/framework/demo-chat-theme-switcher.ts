/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/dropdown/index.js";

import { PublicConfig } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

// Dropdown values as strings for boolean mapping
const AI_ON = "true";
const AI_OFF = "false";

@customElement("demo-chat-theme-switcher")
export class DemoChatThemeSwitcher extends LitElement {
  @property({ type: Object })
  accessor config!: PublicConfig;

  dropdownSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    // Emit a custom event `config-changed` with the new theme value
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          aiEnabled: customEvent.detail.item.value === AI_ON,
        },
        bubbles: true, // Ensure the event bubbles up to `demo-container`
        composed: true, // Allows event to pass through shadow DOM boundaries
      }),
    );
  };

  render() {
    return html`<cds-dropdown
      value="${String(this.config?.aiEnabled ?? true)}"
      title-text="Use AI theme"
      @cds-dropdown-selected=${this.dropdownSelected}
    >
      <cds-dropdown-item value="${AI_ON}">On</cds-dropdown-item>
      <cds-dropdown-item value="${AI_OFF}">Off</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-chat-theme-switcher": DemoChatThemeSwitcher;
  }
}
