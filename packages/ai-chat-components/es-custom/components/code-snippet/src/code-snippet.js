/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { createRef, ref } from 'lit/directives/ref.js';
import ChevronDown16 from '@carbon/icons/es/chevron--down/16.js';
import FocusMixin from '@carbon/web-components/es-custom/globals/mixins/focus.js';
import { iconLoader } from '@carbon/web-components/es-custom/globals/internal/icon-loader.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import { observeResize } from './dom-utils.js';
import { buildContainerStyles, evaluateShowMoreButton } from './layout-utils.js';
import { StreamingManager } from './streaming-manager.js';
import { defaultLineCountText } from './formatters.js';
import { Compartment } from '@codemirror/state';
import { loadCodeMirrorRuntime } from './codemirror/codemirror-loader.js';
import '@carbon/web-components/es-custom/components/skeleton-text/index.js';
import styles from './code-snippet.scss.js';
import '@carbon/web-components/es-custom/components/copy-button/index.js';
import '@carbon/web-components/es-custom/components/copy/copy.js';
import '@carbon/web-components/es-custom/components/button/button.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * AI Chat code snippet orchestrator that keeps CodeMirror in sync with streamed slot content,
 * automatically detects and loads language highlighting, and optionally exposes an editable surface
 * with live language re-detection and change notifications.
 */
