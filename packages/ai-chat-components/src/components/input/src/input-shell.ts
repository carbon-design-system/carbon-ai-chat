/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Editor, Extension, type JSONContent } from "@tiptap/core";
import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import "../../autocomplete/src/autocomplete.js";
// Side-effect import: registers <cds-aichat-prompt-line> so the slot's
// fallback content upgrades correctly even when consumers import this
// shell module directly (bypassing the public barrel).
import "./prompt-line.js";
import "./stop-streaming-button.js";

import styles from "./input-shell.scss?lit";

import { AutocompleteListManager } from "./autocomplete-list-manager.js";
import { buildCarbonExtensions } from "./tiptap/build-extensions.js";
import { projectRawValue } from "./tiptap/json-utils.js";
import type {
  AutocompleteConfig,
  SuggestionItem,
  TriggerSuggestionConfig,
} from "./tiptap/types.js";
import type { SendEventDetail, TriggerChangeEventDetail } from "./types.js";
import PromptLineElement from "./prompt-line.js";

/**
 * Composer chrome for the chat input — wraps a `<cds-aichat-prompt-line>`
 * with file uploads, the send control, the autocomplete overlay, and the
 * char counter. Forwards every editor method to the inner prompt-line.
 *
 * Consumers compose child components into named slots:
 * - `message-actions` — action icons to the left of the text area
 * - `file-uploads` — visual list of files being uploaded
 * - `send-control` — send button / stop streaming button
 * - `autocomplete-content` — suggestion overlay above input (driven internally)
 *
 * @element cds-aichat-input-shell
 */
