/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { property } from 'lit/decorators.js';
import { PropertyValues } from 'lit';
import { CHAT_BUTTON_SIZE } from '../defs';
import {
  BUTTON_KIND as CHAT_BUTTON_KIND,
  BUTTON_TYPE as CHAT_BUTTON_TYPE,
  BUTTON_TOOLTIP_ALIGNMENT as CHAT_BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TOOLTIP_POSITION as CHAT_BUTTON_TOOLTIP_POSITION,
} from '@carbon/web-components/es/components/button/button.js';
import CDSButton from '@carbon/web-components/es/components/button/button.js';
import { carbonElement } from '../../../globals/decorators/index.js';
import prefix from '../../../globals/settings.js';
import commonStyles from '../../../globals/scss/common.scss?lit';
import styles from './chat-button.scss?lit';

export {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_TYPE,
  CHAT_BUTTON_SIZE,
  CHAT_BUTTON_TOOLTIP_ALIGNMENT,
  CHAT_BUTTON_TOOLTIP_POSITION,
};

export type ChatButtonSize =
  CHAT_BUTTON_SIZE.SMALL | CHAT_BUTTON_SIZE.MEDIUM | CHAT_BUTTON_SIZE.LARGE;

/**
 * Component extending the @carbon/web-components' button
 *
 * @element cds-aichat-button
 */
@carbonElement(`${prefix}-button`)
class CDSAIChatButton extends CDSButton {
  static styles = [commonStyles, styles];

  /**
   * Specify whether the `ChatButton` should be rendered as a quick action button
   */
  @property({ type: Boolean, attribute: 'is-quick-action' })
  isQuickAction = false;

  // Blocks programmatic el.click() when isSelected — `inert` only blocks user
  // input, not programmatic calls. Registered manually (not via @HostListener)
  // to avoid mutating the shared CDSButton._hostListeners table.
  private readonly _handleSelectedClick = (e: Event): void => {
    if (this.isSelected) {
      e.stopImmediatePropagation();
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._handleSelectedClick, {
      capture: true,
    });
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this._handleSelectedClick, {
      capture: true,
    });
    super.disconnectedCallback();
  }

  /**
   * Button size.
   * Options: "sm", "md", "lg".
   */
  @property({ reflect: true, attribute: 'size' })
  declare size: ChatButtonSize;

  /**
   * @internal
   */
  private readonly allowedSizes: CHAT_BUTTON_SIZE[] = [
    CHAT_BUTTON_SIZE.SMALL,
    CHAT_BUTTON_SIZE.MEDIUM,
    CHAT_BUTTON_SIZE.LARGE,
  ];

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (
      changedProps.has('isQuickAction') ||
      changedProps.has('isSelected') ||
      changedProps.has('disabled') ||
      changedProps.has('size') ||
      changedProps.has('kind')
    ) {
      this._normalizeButtonState(changedProps);
    }
  }

  private _normalizeButtonState(changedProps: PropertyValues<this>): void {
    if (this.isQuickAction) {
      this.size = CHAT_BUTTON_SIZE.SMALL;
      if (!changedProps.has('kind')) {
        this.kind = CHAT_BUTTON_KIND.GHOST;
      }

      // When isSelected, set the HTML `inert` attribute on the host element to
      // block pointer and keyboard interaction. This leaves `this.disabled`
      // untouched so it always reflects exactly what the consumer set.
      // tabIndex is also set explicitly — `inert` alone doesn't update it.
      const isBlocked = this.isSelected || this.disabled;
      this.inert = this.isSelected;
      this.tabIndex = isBlocked ? -1 : 0;
      this.toggleAttribute('data-is-selected', this.isSelected);

      return;
    }

    if (!this.allowedSizes.includes(this.size as CHAT_BUTTON_SIZE)) {
      this.size = CHAT_BUTTON_SIZE.LARGE;
    }

    if (
      !Object.values(CHAT_BUTTON_KIND).includes(this.kind as CHAT_BUTTON_KIND)
    ) {
      this.kind = CHAT_BUTTON_KIND.PRIMARY;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-button': CDSAIChatButton;
  }
}

export { CDSAIChatButton };
export default CDSAIChatButton;
