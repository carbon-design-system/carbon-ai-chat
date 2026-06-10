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
import { isDirectionRTL } from "../../../globals/utils/rtl-utils.js";
import prefix from "../../../globals/settings.js";

import styles from "./autocomplete-item-group.scss?lit";
import "./autocomplete-item.js";

import type { SuggestionItem } from "../../input/src/types.js";

const blockClass = `${prefix}-autocomplete-item-group`;

/**
 * Autocomplete item group component for grouping related suggestions with a title.
 *
 * @element cds-aichat-autocomplete-item-group
 */
@carbonElement(`${prefix}-autocomplete-item-group`)
class AutocompleteItemGroupElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The title displayed above the group of items
   */
  @property({ type: String })
  title = "";

  /**
   * Array of suggestion items to display in this group
   */
  @property({ type: Array, attribute: false })
  items: SuggestionItem[] = [];

  /**
   * The index of the focused item within this group
   * @internal
   */
  @property({ type: Number, attribute: false })
  focusedIndex = -1;

  /**
   * The starting index of this group in the overall autocomplete list
   * @internal
   */
  @property({ type: Number, attribute: false })
  startIndex = 0;

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

  /**
   * Whether to render the send button for items in this group.
   */
  @property({ type: Boolean, reflect: true, attribute: "enable-send-button" })
  enableSendButton = true;

  private _handleItemClick(item: SuggestionItem, index: number) {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-autocomplete-item-click", {
        detail: { item, index: this.startIndex + index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleItemHover(index: number) {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-autocomplete-item-hover", {
        detail: { index: this.startIndex + index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleSendClick(item: SuggestionItem, index: number, event: Event) {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("cds-aichat-autocomplete-item-send", {
        detail: { item, index: this.startIndex + index },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (this.items.length === 0) {
      return null;
    }

    // Detect RTL mode from document direction
    this.isRTL = isDirectionRTL();

    return html`
      <div class="${blockClass}" role="group" aria-label="${this.title}">
        ${this.title
          ? html` <div class="${blockClass}--title">${this.title}</div> `
          : null}
        <div class="${blockClass}--items">
          ${this.items.map(
            (item, index) => html`
              <cds-aichat-autocomplete-item
                .item="${item}"
                .focused="${this.focusedIndex === index}"
                .index="${this.startIndex + index}"
                .inputText="${this.inputText}"
                .isRTL="${this.isRTL}"
                .enableSendButton="${this.enableSendButton}"
                @click="${() => this._handleItemClick(item, index)}"
                @mouseenter="${() => this._handleItemHover(index)}"
                @cds-aichat-autocomplete-item-send="${(e: Event) =>
                  this._handleSendClick(item, index, e)}"
              ></cds-aichat-autocomplete-item>
            `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-autocomplete-item-group": AutocompleteItemGroupElement;
  }
}

export default AutocompleteItemGroupElement;
