/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/checkbox/index.js";

import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { PublicConfig } from "@carbon/ai-chat";

@customElement("demo-keyboard-shortcut-switcher")
export class DemoKeyboardShortcutSwitcher extends LitElement {
  @property({ type: Object })
  accessor config!: PublicConfig;

  checkboxChanged = (event: Event) => {
    const customEvent = event as CustomEvent;
    const isChecked = customEvent.detail.checked;

    // Emit a custom event `config-changed` with the updated keyboard shortcut config
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: {
          ...this.config,
          keyboardShortcuts: {
            ...this.config.keyboardShortcuts,
            messageFocusToggle: {
              ...this.config.keyboardShortcuts?.messageFocusToggle,
              is_on: isChecked,
            },
          },
        },
        bubbles: true, // Ensure the event bubbles up to `demo-container`
        composed: true, // Allows event to pass through shadow DOM boundaries
      }),
    );
  };

  render() {
    const isEnabled =
      this.config.keyboardShortcuts?.messageFocusToggle?.is_on ?? true;

    return html`<cds-checkbox
      ?checked=${isEnabled}
      @cds-checkbox-changed=${this.checkboxChanged}
      helper-text="Use F6 to toggle focus between message list and input field (enabled by default)"
    >
      Enable F6 keyboard shortcut
    </cds-checkbox>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-keyboard-shortcut-switcher": DemoKeyboardShortcutSwitcher;
  }
}
