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
} from "../../input/src/tiptap/types.js";
export type {
  SuggestionItem,
  SuggestionItemGroup,
} from "../../input/src/tiptap/types.js";

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
   * The current text in the input (used to apply styling to indicate what user has already typed)
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

    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "-1");
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
        this._focusItemAtIndex(this._focusedIndex);
        break;

      case "ArrowUp":
        event.preventDefault();
        this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
        this._focusItemAtIndex(this._focusedIndex);
        break;

      case "Home":
        event.preventDefault();
        this._focusedIndex = 0;
        this._focusItemAtIndex(this._focusedIndex);
        break;

      case "End":
        event.preventDefault();
        this._focusedIndex = totalItems - 1;
        this._focusItemAtIndex(this._focusedIndex);
        break;

      case "Escape":
        event.preventDefault();
        this._dismiss();
        break;
    }
  };

  private _handleSendClick(event: CustomEvent) {
    event.stopPropagation();
    const index = event.detail?.index;

    if (index === undefined) {
      return;
    }

    // Update focused index to match the item whose send button was clicked
    this._focusedIndex = index;

    const item = this._getItemAtIndex(index);

    if (!item) {
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

  private _focusItemAtIndex(index: number) {
    this.requestUpdate();
    this.updateComplete.then(() => {
      const itemsContainer = this.shadowRoot?.querySelector(
        `.${blockClass}__items`,
      );
      const itemArray =
        Array.from(itemsContainer?.children ?? []).flatMap((child) => {
          if (child.tagName === "CDS-AICHAT-AUTOCOMPLETE-ITEM") {
            return [child];
          }

          if (child.tagName === "CDS-AICHAT-AUTOCOMPLETE-ITEM-GROUP") {
            return Array.from(
              child.shadowRoot?.querySelectorAll(
                "cds-aichat-autocomplete-item",
              ) ?? [],
            );
          }

          return [];
        }) ?? [];

      const targetItem = itemArray[index] as HTMLElement | undefined;
      if (targetItem) {
        const itemElement =
          targetItem.shadowRoot?.querySelector(`[role="option"]`);
        if (itemElement) {
          (itemElement as HTMLElement).focus();
          targetItem.scrollIntoView({ block: "nearest" });
        }
      }
    });
  }

  private _selectItem(item: SuggestionItem) {
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

  private _handleItemClick(index: number) {
    this._focusedIndex = index;
    const item = this._getItemAtIndex(index);
    if (item) {
      this._selectItem(item);
    }
  }

  private _handleGroupItemClick(event: CustomEvent) {
    event.stopPropagation();
    const index = event.detail?.index;
    if (index !== undefined) {
      this._handleItemClick(index);
    }
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
        ${
          this.headerConfig?.showHeader
            ? html`
                <div class="${blockClass}__header">
                  <span class="${blockClass}__title">
                    ${this.headerConfig.title}
                  </span>
                </div>
              `
            : ""
        }

        <div class="${blockClass}__items">
          <!-- Render flat items first -->
          ${this.items.map((item, idx) => {
            const itemIndex = currentIndex++;
            const isFirstItem = !this.headerConfig?.showHeader && idx === 0;
            const isLastItem =
              this.groups.length === 0 && idx === this.items.length - 1;
            return html`
              <cds-aichat-autocomplete-item
                .item="${item}"
                .index="${itemIndex}"
                .inputText="${this.inputText}"
                .isRTL="${this.isRTL}"
                .enableSendButton="${this.enableSendButton}"
                ?first-item="${isFirstItem}"
                ?last-item="${isLastItem}"
                @click="${() => this._handleItemClick(itemIndex)}"
                @cds-aichat-autocomplete-item-send="${this._handleSendClick}"
              ></cds-aichat-autocomplete-item>
            `;
          })}

          <!-- Render grouped items -->
          ${this.groups.map((group, groupIdx) => {
            const groupStartIndex = currentIndex;
            currentIndex += group.items.length;
            const isLastGroup = groupIdx === this.groups.length - 1;
            return html`
              <cds-aichat-autocomplete-item-group
                .title="${group.title}"
                .items="${group.items}"
                .startIndex="${groupStartIndex}"
                .inputText="${this.inputText}"
                .isRTL="${this.isRTL}"
                .enableSendButton="${this.enableSendButton}"
                ?last-group="${isLastGroup}"
                @cds-aichat-autocomplete-item-click="${
                  this._handleGroupItemClick
                }"
                @cds-aichat-autocomplete-item-send="${this._handleSendClick}"
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
