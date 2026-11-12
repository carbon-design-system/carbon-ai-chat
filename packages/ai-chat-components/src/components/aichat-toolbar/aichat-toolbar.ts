/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/icon-button/index.js';
import '@carbon/web-components/es/components/overflow-menu/index.js';
import '@carbon/web-components/es/components/menu/index.js';
import { OVERFLOW_MENU_SIZE } from '@carbon/web-components/es/components/overflow-menu/defs.js';
import OverflowMenuVertical16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { prefix } from '../../globals/settings.js';
import commonStyles from '../../globals/scss/common.scss?lit';
import styles from './aichat-toolbar.scss?lit';
import { CarbonIcon } from '@carbon/web-components/es/globals/internal/icon-loader-utils.js';
import { BaseOverflowMenuItem } from '../../typings/overflow-menu.js';
import {
  activateOverflowMenuItem,
  suppressMenuItemSpaceScroll,
  stopMenuClickPropagation,
} from '../../globals/utils/menu-item-activation.js';
import { PageObjectId } from '../../testing/PageObjectId.js';

const blockClass = `${prefix}-aichat-toolbar`;
import { BUTTON_SIZE } from '@carbon/web-components/es/components/button/defs.js';

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

  /**
   * Renders this action as a two-state toggle and sets its current state.
   * When `true` or `false`, the button exposes `aria-pressed` and a visible
   * pressed treatment. Omit the field for a plain button with no toggle
   * semantics — `undefined` is intentionally distinct from `false`.
   */
  isSelected?: boolean;
}

/**
 * Toolbar.
 *
 * @element cds-aichat-toolbar
 * @slot navigation - Defines the navigation area of the toolbar.
 * @slot title - Defines the title section of the toolbar.
 * @slot fixed-actions - Defines the area for displaying actions that are always visible (not overflowed) in the toolbar.
 * @slot decorator - Decorative content such as an AI label.
 *
 */
class CDSAIChatToolbar extends LitElement {
  static get is() {
    return blockClass;
  }

  /** Whether the component is in RTL mode.
   *  @internal
   */
  @state() private isRTL = false;

  /** The list of actions. */
  @property({ type: Array, attribute: false, reflect: false })
  actions: Action[] = [];

  /** Should actions be overflowing. */
  @property({ type: Boolean, attribute: 'overflow', reflect: true })
  overflow = false;

  /** Primary title shown when the title slot is empty. */
  @property({ type: String })
  titleText?: string;

  /** Name shown above the primary title. */
  @property({ type: String })
  nameText?: string;

  /** Container holding all action buttons and the overflow menu.
   *  @internal
   */
  @query(`.${blockClass}__end`) private container!: HTMLElement;
  @query(`.${blockClass}__actions-container`)
  private actionsContainer!: HTMLElement;

  @query(`.${blockClass}__decorator-container`)
  private decoratorContainer!: HTMLElement;

  @query(`.${blockClass}__fixed-actions`)
  private fixedActions!: HTMLElement;

  @state()
  private containerWidth = 0;

  private resizeObserver?: ResizeObserver;

