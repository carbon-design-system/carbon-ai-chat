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
class CDSAIChatHistoryContent extends LitElement {
  /**
   * Sets default slot value to content
   */
  @property({ type: String, reflect: true })
  slot = "content";

  /**
   * Label to display before the results count
   */
  @property({ type: String, attribute: "results-label" })
  resultsLabel = "Results";

  /**
   * The results count to display
   */
  @property({ type: Number, attribute: "results-count" })
  resultsCount?: number;

  render() {
    const displayText =
      this.resultsCount !== undefined && this.resultsLabel
        ? `${this.resultsLabel}: ${this.resultsCount}`
        : this.resultsCount;

    return html`
      <div class="${prefix}--history-content__container" aria-live="polite">
        ${this.resultsCount !== undefined
          ? html`<span class="${prefix}--history-content__results-count">
              ${displayText}
            </span>`
          : ""}
      </div>
      <slot></slot>
    `;
  }

  static styles = styles;
}

export { CDSAIChatHistoryContent };
export default CDSAIChatHistoryContent;
