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
 * stack.
 *
 * It renders a lightweight `<textarea>` by default and **never statically
 * imports `@tiptap/*`**, so chats that don't use advanced input features ship
 * no Tiptap. When the `rich` property is set (or host `extensions` are
 * supplied), the element dynamically imports a Tiptap runtime and upgrades the
 * surface in place — text, caret, and focus carry over because the textarea
 * holds plain text. The upgrade is **sticky**: once rich, the element stays
 * rich for the rest of its life.
 *
 * Both modes expose the same imperative API (`getEditor`, `setContent`,
 * `insertContent`, …) and emit the same events, so the React wrapper and
 * `@carbon/ai-chat`'s `Input` are mode-agnostic. `getEditor()` returns `null`
 * in textarea mode (it's a probe — it never triggers a load); call
 * `ensureEditor()` to force the upgrade and resolve with the live editor.
 *
 * The Carbon Tiptap bundle the rich editor installs — schema, value-sync,
 * typing-indicator, plain-text paste, keymap (`Mod-Enter`/`Enter` →
 * `cds-aichat-prompt-send-intent`), placeholder, undo/redo — lives in
 * [./prompt-line-rich-runtime.ts]. Non-chat hosts wanting Tiptap inside Lit
 * should compose their own element against `@tiptap/core` directly.
 *
 * @element cds-aichat-prompt-line
 *
 * @experimental
 */

import type { Editor, Extension, JSONContent } from "@tiptap/core";
import { css, html, LitElement, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";
import { adoptOnRoot } from "../../shared/dynamic-css-var-sheet.js";
import {
  type PromptLineController,
  type PromptLineControllerInit,
  type SetContentUpdater,
  TextareaController,
} from "./prompt-line-controller.js";
import {
  getRichRuntimeIfLoaded,
  loadRichRuntime,
} from "./prompt-line-rich-loader.js";
import { getRawText } from "./tiptap/json-utils.js";

import styles from "./prompt-line.scss?lit";

@carbonElement(`${prefix}-prompt-line`)
export class PromptLineElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * Host-supplied Tiptap extensions, appended to the carbon bundle when the
   * rich editor mounts. These are *staged*, not a rich-mode trigger: setting
   * them while in textarea mode does not load Tiptap. Select rich explicitly
   * with `rich` or call `ensureEditor()`; the upgrade mounts with these
   * already installed. Memoize on the host side — a reference change recreates
   * a live editor.
   */
  @property({ type: Array, attribute: false })
  extensions: Extension[] = [];

  /**
   * Initial / current content. Accepts Tiptap-native JSONContent or a plain
   * string. In textarea mode JSONContent is flattened to plain text.
   */
  @property({ type: Object, attribute: false })
  content?: JSONContent | string;

  /**
   * Selects the rich Tiptap editor. The element lazy-loads Tiptap and upgrades
   * the textarea in place; the upgrade is sticky (clearing `rich` later keeps
   * the editor). Defaults to the textarea.
   */
  @property({ type: Boolean, reflect: true })
  rich = false;

  /** Disables editing. The surface stays mounted but non-editable. */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /** Placeholder text shown when the surface is empty. */
  @property({ type: String })
  placeholder = "";

  /** Accessible label for the editing surface. */
  @property({ type: String, attribute: "aria-label", reflect: true })
  override ariaLabel = "";

  /** Test id, applied to the inner editable element. */
  @property({ type: String, attribute: "test-id" })
  testId = "";

  /** Focus the surface on mount. */
  @property({ type: Boolean })
  override autofocus = false;

  private _controller: PromptLineController | null = null;
  private _mode: "textarea" | "rich" = "textarea";
  private _editorHost: HTMLElement | null = null;
  private _lastExtensionsRef: Extension[] | null = null;
  /** Sticky latch — once rich is wanted it never reverts. */
  private _richLatched = false;
  private _upgrading = false;
  private _isComposing = false;
  private _pendingUpgrade = false;
  /**
   * Shared promise for in-flight `ensureEditor()` callers. Created lazily on the
   * first `ensureEditor()` call that needs an upgrade, settled once the rich
   * editor is mounted (`_swapToRich`) or the upgrade can't complete.
   */
  private _richReady: Promise<Editor> | null = null;
  private _resolveRichReady: ((editor: Editor) => void) | null = null;
  private _rejectRichReady: ((reason: Error) => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  override firstUpdated(): void {
    const host = this._mountEditorHost();
    this._lastExtensionsRef = this.extensions;
    this._richLatched = this._wantsRich();

    const warmRuntime = this._richLatched ? getRichRuntimeIfLoaded() : null;
    if (warmRuntime) {
      // Runtime already loaded (e.g. preloaded at boot) — mount rich directly,
      // no textarea flash.
      this._mode = "rich";
      this._controller = warmRuntime.createRichController();
      this._controller.mount(host, this._makeInit());
    } else {
      this._mode = "textarea";
      this._controller = new TextareaController();
      this._controller.mount(host, this._makeInit());
      if (this._richLatched) {
        void this._upgradeToRich();
      }
    }

    if (this.autofocus) {
      // Defer so consumer listeners are attached first.
      Promise.resolve().then(() => this._controller?.focus());
    }
  }

  override updated(changed: Map<string | number | symbol, unknown>): void {
    if (!this._controller) {
      return;
    }
    if (
      (changed.has("rich") || changed.has("extensions")) &&
      this._wantsRich()
    ) {
      this._richLatched = true;
      if (this._mode === "textarea") {
        void this._upgradeToRich();
      }
    }
    if (
      changed.has("extensions") &&
      this.extensions !== this._lastExtensionsRef
    ) {
      this._lastExtensionsRef = this.extensions;
      if (this._mode === "rich") {
        this._controller.setExtensions(this.extensions);
      }
    }
    if (changed.has("disabled")) {
      this._controller.setEditable(!this.disabled);
    }
    if (changed.has("content") && !changed.has("extensions")) {
      this._controller.setContent(this.content ?? "");
    }
    if (changed.has("placeholder")) {
      this._controller.setPlaceholder(this.placeholder);
    }
    if (changed.has("testId")) {
      this._controller.setTestId(this.testId);
    }
    if (changed.has("ariaLabel")) {
      this._controller.setAriaLabel(this.ariaLabel);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._failRichReady(new Error("Input is not currently rendered"));
    this._controller?.destroy();
    this._controller = null;
    this._editorHost?.remove();
    this._editorHost = null;
    this._lastExtensionsRef = null;
  }

  override render() {
    return html`
      <div class="frame">
        <slot name="editor"></slot>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Public methods (delegate to the active controller)
  // ---------------------------------------------------------------------------

  /** Returns the live Tiptap editor, or `null` in textarea mode. */
  getEditor(): Editor | null {
    return this._controller?.getEditor() ?? null;
  }

  /**
   * Lazily load Tiptap (if not already loaded), upgrade the textarea to the
   * rich editor in place, and resolve with the live editor. Resolves
   * immediately when already rich. Rejects when the surface isn't mounted or
   * the runtime can't load (SSR). Concurrent callers share one in-flight
   * upgrade.
   */
  ensureEditor(): Promise<Editor> {
    if (this._mode === "rich") {
      const editor = this._controller?.getEditor();
      if (editor) {
        return Promise.resolve(editor);
      }
    }
    // Connected but not yet rendered, or already torn down — nothing to upgrade.
    if (!this._editorHost || !this._controller) {
      return Promise.reject(new Error("Input is not currently rendered"));
    }
    this._richLatched = true;
    if (!this._richReady) {
      this._richReady = new Promise<Editor>((resolve, reject) => {
        this._resolveRichReady = resolve;
        this._rejectRichReady = reject;
      });
    }
    void this._upgradeToRich();
    return this._richReady;
  }

  /**
   * Current plain-text value. Works in both modes (in rich mode this mirrors
   * `getEditor()?.getText()`), so callers don't need to branch on `getEditor()`
   * being `null`.
   */
  getValue(): string {
    return this._controller?.getValue() ?? "";
  }

  override focus(): void {
    this._controller?.focus();
  }

  override blur(): void {
    this._controller?.blur();
  }

  /** Returns `true` if the editing surface currently holds focus. */
  hasFocus(): boolean {
    return this._controller?.hasFocus() ?? false;
  }

  clearContent(): void {
    this._controller?.clearContent();
  }

  setContent(next: JSONContent | string | SetContentUpdater): void {
    this._controller?.setContent(next);
  }

  insertContent(
    content: JSONContent | string,
    opts: { at?: number } = {},
  ): void {
    this._controller?.insertContent(content, opts);
  }

  setTextSelection(pos: number | { from: number; to: number }): void {
    this._controller?.setTextSelection(pos);
  }

  selectAll(): void {
    this._controller?.selectAll();
  }

  undo(): boolean {
    return this._controller?.undo() ?? false;
  }

  redo(): boolean {
    return this._controller?.redo() ?? false;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private _wantsRich(): boolean {
    return this._richLatched || this.rich;
  }

  private _mountEditorHost(): HTMLElement {
    const host = document.createElement("div");
    host.setAttribute("slot", "editor");
    host.dataset.aichatEditorHost = "";
    this.appendChild(host);
    this._editorHost = host;

    // Defer an upgrade requested mid-IME-composition so we don't tear the
    // field out from under the user.
    host.addEventListener("compositionstart", this._onCompositionStart);
    host.addEventListener("compositionend", this._onCompositionEnd);

    const root = host.getRootNode();
    if (root instanceof ShadowRoot || root instanceof Document) {
      adoptOnRoot(root);
    }
    return host;
  }

  private _onCompositionStart = (): void => {
    this._isComposing = true;
  };

  private _onCompositionEnd = (): void => {
    this._isComposing = false;
    if (this._pendingUpgrade) {
      this._pendingUpgrade = false;
      void this._upgradeToRich();
    }
  };

  /** Build the controller init from current props (rich seed by default). */
  private _makeInit(valueOverride?: string): PromptLineControllerInit {
    const value =
      valueOverride ??
      (typeof this.content === "string"
        ? this.content
        : this.content
          ? getRawText(this.content)
          : "");
    return {
      value,
      // On an upgrade we seed losslessly from the textarea's plain text, so
      // the structured `content` prop is only used for the initial mount.
      content: valueOverride === undefined ? this.content : undefined,
      placeholder: this.placeholder,
      disabled: this.disabled,
      ariaLabel: this.ariaLabel,
      testId: this.testId,
      extensions: this.extensions,
    };
  }

  /** Resolve any pending `ensureEditor()` callers with the live editor. */
  private _settleRichReady(): void {
    const editor = this._controller?.getEditor();
    if (editor && this._resolveRichReady) {
      this._resolveRichReady(editor);
      this._resolveRichReady = null;
      this._rejectRichReady = null;
    }
  }

  /**
   * Reject any pending `ensureEditor()` callers and clear the shared promise so
   * a later call can retry.
   */
  private _failRichReady(reason: Error): void {
    if (this._rejectRichReady) {
      this._rejectRichReady(reason);
    }
    this._resolveRichReady = null;
    this._rejectRichReady = null;
    this._richReady = null;
  }

  /** Lazily load Tiptap and swap the textarea for the rich editor in place. */
  private async _upgradeToRich(): Promise<void> {
    if (this._mode === "rich" || this._upgrading) {
      return;
    }
    this._upgrading = true;
    try {
      const module = getRichRuntimeIfLoaded() ?? (await loadRichRuntime());
      // Bail if disconnected or runtime unavailable (SSR). The `_upgrading`
      // latch already prevents a concurrent upgrade.
      if (!module || !this._editorHost || !this._controller) {
        this._failRichReady(
          new Error(
            module
              ? "Input is not currently rendered"
              : "Input editor runtime is unavailable",
          ),
        );
        return;
      }
      if (this._isComposing) {
        // Defer until composition ends; `_richReady` stays pending and settles
        // when `_onCompositionEnd` re-runs the upgrade.
        this._pendingUpgrade = true;
        return;
      }
      this._swapToRich(module.createRichController());
    } catch (error) {
      // A failed runtime load or mount must reject pending `ensureEditor()`
      // callers rather than leave them hanging.
      this._failRichReady(
        error instanceof Error ? error : new Error(String(error)),
      );
    } finally {
      this._upgrading = false;
    }
  }

  private _swapToRich(rich: PromptLineController): void {
    const previous = this._controller;
    const host = this._editorHost;
    if (!previous || !host) {
      return;
    }
    const value = previous.getValue();
    const selection = previous.getSelection();
    const hadFocus = previous.hasFocus();

    previous.destroy();
    this._controller = rich;
    this._mode = "rich";
    rich.mount(host, this._makeInit(value));

    // Map plain-text caret offsets into the seeded doc. `textToDoc` makes one
    // paragraph per line, so a position costs +1 for the doc/first-paragraph
    // start plus +1 for every newline before it (each opens a new paragraph).
    const toDocPos = (offset: number): number =>
      offset + 1 + (value.slice(0, offset).split("\n").length - 1);
    rich.setTextSelection({
      from: toDocPos(selection.from),
      to: toDocPos(selection.to),
    });
    if (hadFocus) {
      rich.focus();
    }
    this._settleRichReady();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-prompt-line": PromptLineElement;
  }
}

export default PromptLineElement;
