/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {
  SuggestionItem,
  CustomListProps,
  TriggerChangeEventDetail,
  AutocompleteListCallbacks,
} from "./types.js";
import type AutocompleteElement from "../../autocomplete/src/autocomplete.js";

/**
 * Manages the lifecycle of the autocomplete list element in the light DOM.
 * Handles creation/removal of the built-in autocomplete or custom list.
 */
export class AutocompleteListManager {
  private _customListElement: HTMLElement | null = null;
  private _callbacks: AutocompleteListCallbacks;

  constructor(callbacks: AutocompleteListCallbacks) {
    this._callbacks = callbacks;
  }

  /**
   * Update the autocomplete list based on current trigger state and items.
   * Creates/removes elements as needed.
   */
  update(
    host: HTMLElement,
    triggerState: TriggerChangeEventDetail | null,
    autocompleteItems: SuggestionItem[],
    renderCustomList?: (props: CustomListProps) => HTMLElement | unknown,
  ) {
    // Remove existing custom list
    if (this._customListElement) {
      this._customListElement.remove();
      this._customListElement = null;
    }

    if (!autocompleteItems || autocompleteItems.length === 0 || !triggerState) {
      return;
    }

    // If a custom renderer is provided, use it; otherwise render the built-in list.
    if (renderCustomList) {
      try {
        const props: CustomListProps = {
          items: autocompleteItems,
          query: triggerState.query,
          onSelect: (item) => this._callbacks.onAutocompleteSelect(item),
          onDismiss: () => this._callbacks.onAutocompleteDismiss(),
        };

        const result = renderCustomList(props);

        if (result instanceof HTMLElement) {
          this._customListElement = result;
          this._customListElement.slot = "autocomplete-content";
          host.appendChild(this._customListElement);
        } else {
          // If ReactNode, emit event for React adapter to handle
          this._callbacks.onCustomListRender({ reactNode: result });
        }
      } catch (error) {
        // Fall back to the built-in list so typeahead remains usable when a
        // consumer's custom renderer throws.
        console.error("Error in renderCustomList:", error);
        this._renderBuiltInList(host, autocompleteItems);
      }
    } else {
      this._renderBuiltInList(host, autocompleteItems);
    }
  }

  private _renderBuiltInList(host: HTMLElement, items: SuggestionItem[]) {
    const autocomplete = document.createElement(
      "cds-aichat-autocomplete",
    ) as AutocompleteElement;
    autocomplete.items = items;
    autocomplete.slot = "autocomplete-content";
    this._customListElement = autocomplete;
    host.appendChild(autocomplete);
  }

  /** Clean up any managed elements. */
  disconnect() {
    if (this._customListElement) {
      this._customListElement.remove();
      this._customListElement = null;
    }
  }
}
