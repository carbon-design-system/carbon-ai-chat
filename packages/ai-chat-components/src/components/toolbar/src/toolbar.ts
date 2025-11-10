/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
// @ts-ignore
import styles from "./toolbar.scss?lit";
import prefix from "../../../globals/settings.js";

/**
 *  Toolbar.
 *
 * @element cds-aichat-toolbar
 *
 * @slot action - Represents the action area in the Toolbar.
 * @slot title - Represents the title area in the Toolbar.
 *
 */
@customElement(`${prefix}-toolbar`)
class CDSAIChatToolbar extends LitElement {
  static styles = styles;

  render() {
    return html`
      <div class="${prefix}-toolbar__navigation">
        <slot name="navigation"></slot>
      </div>
      <div class="${prefix}-toolbar__title">
        <slot name="title"></slot>
      </div>
      <div class="${prefix}-toolbar__action">
        <slot name="action"></slot>
      </div>
    `;
  }
}

export default CDSAIChatToolbar;
