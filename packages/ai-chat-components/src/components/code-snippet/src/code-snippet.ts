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
import throttle from "lodash-es/throttle.js";
import {
  extractTextContent,
  extractSlotContent,
  detectLanguage,
  mapLanguageName,
  observeResize,
  getCodeRefDimensions,
} from "./utils.js";
import {
  createCarbonTheme,
  createCarbonHighlightStyle,
} from "./codemirror/theme.js";

// CodeMirror imports
import { EditorView } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { LanguageDescription, LanguageSupport } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
// @ts-ignore
import styles from "./code-snippet.scss?lit";
import "@carbon/web-components/es/components/copy-button/index.js";
import "@carbon/web-components/es/components/copy/copy.js";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/layer/layer.js";
import { baseSetupWithoutSearch } from "./codemirror/base-setup.js";

/**
 * AI Chat code snippet component that hosts the CodeMirror editor.
 */
@carbonElement(`${prefix}-code-snippet`)
class CDSAIChatCodeSnippet extends FocusMixin(LitElement) {
  static styles = [styles];

  // Carbon code snippet properties
  private _expandedCode = false;
  private _hObserveResize: { release(): null } | null = null;
  private _rowHeightInPixels = 16;
  private _hasRightOverflow = true;
  private _hasLeftOverflow = false;
  private _shouldShowMoreLessBtn = false;

