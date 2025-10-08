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
    let disclaimer = this.config.disclaimer;

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
        disclaimer = undefined;
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
        disclaimer = undefined;
        break;
      case "custom":
        homescreen = {
          isOn: true,
          disableReturn: false,
          customContentOnly: true,
        };
        disclaimer = undefined;
        break;
      case "disclaimer-only":
        homescreen = {
          isOn: false,
        };
        disclaimer = {
          isOn: true,
          disclaimerHTML:
            "<p>This is a demo disclaimer. By using this chat, you agree to our terms and conditions.</p>",
        };
        break;
      case "disclaimer-with-default":
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
        disclaimer = {
          isOn: true,
          disclaimerHTML:
            "<p>This is a demo disclaimer. By using this chat, you agree to our terms and conditions.</p>",
        };
        break;
      case "none":
      default:
        homescreen = {
          isOn: false,
        };
        disclaimer = undefined;
        break;
    }

    // Emit a custom event `config-changed` with the new home screen and disclaimer configuration
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          homescreen,
          disclaimer,
        },
        bubbles: true, // Ensure the event bubbles up to `demo-container`
        composed: true, // Allows event to pass through shadow DOM boundaries
      }),
    );
  };

  private getCurrentHomescreenValue(): string {
    const hasDisclaimer = this.config?.disclaimer?.isOn;
    const hasHomescreen = this.config?.homescreen?.isOn;

    if (hasDisclaimer && !hasHomescreen) {
      return "disclaimer-only";
    }
    if (hasDisclaimer && hasHomescreen) {
      return "disclaimer-with-default";
    }
    if (!hasHomescreen) {
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
      title-text="Homescreen and Disclaimer"
      @cds-dropdown-selected=${this.dropdownSelected}
    >
      <cds-dropdown-item value="none">None</cds-dropdown-item>
      <cds-dropdown-item value="default">Default</cds-dropdown-item>
      <cds-dropdown-item value="splash">Splash</cds-dropdown-item>
      <cds-dropdown-item value="custom">Custom</cds-dropdown-item>
      <cds-dropdown-item value="disclaimer-only"
        >Disclaimer Only</cds-dropdown-item
      >
      <cds-dropdown-item value="disclaimer-with-default"
        >Disclaimer + Default</cds-dropdown-item
      >
    </cds-dropdown>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-homescreen-switcher": DemoHomeScreenSwitcher;
  }
}
