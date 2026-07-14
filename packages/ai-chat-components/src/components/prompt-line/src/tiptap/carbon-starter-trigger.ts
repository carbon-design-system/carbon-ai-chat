/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * `carbonStarterTrigger` factory. Watches the editor's empty + focused +
 * editable state and emits `cds-aichat-trigger-change` with `type: "starter"`
 * via the shared `dispatchTriggerChange` helper.
 *
 * Items are stored on `extension.storage.items` so the prompt-line / shell
 * can swap the list at runtime without recreating the editor.
 */

import { Extension, type Editor } from "@tiptap/core";

import { dispatchTriggerChange } from "./trigger-utils.js";
import type { SuggestionItem } from "./types.js";

export interface StarterTriggerStorage {
  items: SuggestionItem[];
}

export function carbonStarterTrigger(
  initialItems: SuggestionItem[],
): Extension {
  return Extension.create<unknown, StarterTriggerStorage>({
    name: "carbonStarterTrigger",

    addStorage() {
      return { items: initialItems };
    },

    onCreate() {
      this.storage.items = initialItems;
    },

    onUpdate() {
      maybeEmit(this.editor);
    },

    onTransaction() {
      maybeEmit(this.editor);
    },

    onFocus() {
      maybeEmit(this.editor);
    },

    onBlur() {
      maybeEmit(this.editor, /* forceClear */ true);
    },
  });
}

function maybeEmit(editor: Editor, forceClear = false): void {
  const isActive =
    !forceClear && editor.isEditable && editor.isFocused && editor.isEmpty;
  if (!isActive) {
    dispatchTriggerChange(editor, null);
    return;
  }
  dispatchTriggerChange(editor, {
    type: "starter",
    query: "",
    triggerOffset: 0,
  });
}
