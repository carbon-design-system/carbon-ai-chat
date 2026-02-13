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
import FocusMixin from "@carbon/web-components/es/globals/mixins/focus.js";
import styles from "./chat-history.scss?lit";

/**
 * Chat History search item.
 *
 * @element cds-aichat-history-search-item
 *
 */
@carbonElement(`${prefix}-history-search-item`)
export class CDSHistorySearchItem extends FocusMixin(LitElement) {
  /**
   * Chat item title.
   */
  @property()
  title!: string;

  /**
   * Date associated with chat history item.
   */
  @property({ type: String })
  date?: string;

  render() {
    const { title, date } = this;
    const classes = classMap({
      [`cds--side-nav__link`]: true,
    });
    return html`
      <button class="${classes}">
        <span part="title" class="cds--side-nav__link-text">
          <slot>${title}</slot>
        </span>
        <span part="date" class="cds--side-nav__link-subtitle"> ${date} </span>
      </button>
    `;
  }

  static styles = styles;
}

export default CDSHistorySearchItem;
