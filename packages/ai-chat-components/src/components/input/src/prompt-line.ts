/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `<cds-aichat-prompt-line>` — the editing-surface layer of the chat input
 * stack. Owns a Tiptap `Editor` mounted on a slot-projected light-DOM host so
 * page-level CSS / portal-driven custom token renderers reach the
 * contenteditable.
 *
 * Designed for **chat composers building their own chrome**: the prompt-line
 * has no chat-domain framing (no `mention`/`command`/`autocomplete` props).
 * The single extension-injection knob is `extensions: Extension[]`. Composers
 * wanting chat-domain behavior call the carbon factories
 * (`carbonMention` / `carbonCommand` / `carbonAutocomplete`) and pass the
 * results through.
 *
 * The prompt-line internally always installs a small Carbon bundle: schema
 * (`Document` + `Paragraph` + `Text` + `HardBreak`), value-sync (emits
 * `cds-aichat-prompt-change`), typing-indicator, plain-text paste, keymap
 * (`Mod-Enter` → `cds-aichat-prompt-send-intent`), placeholder, and
 * undo/redo. These bake-ins are **chat-shaped opinion** — non-chat hosts
 * wanting Tiptap inside Lit should compose their own element against
 * `@tiptap/core` directly.
 *
 * @element cds-aichat-prompt-line
 *
 * @experimental
 */

