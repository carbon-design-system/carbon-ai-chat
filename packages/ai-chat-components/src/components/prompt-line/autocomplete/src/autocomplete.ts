/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';

import { carbonElement } from '../../../../globals/decorators/carbon-element.js';
import prefix from '../../../../globals/settings.js';
import { AriaAnnouncerManager } from '../../../../globals/utils/aria-announcer-manager.js';

import styles from './autocomplete.scss?lit';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import SendFilled16 from '@carbon/icons/es/send--filled/16.js';

import type {
  SuggestionItem,
  SuggestionItemGroup,
} from '../../src/tiptap/types.js';
import { classMap } from 'lit/directives/class-map.js';

const blockClass = `${prefix}-autocomplete`;
const itemClass = `${blockClass}-item`;
const groupClass = `${itemClass}-group`;

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
 * Localized / consumer-supplied strings for the autocomplete component.
 * All fields are required so callers explicitly provide every user-visible string.
 */
export interface AutocompleteI18n {
  /** Announced when the suggestions list is empty. */
  noSuggestions: string;
  /**
   * Announced when the suggestions list first opens.
   * Receives the item count so the caller can form the full phrase.
   *
   * @example (count) => `${count} suggestion${count === 1 ? "" : "s"}. Use up and down arrows to move, Enter to pick, Escape to close.`
   */
  suggestionsAvailable: (count: number) => string;
  /**
   * Announced when the user moves focus to an item via arrow keys.
   * Receives the item label, optional description, and position info.
   *
   * @example (label, description, position) => `${label}${description ? `, ${description}` : ""}, ${position}`
   */
  itemNavigation: (
    label: string,
    description: string | undefined,
    position: string
  ) => string;
  /**
   * Announced when an item is selected/inserted.
   * Receives the item label.
   *
   * @example (label) => `${label} inserted.`
   */
  itemInserted: (label: string) => string;
  /**
   * Announced when an item is sent to the chat.
   * Receives the item label.
   *
   * @example (label) => `${label} sent.`
   */
  itemSent: (label: string) => string;
  /** Announced when the suggestions list is closed/dismissed. */
  suggestionsClosed: string;
  /** Accessible label for the listbox element. */
  listboxLabel: string;
}

