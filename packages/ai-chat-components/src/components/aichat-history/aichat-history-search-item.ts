/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { HistoryItemSelectedEventDetail } from './aichat-history-panel-item.js';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { prefix } from '../../globals/settings.js';
import FocusMixin from '@carbon/web-components/es/globals/mixins/focus.js';
import HostListener from '@carbon/web-components/es/globals/decorators/host-listener.js';
import HostListenerMixin from '@carbon/web-components/es/globals/mixins/host-listener.js';
import styles from './chat-history.scss?lit';

/**
 * Chat History search item.
 *
 * @element cds-aichat-history-search-item
 *
 * @fires {CustomEvent<HistoryItemSelectedEventDetail>} history-search-item-selected - The search result is selected.
 */
class CDSAIChatHistorySearchItem extends HostListenerMixin(
  FocusMixin(LitElement)
) {
  static get is() {
    return `${prefix}-aichat-history-search-item`;
  }

  /**
   * Chat item name.
   */
  @property()
  name!: string;

  /**
   * Date associated with chat history item.
   */
  @property({ type: String })
  date?: string;

  /**
   * id of chat history search item
   */
  @property({ type: String })
  id;

  @HostListener('click')
  // @ts-ignore: The decorator refers to this method but TS thinks this method is not referred to
  private _handleClick() {
    // Dispatch a custom event with item details
    const itemActionEvent = new CustomEvent<HistoryItemSelectedEventDetail>(
      'history-search-item-selected',
      {
        bubbles: true,
        composed: true,
        detail: {
          itemId: this.id,
          itemName: this.name,
          element: this,
        },
      }
    );

    this.dispatchEvent(itemActionEvent);
  }

  @HostListener('keydown')
  // @ts-ignore: The decorator refers to this method but TS thinks this method is not referred to
  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._handleClick();
    }
  };

  render() {
    const { name, date } = this;
    const classes = classMap({
      [`cds--side-nav__link`]: true,
    });
    return html`
      <button class="${classes}">
        <span part="name" class="cds--side-nav__link-text">
          <slot>${name}</slot>
        </span>
        <span part="date" class="cds--side-nav__link-subtitle"> ${date} </span>
      </button>
    `;
  }

  static styles = styles;
}

export { CDSAIChatHistorySearchItem };
export default CDSAIChatHistorySearchItem;
