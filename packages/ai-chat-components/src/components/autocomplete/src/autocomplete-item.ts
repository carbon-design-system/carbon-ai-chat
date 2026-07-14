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

import "@carbon/web-components/es/components/icon-button/index.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import SendFilled16 from "@carbon/icons/es/send--filled/16.js";

import styles from "./autocomplete-item.scss?lit";

import type { SuggestionItem } from "../../prompt-line/src/types.js";

const blockClass = `${prefix}-autocomplete-item`;

/**
 * Autocomplete item component for displaying an individual suggestion.
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
   * The index of this item in the list
   */
  @property({ type: Number })
  index = 0;

  /**
   * The current text in the input (used to apply styling to indicate what user has already typed)
   */
  @property({ type: String, attribute: false })
  inputText = "";

  /**
   * Whether the component is in RTL mode.
   * @internal
   */
  @state() private isRTL = false;

  /**
   * Whether to render the send button.
   */
  @property({ type: Boolean, reflect: true, attribute: "enable-send-button" })
  enableSendButton = true;

  private _handleSendClick(event: Event) {
    event.stopPropagation();

    this.dispatchEvent(
      new CustomEvent("cds-aichat-autocomplete-item-send", {
        detail: { index: this.index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      const button = event.currentTarget as HTMLElement;
      button.click();
    }
  }

  private _handleSendKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      this._handleSendClick(event);
    }
  }

  /**
   * Render the avatar if provided
   */
  private _renderAvatar() {
    if (!this.item.avatar) {
      return null;
    }

    const avatar = this.item.avatar;

    // String URL - render as image
    if (typeof avatar === "string") {
      return html`
        <div class="${blockClass}__avatar">
          <img src="${avatar}" alt="" />
        </div>
      `;
    }

    // CarbonIcon - render using iconLoader
    if (typeof avatar !== "function") {
      return html`
        <div class="${blockClass}__avatar">${iconLoader(avatar)}</div>
      `;
    }

    return null;
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
        class="${blockClass}"
        role="option"
        tabindex="0"
        @keydown="${this._handleKeydown}"
      >
        <div class="${blockClass}__content">
          ${this._renderAvatar()}
          <div class="${blockClass}__text">
            <div class="${blockClass}__label">
              ${
                typed
                  ? html`<span class="${blockClass}__label-typed"
                      >${typed}</span
                    >`
                  : ""
              }${
                remainder
                  ? html`<span class="${blockClass}__label-remainder"
                      >${remainder}</span
                    >`
                  : ""
              }
            </div>
            ${
              this.item.description
                ? html`
                    <div class="${blockClass}__description">
                      ${this.item.description}
                    </div>
                  `
                : null
            }
          </div>
        </div>
        ${
          this.enableSendButton
            ? html`
                <cds-icon-button
                  class="${blockClass}__send"
                  kind="ghost"
                  size="md"
                  align="${this.isRTL ? "top-start" : "top-end"}"
                  @click="${this._handleSendClick}"
                  @keydown="${this._handleSendKeydown}"
                  aria-label="Send ${this.item.label}"
                >
                  ${iconLoader(SendFilled16, { slot: "icon" })}
                  <span slot="tooltip-content">Send message</span>
                </cds-icon-button>
              `
            : null
        }
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