let CDSAIChatCodeSnippet = class CDSAIChatCodeSnippet extends FocusMixin(LitElement) {
    constructor() {
        super();
        // CodeMirror properties
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
        /**
         * The function used to format the line count text.
         * Receives the line count and returns a formatted string.
         * Defaults to `${count} lines` in en-US.
         */
        this.getLineCountText = defaultLineCountText;
        /**
         * @internal
         */
        this._slottedContent = "";
        /**
         * @internal
         */
        this._detectedLanguage = null;
        /**
         * @internal
         */
        this._languageLabelLockedIn = false;
        /**
         * @internal
         */
        this._lineCount = null;
        /**
         * @internal
         */
        this._isEditorLoading = true;
        /**
         * @internal
         */
        this._expandedCode = false;
        /**
         * @internal
         */
        this._shouldShowMoreLessBtn = false;
        /**
         * @internal
         */
        this._hObserveResize = null;
        /**
         * @internal
         */
        this._rowHeightInPixels = 16;
        /**
         * @internal
         */
        this._isCreatingEditor = false;
        /**
         * @internal
         */
        this.contentSlot = createRef();
        /**
         * @internal
         */
        this.editorContainer = createRef();
        /**
         * @internal
         */
        this.languageCompartment = null;
        /**
         * @internal
         */
        this.readOnlyCompartment = null;
        /**
         * @internal
         */
        this.wrapCompartment = null;
        /**
         * @internal
         */
        this.languageController = null;
        /**
         * @internal
         */
        this.codemirrorRuntime = null;
        /**
         * @internal
         */
        this.codemirrorRuntimePromise = null;
        /**
         * @internal
         */
        this._resizeObserver = new ResizeObserver(() => {
            // Use requestAnimationFrame to avoid ResizeObserver loop errors
            requestAnimationFrame(() => {
                this._checkShowMoreButton();
            });
        });
        this.streamingManager = new StreamingManager({
            getSlot: () => this.contentSlot.value ?? null,
            getHost: () => this,
            onContentUpdate: (content) => {
                const previous = this._slottedContent;
                if (content !== previous) {
                    this._slottedContent = content;
                }
            },
        });
    }
    _applyLanguageState(update) {
        if ("detectedLanguage" in update) {
            this._detectedLanguage = update.detectedLanguage ?? null;
        }
        if (update.lockLabel !== undefined) {
            this._languageLabelLockedIn = update.lockLabel;
        }
    }
    // Carbon methods
    /**
     * Copies the visible snippet so downstream chat experiences can share code without exposing the editor internals.
     */
    async _handleCopyClick() {
        try {
            await navigator.clipboard.writeText(this._slottedContent || this.copyText || "");
        }
        catch (error) {
            console.error("Failed to copy text:", error);
        }
    }
    /**
     * Toggles the expanded state so long snippets can collapse inside chat tiles while still offering full visibility on demand.
     */
    _handleClickExpanded() {
        this._expandedCode = !this._expandedCode;
    }
    // CodeMirror methods
    async ensureCodeMirrorRuntime() {
        if (this.codemirrorRuntime && this.languageController) {
            return true;
        }
        if (typeof window === "undefined") {
            return false;
        }
        if (!this.codemirrorRuntimePromise) {
            this._isEditorLoading = true;
            this.codemirrorRuntimePromise = loadCodeMirrorRuntime();
        }
        try {
            const runtime = await this.codemirrorRuntimePromise;
            if (!this.codemirrorRuntime) {
                this.codemirrorRuntime = runtime;
                this.languageCompartment = new runtime.Compartment();
                this.readOnlyCompartment = new runtime.Compartment();
                this.wrapCompartment = new runtime.Compartment();
                this.languageController = new runtime.LanguageController({
                    getLanguageAttribute: () => this.language,
                    getContent: () => this._slottedContent,
                    isHighlightEnabled: () => this.highlight,
                    getEditorView: () => this.editorView,
                    getLanguageCompartment: () => {
                        if (!this.languageCompartment) {
                            this.languageCompartment = new Compartment();
                        }
                        return this.languageCompartment;
                    },
                    isLanguageLabelLocked: () => this._languageLabelLockedIn,
                    getDefaultLanguage: () => this.defaultLanguage,
                    updateState: (update) => this._applyLanguageState(update),
                });
                this.requestUpdate();
            }
            return true;
        }
        catch (error) {
            console.error("Failed to load CodeMirror runtime", error);
            this._isEditorLoading = false;
            this.codemirrorRuntimePromise = null;
            return false;
        }
    }
    /**
     * Tears down the CodeMirror view when the component is destroyed to avoid leaking editors between chat messages.
     */
    destroyEditor() {
        if (this.editorView) {
            this.editorView.destroy();
            this.editorView = undefined;
        }
        this.languageController?.reset();
    }
    /**
     * Synchronizes CodeMirror with the latest props and streamed slot content while minimizing unnecessary re-creation work and only appending diffs when possible.
     */
    async updateEditor(changedProperties) {
        if (!this.editorContainer.value) {
            return;
        }
        const isReady = await this.ensureCodeMirrorRuntime();
        if (!isReady ||
            !this.codemirrorRuntime ||
            !this.languageController ||
            !this.languageCompartment ||
            !this.readOnlyCompartment) {
            return;
        }
        const { createContentSync, applyLanguageSupport, updateReadOnlyConfiguration, } = this.codemirrorRuntime;
        const languageController = this.languageController;
        const languageCompartment = this.languageCompartment;
        const readOnlyCompartment = this.readOnlyCompartment;
        const needsRecreate = !this.editorView || changedProperties.has("editable");
        if (needsRecreate) {
            // Prevent creating multiple editors simultaneously
            if (this._isCreatingEditor) {
                return;
            }
            this._isCreatingEditor = true;
            this.destroyEditor();
            await this.createEditor();
            this._isCreatingEditor = false;
        }
        else {
            if (changedProperties.has("_slottedContent")) {
                if (!this.contentSync) {
                    this.contentSync = createContentSync({
                        getEditorView: () => this.editorView,
                        onAfterApply: () => {
                            if (this.editorView) {
                                this._lineCount = this.editorView.state.doc.lines;
                            }
                            this._checkShowMoreButton();
                        },
                    });
                }
                this.contentSync.update(this._slottedContent);
                await languageController.handleStreamingLanguageDetection();
            }
            if (changedProperties.has("language") ||
                changedProperties.has("highlight")) {
                const languageSupport = await languageController.resolveLanguageSupport();
                applyLanguageSupport(this.editorView, languageCompartment, languageSupport);
            }
            if (changedProperties.has("disabled")) {
                updateReadOnlyConfiguration(this.editorView, readOnlyCompartment, {
                    editable: this.editable,
                    disabled: this.disabled,
                });
            }
        }
    }
    /**
     * Builds the CodeMirror instance that powers the formatted snippet surface inside the chat response tile.
     */
    async createEditor() {
        const container = this.editorContainer.value;
        const runtime = this.codemirrorRuntime;
        const languageController = this.languageController;
        const languageCompartment = this.languageCompartment;
        const readOnlyCompartment = this.readOnlyCompartment;
        const wrapCompartment = this.wrapCompartment;
        if (!container ||
            !runtime ||
            !languageController ||
            !languageCompartment ||
            !readOnlyCompartment ||
            !wrapCompartment) {
            return;
        }
        this._isEditorLoading = true;
        const languageSupport = await languageController.resolveLanguageSupport();
        try {
            container.replaceChildren();
            this.editorView = runtime.createEditorView({
                container,
                doc: this._slottedContent,
                languageSupport,
                languageCompartment,
                readOnlyCompartment,
                wrapCompartment,
                editable: this.editable,
                disabled: this.disabled,
                wrapText: this.wrapText,
                onDocChanged: ({ content, lineCount }) => {
                    this._lineCount = lineCount;
                    this.dispatchEvent(new CustomEvent("content-change", {
                        detail: { content },
                        bubbles: true,
                        composed: true,
                    }));
                    if (this.editable) {
                        languageController.detectLanguageForEditable(content);
                    }
                },
                setupOptions: {
                    foldCollapseLabel: this.foldCollapseLabel,
                    foldExpandLabel: this.foldExpandLabel,
                },
            });
        }
        finally {
            this._isEditorLoading = false;
        }
        this._lineCount = this.editorView.state.doc.lines;
        // Check height after editor renders
        requestAnimationFrame(() => {
            this._checkShowMoreButton();
        });
        languageController.handleStreamingLanguageDetection();
    }
    /**
     * Calculates the inline styles for the snippet container based on expanded state and min/max row constraints.
     */
    _getContainerStyles(expandedCode) {
        return buildContainerStyles({
            expanded: expandedCode,
            maxCollapsed: this.maxCollapsedNumberOfRows,
            maxExpanded: this.maxExpandedNumberOfRows,
            minCollapsed: this.minCollapsedNumberOfRows,
            minExpanded: this.minExpandedNumberOfRows,
            rowHeight: this._rowHeightInPixels,
        });
    }
    /**
     * Shows or hides the expand button so the chat message can adapt to long snippets without overwhelming the layout.
     */
    _checkShowMoreButton() {
        const { shouldShowButton, shouldCollapse } = evaluateShowMoreButton({
            shadowRoot: this.shadowRoot,
            rowHeight: this._rowHeightInPixels,
            expanded: this._expandedCode,
            maxCollapsed: this.maxCollapsedNumberOfRows,
            maxExpanded: this.maxExpandedNumberOfRows,
            minExpanded: this.minExpandedNumberOfRows,
        });
        if (this._shouldShowMoreLessBtn !== shouldShowButton) {
            this._shouldShowMoreLessBtn = shouldShowButton;
        }
        if (shouldCollapse) {
            this._expandedCode = false;
        }
    }
    renderEditorFallback() {
        if (!this._isEditorLoading) {
            return null;
        }
        return html `<div
      class="cds-aichat--snippet__editor-skeleton"
      aria-hidden="true"
    >
      <cds-custom-skeleton-text lines="4"></cds-custom-skeleton-text>
    </div>`;
    }
    // Lifecycle methods
    /**
     * Wires up resize and content observers so the snippet reacts to streaming updates and layout changes as soon as it attaches.
     */
    connectedCallback() {
        super.connectedCallback();
        if (this._hObserveResize) {
            this._hObserveResize = this._hObserveResize.release();
        }
        this._hObserveResize = observeResize(this._resizeObserver, this);
        this.streamingManager.reset(this._slottedContent);
        this.streamingManager.connect();
        void this.ensureCodeMirrorRuntime();
    }
    /**
     * Hooks into the rendered slot once Lit has stamped the template so we can observe streaming updates.
     */
    firstUpdated() {
        this.streamingManager.syncSlotObservers();
    }
    /**
     * Ensures we capture any pre-rendered slot content before the initial paint, keeping the editor in sync from the first frame.
     */
    willUpdate(_changedProperties) {
        this.streamingManager.ensureInitialContent();
        // Update expanded-code attribute before render to avoid change-in-update warning
        if (this._expandedCode) {
            this.setAttribute("expanded-code", "");
        }
        else {
            this.removeAttribute("expanded-code");
        }
    }
    /**
     * Responds to slot churn caused by streaming tokens emitted from the chat pipeline, forcing a full rescan when the slot re-projects.
     */
    _handleSlotChange() {
        this.streamingManager.handleSlotChange();
    }
    /**
     * Cleans up observers, throttles, and the editor when the chat snippet unmounts.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._hObserveResize) {
            this._hObserveResize = this._hObserveResize.release();
        }
        // Cancel any pending throttled updates
        this.contentSync?.cancel();
        this.streamingManager.dispose();
        this.languageController?.dispose();
        this.destroyEditor();
    }
    /**
     * Drives incremental editor updates after Lit commits.
     */
    updated(changedProperties) {
        this.updateEditor(changedProperties);
    }
    /**
     * Renders the CodeMirror host along with the controls that make the chat snippet interactive and accessible.
     */
    render() {
        const { disabled, feedback, feedbackTimeout, hideCopyButton, tooltipContent, showMoreText, showLessText, _expandedCode: expandedCode, _handleCopyClick: handleCopyClick, _shouldShowMoreLessBtn: shouldShowMoreLessBtn, } = this;
        const disabledCopyButtonClasses = disabled
            ? `cds-aichat--snippet--disabled`
            : "";
        const expandCodeBtnText = expandedCode ? showLessText : showMoreText;
        let containerClasses = `cds-aichat--snippet-container cds-aichat--snippet--codemirror`;
        if (!expandedCode) {
            containerClasses += ` cds-aichat--snippet-container--collapsed`;
        }
        return html ` <div class="cds-aichat--snippet">
      <div class="cds-aichat--snippet__header" data-rounded="top">
        <div class="cds-aichat--snippet__meta">
          ${this._detectedLanguage && this._languageLabelLockedIn
            ? html `<div class="cds-aichat--snippet__language">
                ${this._detectedLanguage}
              </div>`
            : ""}
          ${this._detectedLanguage &&
            this._languageLabelLockedIn &&
            this._lineCount
            ? html `<div class="cds-aichat--snippet__header-separator">
                &mdash;
              </div>`
            : ""}
          ${this._lineCount
            ? html `<div class="cds-aichat--snippet__linecount">
                ${this.getLineCountText({ count: this._lineCount })}
              </div>`
            : ""}
        </div>
        ${hideCopyButton
            ? ``
            : html `
              <div class="cds-aichat--snippet__copy" data-rounded="top-right">
                <!-- we need the button part exposed to the top level cds-custom-copy-button  -->
                <cds-custom-copy-button
                  ?disabled=${disabled}
                  button-class-name=${disabledCopyButtonClasses}
                  feedback=${feedback}
                  feedback-timeout=${feedbackTimeout}
                  @click="${handleCopyClick}"
                >
                  ${tooltipContent}
                </cds-custom-copy-button>
              </div>
            `}
      </div>
      <div
        role="${this.editable ? "textbox" : "region"}"
        tabindex="${this.editable && !disabled ? 0 : null}"
        class="${containerClasses}"
        data-rounded="bottom"
        aria-label="code-snippet"
        ${this.editable ? 'aria-readonly="false" aria-multiline="true"' : ""}
        style="${this._getContainerStyles(expandedCode)}"
      >
        <div class="cds-aichat--code-editor" ${ref(this.editorContainer)}></div>
        ${this.renderEditorFallback()}
      </div>

      ${shouldShowMoreLessBtn
            ? html `
            <div
              class="cds-aichat--snippet__footer"
              data-rounded="bottom-right"
            >
              <cds-custom-button
                kind="ghost"
                size="sm"
                button-class-name="cds-aichat--snippet-btn--expand"
                ?disabled=${disabled}
                @click=${() => this._handleClickExpanded()}
              >
                <span class="cds-aichat--snippet-btn--text">
                  ${expandCodeBtnText}
                </span>
                ${iconLoader(ChevronDown16, {
                class: `cds-aichat--icon-chevron--down cds-aichat--snippet__icon`,
                role: "img",
                slot: "icon",
            })}
              </cds-custom-button>
            </div>
          `
            : ``}
      <div class="cds-aichat--visually-hidden">
        <slot
          ${ref(this.contentSlot)}
          @slotchange=${this._handleSlotChange}
        ></slot>
      </div>
    </div>`;
    }
};
CDSAIChatCodeSnippet.styles = [styles];
/**
 * @internal
 */
