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
import "@carbon/web-components/es/components/skeleton-text/skeleton-text.js";

import styles from "./chat-history.scss?lit";

/**
 * Chat History loading state.
 *
 * @element cds-aichat-history-loading
 *
 */
@carbonElement(`${prefix}-history-loading`)
export class CDSHistoryLoading extends LitElement {
  /**
   * Sets default slot value to content
   */
  @property({ type: String, reflect: true })
  slot = "content";

  render() {
    return html` <div class="${prefix}--history-loading__results">
        <cds-skeleton-text width="60%"></cds-skeleton-text>
        <cds-skeleton-text width="60%"></cds-skeleton-text>
        <cds-skeleton-text width="60%"></cds-skeleton-text>
        <cds-skeleton-text width="60%"></cds-skeleton-text>
      </div>

      <cds-skeleton-text paragraph lineCount="2"> </cds-skeleton-text>
      <cds-skeleton-text paragraph lineCount="2"> </cds-skeleton-text>
      <cds-skeleton-text paragraph lineCount="2"> </cds-skeleton-text>
      <cds-skeleton-text paragraph lineCount="2"> </cds-skeleton-text>`;
  }

  static styles = styles;
}

export default CDSHistoryLoading;
