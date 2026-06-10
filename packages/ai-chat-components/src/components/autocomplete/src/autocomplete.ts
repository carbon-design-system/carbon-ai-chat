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
import Close16 from "@carbon/icons/es/close/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import "@carbon/web-components/es/components/icon-button/index.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import { isDirectionRTL } from "../../../globals/utils/rtl-utils.js";
import prefix from "../../../globals/settings.js";

import styles from "./autocomplete.scss?lit";
import "./autocomplete-item.js";
import "./autocomplete-item-group.js";

import type {
  SuggestionItem,
  SuggestionItemGroup,
} from "../../input/src/types.js";
export type {
  SuggestionItem,
  SuggestionItemGroup,
} from "../../input/src/types.js";

const blockClass = `${prefix}-autocomplete`;

/**
 * Configuration for the autocomplete header
 */
export interface HeaderConfig {
  /** Whether to show the header */
  showHeader: boolean;
  /** Title text to display in the header */
  title: string;
}

/**
 * Custom event detail for autocomplete select events
 */
export interface AutocompleteSelectEventDetail {
  item: SuggestionItem;
}

/**
 * Custom event detail for autocomplete send events
 */
export interface AutocompleteSendEventDetail {
  text: string;
}

/**
 * Autocomplete component for AI Chat input suggestions.
 *
 * @element cds-aichat-autocomplete
 * @fires {CustomEvent<AutocompleteSelectEventDetail>} cds-aichat-autocomplete-select - Fired when an item is selected
 * @fires {CustomEvent<AutocompleteSendEventDetail>} cds-aichat-autocomplete-send - Fired when send button is clicked for an item
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
   * Array of grouped suggestion items to display. These will be displayed after any provided `items`.
   */
  @property({ type: Array, attribute: false })
  groups: SuggestionItemGroup[] = [];

  /**
   * Optional header configuration
   */
  @property({ type: Object, attribute: false })
  headerConfig?: HeaderConfig;

  /**
   * The current text in the input (used to highlight the typed portion in items)
   */
  @property({ type: String, attribute: "input-text", reflect: true })
  inputText = "";

  /**
   * Whether to render the send button inside autocomplete items.
   */
  @property({ type: Boolean, reflect: true, attribute: "enable-send-button" })
  enableSendButton = true;

  /**
   * Whether the autocomplete is attached to another element (e.g., an input field).
   * When true, the bottom corners will not be rounded.
   */
  @property({ type: Boolean, reflect: true })
  attached = true;

  /**
   * Whether the component is in RTL mode.
   * @internal
   */
  @state() private isRTL = false;

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

    if (changedProperties.has("items") || changedProperties.has("groups")) {
      this._focusedIndex = 0;
    }
  }

  /**
   * Get the total count of all items (flat items + items in groups)
   */
  private _getTotalItemCount(): number {
    const flatCount = this.items.length;
    const groupedCount = this.groups.reduce(
      (sum, group) => sum + group.items.length,
      0,
    );
    return flatCount + groupedCount;
  }

  /**
   * Get the item at a specific index (accounting for both flat items and groups)
   */
  private _getItemAtIndex(index: number): SuggestionItem | null {
    if (index < this.items.length) {
      return this.items[index];
    }

    let currentIndex = this.items.length;
    for (const group of this.groups) {
      if (index < currentIndex + group.items.length) {
        return group.items[index - currentIndex];
      }
      currentIndex += group.items.length;
    }

    return null;
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    const totalItems = this._getTotalItemCount();
    if (totalItems === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this._focusedIndex = Math.min(this._focusedIndex + 1, totalItems - 1);
        this._scrollToFocusedItem();
        break;

      case "ArrowUp":
        event.preventDefault();
        this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
        this._scrollToFocusedItem();
        break;

      case "Enter": {
        event.preventDefault();
        const item = this._getItemAtIndex(this._focusedIndex);
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

  private _handleSendClick(item: SuggestionItem, event: Event) {
    event.stopPropagation();
    if (item.disabled) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<AutocompleteSendEventDetail>(
        "cds-aichat-autocomplete-send",
        {
          detail: { text: item.label },
          bubbles: true,
          composed: true,
        },
      ),
    );
  }

  private _handleClickOutside = (event: MouseEvent) => {
    if (!this.contains(event.target as Node)) {
      this._dismiss();
    }
  };

  private _scrollToFocusedItem() {
    this.requestUpdate();
    this.updateComplete.then(() => {
      const items = this.shadowRoot?.querySelectorAll(
        "cds-aichat-autocomplete-item",
      );
      if (items) {
        const itemArray = Array.from(items);
        if (itemArray[this._focusedIndex]) {
          itemArray[this._focusedIndex].scrollIntoView({ block: "nearest" });
        }
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

  private _handleHeaderCloseClick(event: Event) {
    event.stopPropagation();
    this._dismiss();
  }

  render() {
    // Detect RTL mode from document direction
    this.isRTL = isDirectionRTL();

    const totalItems = this._getTotalItemCount();
    if (totalItems === 0) {
      return null;
    }

    let currentIndex = 0;

    return html`
      <div
        class="${blockClass}"
        role="listbox"
        aria-label="Autocomplete options"
      >
        ${this.headerConfig?.showHeader
          ? html`
              <div class="${blockClass}--header">
                <span class="${blockClass}--header-title">
                  ${this.headerConfig.title}
                </span>
                <cds-icon-button
                  class="${blockClass}--header-close"
                  kind="ghost"
                  align="${this.isRTL ? "top-left" : "top-right"}"
                  size="sm"
                  @click="${this._handleHeaderCloseClick}"
                >
                  <span slot="icon">${iconLoader(Close16)}</span>
                  <span slot="tooltip-content">Close</span>
                </cds-icon-button>
              </div>
            `
          : ""}

        <div class="${blockClass}--items">
          <!-- Render flat items first -->
          ${this.items.map((item) => {
            const itemIndex = currentIndex++;
            return html`
              <cds-aichat-autocomplete-item
                .item="${item}"
                .focused="${this._focusedIndex === itemIndex}"
                .index="${itemIndex}"
                .inputText="${this.inputText}"
                .isRTL="${this.isRTL}"
                .enableSendButton="${this.enableSendButton}"
                @click="${() => this._handleItemClick(item, itemIndex)}"
                @mouseenter="${() => this._handleItemHover(itemIndex)}"
                @cds-aichat-autocomplete-item-send="${(e: Event) =>
                  this._handleSendClick(item, e)}"
              ></cds-aichat-autocomplete-item>
            `;
          })}

          <!-- Render grouped items -->
          ${this.groups.map((group) => {
            const groupStartIndex = currentIndex;
            currentIndex += group.items.length;
            return html`
              <cds-aichat-autocomplete-item-group
                .title="${group.title}"
                .items="${group.items}"
                .focusedIndex="${this._focusedIndex >= groupStartIndex &&
                this._focusedIndex < currentIndex
                  ? this._focusedIndex - groupStartIndex
                  : -1}"
                .startIndex="${groupStartIndex}"
                .inputText="${this.inputText}"
                .isRTL="${this.isRTL}"
                .enableSendButton="${this.enableSendButton}"
                @cds-aichat-autocomplete-item-click="${(e: CustomEvent) => {
                  const item = e.detail.item;
                  const index = e.detail.index;
                  this._handleItemClick(item, index);
                }}"
                @cds-aichat-autocomplete-item-hover="${(e: CustomEvent) => {
                  this._handleItemHover(e.detail.index);
                }}"
                @cds-aichat-autocomplete-item-send="${(e: CustomEvent) => {
                  this._handleSendClick(e.detail.item, e);
                }}"
              ></cds-aichat-autocomplete-item-group>
            `;
          })}
        </div>
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
