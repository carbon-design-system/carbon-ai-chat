/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
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
  items: SuggestionItem[] = [];

  @property({ type: String })
  query = "";

  @state()
  private _selectedIndex = 0;

  private _onSelect?: (item: SuggestionItem) => void;
  private _onDismiss?: () => void;

  setCallbacks(
    onSelect: (item: SuggestionItem) => void,
    onDismiss: () => void,
  ) {
    this._onSelect = onSelect;
    this._onDismiss = onDismiss;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("keydown", this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this._handleKeydown);
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("items")) {
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
        this._onSelect?.(this.items[this._selectedIndex]);
      }
    } else if (e.key === "Escape") {
      this._onDismiss?.();
    }
  };

  render() {
    if (this.items.length === 0) {
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
              ${item.description
                ? html`<span class="desc">${item.description}</span>`
                : nothing}
            </div>
          `,
        )}
      </div>
    `;
  }
}