  private static readonly OVERFLOW_MENU_LABEL = 'Options';

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    super.disconnectedCallback();
  }

  firstUpdated() {
    if (this.overflow) {
      this.setupResizeObserver();
    }
  }

  updated() {
    // Carbon's delegatesFocus moves focus to the inner shadow <button>, so
    // ARIA attributes on the host are invisible to assistive tech. Mirror
    // them onto the inner button after each element's update cycle completes.
    void this._patchShadowButtonAttrs('cds-icon-button[data-pressed]', {
      'aria-pressed': 'data-pressed',
    });
  }

  /**
   * Copies attributes from each host element matching `selector` onto its
   * inner shadow `<button>`, after the element's own update cycle completes.
   *
   * @param selector - CSS selector scoped to this shadow root.
   * @param attrMap  - `{ targetAttr: sourceAttr }` pairs to copy.
   * @internal
   */
  private async _patchShadowButtonAttrs(
    selector: string,
    attrMap: Record<string, string>
  ): Promise<void> {
    await Promise.all(
      Array.from(
        this.shadowRoot?.querySelectorAll<LitElement & HTMLElement>(selector) ??
          []
      ).map(async (el) => {
        await el.updateComplete;
        const btn = el.shadowRoot?.querySelector('button');
        if (!btn) {
          return;
        }
        for (const [target, source] of Object.entries(attrMap)) {
          const value = el.getAttribute(source);
          if (value !== null) {
            btn.setAttribute(target, value);
          }
        }
      })
    );
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

    const actionsContainerWidth =
      this.actionsContainer.getBoundingClientRect().width;
    const overflowMenuIconWidth = 40;
    const fixedActionsWidth =
      this.fixedActions.getBoundingClientRect().width || 0;
    const decoratorContainerWidth =
      this.decoratorContainer.getBoundingClientRect().width || 0;
    /**
     * to properly gauge the container width we need to account for some additional variables
     * 1. the size of the overflow menu icon, which should always be a constant
     * 2. the size of any optional fixed width items
     * 3. the size of any optional decorator items
     */
    const containerWidth =
      actionsContainerWidth -
      (overflowMenuIconWidth + fixedActionsWidth + decoratorContainerWidth);
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
   * Renders an action as an icon button.
   * Note: Some Action properties only apply when rendered in overflow menu:
   * - danger/dangerDescription: cds-icon-button doesn't support danger variant
   * - divider: Only applicable in menu context
   */
  private renderIconButton = (action: Action) => {
    const tooltipAlign = this.isRTL ? 'bottom-start' : 'bottom-end';
    const { isSelected } = action;

    return html`
      <cds-icon-button
        align=${tooltipAlign}
        @click=${action.onClick}
        ?data-fixed=${action.fixed}
        data-pressed=${isSelected !== undefined ? String(isSelected) : nothing}
        ?data-selected=${isSelected === true}
        data-testid=${action.testId || nothing}
        ?disabled=${action.disabled}
        enter-delay-ms="0"
        href=${action.href || nothing}
        ?isSelected=${isSelected === true}
        kind="ghost"
        leave-delay-ms="0"
        size=${action.size || BUTTON_SIZE.MEDIUM}
        target=${action.href ? action.target || '_self' : nothing}>
        ${iconLoader(action.icon, {
          slot: 'icon',
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
    const {
      hiddenActions: rawHiddenActions,
      visibleActions: rawVisibleActions,
    } = this.getActions();
    const showOverflowMenu = rawHiddenActions.length > 1;
    const visibleActions = showOverflowMenu
      ? rawVisibleActions
      : [...rawVisibleActions, ...rawHiddenActions];
    const hiddenActions = showOverflowMenu ? rawHiddenActions : [];
    const showInitialActions =
      rawVisibleActions.length === 0 && rawHiddenActions.length === 0;

    return html`
      <div data-rounded="top" class=${blockClass}>
        <div data-fixed class="${blockClass}__start">
          <div data-fixed class="${blockClass}__navigation">
            <slot name="navigation"></slot>
          </div>

          <div data-fixed class="${blockClass}__title">
            <slot name="title">
              ${
                this.titleText || this.nameText
                  ? html`
                      <cds-aichat-truncated-text
                        lines="1"
                        type="tooltip"
                        align=${this.isRTL ? 'bottom-end' : 'bottom-start'}
                        value="${[this.titleText, this.nameText]
                          .filter(Boolean)
                          .join(' ')}">
                        ${
                          this.titleText
                            ? html`<span
                                data-testid=${PageObjectId.HEADER_TITLE}
                                >${this.titleText}</span
                              >`
                            : nothing
                        }
                        ${this.titleText && this.nameText ? html`` : nothing}
                        ${
                          this.nameText
                            ? html`<span
                                class="${blockClass}__name"
                                data-testid=${PageObjectId.HEADER_NAME}
                                >${this.nameText}</span
                              >`
                            : nothing
                        }
                      </cds-aichat-truncated-text>
                    `
                  : nothing
              }
            </slot>
          </div>
        </div>
        <div
          class="${blockClass}__end"
          data-rounded="top-right"
          data-floating-menu-container>
          <div class="${blockClass}__actions-container">
            <div class="${blockClass}__decorator-container">
              <slot name="decorator"></slot>
            </div>
            ${repeat(
              showInitialActions ? this.actions : visibleActions,
              (action) => action.text,
              this.renderIconButton
            )}
            ${
              showOverflowMenu
                ? html`
                    <cds-overflow-menu
                      autoalign
                      size=${this.getOverflowMenuSize()}
                      align=${this.isRTL ? 'bottom-start' : 'bottom-end'}
                      menu-alignment="bottom-end"
                      data-offset
                      ?data-hidden=${hiddenActions.length === 0}
                      kind="ghost"
                      close-on-activation
                      enter-delay-ms="0"
                      leave-delay-ms="0">
                      ${iconLoader(OverflowMenuVertical16, {
                        class: `${blockClass}-overflow-icon`,
                        slot: 'icon',
                      })}
                      <span slot="tooltip-content"
                        >${CDSAIChatToolbar.OVERFLOW_MENU_LABEL}</span
                      >
                      <cds-menu @click=${stopMenuClickPropagation}>
                        ${repeat(
                          hiddenActions,
                          (item) => item.text,
                          (item) => html`
                            ${
                              item.divider
                                ? html`<cds-menu-item-divider></cds-menu-item-divider>`
                                : nothing
                            }
                            <cds-menu-item
                              label=${item.text}
                              kind=${item.danger ? 'danger' : 'default'}
                              danger-description=${
                                item.dangerDescription || nothing
                              }
                              ?disabled=${item.disabled}
                              ?data-selected=${item.isSelected === true}
                              role=${
                                item.isSelected !== undefined
                                  ? 'menuitemcheckbox'
                                  : 'menuitem'
                              }
                              aria-checked=${
                                item.isSelected !== undefined
                                  ? String(item.isSelected)
                                  : nothing
                              }
                              data-testid=${item.testId || nothing}
                              @keydown=${suppressMenuItemSpaceScroll}
                              @click=${() => activateOverflowMenuItem(item)}>
                            </cds-menu-item>
                          `
                        )}
                      </cds-menu>
                    </cds-overflow-menu>
                  `
                : nothing
            }
            <div data-fixed class="${blockClass}__fixed-actions">
              <slot name="fixed-actions"></slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static styles = [commonStyles, styles];
}

export { CDSAIChatToolbar };
export default CDSAIChatToolbar;
