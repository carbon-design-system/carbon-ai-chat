/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Tiptap runtime for `<cds-aichat-prompt-line>`'s rich mode. This module is the
 * **only** place the prompt-line stack imports `@tiptap/*` at runtime, and it
 * is reached exclusively through a dynamic `import()` (see
 * [./prompt-line-rich-loader.ts]). A bundler therefore splits Tiptap into its
 * own lazy chunk, keeping it out of the default bundle for chats that never
 * enable advanced input features.
 *
 * `createRichController()` returns a {@link PromptLineController} backed by a
 * Tiptap `Editor`. It installs the Carbon base bundle — schema (`Document` +
 * `Paragraph` + `Text` + `HardBreak`), undo/redo, placeholder, plain-text
 * paste, the chat keymap (`Mod-Enter`/`Escape`), Enter-to-send
 * (`carbonChatEnter`), value-sync, and the typing indicator — and emits the
 * identical
 * `cds-aichat-prompt-*` events so the shell, React wrapper, and `Input`
 * handlers are mode-agnostic.
 */

import { Editor, type Extension, type JSONContent } from '@tiptap/core';
import DocumentNode from '@tiptap/extension-document';
import HardBreakNode from '@tiptap/extension-hard-break';
import ParagraphNode from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import TextNode from '@tiptap/extension-text';
import { UndoRedo } from '@tiptap/extensions';

import { IS_PHONE } from '../../../globals/utils/browser-utils.js';
import { setVarsForSelector } from '../../shared/dynamic-css-var-sheet.js';
import type {
  PromptLineController,
  PromptLineControllerInit,
  SetContentUpdater,
} from './prompt-line-controller.js';
import { applyEditorStyles } from './tiptap/editor-styles.js';
import { HISTORY_DEFAULTS } from './prompt-line-constants.js';
import { writeStarterStorage } from './tiptap/carbon-starter-trigger.js';
import {
  areExtensionSetsEquivalent,
  getExtensionSource,
} from './tiptap/extension-equivalence.js';
import { carbonChatEnter } from './tiptap/chat-enter.js';
import { Keymap } from './tiptap/keymap.js';
import { PlainTextPaste } from './tiptap/plain-text-paste.js';
import { TypingIndicator } from './tiptap/typing-indicator.js';
import { ValueSync } from './tiptap/value-sync.js';
import type { StartersConfig } from './tiptap/types.js';
import { textToDoc } from './tiptap/json-utils.js';
import { setHostOriginMeta } from './tiptap/origin-meta.js';

/** Exported so tests assert the ring without retyping the literal. */
export const PM_KEYBOARD_FOCUS_CLASS =
  'cds-aichat--input-pm-content--keyboard-focus';

let keyboardFocusRuleInstalled = false;
function ensureKeyboardFocusRule(): void {
  if (keyboardFocusRuleInstalled) {
    return;
  }
  setVarsForSelector(`.${PM_KEYBOARD_FOCUS_CLASS}`, { outline: 'revert' });
  keyboardFocusRuleInstalled = true;
}

/**
 * Tiptap-backed prompt-line controller. Mirrors the editor lifecycle the
 * element owned before the textarea/rich split.
 */
class RichController implements PromptLineController {
  private _editor: Editor | null = null;
  private _host: HTMLElement | null = null;
  private _extensions: Extension[] = [];
  /**
   * The set the live editor was built from. `_createEditor` assigns it the same
   * reference as `_extensions`, so the two are normally identical; they diverge
   * only between a `setExtensions` that adopted an equivalent set without
   * rebuilding and the next `_createEditor`. Only `_flushPendingRecreate` needs
   * the distinction: a rebuild withheld for a composition has to be judged
   * against what is installed, not against the set that was pending when the
   * composition began, or a host that changed the config and changed it back
   * loses its undo history for nothing.
   */
  private _installedExtensions: Extension[] = [];
  private _placeholder = '';
  private _testId = '';
  private _disabled = false;
  private _focusFromMouse = false;
  private _isComposing = false;
  /** Set when a recreate is withheld during an IME composition. */
  private _pendingRecreate = false;
  private _pendingRecreateTimer: ReturnType<typeof setTimeout> | null = null;

