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
 * @fires {CustomEvent} cds-aichat-autocomplete-item-click - Fired when an item in the group is clicked
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
   * Whether to render the send button for items in this group.
   */
  @property({ type: Boolean, reflect: true, attribute: "enable-send-button" })
  enableSendButton = true;

  /**
   * Whether this is the last group in the autocomplete list.
   * @internal
   */
  @property({ type: Boolean, reflect: true, attribute: "data-last-group" })
  lastGroup = false;

  /**
   * Whether the component is in RTL mode.
   * @internal
   */
  @state() private isRTL = false;

  private _handleItemClick(event: Event) {
    const target = event.currentTarget as any;
    const index = target.index;
    if (index !== undefined) {
      this.dispatchEvent(
        new CustomEvent("cds-aichat-autocomplete-item-click", {
          detail: { index },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  render() {
    if (this.items.length === 0) {
      return null;
    }

    // Detect RTL mode from document direction
    this.isRTL = isDirectionRTL();

    return html`
      <div class="${blockClass}" role="listbox" aria-label="${this.title}">
        ${
          this.title
            ? html` <div class="${blockClass}__title">${this.title}</div> `
            : null
        }
        <div class="${blockClass}__items">
          ${this.items.map((item, index) => {
            const isLastItem =
              this.lastGroup && index === this.items.length - 1;
            return html`
              <cds-aichat-autocomplete-item
                .item="${item}"
                .index="${this.startIndex + index}"
                .inputText="${this.inputText}"
                .isRTL="${this.isRTL}"
                .enableSendButton="${this.enableSendButton}"
                ?last-item="${isLastItem}"
                @click="${this._handleItemClick}"
              ></cds-aichat-autocomplete-item>
            `;
          })}
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
