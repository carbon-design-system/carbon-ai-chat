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
   * Chat history item name.
   */
  @property({ reflect: true })
  name!: string;

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

  @query("cds-overflow-menu") overflowMenu!: HTMLElement;
  @query("cds-overflow-menu-body") overflowMenuBody!: HTMLElement;

  /**
   *
   * The current cds-overflow-menu doesn't support opening the menu body in different
   * directions (top / bottom). This method detects if there's enough space below
   * the menu trigger to show the menu body, and if not, it flips the menu to open upward
   * by setting the `transform` style on the menu body; This is a workaround until the
   * Carbon core team adds support for this.
   *
   */
  private _adjustMenuPosition() {
    if (!this.overflowMenu || !this.overflowMenuBody) {
      return;
    }

    const menuRect = this.overflowMenu.getBoundingClientRect();
    const menuBodyRect = this.overflowMenuBody.getBoundingClientRect();
    const actualMenuHeight = menuBodyRect.height || this.actions.length * 40; // fallback

    const parentContainer = this.closest(`${prefix}-history-content`);
    if (!parentContainer) {
      return;
    }

    const containerRect = parentContainer.getBoundingClientRect();
    const spaceBelow = containerRect.bottom - menuRect.bottom;
    const spaceAbove = menuRect.top - containerRect.top;
    const menuTriggerHeight = 32; // height of the menu trigger

    // Use actual height for comparison
    if (spaceBelow < actualMenuHeight && spaceAbove > spaceBelow) {
      this.overflowMenuBody.style.transform = `translateY(calc(-100% - ${menuTriggerHeight}px))`;
    } else {
      // Default: open downward
      this.overflowMenuBody.style.transform = " ";
    }
  }

  /**
   * Handler for overflow menu trigger keydown event
   *
   * * @param event The event.
   */
  private _handleMenuTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      this._adjustMenuPosition();
    }
  };

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
        itemName: this.name,
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
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this._handleMenuItemClick(event);
      // Close the overflow menu after handling the action
      if (this.overflowMenu) {
        (this.overflowMenu as any).open = false;
      }
      return;
    }

    // Handle arrow keys
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();

      const direction = event.key === "ArrowDown" ? 1 : -1;

      // Find the menu body - the event target is the menu item
      const target = event.target as HTMLElement;
      const menuBody = target.closest("cds-overflow-menu-body");

      if (!menuBody) {
        return;
      }

      const menuItems = Array.from(
        menuBody.querySelectorAll("cds-overflow-menu-item:not([disabled])"),
      ) as HTMLElement[];

      if (menuItems.length === 0) {
        return;
      }

      const currentIndex = menuItems.findIndex(
        (item) =>
          item.contains(document.activeElement) ||
          item === document.activeElement ||
          item.matches(":focus-within"),
      );

      let nextIndex: number;
      if (currentIndex === -1) {
        // No item focused, focus first or last
        nextIndex = direction === 1 ? 0 : menuItems.length - 1;
      } else {
        // Navigate to next/previous with wrapping
        nextIndex = currentIndex + direction;
        if (nextIndex < 0) {
          nextIndex = menuItems.length - 1;
        } else if (nextIndex >= menuItems.length) {
          nextIndex = 0;
        }
      }

      menuItems[nextIndex]?.focus();
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
        itemName: this.name,
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
      this.input.addEventListener("history-panel-item-input-cancel", () => {
        this.rename = false;
      });

      this.input.addEventListener("history-panel-item-input-save", (event) => {
        const newName = (event as CustomEvent).detail.newName;
        this.name = newName;
        this.rename = false;
      });
    }
  }

  render() {
    const {
      id,
      selected,
      name,
      actions,
      rename,
      _adjustMenuPosition: adjustMenuPosition,
      _handleMenuTriggerKeyDown: handleMenuTriggerKeyDown,
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
            <span part="name" class="cds--side-nav__link-text"> ${name} </span>
            <slot name="actions">
              <cds-overflow-menu
                align="top-right"
                size="sm"
                @click=${adjustMenuPosition}
                @keydown=${handleMenuTriggerKeyDown}
              >
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
              value="${name}"
              item-id="${id}"
            ></cds-aichat-history-panel-item-input>
          `}
    `;
  }

  static styles = styles;
}

export { CDSAIChatHistoryPanelItem };
export default CDSAIChatHistoryPanelItem;