/** Default English strings — used as the fallback value for `i18n`. */
export const defaultAutocompleteI18n: AutocompleteI18n = {
  noSuggestions: 'No suggestions.',
  suggestionsAvailable: (count) =>
    `${count} suggestion${count === 1 ? '' : 's'}. Use up and down arrows to move, Enter to pick, Escape to close.`,
  itemNavigation: (label, description, position) =>
    `${label}${description ? `, ${description}` : ''}, ${position}`,
  itemInserted: (label) => `${label} inserted.`,
  itemSent: (label) => `${label} sent.`,
  suggestionsClosed: 'Suggestions closed.',
  listboxLabel: 'Autocomplete options',
};

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
 * @fires {CustomEvent<AutocompleteSelectEventDetail>} cds-aichat-autocomplete-select - Fired when an item is clicked/activated and `disableDirectSend` is true (insert-into-editor path)
 * @fires {CustomEvent<AutocompleteSendEventDetail>} cds-aichat-autocomplete-send - Fired when an item is clicked/activated and `disableDirectSend` is false (default: sends directly to chat)
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
   * Localized strings for announcements and labels.
   * Defaults to English via `defaultAutocompleteI18n`.
   */
  @property({ type: Object, attribute: false })
  i18n: AutocompleteI18n = defaultAutocompleteI18n;

  /**
   * The current text in the input (used to apply styling to indicate what user has already typed)
   */
  @property({ type: String, attribute: 'input-text', reflect: true })
  inputText = '';

  /**
   * When `false` (default), clicking an item fires `cds-aichat-autocomplete-send` and
   * the item sends directly to chat.
   *
   * When `true`, clicking an item fires `cds-aichat-autocomplete-select` instead
   * and inserts it into the editor rather than send immediately.
   */
  @property({ type: Boolean, reflect: true, attribute: 'disable-direct-send' })
  disableDirectSend = false;

  /**
   * Whether the autocomplete is attached to another element (e.g., an input field).
   * When true, the bottom corners will not be rounded.
   */
  @property({ type: Boolean, reflect: true })
  attached = true;

  /**
   * Optional element that "owns" this list (e.g. the editor). Clicks on the
   * anchor element are treated as inside-clicks and do not dismiss the list.
   */
  @property({ type: Object, attribute: false })
  anchorElement: Element | null = null;

  /**
   * Currently active item index
   * @internal
   */
  @state()
  private _focusedIndex = 0;

  private _announcer = new AriaAnnouncerManager();
  private _listboxEl: HTMLElement | null = null;

  /**
   * Pending arrow-move announcement timer. Held-key rapid fires are collapsed:
   * only the last pending label is spoken.
   */
  private _moveAnnouncePending: number | null = null;

  /** Whether the open announcement has already fired for this show. */
  private _openAnnounced = false;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this._handleKeydown);
    document.addEventListener('click', this._handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
    this._listboxEl?.removeEventListener('mousedown', this._handleMousedown);
    document.removeEventListener('click', this._handleClickOutside);
    this._announcer.disconnect();
    if (this._moveAnnouncePending !== null) {
      clearTimeout(this._moveAnnouncePending);
      this._moveAnnouncePending = null;
    }
  }

  firstUpdated() {
    const regions = this.renderRoot.querySelectorAll<HTMLDivElement>(
      `.${blockClass}__live-region`
    );
    this._announcer.connect(Array.from(regions));
    this._listboxEl = this.renderRoot.querySelector<HTMLElement>(
      `.${blockClass}__items`
    );
    this._listboxEl?.addEventListener('mousedown', this._handleMousedown);
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    const itemsChanged =
      changedProperties.has('items') || changedProperties.has('groups');

    if (itemsChanged) {
      const totalItems = this._getTotalItemCount();
      if (totalItems === 0) {
        this._announcer.announce(this.i18n.noSuggestions);
        this._openAnnounced = false;
        return;
      }
      // Reset to first enabled item and announce list opened (once per show).
      let firstEnabled = 0;
      while (
        firstEnabled < totalItems &&
        this._getItemAtIndex(firstEnabled)?.disabled
      ) {
        firstEnabled++;
      }
      this._focusedIndex = firstEnabled < totalItems ? firstEnabled : 0;
      if (!this._openAnnounced) {
        this._openAnnounced = true;
        this._announcer.announce(this.i18n.suggestionsAvailable(totalItems));
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
      0
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

  /**
   * Move focus to the next enabled item in the given direction (+1 / -1),
   * skipping over any disabled items. Mirrors the Carbon Dropdown `_navigate`
   * pattern. Returns the resolved index, or the current index if no enabled
   * item exists in that direction.
   */
  private _navigateTo(from: number, direction: 1 | -1): number {
    const totalItems = this._getTotalItemCount();
    let next = from + direction;
    while (next >= 0 && next < totalItems) {
      if (!this._getItemAtIndex(next)?.disabled) {
        return next;
      }
      next += direction;
    }
    // No enabled item found in that direction — stay put.
    return from;
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    const totalItems = this._getTotalItemCount();
    if (totalItems === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._focusedIndex = this._navigateTo(this._focusedIndex, 1);
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this._focusedIndex = this._navigateTo(this._focusedIndex, -1);
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case 'Home': {
        event.preventDefault();
        // Find first enabled item from the top.
        let first = 0;
        while (first < totalItems && this._getItemAtIndex(first)?.disabled) {
          first++;
        }
        this._focusedIndex = first < totalItems ? first : this._focusedIndex;
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;
      }

      case 'End': {
        event.preventDefault();
        // Find last enabled item from the bottom.
        let last = totalItems - 1;
        while (last >= 0 && this._getItemAtIndex(last)?.disabled) {
          last--;
        }
        this._focusedIndex = last >= 0 ? last : this._focusedIndex;
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;
      }

      case 'Escape':
        event.preventDefault();
        this._dismiss();
        break;

      case 'Enter':
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
      this._announcer.announce(
        this.i18n.itemNavigation(item.label, item.description, position)
      );
    }, 50);
  }

  private _handleSend(index: number) {
    const item = this._getItemAtIndex(index);
    if (!item) {
      return;
    }
    this._focusedIndex = index;
    this._announcer.announce(this.i18n.itemSent(item.label));
    this.dispatchEvent(
      new CustomEvent<AutocompleteSendEventDetail>(
        'cds-aichat-autocomplete-send',
        {
          detail: { text: item.value ?? item.label },
          bubbles: true,
          composed: true,
        }
      )
    );
  }

  private _handleMousedown = (event: MouseEvent) => {
    // Prevent the editor from losing focus when the user clicks one of the list
    // items. Without this, mousedown transfers focus away from the editor,
    // carbonStarterTrigger.onTransaction fires, sees editor.isFocused === false,
    // and dismisses the list before the click event can trigger onSelect.
    event.preventDefault();
  };

  private _handleClickOutside = (event: MouseEvent) => {
    // Use composedPath() instead of event.target so clicks originating inside
    // a shadow root are visible.
    const path = event.composedPath();
    const isNode = (t: EventTarget): t is Node => t instanceof Node;
    // Check if click is on autocomplete itself
    if (path.filter(isNode).some((n) => this.contains(n))) {
      return;
    }
    // Check if click is on anchor element
    const { anchorElement } = this;
    if (
      anchorElement &&
      path.filter(isNode).some((n) => anchorElement.contains(n))
    ) {
      return;
    }
    this._dismiss();
  };

  private _scrollActiveItemIntoView(): void {
    this.updateComplete.then(() => {
      const itemsContainer = this.shadowRoot?.querySelector(
        `.${blockClass}__items`
      );
      const options = Array.from(
        itemsContainer?.querySelectorAll('li[role="option"]') ?? []
      );
      (options[this._focusedIndex] as HTMLElement | undefined)?.scrollIntoView({
        block: 'nearest',
      });
    });
  }

  private _selectItem(item: SuggestionItem) {
    if (item.disabled) {
      return;
    }
    this._announcer.announce(this.i18n.itemInserted(item.label));
    this.dispatchEvent(
      new CustomEvent<AutocompleteSelectEventDetail>(
        'cds-aichat-autocomplete-select',
        {
          detail: { item },
          bubbles: true,
          composed: true,
        }
      )
    );
  }

  private _dismiss() {
    this._openAnnounced = false;
    this._announcer.announce(this.i18n.suggestionsClosed);
    this.dispatchEvent(
      new CustomEvent('cds-aichat-autocomplete-dismiss', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleItemClick(index: number) {
    const item = this._getItemAtIndex(index);
    if (!item || item.disabled) {
      return;
    }

    if (!this.disableDirectSend) {
      this._handleSend(index);
      return;
    }
    this._focusedIndex = index;
    this._selectItem(item);
  }

  private _getActiveOptionId(): string | undefined {
    const item = this._getItemAtIndex(this._focusedIndex);
    return item ? `${item.id}--option` : undefined;
  }

  private _getLabelParts(item: SuggestionItem): {
    typed: string;
    remainder: string;
  } {
    const label = item.label;
    const input = this.inputText.toLowerCase();

    if (input && label.toLowerCase().startsWith(input)) {
      return {
        typed: label.substring(0, input.length),
        remainder: label.substring(input.length),
      };
    }

    return { typed: '', remainder: label };
  }

  /**
   * Render the avatar if provided
   */
  private _renderAvatar(item: SuggestionItem) {
    const { avatar } = item;
    if (!avatar) {
      return null;
    }
    if (typeof avatar === 'string') {
      return html`<div class="${itemClass}__avatar">
        <img src="${avatar}" alt="" />
      </div>`;
    }
    // CarbonIcon descriptor (object, not a function)
    if (typeof avatar !== 'function') {
      return html`<div class="${itemClass}__avatar">
        ${iconLoader(avatar)}
      </div>`;
    }
    return null;
  }

  /**
   * Render a single `<li role="option">` for both flat and grouped contexts.
   */
  private _renderItem(
    item: SuggestionItem,
    index: number,
    opts: { firstItem?: boolean; lastItem?: boolean } = {}
  ) {
    const { typed, remainder } = this._getLabelParts(item);
    const isActive = index === this._focusedIndex;
    const isDisabled = !!item.disabled;
    const id = `${item.id}--option`;

    return html`
      <li
        @click="${() => this._handleItemClick(index)}"
        @keydown="${(e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this._handleItemClick(index);
          }
        }}"
        aria-selected="${isActive ? 'true' : 'false'}"
        aria-disabled="${isDisabled ? 'true' : 'false'}"
        class=${classMap({
          [itemClass]: true,
          [`${itemClass}--active`]: isActive,
          [`${itemClass}--disabled`]: isDisabled,
        })}
        id="${id}"
        role="option"
        tabindex="-1"
        ?first-item="${opts.firstItem}"
        ?last-item="${opts.lastItem}">
        <div class="${itemClass}__content">
          ${this._renderAvatar(item)}
          <div class="${itemClass}__text">
            <div class="${itemClass}__label">
              ${
                typed
                  ? html`<span class="${itemClass}__label-typed"
                      >${typed}</span
                    >`
                  : ''
              }${
                remainder
                  ? html`<span class="${itemClass}__label-remainder"
                      >${remainder}</span
                    >`
                  : ''
              }
            </div>
            ${
              item.description
                ? html`<div class="${itemClass}__description">
                    ${item.description}
                  </div>`
                : null
            }
          </div>
        </div>
        ${
          !this.disableDirectSend
            ? html`<span aria-hidden="true" class="${itemClass}__send-icon">
                ${iconLoader(SendFilled16)}
              </span>`
            : null
        }
      </li>
    `;
  }

  render() {
    const totalItems = this._getTotalItemCount();

    // Always render the live regions so the last announcement is not lost
    // when the list empties (e.g. "No suggestions." or "Suggestions closed.").
    const liveRegions = html`
      <div
        class="${blockClass}__live-region"
        aria-live="polite"
        aria-atomic="false"></div>
      <div
        class="${blockClass}__live-region"
        aria-live="polite"
        aria-atomic="false"></div>
    `;

    if (totalItems === 0) {
      return liveRegions;
    }

    let currentIndex = 0;

    return html`
      ${liveRegions}
      <div class="${blockClass}">
        ${
          this.headerConfig?.showHeader
            ? html`
                <div class="${blockClass}__header">
                  <span class="${blockClass}__title">
                    ${this.headerConfig.title}
                  </span>
                </div>
              `
            : ''
        }

        <ul
          aria-activedescendant="${this._getActiveOptionId()}"
          aria-label="${this.i18n.listboxLabel}"
          class="${blockClass}__items"
          id="${blockClass}-listbox"
          role="listbox">
          <!-- Flat items -->
          ${this.items.map((item, index) => {
            const itemIndex = currentIndex++;
            return this._renderItem(item, itemIndex, {
              firstItem: !this.headerConfig?.showHeader && index === 0,
              lastItem:
                this.groups.length === 0 && index === this.items.length - 1,
            });
          })}

          <!-- Grouped items -->
          ${this.groups.map((group, groupIndex) => {
            const groupStartIndex = currentIndex;
            currentIndex += group.items.length;
            const isLastGroup = groupIndex === this.groups.length - 1;
            return html`
              <li
                role="group"
                aria-label="${group.title}"
                class="${groupClass}">
                ${
                  group.title
                    ? html`<div class="${groupClass}__title">
                        ${group.title}
                      </div>`
                    : null
                }
                <ul class="${groupClass}__items">
                  ${group.items.map((item, itemIndex) =>
                    this._renderItem(item, groupStartIndex + itemIndex, {
                      lastItem:
                        isLastGroup && itemIndex === group.items.length - 1,
                    })
                  )}
                </ul>
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-autocomplete': AutocompleteElement;
  }
}

export default AutocompleteElement;
export type {
  SuggestionItem,
  SuggestionItemGroup,
} from '../../src/tiptap/types.js';
