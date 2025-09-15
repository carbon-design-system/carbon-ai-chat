/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/dropdown/index.js";

import { PublicConfig, HomeScreenConfig } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("demo-homescreen-switcher")
export class DemoHomeScreenSwitcher extends LitElement {
  @property({ type: Object })
  accessor config!: PublicConfig;

  dropdownSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    const selectedValue = customEvent.detail.item.value;

    let homescreen: HomeScreenConfig | undefined;

    switch (selectedValue) {
      case "default":
        homescreen = {
          isOn: true,
          disableReturn: false,
          greeting: "Hello!\n\nThis is some text to introduce your chat.",
          starters: {
            isOn: true,
            buttons: [
              { label: "text (stream)" },
              { label: "code (stream)" },
              { label: "text" },
              { label: "code" },
            ],
          },
        };
        break;
      case "splash":
        homescreen = {
          isOn: true,
          disableReturn: true,
          greeting:
            "A splash homescreen is removed when a message is sent. It can be combined with a custom homescreen.",
          starters: {
            isOn: true,
            buttons: [
              { label: "text (stream)" },
              { label: "code (stream)" },
              { label: "text" },
              { label: "code" },
            ],
          },
        };
        break;
      case "custom":
        homescreen = {
          isOn: true,
          disableReturn: false,
          customContentOnly: true,
        };
        break;
      case "none":
      default:
        homescreen = {
          isOn: false,
        };
        break;
    }

    // Emit a custom event `config-changed` with the new home screen configuration
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          homescreen,
        },
        bubbles: true, // Ensure the event bubbles up to `demo-container`
        composed: true, // Allows event to pass through shadow DOM boundaries
      }),
    );
  };

  private getCurrentHomescreenValue(): string {
    if (!this.config?.homescreen?.isOn) {
      return "none";
    }
    if (this.config.homescreen.customContentOnly) {
      return "custom";
    }
    if (this.config.homescreen.disableReturn) {
      return "splash";
    }
    return "default";
  }

  render() {
    return html`<cds-dropdown
      value="${this.getCurrentHomescreenValue()}"
      title-text="Homescreen"
      @cds-dropdown-selected=${this.dropdownSelected}
    >
      <cds-dropdown-item value="none">None</cds-dropdown-item>
      <cds-dropdown-item value="default">Default</cds-dropdown-item>
      <cds-dropdown-item value="splash">Splash</cds-dropdown-item>
      <cds-dropdown-item value="custom">Custom</cds-dropdown-item>
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-homescreen-switcher": DemoHomeScreenSwitcher;
  }
}
