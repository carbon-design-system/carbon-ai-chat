/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Plugin } from "prosemirror-state";
import { isExternalUpdate } from "./external-update-flag.js";

const TYPING_TIMEOUT_MS = 5000;

export interface TypingIndicatorController {
  /** Reset typing state immediately (call on send). */
  reset(): void;
}

/**
 * Creates a plugin that tracks whether the user is actively typing.
 * Emits `cds-aichat-input-typing` events with `{ isTyping: boolean }`.
 *
 * - Sets `isTyping = true` on the first doc change
 * - Debounces: restarts a 5-second timer on each subsequent change
 * - Sets `isTyping = false` after 5 seconds of inactivity
 * - External updates (from updateRawValue) do not trigger typing
 */
export function createTypingIndicatorPlugin(): {
  plugin: Plugin;
  controller: TypingIndicatorController;
} {
  let isTyping = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let editorDom: HTMLElement | null = null;

  function emitTyping(typing: boolean) {
    isTyping = typing;
    if (editorDom) {
      editorDom.dispatchEvent(
        new CustomEvent("cds-aichat-input-typing", {
          detail: { isTyping: typing },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  function clearTimer() {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  const plugin = new Plugin({
    view(view) {
      editorDom = view.dom as HTMLElement;

      return {
        update(view, prevState) {
          // Only react to doc changes (not selection-only changes)
          if (view.state.doc.eq(prevState.doc)) {
            return;
          }

          // Skip external updates
          if (isExternalUpdate(view)) {
            return;
          }

          // Start or restart typing
          if (!isTyping) {
            emitTyping(true);
          }

          clearTimer();
          timeoutId = setTimeout(() => {
            emitTyping(false);
          }, TYPING_TIMEOUT_MS);
        },

        destroy() {
          clearTimer();
          editorDom = null;
        },
      };
    },
  });

  const controller: TypingIndicatorController = {
    reset() {
      clearTimer();
      if (isTyping) {
        emitTyping(false);
      }
    },
  };

  return { plugin, controller };
}
