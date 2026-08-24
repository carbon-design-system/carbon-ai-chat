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
 * no Tiptap. When the `rich` property is set, or `ensureEditor()` is called,
 * the element dynamically imports a Tiptap runtime and upgrades the surface in
 * place — text, caret, and focus carry over because the textarea holds plain
 * text. Host `extensions` alone do not trigger it; they are staged for whichever
 * surface mounts. The upgrade is **sticky**: once rich, the element stays rich
 * for the rest of its life.
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

import type { Editor, Extension, JSONContent } from '@tiptap/core';
import { css, html, LitElement, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';

import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import prefix from '../../../globals/settings.js';
import { adoptOnRoot } from '../../shared/dynamic-css-var-sheet.js';
import {
  type PromptLineController,
  type PromptLineControllerInit,
  type SetContentUpdater,
  TextareaController,
} from './prompt-line-controller.js';
import {
  getRichRuntimeIfLoaded,
  loadRichRuntime,
} from './prompt-line-rich-loader.js';
import { getRawText, textOffsetToDocPos } from './tiptap/json-utils.js';

import styles from './prompt-line.scss?lit';

@carbonElement(`${prefix}-prompt-line`)
class PromptLineElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * Host-supplied Tiptap extensions, appended to the carbon bundle when the
   * rich editor mounts. These are *staged*, not a rich-mode trigger: setting
   * them while in textarea mode does not load Tiptap. Select rich explicitly
   * with `rich` or call `ensureEditor()`; the upgrade mounts with these
   * already installed.
   *
   * A new array is compared by value against the set last supplied, so a config
   * update that rebuilds an equivalent one leaves the live editor and its undo
   * history in place, writing any starter `items`/`isOn` through to storage.
   * Only a genuinely different set recreates the editor, preserving content,
   * selection, and focus but resetting history.
   * Extensions built by `buildCarbonExtensions` compare by their source
   * config; anything you supply directly compares by reference, so memoize
   * those (a fresh instance each render reads as a real change).
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
  placeholder = '';

  /** Accessible label for the editing surface. */
  @property({ type: String, attribute: 'aria-label', reflect: true })
  override ariaLabel = '';

  /** Test id, applied to the inner editable element. */
  @property({ type: String, attribute: 'test-id' })
  testId = '';

  /** Focus the surface on mount. */
  @property({ type: Boolean })
  override autofocus = false;

  private _controller: PromptLineController | null = null;
  private _mode: 'textarea' | 'rich' = 'textarea';
  private _editorHost: HTMLElement | null = null;
  private _lastExtensionsRef: Extension[] | null = null;
  /**
   * The `content` value the current surface was seeded with, and whether that
   * seed is still unconsumed. Both are needed: the value catches the echo, and
   * the latch releases after one `updated()` so a later change back to the same
   * value still lands. Comparing on the value alone suppressed it for the life
   * of the surface, dropping `a` in an `a` -> `b` -> `a` sequence.
   */
  private _seededContent?: JSONContent | string;
  private _seedPending = false;
  /** Pending deferred teardown, cancelled if the element is reattached. */
  private _pendingTeardownTimer: ReturnType<typeof setTimeout> | null = null;
  /** Sticky latch — once rich is wanted it never reverts. */
  private _richLatched = false;
  private _upgrading = false;
  /**
   * The element owns the host's composition listeners for both layers — it
   * gates its own textarea→rich upgrade on this, and pushes the state to the
   * active controller via `setComposing` so rich mode can withhold a recreate.
   * One observer, so the two layers cannot disagree.
   */
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
    this._initializeSurface();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this._pendingTeardownTimer !== null) {
      // Reattached before the deferred teardown ran — a move, not an unmount.
      // The controller and its editor host travelled with the element, so the
      // Tiptap instance (and its undo history) survives untouched.
      //
      // Unlike `_teardownSurface`, this deliberately leaves `_isComposing` /
      // `_pendingUpgrade` alone: the host div and its composition listeners are
      // still attached, so a later `compositionend` reaches them and releases
      // whatever was parked. Teardown has to reset eagerly only because it
      // discards the listeners that would otherwise do it.
      clearTimeout(this._pendingTeardownTimer);
      this._pendingTeardownTimer = null;
      const root = this._editorHost?.getRootNode();
      if (root instanceof ShadowRoot || root instanceof Document) {
        adoptOnRoot(root);
      }
      return;
    }
    // Reattached after a real teardown. `firstUpdated` is a one-shot, so
    // without this the element would come back permanently inert.
    if (this._isTornDown()) {
      this._initializeSurface();
    }
  }

  override updated(changed: Map<string | number | symbol, unknown>): void {
    if (!this._controller) {
      return;
    }
    if (
      (changed.has('rich') || changed.has('extensions')) &&
      this._wantsRich()
    ) {
      this._richLatched = true;
      if (this._mode === 'textarea') {
        void this._upgradeToRich();
      }
    }
    if (
      changed.has('extensions') &&
      this.extensions !== this._lastExtensionsRef
    ) {
      this._lastExtensionsRef = this.extensions;
      if (this._mode === 'rich') {
        this._controller.setExtensions(this.extensions);
      }
    }
    if (changed.has('disabled')) {
      this._controller.setEditable(!this.disabled);
    }
    // The seed echo is skipped once — re-applying it would emit a spurious
    // host-origin change event. Every later update lands, including one that
    // returns to the seed value, and including one alongside an extensions
    // change (which may no-op or recreate; either way the seed is the previous
    // doc).
    if (changed.has('content')) {
      const echoesSeed =
        this._seedPending && this.content === this._seededContent;
      this._seedPending = false;
      if (!echoesSeed) {
        this._controller.setContent(this.content ?? '');
      }
    }
    if (changed.has('placeholder')) {
      this._controller.setPlaceholder(this.placeholder);
    }
    if (changed.has('testId')) {
      this._controller.setTestId(this.testId);
    }
    if (changed.has('ariaLabel')) {
      this._controller.setAriaLabel(this.ariaLabel);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (!this._controller || this._pendingTeardownTimer !== null) {
      return;
    }
    // Deferred by a task so a reparent — remove and re-append in the same
    // frame — keeps the live editor instead of destroying and rebuilding it.
    // A macrotask rather than a microtask because the reconnect can be
    // scheduled separately from the removal, and rather than a frame callback
    // because those never fire in a background tab, which would leak the
    // editor of a chat that really was unmounted.
    this._pendingTeardownTimer = setTimeout(() => {
      this._pendingTeardownTimer = null;
      this._teardownSurface();
    }, 0);
  }

  /** Destroy the editing surface. Deferred from `disconnectedCallback`. */
  private _teardownSurface(): void {
    this._failRichReady(new Error('Input is not currently rendered'));
    this._controller?.destroy();
    this._controller = null;
    this._editorHost?.remove();
    this._editorHost = null;
    this._lastExtensionsRef = null;
    // Back to the default surface. `_richLatched` is the sticky flag, so a late
    // reconnect still comes back rich; leaving `_mode` on 'rich' with no
    // controller would just be a field outliving what it describes.
    this._mode = 'textarea';
    // The host div (and its composition listeners) is gone, so a composition
    // that was in flight can never fire its `compositionend`. Left set, these
    // would park the first upgrade after a reattach forever.
    this._isComposing = false;
    this._pendingUpgrade = false;
  }

  /** Mount the editing surface. Runs on first render and on a late reconnect. */
  private _initializeSurface(): void {
    const host = this._mountEditorHost();
    this._lastExtensionsRef = this.extensions;
    this._seededContent = this.content;
    this._seedPending = true;
    this._richLatched = this._wantsRich();

    const warmRuntime = this._richLatched ? getRichRuntimeIfLoaded() : null;
    if (warmRuntime) {
      // Runtime already loaded (e.g. preloaded at boot) — mount rich directly,
      // no textarea flash.
      this._mode = 'rich';
      this._controller = warmRuntime.createRichController();
      this._controller.mount(host, this._makeInit());
    } else {
      this._mode = 'textarea';
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
    if (this._mode === 'rich') {
      const editor = this._controller?.getEditor();
      if (editor) {
        return Promise.resolve(editor);
      }
    }
    // Connected but not yet rendered, or already torn down — nothing to upgrade.
    if (!this._editorHost || !this._controller) {
      return Promise.reject(new Error('Input is not currently rendered'));
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
    return this._controller?.getValue() ?? '';
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
    opts: { at?: number } = {}
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

  /**
   * Rendered once and then torn down — the element is inert until something
   * re-runs the mount path. Distinct from "not yet rendered", where Lit's own
   * `firstUpdated` still has it.
   */
  private _isTornDown(): boolean {
    return this.hasUpdated && !this._controller;
  }

  private _mountEditorHost(): HTMLElement {
    const host = document.createElement('div');
    host.setAttribute('slot', 'editor');
    host.dataset.aichatEditorHost = '';
    this.appendChild(host);
    this._editorHost = host;

    // Defer an upgrade requested mid-IME-composition so we don't tear the
    // field out from under the user.
    host.addEventListener('compositionstart', this._onCompositionStart);
    host.addEventListener('compositionend', this._onCompositionEnd);

    const root = host.getRootNode();
    if (root instanceof ShadowRoot || root instanceof Document) {
      adoptOnRoot(root);
    }
    return host;
  }

  private _onCompositionStart = (): void => {
    this._isComposing = true;
    this._controller?.setComposing(true);
  };

  private _onCompositionEnd = (): void => {
    this._isComposing = false;
    this._controller?.setComposing(false);
    if (this._pendingUpgrade) {
      this._pendingUpgrade = false;
      void this._upgradeToRich();
    }
  };

  /** Build the controller init from current props (rich seed by default). */
  private _makeInit(valueOverride?: string): PromptLineControllerInit {
    const value =
      valueOverride ??
      (typeof this.content === 'string'
        ? this.content
        : this.content
          ? getRawText(this.content)
          : '');
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
    if (this._mode === 'rich' || this._upgrading) {
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
              ? 'Input is not currently rendered'
              : 'Input editor runtime is unavailable'
          )
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
        error instanceof Error ? error : new Error(String(error))
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
    this._mode = 'rich';
    // Seeded losslessly from the textarea's text, which already reflects
    // `content`, so an in-flight identical `content` update stays a no-op.
    this._seededContent = this.content;
    this._seedPending = true;
    rich.mount(host, this._makeInit(value));

    rich.setTextSelection({
      from: textOffsetToDocPos(value, selection.from),
      to: textOffsetToDocPos(value, selection.to),
    });
    if (hadFocus) {
      rich.focus();
    }
    this._settleRichReady();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-prompt-line': PromptLineElement;
  }
}

export default PromptLineElement;
