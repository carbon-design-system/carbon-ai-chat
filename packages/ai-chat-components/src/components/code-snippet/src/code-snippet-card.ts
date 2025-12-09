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
import "../../card/index.js";
import "./code-snippet.js";
import { defaultLineCountText, type LineCountFormatter } from "./formatters.js";

/**
 * AI Chat code snippet wrapper that places the snippet inside a Carbon tile.
 *
 * @element cds-aichat-code-snippet-card
 */
@carbonElement("cds-aichat-code-snippet-card")
class CDSAIChatCodeSnippetCard extends LitElement {
  /** Language used for syntax highlighting. */
  @property({ type: String }) language = "";

  /** Whether the snippet should be editable. */
  @property({ type: Boolean }) editable = false;

  /** Whether to enable syntax highlighting. */
  @property({ type: Boolean }) highlight = false;

  /** Fallback language to use when detection fails. */
  @property({ type: String, attribute: "default-language" })
  defaultLanguage = "javascript";

  /** Text to copy when clicking the copy button. Defaults to slotted content. */
  @property({ attribute: "copy-text" })
  copyText = "";

  /** Disable interactions on the snippet. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Feedback text shown after copy. */
  @property()
  feedback = "Copied!";

  /** Duration (ms) to show feedback text. */
  @property({ type: Number, attribute: "feedback-timeout" })
  feedbackTimeout = 2000;

  /** Hide the copy button. */
  @property({ type: Boolean, reflect: true, attribute: "hide-copy-button" })
  hideCopyButton = false;

  /** Maximum rows to show when collapsed. */
  @property({ attribute: "max-collapsed-number-of-rows" })
  maxCollapsedNumberOfRows = 15;

  /** Maximum rows to show when expanded (0 = unlimited). */
  @property({ attribute: "max-expanded-number-of-rows" })
  maxExpandedNumberOfRows = 0;

  /** Minimum rows to show when collapsed. */
  @property({ attribute: "min-collapsed-number-of-rows" })
  minCollapsedNumberOfRows = 3;

  /** Minimum rows to show when expanded. */
  @property({ attribute: "min-expanded-number-of-rows" })
  minExpandedNumberOfRows = 16;

  /** Label for the “show less” control. */
  @property({ attribute: "show-less-text" })
  showLessText = "Show less";

  /** Label for the “show more” control. */
  @property({ attribute: "show-more-text" })
  showMoreText = "Show more";

  /** Tooltip label for the copy action. */
  @property({ attribute: "tooltip-content" })
  tooltipContent = "Copy to clipboard";

  /** Wrap text instead of horizontal scrolling. */
  @property({ type: Boolean, reflect: true, attribute: "wrap-text" })
  wrapText = false;

  /** Label for folding/collapsing code. */
  @property({ attribute: "fold-collapse-label" })
  foldCollapseLabel = "Collapse code block";

  /** Label for unfolding/expanding code. */
  @property({ attribute: "fold-expand-label" })
  foldExpandLabel = "Expand code block";

  /** Formatter for the line count display. */
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
      <cds-aichat-card>
        <div slot="body">
          <cds-aichat-code-snippet
            data-rounded
            language=${this.language}
            default-language=${this.defaultLanguage}
            ?editable=${this.editable}
            ?highlight=${this.highlight}
            @content-change=${this._handleContentChange}
            copy-text=${this.copyText}
            ?disabled=${this.disabled}
            feedback=${this.feedback}
            feedback-timeout=${this.feedbackTimeout}
            ?hide-copy-button=${this.hideCopyButton}
            max-collapsed-number-of-rows=${this.maxCollapsedNumberOfRows}
            max-expanded-number-of-rows=${this.maxExpandedNumberOfRows}
            min-collapsed-number-of-rows=${this.minCollapsedNumberOfRows}
            min-expanded-number-of-rows=${this.minExpandedNumberOfRows}
            .getLineCountText=${this.getLineCountText}
            show-less-text=${this.showLessText}
            show-more-text=${this.showMoreText}
            tooltip-content=${this.tooltipContent}
            ?wrap-text=${this.wrapText}
            fold-collapse-label=${this.foldCollapseLabel}
            fold-expand-label=${this.foldExpandLabel}
          >
            <slot></slot>
          </cds-aichat-code-snippet>
        </div>
      </cds-aichat-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-code-snippet-card": CDSAIChatCodeSnippetCard;
  }
}

export { CDSAIChatCodeSnippetCard };
export default CDSAIChatCodeSnippetCard;
