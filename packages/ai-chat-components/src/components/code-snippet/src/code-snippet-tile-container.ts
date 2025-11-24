/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";
import "../../tile-container/index.js";
import "./code-snippet.js";
import "@carbon/web-components/es/components/tile/index.js";
import { defaultLineCountText, type LineCountFormatter } from "./formatters.js";

/**
 * AI Chat code snippet wrapper that places the snippet inside a Carbon tile.
 * Custom element: cds-aichat-code-snippet-tile-container
 */
@carbonElement(`${prefix}-code-snippet-tile-container`)
class CDSAIChatCodeSnippetTileContainer extends LitElement {
  // Forward all properties to the inner component
  @property({ type: String }) language = "";
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) highlight = false;

  // Internal property - theme will be auto-detected in the future
  @property({ attribute: false }) dark = false;

  @property({ attribute: "copy-text" })
  copyText = "";

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property()
  feedback = "Copied!";

  @property({ type: Number, attribute: "feedback-timeout" })
  feedbackTimeout = 2000;

  @property({ type: Boolean, reflect: true, attribute: "hide-copy-button" })
  hideCopyButton = false;

  @property()
  maxCollapsedNumberOfRows = 15;

  @property({ attribute: "show-less-text" })
  showLessText = "Show less";

  @property({ attribute: "show-more-text" })
  showMoreText = "Show more";

  @property({ attribute: "tooltip-content" })
  tooltipContent = "Copy to clipboard";

  @property({ type: Boolean, reflect: true, attribute: "wrap-text" })
  wrapText = false;

  @property({ attribute: false })
  getLineCountText: LineCountFormatter = defaultLineCountText;

  /**
   * Handles the content-change event from the inner code snippet and re-dispatches it.
   */
  private _handleContentChange(event: CustomEvent) {
    this.dispatchEvent(
      new CustomEvent("content-change", {
        detail: event.detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <cds-aichat-tile-container>
        <cds-tile data-rounded>
          <div data-flush data-rounded>
            <cds-aichat-code-snippet
              data-rounded
              language=${this.language}
              ?editable=${this.editable}
              ?highlight=${this.highlight}
              @content-change=${this._handleContentChange}
              copy-text=${this.copyText}
              ?disabled=${this.disabled}
              feedback=${this.feedback}
              feedback-timeout=${this.feedbackTimeout}
              ?hide-copy-button=${this.hideCopyButton}
              max-collapsed-number-of-rows=${this.maxCollapsedNumberOfRows}
              .getLineCountText=${this.getLineCountText}
              show-less-text=${this.showLessText}
              show-more-text=${this.showMoreText}
              tooltip-content=${this.tooltipContent}
              ?wrap-text=${this.wrapText}
            >
              <slot></slot>
            </cds-aichat-code-snippet>
          </div>
        </cds-tile>
      </cds-aichat-tile-container>
    `;
  }
}

export default CDSAIChatCodeSnippetTileContainer;