  // CodeMirror properties
  @property({ type: String }) language = "";
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) highlight = false;
  @property({ attribute: false }) onContentChange?: (content: string) => void;

  // Internal state for slotted content
  @property({ attribute: false })
  private _slottedContent = "";

  @state()
  private _detectedLanguage: string | null = null;

  @state()
  private _lineCount: number | null = null;

  @state()
  private editorView?: EditorView;

  private contentSlot = createRef<HTMLSlotElement>();
  private editorContainer = createRef<HTMLDivElement>();
  private languageCompartment = new Compartment();
  private readOnlyCompartment = new Compartment();
  private throttledUpdateContent?: ReturnType<typeof throttle>;
  private _pendingLanguageLoad: Promise<void> | null = null;
  private contentMutationObserver?: MutationObserver;
  private _pendingMutationFrame: number | null = null;

  // Carbon code snippet properties
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
   * Tracks horizontal overflow to drive the gradient affordances that hint at hidden content within the chat transcript.
   */
  private _handleScroll() {
    if (this) {
      const codeContainerRef = this?.shadowRoot?.querySelector(
        `.${prefix}--snippet-container`,
      );
      const codeContentRef = codeContainerRef?.querySelector("pre");
      if (!codeContentRef) {
        return;
      }

      const {
        horizontalOverflow,
        codeClientWidth,
        codeScrollWidth,
        codeScrollLeft,
      } = getCodeRefDimensions(codeContentRef);

      this._hasLeftOverflow = horizontalOverflow && !!codeScrollLeft;
      this._hasRightOverflow =
        horizontalOverflow &&
        codeScrollLeft + codeClientWidth !== codeScrollWidth;
      this.requestUpdate();
    }
  }

  /**
   * Toggles the expanded state so long snippets can collapse inside chat tiles while still offering full visibility on demand.
   */
  private _handleClickExpanded() {
    this._expandedCode = !this._expandedCode;
    this.requestUpdate();
  }

  private _resizeObserver = new ResizeObserver(() => {
    this._checkShowMoreButton();
    this._handleScroll();
  });

  // CodeMirror methods

  /**
   * Tears down the CodeMirror view when the component is destroyed to avoid leaking editors between chat messages.
   */
  private destroyEditor() {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = undefined;
    }
  }

  /**
   * Loads syntax highlighting support so the chat can display language-aware snippets even when the author does not specify one.
   */
  private async getLanguageSupport(): Promise<LanguageSupport | null> {
    let languageToUse = this.language
      ? (mapLanguageName(this.language) ?? this.language)
      : "";

    // If no language specified, try to auto-detect
    if (!languageToUse && this._slottedContent) {
      const analyzableContent = this._slottedContent.trim();
      const detected = analyzableContent
        ? detectLanguage(analyzableContent)
        : null;
      languageToUse = detected ?? "";
    }

    // If still no language, return null (plain text)
    if (!languageToUse) {
      this._detectedLanguage = null;
      return null;
    }

    // Check if CodeMirror recognizes this language
    const langDesc = LanguageDescription.matchLanguageName(
      languages,
      languageToUse,
      true,
    );

    // Store the normalized language for display, even if highlighting is off
    this._detectedLanguage = langDesc ? languageToUse : null;

    // Only load syntax highlighting if highlighting is enabled
    if (!this.highlight) {
      return null;
    }

    if (langDesc) {
      try {
        return await langDesc.load();
      } catch (error) {
        console.warn(`Failed to load language support for "${languageToUse}"`);
      }
    }

    return null;
  }

  private _isCreatingEditor = false;

  private async _maybeUpdateDetectedLanguageForStreaming() {
    if (
      !!this.language ||
      !this._slottedContent.trim() ||
      this._pendingLanguageLoad
    ) {
      return;
    }

    const trimmed = this._slottedContent.trim();
    const detected = detectLanguage(trimmed);

    if (!detected || detected === this._detectedLanguage) {
      return;
    }

    const langDesc = LanguageDescription.matchLanguageName(
      languages,
      detected,
      true,
    );

    if (!langDesc) {
      return;
    }

    // Always update the detected language for display
    this._detectedLanguage = detected;

    // Only load and apply syntax highlighting if highlighting is enabled
    if (!this.highlight) {
      return;
    }

    this._pendingLanguageLoad = (async () => {
      try {
        const support = await langDesc.load();
        this.editorView?.dispatch({
          effects: this.languageCompartment.reconfigure([support]),
        });
      } catch (error) {
        console.warn(`Failed to load language support for "${detected}"`);
      } finally {
        this._pendingLanguageLoad = null;
      }
    })();

    await this._pendingLanguageLoad;
  }

  /**
   * Synchronizes CodeMirror with the latest props and streamed slot content while minimizing unnecessary re-creation work and only appending diffs when possible.
   */
  private async updateEditor(changedProperties: Map<string, any>) {
    if (!this.editorContainer.value) {
      return;
    }

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
        const currentContent = this.editorView?.state.doc.toString();
        if (currentContent !== this._slottedContent) {
          // Initialize throttled function if not already created
          if (!this.throttledUpdateContent) {
            this.throttledUpdateContent = throttle(
              (content: string) => {
                if (!this.editorView) {
                  return;
                }
                const current = this.editorView.state.doc.toString();

                if (content === current) {
                  return;
                }

                if (content.startsWith(current)) {
                  const appended = content.slice(current.length);
                  if (appended.length === 0) {
                    return;
                  }
                  this.editorView.dispatch({
                    changes: {
                      from: current.length,
                      to: current.length,
                      insert: appended,
                    },
                  });
                } else if (current.startsWith(content)) {
                  this.editorView.dispatch({
                    changes: {
                      from: content.length,
                      to: current.length,
                      insert: "",
                    },
                  });
                } else {
                  this.editorView.dispatch({
                    changes: {
                      from: 0,
                      to: current.length,
                      insert: content,
                    },
                  });
                }
                // Check if "show more" button should appear after content update
                requestAnimationFrame(() => {
                  if (this.editorView) {
                    this._lineCount = this.editorView.state.doc.lines;
                  }
                  this._checkShowMoreButton();
                });
              },
              200,
              { leading: true, trailing: true },
            );
          }

          this.throttledUpdateContent(this._slottedContent);
        }
      }

      this._maybeUpdateDetectedLanguageForStreaming();

      if (
        changedProperties.has("language") ||
        changedProperties.has("highlight")
      ) {
        const languageSupport = await this.getLanguageSupport();
        this.editorView?.dispatch({
          effects: this.languageCompartment.reconfigure(
            languageSupport ? [languageSupport] : [],
          ),
        });
      }
    }
  }

  /**
   * Builds the CodeMirror instance that powers the formatted snippet surface inside the chat response tile.
   */
  private async createEditor() {
    if (!this.editorContainer.value) {
      return;
    }

    const languageSupport = await this.getLanguageSupport();

    const state = EditorState.create({
      doc: this._slottedContent,
      extensions: [
        baseSetupWithoutSearch,
        createCarbonTheme(),
        createCarbonHighlightStyle(),
        this.languageCompartment.of(languageSupport ? [languageSupport] : []),
        this.readOnlyCompartment.of(EditorState.readOnly.of(!this.editable)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && this.onContentChange) {
            this.onContentChange(update.state.doc.toString());
          }
        }),
      ],
    });

    this.editorView = new EditorView({
      state,
      parent: this.editorContainer.value,
    });

    this._lineCount = this.editorView.state.doc.lines;

    // Check height after editor renders
    requestAnimationFrame(() => {
      this._checkShowMoreButton();
    });

    this._maybeUpdateDetectedLanguageForStreaming();
  }

  /**
   * Shows or hides the expand button so the chat message can adapt to long snippets without overwhelming the layout.
   */
  private _checkShowMoreButton() {
    const codeContainerRef = this.shadowRoot?.querySelector(
      `.${prefix}--snippet-container`,
    );
    const codeContentRef = codeContainerRef?.querySelector(
      `.${prefix}--code-editor`,
    );

    if (codeContentRef) {
      const { height } = codeContentRef.getBoundingClientRect();
      const shouldShow =
        height > this.maxCollapsedNumberOfRows * this._rowHeightInPixels;
      if (this._shouldShowMoreLessBtn !== shouldShow) {
        this._shouldShowMoreLessBtn = shouldShow;
        this.requestUpdate();
      }
    }
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

    // Watch for text content changes (for streaming)
    this.contentMutationObserver = new MutationObserver(() => {
      this._handleContentMutations();
    });
  }

  private _hasExtractedContent = false;

  /**
   * Hooks into the rendered slot once Lit has stamped the template so we can observe streaming updates.
   */
  protected firstUpdated() {
    this._observeAssignedNodes();
  }

  /**
   * Ensures we capture any pre-rendered slot content before the initial paint, keeping the editor in sync from the first frame.
   */
  willUpdate(_changedProperties: Map<string, any>) {
    // Extract slot content before first render
    if (!this._hasExtractedContent) {
      this._extractSlotContent();
      this._hasExtractedContent = true;
    }

    // Update expanded-code attribute before render to avoid change-in-update warning
    if (this._expandedCode) {
      this.setAttribute("expanded-code", "");
    } else {
      this.removeAttribute("expanded-code");
    }
  }

  /**
   * Collates the entire slot when incremental diffing is insufficient, keeping the editor in sync with the rendered light DOM.
   */
  private _extractSlotContent() {
    const slot = this.contentSlot.value;
    const textContent = slot
      ? extractSlotContent(slot)
      : extractTextContent(this);
    this._updateSlottedContent(textContent);
  }

  /**
   * Responds to slot churn caused by streaming tokens emitted from the chat pipeline, forcing a full rescan when the slot re-projects.
   */
  private _handleSlotChange() {
    this._observeAssignedNodes();
    this._extractSlotContent();
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
    if (this.throttledUpdateContent) {
      this.throttledUpdateContent.cancel();
    }
    // Disconnect mutation observer
    if (this.contentMutationObserver) {
      this.contentMutationObserver.disconnect();
    }
    if (this._pendingMutationFrame !== null) {
      cancelAnimationFrame(this._pendingMutationFrame);
      this._pendingMutationFrame = null;
    }
    this.destroyEditor();
  }

  /**
   * Drives incremental editor updates after Lit commits.
   */
  updated(changedProperties: Map<string, any>) {
    this.updateEditor(changedProperties);
  }

  /**
   * Debounces mutation bursts so we only recompute slot text once per animation frame during streaming.
   */
  private _handleContentMutations() {
    if (this._pendingMutationFrame === null) {
      this._pendingMutationFrame = requestAnimationFrame(() => {
        this._pendingMutationFrame = null;
        this._extractSlotContent();
      });
    }
  }

  /**
   * Observes the slot's assigned nodes so character data changes from streaming trigger re-extraction.
   */
  private _observeAssignedNodes() {
    const slot = this.contentSlot.value;
    if (!slot || !this.contentMutationObserver) {
      return;
    }

    this.contentMutationObserver.disconnect();

    const assignedNodes = slot.assignedNodes({ flatten: true });
    if (!assignedNodes.length) {
      return;
    }

    for (const node of assignedNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        this.contentMutationObserver.observe(node, {
          characterData: true,
        });
      } else {
        this.contentMutationObserver.observe(node, {
          characterData: true,
          subtree: true,
          childList: true,
        });
      }
    }
  }

  /**
   * Normalizes the raw light DOM text (preserving whitespace) and schedules a Lit update whenever it differs from the previous snapshot.
   */
  private _updateSlottedContent(rawContent: string) {
    // Normalize line endings and trim leading/trailing whitespace
    const normalized = rawContent.replace(/\r\n/g, "\n").trim();
    const previous = this._slottedContent;
    if (normalized !== this._slottedContent) {
      this._slottedContent = normalized;
      this.requestUpdate("_slottedContent", previous);
    }
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
      wrapText,
      tooltipContent,
      showMoreText,
      showLessText,
      _expandedCode: expandedCode,
      _handleCopyClick: handleCopyClick,
      _hasRightOverflow: hasRightOverflow,
      _hasLeftOverflow: hasLeftOverflow,
      _shouldShowMoreLessBtn: shouldShowMoreLessBtn,
    } = this;

    let classes = `${prefix}--snippet ${prefix}--snippet--multi`;
    disabled ? (classes += ` ${prefix}--snippet--disabled`) : "";
    hideCopyButton ? (classes += ` ${prefix}--snippet--no-copy`) : "";
    wrapText ? (classes += ` ${prefix}--snippet--wraptext`) : "";
    hasRightOverflow
      ? (classes += ` ${prefix}--snippet--has-right-overflow`)
      : "";

    const expandButtonClass = `${prefix}--snippet-btn--expand`;
    const disabledCopyButtonClasses = disabled
      ? `${prefix}--snippet--disabled`
      : "";
    const expandCodeBtnText = expandedCode ? showLessText : showMoreText;

    let containerClasses = `${prefix}--snippet-container ${prefix}--snippet--codemirror`;
    if (!expandedCode) {
      containerClasses += ` ${prefix}--snippet-container--collapsed`;
    }

    return html` <!-- Hidden slot for content extraction -->
      <div class="${prefix}--visually-hidden">
        <slot
          ${ref(this.contentSlot)}
          @slotchange=${this._handleSlotChange}
        ></slot>
      </div>
      <div class="full-width">
        <div class="${prefix}--snippet__header">
          <div class="${prefix}--snippet__meta">
            ${this._detectedLanguage
              ? html`<div class="${prefix}--snippet__language">
                  ${this._detectedLanguage}
                </div>`
              : ""}
            ${this._detectedLanguage && this._lineCount
              ? html`<div class="${prefix}--snippet__header-seperator">
                  &nbsp;&mdash;&nbsp;
                </div>`
              : ""}
            ${this._lineCount
              ? html`<div class="${prefix}--snippet__linecount">
                  ${this._lineCount}
                </div>`
              : ""}
          </div>
          ${hideCopyButton
            ? ``
            : html`
                <div class="${prefix}--snippet__copy">
                  <cds-layer level="1">
                    <cds-copy-button
                      ?disabled=${disabled}
                      button-class-name=${disabledCopyButtonClasses}
                      feedback=${feedback}
                      feedback-timeout=${feedbackTimeout}
                      @click="${handleCopyClick}"
                    >
                      ${tooltipContent}
                    </cds-copy-button>
                  </cds-layer>
                </div>
              `}
        </div>
        <div
          role="textbox"
          tabindex="${!disabled ? 0 : null}"
          class="${containerClasses}"
          aria-label="code-snippet"
          aria-readonly="true"
          aria-multiline="true"
        >
          <div
            class="${prefix}--code-editor"
            ${ref(this.editorContainer)}
          ></div>
        </div>

        ${hasLeftOverflow
          ? html`
              <div class="${prefix}--snippet__overflow-indicator--left"></div>
            `
          : ``}
        ${hasRightOverflow
          ? html`
              <div class="${prefix}--snippet__overflow-indicator--right"></div>
            `
          : ``}
        ${shouldShowMoreLessBtn
          ? html`
              <div class="${prefix}--snippet__footer">
                <cds-button
                  kind="ghost"
                  size="sm"
                  button-class-name=${expandButtonClass}
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
      </div>`;
  }

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
}

export default CDSAIChatCodeSnippet;
