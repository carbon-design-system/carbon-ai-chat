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
import Copy16 from "@carbon/icons/es/copy/16.js";
import FocusMixin from "@carbon/web-components/es/globals/mixins/focus.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { carbonElement } from "../../../globals/decorators/index.js";
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
  type ContainerStyleProperties,
} from "./layout-utils.js";
import { StreamingManager } from "./streaming-manager.js";
import { defaultLineCountText, type LineCountFormatter } from "./formatters.js";
import type { EditorView } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { loadCodeMirrorRuntime } from "./codemirror/codemirror-loader.js";
import "@carbon/web-components/es/components/skeleton-text/index.js";
import "../../toolbar/src/toolbar.js";
import type { Action } from "../../toolbar/src/toolbar.js";

type CodeMirrorRuntime = Awaited<ReturnType<typeof loadCodeMirrorRuntime>>;

import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./code-snippet.scss?lit";
import "@carbon/web-components/es/components/button/button.js";

/**
 * AI Chat code snippet orchestrator that keeps CodeMirror in sync with streamed slot content,
 * automatically detects and loads language highlighting, and optionally exposes an editable surface
 * with live language re-detection and change notifications.
 * @element cds-aichat-code-snippet
 * @slot fixed-actions - Actions that never overflow (passed to toolbar)
 * @slot decorator - Decorative elements like AI labels (passed to toolbar)
 */
@carbonElement(`${prefix}-code-snippet`)
class CDSAIChatCodeSnippet extends FocusMixin(LitElement) {
  static styles = [commonStyles, styles];

  // Toolbar properties
  /** Array of actions that can overflow into a menu when space is limited. */
  @property({ type: Array, attribute: false })
  actions: Action[] = [];

  /** Enable overflow behavior for actions. */
  @property({ type: Boolean, attribute: "overflow", reflect: true })
  overflow = false;

  // CodeMirror properties
  /** Language used for syntax highlighting. */
  @property({ type: String, attribute: "language" }) language = "";
  /** Whether the snippet should be editable. */
  @property({ type: Boolean, attribute: "editable" }) editable = false;
  /** Whether to enable syntax highlighting. */
  @property({ type: Boolean, attribute: "highlight" }) highlight = false;
  /** Fallback language to use when detection fails. */
  @property({ type: String, attribute: "default-language" })
  defaultLanguage = "javascript";
  /** Text to copy when clicking the copy button. Defaults to slotted content. */
  @property({ attribute: "copy-text" })
  copyText = "";

  /** Disable interactions on the snippet. */
  @property({ type: Boolean, reflect: true, attribute: "disabled" })
  disabled = false;

  /** Feedback text shown after copy. */
  @property({ attribute: "feedback" })
  feedback = "Copied!";

  /** Duration (ms) to show feedback text. */
  @property({ type: Number, attribute: "feedback-timeout" })
  feedbackTimeout = 2000;

  /** Hide the copy button. */
  @property({ type: Boolean, reflect: true, attribute: "hide-copy-button" })
  hideCopyButton = false;

  /** Hide the header/toolbar completely. */
  @property({ type: Boolean, reflect: true, attribute: "hide-header" })
  hideHeader = false;

  /**
   * Maximum rows to show when collapsed.
   * Set to 0 along with maxExpandedNumberOfRows to enable fill-container mode.
   */
  @property({ attribute: "max-collapsed-number-of-rows" })
  maxCollapsedNumberOfRows = 15;

  /**
   * Maximum rows to show when expanded (0 = unlimited).
   * Set to 0 along with maxCollapsedNumberOfRows to enable fill-container mode,
   * where the component fills its container's height with a scrollbar.
   */
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

  /** Aria-label for the code editor when in read-only mode. */
  @property({ attribute: "aria-label-readonly" })
  ariaLabelReadOnly = "Code snippet";

  /** Aria-label for the code editor when in editable mode. */
  @property({ attribute: "aria-label-editable" })
  ariaLabelEditable = "Code editor";

  /**
   * The function used to format the line count text.
   * Receives the line count and returns a formatted string.
   * Defaults to `${count} lines` in en-US.
   */
  @property({ attribute: false })
  getLineCountText: LineCountFormatter = defaultLineCountText;

  /**
   * @internal
   */
  @property({ attribute: false })
  private _slottedContent = "";

  /**
   * @internal
   */
  @state()
  private _detectedLanguage: string | null = null;

  /**
   * @internal
   */
  @state()
  private _languageLabelLockedIn = false;

