/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Tiptap keymap extension for the prompt-line.
 *
 * - `Mod-Enter` → emit `cds-aichat-prompt-send-intent`. The shell decides
 *   whether to honor (re-dispatch as `cds-aichat-input-send`) or gate
 *   (`isSendDisabled` per PLAN.md decision 19).
 * - `Escape` → blur the editor.
 * - Plain `Enter` falls through to Tiptap defaults (paragraph split). Hosts
 *   wanting "Enter sends, Shift-Enter newlines" wire that at the shell layer
 *   in PR 3.
 *
 * Undo / redo come from the `UndoRedo` extension. The legacy `keymap.ts`'s
 * trigger-key forwarding (`ArrowUp`/`ArrowDown` to autocomplete-list-manager)
 * is gone: Tiptap's Mention extension handles its own keys via the
 * suggestion-render `onKeyDown`; the autocomplete factory does the same.
 */

import { Extension } from "@tiptap/core";

export const Keymap = Extension.create({
  name: "carbonChatKeymap",

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": ({ editor }) => {
        editor.view.dom.dispatchEvent(
          new CustomEvent("cds-aichat-prompt-send-intent", {
            bubbles: true,
            composed: true,
          }),
        );
        return true;
      },
      Escape: ({ editor }) => {
        (editor.view.dom as HTMLElement).blur();
        return true;
      },
    };
  },
});
