/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import prefix from "../../../globals/settings.js";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import CDSSideNav from "@carbon/web-components/es/components/ui-shell/side-nav.js";

import styles from "./chat-history.scss?lit";

/**
 * Chat History panel.
 *
 * @element cds-aichat-history-panel
 *
 */
@carbonElement(`${prefix}-history-panel`)
export class CDSHistoryPanel extends CDSSideNav {
  /**
   * Sets default property from side nav
   */
  @property({ type: Boolean, attribute: "is-not-child-of-header" })
  isNotChildOfHeader = true;

  /**
   * Sets default property from side nav
   */
  @property({ type: Boolean })
  expanded = true;

  connectedCallback() {
    this.setAttribute("collapse-mode", "fixed");
    super.connectedCallback();
  }

  static styles = styles;
}

export default CDSHistoryPanel;
