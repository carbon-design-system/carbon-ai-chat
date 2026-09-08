/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Shared types for the prompt-line controller abstraction.
 *
 * `Editor` / `JSONContent` / `Extension` are **type-only** imports here —
 * erased at compile, so this module carries no Tiptap runtime.
 */

import type { Editor, Extension, JSONContent } from '@tiptap/core';

/** Updater shape accepted by `setContent` for reduce-style edits. */
export type SetContentUpdater = (prev: JSONContent) => JSONContent;

/** Initial state handed to a controller when it mounts into the host. */
export interface PromptLineControllerInit {
  /**
   * Plain-text seed value. Always the textarea's source of truth and the
   * lossless seed used when the rich editor mounts without richer `content`.
   */
  value: string;
  /**
   * Optional structured seed (a `content` prop carrying mentions / custom
   * nodes). Consumed by the rich controller; the textarea ignores it and
   * relies on `value`.
   */
  content?: JSONContent | string;
  placeholder: string;
  /** When `true`, the surface is non-editable (still focusable). */
  disabled: boolean;
  ariaLabel: string;
  testId: string;
  /**
   * Host-supplied Tiptap extensions. Consumed by the rich controller; ignored
   * by the textarea controller.
   */
  extensions?: Extension[];
}

/**
 * The editing-surface controller abstraction for `<cds-aichat-prompt-line>`.
 *
 * The prompt-line shell ([./prompt-line.ts]) delegates all editing behavior to
 * a `PromptLineController`. Two implementations exist:
 *
 * - `TextareaController` (./prompt-line-textarea.ts) — a Tiptap-free `<textarea>`.
 *   It is the default and keeps the shell's static import graph free of `@tiptap/*`.
 * - The rich controller ([./prompt-line-rich-runtime.ts]) — a Tiptap `Editor`,
 *   reached only through a dynamic `import()` so Tiptap lands in its own lazy
 *   chunk.
 *
 * Both controllers emit the **same** `cds-aichat-prompt-*` events with the
 * same detail shapes, so the React wrapper and `@carbon/ai-chat`'s `Input`
 * handlers are identical regardless of mode. The shell can swap a
 * `TextareaController` for the rich controller in place (text, caret, focus,
 * and keyboard-focus state transfer losslessly because the textarea holds plain
 * text and both controllers share the same focus-tracking contract).
 */
export interface PromptLineController {
  /** Mount the editing surface into the (already-slotted) light-DOM host. */
  mount(host: HTMLElement, init: PromptLineControllerInit): void;
  /** Tear down listeners / editor and remove the surface from the host. */
  destroy(): void;

  /** Current plain-text value (the lossless transfer + change payload). */
  getValue(): string;
  setContent(next: JSONContent | string | SetContentUpdater): void;
  insertContent(content: JSONContent | string, opts?: { at?: number }): void;
  clearContent(): void;

  /** Live Tiptap editor, or `null` in textarea mode. */
  getEditor(): Editor | null;

  /** Accepts `keyboardFocus`, which when true specifies that a focus ring should be visible around the prompt line text area */
  focus(keyboardFocus: boolean): void;

  blur(): void;
  hasFocus(): boolean;

  /** Selection as plain-text offsets (used for seamless transfer). */
  getSelection(): { from: number; to: number };
  setTextSelection(pos: number | { from: number; to: number }): void;
  selectAll(): void;

  setEditable(editable: boolean): void;
  setPlaceholder(placeholder: string): void;
  setAriaLabel(ariaLabel: string): void;
  setTestId(testId: string): void;
  /**
   * Apply a new extension list. Rich mode compares it by value against the set
   * last supplied: an equivalent set keeps the editor and its undo history,
   * writing any starter `items`/`isOn` through to live storage; a genuinely
   * different one recreates the editor preserving content/selection/focus,
   * deferred to the end of an IME composition. Textarea mode ignores it.
   */
  setExtensions(extensions: Extension[]): void;
  /**
   * Report whether an IME composition is in flight. The element owns the host's
   * composition listeners and pushes the state down, so there is one observer
   * and the two layers cannot disagree. Rich mode withholds an
   * extension-driven recreate for the duration — destroying the editor would
   * strand the IME's candidate — and flushes it once composition commits;
   * textarea mode ignores it.
   */
  setComposing(composing: boolean): void;

  undo(): boolean;
  redo(): boolean;

  /** Whether the most recent focus event was driven by keyboard (not pointer/touch-driven). */
  getKeyboardFocus(): boolean;
}
