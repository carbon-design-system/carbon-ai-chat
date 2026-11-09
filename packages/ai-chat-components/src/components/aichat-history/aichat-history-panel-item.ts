/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html, nothing } from 'lit';
import { property, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import { prefix } from '../../globals/settings.js';

import FocusMixin from '@carbon/web-components/es/globals/mixins/focus.js';
import HostListener from '@carbon/web-components/es/globals/decorators/host-listener.js';
import HostListenerMixin from '@carbon/web-components/es/globals/mixins/host-listener.js';
import { CarbonIcon } from '@carbon/web-components/es/globals/internal/icon-loader-utils.js';
import OverflowMenuVertical16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import '@carbon/web-components/es/components/overflow-menu/index.js';
import '@carbon/web-components/es/components/menu/index.js';
import {
  suppressMenuItemSpaceScroll,
  stopMenuClickPropagation,
} from '../../globals/utils/menu-item-activation.js';
import '@carbon/web-components/es/components/icon-button/index.js';

import styles from './chat-history.scss?lit';

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
 * @fires history-panel-item-input-change
 *   Bubbles up from the inner input component on every input value change when `rename` is true.
 * @fires history-panel-item-input-cancel
 *   Bubbles up from the inner input component when the rename is canceled.
 * @fires history-panel-item-input-save
 *   Bubbles up from the inner input component when the rename is saved.
 *
 */
class CDSAIChatHistoryPanelItem extends HostListenerMixin(
  FocusMixin(LitElement)
) {
  static get is() {
    return `${prefix}-aichat-history-panel-item`;
  }

  /**
   * `true` if the history panel item is selected.
   */
  @property({ type: Boolean, reflect: true })
  selected = false;

  /**
   * id of chat history item element
   */
  @property({ type: String, reflect: true })
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
  @property({ type: String, attribute: 'overflow-menu-label' })
  overflowMenuLabel = 'Options';

  /**
   * `true` to always show the actions menu for this item.
   * When set, the actions menu will be visible without requiring hover or selection.
   * Can be set directly on the item or inherited from the parent panel's `show-actions` attribute.
   */
  @property({ type: Boolean, reflect: true, attribute: 'show-actions' })
  showActions = false;

  /**
   * `true` if the rename input is in an invalid state.
   */
  @property({ type: Boolean, reflect: true, attribute: 'rename-invalid' })
  renameInvalid = false;

  /**
   * Error message to display below the rename input when it is invalid.
   */
  @property({
    type: String,
    reflect: true,
    attribute: 'rename-invalid-message',
  })
  renameInvalidMessage = '';

  /**
   * `true` if the parent menu is expanded.
   * This is automatically set based on the parent history-panel-menu's expanded attribute.
   */
  @property({ type: Boolean, reflect: true, attribute: 'parent-menu-expanded' })
  parentMenuExpanded = true;

  @query(`${prefix}-aichat-history-panel-item-input`) input!: HTMLElement;

  /**
   * MutationObserver to watch for changes to parent panel's always-show-actions attribute
   */
  private _parentObserver?: MutationObserver;

  /**
   * Event listener for parent menu toggle events
   */
  private _parentMenuToggleListener?: EventListener;

  /**
   * Reference to parent menu element
   */
  private _parentMenu?: HTMLElement;

  /**
   * Handle menu item clicks
   */
  private _handleMenuItemClick = (action: Action) => {
    // Dispatch a custom event with item details
    const itemActionEvent = new CustomEvent('history-item-menu-action', {
      bubbles: true,
      composed: true,
      detail: {
        action: action.text,
        itemId: this.id,
        itemName: this.name,
        element: this,
      },
    });
    this.dispatchEvent(itemActionEvent);
  };

  @HostListener('click')
  // @ts-ignore: The decorator refers to this method but TS thinks this method is not referred to
  private _handleClick(event: Event) {
    const composedPath = event.composedPath();

    // Check if the click originated from an interactive element (overflow menu, etc.)
    // by checking the composed path for any overflow menu elements
    const isOverflowMenuClick = composedPath.some((element) => {
      if (element instanceof HTMLElement) {
        const tagName = element.tagName?.toLowerCase();
        return (
          tagName?.includes('overflow-menu') ||
          tagName === 'cds-menu' ||
          tagName === 'cds-menu-item' ||
          tagName === 'cds-menu-item-divider'
        );
      }
      return false;
    });

    if (isOverflowMenuClick) {
      return;
    }

    // Dispatch a custom event with item details
    const itemActionEvent = new CustomEvent('history-item-selected', {
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

  @HostListener('keydown')
  // @ts-ignore: The decorator refers to this method but TS thinks this method is not referred to
  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this._handleClick(event);
    }
  };

  connectedCallback() {
    super.connectedCallback();

    // Inherit show-actions from parent panel if not explicitly set on this item
    const parentPanel = this.closest(`${prefix}-aichat-history-panel`);
    if (parentPanel && !this.hasAttribute('show-actions')) {
      // Set initial value
      this.showActions = parentPanel.hasAttribute('show-actions');

      // Watch for changes to parent's show-actions attribute
      this._parentObserver = new MutationObserver(() => {
        const parentHasAttribute = parentPanel.hasAttribute('show-actions');
        this.showActions = parentHasAttribute;
      });

      this._parentObserver.observe(parentPanel, {
        attributes: true,
        attributeFilter: ['show-actions'],
      });
    }

    // Track parent menu's expanded state
    const parentMenu = this.closest(`${prefix}-aichat-history-panel-menu`);
    if (parentMenu) {
      this._parentMenu = parentMenu as HTMLElement;

      // Listen for toggle events from the parent menu
      this._parentMenuToggleListener = ((event: CustomEvent) => {
        this.parentMenuExpanded = event.detail.expanded;
      }) as EventListener;

      parentMenu.addEventListener(
        'cds-side-nav-menu-toggled',
        this._parentMenuToggleListener
      );
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._parentObserver?.disconnect();

    // Remove event listener from parent menu
    if (this._parentMenu && this._parentMenuToggleListener) {
      this._parentMenu.removeEventListener(
        'cds-side-nav-menu-toggled',
        this._parentMenuToggleListener
      );
    }
  }

  firstUpdated() {
    if (this._parentMenu) {
      const expandedValue = (this._parentMenu as any).expanded;
      if (expandedValue !== undefined) {
        this.parentMenuExpanded = expandedValue;
      }
    }
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (this.input) {
      this.input.addEventListener('history-panel-item-input-cancel', () => {
        this.rename = false;
        this.renameInvalid = false;
        this.renameInvalidMessage = '';
      });

      this.input.addEventListener('history-panel-item-input-save', (event) => {
        const newName = (event as CustomEvent).detail.newName;
        this.name = newName;
        this.rename = false;
        this.renameInvalid = false;
        this.renameInvalidMessage = '';
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
      overflowMenuLabel,
      _handleMenuItemClick: handleMenuItemClick,
    } = this;
    const classes = classMap({
      [`cds--side-nav__link`]: true,
      [`cds--side-nav__link--current`]: selected,
    });
    return html`
      ${
        !rename
          ? html` <button class="${classes}">
              <span part="name" class="cds--side-nav__link-text">
                ${name}
              </span>
              <slot name="actions">
                <cds-overflow-menu
                  autoalign
                  align="top-right"
                  menu-alignment="bottom-end"
                  size="sm">
                  ${iconLoader(OverflowMenuVertical16, {
                    class: `${prefix}-aichat--overflow-menu__icon`,
                    slot: 'icon',
                  })}
                  <span slot="tooltip-content">${overflowMenuLabel}</span>
                  <cds-menu @click=${stopMenuClickPropagation}>
                    ${repeat(
                      actions,
                      (action) => action.text,
                      (action) => html`
                        ${
                          action.divider
                            ? html`<cds-menu-item-divider></cds-menu-item-divider>`
                            : nothing
                        }
                        <cds-menu-item
                          label=${action.text}
                          kind=${action.delete ? 'danger' : 'default'}
                          @keydown=${suppressMenuItemSpaceScroll}
                          @click=${() => handleMenuItemClick(action)}>
                          ${
                            action.icon
                              ? html`<span slot="render-icon"
                                  >${action.icon}</span
                                >`
                              : nothing
                          }
                        </cds-menu-item>
                      `
                    )}
                  </cds-menu>
                </cds-overflow-menu>
              </slot>
            </button>`
          : html`
              <cds-aichat-history-panel-item-input
                value="${name}"
                item-id="${id}"
                ?invalid=${this.renameInvalid}
                invalid-message="${this.renameInvalidMessage}"></cds-aichat-history-panel-item-input>
            `
      }
    `;
  }

  static styles = styles;
}

export { CDSAIChatHistoryPanelItem };
export default CDSAIChatHistoryPanelItem;
