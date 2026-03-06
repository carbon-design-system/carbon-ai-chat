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
import "./history-panel-item-input.js";
import FocusMixin from "@carbon/web-components/es/globals/mixins/focus.js";
import HostListener from "@carbon/web-components/es/globals/decorators/host-listener.js";
import HostListenerMixin from "@carbon/web-components/es/globals/mixins/host-listener.js";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
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
class CDSAIChatHistoryPanelItem extends HostListenerMixin(
  FocusMixin(LitElement),
) {
  /**
   * `true` if the history panel item is selected.
   */
  @property({ type: Boolean, reflect: true })
  selected = false;

  /**
   * id of chat history item element
   */
  @property({ type: String })
  id;
  /**
   * Chat history item title.
   */
  @property({ reflect: true })
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

  @query(`${prefix}-history-panel-item-input`) input!: HTMLElement;

  /**
   * Handle menu item clicks
   */
  private _handleMenuItemClick = (event: Event) => {
    const target = event.currentTarget as HTMLElement;
    const menuItemText =
      target.getAttribute("data-action-text") || target.textContent?.trim();

    // Dispatch a custom event with item details
    const itemActionEvent = new CustomEvent("history-item-menu-action", {
      bubbles: true,
      composed: true,
      detail: {
        action: menuItemText,
        itemId: this.id,
        itemTitle: this.title,
        element: this,
      },
    });
    this.dispatchEvent(itemActionEvent);
  };

  /**
   * Handler for menu item keydown event
   *
   * * @param event The event.
   */
  private _handleMenuItemKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      this._handleMenuItemClick(event);
    }
  };

  @HostListener("click")
  // @ts-ignore: The decorator refers to this method but TS thinks this method is not referred to
  private _handleClick(event: Event) {
    const composedPath = event.composedPath();

    // Check if the click originated from an interactive element (overflow menu, etc.)
    // by checking the composed path for any overflow menu elements
    const isOverflowMenuClick = composedPath.some((element) => {
      if (element instanceof HTMLElement) {
        const tagName = element.tagName?.toLowerCase();
        return (
          tagName?.includes("overflow-menu") ||
          tagName === "cds-overflow-menu" ||
          tagName === "cds-overflow-menu-body" ||
          tagName === "cds-overflow-menu-item"
        );
      }
      return false;
    });

    if (isOverflowMenuClick) {
      return;
    }

    // Dispatch a custom event with item details
    const itemActionEvent = new CustomEvent("history-item-selected", {
      bubbles: true,
      composed: true,
      detail: {
        itemId: this.id,
        itemTitle: this.title,
        element: this,
      },
    });
    this.dispatchEvent(itemActionEvent);
  }

  @HostListener("keydown")
  // @ts-ignore: The decorator refers to this method but TS thinks this method is not referred to
  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      this._handleClick(event);
    }
  };

  updated() {
    if (this.input) {
      this.input.addEventListener(
        `${prefix}-history-panel-item-input-cancel`,
        () => {
          this.rename = false;
        },
      );

      this.input.addEventListener(
        `${prefix}-history-panel-item-input-save`,
        (event) => {
          const newTitle = (event as CustomEvent).detail.newTitle;
          this.title = newTitle;
          this.rename = false;
        },
      );
    }
  }

  render() {
    const {
      id,
      selected,
      title,
      actions,
      rename,
      _handleMenuItemClick: handleMenuItemClick,
      _handleMenuItemKeyDown: handleMenuItemKeyDown,
    } = this;
    const classes = classMap({
      [`cds--side-nav__link`]: true,
      [`cds--side-nav__link--current`]: selected,
    });
    return html`
      ${!rename
        ? html` <button class="${classes}">
            <span part="title" class="cds--side-nav__link-text">
              ${title}
            </span>
            <slot name="actions">
              <cds-overflow-menu align="top-right" size="sm">
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
                        @click=${handleMenuItemClick}
                        @keydown=${handleMenuItemKeyDown}
                        >${action.text}${action.icon}</cds-overflow-menu-item
                      >`,
                  )}
                </cds-overflow-menu-body>
              </cds-overflow-menu>
            </slot>
          </button>`
        : html`
            <cds-aichat-history-panel-item-input
              value="${title}"
              item-id="${id}"
            ></cds-aichat-history-panel-item-input>
          `}
    `;
  }

  static styles = styles;
}

export { CDSAIChatHistoryPanelItem };
export default CDSAIChatHistoryPanelItem;
