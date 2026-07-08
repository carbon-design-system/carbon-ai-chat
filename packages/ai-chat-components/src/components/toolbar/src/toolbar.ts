/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from "lit";
import { property, state, query } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/overflow-menu/index.js";
import { OVERFLOW_MENU_SIZE } from "@carbon/web-components/es/components/overflow-menu/defs.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import prefix from "../../../globals/settings.js";
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./toolbar.scss?lit";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";
import { carbonElement } from "../../../globals/decorators/index.js";
import "../../truncated-text/index.js";
import { BaseOverflowMenuItem } from "../../../typings/overflow-menu.js";
import { PageObjectId } from "../../../testing/PageObjectId.js";

const blockClass = `${prefix}-toolbar`;
import { BUTTON_SIZE } from "@carbon/web-components/es/components/button/defs.js";

/**
 * Actions that display in the toolbar.
 * Extends BaseOverflowMenuItem to support all overflow menu item properties
 * including danger variants, dividers, and links (href/target).
 *
 * Actions can be either:
 * - Interactive buttons with onClick handlers
 * - Links with href/target attributes
 */
export interface Action extends BaseOverflowMenuItem {
  /**
   * `@carbon/icons` icon for the action.
   */
  icon: CarbonIcon;

  /**
   * Size of button. Defaults to BUTTON_SIZE.MEDIUM.
   */
  size?: BUTTON_SIZE;

  /**
   * When overflow handling is enabled, setting fixed to true will force this action out of the overflow menu.
   */
  fixed?: boolean;
}

/**
 * Toolbar.
 *
 * @element cds-aichat-toolbar
 * @slot navigation - Defines the navigation area of the toolbar.
 * @slot title - Defines the title section of the toolbar.
 * @slot fixed-actions - Defines the area for displaying actions that are always visible (not overflowed) in the toolbar.
 * @slot toolbar-ai-label - Defines the area for displaying the AI label in the toolbar.
 *
 */
@carbonElement(blockClass)
class CDSAIChatToolbar extends LitElement {
  /** Whether the component is in RTL mode.
   *  @internal
   */
  @state() private isRTL = false;

  /** The list of actions. */
  @property({ type: Array, attribute: false, reflect: false })
  actions: Action[] = [];

  /** Should actions be overflowing. */
  @property({ type: Boolean, attribute: "overflow", reflect: true })
  overflow = false;

  @property({ type: String })
  titleText?: string;

  @property({ type: String })
  nameText?: string;

  /** Container holding all action buttons and the overflow menu.
   *  @internal
   */
  @query(`.${blockClass}__end`) private container!: HTMLElement;
  @query(`.${blockClass}__actions-container`)
  private actionsContainer!: HTMLElement;

  @state() private containerWidth = 0;

  private resizeObserver?: ResizeObserver;

