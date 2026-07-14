/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Custom Lit element that replaces Carbon AI Chat's built-in typeahead
 * dropdown.
 *
 * Demonstrates: how `PublicConfig.input.suggestions[].renderCustomList`
 * lets an integrator own the dropdown DOM, styling, and keyboard model
 * while still delegating selection and dismissal back to the chat.
 *
 * APIs exercised:
 *   - `SuggestionItem`
 *   - `renderCustomList` callback contract (`onSelect`, `onDismiss`)
 *
 * Start reading at: the `setCallbacks` and `render` methods on
 * `CustomSuggestionList` below.
 */

import { type SuggestionItem } from "@carbon/ai-chat";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

@customElement("custom-suggestion-list")
export class CustomSuggestionList extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .list {
      background: #fff;
      border: 2px solid #8a3ffc;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      max-height: 280px;
      overflow-y: auto;
      padding: 4px 0;
    }

    .header {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #8a3ffc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e8daff;
    }

    .item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 16px;
      cursor: pointer;
      transition: background-color 0.1s;
    }

    .item:hover,
    .item--selected {
      background-color: #f4edff;
    }

    .label {
      font-size: 14px;
      font-weight: 500;
      color: #161616;
    }

    .desc {
      font-size: 12px;
      color: #6f6f6f;
    }
  `;

  @property({ type: Array })
  accessor items: SuggestionItem[] = [];

  @property({ type: String })
  accessor query = "";

  @state()
  private accessor _selectedIndex = 0;

  private _onSelect?: (item: SuggestionItem) => void;
  private _onDismiss?: () => void;

  // Callbacks arrive imperatively after the element is created in `renderCustomList` because Lit
  // attribute reflection cannot carry function references through the DOM.
  setCallbacks(
    onSelect: (item: SuggestionItem) => void,
    onDismiss: () => void,
  ) {
    this._onSelect = onSelect;
    this._onDismiss = onDismiss;
  }

  connectedCallback() {
    super.connectedCallback();
    // Listen on `document` so arrow-key navigation works while focus stays in the chat input.
    document.addEventListener("keydown", this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this._handleKeydown);
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("items")) {
      // Reset highlight to the first row whenever the result set changes so a stale index never
      // points past the new array's length.
      this._selectedIndex = 0;
    }
  }

  private _handleKeydown = (e: KeyboardEvent) => {
    if (this.items.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this._selectedIndex = Math.min(
        this._selectedIndex + 1,
        this.items.length - 1,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this.items[this._selectedIndex]) {
        // Dispatch through the chat-provided callback so selection flows through the framework's
        // input-population and analytics pipeline rather than firing a local-only event.
        this._onSelect?.(this.items[this._selectedIndex]);
      }
    } else if (e.key === "Escape") {
      // Escape forwards to `onDismiss` so the chat tears the dropdown down through its normal path.
      this._onDismiss?.();
    }
  };

  render() {
    if (this.items.length === 0) {
      // Returning `nothing` collapses the host so the chat can hide the dropdown frame entirely
      // when the resolver yields no matches.
      return nothing;
    }

    return html`
      <div class="list" role="listbox">
        <div class="header">Suggestions for &ldquo;${this.query}&rdquo;</div>
        ${this.items.map(
          (item, i) => html`
            <div
              class=${classMap({
                item: true,
                "item--selected": i === this._selectedIndex,
              })}
              role="option"
              aria-selected="${i === this._selectedIndex}"
              @click=${() => this._onSelect?.(item)}
              @mouseenter=${() => {
                this._selectedIndex = i;
              }}
            >
              <span class="label">${item.label}</span>
              ${
                item.description
                  ? html`<span class="desc">${item.description}</span>`
                  : nothing
              }
            </div>
          `,
        )}
      </div>
    `;
  }
}
