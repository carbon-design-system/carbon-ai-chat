/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Textarea runtime for `<cds-aichat-prompt-line>`'s default (non-rich) mode.
 * This module is **statically imported** by the prompt-line shell
 * ([./prompt-line.ts]), so it is always part of the initial bundle — but it
 * carries **no `@tiptap/*` runtime**. The only Tiptap symbols used here are
 * type imports erased at compile time.
 *
 * `TextareaController` implements {@link PromptLineController} backed by a
 * native `<textarea>`. It mirrors the typography and sizing of the Tiptap
 * editor exactly (auto-grow via a CSS grid mirror, Carbon `body-01` tokens,
 * the same `max-block-size` cap) so the textarea→editor swap triggered by
 * the rich-mode loader ([./prompt-line-rich-loader.ts]) is visually
 * imperceptible. State — plain text, caret position, and keyboard-focus
 * tracking — transfers losslessly to the rich controller because the textarea
 * is always the plain-text source of truth. The same `cds-aichat-prompt-*`
 * events are emitted, keeping the React wrapper and `Input` handlers
 * mode-agnostic.
 *
 * `Editor` / `JSONContent` are **type-only** imports here — erased at compile,
 * so this module carries no Tiptap runtime.
 */

import type { Editor, Extension, JSONContent } from '@tiptap/core';

import { IS_PHONE } from '../../../globals/utils/browser-utils.js';
import {
  adoptOnRoot,
  setVarsForSelector,
} from '../../shared/dynamic-css-var-sheet.js';
import { PROMPT_LINE_MAX_BLOCK_SIZE } from './prompt-line-constants.js';
import { MouseFocusController } from './prompt-line-mouse-focus.js';
import type {
  PromptLineController,
  PromptLineControllerInit,
  SetContentUpdater,
} from './prompt-line-types.js';
import { getRawText, textToDoc } from './tiptap/json-utils.js';

// ---------------------------------------------------------------------------
// Textarea styling (CSP-safe — installed on the shared dynamic stylesheet,
// governed by `style-src` not `style-src-attr`, matching ./tiptap/editor-styles).
// ---------------------------------------------------------------------------

const TA_GROW_CLASS = 'cds-aichat--input-textarea-grow';
const TA_FIELD_CLASS = 'cds-aichat--input-textarea';
const TA_MIRROR_CLASS = 'cds-aichat--input-textarea-mirror';
const TA_PHONE_CLASS = 'cds-aichat--input-textarea--phone';

let textareaRulesInstalled = false;

// Typography intentionally mirrors `.cds-aichat--input-pm-content` in
// ./tiptap/editor-styles.ts so the textarea and the Tiptap editor are pixel-
// identical and the textarea→editor swap is imperceptible.
function ensureTextareaStyleRules(): void {
  if (textareaRulesInstalled) {
    return;
  }
  // Auto-grow wrapper: textarea and mirror occupy the same grid cell; the
  // (content-bearing) mirror dictates the height, the textarea stretches to
  // fill it. No per-keystroke inline `style.height` (CSP-safe auto-grow).
  // Cap the box at the shared max and clip the (unbounded) mirror past it; the
  // field below scrolls within that cap.
  setVarsForSelector(`.${TA_GROW_CLASS}`, {
    display: 'grid',
    'inline-size': '100%',
    'max-block-size': PROMPT_LINE_MAX_BLOCK_SIZE,
    overflow: 'hidden',
  });
  setVarsForSelector(`.${TA_GROW_CLASS} > *`, {
    'grid-area': '1 / 1 / 2 / 2',
  });
  // Shared typography + reset for both the field and the mirror.
  const shared: Record<string, string> = {
    margin: '0',
    padding: '0',
    border: 'none',
    'white-space': 'pre-wrap',
    'overflow-wrap': 'anywhere',
    'font-family': 'inherit',
    'font-size': 'var(--cds-body-01-font-size, 0.875rem)',
    'font-weight': 'var(--cds-body-01-font-weight, 400)',
    'letter-spacing': 'var(--cds-body-01-letter-spacing, 0.16px)',
    'line-height': 'var(--cds-body-01-line-height, 1.42857)',
  };
  setVarsForSelector(`.${TA_FIELD_CLASS}`, {
    ...shared,
    appearance: 'none',
    background: 'transparent',
    color: 'var(--cds-text-primary, #161616)',
    outline: 'none',
    resize: 'none',
    // The field is its own scroll container past the cap so the browser keeps
    // the caret in view natively (an ancestor scroller would not track it).
    'overflow-x': 'hidden',
    'overflow-y': 'auto',
    'inline-size': '100%',
    'min-block-size': '0',
    'max-block-size': PROMPT_LINE_MAX_BLOCK_SIZE,
  });
  setVarsForSelector(`.${TA_FIELD_CLASS}::placeholder`, {
    color: 'var(--cds-text-secondary, #525252)',
    opacity: '1',
  });
  setVarsForSelector(`.${TA_MIRROR_CLASS}`, {
    ...shared,
    visibility: 'hidden',
    'pointer-events': 'none',
  });
  setVarsForSelector(`.${TA_PHONE_CLASS}`, {
    'font-size': 'var(--cds-body-02-font-size, 1rem)',
    'font-weight': 'var(--cds-body-02-font-weight, 400)',
    'letter-spacing': 'var(--cds-body-02-letter-spacing, 0)',
    'line-height': 'var(--cds-body-02-line-height, 1.5)',
  });
  textareaRulesInstalled = true;
}

