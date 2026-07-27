/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * History extension for the prompt-line-history-mechanism example.
 *
 * Demonstrates: a keyboard-only Tiptap extension that hooks `ArrowUp` /
 * `ArrowDown` to navigate through previously sent messages — shell-style — and
 * writes the recalled text back into the prompt-line editor via
 * `instance.input.updateContent`.
 *
 * APIs exercised:
 *   - `Extension.create` + `addKeyboardShortcuts` from `@tiptap/core`
 *   - `getRawText` / `textToDoc` from `@carbon/ai-chat`
 *   - `ChatInstance.input.updateContent` from `@carbon/ai-chat`
 *
 * Start reading at: `HistoryState`, then `createHistoryExtension`.
 */

import { getRawText, textToDoc, type ChatInstance } from '@carbon/ai-chat';
import { Extension } from '@tiptap/core';

/**
 * Shared mutable state that flows between the keyboard extension and the
 * `customSendMessage` handler. Created once at module scope via
 * `createHistoryState` so that the reference is stable across re-renders.
 *
 * `entries`  — sent messages, oldest-first; grows on every send.
 * `historyIndex` — -1 when not navigating; 0 = most-recent entry (entries.length - 1).
 * `draft`    — the in-progress text saved on the first ArrowUp press so it can
 *              be restored when the user navigates back past entry 0.
 * `instance` — set by `onBeforeRender` so the keyboard handler can call
 *              `instance.input.updateContent`.
 */
interface HistoryState {
  entries: string[];
  historyIndex: number;
  draft: string;
  instance: ChatInstance | null;
}

function createHistoryState(): HistoryState {
  return { entries: [], historyIndex: -1, draft: '', instance: null };
}

/**
 * Returns a Tiptap `Extension` that handles `ArrowUp` / `ArrowDown` in the
 * chat prompt-line editor, cycling through `state.entries`.
 *
 * The extension is created by a factory so the `state` reference is captured
 * in the closure; call it once at module scope and pass the same `state` object
 * to `createCustomSendMessage` and the `onBeforeRender` callback.
 *
 * Trigger conditions (both keys share a single-block guard):
 *   - The doc must have exactly one block (`editor.state.doc.childCount === 1`).
 *     If the user has written a multi-paragraph message, arrow keys move the
 *     cursor normally.
 *   - `ArrowUp`: cursor must be at position 1 (the very start of the single
 *     paragraph) and there must be entries above the current position.
 *   - `ArrowDown`: cursor must be at the last position of the doc and the
 *     extension must currently be navigating (`state.historyIndex >= 0`).
 *
 * History index mapping: `state.historyIndex` 0 = most-recent entry
 * (`entries[entries.length - 1]`); each increment goes one step further back.
 */
function createHistoryExtension(state: HistoryState): Extension {
  return Extension.create({
    name: 'historyNavigation',

    addKeyboardShortcuts() {
      return {
        ArrowUp: ({ editor }) => {
          if (state.entries.length === 0) {
            return false;
          }

          // Only intercept when the doc is a single block (no multi-paragraph
          // text). Multi-block content: let ProseMirror move the cursor normally.
          if (editor.state.doc.childCount !== 1) {
            return false;
          }

          // Only intercept when the cursor is at the very start of the doc.
          if (editor.state.selection.$from.pos !== 1) {
            return false;
          }

          // Already at the oldest entry
          if (state.historyIndex >= state.entries.length - 1) {
            return true; // consume the event so the editor cursor doesn't jump out
          }

          // Save the in-progress draft on the first ArrowUp of a navigation
          // session so we can restore it when the user presses ArrowDown past
          // entry 0.
          if (state.historyIndex === -1) {
            state.draft = getRawText(editor.getJSON());
          }

          state.historyIndex = Math.min(
            state.historyIndex + 1,
            state.entries.length - 1
          );

          state.instance?.input.updateContent(() =>
            textToDoc(
              state.entries[state.entries.length - 1 - state.historyIndex]
            )
          );

          return true;
        },

        ArrowDown: ({ editor }) => {
          // Not currently navigating — let ProseMirror handle it.
          if (state.historyIndex === -1) {
            return false;
          }

          if (editor.state.doc.childCount !== 1) {
            return false;
          }

          // Only intercept when the cursor is at the very end of the doc.
          if (
            editor.state.selection.$from.pos !==
            editor.state.doc.content.size - 1
          ) {
            return false;
          }

          state.historyIndex -= 1;

          if (state.historyIndex === -1) {
            // Navigated back past the most-recent entry
            state.instance?.input.updateContent(() => textToDoc(state.draft));
          } else {
            state.instance?.input.updateContent(() =>
              textToDoc(
                state.entries[state.entries.length - 1 - state.historyIndex]
              )
            );
          }

          return true;
        },
      };
    },
  });
}

export type { HistoryState };
export { createHistoryState, createHistoryExtension };