  /**
   * @internal
   */
  @state()
  private _lineCount: number | null = null;

  /**
   * @internal
   */
  @state()
  private editorView?: EditorView;

  /**
   * @internal
   */
  @state()
  private _isEditorLoading = true;

  /**
   * @internal
   */
  @state()
  private _expandedCode = false;

  /**
   * @internal
   */
  @state()
  private _shouldShowMoreLessBtn = false;

  /**
   * @internal
   */
  private _hObserveResize: { release(): null } | null = null;

  /**
   * @internal
   */
  private _rowHeightInPixels = 16;

  /**
   * @internal
   */
  private _isCreatingEditor = false;

  /**
   * @internal
   */
  private contentSlot = createRef<HTMLSlotElement>();

  /**
   * @internal
   */
  private editorContainer = createRef<HTMLDivElement>();

  /**
   * @internal
   */
  private snippetContainer = createRef<HTMLDivElement>();

  /**
   * @internal
   */
  private languageCompartment: Compartment | null = null;

  /**
   * @internal
   */
  private readOnlyCompartment: Compartment | null = null;

  /**
   * @internal
   */
  private wrapCompartment: Compartment | null = null;

  /**
   * @internal
   */
  private contentAttributesCompartment: Compartment | null = null;

  /**
   * @internal
   */
  private contentSync?: ContentSyncHandle;

  /**
   * @internal
   */
  private languageController: LanguageController | null = null;

  /**
   * @internal
   */
  private streamingManager: StreamingManager;

  /**
   * @internal
   */
  private codemirrorRuntime: CodeMirrorRuntime | null = null;

  /**
   * @internal
   */
  private codemirrorRuntimePromise: Promise<CodeMirrorRuntime> | null = null;

  /**
   * @internal
   */
  private _resizeObserver = new ResizeObserver(() => {
    // Use requestAnimationFrame to avoid ResizeObserver loop errors
    requestAnimationFrame(() => {
      this._checkShowMoreButton();
    });
  });

  /**
   * @internal
   * Computed property to detect fill-container mode
   */
  private get _isFillMode(): boolean {
    return (
      this.maxCollapsedNumberOfRows === 0 && this.maxExpandedNumberOfRows === 0
    );
  }

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
      const textToCopy = this._slottedContent || this.copyText || "";

