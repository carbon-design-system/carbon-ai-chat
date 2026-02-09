/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property, query } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { classMap } from "lit/directives/class-map.js";
import prefix from "../../../globals/settings.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import FocusMixin from "@carbon/web-components/es/globals/mixins/focus.js";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import Checkmark16 from "@carbon/icons/es/checkmark/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import "@carbon/web-components/es/components/overflow-menu/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";

import styles from "./chat-history.scss?lit";

export interface Action {
  text: string;
  delete?: boolean;
  divider?: boolean;
  icon: CarbonIcon;
  onClick: () => void;
}

/**
 * Chat History panel item.
 *
 * @element cds-aichat-history-panel-item
 *
 */
@carbonElement(`${prefix}-history-panel-item`)
export class CDSHistoryPanelItem extends FocusMixin(LitElement) {
  /**
   * `true` if the history panel item is selected.
   */
  @property({ type: Boolean, reflect: true })
  selected = false;

  /**
   * Chat history item title.
   */
  @property()
  title!: string;

  /**
   * `true` if the history panel item is in rename mode.
   *  rename mode switches the history panel item into an input component.
   */
  @property({ type: Boolean, reflect: true })
  rename = false;
  /**
   * Actions for each panel item.
   */
  @property({ type: Array })
  actions: Action[] = [];

  /**
   * Overflow tooltip label
   */
  @property({ type: String, attribute: "overflow-menu-label" })
  overflowMenuLabel = "Options";

  @query("input") input!: HTMLInputElement;

  /**
   * Handle menu item clicks
   */
  private _handleMenuItemClick = (event: Event) => {
    const target = event.currentTarget as HTMLElement;
    const menuItemText =
      target.getAttribute("data-action-text") || target.textContent?.trim();

    // Dispatch a custom event with item details
    const itemActionEvent = new CustomEvent("history-item-action", {
      bubbles: true,
      composed: true,
      detail: {
        action: menuItemText,
        itemId: this.getAttribute("data-item-id"),
        itemTitle: this.title,
        element: this,
      },
    });
    this.dispatchEvent(itemActionEvent);
  };

  updated() {
    if (this.input) {
      this.input.addEventListener("focus", () => {
        this.input.select();
      });

      // Auto-select on mount if desired
      requestAnimationFrame(() => {
        this.input.focus();
        this.input.select();
      });
    }
  }

  render() {
    const { selected, title, actions, rename } = this;
    const classes = classMap({
      [`cds--side-nav__link`]: true,
      [`cds--side-nav__link--current`]: selected,
      [`${prefix}--history-panel-item--rename`]: rename,
    });
    return html`
      ${!rename
        ? html` <button class="${classes}">
            <span part="title" class="cds--side-nav__link-text">
              ${title}
            </span>
            <slot name="actions">
              <cds-overflow-menu autoalign size="sm">
                ${iconLoader(OverflowMenuVertical16, {
                  class: `${prefix}--overflow-menu__icon`,
                  slot: "icon",
                })}
                <span slot="tooltip-content">Options</span>
                <cds-overflow-menu-body flipped>
                  ${repeat(
                    actions,
                    (action) => action.text,
                    (action) =>
                      html`<cds-overflow-menu-item
                        ?danger=${action.delete}
                        ?divider=${action.divider}
                        @click=${this._handleMenuItemClick}
                        >${action.text}${action.icon}</cds-overflow-menu-item
                      >`,
                  )}
                </cds-overflow-menu-body>
              </cds-overflow-menu>
            </slot>
          </button>`
        : html`
      <div class="${classes}">
        <div class="${prefix}--history-panel-item--rename__input">
          <input type="text" value="${title}"></input>
          <div class="${prefix}--history-panel-item--rename__actions">
            <cds-icon-button size='sm' kind="ghost">
              ${iconLoader(Close16, {
                slot: "icon",
              })}
              <span slot="tooltip-content">Cancel</span>
            </cds-icon-button>
            <cds-icon-button size='sm' kind="ghost">
              ${iconLoader(Checkmark16, {
                slot: "icon",
              })}
              <span slot="tooltip-content">Save</span>
            </cds-icon-button>
          </div>
        </div>
      </div>`}
    `;
  }

  static styles = styles;
}

export default CDSHistoryPanelItem;
