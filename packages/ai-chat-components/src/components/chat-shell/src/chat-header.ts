/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/overflow-menu/index.js";
import "../../toolbar/src/toolbar.js";
import type { Action } from "../../toolbar/src/toolbar.js";
import prefix from "../../../globals/settings.js";
import { PageObjectId } from "../../../testing/PageObjectId.js";
import styles from "./chat-header.scss?lit";

/**
 * Chat Header component that wraps the Toolbar component.
 * Provides a consistent header for chat interfaces with support for
 * navigation, title, actions, and decorators (like AI labels).
 *
 * @element cds-aichat-chat-header
 * @slot navigation - Navigation controls (e.g., back button, overflow menu)
 * @slot title - Title and name content (can also use title/name properties)
 * @slot decorator - Decorative elements like AI labels
 * @slot fixed-actions - Actions that never overflow (allows passing custom components)
 */
@carbonElement("cds-aichat-chat-header")
class CdsAiChatChatHeader extends LitElement {
  static styles = styles;

  /**
   * Selector strings for finding focusable elements.
   * Extracted as constants for maintainability and reusability.
   */
  private static readonly BUTTON_SELECTORS =
    "cds-button, cds-icon-button, button";

  private static readonly NAV_BUTTON_SELECTORS =
    "cds-button, cds-icon-button, cds-overflow-menu, button";

  private static readonly FOCUSABLE_SELECTORS =
    "button:not([disabled]), [href], input:not([disabled]), " +
    "select:not([disabled]), textarea:not([disabled]), " +
    '[tabindex]:not([tabindex="-1"]):not([disabled])';

  private static readonly TOOLBAR_ACTION_SELECTOR =
    "cds-icon-button:not([disabled])";

  /**
   * Configuration constants for navigation elements.
   */
  private static readonly BACK_ICON_CONFIG = { slot: "icon" };

  private static readonly NAV_TOOLTIP_CONFIG = {
    alignment: "end",
    position: "right",
    enterDelayMs: "0",
    leaveDelayMs: "0",
  };

  /**
   * Attempts to focus an element if it's focusable and not disabled.
   * Uses type guard for runtime type safety instead of type assertions.
   *
   * @param element - The element to attempt to focus
   * @returns True if focus was successfully set, false otherwise
   */
  private tryFocus(element: Element | null | undefined): boolean {
    if (element instanceof HTMLElement && !element.hasAttribute("disabled")) {
      element.focus();
      return document.activeElement === element;
    }
    return false;
  }