  private static readonly OVERFLOW_MENU_LABEL = "Options";

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this._handleToolbarKeydown);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.removeEventListener("keydown", this._handleToolbarKeydown);
    super.disconnectedCallback();
  }

  firstUpdated() {
    if (this.overflow) {
      this.setupResizeObserver();
    }
  }

  private sortActions() {
    return [...this.actions].sort((a, b) => {
      if (a.fixed && !b.fixed) {
        return -1;
      }
      if (!a.fixed && b.fixed) {
        return 1;
      }
      return 0;
    });
  }

  private setupResizeObserver() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width !== this.containerWidth) {
        this.containerWidth = width;
      }
    });
    this.resizeObserver.observe(this.container);
  }

  private getActions() {
    if (!this.container || this.container.getBoundingClientRect().width === 0) {
      return {
        visibleActions: [],
        hiddenActions: [],
      };
    }
    const containerWidth =
      this.actionsContainer.getBoundingClientRect().width - 40; // subtract 40 to account for size of overflow menu button
    const children = this.actionsContainer.children;
    let currentWidth = 0;
    const visibleChildren: Element[] = [];
    const hiddenChildren: Element[] = [];
    for (const el of children) {
      const elWidth = el.getBoundingClientRect().width;
      const newWidth = currentWidth + elWidth;
      const widthCheck = newWidth < containerWidth;
      if (widthCheck) {
        currentWidth = newWidth;
        visibleChildren.push(el);
      } else {
        hiddenChildren.push(el);
      }
    }
    const idx = visibleChildren.length;
    const sortedActions = this.sortActions();
    const visibleActions = sortedActions.slice(0, idx);
    const hiddenActions = sortedActions.slice(idx);

    return {
      visibleActions,
      hiddenActions,
    };
  }

  /**
   * Returns the focused overflow menu item (if exists) by traversing shadow DOM
   */
  private findFocusedOverflowMenuItem(activeElem: Element): Element | null {
    if (activeElem.tagName.toLowerCase() === "cds-overflow-menu-item") {
      return activeElem;
    }

    if (activeElem?.shadowRoot?.activeElement) {
      return this.findFocusedOverflowMenuItem(
        activeElem.shadowRoot.activeElement,
      );
    }

    return null;
  }

  private _handleToolbarKeydown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    let focusedMenuItem: Element | null = null;

    if (document.activeElement) {
      focusedMenuItem = this.findFocusedOverflowMenuItem(
        document.activeElement,
      );
    }

    if (focusedMenuItem) {
      event.preventDefault();
      const menuBody = focusedMenuItem.closest("cds-overflow-menu-body");

      if (!menuBody) {
        return;
      }

      const items = Array.from(
        menuBody.querySelectorAll("cds-overflow-menu-item:not([disabled])"),
      ) as HTMLElement[];

      const currentIndex = items.indexOf(focusedMenuItem as HTMLElement);
      if (currentIndex === -1) {
        return;
      }

      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    }
  };

  /**
   * Renders an action as an icon button.
   * Note: Some Action properties only apply when rendered in overflow menu:
   * - danger/dangerDescription: cds-icon-button doesn't support danger variant
   * - divider: Only applicable in menu context
   */
  private renderIconButton = (action: Action) => {
    const tooltipAlign = this.isRTL ? "bottom-start" : "bottom-end";

    return html`
      <cds-icon-button
        ?data-fixed=${action.fixed}
        data-testid=${action.testId || nothing}
        @click=${action.onClick}
        href=${action.href || nothing}
        target=${action.href ? action.target || "_self" : nothing}
        size=${action.size || BUTTON_SIZE.MEDIUM}
        align=${tooltipAlign}
        kind="ghost"
        enter-delay-ms="0"
        leave-delay-ms="0"
        ?disabled=${action.disabled}
      >
        ${iconLoader(action.icon, {
          slot: "icon",
        })}
        <span slot="tooltip-content">${action.text}</span>
      </cds-icon-button>
    `;
  };

  private getOverflowMenuSize(): OVERFLOW_MENU_SIZE {
    return (this.actions?.[0]?.size ||
      OVERFLOW_MENU_SIZE.MEDIUM) as OVERFLOW_MENU_SIZE;
  }

  render() {
    const { hiddenActions, visibleActions } = this.getActions();
    const showOverflowMenu = hiddenActions.length > 0;
    const showInitialActions =
      visibleActions.length === 0 && hiddenActions.length === 0;

    return html`
      <div data-rounded="top" class=${blockClass}>
        <div data-fixed class="${blockClass}__start">
          <div data-fixed class="${blockClass}__navigation">
            <slot name="navigation"></slot>
          </div>

          <div data-fixed class="${blockClass}__title">
            <slot name="title">
              ${this.titleText || this.nameText
                ? html`
                    <cds-aichat-truncated-text
                      lines="1"
                      type="tooltip"
                      align=${this.isRTL ? "bottom-end" : "bottom-start"}
                      value="${[this.titleText, this.nameText]
                        .filter(Boolean)
                        .join(" ")}"
                    >
                      ${this.titleText
                        ? html`<span data-testid=${PageObjectId.HEADER_TITLE}
                            >${this.titleText}</span
                          >`
                        : nothing}
                      ${this.titleText && this.nameText ? html`` : nothing}
                      ${this.nameText
                        ? html`<span
                            class="${blockClass}__name"
                            data-testid=${PageObjectId.HEADER_NAME}
                            >${this.nameText}</span
                          >`
                        : nothing}
                    </cds-aichat-truncated-text>
                  `
                : nothing}
            </slot>
          </div>
        </div>
        <div
          class="${blockClass}__end"
          data-rounded="top-right"
          data-floating-menu-container
        >
          <div class="${blockClass}__actions-container">
            ${repeat(
              showInitialActions ? this.actions : visibleActions,
              (action) => action.text,
              this.renderIconButton,
            )}
            ${showOverflowMenu
              ? html`
                  <cds-overflow-menu
                    size=${this.getOverflowMenuSize()}
                    align=${this.isRTL ? "bottom-start" : "bottom-end"}
                    data-offset
                    ?data-hidden=${hiddenActions.length === 0}
                    kind="ghost"
                    close-on-activation
                    enter-delay-ms="0"
                    leave-delay-ms="0"
                  >
                    ${iconLoader(OverflowMenuVertical16, {
                      class: `${blockClass}-overflow-icon`,
                      slot: "icon",
                    })}
                    <span slot="tooltip-content"
                      >${CDSAIChatToolbar.OVERFLOW_MENU_LABEL}</span
                    >
                    <cds-overflow-menu-body ?flipped=${!this.isRTL}>
                      ${repeat(
                        hiddenActions,
                        (item) => item.text,
                        (item) => html`
                          <cds-overflow-menu-item
                            @click=${item.onClick}
                            href=${item.href || nothing}
                            target=${item.href
                              ? item.target || "_self"
                              : nothing}
                            ?disabled=${item.disabled}
                            ?danger=${item.danger}
                            danger-description=${item.dangerDescription ||
                            nothing}
                            ?divider=${item.divider}
                            data-testid=${item.testId || nothing}
                          >
                            ${item.text}
                          </cds-overflow-menu-item>
                        `,
                      )}
                    </cds-overflow-menu-body>
                  </cds-overflow-menu>
                `
              : nothing}
          </div>
          <div data-fixed class="${blockClass}__fixed-actions">
            <slot name="fixed-actions"></slot>
          </div>
          <div class="${blockClass}__decorator-container">
            <slot name="decorator"></slot>
          </div>
        </div>
      </div>
    `;
  }

  static styles = [commonStyles, styles];
}

export { CDSAIChatToolbar };
export default CDSAIChatToolbar;
