/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import prefix from "../../../globals/settings.js";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";

import styles from "./chat-history.scss?lit";

/**
 * Chat History Content.
 *
 * @element cds-aichat-history-content
 *
 */
@carbonElement(`${prefix}-history-content`)
export class CDSHistoryContent extends LitElement {
  /**
   * Sets default slot value to content
   */
  @property({ type: String, reflect: true })
  slot = "content";

  render() {
    return html` <span class="${prefix}--history-content__results-count">
        <slot name="results-count"></slot>
      </span>
      <slot></slot>`;
  }

  static styles = styles;
}

export default CDSHistoryContent;