      // Try modern Clipboard API first (HTTPS only)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for HTTP or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        textArea.style.opacity = "0";
        textArea.setAttribute("aria-hidden", "true");
        textArea.setAttribute("tabindex", "-1");
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
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
        this.contentAttributesCompartment = new runtime.Compartment();
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
      updateContentAttributes,
    } = this.codemirrorRuntime;
    const languageController = this.languageController;
    const languageCompartment = this.languageCompartment;
    const readOnlyCompartment = this.readOnlyCompartment;
    const contentAttributesCompartment = this.contentAttributesCompartment;

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

      if (
        contentAttributesCompartment &&
        (changedProperties.has("_detectedLanguage") ||
          changedProperties.has("editable") ||
          changedProperties.has("ariaLabelReadOnly") ||
          changedProperties.has("ariaLabelEditable"))
      ) {
        updateContentAttributes(
          this.editorView,
          contentAttributesCompartment,
          this._getAriaLabel(),
        );
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
    const contentAttributesCompartment = this.contentAttributesCompartment;

    if (
      !container ||
      !runtime ||
      !languageController ||
      !languageCompartment ||
      !readOnlyCompartment ||
      !wrapCompartment ||
      !contentAttributesCompartment
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
        contentAttributesCompartment,
        editable: this.editable,
        disabled: this.disabled,
        wrapText: this.wrapText,
        ariaLabel: this._getAriaLabel(),
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
   * Generates the appropriate aria-label for the code editor based on language and editable state.
   */
  private _getAriaLabel(): string {
    const language = this._detectedLanguage;
    const editable = this.editable;

    if (editable) {
      return language
        ? this.ariaLabelEditable.replace("{language}", language)
        : this.ariaLabelEditable;
    } else {
      return language
        ? this.ariaLabelReadOnly.replace("{language}", language)
        : this.ariaLabelReadOnly;
    }
  }

  /**
   * Calculates the CSS custom properties for the snippet container based on expanded state and min/max row constraints.
   * CSP-compliant: returns properties to be set via element.style.setProperty()
   */
  private _getContainerStyles(expandedCode: boolean): ContainerStyleProperties {
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
   * Applies CSS custom properties to the snippet container element.
   * CSP-compliant: uses setProperty() instead of inline style attribute.
   */
  private _applyContainerStyles() {
    const container = this.snippetContainer.value;
    if (!container) {
      return;
    }

    const properties = this._getContainerStyles(this._expandedCode);

    // Apply each custom property
    for (const [property, value] of Object.entries(properties)) {
      if (value !== undefined) {
        container.style.setProperty(property, value);
      }
    }
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
      class="cds-aichat--snippet__editor-skeleton"
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
    // Apply initial container styles (CSP-compliant)
    this._applyContainerStyles();
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

    // Apply container styles when expanded state or row constraints change
    if (
      changedProperties.has("_expandedCode") ||
      changedProperties.has("maxCollapsedNumberOfRows") ||
      changedProperties.has("maxExpandedNumberOfRows") ||
      changedProperties.has("minCollapsedNumberOfRows") ||
      changedProperties.has("minExpandedNumberOfRows")
    ) {
      this._applyContainerStyles();
    }

    // Apply fill-mode class to host element
    if (this._isFillMode) {
      this.classList.add("cds-aichat--snippet-container--fill-mode");
    } else {
      this.classList.remove("cds-aichat--snippet-container--fill-mode");
    }
  }

  /**
   * Gets all actions including the copy button prepended if enabled.
   * @returns Array of actions for the toolbar
   */
  private _getToolbarActions(): Action[] {
    if (this.hideCopyButton) {
      return this.actions;
    }

    const copyAction: Action = {
      text: this.tooltipContent,
      icon: Copy16,
      onClick: () => this._handleCopyClick(),
    };

    return [copyAction, ...this.actions];
  }

  /**
   * Renders the title content for the toolbar (language label and line count).
   * @returns Template result for title slot
   */
  private renderTitle() {
    return html`
      <div slot="title" data-rounded="top" class="cds-aichat--snippet__meta">
        ${this._detectedLanguage && this._languageLabelLockedIn
          ? html`<div class="cds-aichat--snippet__language">
              ${this._detectedLanguage}
            </div>`
          : ""}
        ${this._detectedLanguage &&
        this._languageLabelLockedIn &&
        this._lineCount
          ? html`<div class="cds-aichat--snippet__header-separator">
              &mdash;
            </div>`
          : ""}
        ${this._lineCount
          ? html`<div class="cds-aichat--snippet__linecount">
              ${this.getLineCountText({ count: this._lineCount })}
            </div>`
          : ""}
      </div>
    `;
  }

  /**
   * Renders the CodeMirror host along with the controls that make the chat snippet interactive and accessible.
   */
  render() {
    const {
      disabled,
      showMoreText,
      showLessText,
      _expandedCode: expandedCode,
      _shouldShowMoreLessBtn: shouldShowMoreLessBtn,
    } = this;

    const expandCodeBtnText = expandedCode ? showLessText : showMoreText;

    let containerClasses = `cds-aichat--snippet-container cds-aichat--snippet--codemirror`;
    if (!expandedCode) {
      containerClasses += ` cds-aichat--snippet-container--collapsed`;
    }
    if (this._isFillMode) {
      containerClasses += ` cds-aichat--snippet-container--fill-mode`;
    }

    return html` <div class="cds-aichat--snippet">
      ${!this.hideHeader
        ? html`
            <cds-aichat-toolbar
              class="cds-aichat--snippet__header"
              .actions=${this._getToolbarActions()}
              ?overflow=${this.overflow}
            >
              ${this.renderTitle()}
              <slot name="fixed-actions" slot="fixed-actions"></slot>
              <slot name="decorator" slot="decorator"></slot>
            </cds-aichat-toolbar>
          `
        : ""}

      <div
        class="${containerClasses}"
        data-rounded="bottom"
        ${this.editable
          ? `aria-label="${this.ariaLabelEditable}" aria-readonly="false" aria-multiline="true" role="textbox" tabindex="0"`
          : ""}
        ${ref(this.snippetContainer)}
      >
        <div class="cds-aichat--code-editor" ${ref(this.editorContainer)}></div>
        ${this.renderEditorFallback()}
      </div>

      ${shouldShowMoreLessBtn
        ? html`
            <div
              class="cds-aichat--snippet__footer"
              data-rounded="bottom-right"
            >
              <cds-button
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
              </cds-button>
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

  /**
   * @internal
   */
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-code-snippet": CDSAIChatCodeSnippet;
  }
}

export { CDSAIChatCodeSnippet };
export default CDSAIChatCodeSnippet;
export type { Action } from "../../toolbar/src/toolbar.js";
