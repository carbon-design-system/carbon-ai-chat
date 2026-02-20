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

@customElement("demo-stop-button-immediate-switcher")
export class DemoStopButtonImmediateSwitcher extends LitElement {
  @property({ type: Object })
  accessor config!: PublicConfig;

  dropdownSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    const value = customEvent.detail.item.value === "true";

    // Emit a custom event `config-changed` with the updated messaging config
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          messaging: {
            ...this.config.messaging,
            showStopButtonImmediately: value,
          },
        },
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const currentValue = this.config.messaging?.showStopButtonImmediately
      ? "true"
      : "false";

    return html`<cds-dropdown
      value="${currentValue}"
      title-text="Show stop button immediately"
      helper-text="When enabled, the stop button appears as soon as customSendMessage is called, allowing users to cancel slow-starting requests. Try 'text (delayed response)' or 'text (delayed streaming response)' to see it in action."
      @cds-dropdown-selected=${this.dropdownSelected}
    >
      <cds-dropdown-item value="false">False (default)</cds-dropdown-item>
      <cds-dropdown-item value="true">True</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-stop-button-immediate-switcher": DemoStopButtonImmediateSwitcher;
  }
}

// Made with Bob
