/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import styles from "./autocomplete.scss?lit";

import type { SuggestionItem } from "../../input/src/types.js";
export type { SuggestionItem } from "../../input/src/types.js";

/**
 * Custom event detail for autocomplete select events
 */
export interface AutocompleteSelectEventDetail {
  item: SuggestionItem;
}

/**
 * Autocomplete component for AI Chat input suggestions.
 *
 * @element cds-aichat-autocomplete
 * @fires {CustomEvent<AutocompleteSelectEventDetail>} cds-aichat-autocomplete-select - Fired when an item is selected
 * @fires {CustomEvent} cds-aichat-autocomplete-dismiss - Fired when the autocomplete is dismissed
 */
@carbonElement(`${prefix}-autocomplete`)
class AutocompleteElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * Array of suggestion items to display
   */
  @property({ type: Array, attribute: false })
  items: SuggestionItem[] = [];

  /**
   * Currently focused item index
   * @internal
   */
  @state()
  private _focusedIndex = 0;

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
    this.addEventListener("keydown", this._handleKeydown);
    document.addEventListener("click", this._handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeydown);
    document.removeEventListener("click", this._handleClickOutside);
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has("items")) {
      this._focusedIndex = 0;
    }
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    if (this.items.length === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this._focusedIndex = Math.min(
          this._focusedIndex + 1,
          this.items.length - 1,
        );
        this._scrollToFocusedItem();
        break;

      case "ArrowUp":
        event.preventDefault();
        this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
        this._scrollToFocusedItem();
        break;

      case "Enter": {
        event.preventDefault();
        const item = this.items[this._focusedIndex];
        if (item) {
          this._selectItem(item);
        }
        break;
      }

      case "Escape":
        event.preventDefault();
        this._dismiss();
        break;
    }
  };

  private _handleClickOutside = (event: MouseEvent) => {
    if (!this.contains(event.target as Node)) {
      this._dismiss();
    }
  };

  private _scrollToFocusedItem() {
    this.requestUpdate();
    this.updateComplete.then(() => {
      const focusedElement = this.shadowRoot?.querySelector(
        ".cds-aichat--autocomplete-item--focused",
      );
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: "nearest" });
      }
    });
  }

  private _selectItem(item: SuggestionItem) {
    if (item.disabled) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<AutocompleteSelectEventDetail>(
        "cds-aichat-autocomplete-select",
        {
          detail: { item },
          bubbles: true,
          composed: true,
        },
      ),
    );
  }

  private _dismiss() {
    this.dispatchEvent(
      new CustomEvent("cds-aichat-autocomplete-dismiss", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleItemClick(item: SuggestionItem, index: number) {
    this._focusedIndex = index;
    this._selectItem(item);
  }

  private _handleItemHover(index: number) {
    this._focusedIndex = index;
  }

  render() {
    if (this.items.length === 0) {
      return null;
    }

    return html`
      <div
        class="cds-aichat--autocomplete"
        role="listbox"
        aria-label="Suggestions"
      >
        <!-- TODO: Render item.icon (CarbonIcon) via iconLoader when autocomplete is improved -->
        ${this.items.map(
          (item, index) => html`
            <div
              class="cds-aichat--autocomplete-item ${this._focusedIndex ===
              index
                ? "cds-aichat--autocomplete-item--focused"
                : ""} ${item.disabled
                ? "cds-aichat--autocomplete-item--disabled"
                : ""}"
              role="option"
              aria-selected="${this._focusedIndex === index}"
              aria-disabled="${item.disabled || false}"
              @click="${() => this._handleItemClick(item, index)}"
              @mouseenter="${() => this._handleItemHover(index)}"
            >
              <div class="cds-aichat--autocomplete-item-content">
                <div class="cds-aichat--autocomplete-item-label">
                  ${item.label}
                </div>
                ${item.description
                  ? html`
                      <div class="cds-aichat--autocomplete-item-description">
                        ${item.description}
                      </div>
                    `
                  : null}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-autocomplete": AutocompleteElement;
  }
}

export default AutocompleteElement;
