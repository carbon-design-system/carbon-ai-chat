/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import '../../card/src/card.js';
import '../../card/src/card-footer.js';
import '../../card/src/card-steps.js';
import './code-snippet.js';
import { defaultLineCountText } from './formatters.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * AI Chat code snippet wrapper that places the snippet inside a Carbon tile.
 *
 * @element cds-aichat-code-snippet-card
 */
let CDSAIChatCodeSnippetCard = class CDSAIChatCodeSnippetCard extends LitElement {
    constructor() {
        super(...arguments);
        /** Language used for syntax highlighting. */
        this.language = "";
        /** Whether the snippet should be editable. */
        this.editable = false;
        /** Whether to enable syntax highlighting. */
        this.highlight = false;
        /** Fallback language to use when detection fails. */
        this.defaultLanguage = "javascript";
        /** Text to copy when clicking the copy button. Defaults to slotted content. */
        this.copyText = "";
        /** Disable interactions on the snippet. */
        this.disabled = false;
        /** Feedback text shown after copy. */
        this.feedback = "Copied!";
        /** Duration (ms) to show feedback text. */
        this.feedbackTimeout = 2000;
        /** Hide the copy button. */
        this.hideCopyButton = false;
        /** Maximum rows to show when collapsed. */
        this.maxCollapsedNumberOfRows = 15;
        /** Maximum rows to show when expanded (0 = unlimited). */
        this.maxExpandedNumberOfRows = 0;
        /** Minimum rows to show when collapsed. */
        this.minCollapsedNumberOfRows = 3;
        /** Minimum rows to show when expanded. */
        this.minExpandedNumberOfRows = 16;
        /** Label for the “show less” control. */
        this.showLessText = "Show less";
        /** Label for the “show more” control. */
        this.showMoreText = "Show more";
        /** Tooltip label for the copy action. */
        this.tooltipContent = "Copy to clipboard";
        /** Wrap text instead of horizontal scrolling. */
        this.wrapText = false;
        /** Label for folding/collapsing code. */
        this.foldCollapseLabel = "Collapse code block";
        /** Label for unfolding/expanding code. */
        this.foldExpandLabel = "Expand code block";
        /** Formatter for the line count display. */
        this.getLineCountText = defaultLineCountText;
    }
    /**
     * Handles the content-change event from the inner code snippet and re-dispatches it.
     */
    _handleContentChange(event) {
        this.dispatchEvent(new CustomEvent("content-change", {
            detail: event.detail,
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        return html `
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
};
__decorate([
    property({ type: String })
], CDSAIChatCodeSnippetCard.prototype, "language", void 0);
__decorate([
    property({ type: Boolean })
], CDSAIChatCodeSnippetCard.prototype, "editable", void 0);
__decorate([
    property({ type: Boolean })
], CDSAIChatCodeSnippetCard.prototype, "highlight", void 0);
__decorate([
    property({ type: String, attribute: "default-language" })
], CDSAIChatCodeSnippetCard.prototype, "defaultLanguage", void 0);
__decorate([
    property({ attribute: "copy-text" })
], CDSAIChatCodeSnippetCard.prototype, "copyText", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], CDSAIChatCodeSnippetCard.prototype, "disabled", void 0);
__decorate([
    property()
], CDSAIChatCodeSnippetCard.prototype, "feedback", void 0);
__decorate([
    property({ type: Number, attribute: "feedback-timeout" })
], CDSAIChatCodeSnippetCard.prototype, "feedbackTimeout", void 0);
__decorate([
    property({ type: Boolean, reflect: true, attribute: "hide-copy-button" })
], CDSAIChatCodeSnippetCard.prototype, "hideCopyButton", void 0);
__decorate([
    property({ attribute: "max-collapsed-number-of-rows" })
], CDSAIChatCodeSnippetCard.prototype, "maxCollapsedNumberOfRows", void 0);
__decorate([
    property({ attribute: "max-expanded-number-of-rows" })
], CDSAIChatCodeSnippetCard.prototype, "maxExpandedNumberOfRows", void 0);
__decorate([
    property({ attribute: "min-collapsed-number-of-rows" })
], CDSAIChatCodeSnippetCard.prototype, "minCollapsedNumberOfRows", void 0);
__decorate([
    property({ attribute: "min-expanded-number-of-rows" })
], CDSAIChatCodeSnippetCard.prototype, "minExpandedNumberOfRows", void 0);
__decorate([
    property({ attribute: "show-less-text" })
], CDSAIChatCodeSnippetCard.prototype, "showLessText", void 0);
__decorate([
    property({ attribute: "show-more-text" })
], CDSAIChatCodeSnippetCard.prototype, "showMoreText", void 0);
__decorate([
    property({ attribute: "tooltip-content" })
], CDSAIChatCodeSnippetCard.prototype, "tooltipContent", void 0);
__decorate([
    property({ type: Boolean, reflect: true, attribute: "wrap-text" })
], CDSAIChatCodeSnippetCard.prototype, "wrapText", void 0);
__decorate([
    property({ attribute: "fold-collapse-label" })
], CDSAIChatCodeSnippetCard.prototype, "foldCollapseLabel", void 0);
__decorate([
    property({ attribute: "fold-expand-label" })
], CDSAIChatCodeSnippetCard.prototype, "foldExpandLabel", void 0);
__decorate([
    property({ attribute: false })
], CDSAIChatCodeSnippetCard.prototype, "getLineCountText", void 0);
CDSAIChatCodeSnippetCard = __decorate([
    carbonElement("cds-aichat-code-snippet-card")
], CDSAIChatCodeSnippetCard);
var CDSAIChatCodeSnippetCard$1 = CDSAIChatCodeSnippetCard;

export { CDSAIChatCodeSnippetCard, CDSAIChatCodeSnippetCard$1 as default };
//# sourceMappingURL=code-snippet-card.js.map