CDSAIChatCodeSnippet.shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
};
__decorate([
    property({ type: String, attribute: "language" })
], CDSAIChatCodeSnippet.prototype, "language", void 0);
__decorate([
    property({ type: Boolean, attribute: "editable" })
], CDSAIChatCodeSnippet.prototype, "editable", void 0);
__decorate([
    property({ type: Boolean, attribute: "highlight" })
], CDSAIChatCodeSnippet.prototype, "highlight", void 0);
__decorate([
    property({ type: String, attribute: "default-language" })
], CDSAIChatCodeSnippet.prototype, "defaultLanguage", void 0);
__decorate([
    property({ attribute: "copy-text" })
], CDSAIChatCodeSnippet.prototype, "copyText", void 0);
__decorate([
    property({ type: Boolean, reflect: true, attribute: "disabled" })
], CDSAIChatCodeSnippet.prototype, "disabled", void 0);
__decorate([
    property({ attribute: "feedback" })
], CDSAIChatCodeSnippet.prototype, "feedback", void 0);
__decorate([
    property({ type: Number, attribute: "feedback-timeout" })
], CDSAIChatCodeSnippet.prototype, "feedbackTimeout", void 0);
__decorate([
    property({ type: Boolean, reflect: true, attribute: "hide-copy-button" })
], CDSAIChatCodeSnippet.prototype, "hideCopyButton", void 0);
__decorate([
    property({ attribute: "max-collapsed-number-of-rows" })
], CDSAIChatCodeSnippet.prototype, "maxCollapsedNumberOfRows", void 0);
__decorate([
    property({ attribute: "max-expanded-number-of-rows" })
], CDSAIChatCodeSnippet.prototype, "maxExpandedNumberOfRows", void 0);
__decorate([
    property({ attribute: "min-collapsed-number-of-rows" })
], CDSAIChatCodeSnippet.prototype, "minCollapsedNumberOfRows", void 0);
__decorate([
    property({ attribute: "min-expanded-number-of-rows" })
], CDSAIChatCodeSnippet.prototype, "minExpandedNumberOfRows", void 0);
__decorate([
    property({ attribute: "show-less-text" })
], CDSAIChatCodeSnippet.prototype, "showLessText", void 0);
__decorate([
    property({ attribute: "show-more-text" })
], CDSAIChatCodeSnippet.prototype, "showMoreText", void 0);
__decorate([
    property({ attribute: "tooltip-content" })
], CDSAIChatCodeSnippet.prototype, "tooltipContent", void 0);
__decorate([
    property({ type: Boolean, reflect: true, attribute: "wrap-text" })
], CDSAIChatCodeSnippet.prototype, "wrapText", void 0);
__decorate([
    property({ attribute: "fold-collapse-label" })
], CDSAIChatCodeSnippet.prototype, "foldCollapseLabel", void 0);
__decorate([
    property({ attribute: "fold-expand-label" })
], CDSAIChatCodeSnippet.prototype, "foldExpandLabel", void 0);
__decorate([
    property({ attribute: false })
], CDSAIChatCodeSnippet.prototype, "getLineCountText", void 0);
__decorate([
    property({ attribute: false })
], CDSAIChatCodeSnippet.prototype, "_slottedContent", void 0);
__decorate([
    state()
], CDSAIChatCodeSnippet.prototype, "_detectedLanguage", void 0);
__decorate([
    state()
], CDSAIChatCodeSnippet.prototype, "_languageLabelLockedIn", void 0);
__decorate([
    state()
], CDSAIChatCodeSnippet.prototype, "_lineCount", void 0);
__decorate([
    state()
], CDSAIChatCodeSnippet.prototype, "editorView", void 0);
__decorate([
    state()
], CDSAIChatCodeSnippet.prototype, "_isEditorLoading", void 0);
__decorate([
    state()
], CDSAIChatCodeSnippet.prototype, "_expandedCode", void 0);
__decorate([
    state()
], CDSAIChatCodeSnippet.prototype, "_shouldShowMoreLessBtn", void 0);
CDSAIChatCodeSnippet = __decorate([
    carbonElement("cds-aichat-code-snippet")
], CDSAIChatCodeSnippet);
var CDSAIChatCodeSnippet$1 = CDSAIChatCodeSnippet;

export { CDSAIChatCodeSnippet, CDSAIChatCodeSnippet$1 as default };
//# sourceMappingURL=code-snippet.js.map
