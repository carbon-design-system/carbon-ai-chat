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
 * One option in render order. `index` is its flat keyboard index;
 * `groupIndex` is its position in `groups`, or `undefined` when ungrouped.
 */
interface FlatEntry {
  item: SuggestionItem;
  index: number;
  groupIndex: number | undefined;
  groupTitle: string | undefined;
}

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
   * Receives the item label, optional description, optional group label, and position info.
   *
   * @example (label, description, groupLabel, position) => `${label}${description ? `, ${description}` : ""}${groupLabel ? `, ${groupLabel}` : ""}, ${position}`
   */
  itemNavigation: (
    label: string,
    description: string | undefined,
    groupLabel: string | undefined,
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
  /**
   * Accessible label for the implicit group that wraps flat (non-grouped) items
   * when the listbox element also contains grouped items.
   */
  nonGroupedItemsLabel: string;
}

/** Default English strings — used as the fallback value for `i18n`. */
export const defaultAutocompleteI18n: AutocompleteI18n = {
  noSuggestions: 'No suggestions.',
  suggestionsAvailable: (count) =>
    `${count} suggestion${count === 1 ? '' : 's'}. Use up and down arrows to move, Enter to pick, Escape to close.`,
  itemNavigation: (label, description, groupLabel, position) =>
    `${label}${description ? `, ${description}` : ''}${groupLabel ? `, ${groupLabel}` : ''}, ${position}`,
  itemInserted: (label) => `${label} inserted.`,
  itemSent: (label) => `${label} sent.`,
  suggestionsClosed: 'Suggestions closed.',
  listboxLabel: 'Autocomplete options',
  nonGroupedItemsLabel: 'Non-grouped options',
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

export interface AutocompleteNavigatedEventDetail {
  navigated: boolean;
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
  private _focusedIndex = -1;

  private _userHasNavigated = false;

  private _setUserHasNavigated(value: boolean): void {
    if (this._userHasNavigated === value) {
      return;
    }
    this._userHasNavigated = value;
    this.dispatchEvent(
      new CustomEvent<AutocompleteNavigatedEventDetail>(
        'cds-aichat-autocomplete-navigated',
        { detail: { navigated: value }, bubbles: true, composed: true }
      )
    );
  }

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

  public hasNavigated(): boolean {
    return this._userHasNavigated;
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
      const flatList = this._buildFlatList();
      const totalItems = flatList.length;
      if (totalItems === 0) {
        this._announcer.announce(this.i18n.noSuggestions);
        this._openAnnounced = false;
        return;
      }
      this._focusedIndex = -1;
      this._setUserHasNavigated(false);
      if (!this._openAnnounced) {
        this._openAnnounced = true;
        this._announcer.announce(this.i18n.suggestionsAvailable(totalItems));
      }
    }
  }

  /**
   * Build a flat list of all items in render order: ungrouped items first,
   * then each group's items in group order. Single source of truth for the
   * index ↔ item mapping used by `updated()`, `render()`, `_handleKeydown()`,
   * `_handleItemMouseEnter()`, and `_handleItemClick()`.
   */
  private _buildFlatList(): FlatEntry[] {
    const result: FlatEntry[] = [];
    const hasGroups = this.groups.length > 0;
    for (const item of this.items) {
      result.push({
        item,
        index: result.length,
        groupIndex: undefined,
        groupTitle: hasGroups ? this.i18n.nonGroupedItemsLabel : undefined,
      });
    }
    this.groups.forEach((group, groupIndex) => {
      for (const item of group.items) {
        result.push({
          item,
          index: result.length,
          groupIndex,
          groupTitle: group.title,
        });
      }
    });
    return result;
  }

  /**
   * Move focus to the next enabled item in the given direction (+1 / -1),
   * skipping over any disabled items. Mirrors the Carbon Dropdown `_navigate`
   * pattern. Returns the resolved index, or `from` if no enabled item exists
   * in that direction.
   */
  private _navigateTo(
    list: FlatEntry[],
    from: number,
    direction: 1 | -1
  ): number {
    // When no item is selected yet (-1), ArrowUp wraps to the last item.
    const start = from === -1 && direction === -1 ? list.length : from;
    let next = start + direction;
    while (next >= 0 && next < list.length) {
      if (!list[next].item.disabled) {
        return next;
      }
      next += direction;
    }
    // No enabled item found in that direction — stay put (keep -1 if unnavigated).
    return from;
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    const list = this._buildFlatList();
    const totalItems = list.length;
    if (totalItems === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._focusedIndex = this._navigateTo(list, this._focusedIndex, 1);
        this._setUserHasNavigated(true);
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this._focusedIndex = this._navigateTo(list, this._focusedIndex, -1);
        this._setUserHasNavigated(true);
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case 'Home':
      case 'End': {
        event.preventDefault();
        // Scanning from -1 lands on the first enabled item going down and
        // wraps to the last enabled item going up. Stay put if none exists.
        const target = this._navigateTo(
          list,
          -1,
          event.key === 'Home' ? 1 : -1
        );
        if (target !== -1) {
          this._focusedIndex = target;
        }
        this._setUserHasNavigated(true);
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;
      }

      case 'Tab':
        event.preventDefault();
        this._focusedIndex = this._navigateTo(list, this._focusedIndex, 1);
        this._setUserHasNavigated(true);
        this._scheduleMoveAnnouncement(this._focusedIndex, totalItems);
        this._scrollActiveItemIntoView();
        break;

      case 'Escape':
        event.preventDefault();
        this._dismiss();
        break;

      case 'Enter':
        if (!this._userHasNavigated) {
          return;
        }
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
      const entry = this._buildFlatList()[index];
      if (!entry) {
        return;
      }
      const position = `${index + 1} of ${total}`;
      this._announcer.announce(
        this.i18n.itemNavigation(
          entry.item.label,
          entry.item.description,
          entry.groupTitle,
          position
        )
      );
    }, 50);
  }

  private _handleSend(index: number, item: SuggestionItem) {
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

  private _handleItemMouseEnter(index: number): void {
    if (this._buildFlatList()[index]?.item.disabled) {
      return;
    }
    this._focusedIndex = index;
  }

  private _handleClickOutside = (event: MouseEvent) => {
    // Use composedPath() instead of event.target so clicks originating inside
    // a shadow root are visible.
    const path = event.composedPath();

    if (path.includes(this)) {
      return;
    }
    if (this.anchorElement && path.includes(this.anchorElement)) {
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
    this._setUserHasNavigated(false);
    this._announcer.announce(this.i18n.suggestionsClosed);
    this.dispatchEvent(
      new CustomEvent('cds-aichat-autocomplete-dismiss', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleItemClick(index: number) {
    const item = this._buildFlatList()[index]?.item;
    if (!item || item.disabled) {
      return;
    }

    if (!this.disableDirectSend) {
      this._handleSend(index, item);
      return;
    }
    this._focusedIndex = index;
    this._selectItem(item);
  }

  private _getActiveOptionId(list: FlatEntry[]): string | undefined {
    if (!this._userHasNavigated) {
      return undefined;
    }
    const entry = list[this._focusedIndex];
    return entry ? `${entry.item.id}--option` : undefined;
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
    const isActive = this._userHasNavigated && index === this._focusedIndex;
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
        @mouseenter="${() => this._handleItemMouseEnter(index)}"
        aria-selected="false"
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
    const flatList = this._buildFlatList();

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

    if (flatList.length === 0) {
      return liveRegions;
    }

    const hasGroups = this.groups.length > 0;
    const activeOptionId = this._getActiveOptionId(flatList);
    const ungrouped = flatList.filter(
      (entry) => entry.groupIndex === undefined
    );

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
        ${
          hasGroups
            ? html`
                <div
                  aria-activedescendant="${activeOptionId}"
                  aria-label="${this.i18n.listboxLabel}"
                  class="${blockClass}__items"
                  id="${blockClass}-listbox"
                  role="listbox">
                  <!-- Flat items wrapped in their own implicit group -->
                  ${
                    ungrouped.length > 0
                      ? html`
                          <ul
                            role="group"
                            aria-label="${this.i18n.nonGroupedItemsLabel}"
                            class="${groupClass}__items">
                            ${ungrouped.map(({ item, index }) =>
                              this._renderItem(item, index, {
                                firstItem:
                                  !this.headerConfig?.showHeader && index === 0,
                              })
                            )}
                          </ul>
                        `
                      : ''
                  }

                  <!-- Grouped items -->
                  ${this.groups.map((group, groupIndex) => {
                    const entries = flatList.filter(
                      (entry) => entry.groupIndex === groupIndex
                    );
                    const isLastGroup = groupIndex === this.groups.length - 1;
                    return html`
                      <ul
                        role="group"
                        aria-labelledby="group-label-${groupIndex}"
                        class="${groupClass}__items">
                        <li
                          role="presentation"
                          id="group-label-${groupIndex}"
                          class="${groupClass}__title">
                          ${group.title}
                        </li>
                        ${entries.map(({ item, index }, position) =>
                          this._renderItem(item, index, {
                            lastItem:
                              isLastGroup && position === entries.length - 1,
                          })
                        )}
                      </ul>
                    `;
                  })}
                </div>
              `
            : html`
                <!-- Flat items only -->
                <ul
                  aria-activedescendant="${activeOptionId}"
                  aria-label="${this.i18n.listboxLabel}"
                  class="${blockClass}__items"
                  id="${blockClass}-listbox"
                  role="listbox">
                  ${flatList.map(({ item, index }) =>
                    this._renderItem(item, index, {
                      firstItem: !this.headerConfig?.showHeader && index === 0,
                      lastItem: index === flatList.length - 1,
                    })
                  )}
                </ul>
              `
        }
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
