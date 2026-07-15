/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Tiptap typing-indicator extension. Emits `cds-aichat-prompt-typing` events
 * on the editor's DOM whenever the user's typing-state changes.
 *
 * Behavior:
 * - Sets `isTyping = true` on the first user-driven doc change.
 * - Restarts a 5-second timer on each subsequent change.
 * - Emits `isTyping = false` after 5 seconds of inactivity.
 * - Skips host-origin transactions (`tr.setMeta("aichatOrigin", "host")`).
 *   Origin is recorded in storage by `appendTransaction` and read by the
 *   view's `update` hook (mirrors the `value-sync` extension pattern).
 *
 * The storage `reset()` controller lets the prompt-line / shell wipe typing
 * state immediately on send.
 */

import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

import { isHostOrigin } from "./origin-meta.js";

const TYPING_TIMEOUT_MS = 5000;

export interface TypingIndicatorStorage {
  reset(): void;
  /** True iff the most recent doc-changing batch was entirely host-origin. */
  lastTransactionIsHost: boolean;
}

export const TypingIndicator = Extension.create<
  unknown,
  TypingIndicatorStorage
>({
  name: "carbonTypingIndicator",

  addStorage() {
    return { reset: () => {}, lastTransactionIsHost: false };
  },

  addProseMirrorPlugins() {
    const { storage } = this;
    let isTyping = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let editorDom: HTMLElement | null = null;

    function emit(typing: boolean): void {
      isTyping = typing;
      if (editorDom) {
        editorDom.dispatchEvent(
          new CustomEvent("cds-aichat-prompt-typing", {
            detail: { isTyping: typing },
            bubbles: true,
            composed: true,
          }),
        );
      }
    }

    function clearTimer(): void {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    storage.reset = () => {
      clearTimer();
      if (isTyping) {
        emit(false);
      }
    };

    return [
      new Plugin({
        view(view) {
          editorDom = view.dom as HTMLElement;
          return {
            update(view, prevState) {
              if (view.state.doc.eq(prevState.doc)) {
                return;
              }
              if (storage.lastTransactionIsHost) {
                return;
              }
              if (!isTyping) {
                emit(true);
              }
              clearTimer();
              timeoutId = setTimeout(() => emit(false), TYPING_TIMEOUT_MS);
            },
            destroy() {
              clearTimer();
              editorDom = null;
            },
          };
        },
        appendTransaction(transactions) {
          storage.lastTransactionIsHost =
            transactions.length > 0 &&
            transactions.every((tr) => isHostOrigin(tr));
          return null;
        },
      }),
    ];
  },
});
