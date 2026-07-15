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
import { AriaAnnouncerManager } from "../../../globals/utils/aria-announcer-manager.js";

import styles from "./autocomplete.scss?lit";
import "./autocomplete-item.js";
import "./autocomplete-item-group.js";

import type {
  SuggestionItem,
  SuggestionItemGroup,
} from "../../prompt-line/src/tiptap/types.js";
export type {
  SuggestionItem,
  SuggestionItemGroup,
} from "../../prompt-line/src/tiptap/types.js";

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
   * Currently active item index
   * @internal
   */
  @state()
  private _focusedIndex = 0;

  private _announcer = new AriaAnnouncerManager();

  /** Polite live-region elements rendered into shadow DOM. */
  private _politeRegion1!: HTMLDivElement;
  private _politeRegion2!: HTMLDivElement;

  /**
   * Pending arrow-move announcement timer. Held-key rapid fires are collapsed:
   * only the last pending label is spoken.
   */
  private _moveAnnouncePending: number | null = null;

  /** Whether the open announcement has already fired for this show. */
  private _openAnnounced = false;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this._handleKeydown);
    document.addEventListener("click", this._handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeydown);
    document.removeEventListener("click", this._handleClickOutside);
    this._announcer.disconnect();
    if (this._moveAnnouncePending !== null) {
      clearTimeout(this._moveAnnouncePending);
      this._moveAnnouncePending = null;
    }
  }

  firstUpdated() {
    this._politeRegion1 = this.shadowRoot!.querySelector<HTMLDivElement>(
      `.${blockClass}__sr-region-1`,
    )!;
    this._politeRegion2 = this.shadowRoot!.querySelector<HTMLDivElement>(
      `.${blockClass}__sr-region-2`,
    )!;
    this._announcer.connect([this._politeRegion1, this._politeRegion2]);
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    const itemsChanged =
      changedProperties.has("items") || changedProperties.has("groups");

    if (itemsChanged) {
      const totalItems = this._getTotalItemCount();
      if (totalItems === 0) {
        this._announcer.announce("No suggestions.");
        this._openAnnounced = false;
        return;
      }
      // Reset to first item and announce list opened (once per show).
      this._focusedIndex = 0;
      if (!this._openAnnounced) {
        this._openAnnounced = true;
        this._announcer.announce(
          `${totalItems} suggestion${totalItems === 1 ? "" : "s"}. Use up and down arrows to move, Enter to pick, Escape to close.`,
        );
      }
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
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case "ArrowUp":
        event.preventDefault();
        this._focusedIndex = Math.max(this._focusedIndex - 1, 0);
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case "Home":
        event.preventDefault();
        this._focusedIndex = 0;
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case "End":
        event.preventDefault();
        this._focusedIndex = totalItems - 1;
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case "Escape":
        event.preventDefault();
        this._dismiss();
        break;

      case "Enter":
        event.preventDefault();
        this._handleItemClick(this._focusedIndex);
        break;
    }
  };

  /**
   * Schedule a move announcement, replacing any pending one so rapid arrow
   * holds only speak the final position.
   */
  private _scheduleMoveAnnouncement(index: number, total: number): void {
    if (this._moveAnnouncePending !== null) {
      clearTimeout(this._moveAnnouncePending);
    }
    this._moveAnnouncePending = window.setTimeout(() => {
      this._moveAnnouncePending = null;
      const item = this._getItemAtIndex(index);
      if (!item) {
        return;
      }
      const position = `${index + 1} of ${total}`;
      const description = item.description ? `, ${item.description}` : "";
      this._announcer.announce(`${item.label}${description}, ${position}`);
    }, 50);
  }

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
      // this._dismiss();
    }
  };

  private _scrollActiveItemIntoView(): void {
    this.updateComplete.then(() => {
      const itemsContainer = this.shadowRoot?.querySelector(
        `.${blockClass}__items`,
      );
      const itemArray = this._flatItemElements(itemsContainer);
      const targetItem = itemArray[this._focusedIndex] as
        | HTMLElement
        | undefined;
      if (targetItem) {
        targetItem.scrollIntoView({ block: "nearest" });
      }
    });
  }

  private _flatItemElements(container: Element | null | undefined): Element[] {
    return Array.from(container?.children ?? []).flatMap((child) => {
      if (child.tagName === "CDS-AICHAT-AUTOCOMPLETE-ITEM") {
        return [child];
      }
      if (child.tagName === "CDS-AICHAT-AUTOCOMPLETE-ITEM-GROUP") {
        return Array.from(
          child.shadowRoot?.querySelectorAll("cds-aichat-autocomplete-item") ??
            [],
        );
      }
      return [];
    });
  }

  private _selectItem(item: SuggestionItem) {
    this._announcer.announce(`${item.label} inserted.`);
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
    this._openAnnounced = false;
    this._announcer.announce("Suggestions closed.");
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

    // Always render the live regions so the last announcement is not lost
    // when the list empties (e.g. "No suggestions." or "Suggestions closed.").
    const liveRegions = html`
      <div
        class="${blockClass}__sr-region-1"
        aria-live="polite"
        aria-atomic="false"
        style="position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"
      ></div>
      <div
        class="${blockClass}__sr-region-2"
        aria-live="polite"
        aria-atomic="false"
        style="position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"
      ></div>
    `;

    if (totalItems === 0) {
      return liveRegions;
    }

    let currentIndex = 0;

    return html`
      ${liveRegions}
      <div class="${blockClass}">
        ${this.headerConfig?.showHeader
          ? html`
              <div class="${blockClass}__header">
                <span class="${blockClass}__title">
                  ${this.headerConfig.title}
                </span>
              </div>
            `
          : ""}

        <ul
          class="${blockClass}__items"
          role="listbox"
          aria-label="Autocomplete options"
          id="${blockClass}-listbox"
        >
          <!-- Render flat items first -->
          ${this.items.map((item, idx) => {
            const itemIndex = currentIndex++;
            const isFirstItem = !this.headerConfig?.showHeader && idx === 0;
            const isLastItem =
              this.groups.length === 0 && idx === this.items.length - 1;
            return html`
              <cds-aichat-autocomplete-item
                .isActive="${itemIndex === this._focusedIndex}"
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
                .focusedIndex="${this._focusedIndex}"
                .inputText="${this.inputText}"
                .isRTL="${this.isRTL}"
                .enableSendButton="${this.enableSendButton}"
                ?last-group="${isLastGroup}"
                @cds-aichat-autocomplete-item-click="${this
                  ._handleGroupItemClick}"
                @cds-aichat-autocomplete-item-send="${this._handleSendClick}"
              ></cds-aichat-autocomplete-item-group>
            `;
          })}
        </ul>
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