  mount(host: HTMLElement, init: PromptLineControllerInit): void {
    this._host = host;
    this._extensions = init.extensions ?? [];
    this._placeholder = init.placeholder;
    this._testId = init.testId;
    this._disabled = init.disabled;

    host.setAttribute('role', 'textbox');
    host.setAttribute('aria-multiline', 'true');
    host.setAttribute('spellcheck', 'true');
    host.setAttribute('tabindex', '-1');
    if (init.ariaLabel) {
      host.setAttribute('aria-label', init.ariaLabel);
    }

    // Pointer/touch before focus marks the next focus as mouse-driven so we
    // suppress the keyboard-focus outline.
    host.addEventListener('pointerdown', this._setMouseFlag);
    host.addEventListener('mousedown', this._setMouseFlag);
    host.addEventListener('touchstart', this._setMouseFlag);

    ensureKeyboardFocusRule();

    // Prefer a structured `content` seed (mentions / custom nodes); otherwise
    // rebuild a doc from the plain-text value (lossless from the textarea).
    const seed = init.content ?? textToDoc(init.value);
    this._editor = this._createEditor(host, seed);
    this._wireEditorEvents(this._editor);
    applyEditorStyles(this._editor.view.dom as HTMLElement, IS_PHONE);
    this._applyTestIdToEditorDom();
    this._editor.setEditable(!this._disabled);
  }

  destroy(): void {
    const host = this._host;
    if (host) {
      host.removeEventListener('pointerdown', this._setMouseFlag);
      host.removeEventListener('mousedown', this._setMouseFlag);
      host.removeEventListener('touchstart', this._setMouseFlag);
    }
    if (this._pendingRecreateTimer) {
      clearTimeout(this._pendingRecreateTimer);
      this._pendingRecreateTimer = null;
    }
    this._isComposing = false;
    this._pendingRecreate = false;
    this._editor?.destroy();
    this._editor = null;
    this._host = null;
  }

  getValue(): string {
    return this._editor?.getText() ?? '';
  }

  setContent(next: JSONContent | string | SetContentUpdater): void {
    const editor = this._editor;
    if (!editor) {
      return;
    }
    if (typeof next === 'function') {
      const prev = editor.getJSON();
      this._dispatchSetContent((next as SetContentUpdater)(prev));
      return;
    }
    this._dispatchSetContent(next);
  }

  insertContent(
    content: JSONContent | string,
    opts: { at?: number } = {}
  ): void {
    const editor = this._editor;
    if (!editor) {
      return;
    }
    if (typeof opts.at === 'number') {
      editor.commands.insertContentAt(opts.at, content);
      return;
    }
    editor.commands.insertContent(content);
  }

  clearContent(): void {
    const editor = this._editor;
    if (!editor) {
      return;
    }
    // Tag the clear as host-origin so the carbon-mention/command removal plugin
    // treats the post-send wipe as programmatic (not a user edit) and skips
    // firing `onRemove`. Otherwise a send would strip the just-captured
    // mention/command fields from the host's structured_data sidecar before
    // `doSend` merges them. Mirrors `_dispatchSetContent`.
    editor
      .chain()
      .command(({ tr }) => {
        setHostOriginMeta(tr);
        return true;
      })
      .clearContent(true)
      .run();
  }

  getEditor(): Editor | null {
    return this._editor;
  }

  focus(): void {
    this._focusFromMouse = true;
    this._editor?.commands.focus();
  }

  blur(): void {
    this._editor?.commands.blur();
  }

  hasFocus(): boolean {
    return this._editor?.isFocused ?? false;
  }

  getSelection(): { from: number; to: number } {
    const sel = this._editor?.state.selection;
    return sel ? { from: sel.from, to: sel.to } : { from: 0, to: 0 };
  }

  setTextSelection(pos: number | { from: number; to: number }): void {
    this._editor?.commands.setTextSelection(pos);
  }

