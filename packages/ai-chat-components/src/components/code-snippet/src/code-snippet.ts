/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, html } from "lit";
import { property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import FocusMixin from "@carbon/web-components/es/globals/mixins/focus.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";
import { observeResize } from "./dom-utils.js";
import type {
  LanguageController,
  LanguageStateUpdate,
} from "./codemirror/language-controller.js";
import type { ContentSyncHandle } from "./codemirror/content-sync.js";
import {
  buildContainerStyles,
  evaluateShowMoreButton,
} from "./layout-utils.js";
import { StreamingManager } from "./streaming-manager.js";
import { defaultLineCountText, type LineCountFormatter } from "./formatters.js";
import type { EditorView } from "codemirror";
import type { Compartment } from "@codemirror/state";
import { loadCodeMirrorRuntime } from "./codemirror/codemirror-loader.js";
import "@carbon/web-components/es/components/skeleton-text/index.js";

type CodeMirrorRuntime = Awaited<ReturnType<typeof loadCodeMirrorRuntime>>;
// @ts-ignore
import styles from "./code-snippet.scss?lit";
import "@carbon/web-components/es/components/copy-button/index.js";
import "@carbon/web-components/es/components/copy/copy.js";
import "@carbon/web-components/es/components/button/button.js";

/**
 * AI Chat code snippet orchestrator that keeps CodeMirror in sync with streamed slot content,
 * automatically detects and loads language highlighting, and optionally exposes an editable surface
 * with live language re-detection and change notifications.
 */
@carbonElement(`${prefix}-code-snippet`)
class CDSAIChatCodeSnippet extends FocusMixin(LitElement) {
  static styles = [styles];

  // CodeMirror properties
  @property({ type: String }) language = "";
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) highlight = false;
  @property({ type: String, attribute: "default-language" })
  defaultLanguage = "javascript";
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

  @property({ attribute: "max-expanded-number-of-rows" })
  maxExpandedNumberOfRows = 0;

  @property({ attribute: "min-collapsed-number-of-rows" })
  minCollapsedNumberOfRows = 3;

  @property({ attribute: "min-expanded-number-of-rows" })
  minExpandedNumberOfRows = 16;

  @property({ attribute: "show-less-text" })
  showLessText = "Show less";

  @property({ attribute: "show-more-text" })
  showMoreText = "Show more";

  @property({ attribute: "tooltip-content" })
  tooltipContent = "Copy to clipboard";

  @property({ type: Boolean, reflect: true, attribute: "wrap-text" })
  wrapText = false;

  @property({ attribute: "fold-collapse-label" })
  foldCollapseLabel = "Collapse code block";

  @property({ attribute: "fold-expand-label" })
  foldExpandLabel = "Expand code block";

  /**
   * The function used to format the line count text.
   * Receives the line count and returns a formatted string.
   * Defaults to `${count} lines` in en-US.
   */
  @property({ attribute: false })
  getLineCountText: LineCountFormatter = defaultLineCountText;

  // Internal state for slotted content
  @property({ attribute: false })
  private _slottedContent = "";

  @state()
  private _detectedLanguage: string | null = null;

  @state()
  private _languageLabelLockedIn = false;

  @state()
  private _lineCount: number | null = null;

  @state()
  private editorView?: EditorView;

  @state()
  private _isEditorLoading = true;

  // Private non-functional fields
  @state()
  private _expandedCode = false;
  @state()
  private _shouldShowMoreLessBtn = false;

  private _hObserveResize: { release(): null } | null = null;
  private _rowHeightInPixels = 16;
  private _isCreatingEditor = false;
  private contentSlot = createRef<HTMLSlotElement>();
  private editorContainer = createRef<HTMLDivElement>();
  private languageCompartment: Compartment | null = null;
  private readOnlyCompartment: Compartment | null = null;
  private wrapCompartment: Compartment | null = null;
  private contentSync?: ContentSyncHandle;
  private languageController: LanguageController | null = null;
  private streamingManager: StreamingManager;
  private codemirrorRuntime: CodeMirrorRuntime | null = null;
  private codemirrorRuntimePromise: Promise<CodeMirrorRuntime> | null = null;
  private _resizeObserver = new ResizeObserver(() => {
    // Use requestAnimationFrame to avoid ResizeObserver loop errors
    requestAnimationFrame(() => {
      this._checkShowMoreButton();
    });
  });

  constructor() {
    super();
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

  private _applyLanguageState(update: LanguageStateUpdate) {
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
  private async _handleCopyClick() {
    try {
      await navigator.clipboard.writeText(
        this._slottedContent || this.copyText || "",
      );
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  }

  /**
   * Toggles the expanded state so long snippets can collapse inside chat tiles while still offering full visibility on demand.
   */
  private _handleClickExpanded() {
    this._expandedCode = !this._expandedCode;
  }

  // CodeMirror methods

  private async ensureCodeMirrorRuntime(): Promise<boolean> {
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
          getLanguageCompartment: () => this.languageCompartment!,
          isLanguageLabelLocked: () => this._languageLabelLockedIn,
          getDefaultLanguage: () => this.defaultLanguage,
          updateState: (update) => this._applyLanguageState(update),
        });
        this.requestUpdate();
      }
      return true;
    } catch (error) {
      console.error("Failed to load CodeMirror runtime", error);
      this._isEditorLoading = false;
      this.codemirrorRuntimePromise = null;
      return false;
    }
  }

  /**
   * Tears down the CodeMirror view when the component is destroyed to avoid leaking editors between chat messages.
   */
  private destroyEditor() {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = undefined;
    }
    this.languageController?.reset();
  }

  /**
   * Synchronizes CodeMirror with the latest props and streamed slot content while minimizing unnecessary re-creation work and only appending diffs when possible.
   */
  private async updateEditor(changedProperties: Map<string, any>) {
    if (!this.editorContainer.value) {
      return;
    }

    const isReady = await this.ensureCodeMirrorRuntime();
    if (
      !isReady ||
      !this.codemirrorRuntime ||
      !this.languageController ||
      !this.languageCompartment ||
      !this.readOnlyCompartment
    ) {
      return;
    }

    const {
      createContentSync,
      applyLanguageSupport,
      updateReadOnlyConfiguration,
    } = this.codemirrorRuntime;
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
    } else {
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

      if (
        changedProperties.has("language") ||
        changedProperties.has("highlight")
      ) {
        const languageSupport =
          await languageController.resolveLanguageSupport();
        applyLanguageSupport(
          this.editorView,
          languageCompartment,
          languageSupport,
        );
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
  private async createEditor() {
    const container = this.editorContainer.value;
    const runtime = this.codemirrorRuntime;
    const languageController = this.languageController;
    const languageCompartment = this.languageCompartment;
    const readOnlyCompartment = this.readOnlyCompartment;
    const wrapCompartment = this.wrapCompartment;

    if (
      !container ||
      !runtime ||
      !languageController ||
      !languageCompartment ||
      !readOnlyCompartment ||
      !wrapCompartment
    ) {
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

          this.dispatchEvent(
            new CustomEvent("content-change", {
              detail: { content },
              bubbles: true,
              composed: true,
            }),
          );

          if (this.editable) {
            languageController.detectLanguageForEditable(content);
          }
        },
        setupOptions: {
          foldCollapseLabel: this.foldCollapseLabel,
          foldExpandLabel: this.foldExpandLabel,
        },
      });
    } finally {
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
  private _getContainerStyles(expandedCode: boolean): string {
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
  private _checkShowMoreButton() {
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

  private renderEditorFallback() {
    if (!this._isEditorLoading) {
      return null;
    }

    return html`<div
      class="${prefix}--snippet__editor-skeleton"
      aria-hidden="true"
    >
      <cds-skeleton-text lines="4"></cds-skeleton-text>
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
  protected firstUpdated() {
    this.streamingManager.syncSlotObservers();
  }

  /**
   * Ensures we capture any pre-rendered slot content before the initial paint, keeping the editor in sync from the first frame.
   */
  willUpdate(_changedProperties: Map<string, any>) {
    this.streamingManager.ensureInitialContent();

    // Update expanded-code attribute before render to avoid change-in-update warning
    if (this._expandedCode) {
      this.setAttribute("expanded-code", "");
    } else {
      this.removeAttribute("expanded-code");
    }
  }

  /**
   * Responds to slot churn caused by streaming tokens emitted from the chat pipeline, forcing a full rescan when the slot re-projects.
   */
  private _handleSlotChange() {
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
  updated(changedProperties: Map<string, any>) {
    this.updateEditor(changedProperties);
  }

  /**
   * Renders the CodeMirror host along with the controls that make the chat snippet interactive and accessible.
   */
  render() {
    const {
      disabled,
      feedback,
      feedbackTimeout,
      hideCopyButton,
      tooltipContent,
      showMoreText,
      showLessText,
      _expandedCode: expandedCode,
      _handleCopyClick: handleCopyClick,
      _shouldShowMoreLessBtn: shouldShowMoreLessBtn,
    } = this;

    const disabledCopyButtonClasses = disabled
      ? `${prefix}--snippet--disabled`
      : "";
    const expandCodeBtnText = expandedCode ? showLessText : showMoreText;

    let containerClasses = `${prefix}--snippet-container ${prefix}--snippet--codemirror`;
    if (!expandedCode) {
      containerClasses += ` ${prefix}--snippet-container--collapsed`;
    }

    return html` <div class="${prefix}--snippet">
      <div class="${prefix}--snippet__header" data-rounded="top">
        <div class="${prefix}--snippet__meta">
          ${this._detectedLanguage && this._languageLabelLockedIn
            ? html`<div class="${prefix}--snippet__language">
                ${this._detectedLanguage}
              </div>`
            : ""}
          ${this._detectedLanguage &&
          this._languageLabelLockedIn &&
          this._lineCount
            ? html`<div class="${prefix}--snippet__header-separator">
                &mdash;
              </div>`
            : ""}
          ${this._lineCount
            ? html`<div class="${prefix}--snippet__linecount">
                ${this.getLineCountText({ count: this._lineCount })}
              </div>`
            : ""}
        </div>
        ${hideCopyButton
          ? ``
          : html`
              <div class="${prefix}--snippet__copy" data-rounded="top-right">
                <!-- we need the button part exposed to the top level cds-copy-button  -->
                <cds-copy-button
                  ?disabled=${disabled}
                  button-class-name=${disabledCopyButtonClasses}
                  feedback=${feedback}
                  feedback-timeout=${feedbackTimeout}
                  @click="${handleCopyClick}"
                >
                  ${tooltipContent}
                </cds-copy-button>
              </div>
            `}
      </div>
      <div
        role="${this.editable ? "textbox" : "region"}"
        tabindex="${this.editable && !disabled ? 0 : null}"
        class="${containerClasses}"
        aria-label="code-snippet"
        ${this.editable ? 'aria-readonly="false" aria-multiline="true"' : ""}
        style="${this._getContainerStyles(expandedCode)}"
      >
        <div class="${prefix}--code-editor" ${ref(this.editorContainer)}></div>
        ${this.renderEditorFallback()}
      </div>

      ${shouldShowMoreLessBtn
        ? html`
            <div class="${prefix}--snippet__footer" data-rounded="bottom-right">
              <cds-button
                kind="ghost"
                size="sm"
                button-class-name="${prefix}--snippet-btn--expand"
                ?disabled=${disabled}
                @click=${() => this._handleClickExpanded()}
              >
                <span class="${prefix}--snippet-btn--text">
                  ${expandCodeBtnText}
                </span>
                ${iconLoader(ChevronDown16, {
                  class: `${prefix}--icon-chevron--down ${prefix}--snippet__icon`,
                  role: "img",
                  slot: "icon",
                })}
              </cds-button>
            </div>
          `
        : ``}
      <div class="${prefix}--visually-hidden">
        <slot
          ${ref(this.contentSlot)}
          @slotchange=${this._handleSlotChange}
        ></slot>
      </div>
    </div>`;
  }

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
}

export default CDSAIChatCodeSnippet;