  /**
   * Attempts to focus buttons within a named slot.
   * Reduces duplication by centralizing slot querying logic.
   *
   * @param slotName - The name of the slot to query
   * @param selectors - CSS selector string for buttons to find
   * @returns True if a button was focused, false otherwise
   */
  private tryFocusSlotButtons(slotName: string, selectors: string): boolean {
    const slot = this.shadowRoot?.querySelector(
      `slot[name="${slotName}"]`,
    ) as HTMLSlotElement | null;

    if (!slot) {
      return false;
    }

    for (const el of slot.assignedElements()) {
      const button = el.querySelector(selectors);
      if (button instanceof HTMLElement && this.tryFocus(button)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Requests focus on the best available focusable element within the component.
   * This method implements a generic focus management pattern that can be used
   * across all web components.
   *
   * Priority order:
   * 1. First enabled button in fixed-actions slot (highest priority - usually close button)
   * 2. First enabled button in navigation slot (back button or overflow menu)
   * 3. First enabled action button from toolbar (rendered by actions array)
   * 4. Any other focusable element (last resort)
   *
   * @returns True if focus was successfully set, false otherwise
   */
  requestFocus(): boolean {
    // Define focus strategies in priority order
    const focusStrategies = [
      // 1. Try fixed-actions slot
      () =>
        this.tryFocusSlotButtons(
          "fixed-actions",
          CdsAiChatChatHeader.BUTTON_SELECTORS,
        ),
      // 2. Try navigation slot (for slotted content)
      () =>
        this.tryFocusSlotButtons(
          "navigation",
          CdsAiChatChatHeader.NAV_BUTTON_SELECTORS,
        ),
      // 3. Try navigation rendered from properties (direct children of toolbar)
      () => {
        const toolbar = this.shadowRoot?.querySelector("cds-aichat-toolbar");
        const navButton = toolbar?.querySelector(
          'cds-icon-button[slot="navigation"], cds-overflow-menu[slot="navigation"]',
        );
        return navButton instanceof HTMLElement && this.tryFocus(navButton);
      },
      // 4. Try toolbar action buttons
      () => {
        const toolbar = this.shadowRoot?.querySelector("cds-aichat-toolbar");
        const buttons = toolbar?.shadowRoot?.querySelectorAll(
          CdsAiChatChatHeader.TOOLBAR_ACTION_SELECTOR,
        );
        return buttons?.[0] instanceof HTMLElement && this.tryFocus(buttons[0]);
      },
      // 5. Try any focusable element as last resort
      () => {
        const focusable = this.shadowRoot?.querySelector(
          CdsAiChatChatHeader.FOCUSABLE_SELECTORS,
        );
        return focusable instanceof HTMLElement && this.tryFocus(focusable);
      },
    ];

    // Execute strategies until one succeeds
    return focusStrategies.some((strategy) => strategy());
  }

  /**
   * Array of actions that can overflow into a menu when space is limited.
   */
  @property({ type: Array, attribute: false })
  actions: Action[] = [];

  /**
   * Enable overflow behavior for actions.
   */
  @property({ type: Boolean, attribute: "overflow", reflect: true })
  overflow = false;

  /**
   * Optional header title text to display.
   */
  @property({ type: String, attribute: "header-title" })
  headerTitle = "";

  /**
   * Optional name text to display after the title.
   */
  @property({ type: String, attribute: "header-name" })
  headerName = "";

  /**
   * Type of navigation to display: 'back', 'overflow', or 'none'.
   */
  @property({ type: String, attribute: "navigation-type" })
  navigationType: "back" | "overflow" | "none" = "none";

  /**
   * Icon for the back button (CarbonIcon object with render method).
   */
  @property({ type: Object, attribute: false })
  navigationBackIcon?: any;

  /**
   * Label/tooltip text for the back button.
   */
  @property({ type: String, attribute: "navigation-back-label" })
  navigationBackLabel = "";

  /**
   * Click handler for the back button.
   */
  @property({ type: Object, attribute: false })
  navigationBackOnClick?: () => void;

  /**
   * Array of overflow menu items with text and onClick handlers or href.
   */
  @property({ type: Array, attribute: false })
  navigationOverflowItems?: Array<{
    text: string;
    onClick?: () => void;
    href?: string;
    target?: string;
    disabled?: boolean;
    testId?: string;
  }>;

  /**
   * Label/tooltip text for the overflow menu button.
   */
  @property({ type: String, attribute: "navigation-overflow-label" })
  navigationOverflowLabel = "";

  /**
   * Icon for the overflow menu button (CarbonIcon object with render method).
   */
  @property({ type: Object, attribute: false })
  navigationOverflowIcon?: any;

  /**
   * Click handler for when the overflow menu button is clicked (menu opened).
   */
  @property({ type: Object, attribute: false })
  navigationOverflowOnClick?: () => void;

  /**
   * Renders the overflow menu items.
   */
  private renderOverflowMenuItems() {
    return this.navigationOverflowItems?.map(
      (item) => html`
        <cds-overflow-menu-item
          @click=${item.onClick}
          href=${item.href || nothing}
          target=${item.href ? item.target || "_self" : nothing}
          ?disabled=${item.disabled}
          data-testid=${item.testId || nothing}
        >
          ${item.text}
        </cds-overflow-menu-item>
      `,
    );
  }

  /**
   * Checks if back navigation should be rendered.
   * @returns True if back navigation type is set and icon is provided
   */
  private shouldRenderBackNavigation(): boolean {
    return this.navigationType === "back" && !!this.navigationBackIcon;
  }

  /**
   * Checks if overflow navigation should be rendered.
   * @returns True if overflow navigation type is set and items are available
   */
  private shouldRenderOverflowNavigation(): boolean {
    return (
      this.navigationType === "overflow" &&
      !!this.navigationOverflowItems?.length
    );
  }

  /**
   * Gets the configuration object for overflow menu icon.
   * @returns Icon loader configuration with class and slot
   */
  private getOverflowIconConfig() {
    return {
      class: `${prefix}-chat-header-overflow-icon`,
      slot: "icon",
    };
  }

  /**
   * Renders the back navigation button.
   * @returns Template result for back button
   */
  private renderBackNavigation() {
    return html`
      <cds-icon-button
        slot="navigation"
        kind="ghost"
        size="md"
        tooltip-alignment=${CdsAiChatChatHeader.NAV_TOOLTIP_CONFIG.alignment}
        tooltip-position=${CdsAiChatChatHeader.NAV_TOOLTIP_CONFIG.position}
        enter-delay-ms=${CdsAiChatChatHeader.NAV_TOOLTIP_CONFIG.enterDelayMs}
        leave-delay-ms=${CdsAiChatChatHeader.NAV_TOOLTIP_CONFIG.leaveDelayMs}
        @click=${this.navigationBackOnClick}
      >
        ${iconLoader(
          this.navigationBackIcon,
          CdsAiChatChatHeader.BACK_ICON_CONFIG,
        )}
        <span slot="tooltip-content">${this.navigationBackLabel}</span>
      </cds-icon-button>
    `;
  }

  /**
   * Renders the overflow navigation menu.
   * @returns Template result for overflow menu
   */
  private renderOverflowNavigation() {
    // Check if RTL direction is set
    const isRTL =
      document.dir === "rtl" || document.documentElement.dir === "rtl";

    // For LTR: menu opens right
    // For RTL: menu opens left
    const menuAlignment = isRTL ? "left" : "right";

    return html`
      <div
        slot="navigation"
        data-floating-menu-container
        class="${prefix}-chat-header-overflow-wrapper"
      >
        <cds-overflow-menu
          align=${menuAlignment}
          tooltip-alignment=${CdsAiChatChatHeader.NAV_TOOLTIP_CONFIG.alignment}
          tooltip-position=${CdsAiChatChatHeader.NAV_TOOLTIP_CONFIG.position}
          enter-delay-ms=${CdsAiChatChatHeader.NAV_TOOLTIP_CONFIG.enterDelayMs}
          leave-delay-ms=${CdsAiChatChatHeader.NAV_TOOLTIP_CONFIG.leaveDelayMs}
          @click=${this.navigationOverflowOnClick}
        >
          ${this.navigationOverflowIcon
            ? iconLoader(
                this.navigationOverflowIcon,
                this.getOverflowIconConfig(),
              )
            : nothing}
          <span slot="tooltip-content">${this.navigationOverflowLabel}</span>
          <cds-overflow-menu-body>
            ${this.renderOverflowMenuItems()}
          </cds-overflow-menu-body>
        </cds-overflow-menu>
      </div>
    `;
  }

  /**
   * Renders the navigation content based on navigationType.
   * Uses guard clauses and extracted methods for clarity.
   * @returns Template result for navigation or nothing
   */
  private renderNavigation() {
    if (!this.navigationType || this.navigationType === "none") {
      return nothing;
    }

    if (this.shouldRenderBackNavigation()) {
      return this.renderBackNavigation();
    }

    if (this.shouldRenderOverflowNavigation()) {
      return this.renderOverflowNavigation();
    }

    return nothing;
  }

  /**
   * Renders the title content based on headerTitle and headerName properties.
   * @returns Template result for title content or title slot
   */
  private renderTitle() {
    const hasTitle = this.headerTitle || this.headerName;

    if (!hasTitle) {
      return html`<slot name="title"></slot>`;
    }

    return html`
      <div slot="title" class="cds-aichat-chat-header__title">
        ${this.headerTitle
          ? html`
              <span
                class="cds-aichat-chat-header__title-text"
                data-testid=${PageObjectId.HEADER_TITLE}
              >
                ${this.headerTitle}
              </span>
            `
          : nothing}
        ${this.headerName
          ? html`
              <span
                class="cds-aichat-chat-header__name-text"
                data-testid=${PageObjectId.HEADER_NAME}
              >
                ${this.headerName}
              </span>
            `
          : nothing}
      </div>
    `;
  }

  render() {
    // Determine if we should render navigation from props or use slot
    const hasNavigationProps =
      this.navigationType && this.navigationType !== "none";
    const navigationContent = hasNavigationProps
      ? this.renderNavigation()
      : html`<slot name="navigation"></slot>`;

    return html`
      <cds-aichat-toolbar .actions=${this.actions} ?overflow=${this.overflow}>
        ${navigationContent} ${this.renderTitle()}
        <slot name="fixed-actions" slot="fixed-actions"></slot>
        <slot name="decorator" slot="decorator"></slot>
      </cds-aichat-toolbar>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-chat-header": CdsAiChatChatHeader;
  }
}

export { CdsAiChatChatHeader };
export default CdsAiChatChatHeader;

// Made with Bob
