/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import prefix from "../../../globals/settings.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";

import styles from "./chat-history.scss?lit";

/**
 * Chat History panel item.
 *
 * @element cds-aichat-history-panel-item
 *
 */
@carbonElement(`${prefix}-history-panel-item`)
export class CDSHistoryPanelItem extends LitElement {
  /**
   * `true` if the menu item should be active.
   */
  @property({ type: Boolean, reflect: true })
  active = false;

  /**
   * The title.
   */
  @property()
  title!: string;

  render() {
    const { active, title } = this;
    const classes = classMap({
      [`cds--side-nav__link`]: true,
      [`cds--side-nav__link--current`]: active,
    });
    return html`
      <button class="${classes}">
        <span part="title" class="cds--side-nav__link-text">
          <slot>${title}</slot>
        </span>
        <slot name="actions"></slot>
      </button>
    `;
  }

  static styles = styles;
}

export default CDSHistoryPanelItem;