const TYPING_TIMEOUT_MS = 5000;

/**
 * `<textarea>`-backed controller. Tiptap-free; emits the same prompt events as
 * the rich editor. Auto-grows via a hidden mirror, capped at
 * `PROMPT_LINE_MAX_BLOCK_SIZE` with the field scrolling past it — the same cap
 * the rich contenteditable applies (see ./tiptap/editor-styles.ts), so the
 * textarea→rich swap is imperceptible.
 */
export class TextareaController
  extends MouseFocusController
  implements PromptLineController
{
  private _wrap: HTMLDivElement | null = null;
  private _textarea: HTMLTextAreaElement | null = null;
  private _mirror: HTMLDivElement | null = null;
  private _host: HTMLElement | null = null;

  private _isTyping = false;
  private _typingTimer: ReturnType<typeof setTimeout> | null = null;

  mount(host: HTMLElement, init: PromptLineControllerInit): void {
    ensureTextareaStyleRules();
    const root = host.getRootNode();
    if (root instanceof ShadowRoot || root instanceof Document) {
      adoptOnRoot(root);
    }

    const wrap = document.createElement('div');
    wrap.className = TA_GROW_CLASS;

    const textarea = document.createElement('textarea');
    textarea.className = TA_FIELD_CLASS;
    textarea.classList.toggle(TA_PHONE_CLASS, IS_PHONE);
    textarea.setAttribute('rows', '1');
    textarea.setAttribute('spellcheck', 'true');
    textarea.setAttribute('tabindex', '0');
    textarea.placeholder = init.placeholder;
    textarea.value = init.value;
    textarea.readOnly = init.disabled;
    if (init.ariaLabel) {
      textarea.setAttribute('aria-label', init.ariaLabel);
    }
    if (init.testId) {
      textarea.setAttribute('data-testid', init.testId);
    }

    const mirror = document.createElement('div');
    mirror.className = TA_MIRROR_CLASS;
    mirror.classList.toggle(TA_PHONE_CLASS, IS_PHONE);
    mirror.setAttribute('aria-hidden', 'true');

    wrap.appendChild(textarea);
    wrap.appendChild(mirror);
    host.appendChild(wrap);

    this._wrap = wrap;
    this._textarea = textarea;
    this._mirror = mirror;
    this._host = host;

    textarea.addEventListener('input', this._onInput);
    textarea.addEventListener('keydown', this._onKeydown);
    textarea.addEventListener('focus', this._onFocus);
    textarea.addEventListener('blur', this._onBlur);

    // Pointer/touch before focus marks the next focus as mouse-driven so we
    // suppress the keyboard-focus outline.
    this._attachMouseFocusListeners(host);

    this._syncMirror();
  }

  destroy(): void {
    this._clearTypingTimer();
    const ta = this._textarea;
    if (ta) {
      ta.removeEventListener('input', this._onInput);
      ta.removeEventListener('keydown', this._onKeydown);
      ta.removeEventListener('focus', this._onFocus);
      ta.removeEventListener('blur', this._onBlur);
    }
    const host = this._host;
    if (host) {
      this._detachMouseFocusListeners(host);
    }
    this._wrap?.remove();
    this._wrap = null;
    this._textarea = null;
    this._mirror = null;
  }

  getValue(): string {
    return this._textarea?.value ?? '';
  }

  setContent(next: JSONContent | string | SetContentUpdater): void {
    if (typeof next === 'function') {
      const prev = textToDoc(this.getValue());
      this._setValue(getRawText((next as SetContentUpdater)(prev)), true);
      return;
    }
    this._setValue(typeof next === 'string' ? next : getRawText(next), true);
  }

  insertContent(
    content: JSONContent | string,
    opts: { at?: number } = {}
  ): void {
    const ta = this._textarea;
    if (!ta) {
      return;
    }
    const text = typeof content === 'string' ? content : getRawText(content);
    const value = ta.value;
    const at =
      typeof opts.at === 'number'
        ? Math.max(0, Math.min(opts.at, value.length))
        : (ta.selectionStart ?? value.length);
    const end = typeof opts.at === 'number' ? at : (ta.selectionEnd ?? at);
    const nextValue = value.slice(0, at) + text + value.slice(end);
    const caret = at + text.length;
    this._setValue(nextValue, true);
    ta.setSelectionRange(caret, caret);
  }

  clearContent(): void {
    this._setValue('', true);
  }

  getEditor(): Editor | null {
    return null;
  }

  focus(keyboardFocus: boolean): void {
    this._setNextFocusOrigin(keyboardFocus);
    this._textarea?.focus();
  }

  blur(): void {
    this._textarea?.blur();
  }

  hasFocus(): boolean {
    const ta = this._textarea;
    if (!ta) {
      return false;
    }
    const root = ta.getRootNode() as Document | ShadowRoot;
    return root.activeElement === ta;
  }

  getSelection(): { from: number; to: number } {
    const ta = this._textarea;
    if (!ta) {
      return { from: 0, to: 0 };
    }
    return { from: ta.selectionStart ?? 0, to: ta.selectionEnd ?? 0 };
  }

  setTextSelection(pos: number | { from: number; to: number }): void {
    const ta = this._textarea;
    if (!ta) {
      return;
    }
    const len = ta.value.length;
    if (typeof pos === 'number') {
      const p = Math.max(0, Math.min(pos, len));
      ta.setSelectionRange(p, p);
      return;
    }
    ta.setSelectionRange(
      Math.max(0, Math.min(pos.from, len)),
      Math.max(0, Math.min(pos.to, len))
    );
  }

  selectAll(): void {
    this._textarea?.select();
  }

  setEditable(editable: boolean): void {
    if (this._textarea) {
      this._textarea.readOnly = !editable;
    }
  }

  setPlaceholder(placeholder: string): void {
    if (this._textarea) {
      this._textarea.placeholder = placeholder;
    }
  }

  setAriaLabel(ariaLabel: string): void {
    const ta = this._textarea;
    if (!ta) {
      return;
    }
    if (ariaLabel) {
      ta.setAttribute('aria-label', ariaLabel);
    } else {
      ta.removeAttribute('aria-label');
    }
  }

  setTestId(testId: string): void {
    const ta = this._textarea;
    if (!ta) {
      return;
    }
    if (testId) {
      ta.setAttribute('data-testid', testId);
    } else {
      ta.removeAttribute('data-testid');
    }
  }

  setExtensions(_extensions: Extension[]): void {
    // Textarea mode has no Tiptap extensions; the shell upgrades to the rich
    // controller when host extensions appear.
  }

  setComposing(_composing: boolean): void {
    // Nothing to withhold: a `<textarea>` survives its own recreate, and the
    // element gates the upgrade on composition itself.
  }

  undo(): boolean {
    return false;
  }

  redo(): boolean {
    return false;
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private _onInput = (): void => {
    this._syncMirror();
    this._markTyping();
    this._emitChange();
  };

  // Enter-to-send mirrors the rich editor's base bundle (`Keymap` +
  // `carbonChatEnter`): plain Enter sends when non-empty, Mod-Enter sends,
  // Shift-Enter inserts a newline, and Enter on an empty field falls through to
  // the native newline (matching `carbonChatEnter`'s empty guard).
  private _onKeydown = (event: KeyboardEvent): void => {
    this._dispatch('cds-aichat-prompt-keydown', { originalEvent: event });
    // While an IME composition is active, Enter commits the candidate — let the
    // IME own it. ProseMirror suppresses its keymap the same way, so the rich
    // editor and the textarea agree. Without this, confirming a CJK candidate
    // would send the half-composed text.
    if (event.isComposing) {
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      const isModEnter = event.metaKey || event.ctrlKey;
      if (isModEnter || this.getValue() !== '') {
        event.preventDefault();
        this._dispatch('cds-aichat-prompt-send-intent');
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this._textarea?.blur();
    }
  };

  private _onFocus = (): void => {
    const wasMouseFocus = this._consumeMouseFocus();
    this._dispatch('cds-aichat-prompt-focus', { keyboard: !wasMouseFocus });
  };

  private _onBlur = (): void => {
    this._dispatch('cds-aichat-prompt-blur');
  };

  /** Programmatic value write: updates the field, mirror, and emits change. */
  private _setValue(text: string, emit: boolean): void {
    const ta = this._textarea;
    if (!ta) {
      return;
    }
    ta.value = text;
    this._syncMirror();
    if (emit) {
      this._emitChange();
    }
  }

  private _emitChange(): void {
    // Carry a plain-text doc as `content` so Redux / `getState().input.content`
    // stays consistent with the rich editor (which emits `editor.getJSON()`).
    const rawValue = this.getValue();
    this._dispatch('cds-aichat-prompt-change', {
      rawValue,
      content: textToDoc(rawValue),
    });
  }

  private _syncMirror(): void {
    if (this._mirror && this._textarea) {
      // Trailing newline so the box grows the instant a new line starts.
      this._mirror.textContent = `${this._textarea.value}\n`;
    }
  }

  private _markTyping(): void {
    if (!this._isTyping) {
      this._isTyping = true;
      this._dispatch('cds-aichat-prompt-typing', { isTyping: true });
    }
    this._clearTypingTimer();
    this._typingTimer = setTimeout(() => {
      this._isTyping = false;
      this._dispatch('cds-aichat-prompt-typing', { isTyping: false });
    }, TYPING_TIMEOUT_MS);
  }

  private _clearTypingTimer(): void {
    if (this._typingTimer != null) {
      clearTimeout(this._typingTimer);
      this._typingTimer = null;
    }
  }

  private _dispatch(name: string, detail?: unknown): void {
    this._textarea?.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }
}
