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
          is_on: true,
          disable_return: false,
          greeting: "Hello!\n\nThis is some text to introduce your chat.",
          starters: {
            is_on: true,
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
          is_on: true,
          disable_return: true,
          greeting:
            "A splash homescreen is removed when a message is sent. It can be combined with a custom homescreen.",
          starters: {
            is_on: true,
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
          is_on: true,
          disable_return: false,
          custom_content_only: true,
        };
        break;
      case "none":
      default:
        homescreen = undefined;
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
    if (!this.config?.homescreen?.is_on) {
      return "none";
    }
    if (this.config.homescreen.custom_content_only) {
      return "custom";
    }
    if (this.config.homescreen.disable_return) {
      return "splash";
    }
    return "default";
  }

  render() {
    return html`<cds-dropdown
      value="${this.getCurrentHomescreenValue()}"
      title-text="Homescreen"
      helper-text="If you have already sent messages, refresh the page to ensure seeing the initial homescreen state."
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
