/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement } from 'lit';
import { property, state } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import styles from './markdown.scss.js';
import throttle from 'lodash-es/throttle.js';
import { createRef } from 'lit/directives/ref.js';
import { markdownToTokenTree } from './markdown-token-tree.js';
import { renderTokenTree } from './markdown-renderer.js';
import { consoleError } from './utils.js';
import { markdownTemplate } from './markdown.template.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
let CDSAIChatMarkdown = class CDSAIChatMarkdown extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * Sanitize any HTML included in the markdown. e.g. remove script tags, onclick handlers, etc.
         */
        this.sanitizeHTML = false;
        /**
         * Remove all HTML from included markdown.
         */
        this.removeHTML = false;
        /**
         * If you are actively streaming, setting this to true can help prevent needless UI thrashing when writing
         * complex components (like a sortable and filterable table).
         */
        this.streaming = false;
        /**
         * Enable syntax highlighting for any code fence blocks.
         */
        this.highlight = true;
        // Table strings
        /** Placeholder text for table filters. */
        this.filterPlaceholderText = "Filter table...";
        /** Label for the previous page control in tables. */
        this.previousPageText = "Previous page";
        /** Label for the next page control in tables. */
        this.nextPageText = "Next page";
        /** Label for the items-per-page control in tables. */
        this.itemsPerPageText = "Items per page:";
        /** Label for download of CSV of table data. */
        this.downloadLabelText = "Download table data";
        /** Locale used for table pagination and formatting. */
        this.locale = "en";
        // Code snippet strings
        /** Feedback text shown after copying code blocks. */
        this.feedback = "Copied!";
        /** Label for collapsing long code blocks. */
        this.showLessText = "Show less";
        /** Label for expanding long code blocks. */
        this.showMoreText = "Show more";
        /** Tooltip content for the copy action on code blocks. */
        this.tooltipContent = "Copy code";
        /**
         * @internal
         */
        this.needsReparse = false;
        /**
         * @internal
         */
        this.contentSlot = createRef();
        /**
         * @internal
         */
        this._slottedMarkdown = "";
        /**
         * Tracks the latest asynchronous rendering work so callers waiting on `updateComplete` know when throttled updates are done.
         *
         * @internal
         */
        this.renderTask = null;
        /**
         * @internal
         */
        this.tokenTree = {
            key: "root",
            token: {
                type: "root",
                tag: "",
                nesting: 0,
                level: 0,
                content: "",
                attrs: null,
                children: null,
                markup: "",
                block: true,
                hidden: false,
                map: null,
                info: "",
                meta: null,
            },
            children: [],
        };
        /**
         * @internal
         */
        this.renderedContent = null;
        /**
         * Throttled function that updates the rendered content.
         * If needsReparse is true, parses markdown into a token tree first.
         * Otherwise, just re-renders the existing token tree with current settings.
         *
         * @internal
         */
        this.renderMarkdown = async () => {
            try {
                if (this.needsReparse) {
                    // First, we take the markdown we were given and use the markdown-it parser to turn is into a tree we can
                    // transform into Lit components and compare smartly to avoid re-renders of components that were already
                    // rendered when the markdown is updated (likely by streaming, but possibly by an edit somewhere in the
                    // middle). It takes the current tokenTree as an argument for quick diffing to avoid re-creating parts
                    // of the tree.
                    this.tokenTree = markdownToTokenTree(this._slottedMarkdown, this.tokenTree, !this.removeHTML);
                    this.needsReparse = false;
                }
                // Next we take that tree and transform it into Lit content to be rendered into the template.
                // this.renderedContent is what is rendered in the template directly.
                this.renderedContent = renderTokenTree(this.tokenTree, {
                    sanitize: this.sanitizeHTML,
                    streaming: this.streaming,
                    highlight: this.highlight,
                    // Table strings
                    filterPlaceholderText: this.filterPlaceholderText,
                    previousPageText: this.previousPageText,
                    nextPageText: this.nextPageText,
                    itemsPerPageText: this.itemsPerPageText,
                    downloadLabelText: this.downloadLabelText,
                    locale: this.locale,
                    getPaginationSupplementalText: this.getPaginationSupplementalText,
                    getPaginationStatusText: this.getPaginationStatusText,
                    // Code snippet strings
                    feedback: this.feedback,
                    showLessText: this.showLessText,
                    showMoreText: this.showMoreText,
                    tooltipContent: this.tooltipContent,
                    getLineCountText: this.getLineCountText,
                });
            }
            catch (error) {
                consoleError("Failed to parse markdown", error);
            }
        };
        /**
         * @internal
         */
        this.scheduleRender = throttle(() => {
            // Lit's getter/setter pipeline can schedule multiple renders quickly.
            // We capture the active render promise so we can report completion later.
            const task = this.renderMarkdown();
            const trackedTask = task.finally(() => {
                if (this.renderTask === trackedTask) {
                    this.renderTask = null;
                }
            });
            this.renderTask = trackedTask;
            return trackedTask;
        }, 150);
    }
    connectedCallback() {
        super.connectedCallback();
        this.needsReparse = true;
        this.scheduleRender();
        this._syncMarkdownFromLightDom();
        this.mutationObserver = new MutationObserver(() => {
            this._syncMarkdownFromLightDom();
        });
        this.mutationObserver.observe(this, {
            childList: true,
            characterData: true,
            subtree: true,
        });
    }
    disconnectedCallback() {
        this.mutationObserver?.disconnect();
        this.mutationObserver = undefined;
        super.disconnectedCallback();
    }
    willUpdate(changed) {
        if (changed.has("removeHTML")) {
            // Properties that affect token tree structure require full reparse
            // - removeHTML: changes which parser is used (html: true vs false)
            this.needsReparse = true;
            this.scheduleRender();
        }
        else if (
        // Properties that only affect rendering can skip reparsing
        // - sanitizeHTML: applies DOMPurify during render, doesn't change tokens
        // - string properties: change translated strings in rendered output
        // - streaming: affects loading states in rendered output
        changed.has("sanitizeHTML") ||
            changed.has("streaming") ||
            changed.has("filterPlaceholderText") ||
            changed.has("previousPageText") ||
            changed.has("nextPageText") ||
            changed.has("itemsPerPageText") ||
            changed.has("downloadLabelText") ||
            changed.has("locale") ||
            changed.has("getPaginationSupplementalText") ||
            changed.has("getPaginationStatusText") ||
            changed.has("feedback") ||
            changed.has("showLessText") ||
            changed.has("showMoreText") ||
            changed.has("tooltipContent") ||
            changed.has("getLineCountText")) {
            this.scheduleRender();
        }
    }
    /**
     * Reads slotted text content and uses it as the markdown source when provided.
     */
    _syncMarkdownFromLightDom() {
        const slotEl = this.contentSlot.value;
        let content = "";
        if (slotEl) {
            content = slotEl
                .assignedNodes({ flatten: true })
                .map((node) => ("textContent" in node ? node.textContent || "" : ""))
                .join("")
                .trim();
        }
        else if (this.childNodes.length) {
            // Fallback before the slot is stamped
            content = Array.from(this.childNodes)
                .map((node) => ("textContent" in node ? node.textContent || "" : ""))
                .join("")
                .trim();
        }
        if (content && content !== this._slottedMarkdown) {
            this._slottedMarkdown = content;
            this.needsReparse = true;
            this.scheduleRender();
        }
    }
    firstUpdated() {
        this._syncMarkdownFromLightDom();
    }
    async getUpdateComplete() {
        // `updateComplete` is Lit's public hook for consumers/tests to await
        // all pending work. Because we throttle renders, the base implementation
        // might resolve before the throttled callback runs. Overriding this
        // method lets us flush the throttle and await the render promise so
        // callers can reliably wait for `renderedContent` to update.
        const result = await super.getUpdateComplete();
        const flushResult = this.scheduleRender.flush?.();
        if (flushResult instanceof Promise) {
            await flushResult;
        }
        if (this.renderTask) {
            await this.renderTask;
        }
        return result;
    }
    render() {
        const { renderedContent } = this;
        return markdownTemplate({
            slotRef: this.contentSlot,
            onSlotChange: () => this._syncMarkdownFromLightDom(),
            renderedContent,
        });
    }
};
CDSAIChatMarkdown.styles = styles;
__decorate([
    property({ type: Boolean, attribute: "sanitize-html" })
], CDSAIChatMarkdown.prototype, "sanitizeHTML", void 0);
__decorate([
    property({ type: Boolean, attribute: "remove-html" })
], CDSAIChatMarkdown.prototype, "removeHTML", void 0);
__decorate([
    property({ type: Boolean, attribute: "streaming" })
], CDSAIChatMarkdown.prototype, "streaming", void 0);
__decorate([
    property({ type: Boolean, attribute: "highlight" })
], CDSAIChatMarkdown.prototype, "highlight", void 0);
__decorate([
    property({ type: String, attribute: "filter-placeholder-text" })
], CDSAIChatMarkdown.prototype, "filterPlaceholderText", void 0);
__decorate([
    property({ type: String, attribute: "previous-page-text" })
], CDSAIChatMarkdown.prototype, "previousPageText", void 0);
__decorate([
    property({ type: String, attribute: "next-page-text" })
], CDSAIChatMarkdown.prototype, "nextPageText", void 0);
__decorate([
    property({ type: String, attribute: "items-per-page-text" })
], CDSAIChatMarkdown.prototype, "itemsPerPageText", void 0);
__decorate([
    property({ type: String, attribute: "download-label-text" })
], CDSAIChatMarkdown.prototype, "downloadLabelText", void 0);
__decorate([
    property({ type: String, attribute: "locale" })
], CDSAIChatMarkdown.prototype, "locale", void 0);
__decorate([
    property({ type: Object, attribute: false })
], CDSAIChatMarkdown.prototype, "getPaginationSupplementalText", void 0);
__decorate([
    property({ type: Object, attribute: false })
], CDSAIChatMarkdown.prototype, "getPaginationStatusText", void 0);
__decorate([
    property({ type: String, attribute: "feedback" })
], CDSAIChatMarkdown.prototype, "feedback", void 0);
__decorate([
    property({ type: String, attribute: "show-less-text" })
], CDSAIChatMarkdown.prototype, "showLessText", void 0);
__decorate([
    property({ type: String, attribute: "show-more-text" })
], CDSAIChatMarkdown.prototype, "showMoreText", void 0);
__decorate([
    property({ type: String, attribute: "tooltip-content" })
], CDSAIChatMarkdown.prototype, "tooltipContent", void 0);
__decorate([
    property({ type: Object, attribute: false })
], CDSAIChatMarkdown.prototype, "getLineCountText", void 0);
__decorate([
    state()
], CDSAIChatMarkdown.prototype, "tokenTree", void 0);
__decorate([
    state()
], CDSAIChatMarkdown.prototype, "renderedContent", void 0);
CDSAIChatMarkdown = __decorate([
    carbonElement("cds-aichat-markdown")
], CDSAIChatMarkdown);
var CDSAIChatMarkdown$1 = CDSAIChatMarkdown;

export { CDSAIChatMarkdown, CDSAIChatMarkdown$1 as default };
//# sourceMappingURL=markdown.js.map
