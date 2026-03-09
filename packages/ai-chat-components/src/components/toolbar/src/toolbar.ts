/*
 *  Copyright IBM Corp. 2025
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
import { createOverflowHandler } from "@carbon/utilities";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import prefix from "../../../globals/settings.js";
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
  /** Hidden actions rendered in the overflow menu.
   *  @internal
   */
  @state() private hiddenItems: Action[] = [];

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

  @state() private measuring = true;

  private overflowHandler?: { disconnect: () => void };
  private visibilityObserver?: ResizeObserver;

  private static readonly OVERFLOW_MENU_LABEL = "Options";

  connectedCallback(): void {
    super.connectedCallback();
    this.style.visibility = this.overflow ? "hidden" : "visible";
  }

  firstUpdated() {
    if (!this.overflow) {
      return;
    }
    this.updateComplete.then(() => {
      this.setupOverflowHandler();
      this.style.removeProperty("visibility");
    });
  }

  updated(changedProps: Map<string, unknown>) {
    if (changedProps.has("actions")) {
      this.updateComplete
        .then(() => {
          this.hiddenItems = [];
        })
        .then(() => this.setupOverflowHandler())
        .then(() => {
          this.measuring = false;
        });
    }
  }

  private setupOverflowHandler() {
    if (!this.container || !this.overflow) {
      return;
    }

    const containerWidth = Math.round(
      this.container.getBoundingClientRect().width,
    );
    if (containerWidth === 0) {
      if (!this.visibilityObserver) {
        this.visibilityObserver = new ResizeObserver(() => {
          const width = Math.round(
            this.container.getBoundingClientRect().width,
          );
          if (width > 0) {
            this.visibilityObserver?.disconnect();
            this.visibilityObserver = undefined;
            // Use requestAnimationFrame to avoid ResizeObserver loop errors
            requestAnimationFrame(() => {
              this.setupOverflowHandler();
            });
          }
        });
        this.visibilityObserver.observe(this.container);
      }
      return;
    }

    this.overflowHandler?.disconnect();
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = undefined;

    this.overflowHandler = createOverflowHandler({
      container: this.container,
      dimension: "width",
      onChange: (visibleItems: HTMLElement[]) => {
        this.hiddenItems = this.actions.filter(
          (_, i) => i >= visibleItems.length && !_.fixed,
        );
      },
    });
  }

  disconnectedCallback() {
    this.overflowHandler?.disconnect();
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = undefined;
    super.disconnectedCallback();
  }

  /**
   * Renders an action as an icon button.
   * Note: Some Action properties only apply when rendered in overflow menu:
   * - danger/dangerDescription: cds-icon-button doesn't support danger variant
   * - divider: Only applicable in menu context
   */
  private renderIconButton = (action: Action) => {
    return html`
      <cds-icon-button
        ?data-fixed=${action.fixed}
        @click=${action.onClick}
        href=${action.href || nothing}
        target=${action.href ? action.target || "_self" : nothing}
        size=${action.size || BUTTON_SIZE.MEDIUM}
        align="bottom-end"
        kind="ghost"
        enter-delay-ms="0"
        leave-delay-ms="0"
        data-testid=${action.testId || nothing}
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
    const { fixedActions, nonFixedActions } = this.actions.reduce(
      (acc, action) => {
        action.fixed
          ? acc.fixedActions.push(action)
          : acc.nonFixedActions.push(action);
        return acc;
      },
      { fixedActions: [] as Action[], nonFixedActions: [] as Action[] },
    );

    const showOverflowMenu = this.measuring || this.hiddenItems.length > 0;

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
                      align="bottom-start"
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

        <div data-fixed class="${blockClass}__end">
          <div data-fixed class="${blockClass}__fixed-actions">
            <slot name="fixed-actions"></slot>
          </div>

          <div data-fixed><slot name="decorator"></slot></div>

          ${repeat(
            nonFixedActions,
            (action) => action.text,
            this.renderIconButton,
          )}
          ${showOverflowMenu
            ? html`
                <div data-floating-menu-container>
                  <cds-overflow-menu
                    size=${this.getOverflowMenuSize()}
                    align="bottom-end"
                    data-offset
                    ?data-hidden=${this.hiddenItems.length === 0}
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
                    <cds-overflow-menu-body flipped>
                      ${repeat(
                        this.hiddenItems,
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
                </div>
              `
            : nothing}
          ${repeat(
            fixedActions,
            (action) => action.text,
            this.renderIconButton,
          )}
        </div>
      </div>
    `;
  }

  static styles = styles;
}

export { CDSAIChatToolbar };
export default CDSAIChatToolbar;