  selectAll(): void {
    this._editor?.commands.selectAll();
  }

  setEditable(editable: boolean): void {
    this._disabled = !editable;
    this._editor?.setEditable(editable);
  }

  setPlaceholder(placeholder: string): void {
    this._placeholder = placeholder;
    // The Placeholder extension reads this back through the resolver installed
    // in `_createEditor`; the empty transaction repaints the decoration so the
    // new text shows without waiting for the next edit.
    const editor = this._editor;
    if (editor) {
      editor.view.dispatch(editor.state.tr);
    }
  }

  setAriaLabel(ariaLabel: string): void {
    if (!this._host) {
      return;
    }
    if (ariaLabel) {
      this._host.setAttribute('aria-label', ariaLabel);
    } else {
      this._host.removeAttribute('aria-label');
    }
  }

  setTestId(testId: string): void {
    this._testId = testId;
    this._applyTestIdToEditorDom();
  }

  setExtensions(extensions: Extension[]): void {
    const equivalent = areExtensionSetsEquivalent(this._extensions, extensions);
    // Adopt the new list either way — a later genuine change is compared
    // against what the host most recently supplied.
    this._extensions = extensions;
    if (equivalent) {
      // Starter items / isOn ride on extension storage precisely so they can be
      // swapped without a recreate.
      this._syncStarterStorage();
      return;
    }
    this._recreateEditor();
  }

  setComposing(composing: boolean): void {
    this._isComposing = composing;
    if (composing || !this._pendingRecreate || this._pendingRecreateTimer) {
      return;
    }
    // ProseMirror defers the last composed segment to a microtask after
    // compositionend, so recreating here would snapshot the doc without it and
    // lose the character the user just committed. A macrotask runs after that
    // flush.
    this._pendingRecreateTimer = setTimeout(() => {
      this._pendingRecreateTimer = null;
      this._flushPendingRecreate();
    });
  }

  /** Push the current starter config onto the live editor's storage. */
  private _syncStarterStorage(): void {
    const source = this._extensions
      .map(getExtensionSource)
      .find((descriptor) => descriptor?.kind === 'starters');
    const config = source?.config as StartersConfig | undefined;
    if (!config) {
      return;
    }
    writeStarterStorage(this._editor, {
      items: config.items,
      isOn: config.isOn !== false,
    });
  }

  undo(): boolean {
    return Boolean(this._editor?.commands.undo());
  }

