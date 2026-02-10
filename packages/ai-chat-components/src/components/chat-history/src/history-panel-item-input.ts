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
import Checkmark16 from "@carbon/icons/es/checkmark/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";

import styles from "./chat-history.scss?lit";

/**
 * Chat History panel item input.
 *
 * @element cds-aichat-history-panel-item-input
 *
 */
@carbonElement(`${prefix}-history-panel-item-input`)
export class CDSHistoryPanelItemInput extends LitElement {
  /**
   * Chat history item title.
   */
  @property()
  title!: string;

  render() {
    const { title } = this;
    const classes = classMap({
      [`cds--side-nav__link`]: true,
      [`cds--side-nav__link--current`]: true,
      [`${prefix}--history-panel-item--rename`]: true,
    });

    return html`
      <div class="${classes}">
        <div class="${prefix}--history-panel-item--rename__input">
          <input type="text" value="${title}"></input>
          <div class="${prefix}--history-panel-item--rename__actions">
            <cds-icon-button size='sm' kind="ghost">
              ${iconLoader(Close16, {
                slot: "icon",
              })}
              <span slot="tooltip-content">Cancel</span>
            </cds-icon-button>
            <cds-icon-button size='sm' kind="ghost">
              ${iconLoader(Checkmark16, {
                slot: "icon",
              })}
              <span slot="tooltip-content">Save</span>
            </cds-icon-button>
          </div>
        </div>
      </div>`;
  }
  static styles = styles;
}

export default CDSHistoryPanelItemInput;