@carbonElement(`${prefix}-input-shell`)
class InputShellElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  // -----------------------------------------------------------------------
  // Properties — chrome
  // -----------------------------------------------------------------------

  /** Disables editing and send. The editor remains mounted but non-editable. */
  @property({ type: Boolean, attribute: "disabled" })
  disabled = false;

  /** Placeholder text shown while the editor is empty. */
  @property({ type: String, attribute: "placeholder" })
  placeholder = "";

  /**
   * Canonical raw text value of the editor. Setting this externally (e.g. to
   * clear the editor after send) is mirrored into the inner prompt-line via
   * `setContent`. Changes inside the editor flow back via the prompt-line's
   * `cds-aichat-prompt-change` event.
   */
  @property({ type: String, attribute: "raw-value" })
  rawValue = "";

  /**
   * Optional character cap. Typing past the limit is allowed, but submission
   * is blocked while `rawValue.length > maxLength` (see `overMaxLength`).
   */
  @property({ type: Number, attribute: "max-length" })
  maxLength?: number;

  /**
   * Reflects as `over-max-length` on the host when `rawValue.length` exceeds
   * `maxLength`. Read-only contract.
   *
   * @fires cds-aichat-input-over-max-change — `{ overMax: boolean }`
   */
  @property({ type: Boolean, reflect: true, attribute: "over-max-length" })
  overMaxLength = false;

  /** Reflects to attribute so consumer CSS can target rounded variant. */
  @property({ type: Boolean, reflect: true })
  rounded = false;

  /** Accessible label applied to the editor's textbox role. */
  @property({ type: String, attribute: "aria-label" })
  override ariaLabel = "Message";

  /** Test id forwarded to the editor's contenteditable host. */
  @property({ type: String, attribute: "test-id" })
  testId = "";

  // -----------------------------------------------------------------------
  // Properties — chat-domain configs (PR 3)
  // -----------------------------------------------------------------------

  /** `@`-style mention trigger config. */
  @property({ attribute: false })
  mention?: TriggerSuggestionConfig;

  /** `/`-style command trigger config. */
  @property({ attribute: false })
  command?: TriggerSuggestionConfig;

  /** Live-typeahead autocomplete config (no trigger character). */
  @property({ attribute: false })
  autocomplete?: AutocompleteConfig;

  /** Starter prompts shown when the editor is empty + focused + editable. */
  @property({ type: Array, attribute: false })
  starters?: SuggestionItem[];

  /** Host-supplied Tiptap extensions appended to the curated bundle. */
  @property({ type: Array, attribute: false })
  extensions?: Extension[];

  /**
   * When true, the send button renders disabled and the
   * `cds-aichat-prompt-send-intent` → `cds-aichat-input-send` re-dispatch is
   * suppressed. Orthogonal to `disabled`: the editor stays editable.
   */
  @property({ type: Boolean, attribute: "is-send-disabled" })
  isSendDisabled = false;

  // -----------------------------------------------------------------------
  // Internal state
  // -----------------------------------------------------------------------

  @state()
  private _triggerState: TriggerChangeEventDetail | null = null;

  @state()
  private _hasMessageActions = false;

  @query('slot[name="editor"]')
  private _editorSlot!: HTMLSlotElement;

  /**
   * The currently-active prompt-line — either the slot's fallback element or
   * a consumer-provided child assigned to `slot="editor"`. Resolved by
   * `_resolveActivePromptLine()` on `firstUpdated` and on every `slotchange`.
   * Calls during the brief upgrade window (resolver hasn't run yet) silently
   * no-op — consumers shouldn't be calling shell methods before mount.
   */
  private _activePromptLine: PromptLineElement | null = null;

  /**
   * Reference cache for the last `extensions` array forwarded into the
   * active prompt-line. The prompt-line tears down and rebuilds its editor
   * on `extensions` reference change, so we only forward when the reference
   * actually differs to avoid spurious recreates on unrelated shell updates.
   */
  private _lastForwardedExtensions: Extension[] | null = null;

  private _autocompleteListManager: AutocompleteListManager | null = null;

  /** Cached extension list — recomputed on chat-domain prop changes. */
  @state()
  private _computedExtensions: Extension[] = [];

  /** Cached chat-Enter binding so its identity is stable across renders. */
  private readonly _chatEnterExtension: Extension = buildChatEnterSends();

  // -----------------------------------------------------------------------
  // Computed
  // -----------------------------------------------------------------------

  /** True when there is at least one non-whitespace character to send. */
  get hasValidInput(): boolean {
    return Boolean(this.rawValue?.trim());
  }

  private _shouldShowCharCount(): boolean {
    if (this.maxLength == null) {
      return false;
    }
    return this.rawValue.length >= this.maxLength;
  }

  private _recomputeExtensions(): void {
    const carbon = buildCarbonExtensions({
      mention: this.mention,
      command: this.command,
      autocomplete: this.autocomplete,
      starters: this.starters,
    });
    this._computedExtensions = [
      this._chatEnterExtension,
      ...carbon,
      ...(this.extensions ?? []),
    ];
  }

  // -----------------------------------------------------------------------
  // Lit lifecycle
  // -----------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    if (this._computedExtensions.length === 0) {
      this._recomputeExtensions();
    }
  }

  override firstUpdated(): void {
    this._initAutocompleteListManager();
    void this._resolveActivePromptLine();
  }

  override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);

    // Recompute the curated extensions list when any chat-domain config or
    // host-supplied extensions array reference changes. The prompt-line
    // recreates its editor on `extensions` reference change; the diff-check
    // in `_forwardPromptLineProps()` keeps unrelated shell updates from
    // propagating a new reference.
    if (
      changedProperties.has("mention") ||
      changedProperties.has("command") ||
      changedProperties.has("autocomplete") ||
      changedProperties.has("starters") ||
      changedProperties.has("extensions")
    ) {
      this._recomputeExtensions();
    }

    this._forwardPromptLineProps();

    if (changedProperties.has("rawValue")) {
      this._syncRawValueIntoEditor();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._autocompleteListManager?.disconnect();
    this._autocompleteListManager = null;
    if (this._activePromptLine) {
      this._unbindPromptLineListeners(this._activePromptLine);
      this._activePromptLine = null;
    }
    this._lastForwardedExtensions = null;
  }

  override render() {
    const containerClasses = {
      [`${prefix}--input-container`]: true,
      [`${prefix}--input-container--has-message-actions`]:
        this._hasMessageActions,
    };

    const usePlaceholder = this.placeholder && !this.rawValue;

    return html`
      <div class="${prefix}--input-shell">
        <div class=${classMap(containerClasses)}>
          <div class="${prefix}--input-uploads-and-autocomplete">
            <slot name="file-uploads"></slot>
            <slot name="autocomplete-content"></slot>
          </div>
          <div class="${prefix}--input-field-container">
            <div class="${prefix}--input-text-and-actions">
              <slot
                name="message-actions"
                @slotchange=${this._handleMessageActionsSlotChange}
              ></slot>

              <div class="${prefix}--input-text-area">
                ${usePlaceholder
                  ? html`<div
                      class="${prefix}--input-placeholder"
                      aria-hidden="true"
                    >
                      ${this.placeholder}
                    </div>`
                  : nothing}
                <slot name="editor" @slotchange=${this._handleEditorSlotChange}>
                  <cds-aichat-prompt-line></cds-aichat-prompt-line>
                </slot>
              </div>
            </div>
            ${this._shouldShowCharCount()
              ? html`
                  <div class="${prefix}--input-char-count">
                    ${this.rawValue.length} / ${this.maxLength}
                  </div>
                `
              : nothing}
          </div>

          <div class="${prefix}--input-send-control-container">
            <slot
              name="send-control"
              @cds-aichat-input-send=${this._handleSendControlSend}
            ></slot>
          </div>
        </div>
      </div>
    `;
  }

  // -----------------------------------------------------------------------
  // Public methods (forwarders)
  // -----------------------------------------------------------------------

  /**
   * Returns the live Tiptap editor or `null` if unmounted. Returns `null`
   * during the brief upgrade window before the editor slot is resolved.
   */
  getEditor(): Editor | null {
    return this._activePromptLine?.getEditor() ?? null;
  }

  setContent(
    next: JSONContent | string | ((prev: JSONContent) => JSONContent),
  ): void {
    this._activePromptLine?.setContent(next);
  }

  insertContent(content: JSONContent | string, opts?: { at?: number }): void {
    this._activePromptLine?.insertContent(content, opts);
  }

  /** Returns true when the editor was successfully focused. */
  requestFocus(): boolean {
    const promptLine = this._activePromptLine;
    if (!promptLine) {
      return false;
    }
    promptLine.focus();
    return true;
  }

  hasFocus(): boolean {
    return this.getEditor()?.isFocused ?? false;
  }

  override blur(): void {
    this._activePromptLine?.blur();
  }

  clearContent(): void {
    this._activePromptLine?.clearContent();
  }

  setTextSelection(pos: number | { from: number; to: number }): void {
    this._activePromptLine?.setTextSelection(pos);
  }

  selectAll(): void {
    this._activePromptLine?.selectAll();
  }

  undo(): boolean {
    return this._activePromptLine?.undo() ?? false;
  }

  redo(): boolean {
    return this._activePromptLine?.redo() ?? false;
  }

  /** Dismiss any active suggestion / starter list. */
  dismissTrigger(): void {
    this._dismissTrigger();
  }

  // -----------------------------------------------------------------------
  // Prompt-line event handlers
  // -----------------------------------------------------------------------

  private _handlePromptChange = (event: Event): void => {
    const detail = (
      event as CustomEvent<{
        rawValue: string;
        content: JSONContent;
      }>
    ).detail;
    event.stopPropagation();

    const wasOver = this.overMaxLength;
    this.rawValue = detail.rawValue;
    if (this.maxLength != null) {
      const isOver = detail.rawValue.length > this.maxLength;
      this.overMaxLength = isOver;
      if (isOver !== wasOver) {
        this.dispatchEvent(
          new CustomEvent("cds-aichat-input-over-max-change", {
            detail: { overMax: isOver },
            bubbles: true,
            composed: true,
          }),
        );
      }
    }

    this.dispatchEvent(
      new CustomEvent("cds-aichat-input-change", {
        detail: { rawValue: detail.rawValue, content: detail.content },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handlePromptFocus = (event: Event): void => {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("cds-aichat-input-focus", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handlePromptBlur = (event: Event): void => {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("cds-aichat-input-blur", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handlePromptTyping = (event: Event): void => {
    const detail = (event as CustomEvent<{ isTyping: boolean }>).detail;
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("cds-aichat-input-typing", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handlePromptKeydown = (event: Event): void => {
    const detail = (event as CustomEvent<{ originalEvent: KeyboardEvent }>)
      .detail;
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("cds-aichat-input-keydown", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  };

  private _handleSendIntent = (event: Event): void => {
    event.stopPropagation();
    if (this.isSendDisabled) {
      return;
    }
    if (this.overMaxLength) {
      return;
    }
    if (!this.rawValue.trim()) {
      return;
    }
    this._dispatchSend();
  };

  private _handleTriggerChange = (event: Event): void => {
    const detail = (event as CustomEvent<TriggerChangeEventDetail | null>)
      .detail;
    event.stopPropagation();
    this._triggerState = detail;
    void this._updateAutocompleteList();
    this.dispatchEvent(
      new CustomEvent("cds-aichat-trigger-change", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  };

  // -----------------------------------------------------------------------
  // Send-control handler
  // -----------------------------------------------------------------------

  private _handleSendControlSend = (event: Event): void => {
    if (this.isSendDisabled || this.overMaxLength) {
      event.stopPropagation();
      return;
    }
    if (!this.rawValue.trim()) {
      event.stopPropagation();
      return;
    }
    // Augment the bubbling event with the latest rawValue so consumers don't
    // have to read it from the shell themselves.
    event.stopPropagation();
    this._dispatchSend();
  };

  private _dispatchSend(): void {
    const detail: SendEventDetail = { text: this.rawValue };
    this.dispatchEvent(
      new CustomEvent("cds-aichat-input-send", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  // -----------------------------------------------------------------------
  // Autocomplete list management
  // -----------------------------------------------------------------------

  private _initAutocompleteListManager(): void {
    this._autocompleteListManager = new AutocompleteListManager({
      onAutocompleteSelect: (item) => {
        this._handleSelection(item);
      },
      onAutocompleteDismiss: () => {
        this._dismissTrigger();
      },
      onCustomListRender: (renderDetail) => {
        this.dispatchEvent(
          new CustomEvent("cds-aichat-custom-list-render", {
            detail: renderDetail,
            bubbles: true,
            composed: true,
          }),
        );
      },
    });
  }

  private async _updateAutocompleteList(): Promise<void> {
    const trigger = this._triggerState;
    const manager = this._autocompleteListManager;
    if (!manager) {
      return;
    }
    if (!trigger) {
      manager.update(this, null, [], undefined);
      return;
    }
    const items = await this._resolveItems(trigger);
    const renderCustomList = this._resolveRenderCustomList(trigger.type);
    manager.update(this, trigger, items, renderCustomList);
  }

  private async _resolveItems(
    trigger: TriggerChangeEventDetail,
  ): Promise<SuggestionItem[]> {
    if (trigger.type === "starter") {
      return this.starters ?? [];
    }
    const config =
      trigger.type === "mention"
        ? this.mention
        : trigger.type === "command"
          ? this.command
          : trigger.type === "autocomplete"
            ? this.autocomplete
            : undefined;
    if (!config) {
      return [];
    }
    return await resolveConfigItems(config, trigger.query);
  }

  private _resolveRenderCustomList(triggerType: string) {
    if (triggerType === "starter") {
      return undefined;
    }
    const config =
      triggerType === "mention"
        ? this.mention
        : triggerType === "command"
          ? this.command
          : triggerType === "autocomplete"
            ? this.autocomplete
            : undefined;
    return config?.renderCustomList;
  }

  private _handleSelection(item: SuggestionItem): void {
    const trigger = this._triggerState;
    const editor = this.getEditor();
    if (!trigger || !editor) {
      return;
    }

    if (trigger.type === "starter") {
      // Insert the starter's text into the editor and (unless gated) auto-send.
      const text = item.value ?? item.label;
      editor.commands.insertContent(text);
      this.rawValue = projectRawValue(editor);
      // Fire onSelect callback for analytics / side-effects.
      // Starters don't have a config object, so no callback to fire.
      this._dismissTrigger();
      if (!this.isSendDisabled) {
        this._dispatchSend();
      }
      return;
    }

    if (trigger.type === "mention" || trigger.type === "command") {
      const config = trigger.type === "mention" ? this.mention : this.command;
      const nodeName = trigger.type;
      const range = {
        from: trigger.triggerOffset,
        to: editor.state.selection.from,
      };
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: nodeName,
            attrs: {
              id: item.id,
              label: item.label,
              value: item.value ?? item.label,
            },
          },
          { type: "text", text: " " },
        ])
        .run();
      config?.onSelect?.(item);
    } else if (trigger.type === "autocomplete") {
      const text = item.value ?? item.label;
      const range = {
        from: trigger.triggerOffset,
        to: editor.state.selection.from,
      };
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          { type: "text", text },
          { type: "text", text: " " },
        ])
        .run();
      this.autocomplete?.onSelect?.(item);
    }

    this.dispatchEvent(
      new CustomEvent("cds-aichat-autocomplete-select", {
        detail: { item },
        bubbles: true,
        composed: true,
      }),
    );

    this._dismissTrigger();
  }

  private _dismissTrigger(): void {
    this._triggerState = null;
    this._autocompleteListManager?.update(this, null, [], undefined);
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private _syncRawValueIntoEditor(): void {
    const promptLine = this._activePromptLine;
    const editor = promptLine?.getEditor();
    if (!promptLine || !editor) {
      return;
    }
    const currentText = projectRawValue(editor);
    if (currentText === this.rawValue) {
      return;
    }
    promptLine.setContent(this.rawValue);
  }

  private _handleMessageActionsSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this._hasMessageActions = slot.assignedElements().length > 0;
  };

  // -----------------------------------------------------------------------
  // Editor slot composition
  // -----------------------------------------------------------------------

  private _handleEditorSlotChange = (): void => {
    void this._resolveActivePromptLine();
  };

  /**
   * Resolve the prompt-line projected into `slot[name="editor"]`. Picks the
   * first `PromptLineElement` from `slot.assignedElements({ flatten: true })`
   * — `flatten: true` returns fallback content when nothing is light-DOM-
   * assigned. Filters by `instanceof PromptLineElement` so consumers can
   * wrap the prompt-line in extra markup without breaking resolution.
   *
   * On every transition (initial resolution, slot reassignment, unassign-
   * ment), unbinds events from the previous element and rebinds on the new
   * one. Treats "no longer my active" as a logical disconnect — the prompt-
   * line's `disconnectedCallback` only fires on DOM removal, not on slot
   * unassignment.
   */
  private async _resolveActivePromptLine(): Promise<void> {
    const slot = this._editorSlot;
    if (!slot) {
      return;
    }
    const assigned = slot.assignedElements({ flatten: true });
    let next =
      (assigned.find((el) => el instanceof PromptLineElement) as
        | PromptLineElement
        | undefined) ?? null;
    // Per spec, `flatten: true` returns fallback content when nothing is
    // light-DOM-assigned; some DOM implementations (notably happy-dom) skip
    // fallback. Fall back to the slot's own children — when nothing is
    // assigned, those ARE the rendered fallback nodes.
    if (!next) {
      next =
        (Array.from(slot.children).find(
          (el) => el instanceof PromptLineElement,
        ) as PromptLineElement | undefined) ?? null;
    }

    if (next === this._activePromptLine) {
      return;
    }

    if (this._activePromptLine) {
      this._unbindPromptLineListeners(this._activePromptLine);
    }
    this._activePromptLine = next;
    this._lastForwardedExtensions = null;

    if (next) {
      this._bindPromptLineListeners(next);
      this._forwardPromptLineProps();
      // Wait for the prompt-line's first update so its editor is mounted
      // before we sync any pending rawValue into it.
      await next.updateComplete;
      if (this._activePromptLine === next && this.rawValue) {
        this._syncRawValueIntoEditor();
      }
    }
  }

  private _bindPromptLineListeners(el: PromptLineElement): void {
    el.addEventListener("cds-aichat-prompt-change", this._handlePromptChange);
    el.addEventListener("cds-aichat-prompt-focus", this._handlePromptFocus);
    el.addEventListener("cds-aichat-prompt-blur", this._handlePromptBlur);
    el.addEventListener("cds-aichat-prompt-typing", this._handlePromptTyping);
    el.addEventListener("cds-aichat-prompt-keydown", this._handlePromptKeydown);
    el.addEventListener(
      "cds-aichat-prompt-send-intent",
      this._handleSendIntent,
    );
    el.addEventListener("cds-aichat-trigger-change", this._handleTriggerChange);
  }

  private _unbindPromptLineListeners(el: PromptLineElement): void {
    el.removeEventListener(
      "cds-aichat-prompt-change",
      this._handlePromptChange,
    );
    el.removeEventListener("cds-aichat-prompt-focus", this._handlePromptFocus);
    el.removeEventListener("cds-aichat-prompt-blur", this._handlePromptBlur);
    el.removeEventListener(
      "cds-aichat-prompt-typing",
      this._handlePromptTyping,
    );
    el.removeEventListener(
      "cds-aichat-prompt-keydown",
      this._handlePromptKeydown,
    );
    el.removeEventListener(
      "cds-aichat-prompt-send-intent",
      this._handleSendIntent,
    );
    el.removeEventListener(
      "cds-aichat-trigger-change",
      this._handleTriggerChange,
    );
  }

  private _forwardPromptLineProps(): void {
    const target = this._activePromptLine;
    if (!target) {
      return;
    }
    target.disabled = this.disabled;
    target.ariaLabel = this.ariaLabel;
    target.testId = this.testId;
    if (this._computedExtensions !== this._lastForwardedExtensions) {
      target.extensions = this._computedExtensions;
      this._lastForwardedExtensions = this._computedExtensions;
    }
  }
}

// ---------------------------------------------------------------------------
// Module helpers
// ---------------------------------------------------------------------------

/**
 * Builds the chat-shell-only Tiptap extension that binds plain Enter to fire
 * `cds-aichat-prompt-send-intent` (matching legacy chat UX). The prompt-line
 * itself stays generic and only binds Mod-Enter; the shell layers in this
 * binding so chat composers using the shell get Enter-sends without
 * configuring it themselves.
 */
function buildChatEnterSends(): Extension {
  return Extension.create({
    name: "carbonShellChatEnter",
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          if (editor.isEmpty) {
            return false;
          }
          editor.view.dom.dispatchEvent(
            new CustomEvent("cds-aichat-prompt-send-intent", {
              bubbles: true,
              composed: true,
            }),
          );
          return true;
        },
      };
    },
  });
}

/**
 * Resolve a `BaseSuggestionConfig`'s `items` field — array or async resolver
 * — to a flat list, applying `minQueryLength` filtering.
 */
async function resolveConfigItems(
  config: {
    items:
      | SuggestionItem[]
      | ((query: string) => Promise<SuggestionItem[]> | SuggestionItem[]);
    minQueryLength?: number;
  },
  query: string,
): Promise<SuggestionItem[]> {
  const minQueryLength = config.minQueryLength ?? 0;
  if (query.length < minQueryLength) {
    return [];
  }
  if (typeof config.items === "function") {
    return await Promise.resolve(config.items(query));
  }
  if (!query) {
    return config.items;
  }
  const lower = query.toLowerCase();
  return config.items.filter((item) =>
    item.label.toLowerCase().includes(lower),
  );
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-input-shell": InputShellElement;
  }
}

export default InputShellElement;