  redo(): boolean {
    return Boolean(this._editor?.commands.redo());
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private _setMouseFlag = (): void => {
    this._focusFromMouse = true;
  };

  private _flushPendingRecreate(): void {
    // A fresh composition may have started while the flush was queued; its own
    // compositionend re-queues this. A detached host means the element's own
    // deferred teardown is already pending, so rebuilding would raise an editor
    // only to destroy it a task later.
    if (
      !this._host?.isConnected ||
      !this._pendingRecreate ||
      this._isComposing
    ) {
      return;
    }
    // Compare against what is installed, not the set that was pending when the
    // composition began: a host that changed the config and changed it back has
    // nothing left to rebuild, and rebuilding anyway would drop undo history.
    if (
      areExtensionSetsEquivalent(this._installedExtensions, this._extensions)
    ) {
      this._pendingRecreate = false;
      this._syncStarterStorage();
      return;
    }
    this._recreateEditor();
  }

  private _createEditor(
    element: HTMLElement,
    content: JSONContent | string | undefined
  ): Editor {
    const baseExtensions: Extension[] = [
      DocumentNode as unknown as Extension,
      ParagraphNode as unknown as Extension,
      TextNode as unknown as Extension,
      HardBreakNode as unknown as Extension,
      UndoRedo.configure({ ...HISTORY_DEFAULTS }),
      // Resolved per decoration build rather than captured, so `setPlaceholder`
      // lands on the live editor. Tiptap snapshots an extension's options when
      // it builds plugins, so a value here could never be updated in place.
      Placeholder.configure({ placeholder: () => this._placeholder }),
      PlainTextPaste,
      Keymap,
      // Plain Enter sends (non-empty); empty Enter falls through to a newline.
      // Baked into the base bundle so the rich editor and the textarea agree on
      // Enter-to-send without the chat layer wiring it per surface.
      carbonChatEnter(),
      ValueSync,
      TypingIndicator,
    ];
    this._installedExtensions = this._extensions;
    return new Editor({
      element,
      extensions: [...baseExtensions, ...this._extensions],
      content: content ?? undefined,
      autofocus: false,
      injectCSS: false,
    });
  }

  private _wireEditorEvents(editor: Editor): void {
    editor.on('focus', () => {
      const wasMouseFocus = this._focusFromMouse;
      this._focusFromMouse = false;
      if (!wasMouseFocus) {
        editor.view.dom.classList.add(PM_KEYBOARD_FOCUS_CLASS);
      }
      this._dispatch('cds-aichat-prompt-focus', { keyboard: !wasMouseFocus });
    });
    editor.on('blur', () => {
      editor.view.dom.classList.remove(PM_KEYBOARD_FOCUS_CLASS);
      this._dispatch('cds-aichat-prompt-blur');
    });
    // Forward keydown for hosts wanting raw-key access. ValueSync /
    // TypingIndicator emit their own events; don't re-dispatch update here.
    editor.view.dom.addEventListener('keydown', (event) => {
      this._dispatch('cds-aichat-prompt-keydown', { originalEvent: event });
    });
  }

  private _recreateEditor(): void {
    const host = this._host;
    if (!host) {
      return;
    }
    if (this._isComposing) {
      this._pendingRecreate = true;
      return;
    }
    this._pendingRecreate = false;
    const previousJson = this._editor?.getJSON();
    const previousSelection = this._editor
      ? {
          from: this._editor.state.selection.from,
          to: this._editor.state.selection.to,
        }
      : null;
    const wasFocused = this._editor?.isFocused ?? false;
    const wasKeyboardFocus =
      this._editor?.view.dom.classList.contains(PM_KEYBOARD_FOCUS_CLASS) ??
      false;
    this._editor?.destroy();
    this._editor = this._createEditor(host, previousJson);
    this._wireEditorEvents(this._editor);
    applyEditorStyles(this._editor.view.dom as HTMLElement, IS_PHONE);
    this._applyTestIdToEditorDom();
    this._editor.setEditable(!this._disabled);
    if (previousSelection) {
      const { size } = this._editor.state.doc.content;
      const from = Math.min(previousSelection.from, size);
      const to = Math.min(previousSelection.to, size);
      this._editor.commands.setTextSelection({ from, to });
    }

    if (wasFocused) {
      this._focusFromMouse = !wasKeyboardFocus;
      this._editor.commands.focus();
    }
  }

  private _dispatchSetContent(content: JSONContent | string): void {
    const editor = this._editor;
    if (!editor) {
      return;
    }
    // Chain a no-op command that meta-tags the accumulator tr as host-origin,
    // then setContent on the same tr so downstream readers (typing-indicator)
    // recognize the update.
    editor
      .chain()
      .command(({ tr }) => {
        setHostOriginMeta(tr);
        return true;
      })
      .setContent(content, { emitUpdate: true })
      .run();
  }

  // Mirror testId onto the inner ProseMirror contenteditable (not the host
  // wrapper) so Playwright's editable-action helpers (`.fill()`, etc.) accept
  // it. `view.dom` is replaced on each recreate, so re-apply.
  private _applyTestIdToEditorDom(): void {
    const editorDom = this._editor?.view.dom as HTMLElement | undefined;
    if (!editorDom) {
      return;
    }
    if (this._testId) {
      editorDom.setAttribute('data-testid', this._testId);
    } else {
      editorDom.removeAttribute('data-testid');
    }
  }

  private _dispatch(name: string, detail?: unknown): void {
    this._host?.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }
}

/**
 * Construct a Tiptap-backed prompt-line controller. Called by the shell once
 * the lazily-imported runtime module has resolved.
 */
export function createRichController(): PromptLineController {
  return new RichController();
}
