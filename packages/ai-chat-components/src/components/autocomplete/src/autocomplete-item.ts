/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Send16 from "@carbon/icons/es/send/16.js";

import styles from "./autocomplete-item.scss?lit";

import type { SuggestionItem } from "../../input/src/types.js";

const blockClass = `${prefix}-autocomplete-item`;

/**
 * Autocomplete item component for displaying individual suggestions.
 *
 * @element cds-aichat-autocomplete-item
 * @fires {CustomEvent} cds-aichat-autocomplete-item-send - Fired when the send button is clicked
 */
@carbonElement(`${prefix}-autocomplete-item`)
class AutocompleteItemElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The suggestion item to display
   */
  @property({ type: Object, attribute: false })
  item!: SuggestionItem;

  /**
   * Whether this item is currently focused
   */
  @property({ type: Boolean, reflect: true })
  focused = false;

  /**
   * The index of this item in the list
   */
  @property({ type: Number })
  index = 0;

  /**
   * The current text in the input (used to highlight the typed portion)
   */
  @property({ type: String, attribute: false })
  inputText = "";

  /**
   * Whether the component is in RTL mode.
   * @internal
   */
  @state() private isRTL = false;

  private _handleSendClick(event: Event) {
    event.stopPropagation();
    if (this.item.disabled) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("cds-aichat-autocomplete-item-send", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Split the label into typed and remainder parts based on inputText
   */
  private _getLabelParts(): { typed: string; remainder: string } {
    const label = this.item.label;
    const input = this.inputText.toLowerCase();
    const labelLower = label.toLowerCase();

    // Check if the label starts with the input text (case-insensitive)
    if (input && labelLower.startsWith(input)) {
      return {
        typed: label.substring(0, input.length),
        remainder: label.substring(input.length),
      };
    }

    // If no match, return the entire label as remainder
    return {
      typed: "",
      remainder: label,
    };
  }

  render() {
    const { typed, remainder } = this._getLabelParts();

    return html`
      <div
        class="${blockClass} ${this.focused
          ? `${blockClass}--focused`
          : ""} ${this.item.disabled ? `${blockClass}--disabled` : ""}"
        role="option"
        aria-selected="${this.focused}"
        aria-disabled="${this.item.disabled || false}"
      >
        <div class="${blockClass}--content">
          <div class="${blockClass}--label">
            ${typed
              ? html`<span class="${blockClass}--label-typed">${typed}</span>`
              : ""}${remainder
              ? html`<span class="${blockClass}--label-remainder"
                  >${remainder}</span
                >`
              : ""}
          </div>
          ${this.item.description
            ? html`
                <div class="${blockClass}--description">
                  ${this.item.description}
                </div>
              `
            : null}
        </div>
        <cds-icon-button
          class="${blockClass}--send-button"
          kind="ghost"
          size="md"
          align="${this.isRTL ? "top-start" : "top-end"}"
          @click="${this._handleSendClick}"
          aria-label="Send ${this.item.label}"
          ?disabled="${this.item.disabled}"
        >
          ${iconLoader(Send16, { slot: "icon" })}
          <span slot="tooltip-content">Send message</span>
        </cds-icon-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-autocomplete-item": AutocompleteItemElement;
  }
}

export default AutocompleteItemElement;
