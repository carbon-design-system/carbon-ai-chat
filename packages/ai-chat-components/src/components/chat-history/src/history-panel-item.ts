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
import { repeat } from "lit/directives/repeat.js";
import { classMap } from "lit/directives/class-map.js";
import prefix from "../../../globals/settings.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import FocusMixin from "@carbon/web-components/es/globals/mixins/focus.js";
import { CarbonIcon } from "@carbon/web-components/es/globals/internal/icon-loader-utils.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import "@carbon/web-components/es/components/overflow-menu/index.js";

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
export class CDSHistoryPanelItem extends FocusMixin(LitElement) {
  /**
   * `true` if the menu item should be active.
   */
  @property({ type: Boolean, reflect: true })
  active = false;

  /**
   * Chat history item title.
   */
  @property()
  title!: string;

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

  render() {
    const { active, title, actions } = this;
    const classes = classMap({
      [`cds--side-nav__link`]: true,
      [`cds--side-nav__link--current`]: active,
    });
    return html`
      <button class="${classes}">
        <span part="title" class="cds--side-nav__link-text">
          <slot>${title}</slot>
        </span>
        <slot name="actions">
          <cds-overflow-menu size="sm">
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
                    @click=${action.onClick}
                    >${action.text}${action.icon}</cds-overflow-menu-item
                  >`,
              )}
            </cds-overflow-menu-body>
          </cds-overflow-menu>
        </slot>
      </button>
    `;
  }

  static styles = styles;
}

export default CDSHistoryPanelItem;
