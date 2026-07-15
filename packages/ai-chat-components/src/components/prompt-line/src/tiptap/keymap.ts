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
 * - Plain `Enter` is not bound here. `<cds-aichat-prompt-line>` adds
 *   `carbonChatEnter` to its base bundle for "Enter sends, Shift-Enter
 *   newlines"; this extension stays Enter-agnostic so it can be reused on its
 *   own.
 *
 * Undo / redo come from the `UndoRedo` extension. ArrowUp / ArrowDown /
 * Enter / Escape forwarding to the active autocomplete list is **not** done
 * here — the `AutocompleteController` (see ../autocomplete-controller.ts)
 * installs its own capture-phase keydown listener on the editor view DOM
 * when a trigger is active and a list element is registered, and
 * re-dispatches those keys on the list. The Tiptap suggestion factories
 * (`carbonMention`, `carbonAutocomplete`) deliberately return `false` from
 * `onKeyDown` so they don't consume those keys either.
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