import { Editor, type Extension, type JSONContent } from "@tiptap/core";
import DocumentNode from "@tiptap/extension-document";
import HardBreakNode from "@tiptap/extension-hard-break";
import ParagraphNode from "@tiptap/extension-paragraph";
import TextNode from "@tiptap/extension-text";
import { css, html, LitElement, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";
import { IS_PHONE } from "../../../globals/utils/browser-utils.js";
import {
  adoptOnRoot,
  setVarsForSelector,
} from "../../shared/dynamic-css-var-sheet.js";
import { applyEditorStyles } from "./tiptap/editor-styles.js";
import {
  HISTORY_DEFAULTS,
  Keymap,
  PlainTextPaste,
  Placeholder,
  TypingIndicator,
  UndoRedo,
  ValueSync,
} from "./tiptap/index.js";
import { setHostOriginMeta } from "./tiptap/origin-meta.js";

import styles from "./prompt-line.scss?lit";

const PM_KEYBOARD_FOCUS_CLASS = "cds-aichat--input-pm-content--keyboard-focus";

// Install the keyboard-focus outline rule on whichever root the prompt-line
// ends up adopted into.
let keyboardFocusRuleInstalled = false;
function ensureKeyboardFocusRule(): void {
  if (keyboardFocusRuleInstalled) {
    return;
  }
  setVarsForSelector(`.${PM_KEYBOARD_FOCUS_CLASS}`, { outline: "revert" });
  keyboardFocusRuleInstalled = true;
}

/**
 * Updater shape accepted by `setContent` for reduce-style edits.
 */
type SetContentUpdater = (prev: JSONContent) => JSONContent;

@carbonElement(`${prefix}-prompt-line`)
export class PromptLineElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * Host-supplied Tiptap extensions appended to the carbon bundle. Mutating
   * this array (reference change) recreates the editor with content and
   * selection preserved. Memoize on the host side — every reference change
   * tears down and rebuilds the editor.
   */
  @property({ type: Array, attribute: false })
  extensions: Extension[] = [];

  /**
   * Initial / current content. Accepts Tiptap-native JSONContent or a plain
   * string (treated as a single-paragraph). Updates after mount route through
   * `editor.commands.setContent` with a host-origin meta tag.
   */
  @property({ type: Object, attribute: false })
  content?: JSONContent | string;

  /** Disables editing. The editor remains mounted but non-editable. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Placeholder text shown when the editor is empty. */
  @property({ type: String })
  placeholder = "";

  /** Accessible label for the editor's textbox role. */
  @property({ type: String, attribute: "aria-label", reflect: true })
  override ariaLabel = "";

  /** Test id, applied to the inner ProseMirror contenteditable. */
  @property({ type: String, attribute: "test-id" })
  testId = "";

  /** Focus the editor on mount. */
  @property({ type: Boolean })
  override autofocus = false;

  private _editor: Editor | null = null;
  private _editorHost: HTMLElement | null = null;
  private _lastExtensionsRef: Extension[] | null = null;
  private _focusFromMouse = false;

  // Mirror testId onto the inner ProseMirror contenteditable (not the host
  // wrapper) so Playwright's editable-action helpers (`.fill()`, etc.) accept
  // it. `view.dom` is replaced on each `_recreateEditor`, so re-apply.
  private _applyTestIdToEditorDom(): void {
    const editorDom = this._editor?.view.dom as HTMLElement | undefined;
    if (!editorDom) {
      return;
    }
    if (this.testId) {
      editorDom.setAttribute("data-testid", this.testId);
    } else {
      editorDom.removeAttribute("data-testid");
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  override firstUpdated(): void {
    this._mountEditor();
  }

  override updated(changed: Map<string | number | symbol, unknown>): void {
    if (
      changed.has("extensions") &&
      this.extensions !== this._lastExtensionsRef
    ) {
      this._recreateEditor();
    }
    if (changed.has("disabled") && this._editor) {
      this._editor.setEditable(!this.disabled);
    }
    if (changed.has("content") && this._editor && !changed.has("extensions")) {
      // External content prop change after mount — route through setContent
      // (host-origin tagged so value-sync's storage flag flips).
      this._applyContent(this.content);
    }
    if (changed.has("testId")) {
      this._applyTestIdToEditorDom();
    }
    if (changed.has("ariaLabel") && this._editorHost) {
      if (this.ariaLabel) {
        this._editorHost.setAttribute("aria-label", this.ariaLabel);
      } else {
        this._editorHost.removeAttribute("aria-label");
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._destroyEditor();
  }

  override render() {
    return html`
      <div class="frame">
        <slot name="editor"></slot>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------

  /** Returns the live Tiptap editor, or `null` if unmounted. */
  getEditor(): Editor | null {
    return this._editor;
  }

  override focus(): void {
    this._focusFromMouse = true;
    this._editor?.commands.focus();
  }

  override blur(): void {
    this._editor?.commands.blur();
  }

  clearContent(): void {
    if (!this._editor) {
      return;
    }
    this._editor.commands.clearContent(true);
  }

  setContent(next: JSONContent | string | SetContentUpdater): void {
    if (!this._editor) {
      return;
    }
    if (typeof next === "function") {
      const prev = this._editor.getJSON();
      const nextContent = (next as SetContentUpdater)(prev);
      this._dispatchSetContent(nextContent);
      return;
    }
    this._dispatchSetContent(next);
  }

  insertContent(
    content: JSONContent | string,
    opts: { at?: number } = {},
  ): void {
    if (!this._editor) {
      return;
    }
    if (typeof opts.at === "number") {
      this._editor.commands.insertContentAt(opts.at, content);
      return;
    }
    this._editor.commands.insertContent(content);
  }

  setTextSelection(pos: number | { from: number; to: number }): void {
    this._editor?.commands.setTextSelection(pos);
  }

  selectAll(): void {
    this._editor?.commands.selectAll();
  }

  undo(): boolean {
    return Boolean(this._editor?.commands.undo());
  }

  redo(): boolean {
    return Boolean(this._editor?.commands.redo());
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private _mountEditor(): void {
    const host = document.createElement("div");
    host.setAttribute("slot", "editor");
    host.dataset.aichatEditorHost = "";
    host.setAttribute("role", "textbox");
    host.setAttribute("aria-multiline", "true");
    host.setAttribute("spellcheck", "true");
    if (this.ariaLabel) {
      host.setAttribute("aria-label", this.ariaLabel);
    }

    // Pointer/touch interactions before focus flag the next focus event as
    // mouse-driven so we suppress the keyboard-focus outline.
    const setMouseFlag = () => {
      this._focusFromMouse = true;
    };
    host.addEventListener("pointerdown", setMouseFlag);
    host.addEventListener("mousedown", setMouseFlag);
    host.addEventListener("touchstart", setMouseFlag);

    this.appendChild(host);
    this._editorHost = host;

    // Adopt the dynamic stylesheet on whichever root the prompt-line lives in.
    const root = host.getRootNode();
    if (root instanceof ShadowRoot || root instanceof Document) {
      adoptOnRoot(root);
    }
    ensureKeyboardFocusRule();

    this._lastExtensionsRef = this.extensions;
    this._editor = this._createEditor(host, this.content);
    this._wireEditorEvents(this._editor);
    applyEditorStyles(this._editor.view.dom as HTMLElement, IS_PHONE);
    this._applyTestIdToEditorDom();
    this._editor.setEditable(!this.disabled);

    if (this.autofocus) {
      // Defer to next microtask so the consumer's listeners are attached.
      Promise.resolve().then(() => this._editor?.commands.focus());
    }
  }

  private _createEditor(
    element: HTMLElement,
    content: JSONContent | string | undefined,
  ): Editor {
    const baseExtensions: Extension[] = [
      // Schema baseline.
      DocumentNode as unknown as Extension,
      ParagraphNode as unknown as Extension,
      TextNode as unknown as Extension,
      HardBreakNode as unknown as Extension,
      // Behavior bundle.
      UndoRedo.configure({ ...HISTORY_DEFAULTS }),
      Placeholder.configure({ placeholder: this.placeholder }),
      PlainTextPaste,
      Keymap,
      ValueSync,
      TypingIndicator,
    ];
    return new Editor({
      element,
      extensions: [...baseExtensions, ...this.extensions],
      content: content ?? undefined,
      autofocus: false,
      injectCSS: false,
    });
  }

  private _wireEditorEvents(editor: Editor): void {
    editor.on("focus", () => {
      const wasMouseFocus = this._focusFromMouse;
      this._focusFromMouse = false;
      if (!wasMouseFocus) {
        editor.view.dom.classList.add(PM_KEYBOARD_FOCUS_CLASS);
      }
      this.dispatchEvent(
        new CustomEvent("cds-aichat-prompt-focus", {
          bubbles: true,
          composed: true,
        }),
      );
    });
    editor.on("blur", () => {
      editor.view.dom.classList.remove(PM_KEYBOARD_FOCUS_CLASS);
      this.dispatchEvent(
        new CustomEvent("cds-aichat-prompt-blur", {
          bubbles: true,
          composed: true,
        }),
      );
    });

    // Forward keydown events for hosts wanting raw-key access. ValueSync /
    // TypingIndicator emit their own events; we don't re-dispatch update
    // here.
    editor.view.dom.addEventListener("keydown", (event) => {
      this.dispatchEvent(
        new CustomEvent("cds-aichat-prompt-keydown", {
          detail: { originalEvent: event },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  private _recreateEditor(): void {
    if (!this._editorHost) {
      this._lastExtensionsRef = this.extensions;
      return;
    }
    const previousJson = this._editor?.getJSON();
    const previousSelection = this._editor
      ? {
          from: this._editor.state.selection.from,
          to: this._editor.state.selection.to,
        }
      : null;
    const wasFocused = this._editor?.isFocused ?? false;
    this._editor?.destroy();
    this._editor = null;

    this._lastExtensionsRef = this.extensions;
    this._editor = this._createEditor(
      this._editorHost,
      previousJson ?? this.content,
    );
    this._wireEditorEvents(this._editor);
    applyEditorStyles(this._editor.view.dom as HTMLElement, IS_PHONE);
    this._applyTestIdToEditorDom();
    this._editor.setEditable(!this.disabled);
    if (previousSelection) {
      // Best-effort selection restore: clamp to the new doc's boundaries.
      const { size } = this._editor.state.doc.content;
      const from = Math.min(previousSelection.from, size);
      const to = Math.min(previousSelection.to, size);
      this._editor.commands.setTextSelection({ from, to });
    }
    if (wasFocused) {
      this._editor.commands.focus();
    }
  }

  private _applyContent(content: JSONContent | string | undefined): void {
    if (!this._editor) {
      return;
    }
    this._dispatchSetContent(content ?? "");
  }

  private _dispatchSetContent(content: JSONContent | string): void {
    const editor = this._editor;
    if (!editor) {
      return;
    }
    // Chain a no-op command that meta-tags the accumulator tr as
    // host-origin, then setContent on the same tr so downstream readers
    // (typing-indicator, value-sync's storage flag) recognize the update.
    editor
      .chain()
      .command(({ tr }) => {
        setHostOriginMeta(tr);
        return true;
      })
      .setContent(content, { emitUpdate: true })
      .run();
  }

  private _destroyEditor(): void {
    this._editor?.destroy();
    this._editor = null;
    this._editorHost?.remove();
    this._editorHost = null;
    this._lastExtensionsRef = null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-prompt-line": PromptLineElement;
  }
}

export default PromptLineElement;
