/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `carbonChatEnter` — Tiptap extension that binds plain `Enter` to fire
 * `cds-aichat-prompt-send-intent`, matching the legacy chat UX where Enter
 * sends and Mod-Enter inserts a newline. `<cds-aichat-prompt-line>` installs
 * it in its base bundle (both surfaces send on Enter); it stays a standalone
 * extension so hosts composing their own editor can opt in the same way.
 */

import { Extension } from "@tiptap/core";

export function carbonChatEnter(): Extension {
  return Extension.create({
    name: "carbonChatEnter",
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          if (editor.isEmpty) {
            return false;
          }
          editor.view.dom.dispatchEvent(
            new CustomEvent("cds-aichat-prompt-send-intent", {
              bubbles: true,
              composed: true,
            }),
          );
          return true;
        },
      };
    },
  });
}
